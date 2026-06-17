# Design: Webhook リトライと監査ログ CSV エクスポート

## Context

PR#8 で導入した Webhook 配信基盤は、配信失敗時のリトライ機能を持たない。`deliverToEndpoint` は 1 回のみ配信を試行し、失敗すると `status: "failed"`, `attempts: 1` で記録して終了する。外部サービスの一時的なダウンで配信が永久に失われる。

また、`auditLogRepository` には `create` 関数のみがあり、一覧取得関数がない。管理者が監査証跡を外部システムに取り込む手段がない。

確認済みの現状コード:

- `src/infrastructure/webhookDelivery.ts:14-61` -- `deliverToEndpoint` は 1 回のみ配信を試行。成功時 `status: "delivered"`, `attempts: 1`、失敗時 `status: "failed"`, `attempts: 1` で記録して終了。リトライロジックなし
- `src/infrastructure/webhookDelivery.ts:36` -- タイムアウトは `AbortSignal.timeout(5000)` で固定 5 秒
- `src/infrastructure/schema.ts:134-146` -- `webhookDeliveries` テーブルに `attempts` (integer, default 0), `lastAttemptAt` (timestamp, nullable), `status` (pending/delivered/failed) カラムが既にある。`nextRetryAt` カラムはない
- `src/infrastructure/repositories/webhookDeliveryRepository.ts` -- `create`, `updateStatus`, `findByEndpointId` の 3 関数。`updateStatus` は status, statusCode, attempts, lastAttemptAt を更新可能
- `src/infrastructure/schema.ts:74-87` -- `audit_logs` テーブルに action, targetType, targetId, actorId, organizationId, metadata, createdAt カラムがある
- `src/infrastructure/repositories/auditLogRepository.ts` -- `create(data, tx?)` のみ。一覧取得関数なし
- `src/domain/models/auditLog.ts` -- `AuditLog` 型: id, action, targetType, targetId, actorId, organizationId, metadata (Record<string, unknown> | null), createdAt
- `src/domain/models/webhookDelivery.ts` -- `WebhookDelivery` 型に `nextRetryAt` フィールドなし
- `src/app/actions/webhooks.ts` -- `"use server"` 付き Server Actions。全 action で admin ロールチェック済み。`listWebhookDeliveriesAction` は `findByEndpointId` で配信ログ取得
- `src/app/(dashboard)/settings/webhooks/[id]/deliveries/page.tsx` -- 配信ログ一覧ページ。テーブル形式で表示。リトライボタンなし
- `src/app/(dashboard)/layout.tsx` -- ダッシュボードレイアウト。admin ロールのみ「設定」リンクを表示

## Goals / Non-Goals

**Goals**:

- `deliverToEndpoint` に exponential backoff リトライを追加する（最大 3 回リトライ、初回含め計 4 回試行、バックオフ間隔 1s/4s/16s）
- `webhook_deliveries` テーブルに `nextRetryAt` (timestamp, nullable) カラムを追加する
- 配信ログ画面に手動リトライボタンを追加する（admin ロール限定、`failed` 状態のみ）
- `auditLogRepository` に `findByOrganization` 関数を追加する（日付範囲フィルタ、ページネーション対応）
- `/api/audit-logs/export` Route Handler で監査ログ CSV エクスポートを実装する（`text/csv` ストリーミング）
- 管理画面に監査ログ一覧ページを追加する（日付範囲・アクション種別フィルタ、CSV ダウンロードボタン）
- 全クエリにテナント分離（organizationId 条件）を適用する

**Non-Goals**:

- バックグラウンドジョブによる自動リトライ（cron / queue）
- 監査ログの PDF エクスポート
- 監査ログの検索（全文検索）
- Webhook 配信のリトライ上限のカスタマイズ

## Decisions

### D1: `deliverToEndpoint` にインプロセス exponential backoff リトライを追加

`deliverToEndpoint` 内に for ループでリトライを実装する。定数 `MAX_ATTEMPTS = 4`（初回 + リトライ 3 回）、`BASE_DELAY_MS = 1000`。バックオフ間隔は `BASE_DELAY_MS * 4^retryIndex`。

```
attempt 1 (初回): 即座に配信
attempt 2 (retry 1): 1000ms 待機後に配信
attempt 3 (retry 2): 4000ms 待機後に配信
attempt 4 (retry 3): 16000ms 待機後に配信
```

各試行で:
1. `attempts` をインクリメントし `lastAttemptAt` を更新する
2. 成功（`response.ok`）: `status: "delivered"`, `nextRetryAt: null` に更新してループを抜ける
3. 失敗かつリトライ残りあり: `status: "pending"` を維持し、`nextRetryAt` を次のリトライ予定時刻に設定する
4. 全試行失敗: `status: "failed"`, `nextRetryAt: null` に確定する

待機には `Bun.sleep(ms)` を使用する。

**Rationale**: architect 評価済み（判断 1, 2）。キューベース方式はインフラ依存が増え、デモ用途では過剰。基数 4 の backoff で合計 21 秒の待機時間を確保し、一時的なダウンからの回復を待つ。

**Alternatives considered**:
- キューベース方式（Bull / pg-boss）-- インフラ依存増。却下（architect 判断）
- 基数 2（1s, 2s, 4s）-- 間隔が短すぎて回復を待てない。却下（architect 判断）

### D2: `webhook_deliveries` テーブルに `nextRetryAt` カラムを追加

`src/infrastructure/schema.ts` の `webhookDeliveries` テーブルに `nextRetryAt: timestamp("next_retry_at")` を追加する（nullable）。

`src/domain/models/webhookDelivery.ts` の `WebhookDelivery` 型に `nextRetryAt: Date | null` を追加する。

`webhookDeliveryRepository` の変更:
- `mapRow` に `nextRetryAt` マッピングを追加する
- `updateStatus` の引数に `nextRetryAt?: Date | null` を追加する

Drizzle マイグレーション: `drizzle/0002_webhook_retry_audit_export.sql` を生成する。

**Rationale**: 配信ログ画面で次のリトライ予定時刻を表示できる。将来のキューベース移行時にリトライ対象をクエリするカラムとしても利用可能。

### D3: 手動リトライ機能

`src/app/actions/webhooks.ts` に `retryWebhookDeliveryAction(deliveryId: string)` を追加する。

処理フロー:
1. admin ロールチェック（既存パターン踏襲）
2. `webhookDeliveryRepository.findById(deliveryId)` で配信レコードを取得する（新規関数）
3. テナント分離: 配信レコードの `endpointId` に紐づく `webhookEndpoints` の `organizationId` がセッションの `organizationId` と一致するか検証する
4. `status !== "failed"` の場合はエラーを返す（`"failed 状態の配信のみリトライできます"`）
5. 配信レコードの `status` を `"pending"` に更新する（`attempts` はリセットしない。既存の値を維持する）
6. `webhookEndpointRepository` からエンドポイント情報（url, secret）を取得する
7. `deliverSingleAttempt(endpoint, delivery.payload, deliveryId)` を `void` で呼び出す（fire-and-forget。exponential backoff は適用しない。1回のみ試行し、成功時は `status: "delivered"`, `nextRetryAt: null`、失敗時は `status: "failed"`, `nextRetryAt: null` に更新する。`attempts` は既存の値に 1 を加算する）
8. `revalidatePath` で配信ログページを更新する

`webhookDeliveryRepository` に追加する関数:
- `findById(id: string)`: `WebhookDelivery | null` を返す
- `resetForRetry(id: string)`: `status: "pending"`, `nextRetryAt: null` に更新する（`attempts`, `lastAttemptAt` はリセットしない）

配信ログ一覧ページ（`deliveries/page.tsx`）に、`status === "failed"` の行のみ「リトライ」ボタンを表示する。form + Server Action パターンで実装する。

**Rationale**: 手動リトライは `failed` 状態のみ許可する。request.md 要件3の通り、手動リトライは1回のみの単発試行であり exponential backoff は適用しない。`attempts` はリセットせず既存の値に 1 を加算する（管理者の「もう1回だけ試す」という明示的な操作であり、自動リトライサイクルの再消費ではない）。成功・失敗いずれの場合も `nextRetryAt` は null にする。

### D4: `auditLogRepository.findByOrganization` の追加

`src/infrastructure/repositories/auditLogRepository.ts` に以下の関数を追加する:

```typescript
findByOrganization(
  organizationId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    action?: string;
  }
): Promise<AuditLog[]>
```

- `organizationId` で必ずフィルタする（テナント分離）
- `createdAt` 降順でソートする
- `startDate` 指定時: `createdAt >= startDate`（Drizzle `gte`）
- `endDate` 指定時: `createdAt <= endDate`（Drizzle `lte`）
- `action` 指定時: `action = action`（Drizzle `eq`）
- `limit` / `offset` でページネーション

一覧取得と CSV エクスポートの両方でこの関数を共通利用する。

**Rationale**: フィルタオプションを引数で受け取ることで、UI のフィルタ機能と CSV エクスポートのフィルタ機能を同じリポジトリ関数で実現する。

### D5: CSV エクスポートを Route Handler で実装

`src/app/api/audit-logs/export/route.ts` に GET ハンドラを実装する。

処理フロー:
1. `auth()` で認証チェック。未認証 → 401
2. `session.user.role !== "admin"` → 403
3. URL クエリパラメータ `startDate`, `endDate`, `action` を取得する（オプション）
4. `auditLogRepository.findByOrganization(session.user.organizationId, { startDate, endDate, action })` で全件取得
5. CSV ヘッダー行: `timestamp,action,targetType,targetId,actorId,metadata`
6. 各行: `createdAt` を ISO 文字列化、`metadata` は `JSON.stringify()`、値にカンマ・ダブルクォート・改行が含まれる場合はダブルクォートで囲みエスケープする
7. レスポンスヘッダー: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="audit-logs-YYYY-MM-DD.csv"`

**Rationale**: architect 評価済み（判断 3, 4）。CSV はファイルダウンロードのため Route Handler が適切。metadata は JSON.stringify で 1 カラムに出力し、動的カラム展開を避ける。

**Alternatives considered**:
- Server Action で CSV を返す -- Server Action の戻り値は serializable object。ファイルダウンロードに不適。却下（architect 判断）
- metadata を動的カラム展開 -- CSV パースの複雑性が増す。却下（architect 判断）

### D6: 監査ログ一覧 UI

新規ページ: `src/app/(dashboard)/settings/audit-logs/page.tsx`

構成:
- ページ冒頭で `auth()` + admin ロールチェック。admin 以外は `redirect("/requests")`
- `searchParams` から `startDate`, `endDate`, `action`, `page` を取得する
- `auditLogRepository.findByOrganization` でデータ取得（`limit: 50`, `offset: (page - 1) * 50`）
- テーブル表示: 日時, アクション, 対象種別, 対象 ID, 実行者 ID, メタデータ
- フィルタ UI: 日付範囲（startDate, endDate の input type="date"）、アクション種別（select）。フォーム送信で URL クエリパラメータを更新する
- CSV ダウンロードボタン: `<a>` タグで `/api/audit-logs/export?startDate=...&endDate=...&action=...` にリンクする。現在のフィルタ条件を引き継ぐ
- ページネーション: 前へ/次へリンク

**Rationale**: フィルタは URL クエリパラメータで管理し、ブックマーク可能にする。CSV ダウンロードリンクに同じパラメータを渡すことで、フィルタ条件を一致させる。

### D7: ダッシュボードレイアウトのナビゲーション拡張

`src/app/(dashboard)/layout.tsx` の admin 向けリンクに「監査ログ」リンク（`/settings/audit-logs`）を追加する。既存の `session.user.role === "admin"` 条件付きレンダリングブロック内に追加する。

### D8: テスト方針

既存テストのパターン（ソースコード静的解析）に準拠する。

**新規テストファイル**: `src/__tests__/usecases/webhookRetryAuditExport.test.ts`

Webhook リトライ関連の検証:
- `webhookDelivery.ts` にリトライループが存在する
- `MAX_ATTEMPTS` 定数（値 4）と `BASE_DELAY_MS` 定数（値 1000）が存在する
- 待機処理（`Bun.sleep` 等）が存在する
- リトライ中に `attempts` をインクリメントする処理が存在する
- `schema.ts` に `next_retry_at` カラムが存在する
- `webhookDelivery.ts` の `WebhookDelivery` 型に `nextRetryAt` が存在する
- `webhooks.ts` に `retryWebhookDeliveryAction` が存在する
- `webhooks.ts` の `retryWebhookDeliveryAction` に `"failed"` チェックが存在する

監査ログ CSV エクスポート関連の検証:
- `auditLogRepository.ts` に `findByOrganization` が存在する
- `findByOrganization` に `organizationId` パラメータが存在する
- `api/audit-logs/export/route.ts` が存在し、`text/csv`, `auth()`, `admin` ロールチェック、`organizationId` 条件が含まれる
- `settings/audit-logs/page.tsx` が存在する

**既存テストの更新**: `src/__tests__/static/projectStructure.test.ts`
- TC-057 のファイルリストに `app/api/audit-logs/export/route.ts` を追加する

## Risks / Trade-offs

[Risk] インプロセスリトライでリクエストハンドラが最大 21 秒間 sleep する → `deliverWebhookEvent` は `void` で fire-and-forget のため、ユーザーレスポンスに影響なし。プロセス再起動でリトライが失われる可能性があるが、デモ用途では許容する。

[Risk] 手動リトライで attempts をリセットすると、配信統計のトータル試行回数が正確でなくなる → 手動リトライは明示的な管理操作であり、「新しいリトライサイクル」として扱う。正確な統計が必要な場合は将来的に `totalAttempts` カラムを追加する。

[Risk] CSV エクスポートで全件をメモリに載せる → デモ用途の想定データ量では問題なし。将来的にストリーミング or カーソルベースの取得に変更可能。

[Risk] `Bun.sleep` の使用 → Bun ランタイム固有 API。Clearflow は Bun ランタイム前提のため問題なし。

## Open Questions

なし
