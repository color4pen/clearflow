# Design: Webhook 通知とイベント配信基盤

## Context

Clearflow の承認ワークフローでは、申請の状態変更が `audit_logs` テーブルに記録されるのみで、外部システムへのリアルタイム通知手段がない。Slack 連携や社内ポータルとの接続を可能にするため、組織ごとに Webhook エンドポイントを登録し、状態変更イベントを HTTP POST で配信する基盤を導入する。

確認済みの現状コード:

- `src/infrastructure/schema.ts:68-80` -- `audit_logs` テーブルが状態変更イベントを記録している。action, targetType, targetId, actorId, organizationId, metadata, createdAt を持つ
- `src/application/usecases/approveRequest.ts` -- `db.transaction()` 内で `auditLogRepository.create` を呼び出し、トランザクション完了後に何も行わない。Webhook 関連の処理なし
- `src/application/usecases/rejectRequest.ts` -- 同上。`targetStatus` 引数で差し戻し (`revision`) と最終却下 (`rejected`) を区別
- `src/application/usecases/submitRequest.ts` -- 同上
- `src/application/usecases/resubmitRequest.ts` -- 同上
- `src/application/usecases/createRequest.ts` -- 同上。テンプレート自動選択後、トランザクション内で `requestRepository.create` + `approvalStepRepository.createMany` + `auditLogRepository.create`
- `src/infrastructure/schema.ts:29-33` -- `organizations` テーブルは id, name, createdAt のみ。Webhook 設定なし
- `src/infrastructure/repositories/index.ts` -- 6 リポジトリ: organization, user, request, auditLog, approvalStep, approvalTemplate
- `src/domain/models/index.ts` -- Organization, User, Request, AuditLog, ApprovalStep, ApprovalTemplate の型を export
- `src/infrastructure/db.ts:43` -- `Transaction` 型が export されている。リポジトリは `tx?: Transaction` パターンで呼び出し元からトランザクションを受け取る
- Webhook 関連のテーブル・モデル・サービスは一切存在しない

## Goals / Non-Goals

**Goals**:

- `webhook_endpoints` テーブルを新設し、組織ごとに複数の Webhook エンドポイント（URL, HMAC 署名用 secret, 購読イベント種別, 有効/無効）を管理する
- `webhook_deliveries` テーブルを新設し、配信ログ（ステータス、HTTP レスポンスコード、試行回数）を記録する
- 8 種類のイベント（`request.created`, `request.submitted`, `request.approved`, `request.rejected`, `request.revised`, `request.resubmitted`, `step.approved`, `step.rejected`）を定義する
- HMAC-SHA256 署名を `X-Clearflow-Signature` ヘッダーに付与して配信する
- 各 usecase のトランザクション完了後に fire-and-forget で Webhook を配信する（配信失敗がユーザーレスポンスに影響しない）
- 組織設定ページ（admin 専用）で Webhook エンドポイントの CRUD と配信ログの閲覧を可能にする
- テナント分離を全クエリに適用する

**Non-Goals**:

- Webhook 配信のリトライ（exponential backoff）
- Webhook 配信のキューイング（バックグラウンドジョブ）
- Webhook エンドポイントの URL 検証（到達性チェック）
- Webhook ペイロードの暗号化
- 配信タイムアウト設定のカスタマイズ（固定 5 秒）

## Decisions

### D1: `webhook_endpoints` テーブルを新設し、組織ごとに複数の Webhook エンドポイントを管理

`src/infrastructure/schema.ts` に `webhookDeliveryStatusEnum` と `webhookEndpoints` テーブル、`webhookDeliveries` テーブルを追加する。

**`webhookEndpoints` カラム**:
- `id` (uuid PK, defaultRandom)
- `organizationId` (uuid FK -> organizations, notNull)
- `url` (text, notNull) -- 配信先 URL
- `secret` (text, notNull) -- HMAC-SHA256 署名生成用シークレット
- `isActive` (boolean, notNull, default true) -- 有効/無効フラグ
- `events` (text[], notNull) -- 購読するイベント種別のリスト
- `createdAt` (timestamp, defaultNow, notNull)
- `updatedAt` (timestamp, defaultNow, notNull)

**`webhookDeliveries` カラム**:
- `id` (uuid PK, defaultRandom)
- `endpointId` (uuid FK -> webhookEndpoints, notNull)
- `event` (text, notNull) -- 配信したイベント種別
- `payload` (jsonb, notNull) -- 配信ペイロード全体
- `status` (webhookDeliveryStatusEnum: `"pending" | "delivered" | "failed"`, notNull, default "pending")
- `statusCode` (integer, nullable) -- HTTP レスポンスコード
- `attempts` (integer, notNull, default 0) -- 配信試行回数
- `lastAttemptAt` (timestamp, nullable) -- 最終試行日時
- `createdAt` (timestamp, defaultNow, notNull)

**`webhookDeliveryStatusEnum`**: `pgEnum("webhook_delivery_status", ["pending", "delivered", "failed"])`

**Relations**:
- `webhookEndpoints` -> `organizations` (many-to-one)
- `webhookDeliveries` -> `webhookEndpoints` (many-to-one)
- `organizations` に `webhookEndpoints` への many relation を追加

**Rationale**: Webhook エンドポイントを独立テーブルで管理することで、組織ごとの複数エンドポイント、エンドポイントごとのイベントフィルタリング、個別の有効/無効制御が可能になる。`organizations` テーブルに Webhook 用カラムを追加する方式では、これらの柔軟性が得られない。

**Alternatives considered**:
- `organizations` テーブルに `webhookUrl`, `webhookSecret` カラムを追加 -- 1 組織 1 エンドポイントに制限される。イベント種別フィルタもできない。却下

### D2: 8 種類の Webhook イベントを `src/domain/models/webhookEvent.ts` に定義

イベント種別を `WebhookEventType` として文字列リテラルユニオン型で定義する。

```
request.created    -- createRequest 完了時
request.submitted  -- submitRequest 完了時
request.approved   -- 全ステップ完了で申請が approved に遷移した時
request.rejected   -- 最終却下 (rejected) 時
request.revised    -- 差し戻し (revision) 時
request.resubmitted -- 再申請 (resubmit) 時
step.approved      -- 個別ステップが承認された時
step.rejected      -- 個別ステップが差し戻しで rejected になった時
```

定数配列 `WEBHOOK_EVENT_TYPES` も export し、DB の `events` カラムのバリデーションやシードデータで使用する。

**Rationale**: audit_logs の `action` 名は `request.create`, `request.submit` 等のドット区切り動詞形だが、Webhook イベントは過去形（`request.created`, `request.submitted`）を採用する。これは GitHub / Stripe の Webhook 命名規則に合わせたもので、外部システム連携における一般的な慣例に従う。audit_logs の `action` と 1:1 対応させず、Webhook イベントを独立した概念として定義する。

**Alternatives considered**:
- audit_logs の `action` をそのまま使う -- 内部向けの命名と外部 API の命名を混在させたくない。将来 audit_logs 側の action 名を変更する際に Webhook の互換性が壊れる。却下

### D3: HMAC-SHA256 署名を `X-Clearflow-Signature` ヘッダーに付与

配信時に、エンドポイントの `secret` と リクエストボディ（JSON 文字列）から HMAC-SHA256 署名を生成し、`X-Clearflow-Signature: sha256=<hex>` 形式でヘッダーに付与する。

署名生成ロジックは `src/infrastructure/webhookDelivery.ts` 内のヘルパー関数 `computeSignature(secret: string, payload: string): string` として実装する。Bun の組み込み `crypto` モジュール（`crypto.createHmac`）を使用する。

**Rationale**: Stripe の `Stripe-Signature` や GitHub の `X-Hub-Signature-256` と同じ方式。受信側が `crypto.timingSafeEqual` で署名を検証できる業界標準の方法。

### D4: Webhook ペイロード構造を共通化

全イベントで共通のペイロード構造を使う:

```json
{
  "event": "request.approved",
  "timestamp": "2026-06-17T10:00:00.000Z",
  "organizationId": "uuid",
  "data": {
    "requestId": "uuid",
    "requestTitle": "備品購入申請",
    "actorId": "uuid",
    "actorName": "Manager User",
    "status": "approved",
    "metadata": {}
  }
}
```

`data` 部分はイベント種別により追加フィールドを持ちうる（step イベントでは `stepId`, `stepOrder`, `approverRole` 等）。型は `WebhookPayload` として `src/domain/models/webhookEvent.ts` に定義する。

**Rationale**: 共通構造にすることで受信側のパース処理がシンプルになる。イベント種別固有のデータは `data` 内に含め、トップレベルの構造は変わらない。

### D5: トランザクション外での fire-and-forget 配信

`src/infrastructure/webhookDelivery.ts` に配信サービスを実装する。

**配信フロー**:
1. `webhookEndpointRepository.findActiveByOrganizationAndEvent(organizationId, eventType)` で対象エンドポイントを取得する
2. 各エンドポイントについて `webhookDeliveryRepository.create()` で `status: "pending"` の配信レコードを作成する
3. HTTP POST（`fetch` API, タイムアウト 5 秒: `AbortSignal.timeout(5000)`）を実行する
4. 成功時（2xx）: 配信レコードの `status` を `"delivered"`, `statusCode` を記録, `attempts` をインクリメント
5. 失敗時（非 2xx / ネットワークエラー / タイムアウト）: 配信レコードの `status` を `"failed"`, `statusCode`（取得できた場合）を記録, `attempts` をインクリメント

**usecase への統合パターン**:

各 usecase のトランザクション完了後に、`void` で（await せずに）配信関数を呼び出す。これにより配信の成功/失敗がユーザーレスポンスに影響しない。

```typescript
// usecase 内の return 前（トランザクション外）
// deliver() は内部で try-catch して例外を握りつぶす
void deliverWebhookEvent({
  organizationId: data.organizationId,
  event: "request.approved",
  data: { requestId, requestTitle, actorId, actorName, ... }
});
```

`deliverWebhookEvent` 関数は内部で try-catch し、例外を外に投げない。console.error でログを記録する。

**Rationale**: トランザクション内で外部 HTTP 通信を行うと、ネットワーク障害やタイムアウトでトランザクション全体がロールバックし、承認操作自体が失敗するリスクがある。fire-and-forget にすることで、Webhook 基盤の障害が本業務に影響しない。

**Alternatives considered**:
- トランザクション内での配信 -- 外部障害でトランザクションがロールバックするリスク。却下
- イベントバス（EventEmitter / pub-sub）-- デモの規模では過剰な抽象化。usecase から直接呼び出す方式でシンプルに保つ。却下

### D6: usecase への統合 -- 各 usecase のイベントマッピング

各 usecase のトランザクション完了後に呼び出すイベントのマッピング:

| usecase | イベント | 条件 |
|---|---|---|
| `createRequest` | `request.created` | 常に |
| `submitRequest` | `request.submitted` | 常に |
| `approveRequest` | `step.approved` | ステップ承認時 |
| `approveRequest` | `request.approved` | 全ステップ完了で approved 遷移時 |
| `approveRequest` (no steps) | `request.approved` | ステップなし申請の直接承認時 |
| `rejectRequest` (rejected) | `request.rejected` | 最終却下時 |
| `rejectRequest` (revision) | `request.revised` + `step.rejected` | 差し戻し時 |
| `resubmitRequest` | `request.resubmitted` | 常に |

`approveRequest` は複数のイベントを発火しうる。ステップ承認で全ステップが完了した場合、`step.approved` と `request.approved` の両方を配信する。

各 usecase で、`deliverWebhookEvent` 呼び出し時にペイロードに必要な情報（`requestTitle`, `actorName` 等）を収集する必要がある。`actorName` は `userRepository.findById()` で取得するか、usecase の引数に含めるかの 2 択だが、既存の usecase は `actorId` のみ受け取り `actorName` を持たない。usecase 内で `userRepository.findById` を呼び出して取得する方式を採用する。ただしこの呼び出しもトランザクション外で行う。

**Rationale**: Webhook ペイロードの組み立てに必要な追加情報の取得は、配信ロジック（`deliverWebhookEvent`）の内部で行うのが責務として適切。usecase の引数を Webhook のために拡張するとレイヤー間の結合が強くなる。

### D7: ドメインモデルの追加

`src/domain/models/` に以下の型を追加する:

**`webhookEvent.ts`**:
- `WebhookEventType` -- 8 種別の文字列リテラルユニオン型
- `WEBHOOK_EVENT_TYPES` -- 8 種別の定数配列（`as const`）
- `WebhookPayload` 型 -- `{ event: WebhookEventType, timestamp: string, organizationId: string, data: WebhookEventData }`
- `WebhookEventData` 型 -- `{ requestId: string, requestTitle: string, actorId: string, actorName: string, status?: string, metadata?: Record<string, unknown> }`

**`webhookEndpoint.ts`**:
- `WebhookEndpoint` 型 -- id, organizationId, url, secret, isActive, events (WebhookEventType[]), createdAt, updatedAt

**`webhookDelivery.ts`**:
- `WebhookDeliveryStatus = "pending" | "delivered" | "failed"`
- `WebhookDelivery` 型 -- id, endpointId, event, payload (WebhookPayload), status (WebhookDeliveryStatus), statusCode (number | null), attempts, lastAttemptAt (Date | null), createdAt

`src/domain/models/index.ts` から re-export する。

domain 層は永続化を知らない型定義のみとし、ORM や infrastructure への依存を持たない（既存規約に準拠）。

### D8: リポジトリの追加

**`src/infrastructure/repositories/webhookEndpointRepository.ts`**:
- `create(data, tx?)` -- エンドポイント作成。`secret` は呼び出し元で生成済みの値を受け取る
- `findByOrganization(organizationId)` -- 組織のエンドポイント一覧取得
- `findActiveByOrganizationAndEvent(organizationId, event)` -- 有効かつ対象イベントを購読しているエンドポイントを取得。`isActive === true` AND `event` が `events` 配列に含まれる
- `updateIsActive(id, organizationId, isActive)` -- 有効/無効切り替え
- `deleteById(id, organizationId)` -- エンドポイント削除

**`src/infrastructure/repositories/webhookDeliveryRepository.ts`**:
- `create(data)` -- 配信レコード作成（`status: "pending"`）
- `updateStatus(id, data: { status, statusCode?, attempts, lastAttemptAt })` -- 配信結果更新
- `findByEndpointId(endpointId, organizationId, options?: { limit?, offset? })` -- エンドポイントの配信ログ取得（管理 UI 用）。テナント分離のため organizationId を引数に含め、JOIN または事前チェックで検証する

全リポジトリ関数にテナント分離（organizationId 条件）を適用する。`src/infrastructure/repositories/index.ts` から re-export する。

### D9: Webhook 管理 UI

**ルート構成**:
- `/settings/webhooks` -- Webhook エンドポイント一覧・追加（新規ページ）
- `/settings/webhooks/[id]/deliveries` -- 配信ログ一覧（新規ページ）

**レイアウト**:
- `src/app/(dashboard)/settings/` 配下に配置する。既存の `(dashboard)/layout.tsx` の認証ガードを継承する
- admin ロール専用アクセスは Server Action 内で `session.user.role === "admin"` をチェックする。admin 以外はエラーを返す

**Server Actions**:
- `src/app/actions/webhooks.ts` を新設する（`"use server"` ディレクティブ付き）
- `createWebhookEndpointAction` -- バリデーション (URL, イベント種別) + secret 自動生成 (`crypto.randomBytes(32).toString("hex")`) + `webhookEndpointRepository.create`
- `deleteWebhookEndpointAction` -- `webhookEndpointRepository.deleteById`
- `toggleWebhookEndpointAction` -- `webhookEndpointRepository.updateIsActive`
- `listWebhookEndpointsAction` -- `webhookEndpointRepository.findByOrganization`
- `listWebhookDeliveriesAction` -- `webhookDeliveryRepository.findByEndpointId`

**Usecases**: Webhook 管理は CRUD 操作であり、複雑なオーケストレーションを要しないため、Server Action から直接リポジトリを呼び出す。`listRequests` / `getRequest` と同じパターンで、読み取り専用操作は usecase 層をスキップする。書き込み操作（create, delete, toggle）もビジネスルールが薄い（バリデーション + 単一テーブル操作）ため、Server Action 内で完結する。

**Rationale**: admin ロールの判定は Server Action レイヤーで行い、ページ側でも条件付き表示する（UX 用）。Server Action でのロールチェックがセキュリティ上の正式なガード。

### D10: シードデータの拡張

`src/infrastructure/seed.ts` に以下を追加する:
- `webhookDeliveries` テーブルの truncate（FK 制約順: deliveries -> endpoints の順で削除）
- `webhookEndpoints` テーブルの truncate
- デフォルト組織に 1 件の Webhook エンドポイントを作成: `url: "https://example.com/webhook"`, `secret: "whsec_test_secret_for_development"`, `isActive: true`, `events: WEBHOOK_EVENT_TYPES`（全イベント購読）
- schema.ts からの import に `webhookEndpoints`, `webhookDeliveries` を追加

### D11: テスト方針

既存テストのパターン（ソースコード静的解析）に準拠する。

**新規テストファイル**: `src/__tests__/usecases/webhookWorkflow.test.ts`

検証項目:
- `webhookEvent.ts` に 8 種類のイベント種別が定義されている
- `webhookDelivery.ts` の配信関数が存在し、`fetch` を使用している
- HMAC-SHA256 署名ロジックが `webhookDelivery.ts` に存在する
- 各 usecase（createRequest, submitRequest, approveRequest, rejectRequest, resubmitRequest）で `deliverWebhookEvent` が呼び出されている
- `deliverWebhookEvent` の呼び出しが `db.transaction()` ブロックの外にある
- `deliverWebhookEvent` の呼び出しが `void` キーワード付き（fire-and-forget）

**既存テストの更新**: `src/__tests__/static/projectStructure.test.ts`
- TC-031（domain model integrity）のファイルリストに `domain/models/webhookEvent.ts`, `domain/models/webhookEndpoint.ts`, `domain/models/webhookDelivery.ts` を追加
- TC-034（no infrastructure import in domain）のファイルリストに同ファイルを追加
- TC-057（key source files）のファイルリストに新規ファイルを追加

**HMAC-SHA256 署名のユニットテスト**: `src/__tests__/infrastructure/webhookSignature.test.ts`
- 既知の入力（secret, payload）に対して期待される署名が生成されることを検証
- Bun の `crypto` モジュールを使用した実際の計算テスト

## Risks / Trade-offs

[Risk] `text[]` 型（PostgreSQL array）を Drizzle ORM で扱う場合のマッピング -> Drizzle は `text("col").array()` メソッドで PostgreSQL array 型をサポートしている。`events` カラムの値は `string[]` として TypeScript 側で扱える。

[Risk] Webhook 配信の fire-and-forget パターンで、サーバープロセスが途中で終了した場合に配信が失われる -> `webhook_deliveries` テーブルに `status: "pending"` のレコードが残る。リトライ機能（スコープ外）の導入時にこれを利用できる。初期実装では配信漏れを許容する。

[Risk] `deliverWebhookEvent` 内の `userRepository.findById` でユーザー名を取得するが、usecase から `actorName` を渡す方式の方がクエリ回数が少ない -> Webhook 配信は非同期のため、レスポンスタイムへの影響はない。usecase の引数を Webhook のために拡張するとレイヤー間の結合が増すため、配信サービス内で取得する方式を優先する。

[Risk] secret のプレーンテキスト保存 -> Webhook の secret は API キーとは異なり、署名検証のためにプレーンテキストで必要。暗号化保存はスコープ外。管理 UI では secret の一部をマスク表示する。

[Risk] 管理 UI のページ追加による既存ナビゲーションへの影響 -> ダッシュボードレイアウトのヘッダーに「設定」リンクを追加する必要がある。admin ロールのユーザーにのみ表示する。

## Open Questions

なし
