# Spec: Webhook リトライと監査ログ CSV エクスポート

## Requirements

### Requirement: 配信失敗時に exponential backoff で最大 3 回リトライされる

`deliverToEndpoint` は配信失敗時に自動リトライ SHALL する。最大リトライ回数は 3 回（初回含め計 4 回試行）MUST。バックオフ間隔は `1s, 4s, 16s`（`BASE_DELAY_MS * 4^retryIndex`）MUST。

#### Scenario: 外部サービスの一時的ダウンからリトライで回復する

**Given** Webhook エンドポイントが登録されている組織の配信先が一時的に HTTP 500 を返す
**When** イベント配信が実行され、初回と 1 回目のリトライが失敗し、2 回目のリトライで HTTP 200 が返る
**Then** `webhook_deliveries` の `status` が `"delivered"`, `attempts` が 3 になる

#### Scenario: 全リトライ失敗後に status が failed で確定する

**Given** Webhook エンドポイントの配信先が全ての試行で HTTP 500 を返す
**When** イベント配信が実行される
**Then** `webhook_deliveries` の `status` が `"failed"`, `attempts` が 4 になり、`nextRetryAt` が null になる

### Requirement: バックオフ間隔が 1s, 4s, 16s である

リトライ待機間隔は `BASE_DELAY_MS * 4^retryIndex` で算出 SHALL する。`BASE_DELAY_MS = 1000` MUST。

#### Scenario: バックオフ間隔を確認する

**Given** `webhookDelivery.ts` のソースコードを検査する
**When** `BASE_DELAY_MS` 定数と `MAX_ATTEMPTS` 定数を確認する
**Then** `BASE_DELAY_MS` が 1000、`MAX_ATTEMPTS` が 4 であり、バックオフ計算ロジックが `BASE_DELAY_MS * 4^retryIndex` で実装されている

### Requirement: 各試行で attempts をインクリメントし lastAttemptAt を更新する

リトライループの各試行で `webhook_deliveries` レコードの `attempts` と `lastAttemptAt` を更新 SHALL する。リトライ中は `status: "pending"` を維持 MUST。

#### Scenario: リトライ中に attempts がインクリメントされる

**Given** Webhook エンドポイントの配信先が 2 回失敗して 3 回目で成功する
**When** イベント配信が実行される
**Then** 各試行で `attempts` が 1, 2, 3 とインクリメントされ、`lastAttemptAt` が各試行時刻に更新される

### Requirement: webhook_deliveries テーブルに nextRetryAt カラムが存在する

`src/infrastructure/schema.ts` の `webhookDeliveries` テーブルに `nextRetryAt` (timestamp, nullable) カラムが定義 SHALL される。`WebhookDelivery` 型に `nextRetryAt: Date | null` フィールドが存在 MUST する。

#### Scenario: スキーマに nextRetryAt カラムが存在する

**Given** `src/infrastructure/schema.ts` が存在する
**When** `webhookDeliveries` テーブル定義を検査する
**Then** `next_retry_at` カラムが timestamp 型で定義されている

#### Scenario: WebhookDelivery 型に nextRetryAt が存在する

**Given** `src/domain/models/webhookDelivery.ts` が存在する
**When** `WebhookDelivery` 型を検査する
**Then** `nextRetryAt: Date | null` フィールドが定義されている

### Requirement: 手動リトライが admin ロールのみ実行可能

`retryWebhookDeliveryAction` は `session.user.role === "admin"` でない場合にエラーを返す SHALL。`failed` 状態の配信のみリトライ可能 MUST。

#### Scenario: admin ロールが failed 配信を手動リトライする

**Given** `admin` ロールのユーザーが認証されており、`failed` 状態の配信レコードが存在する
**When** `retryWebhookDeliveryAction(deliveryId)` を呼び出す
**Then** 配信がリトライされ、`status` が `"pending"` にリセットされる

#### Scenario: member ロールが手動リトライを試みる

**Given** `member` ロールのユーザーが認証されている
**When** `retryWebhookDeliveryAction(deliveryId)` を呼び出す
**Then** `{ success: false, message: "権限がありません" }` が返される

#### Scenario: delivered 状態の配信をリトライしようとする

**Given** `admin` ロールのユーザーが認証されており、`delivered` 状態の配信レコードが存在する
**When** `retryWebhookDeliveryAction(deliveryId)` を呼び出す
**Then** エラーが返される

### Requirement: 手動リトライは1回のみの単発試行であり exponential backoff は適用しない

`retryWebhookDeliveryAction` による手動リトライは1回のみ配信を試行する MUST。exponential backoff は適用しない MUST。`attempts` は既存の値に 1 を加算する MUST。成功時は `status: "delivered"`, `nextRetryAt: null`、失敗時は `status: "failed"`, `nextRetryAt: null` に更新する MUST。

#### Scenario: 手動リトライが1回のみ試行される

**Given** `admin` ロールのユーザーが認証されており、`attempts: 3` の `failed` 状態の配信レコードが存在する
**When** `retryWebhookDeliveryAction(deliveryId)` を呼び出す
**Then** 配信が1回のみ試行され（exponential backoff なし）、成功時は `status: "delivered"`, `attempts: 4`, `nextRetryAt: null`、失敗時は `status: "failed"`, `attempts: 4`, `nextRetryAt: null` に更新される

#### Scenario: 手動リトライ後の nextRetryAt が null である

**Given** `admin` ロールのユーザーが認証されており、`failed` 状態の配信レコードが存在する
**When** `retryWebhookDeliveryAction(deliveryId)` を呼び出す
**Then** リトライ結果（成功・失敗）にかかわらず `nextRetryAt` が null になる

### Requirement: 手動リトライのテナント分離

`retryWebhookDeliveryAction` は配信レコードに紐づくエンドポイントの `organizationId` がセッションの `organizationId` と一致することを検証 SHALL する。

#### Scenario: 他組織の配信レコードをリトライしようとする

**Given** 組織 A の admin ユーザーが認証されており、組織 B の `failed` 配信レコードが存在する
**When** 組織 A のコンテキストで組織 B の配信レコード ID を指定して `retryWebhookDeliveryAction` を呼び出す
**Then** エラーが返され、リトライは実行されない

### Requirement: /api/audit-logs/export が CSV を返す

`/api/audit-logs/export` Route Handler は GET リクエストに対して `text/csv` 形式のレスポンスを返す SHALL。CSV カラムは `timestamp,action,targetType,targetId,actorId,metadata` MUST。

#### Scenario: admin ユーザーが CSV エクスポートを実行する

**Given** `admin` ロールのユーザーが認証されており、組織に監査ログが 3 件存在する
**When** `GET /api/audit-logs/export` を実行する
**Then** `Content-Type: text/csv; charset=utf-8` のレスポンスが返り、ヘッダー行 + 3 行のデータ行を含む CSV が取得できる

#### Scenario: 日付範囲フィルタが適用される

**Given** 2026-01-01 と 2026-06-01 に監査ログが各 1 件存在する
**When** `GET /api/audit-logs/export?startDate=2026-05-01&endDate=2026-06-30` を実行する
**Then** 2026-06-01 の 1 件のみが CSV に含まれる

#### Scenario: metadata が JSON.stringify で 1 カラムに出力される

**Given** `metadata: { "amount": 50000, "status": "approved" }` を持つ監査ログが存在する
**When** CSV エクスポートを実行する
**Then** metadata カラムに `"{""amount"":50000,""status"":""approved""}"` が出力される

### Requirement: CSV エクスポートに organizationId フィルタが適用される

`/api/audit-logs/export` Route Handler は `session.user.organizationId` でフィルタした監査ログのみを返す SHALL。異なる組織の監査ログが含まれない MUST。

#### Scenario: セッションの organizationId でフィルタされる

**Given** 組織 A に 5 件、組織 B に 3 件の監査ログが存在する
**When** 組織 A の admin ユーザーが CSV エクスポートを実行する
**Then** 組織 A の 5 件のみが CSV に含まれる

### Requirement: CSV エクスポートの認証・認可

`/api/audit-logs/export` は未認証で 401、admin 以外で 403 を返す SHALL。

#### Scenario: 未認証で CSV エクスポートを試みる

**Given** 認証されていないユーザー
**When** `GET /api/audit-logs/export` を実行する
**Then** HTTP 401 が返される

#### Scenario: member ロールで CSV エクスポートを試みる

**Given** `member` ロールのユーザーが認証されている
**When** `GET /api/audit-logs/export` を実行する
**Then** HTTP 403 が返される

### Requirement: 監査ログ一覧のクエリに organizationId 条件が付与される

`auditLogRepository.findByOrganization` は `organizationId` でフィルタ SHALL する。`createdAt` 降順で取得 MUST。

#### Scenario: findByOrganization が organizationId でフィルタする

**Given** `auditLogRepository.ts` のソースコードを検査する
**When** `findByOrganization` 関数の実装を確認する
**Then** `organizationId` が WHERE 条件に含まれ、`createdAt` 降順のソートが適用されている

### Requirement: 監査ログ一覧ページは admin ロールのみアクセス可能

`/settings/audit-logs` ページは admin ロール以外で `redirect("/requests")` SHALL する。

#### Scenario: member ロールが監査ログ一覧にアクセスする

**Given** `member` ロールのユーザーが認証されている
**When** `/settings/audit-logs` にアクセスする
**Then** `/requests` にリダイレクトされる

### Requirement: 依存方向 actions -> usecases -> domain / infrastructure を遵守する

新規追加・変更するファイルが既存のアーキテクチャレイヤー規約に違反しない MUST。`domain/models/` 配下のファイルに `@/infrastructure` の import がない MUST。

#### Scenario: WebhookDelivery 型の変更が domain 層の規約に違反しない

**Given** `src/domain/models/webhookDelivery.ts` を検査する
**When** import 文を確認する
**Then** `drizzle`, `@/infrastructure`, `postgres` への import が含まれていない
