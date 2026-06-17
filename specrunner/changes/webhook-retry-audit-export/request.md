# Webhookリトライと監査ログCSVエクスポート

## Meta

- **type**: new-feature
- **slug**: webhook-retry-audit-export
- **base-branch**: main
- **adr**: false

## 背景

PR#8 で Webhook 配信基盤を導入したが、配信失敗時のリトライ機能がない。外部サービスの一時的なダウンで配信が永久に失敗する。exponential backoff によるリトライを導入する。

また、監査ログの CSV エクスポート機能は管理者が監査証跡を外部システムに取り込む際の基本機能として必要。

本 request で Webhook リトライと監査ログ CSV エクスポートを一括で導入する。

## 現状コードの前提

- `src/infrastructure/webhookDelivery.ts:14-61` — `deliverToEndpoint` は1回のみ配信を試行。失敗時は `status: "failed"`, `attempts: 1` で記録して終了。リトライロジックなし
- `src/infrastructure/webhookDelivery.ts:36` — タイムアウトは `AbortSignal.timeout(5000)` で固定5秒
- `src/infrastructure/schema.ts` — `webhook_deliveries` テーブルに `attempts` (integer), `lastAttemptAt` (timestamp), `status` (pending/delivered/failed) カラムが既にある
- `src/infrastructure/repositories/webhookDeliveryRepository.ts` — `updateStatus` 関数で status, statusCode, attempts, lastAttemptAt を更新可能
- `src/infrastructure/schema.ts:68-80` — `audit_logs` テーブルに action, targetType, targetId, actorId, organizationId, metadata, createdAt カラムがある
- `src/infrastructure/repositories/auditLogRepository.ts` — `create` 関数のみ。一覧取得関数なし

## 要件

1. **Webhook リトライロジック**: `deliverToEndpoint` に exponential backoff リトライを追加する。最大3回リトライ（初回含め計4回試行）。バックオフ間隔: リトライ番号 n = 1,2,3 に対して `1 * 4^(n-1)` 秒待機（1秒, 4秒, 16秒）。各試行で `attempts` をインクリメントし `lastAttemptAt` を更新する。全試行失敗後に `status: "failed"` を確定する
2. **webhook_deliveries に nextRetryAt カラム追加**: `nextRetryAt` (timestamp, nullable) カラムを追加する。失敗時に次のリトライ予定時刻を記録する。全リトライ完了後は null にする
3. **手動リトライ機能**: Webhook 管理UIの配信ログ画面に「リトライ」ボタンを追加する。`failed` 状態の配信を手動で1回のみ再試行できる（exponential backoff は適用しない）。`attempts` は既存の値に1を加算する。成功時は `status: "delivered"`、失敗時は `status: "failed"` に更新し、`nextRetryAt` は null にする。admin ロールのみ実行可能
4. **監査ログ一覧取得**: `auditLogRepository` に `findByOrganization(organizationId: string, options?: { limit, offset, startDate, endDate })` を追加する。organizationId でフィルタし、createdAt 降順で取得する
5. **監査ログ CSV エクスポート**: `/api/audit-logs/export` Route Handler を追加する。認証チェック + admin ロールチェック後、組織の監査ログを全件取得し CSV 文字列を生成して `text/csv` Content-Type で返す。CSV カラム: timestamp, action, targetType, targetId, actorId, metadata（JSON.stringify で1カラム）
6. **監査ログ一覧 UI**: 管理画面に監査ログ一覧ページを追加する。フィルタ: 日付範囲、アクション種別。CSV ダウンロードボタンを配置する。admin ロールのみアクセス可能
7. **テナント分離**: 監査ログの一覧取得と CSV エクスポートに organizationId 条件を付与する

## スコープ外

- バックグラウンドジョブによる自動リトライ（cron / queue）
- 監査ログの PDF エクスポート
- 監査ログの検索（全文検索）
- Webhook 配信のリトライ上限のカスタマイズ

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] 配信失敗時に exponential backoff で最大3回リトライされることをテストで確認する
- [ ] バックオフ間隔が `1s, 4s, 16s` であることをテストで確認する
- [ ] 全リトライ失敗後に `status: "failed"`, `attempts: 4` になることをテストで確認する
- [ ] `webhook_deliveries` テーブルに `nextRetryAt` カラムが存在する
- [ ] `WebhookDelivery` ドメインモデルに `nextRetryAt` フィールドが含まれる
- [ ] 手動リトライが1回のみの単発試行であることをテストで確認する
- [ ] 手動リトライ後の `nextRetryAt` が null であることをテストで確認する
- [ ] 手動リトライが admin ロールのみ実行可能
- [ ] `/api/audit-logs/export` が CSV を返す
- [ ] CSV エクスポートに organizationId フィルタが適用されている
- [ ] 監査ログ一覧のクエリに organizationId 条件が付与されている
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **インプロセスリトライを採用、キューベース方式を却下** — リトライは `deliverToEndpoint` 内のループで実行する。キューベース（Bull / pg-boss）はインフラ依存が増える。デモ用途ではインプロセスで十分
2. **exponential backoff の基数4を採用** — `1s, 4s, 16s` の間隔。基数2（1s, 2s, 4s）では間隔が短すぎて一時的なダウンからの回復を待てない。基数4で合計21秒の待機時間を確保する
3. **CSV エクスポートを Route Handler で実装を採用、Server Action を却下** — CSV はファイルダウンロードであり、Server Action の戻り値（serializable object）では扱えない。Route Handler で `text/csv` レスポンスを返す
4. **監査ログの CSV 形式は固定カラムを採用** — metadata カラムは JSON.stringify で1カラムに出力する。動的カラム展開は CSV のパース複雑性が増すため却下
