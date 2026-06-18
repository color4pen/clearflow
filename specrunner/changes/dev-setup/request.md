# 開発環境セットアップ整備

## Meta

- **type**: spec-change
- **slug**: dev-setup
- **base-branch**: main
- **adr**: false

## 背景

アプリケーションの機能は実装されているが、新しい開発者がクローンして起動するまでの手順が未整備。docker-compose でPostgreSQLを起動し、.env.example、package.json scripts、seed実行まで一連のコマンドで動作する状態にする。

## 現状コードの前提

- `package.json:5-10` — scripts は `dev`, `build`, `start`, `lint` のみ。db:push, db:seed, db:generate 等なし
- `.env.example` — 存在しない
- `docker-compose.yml` — 存在しない
- `src/infrastructure/seed.ts:19` — `process.env.DATABASE_URL` を直接参照
- `src/infrastructure/db.ts:9` — `process.env.DATABASE_URL` を直接参照
- `drizzle.config.ts:8` — `process.env.DATABASE_URL!` を参照
- `drizzle/` — 5つのmigration SQLファイルが存在

## 要件

1. **docker-compose.yml 追加**: PostgreSQL 16 のサービスを定義する。ポート 5432、DB名 `clearflow`、ユーザー `postgres`、パスワード `postgres`。ボリュームでデータを永続化する
2. **.env.example 追加**: 全ての必要な環境変数をコメント付きで記載する。`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clearflow`、`AUTH_SECRET=`（ランダム値を生成するコマンドをコメントで記載）、`CRON_SECRET=`、`SYSTEM_USER_ID=`
3. **package.json scripts 追加**: `db:push`（`bunx drizzle-kit push`）、`db:generate`（`bunx drizzle-kit generate`）、`db:seed`（`bun src/infrastructure/seed.ts`）、`db:reset`（drop + push + seed）、`typecheck`（`tsc --noEmit`）、`test`（`bun test`）
4. **seed.ts の改善**: SYSTEM_USER_ID 用の system user を固定 UUID で作成する。シード完了後にログイン情報（email/password）をコンソールに表示する
5. **.gitignore 更新**: `.env.local` が含まれていることを確認する（既に含まれているはず）

## スコープ外

- CI/CD パイプライン
- Dockerfile（アプリ本体のコンテナ化）
- README.md の作成
- テストの追加

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `docker-compose up -d` で PostgreSQL が起動する
- [ ] `.env.example` が存在し、必要な全環境変数が記載されている
- [ ] `bun run db:push` でスキーマがDBに反映される
- [ ] `bun run db:seed` でシードデータが投入される
- [ ] `bun run test` でテストが実行される
- [ ] `bun run typecheck` で型チェックが実行される
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **drizzle-kit push を採用、migrate を却下** — 開発環境では push（スキーマ同期）で十分。migrate はプロダクション向け
2. **docker-compose で PostgreSQL のみを採用** — アプリ本体はホストで `bun dev` で起動する。アプリのコンテナ化はスコープ外
3. **固定 UUID で system user を採用** — SYSTEM_USER_ID 環境変数と seed の system user ID を一致させるため。シード実行ごとに同じ UUID を使用する
