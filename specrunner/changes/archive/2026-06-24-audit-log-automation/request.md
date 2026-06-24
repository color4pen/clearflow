# dispatcher の async 化と submitRequest の監査ログハンドラ移行

## Meta

- **type**: refactor
- **slug**: audit-log-automation
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: dispatcher の内部実装変更だが外部インターフェースの互換性は維持。最小スコープ → false -->

## 背景

R01 で導入した EventDispatcher の dispatch() メソッドは同期呼び出し（戻り値 void）で実装されている。しかし監査ログのハンドラ移行には、sync ハンドラ内で auditLogRepository.create(data, tx) を await する必要がある。

本リクエストでは dispatch() を async 化し、tx 伝播の仕組みを追加した上で、最も単純な submitRequest の監査ログを 1 件ハンドラに移行して動作を検証する。

## 現状コードの前提

- `src/domain/events/dispatcher.ts:4` — `EventHandler` 型は既に `(event: T) => void | Promise<void>` で async 対応済み
- `src/domain/events/dispatcher.ts:29` — `dispatch(event: DomainEvent): void` — 戻り値が void。sync ハンドラの呼び出し（行 43）で `entry.handler(event)` を呼ぶが、handler が Promise を返しても await しない
- `src/domain/events/dispatcher.ts:12` — AsyncLocalStorage のストアは `DomainEvent[]` 型。tx を保持する仕組みがない
- `src/application/usecases/submitRequest.ts:46-55` — `auditLogRepository.create` を手動呼び出し。action: "request.submit", metadata なし。tx 引数あり
- `src/application/usecases/submitRequest.ts:57` — `dispatcher.dispatch(...)` を呼び出し。await なし
- 全ユースケースの dispatch 呼び出しは 20 箇所（grep 結果）。いずれも await なし

## 要件

1. **dispatch() の async 化**: `dispatch(event: DomainEvent): void` を `dispatch(event: DomainEvent, options?: { tx?: unknown }): Promise<void>` に変更する。sync ハンドラの呼び出しを `await entry.handler(event, options)` に変更する。`EventHandler` 型を `(event: T, options?: { tx?: unknown }) => void | Promise<void>` に拡張する
2. **全既存 dispatch 呼び出しに await を追加**: 全 20 箇所の `dispatcher.dispatch(...)` を `await dispatcher.dispatch(...)` に変更する。トランザクション内で呼び出されているため、await しても既存の動作は変わらない（現在の sync ハンドラは void を返すため await は即座に解決する）
3. **submitRequest の dispatch 呼び出しに tx を追加**: `await dispatcher.dispatch(event, { tx })` とする
4. **監査ログハンドラの実装**: `src/infrastructure/handlers/auditLogHandler.ts` を新設。sync ハンドラとして登録する。`request.submitted` イベントのみ処理する。action: "request.submit", targetType: "request", targetId: event.payload.requestId, actorId: event.actorId, organizationId: event.organizationId, metadata: null。tx は options.tx から取得し、`auditLogRepository.create(data, tx as Transaction)` でトランザクション内で記録する
5. **registerHandlers の更新**: `src/infrastructure/handlers/index.ts` に監査ログハンドラを登録する
6. **submitRequest の手動呼び出し削除**: `src/application/usecases/submitRequest.ts` から `auditLogRepository.create` の手動呼び出し（行 46-55）と `auditLogRepository` の import を削除する
7. **既存テストの更新**: `src/__tests__/usecases/webhookWorkflow.test.ts` 等に submitRequest 内の `auditLogRepository` 文字列を検証するスタティック解析テストがある場合、手動呼び出し削除に合わせて当該アサーションを削除または更新する

## スコープ外

- submitRequest 以外のユースケースの監査ログハンドラ移行
- 他のユースケースの dispatch 呼び出しへの tx 追加（await 追加のみ）
- 非同期ハンドラの変更

## 受け入れ基準

- [ ] `dispatch()` の戻り値が `Promise<void>` になっている
- [ ] `EventHandler` 型が options 引数を受け取れる
- [ ] 全 20 箇所の dispatch 呼び出しに await が追加されている
- [ ] submitRequest の dispatch 呼び出しに `{ tx }` が渡されている
- [ ] 監査ログハンドラが sync ハンドラとして登録されている
- [ ] submitRequest で監査ログが自動記録される（action: "request.submit"）
- [ ] submitRequest から手動の auditLogRepository.create 呼び出しが削除されている
- [ ] 他の全ユースケースの監査ログが引き続き手動で正常に動作する
- [ ] 既存の Webhook ハンドラが引き続き正常に動作する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **dispatch を async に変更** — sync ハンドラで async DB 操作（auditLogRepository.create）を await する必要がある。void 戻り値のままでは Promise が捨てられる。全呼び出し元に await を追加するが、現在の sync ハンドラは void を返すため await は no-op であり既存動作に影響しない。却下案: 新しい dispatchAsync メソッドを追加 — 2 つの dispatch メソッドが存在すると使い分けが混乱する
2. **options.tx を unknown 型で受ける** — dispatcher はドメイン層に配置されており、drizzle の Transaction 型を直接 import するとアーキテクチャ違反になる。ハンドラ（インフラ層）側で `tx as Transaction` にキャストする。却下案: dispatcher をインフラ層に移動 — イベント型定義との分離が崩れる
3. **submitRequest 1 件のみ移行** — metadata が不要（null）な最も単純なケース。dispatch async 化 + tx 伝播 + ハンドラ登録の基盤検証に十分。却下案: 複数ユースケース一括 — metadata 不足やテスト更新の複雑さで escalation する
