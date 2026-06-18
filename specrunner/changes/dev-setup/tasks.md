# Tasks: 開発環境セットアップ整備

## T-01: docker-compose.yml を作成する

- [x] プロジェクトルートに `docker-compose.yml` を新規作成する
- [x] PostgreSQL 16 のサービスを定義する（`image: postgres:16`）
- [x] 環境変数を設定する: `POSTGRES_DB=clearflow`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`
- [x] ポートマッピングを設定する: `5432:5432`
- [x] named volume `clearflow-pgdata` を定義し、`/var/lib/postgresql/data` にマウントする
- [x] `healthcheck` を追加する（`pg_isready -U postgres`）

**Acceptance Criteria**:
- `docker-compose up -d` で PostgreSQL 16 コンテナが起動する
- `docker-compose down` → `docker-compose up -d` でデータが永続化される
- `pg_isready` による healthcheck が定義されている

## T-02: .gitignore に .env.example の除外解除を追加する

- [x] `.gitignore` の `.env*` パターン（L34）の直後に `!.env.example` 行を追加する

**Acceptance Criteria**:
- `.env.example` が `git status` で追跡対象として認識される
- 既存の `.env*` による他の env ファイル（`.env.local` 等）の除外は維持される

## T-03: .env.example を作成する

- [x] プロジェクトルートに `.env.example` を新規作成する
- [x] `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clearflow` を記載する
- [x] `AUTH_SECRET=` を記載し、コメントで `bunx auth secret` または `openssl rand -base64 32` でランダム値を生成する手順を記載する
- [x] `CRON_SECRET=` を記載し、用途をコメントで説明する
- [x] `SYSTEM_USER_ID=00000000-0000-0000-0000-000000000000` を記載し、seed.ts の system user と一致することをコメントで説明する

**Acceptance Criteria**:
- `.env.example` に `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `SYSTEM_USER_ID` が記載されている
- 各変数にコメントで説明がある
- 既存テスト TC-025（`projectStructure.test.ts` L41-45）が pass する

## T-04: package.json に scripts を追加する

- [x] `db:push` スクリプトを追加する: `"db:push": "bunx drizzle-kit push"`
- [x] `db:generate` スクリプトを追加する: `"db:generate": "bunx drizzle-kit generate"`
- [x] `db:seed` スクリプトを追加する: `"db:seed": "bun src/infrastructure/seed.ts"`
- [x] `db:reset` スクリプトを追加する: `"db:reset": "bun src/infrastructure/reset.ts"`
- [x] `typecheck` スクリプトを追加する: `"typecheck": "tsc --noEmit"`
- [x] `test` スクリプトを追加する: `"test": "bun test"`
- [x] 既存の `dev`, `build`, `start`, `lint` スクリプトは変更しない

**Acceptance Criteria**:
- `bun run db:push` で `bunx drizzle-kit push` が実行される
- `bun run db:generate` で `bunx drizzle-kit generate` が実行される
- `bun run db:seed` で `bun src/infrastructure/seed.ts` が実行される
- `bun run db:reset` で `bun src/infrastructure/reset.ts` が実行される
- `bun run typecheck` で `tsc --noEmit` が実行される
- `bun run test` で `bun test` が実行される
- 既存スクリプトが破壊されていない

## T-05: src/infrastructure/reset.ts を新規作成する

- [x] `src/infrastructure/reset.ts` を新規作成する
- [x] `process.env.DATABASE_URL` から接続情報を取得する（未設定時はエラーで終了）
- [x] `postgres` ドライバで DB に接続する
- [x] SQL `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` を実行して全テーブル・enum・sequence を削除する
- [x] DB 接続を閉じる
- [x] 子プロセスで `bunx drizzle-kit push` を実行する（`spawnSync` を使用）
- [x] push 完了後、子プロセスで `bun src/infrastructure/seed.ts` を実行する
- [x] 各ステップの進捗をコンソールにログ出力する
- [x] エラー発生時は `process.exit(1)` で異常終了する

**Acceptance Criteria**:
- `bun src/infrastructure/reset.ts` を実行すると public スキーマが削除・再作成される
- 続けて drizzle-kit push でスキーマが反映される
- 続けて seed.ts でシードデータが投入される
- エラー時にプロセスが非ゼロで終了する
- 正常終了時に DB 接続がクローズされる

## T-06: 最終検証

- [x] `bun run build` が成功することを確認する
- [x] `bun run typecheck` が green であることを確認する
- [x] 既存テスト TC-025 が pass することを確認する（`.env.example` に `DATABASE_URL` と `AUTH_SECRET` が含まれる）

**Acceptance Criteria**:
- `bun run build` が exit 0 で完了する
- `bun run typecheck` が型エラーなしで完了する
- `bun test src/__tests__/static/projectStructure.test.ts` の TC-025 が pass する
