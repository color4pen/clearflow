# Spec: 開発環境セットアップ整備

## Requirements

### Requirement: docker-compose.yml で PostgreSQL 16 が起動できる

docker-compose.yml SHALL定義する PostgreSQL 16 サービスを提供し、`docker-compose up -d` コマンドで開発用データベースが起動できること。

#### Scenario: PostgreSQL コンテナが起動する

**Given** docker-compose.yml がプロジェクトルートに存在する
**When** `docker-compose up -d` を実行する
**Then** PostgreSQL 16 コンテナが起動し、localhost:5432 で接続可能になる

#### Scenario: データが永続化される

**Given** PostgreSQL コンテナが起動しデータが投入されている
**When** `docker-compose down` でコンテナを停止し、`docker-compose up -d` で再起動する
**Then** named volume により以前のデータが保持されている

### Requirement: .env.example に全環境変数が記載されている

.env.example SHALL 全ての必要な環境変数をコメント付きで記載し、開発者が `.env.local` にコピーするだけで開発環境が動作する状態にすること。

#### Scenario: .env.example に必須環境変数が含まれる

**Given** .env.example がプロジェクトルートに存在する
**When** ファイル内容を確認する
**Then** `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `SYSTEM_USER_ID` が記載されている

#### Scenario: DATABASE_URL のデフォルト値が docker-compose と一致する

**Given** .env.example の DATABASE_URL の値を確認する
**When** docker-compose.yml の PostgreSQL 設定と照合する
**Then** `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clearflow` と記載されている

#### Scenario: AUTH_SECRET の生成方法がコメントで記載されている

**Given** .env.example を確認する
**When** AUTH_SECRET の項目を見る
**Then** ランダム値を生成するコマンドがコメントとして記載されている

### Requirement: .env.example が git で追跡される

.gitignore の `.env*` パターンが `.env.example` を除外してしまうため、`!.env.example` で明示的に追跡対象にする MUST。

#### Scenario: .env.example が git 管理下にある

**Given** .gitignore に `.env*` パターンが存在する
**When** `.gitignore` に `!.env.example` が追加されている
**Then** `.env.example` は `git status` で追跡対象として表示される

### Requirement: package.json に DB 操作・型チェック・テスト用の scripts が追加される

package.json SHALL `db:push`, `db:generate`, `db:seed`, `db:reset`, `typecheck`, `test` の scripts を提供すること。

#### Scenario: db:push でスキーマが DB に反映される

**Given** PostgreSQL が起動し DATABASE_URL が設定されている
**When** `bun run db:push` を実行する
**Then** `bunx drizzle-kit push` が実行され、スキーマが DB に同期される

#### Scenario: db:generate でマイグレーションファイルが生成される

**Given** スキーマに変更がある
**When** `bun run db:generate` を実行する
**Then** `bunx drizzle-kit generate` が実行され、drizzle/ にマイグレーション SQL が生成される

#### Scenario: db:seed でシードデータが投入される

**Given** DB にスキーマが反映されている
**When** `bun run db:seed` を実行する
**Then** `bun src/infrastructure/seed.ts` が実行され、シードデータが投入される

#### Scenario: db:reset で DB がクリーンな状態に戻る

**Given** DB にデータが存在する
**When** `bun run db:reset` を実行する
**Then** 全スキーマが削除され、push でスキーマが再作成され、seed でデータが投入される

#### Scenario: typecheck で型チェックが実行される

**Given** TypeScript ソースコードが存在する
**When** `bun run typecheck` を実行する
**Then** `tsc --noEmit` が実行され、型エラーが報告される

#### Scenario: test でテストが実行される

**Given** テストファイルが存在する
**When** `bun run test` を実行する
**Then** `bun test` が実行され、テスト結果が表示される

### Requirement: reset.ts が DB のフルリセットを安全に実行する

`src/infrastructure/reset.ts` SHALL `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` を実行してから、drizzle-kit push と seed を順次実行すること。

#### Scenario: reset.ts が全テーブルを削除しスキーマを再構築する

**Given** PostgreSQL に既存のテーブルとデータが存在する
**When** `bun src/infrastructure/reset.ts` を実行する
**Then** public スキーマが DROP CASCADE され、再作成された後、drizzle-kit push でスキーマが反映され、seed.ts でシードデータが投入される

#### Scenario: reset.ts の実行後に DB 接続が正常にクローズされる

**Given** reset.ts を実行する
**When** 全処理が完了する
**Then** PostgreSQL への接続が閉じられ、プロセスが正常終了する
