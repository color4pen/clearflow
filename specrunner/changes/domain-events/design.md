# Design: ドメインイベント基盤の導入

## Context

ドメインで発生した事象（引合の案件化、案件の受注、請求の入金確認など）を他のコンテキストに伝達する仕組みが存在しない。Webhook 配信は各ユースケースから `void deliverWebhookEvent(...)` でトランザクション外に fire-and-forget で直接呼び出されており、承認関連の 8 イベント種別のみ対応している。

現状の確認済み事実:

- `src/domain/models/webhookEvent.ts` — `WEBHOOK_EVENT_TYPES` に 8 種の承認関連イベントのみ定義（`request.created`, `request.submitted`, `request.approved`, `request.rejected`, `request.revised`, `request.resubmitted`, `step.approved`, `step.rejected`）。`WebhookEventType` union 型と `WebhookPayload`, `WebhookEventData` 型を export
- `src/infrastructure/webhookDelivery.ts` — `deliverWebhookEvent` がインフラ層に直接実装。エンドポイント取得 → HMAC 署名 → HTTP 配信 → リトライの全責務を持つ。`deliverSingleAttempt` も export
- 承認関連 5 ユースケース（`createRequest`, `submitRequest`, `approveRequest`, `rejectRequest`, `resubmitRequest`）が `void deliverWebhookEvent(...)` をトランザクション外で呼び出し中（合計 9 箇所）
- `updateInquiryStatus` — converted 遷移時に Deal を直接生成、declined 遷移も可。イベント発行なし
- `updateDealPhase` — `canDealTransition` でフェーズ遷移を検証。won / lost は終端状態。イベント発行なし
- `createContract` — Deal が won 状態であることを検証して契約作成。イベント発行なし
- `updateContractStatus` — `canContractTransition` でステータス遷移を検証。completed / cancelled は終端状態。イベント発行なし
- `updateInvoiceStatus` — `validateInvoiceTransition` でステータス遷移を検証。paid / overdue は終端状態。イベント発行なし
- `src/infrastructure/db.ts` — `Transaction` 型を export。`db.transaction()` でトランザクション管理
- `src/__tests__/usecases/webhookWorkflow.test.ts` — 静的コード解析で `void deliverWebhookEvent` の呼び出しパターンを検証するテストが存在（変更が必要）
- `src/app/(dashboard)/settings/webhooks/WebhookCreateForm.tsx` — `WEBHOOK_EVENT_TYPES` をチェックボックスとして UI 表示
- `src/domain/models/webhookEndpoint.ts` — `WebhookEndpoint.events` は `WebhookEventType[]` 型

## Goals / Non-Goals

**Goals**:

- `src/domain/events/` に 10 種のドメインイベント型を定義する
- インプロセスのイベントディスパッチャーを実装し、同期ハンドラ（トランザクション内実行）と非同期ハンドラ（トランザクション後実行）を区別できるようにする
- 5 つのユースケース（`updateInquiryStatus`, `updateDealPhase`, `createContract`, `updateContractStatus`, `updateInvoiceStatus`）にドメインイベント発行を組み込む
- 既存の承認関連 Webhook 配信（5 ユースケース、9 箇所）をイベントハンドラ経由に統一する
- `WEBHOOK_EVENT_TYPES` にドメインイベント対応のイベント種別を追加する

**Non-Goals**:

- 監査ログのイベントハンドラ移行（後続リクエストで実施）
- 承認ポリシー評価のイベントハンドラ接続（後続リクエストで実施）
- イベントの永続化（イベントソーシング）
- メッセージキューやイベントバスの外部サービス導入

## Decisions

### D1: インプロセスのイベントディスパッチャーを採用

プロセス内のイベントディスパッチャーを使用する。外部メッセージキュー（Redis Pub/Sub 等）やプロセス外通信は導入しない。

**Rationale**: 現時点の規模ではインプロセスで十分であり、外部依存を増やさない。将来スケールが必要になった時点でディスパッチャーの実装を差し替えればよい。

**Alternatives considered**:
- Node.js EventEmitter — エラーハンドリングが弱く、型安全性がない。却下
- Redis Pub/Sub — 外部依存が増加し、現時点では過剰。却下

### D2: 同期/非同期ハンドラの区別をディスパッチャー側で管理

ハンドラ登録時に `sync` / `async` を指定し、ディスパッチャーが実行タイミングを制御する。ユースケースはイベントを発行するだけで、ハンドラの実行タイミングを意識しない。

**Rationale**: ユースケース側の負担を最小化し、イベント発行コードの一貫性を保つ。ハンドラ実行タイミングの責務をディスパッチャーに集約する。

**Alternatives considered**:
- ユースケース側で同期・非同期を使い分ける — 呼び出し側の負担が増え、漏れが発生しやすい。却下

### D3: ディスパッチャーの 2 フェーズ実行モデル

ユースケースはトランザクション内でイベントを `dispatch()` し、ディスパッチャーは以下の 2 フェーズでハンドラを実行する:

1. **同期フェーズ**: `dispatch(event)` 呼び出し時に同期ハンドラを即座に実行。ハンドラが例外を投げるとトランザクションがロールバックされる。同時にイベントを内部バッファに蓄積する
2. **非同期フェーズ**: `flushAsync()` 呼び出し時（トランザクションコミット後）にバッファされた全イベントの非同期ハンドラを実行。fire-and-forget（`void` 呼び出し、エラーはログ出力のみ）

**バッファのライフサイクル**:

ディスパッチャーは `AsyncLocalStorage` を使用してリクエストごとに独立したイベントバッファを管理する。これにより並行リクエストのトランザクションが await ポイントでインターリーブしても、バッファが汚染されることはない。

ディスパッチャーの `runInContext(callback)` メソッドでリクエストスコープのバッファを作成し、コールバック内で `dispatch()` されたイベントはそのスコープのバッファにのみ蓄積される。

- **トランザクション成功**: コミット後に `flushAsync()` を呼び出す（バッファを消費して実行）
- **楽観的ロック失敗（null リターン）**: バッファは `runInContext` のスコープ終了時に自動破棄される。明示的な破棄は不要
- **ビジネスルール違反**: `{ ok: false, reason: ... }` を返す。既存のエラーハンドリング規約を維持し、例外は再スローしない

ユースケースの呼び出しパターン:

```
return dispatcher.runInContext(async () => {
  const result = await db.transaction(async (tx) => {
    // ... ビジネスロジック ...
    dispatcher.dispatch(event);  // 同期ハンドラ実行 + バッファ蓄積
    // ...
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

**Rationale**: 同期ハンドラは整合性が必要な処理（後続リクエストで実装する承認ポリシー評価など）に使用し、非同期ハンドラは外部配信（Webhook）など失敗がビジネスロジックに影響しない処理に使用する。`AsyncLocalStorage` によるリクエストスコープのバッファ分離で、並行リクエスト間のイベント汚染を構造的に防止する。既存ユースケースの `{ ok: false }` エラーハンドリング規約は変更しない。

### D4: ドメインイベントの型定義方式 — Discriminated Union

各イベントを discriminated union で定義する。共通のベースフィールド（`type`, `organizationId`, `actorId`, `occurredAt`）を持ち、`type` フィールドで判別する。

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

// ... 他のイベントも同様

type DomainEvent = InquiryConverted | InquiryDeclined | ... ;
```

**Rationale**: TypeScript の discriminated union により、ハンドラ内で `event.type` による型の絞り込みが型安全に行える。ベースフィールドにより全イベントで共通の監査・トレーサビリティ情報を保証する。

### D5: 既存承認イベントもドメインイベント化して統一

承認関連の 8 種の既存 Webhook イベントもドメインイベントとして定義する。既存の `void deliverWebhookEvent(...)` 呼び出し 9 箇所を全てイベントディスパッチャー経由に置き換える。

**Rationale**: 二重の配信経路を残すと保守コストが増加する。全イベントをディスパッチャー経由にすることで、将来のハンドラ追加（監査ログ、ポリシー評価）も一貫した方式で行える。

### D6: Webhook 配信ハンドラの実装方式

`src/infrastructure/handlers/webhookHandler.ts` に非同期イベントハンドラを実装する。ハンドラはドメインイベントの `type` を `WebhookEventType` にマッピングし、配信ロジックを呼び出す。承認系イベント（`request.*`, `step.*`）と新規ドメインイベント（`inquiry.*`, `deal.*`, `contract.*`, `invoice.*`）では配信経路を分ける:

- **承認系イベント**: 既存の `deliverWebhookEvent` 関数を呼び出す。この関数は内部で `userRepository.findById(actorId)` を実行して `actorName` を解決し、ペイロードに含める。既存の Webhook 受信側が `actorName` フィールドを期待しているため、このルックアップは維持する
- **新規ドメインイベント**: `deliverToEndpoint` を export し、新規ドメインイベントの配信に使用する。`deliverSingleAttempt` はリトライ専用関数（既存の `deliveryId` を必須引数とする）のため新規配信には使用できない。`deliverToEndpoint` は配信レコードの新規作成から初回配信までを担う。`actorName` の DB ルックアップは不要であり、ペイロードに含めない

**Rationale**: `deliverWebhookEvent` の `actorName` ルックアップは承認系イベントでは必要だが、新規ドメインイベントでは不要な DB クエリとなる。配信経路を分けることで、不要なルックアップを排除しつつ既存の承認系 Webhook の互換性を維持する。

### D7: ハンドラ登録の初期化

`src/infrastructure/handlers/index.ts` に `registerHandlers()` 関数を定義し、ディスパッチャーへのハンドラ登録を一箇所に集約する。初期化は `instrumentation.ts`（Next.js の `register` 関数）または該当機能がない場合はモジュールの副作用として実行する。

**Rationale**: 依存性注入コンテナを使わない軽量な構成。ハンドラ登録を一箇所に集約することで見通しを確保する。

### D8: イベントディスパッチャーのシングルトン管理

ディスパッチャーインスタンスはモジュールレベルのシングルトンとして `src/domain/events/dispatcher.ts` から export する。イベントバッファは `AsyncLocalStorage`（D3）でリクエストごとに分離されるため、シングルトンでも並行リクエスト間の汚染は発生しない。

**Rationale**: Next.js のサーバーサイドではモジュールがプロセス内でキャッシュされるため、シングルトンパターンで十分。`AsyncLocalStorage` との組み合わせで、ハンドラ登録はシングルトンで共有しつつバッファはリクエストスコープで分離する。テスト時はモジュールモックまたは `reset()` メソッドで初期化可能。

### D9: Webhook イベント種別の拡張方針

`WEBHOOK_EVENT_TYPES` に以下の新規イベント種別を追加する:

- `inquiry.converted`
- `inquiry.declined`
- `deal.phase_changed`
- `deal.won`
- `deal.lost`
- `contract.created`
- `contract.completed`
- `contract.cancelled`
- `invoice.paid`
- `invoice.overdue`

既存の 8 種と合わせて 18 種となる。`WebhookEndpoint.events` 型は `WebhookEventType[]` のため、スキーマ変更は不要。Webhook エンドポイント作成 UI のチェックボックスリストは `WEBHOOK_EVENT_TYPES` を動的に参照しているため自動的に拡張される。

**Rationale**: ドメインイベントと 1:1 で対応する Webhook イベント種別を追加することで、外部システムとの連携を可能にする。

## Risks / Trade-offs

[Risk] 既存テスト `webhookWorkflow.test.ts` の破壊 — 承認関連ユースケースから `void deliverWebhookEvent` を除去すると、静的コード解析テスト（`void deliverWebhookEvent` の存在確認、トランザクション外呼び出しの検証、`WEBHOOK_EVENT_TYPES` の要素数 8 の検証）が失敗する。テストを更新してイベントディスパッチャー経由の新パターンを検証するようにする。

[Risk] 2 フェーズ実行の `flushAsync()` 呼び出し忘れ — ユースケースが `dispatch()` を呼んだ後に `flushAsync()` を呼び忘れると非同期ハンドラが実行されない。テストで検証し、コードレビューで確認する。

[Trade-off] Webhook ハンドラ内のペイロード変換 — ドメインイベントの `payload` 構造と既存の `WebhookEventData` 型（`requestId`, `requestTitle`, `actorName` 等）が異なるため、ハンドラ内で変換が必要。新しいドメインイベント用のペイロードは対象エンティティの ID と状態を中心に構成し、`WebhookEventData` とは別の構造を許容する。`WebhookPayload.data` 型を拡張するか、イベント種別ごとに適切なペイロードを構築する。

[Trade-off] ディスパッチャーをドメイン層に配置 — `dispatcher.ts` はハンドラ登録というインフラ関心事を含むため、純粋なドメイン層とは言い難い。ただしイベントの型定義とディスパッチのインターフェースはドメインの関心事であり、ハンドラの実装はインフラ層に配置するため、許容範囲とする。

## Open Questions

なし
