# Design: dispatcher の async 化と submitRequest の監査ログハンドラ移行

## Context

EventDispatcher の `dispatch()` メソッドは戻り値 `void` の同期呼び出しで実装されている。`EventHandler` 型自体は `(event: T) => void | Promise<void>` で async 対応済みだが、`dispatch()` 内で sync ハンドラを呼ぶ際に `entry.handler(event)` を await しないため、handler が Promise を返しても無視される。

監査ログを sync ハンドラで自動記録するには、ハンドラ内で `auditLogRepository.create(data, tx)` を await する必要がある。また、トランザクション内で監査ログを書くためにはトランザクションオブジェクト (tx) をハンドラに伝播する仕組みが必要。

現在、submitRequest を含む全ユースケースで `auditLogRepository.create` を手動呼び出ししている。本変更では最も単純な submitRequest 1 件のみをハンドラ方式に移行し、基盤の動作を検証する。

### 現状の dispatch 呼び出し箇所

全 22 箇所（10 ファイル）。すべて `await` なし:
- `approveRequest.ts` (5), `rejectRequest.ts` (3), `updateDealPhase.ts` (3), `updateInquiryStatus.ts` (3), `updateContractStatus.ts` (2), `updateInvoiceStatus.ts` (2), `submitRequest.ts` (1), `createRequest.ts` (1), `createContract.ts` (1), `resubmitRequest.ts` (1)

### 影響を受けるテスト

- `requestWorkflow.test.ts` TC-011: `submitRequest.ts` のソースに `auditLogRepository` を含むことを検証するスタティック解析テスト。手動呼び出し削除後に検証対象の変更が必要。

## Goals / Non-Goals

**Goals**:

- `dispatch()` を async 化し、sync ハンドラ内で `await` 可能な DB 操作を実行できるようにする
- `EventHandler` 型に `options?: { tx?: unknown }` 引数を追加し、トランザクションをハンドラに伝播する
- 全 22 箇所の dispatch 呼び出しに `await` を追加する
- submitRequest の監査ログを sync ハンドラに移行し、手動呼び出しを削除する
- `typecheck && test` が green であること

**Non-Goals**:

- submitRequest 以外のユースケースの監査ログハンドラ移行
- 他のユースケースの dispatch 呼び出しへの tx 追加（await 追加のみ）
- 非同期ハンドラの変更
- `flushAsync()` の変更

## Decisions

### D1: dispatch() を async 化する（dispatchAsync を新設しない）

**変更**: `dispatch(event: DomainEvent): void` を `dispatch(event: DomainEvent, options?: DispatchOptions): Promise<void>` に変更。

**Rationale**: sync ハンドラで async DB 操作を await するには、dispatch 自体が async でなければ Promise が捨てられる。全呼び出し元に `await` を追加するが、現在の sync ハンドラは void を返すため即座に解決し、既存動作に影響しない。

**却下案**: `dispatchAsync()` メソッドを新設 — 2 つの dispatch メソッドが存在すると呼び出し側が混乱し、将来的にどちらを使うかの判断コストが発生する。

### D2: options.tx を unknown 型で受ける

**変更**: `DispatchOptions` を `{ tx?: unknown }` として定義。ハンドラ（インフラ層）側で `tx as Transaction` にキャスト。

**Rationale**: dispatcher はドメイン層（`src/domain/events/`）に配置されており、drizzle の `Transaction` 型を直接 import するとレイヤー違反になる。ハンドラは `src/infrastructure/handlers/` に配置されているため、インフラ層の型を使用可能。

**却下案**: dispatcher をインフラ層に移動 — イベント型定義（`types.ts`）との分離が崩れ、ドメイン層のイベントモデルがインフラ層に依存する逆転が起きる。

### D3: submitRequest 1 件のみ移行する

**Rationale**: metadata が不要（null）な最も単純なケース。dispatch async 化 + tx 伝播 + ハンドラ登録の基盤検証に十分。他のユースケースは metadata フィールドの設計が未定のため、後続リクエストで対応する。

**却下案**: 複数ユースケース一括移行 — metadata の設計とテスト更新の複雑さでスコープが膨らむ。

### D4: EventHandler 型に options 引数を追加する

**変更**: `EventHandler<T> = (event: T) => void | Promise<void>` を `(event: T, options?: DispatchOptions) => void | Promise<void>` に拡張。

**Rationale**: 既存の全ハンドラ（webhookHandler, approvalCompletedHandler）は第 2 引数を使わないため、型の拡張は後方互換。新しい auditLogHandler のみが `options.tx` を参照する。

### D5: 監査ログハンドラを sync モードで登録する

**Rationale**: 監査ログはトランザクション内で書く必要がある。sync ハンドラは `dispatch()` 内で即座に実行されるため、呼び出し元のトランザクションスコープ内で動作する。async ハンドラ（`flushAsync()` で実行）はトランザクション完了後に発火するため tx が無効になる。

## Risks / Trade-offs

**[Risk]** dispatch() の async 化に伴い、全 22 箇所の await 追加漏れがあると型チェックエラーが発生する。
**Mitigation**: TypeScript の strict モードにより、`Promise<void>` を `void` コンテキストで使用すると型エラーになる。`typecheck` で検出可能。ただし、トランザクション内で `await` を付けないケースが許容される文脈もあるため、grep で全箇所の目視確認も行う。

**[Risk]** sync ハンドラ内の例外がトランザクションをロールバックさせる。
**Mitigation**: これは既存の設計意図通り（dispatcher.ts L41-43 のコメント参照）。auditLogRepository.create が失敗した場合、トランザクション全体がロールバックされるのは監査ログの一貫性保証として正しい動作。

**[Risk]** テストの TC-011 が submitRequest.ts のソースから `auditLogRepository` 文字列を検証しており、手動呼び出し削除後に fail する。
**Mitigation**: テストを更新し、auditLogHandler.ts のソースから `request.submit` の処理を検証する形に変更する。

## Open Questions

なし。architect 評価済みの設計判断により全方針が確定している。
