# Webhook通知とイベント配信基盤

## Meta

- **type**: new-feature
- **slug**: webhook-notification
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter（外部HTTP配信）追加、イベント駆動アーキテクチャ導入 → true -->

## 背景

現在、承認ワークフローの状態変更は audit_logs に記録されるのみで、外部システムへの通知手段がない。Slack 連携や社内ポータルとの接続を可能にするため、Webhook 通知基盤を導入する。

申請の状態変更（作成・提出・承認・差し戻し・再申請・最終却下）時に、組織ごとに登録された Webhook URL へ HTTP POST でイベントを配信する。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/schema.ts:68-80` — `audit_logs` テーブルが状態変更イベントを記録している。action, targetType, targetId, actorId, organizationId, metadata, createdAt を持つ
- `src/application/usecases/approveRequest.ts` — `db.transaction()` 内で `auditLogRepository.create` を呼び出し。Webhook 関連の処理なし
- `src/application/usecases/rejectRequest.ts` — 同上
- `src/application/usecases/submitRequest.ts` — 同上
- `src/application/usecases/resubmitRequest.ts` — 同上
- `src/application/usecases/createRequest.ts` — 同上
- `src/infrastructure/schema.ts:22-27` — `organizations` テーブルに Webhook 設定なし
- Webhook 関連のテーブル・モデル・サービスは一切存在しない

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

1. **webhook_endpoints テーブル追加**: カラム: id (uuid), organizationId (FK), url (text), secret (text — HMAC 署名用), isActive (boolean), events (text[] — 購読するイベント種別), createdAt, updatedAt。組織ごとに複数の Webhook エンドポイントを登録できる
2. **webhook_deliveries テーブル追加**: カラム: id (uuid), endpointId (FK), event (text), payload (jsonb), status (enum: pending | delivered | failed), statusCode (integer, nullable), attempts (integer, default 0), lastAttemptAt (timestamp, nullable), createdAt。配信ログとリトライ管理用
3. **イベント種別の定義**: `request.created`, `request.submitted`, `request.approved`, `request.rejected`, `request.revised`, `request.resubmitted`, `step.approved`, `step.rejected` の8種別を `src/domain/models/webhookEvent.ts` に定義する
4. **Webhook ペイロード構造**: 全イベントで共通のペイロード構造を使う — `{ event: string, timestamp: string, organizationId: string, data: { requestId: string, requestTitle: string, actorId: string, actorName: string, ... } }`。HMAC-SHA256 署名を `X-Clearflow-Signature` ヘッダーに付与する
5. **Webhook 配信サービス**: `src/infrastructure/webhookDelivery.ts` に配信ロジックを実装する。usecase のトランザクション完了後（トランザクション外）に非同期で配信する。配信失敗時は webhook_deliveries の status を `failed` に更新し、attempts をインクリメントする
6. **usecase への統合**: 各 usecase（createRequest, submitRequest, approveRequest, rejectRequest, resubmitRequest）のトランザクション完了後に Webhook 配信をトリガーする。Webhook 配信の失敗はユーザーへのレスポンスに影響しない（fire-and-forget）
7. **ドメインモデル**: `src/domain/models/` に `WebhookEndpoint` 型、`WebhookDelivery` 型、`WebhookEvent` 型を追加する
8. **リポジトリ**: `webhookEndpointRepository.ts` と `webhookDeliveryRepository.ts` を `src/infrastructure/repositories/` に追加する
9. **Webhook 管理 UI**: 組織設定ページを新設し、Webhook エンドポイントの追加・削除・有効/無効切り替え、配信ログの閲覧を実装する。admin ロールのみアクセス可能
10. **シードデータ**: デフォルト組織に1つの Webhook エンドポイント（`https://example.com/webhook`, 全イベント購読）を追加する
11. **テナント分離**: Webhook エンドポイントと配信ログのクエリに organizationId 条件を付与する

## スコープ外

- Webhook 配信のリトライ（exponential backoff）— 次の request で対応
- Webhook 配信のキューイング（バックグラウンドジョブ）
- Webhook エンドポイントの URL 検証（到達性チェック）
- Webhook ペイロードの暗号化
- 配信タイムアウト設定のカスタマイズ（固定5秒）

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `webhook_endpoints` テーブルと `webhook_deliveries` テーブルが schema.ts に定義されている
- [ ] 8つのイベント種別が `webhookEvent.ts` に定義されている
- [ ] HMAC-SHA256 署名の生成ロジックが存在し、テストで検証されている
- [ ] Webhook 配信がトランザクション外で実行されることをコードで確認できる（`db.transaction()` の外）
- [ ] Webhook 配信の失敗がユーザーレスポンスに影響しないことをテストで確認する
- [ ] Webhook エンドポイントのクエリに organizationId 条件が付与されている
- [ ] Webhook 管理ページが admin ロールのみアクセス可能
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **トランザクション外での非同期配信を採用、トランザクション内配信を却下** — Webhook 配信は外部 HTTP 通信を伴う。トランザクション内で実行するとタイムアウトや外部障害でトランザクション全体がロールバックし、承認操作自体が失敗する。配信はトランザクション完了後に fire-and-forget で実行する
2. **HMAC-SHA256 署名を採用** — 受信側が改竄検知を行うための標準的な方式。secret はエンドポイントごとに生成し、`X-Clearflow-Signature` ヘッダーに `sha256=<hex>` 形式で付与する。Stripe / GitHub の webhook 署名と同じ方式
3. **配信ログテーブル（webhook_deliveries）を採用、ログなし方式を却下** — 配信の成功/失敗を追跡し、将来のリトライ機能の基盤とする。管理 UI での配信状況確認にも使用する
4. **usecase 内からの直接配信を採用、イベントバス方式を却下** — イベントバス（EventEmitter / pub-sub）は疎結合だが、デモの規模では過剰。usecase のトランザクション完了後に直接 `webhookDelivery.deliver()` を呼ぶ方式でシンプルに保つ
5. **固定タイムアウト5秒を採用** — 外部サービスの応答が5秒以内でない場合は失敗として記録する。設定のカスタマイズは次の request で対応
