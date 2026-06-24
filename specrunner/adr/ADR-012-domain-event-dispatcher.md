# ADR-012: ドメインイベントディスパッチャー基盤の設計判断

- **Status**: accepted
- **Date**: 2026-06-24
- **Change**: domain-events
- **Deciders**: architect

---

## Context

ADR-004（Webhook 通知・イベント配信基盤）では、各ユースケースからトランザクション完了後に `void deliverWebhookEvent(...)` を直接呼び出す方式（D4: fire-and-forget）を採用し、イベントバスの導入は却下した（D5: 直接呼び出し）。この設計は以下の問題を引き起こしていた。

1. **Webhook 配信がドメインイベントの概念と分離されている**: 引合の案件化・案件の受注・請求の入金確認等のビジネス事象に対応するイベントがなく、承認関連 8 種のみ対応。新しいドメインの事象を外部に伝達する手段がない。
2. **コードの重複と保守コスト**: 監査ログは 37 箇所のユースケースに手動でコピペされている。Webhook 呼び出しも 9 箇所に散在。将来の通知チャネル追加（監査ログ自動記録・承認ポリシー評価）のたびに全ユースケースを修正する必要がある。
3. **トランザクションとの整合性の欠如**: `void deliverWebhookEvent(...)` はトランザクション外の fire-and-forget であり、トランザクションがロールバックしても配信がトリガーされうる構造的な問題がある。
4. **Node.js EventEmitter の問題**: EventEmitter ベースの実装はエラーハンドリングが弱く、型安全性がない。

本変更では、ドメインイベントの定義・発行・ハンドリングの基盤（インプロセスのイベントディスパッチャー）を導入し、ADR-004 D4・D5 の設計判断を更新する。

---

## Decisions

### D1: インプロセスのイベントディスパッチャーを採用する（ADR-004 D5 を更新）

**Decision**: プロセス内のイベントディスパッチャー（`src/domain/events/dispatcher.ts`）を実装し、全イベント配信をこのディスパッチャー経由に統一する。外部メッセージキュー（Redis Pub/Sub 等）は導入しない。

**Rationale**:
- 現時点の規模ではインプロセスで十分であり、外部依存を増やさない。将来スケールが必要になった時点でディスパッチャーの実装を差し替えればよい。
- ユースケースは「イベントを発行する」だけで通知チャネルを意識しない。ハンドラの追加（監査ログ・ポリシー評価等）はユースケースの変更なしに行える。

**ADR-004 D5 との関係**: 「通知チャネルが複数に増えた段階でイベントバスに移行する」という ADR-004 D5 の将来条件が満たされたため、本 ADR でその移行を実施する。

#### Alternative 1: Node.js EventEmitter

| | |
|---|---|
| **Pros** | 追加ライブラリ不要。実装が最小限 |
| **Cons** | エラーハンドリングが弱い（`error` イベントを購読しないと UncaughtException になる）。型安全性がなく、ハンドラのシグネチャが型チェックされない |
| **Why not** | 型安全性の欠如はドメインイベントの discriminated union 型定義（D4）と相容れない |

#### Alternative 2: Redis Pub/Sub 等の外部メッセージキュー

| | |
|---|---|
| **Pros** | プロセスをまたいだイベント配信が可能。水平スケールに対応できる |
| **Cons** | 外部依存（Redis）が増加し、インフラコストと運用複雑性が増す。現時点の規模では過剰 |
| **Why not** | インプロセスで要件を満たせる現時点では外部依存を増やさない |

---

### D2: 同期・非同期ハンドラの区別をディスパッチャー側で管理する

**Decision**: ハンドラ登録時に `mode: "sync" | "async"` を指定し、ディスパッチャーが実行タイミングを制御する。ユースケースはイベントを `dispatch()` するだけで、ハンドラの実行タイミングを意識しない。

**Rationale**:
- ユースケース側の実装コストを最小化し、イベント発行コードの一貫性を保つ。
- 同期ハンドラ（将来の承認ポリシー評価等、トランザクション整合性が必要な処理）と非同期ハンドラ（Webhook 配信等、失敗がビジネスロジックに影響しない処理）を明確に区別できる。

#### Alternative 1: ユースケース側で同期・非同期を使い分ける

| | |
|---|---|
| **Pros** | 実行タイミングがユースケースのコードから直接読み取れる |
| **Cons** | 呼び出し側の負担が増え、実装漏れが発生しやすい。ハンドラ追加のたびにユースケースを修正する必要がある |
| **Why not** | 実行タイミングの責務はディスパッチャーに集約すべき。ユースケースが通知チャネルの実装詳細を知る必要はない |

---

### D3: 2 フェーズ実行モデルと AsyncLocalStorage によるバッファ分離（ADR-004 D4 を更新）

**Decision**: ディスパッチャーは以下の 2 フェーズでハンドラを実行する。

1. **同期フェーズ**: `dispatch(event)` 呼び出し時に同期ハンドラを即座に実行（トランザクション内）。ハンドラが例外を投げるとトランザクションがロールバックされる。同時にイベントを内部バッファに蓄積する。
2. **非同期フェーズ**: `flushAsync()` 呼び出し時（トランザクションコミット後）にバッファされた全イベントの非同期ハンドラを実行。fire-and-forget（エラーはログ出力のみ、呼び出し元に伝播しない）。

バッファのライフサイクルは `AsyncLocalStorage` で管理する。`dispatcher.runInContext(callback)` でリクエストスコープのバッファを作成し、並行リクエスト間のイベント汚染を構造的に防止する。

ユースケースの呼び出しパターン:

```typescript
return dispatcher.runInContext(async () => {
  const result = await db.transaction(async (tx) => {
    // ... ビジネスロジック ...
    dispatcher.dispatch(event);  // 同期ハンドラ実行 + バッファ蓄積
    return { ok: true, data: ... };
  });

  if (result === null) {
    // 楽観的ロック失敗：バッファは runInContext 終了時に自動破棄
    return { ok: false, reason: "競合が発生しました" };
  }

  dispatcher.flushAsync();  // 非同期ハンドラ実行（fire-and-forget）
  return result;
});
```

**ADR-004 D4 との関係**: ADR-004 D4 で確立した「Webhook 配信はトランザクション外で fire-and-forget」という方針は継承する。ただし本 ADR では `dispatcher.flushAsync()` をトランザクションコミット後に呼び出す形に標準化する。これにより「トランザクションロールバック後に配信がトリガーされる」構造的問題を解消する。

**Rationale**:
- `AsyncLocalStorage` によるリクエストスコープのバッファ分離で、並行リクエスト（await ポイントでのインターリーブ）による汚染を防ぐ。
- トランザクションコミット後の `flushAsync()` により、ロールバックされた操作に対して非同期ハンドラが実行されない。

**既存エラーハンドリング規約の維持**: ユースケースの `{ ok: false, reason: ... }` パターンは変更しない。例外は再スローしない。

#### Alternative 1: ADR-004 D4 の直接 fire-and-forget を継続

| | |
|---|---|
| **Pros** | 変更コストがない |
| **Cons** | トランザクションロールバック後に配信がトリガーされうる。新規イベント種別追加のたびに全ユースケースを修正する必要がある |
| **Why not** | 構造的問題の解消と通知チャネルの拡張性確保が本変更の主目的であるため |

---

### D4: ドメインイベント型を Discriminated Union として定義する

**Decision**: `src/domain/events/types.ts` に 18 種のドメインイベント型を discriminated union として定義する。共通ベースフィールド（`type`, `organizationId`, `actorId`, `occurredAt`）を持ち、`type` フィールドで型を判別する。

```typescript
type BaseDomainEvent = {
  type: string;
  organizationId: string;
  actorId: string;
  occurredAt: Date;
};

type InquiryConverted = BaseDomainEvent & {
  type: "inquiry.converted";
  payload: { inquiryId: string; dealId: string };
};

type DomainEvent = InquiryConverted | InquiryDeclined | DealPhaseChanged | ...;
```

新規 10 種（引合・案件・契約・請求）と既存承認関連 8 種（`RequestCreated`, `RequestSubmitted`, `RequestApproved`, `RequestRejected`, `RequestRevised`, `RequestResubmitted`, `StepApproved`, `StepRejected`）を統一して定義する。

**Rationale**:
- TypeScript の discriminated union により、ハンドラ内で `event.type` による型の絞り込みが型安全に行える。
- ベースフィールドにより全イベントで共通の監査・トレーサビリティ情報（`organizationId`, `actorId`, `occurredAt`）を保証する。

---

### D5: 既存承認関連 Webhook もドメインイベント経由に統一する

**Decision**: 既存の `void deliverWebhookEvent(...)` 直接呼び出し 9 箇所（`createRequest`, `submitRequest`, `approveRequest`, `rejectRequest`, `resubmitRequest` の合計）を全てイベントディスパッチャー経由に置き換える。承認関連の 8 種イベントも `DomainEvent` union 型として定義する。

**Rationale**:
- 二重の配信経路（ディスパッチャー経由と直接呼び出し）を残すと保守コストが増加する。
- 全イベントをディスパッチャー経由にすることで、将来のハンドラ追加（監査ログ・承認ポリシー評価）も一貫した方式で行える。

**ADR-004 D2 との関係**: ADR-004 D2 で確立した `WebhookEventType` の命名規則（過去形・外部 API 互換性）は維持する。

#### Alternative 1: 承認系の直接呼び出しを維持し、新規ドメインイベントのみディスパッチャー経由にする

| | |
|---|---|
| **Pros** | 承認系ユースケースへの変更が不要。移行リスクが限定的 |
| **Cons** | 二重の配信経路（ディスパッチャー経由と直接呼び出し）が並存し、将来のハンドラ追加（監査ログ・承認ポリシー評価）で承認系のみ別途修正が必要になる。配信経路が統一されないため保守コストが高まる |
| **Why not** | 通知チャネルを一箇所で管理するというディスパッチャー導入の主目的が達成されない。承認系もディスパッチャー経由にすることで将来の拡張を均質に行える |

---

### D6: Webhook ハンドラで承認系と新規ドメインイベントの配信経路を分ける

**Decision**: `src/infrastructure/handlers/webhookHandler.ts` に非同期イベントハンドラを実装する。配信経路は以下の 2 系統に分ける。

- **承認系イベント**（`request.*`, `step.*`）: 既存の `deliverWebhookEvent` 関数を呼び出す。`actorName` の DB ルックアップ（`userRepository.findById`）を維持し、既存の Webhook 受信側の互換性を保つ。
- **新規ドメインイベント**（`inquiry.*`, `deal.*`, `contract.*`, `invoice.*`）: 新規実装の `deliverToEndpoint` 関数を呼び出す。`actorName` の DB ルックアップは不要であり行わない。

**Rationale**:
- `deliverWebhookEvent` の `actorName` ルックアップは承認系イベントでは既存受信側が期待するフィールドであり、削除は後方互換性を壊す。
- 新規ドメインイベントには `actorName` を含める業務上の要件がないため、不要な DB クエリを排除できる。
- `deliverSingleAttempt` はリトライ専用関数（既存の `deliveryId` を必須引数とする）のため、新規配信には使用できない。

#### Alternative 1: 新規ドメインイベントにも `deliverSingleAttempt` を使用する

| | |
|---|---|
| **Pros** | 既存のリトライロジックを再利用できる |
| **Cons** | `deliverSingleAttempt` は既存の `deliveryId`（DBに登録済みの配信レコード ID）を必須引数とするリトライ専用関数であり、新規配信（配信レコード未作成の状態）には使用できない。無理に使用すると配信ログとの整合性が崩れる |
| **Why not** | 関数の契約（既存 `deliveryId` が必須）を違反するため使用できない。新規配信には配信レコードの作成から初回配信までを担う `deliverToEndpoint` が適切 |

#### Alternative 2: 承認系と新規ドメインイベントで配信経路を統一する（actorName ルックアップを廃止）

| | |
|---|---|
| **Pros** | ハンドラの実装がシンプルになる |
| **Cons** | 既存の承認系 Webhook 受信側が `actorName` フィールドを期待しているため、削除は後方互換性を壊す外部 API 破壊的変更になる |
| **Why not** | 外部システムとの互換性は維持しなければならない。承認系に限り `actorName` ルックアップを継続することで破壊的変更を回避する |

---

### D7: ハンドラ登録を `registerHandlers()` に集約し、instrumentation.ts から初期化する

**Decision**: `src/infrastructure/handlers/index.ts` に `registerHandlers()` 関数を定義し、ディスパッチャーへのハンドラ登録を一箇所に集約する。初期化は `src/instrumentation.ts`（Next.js の `register` 関数）から行う。Edge Runtime での実行を避けるため、`NEXT_RUNTIME === "nodejs"` ガード付きの動的 import を使用する。

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerHandlers } = await import("@/infrastructure/handlers");
    registerHandlers();
  }
}
```

**Rationale**:
- 静的 import で `instrumentation.ts` から Node.js 専用モジュール（`crypto`）を読み込むと Edge Runtime でクラッシュする。動的 import + `NEXT_RUNTIME` ガードで防止する（Next.js 公式推奨パターン）。
- 依存性注入コンテナを使わない軽量な構成。

#### Alternative 1: 静的 import で registerHandlers を読み込む

| | |
|---|---|
| **Pros** | コードがシンプルで見通しがよい |
| **Cons** | `instrumentation.ts` は Node.js と Edge Runtime の両方で実行される。静的 import により `webhookDelivery.ts` 経由で Node.js 専用モジュール（`crypto`）が Edge Runtime に読み込まれ、実行時クラッシュが発生する（コードレビュー F-001 で実際に検出）。`bun run build` で "Edge Instrumentation" トレースが出力される |
| **Why not** | Next.js の公式ドキュメントが明示的に警告するアンチパターン。コードレビューイテレーション 001 で high severity 指摘として検出・修正済み |

---

### D8: ディスパッチャーをモジュールレベルのシングルトンとして管理する

**Decision**: ディスパッチャーインスタンスをモジュールレベルのシングルトンとして `src/domain/events/dispatcher.ts` から export する。イベントバッファは `AsyncLocalStorage`（D3）でリクエストごとに分離されるため、シングルトンでも並行リクエスト間の汚染は発生しない。テスト時は `reset()` メソッドでハンドラ登録を初期化できる。

**Rationale**:
- Next.js のサーバーサイドではモジュールがプロセス内でキャッシュされるため、シングルトンパターンで十分。
- `AsyncLocalStorage` との組み合わせで、ハンドラ登録はシングルトンで共有しつつバッファはリクエストスコープで分離する。

---

### D9: WEBHOOK_EVENT_TYPES を 18 種に拡張する（ADR-004 D2 を更新）

**Decision**: `WEBHOOK_EVENT_TYPES` に新規 10 種のイベント種別を追加し、合計 18 種とする。

新規追加（10 種）: `inquiry.converted`, `inquiry.declined`, `deal.phase_changed`, `deal.won`, `deal.lost`, `contract.created`, `contract.completed`, `contract.cancelled`, `invoice.paid`, `invoice.overdue`

**ADR-004 D2 との関係**: 命名規則（過去形・外部 API 互換性）と定義場所（`src/domain/models/webhookEvent.ts`）は変更しない。`WebhookEndpoint.events: WebhookEventType[]` 型のためスキーマ変更は不要。Webhook 管理 UI は `WEBHOOK_EVENT_TYPES` を動的に参照しているため自動的に拡張される。

---

## Consequences

### Positive

- ビジネス事象（引合の案件化・案件の受注・請求の入金確認等）を外部システムに伝達できるようになる
- 通知チャネル（監査ログ・承認ポリシー評価）の追加がユースケースの変更なしに行えるようになる
- トランザクションロールバック後に非同期ハンドラが実行されない構造が保証される
- `AsyncLocalStorage` によるリクエストスコープのバッファ分離で並行リクエスト間の汚染が防止される
- TypeScript の discriminated union で全 18 種のイベントが型安全にハンドリングできる

### Negative / Trade-offs

- **`flushAsync()` 呼び出し忘れのリスク**: ユースケースが `dispatch()` 後に `flushAsync()` を呼び忘れると非同期ハンドラが実行されない。テストと `runInContext` の利用で軽減するが、コードレビューでの確認も必要。
- **ドメイン層へのインフラ関心事の混在**: `dispatcher.ts` はハンドラ登録というインフラ関心事を含むため、純粋なドメイン層とは言い難い。ハンドラの実装をインフラ層（`src/infrastructure/handlers/`）に配置することで許容範囲とする。
- **Webhook ハンドラ内のペイロード変換**: ドメインイベントの `payload` 構造と既存の `WebhookEventData` 型（`requestId`, `requestTitle`, `actorName` 等）が異なるため、ハンドラ内での変換が必要。新規ドメインイベントと承認系イベントでペイロード構造が異なることになる。

### Constraints for future changes

- **新規ドメインイベントの追加時**: `src/domain/events/types.ts` に型を追加し、`DomainEvent` union 型に加える。`WEBHOOK_EVENT_TYPES`（`src/domain/models/webhookEvent.ts`）に対応するイベント種別を追加する。Webhook 配信が必要な場合は `webhookHandler.ts` にマッピングを追加する
- **同期ハンドラの追加時**: 同期ハンドラの例外はトランザクションをロールバックさせる。例外を投げることが意図されているか（整合性保護）、それとも意図されていないか（バグ）を明確にして実装すること
- **新規ユースケースでのイベント発行時**: `dispatcher.runInContext()` でコールバックを囲み、トランザクション内で `dispatcher.dispatch(event)` を呼び出し、トランザクションコミット後に `dispatcher.flushAsync()` を呼び出すパターンに従うこと
- **テスト時のディスパッチャー**: テストの `beforeEach` で `dispatcher.reset()` を呼び出してハンドラ登録を初期化すること。これをしないと他のテストで登録したハンドラが残留する
- **承認系 Webhook ペイロードの互換性**: 承認系イベント（`request.*`, `step.*`）のペイロードには `actorName` フィールドが含まれる。外部受信側との互換性を維持するため、このフィールドを削除しないこと
- **`instrumentation.ts` への追加時**: Node.js 専用モジュールを使用するハンドラを追加する場合、必ず動的 import + `NEXT_RUNTIME === "nodejs"` ガードを使用すること。静的 import は Edge Runtime クラッシュの原因となる

---

## References

- `specrunner/changes/domain-events/design.md` — 詳細設計（D1〜D9）
- `specrunner/changes/domain-events/request.md` — 要件定義
- `specrunner/adr/ADR-004-webhook-notification-event-delivery.md` — 本 ADR が更新する設計判断（D4: fire-and-forget 方式、D5: 直接呼び出し方式、D2: イベント種別定義）
- `src/domain/events/types.ts` — 18 種のドメインイベント型定義（DomainEvent union 型）
- `src/domain/events/dispatcher.ts` — イベントディスパッチャー実装（AsyncLocalStorage によるバッファ管理）
- `src/infrastructure/handlers/webhookHandler.ts` — Webhook 非同期ハンドラ（承認系・新規ドメインイベントの配信経路分離）
- `src/infrastructure/handlers/index.ts` — `registerHandlers()` ハンドラ登録集約
- `src/instrumentation.ts` — `NEXT_RUNTIME === "nodejs"` ガード付き動的 import による初期化
- `src/domain/models/webhookEvent.ts` — `WEBHOOK_EVENT_TYPES`（18 種）・`WebhookEventType` 型定義
