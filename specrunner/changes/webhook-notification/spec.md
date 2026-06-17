# Spec: Webhook 通知とイベント配信基盤

## Requirements

### Requirement: Webhook 配信はトランザクション外で fire-and-forget で実行される

各 usecase で `deliverWebhookEvent` の呼び出しは `db.transaction()` ブロックの外で行われ SHALL、`void` キーワード付きで呼び出される MUST。配信の成功/失敗がユーザーへのレスポンスに影響しない MUST。

#### Scenario: approveRequest でトランザクション完了後に Webhook が配信される

**Given** Webhook エンドポイントが登録されている組織の `pending` 状態の申請が存在する
**When** `approveRequest` usecase が実行され、トランザクションが正常に完了する
**Then** `deliverWebhookEvent` が `db.transaction()` の外で `void` 付きで呼び出され、トランザクション結果が先にユーザーに返される

#### Scenario: Webhook 配信が失敗してもユーザーレスポンスは成功する

**Given** Webhook エンドポイントの配信先 URL が到達不能である
**When** `approveRequest` usecase が実行される
**Then** usecase は `{ ok: true }` を返し、`webhook_deliveries` の status が `"failed"` に更新される

### Requirement: 8 種類の Webhook イベントが定義される

`src/domain/models/webhookEvent.ts` に以下の 8 種別が定義 SHALL される: `request.created`, `request.submitted`, `request.approved`, `request.rejected`, `request.revised`, `request.resubmitted`, `step.approved`, `step.rejected`。`WEBHOOK_EVENT_TYPES` 定数配列と `WebhookEventType` 型が export される MUST。

#### Scenario: イベント種別の定義を確認する

**Given** `src/domain/models/webhookEvent.ts` が存在する
**When** ファイルの内容を検査する
**Then** `WEBHOOK_EVENT_TYPES` 配列に 8 個の要素が含まれ、`WebhookEventType` 型が文字列リテラルユニオンとして export されている

### Requirement: HMAC-SHA256 署名が X-Clearflow-Signature ヘッダーに付与される

Webhook 配信時に、エンドポイントの `secret` とリクエストボディから HMAC-SHA256 署名を生成し、`X-Clearflow-Signature: sha256=<hex>` 形式でヘッダーに付与 SHALL する。

#### Scenario: 既知の入力に対して正しい署名が生成される

**Given** secret が `"test_secret"` でペイロードが `'{"event":"request.approved"}'` である
**When** `computeSignature` 関数を呼び出す
**Then** `crypto.createHmac("sha256", secret).update(payload).digest("hex")` と同一の hex 文字列が返される

#### Scenario: 配信リクエストに署名ヘッダーが含まれる

**Given** secret が `"whsec_abc123"` の Webhook エンドポイントが存在する
**When** そのエンドポイントにイベントが配信される
**Then** HTTP リクエストのヘッダーに `X-Clearflow-Signature` が `sha256=` プレフィックス付きで含まれる

### Requirement: 各 usecase が正しいイベントを発火する

各 usecase のトランザクション完了後に、対応する Webhook イベントが配信 SHALL される。

#### Scenario: createRequest が request.created を発火する

**Given** Webhook エンドポイントが登録されている組織が存在する
**When** `createRequest` usecase が正常完了する
**Then** `deliverWebhookEvent` が `event: "request.created"` で呼び出される

#### Scenario: submitRequest が request.submitted を発火する

**Given** Webhook エンドポイントが登録されている組織が存在する
**When** `submitRequest` usecase が正常完了する
**Then** `deliverWebhookEvent` が `event: "request.submitted"` で呼び出される

#### Scenario: approveRequest がステップ承認と全ステップ完了の両方を発火する

**Given** 2 つの承認ステップを持つ申請で、stepOrder: 1 が `approved`、stepOrder: 2 が `pending` である
**When** admin ユーザーが `approveRequest` を実行し全ステップが完了する
**Then** `step.approved` と `request.approved` の両方のイベントが配信される

#### Scenario: rejectRequest (revision) が request.revised と step.rejected を発火する

**Given** 承認ステップを持つ `pending` 状態の申請が存在する
**When** `rejectRequest` が `targetStatus: "revision"` で実行される
**Then** `request.revised` と `step.rejected` の両方のイベントが配信される

#### Scenario: rejectRequest (rejected) が request.rejected を発火する

**Given** `pending` 状態の申請が存在する
**When** `rejectRequest` が `targetStatus: "rejected"` で実行される
**Then** `request.rejected` イベントが配信される

#### Scenario: resubmitRequest が request.resubmitted を発火する

**Given** `revision` 状態の申請が存在する
**When** `resubmitRequest` が実行される
**Then** `request.resubmitted` イベントが配信される

### Requirement: Webhook ペイロードが共通構造を持つ

全イベントのペイロードは `{ event, timestamp, organizationId, data: { requestId, requestTitle, actorId, actorName, ... } }` の共通構造 SHALL を持つ。`WebhookPayload` 型として定義される MUST。

#### Scenario: ペイロードに必須フィールドが含まれる

**Given** `request.approved` イベントが発生する
**When** ペイロードが構築される
**Then** `event`, `timestamp` (ISO 8601), `organizationId`, `data.requestId`, `data.requestTitle`, `data.actorId`, `data.actorName` が全て非 null で含まれる

### Requirement: Webhook エンドポイントのクエリにテナント分離が適用される

`webhookEndpointRepository` と `webhookDeliveryRepository` の全クエリに `organizationId` 条件が付与 SHALL される。異なる組織のエンドポイントや配信ログにアクセスできない MUST。

#### Scenario: エンドポイント一覧取得で organizationId フィルタが適用される

**Given** 組織 A と組織 B がそれぞれ Webhook エンドポイントを持つ
**When** 組織 A の `findByOrganization` を呼び出す
**Then** 組織 A のエンドポイントのみが返され、組織 B のエンドポイントは返されない

#### Scenario: エンドポイント削除で organizationId 条件が付与される

**Given** 組織 A のエンドポイント ID を取得する
**When** 組織 B のコンテキストでそのエンドポイントを削除しようとする
**Then** 削除は実行されない（`organizationId` 条件が一致しないため行が見つからない）

### Requirement: Webhook 管理ページは admin ロールのみアクセス可能

Webhook エンドポイントの作成・削除・有効/無効切り替え・配信ログ閲覧の Server Action は、`session.user.role === "admin"` でない場合にエラーを返す SHALL。

#### Scenario: member ロールがエンドポイント作成を試みる

**Given** `member` ロールのユーザーが認証されている
**When** `createWebhookEndpointAction` を呼び出す
**Then** `{ success: false, message: "権限がありません" }` が返される

#### Scenario: admin ロールがエンドポイント作成に成功する

**Given** `admin` ロールのユーザーが認証されている
**When** `createWebhookEndpointAction` を有効な URL とイベント種別で呼び出す
**Then** エンドポイントが作成され、自動生成された secret が返される

### Requirement: webhook_endpoints テーブルと webhook_deliveries テーブルが schema.ts に定義される

`src/infrastructure/schema.ts` に `webhookEndpoints` テーブルと `webhookDeliveries` テーブルが定義 SHALL される。`webhookDeliveryStatusEnum` が定義される MUST。

#### Scenario: スキーマ定義を確認する

**Given** `src/infrastructure/schema.ts` が存在する
**When** ファイルの内容を検査する
**Then** `webhookEndpoints` テーブル、`webhookDeliveries` テーブル、`webhookDeliveryStatusEnum` が定義されている

### Requirement: 配信失敗時に webhook_deliveries の status が failed に更新される

Webhook 配信で HTTP レスポンスが 2xx 以外、ネットワークエラー、またはタイムアウト（5 秒）の場合、`webhook_deliveries` レコードの `status` を `"failed"` に更新 SHALL し、`attempts` をインクリメントする MUST。

#### Scenario: HTTP 500 レスポンスで配信失敗が記録される

**Given** Webhook エンドポイントの配信先が HTTP 500 を返す
**When** イベント配信が実行される
**Then** `webhook_deliveries` の `status` が `"failed"`, `statusCode` が 500, `attempts` が 1 になる

#### Scenario: タイムアウトで配信失敗が記録される

**Given** Webhook エンドポイントの配信先が 5 秒以上応答しない
**When** イベント配信が実行される
**Then** `webhook_deliveries` の `status` が `"failed"`, `statusCode` が null, `attempts` が 1 になる

### Requirement: イベント購読フィルタリングが適用される

Webhook エンドポイントの `events` 配列に含まれるイベント種別のみが配信 SHALL される。購読していないイベントはそのエンドポイントに配信されない MUST。

#### Scenario: request.approved のみ購読しているエンドポイントに request.submitted は配信されない

**Given** `events: ["request.approved"]` のエンドポイントが存在する
**When** `request.submitted` イベントが発生する
**Then** そのエンドポイントには配信されない（`findActiveByOrganizationAndEvent` の結果に含まれない）

#### Scenario: 全イベント購読しているエンドポイントに全イベントが配信される

**Given** `events` に 8 種類全てのイベントを含むエンドポイントが存在する
**When** `request.created` イベントが発生する
**Then** そのエンドポイントに配信される

### Requirement: 依存方向 actions -> usecases -> domain / infrastructure を遵守する

新規追加するドメインモデル（`webhookEvent.ts`, `webhookEndpoint.ts`, `webhookDelivery.ts`）に `@/infrastructure` の import がない MUST。

#### Scenario: domain/models 配下の Webhook 関連ファイルに ORM import がない

**Given** `src/domain/models/webhookEvent.ts`, `src/domain/models/webhookEndpoint.ts`, `src/domain/models/webhookDelivery.ts` が存在する
**When** 各ファイルの import 文を検査する
**Then** `drizzle`, `@/infrastructure`, `postgres` への import が含まれていない
