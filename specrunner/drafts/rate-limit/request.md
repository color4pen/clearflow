# レート制限

## Meta

- **type**: new-feature
- **slug**: rate-limit
- **base-branch**: main
- **adr**: true

## 背景

Server Actions と Route Handler にレート制限がなく、悪意のあるユーザーや自動化スクリプトが大量のリクエストを送信できる。承認操作、申請作成、Webhook 管理、cron エンドポイントにレート制限を導入する。

## 現状コードの前提

- `src/app/actions/requests.ts` — 全 Server Actions にレート制限なし
- `src/app/actions/webhooks.ts` — Webhook 管理 Actions にレート制限なし
- `src/app/api/cron/expire-requests/route.ts` — cron エンドポイントにレート制限なし
- `src/app/api/audit-logs/export/route.ts` — CSV エクスポートにレート制限なし
- `src/proxy.ts` — middleware（認証プロキシ）にレート制限なし
- レート制限関連のテーブル・モジュールは存在しない

## 要件

1. **レート制限テーブル追加**: `rate_limit_records` テーブルを新設する。カラム: id (uuid), key (text — ユーザーID + アクション種別の複合キー), count (integer), windowStart (timestamp), createdAt。sliding window counter 方式で使用する
2. **レート制限サービス**: `src/infrastructure/rateLimit.ts` に `checkRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean, remaining: number, resetAt: Date }>` を実装する。DB ベースのスライディングウィンドウカウンター
3. **Server Actions への適用**: 以下のレート制限を適用する:
   - 申請作成: 1分あたり10件（userId ベース）
   - 承認/却下/再申請: 1分あたり30件（userId ベース）
   - テンプレートCRUD: 1分あたり10件（userId ベース）
   - Webhook エンドポイント管理: 1分あたり10件（userId ベース）
4. **Route Handler への適用**:
   - CSV エクスポート: 1分あたり5件（userId ベース）
   - cron エンドポイント: 1分あたり2件（IP ベース）
5. **レート制限超過時のレスポンス**: `{ success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" }` を返す。Route Handler では `429 Too Many Requests` ステータス
6. **古いレコードのクリーンアップ**: `cleanupRateLimitRecords` 関数を追加。24時間以上前のレコードを削除する。cron エンドポイント `/api/cron/cleanup` で呼び出す（expire-requests と同じ認証方式）

## スコープ外

- IP ベースの全体レート制限（Server Actions は userId ベースのみ）
- レート制限設定のカスタマイズ UI
- Redis ベースのレート制限
- レスポンスヘッダー（X-RateLimit-Remaining 等）の付与

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `rate_limit_records` テーブルが schema.ts に定義されている
- [ ] 申請作成が1分あたり10件を超えた場合にレート制限エラーが返ることをテストで確認する
- [ ] レート制限のウィンドウが経過した後にリクエストが許可されることをテストで確認する
- [ ] CSV エクスポートがレート制限超過時に 429 を返す
- [ ] cron エンドポイントのレート制限が IP ベースで動作する
- [ ] レート制限のクエリに SQL インジェクションのリスクがない（パラメータ化クエリ使用）
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **DB ベースのスライディングウィンドウを採用、インメモリ方式を却下** — インメモリはプロセス再起動でリセットされる。DB ベースなら永続的でマルチインスタンス対応。デモ用途のトラフィック量では DB の負荷は問題にならない
2. **Redis を却下** — 追加インフラ依存。既存の PostgreSQL でレート制限テーブルを管理する
3. **userId ベースを基本、cron のみ IP ベースを採用** — Server Actions は認証済みなので userId で個人単位の制限が適切。cron は認証がAPI キーベースで userId がないため IP で制限
4. **固定レート値を採用、設定テーブル方式を却下** — レート値はコード内に定数として定義。設定テーブルは管理 UI が必要になり過剰
