# Design: 開発環境セットアップ整備

## Context

Clearflow は機能実装が進んでいるが、新規開発者がリポジトリをクローンしてからアプリケーションを起動するまでの手順が整備されていない。現状の課題:

- PostgreSQL のプロビジョニング手順がない（`docker-compose.yml` 不在）
- 環境変数の一覧がない（`.env.example` 不在、`.gitignore` の `.env*` パターンが `.env.example` も除外してしまう）
- `package.json` の scripts が `dev`, `build`, `start`, `lint` のみで、DB 操作（push, seed, generate, reset）や型チェック、テスト実行のエントリポイントがない
- DB リセット手段がない（開発中にスキーマ変更後のクリーンな状態復元ができない）

seed.ts は既に以下が実装済み:
- system user の固定 UUID `00000000-0000-0000-0000-000000000000` での作成（L108-121）
- シード完了後のログイン情報コンソール表示（L326-331）

## Goals / Non-Goals

**Goals**:

- `git clone` → `bun install` → `docker-compose up -d` → `.env` 設定 → `bun run db:push` → `bun run db:seed` → `bun dev` の一連の流れで開発環境が動作する状態にする
- DB 操作に必要な npm scripts を追加し、コマンド一発で各操作を実行可能にする
- 環境変数の全量を `.env.example` で可視化する
- `db:reset` で開発用 DB をクリーンな状態に戻せるようにする

**Non-Goals**:

- CI/CD パイプライン構築
- アプリケーション本体の Dockerfile 作成（コンテナ化）
- README.md の作成
- テストの追加

## Decisions

### D1: drizzle-kit push を開発環境の DB スキーマ同期に使用する

**選択**: `drizzle-kit push`（スキーマをDBに直接同期）
**却下**: `drizzle-kit migrate`（マイグレーションファイルを順次適用）

**Rationale**: 開発環境ではスキーマの迅速な同期が重要。push はマイグレーション履歴を管理せずスキーマ定義から直接 DB を同期するため、開発サイクルが速い。migrate はプロダクション環境向けの機能であり、本変更のスコープ外。

### D2: docker-compose で PostgreSQL のみを定義する

**選択**: docker-compose.yml に PostgreSQL 16 コンテナのみを定義。アプリケーションはホスト上で `bun dev` で起動する。
**却下**: アプリケーション本体もコンテナ化する構成

**Rationale**: Next.js の HMR とホスト上のファイルシステム変更検知が最も安定するのはホスト実行。DB のみコンテナ化すれば環境差異の問題を最小限にしつつ開発体験を損なわない。アプリのコンテナ化はスコープ外として明示的に除外済み。

### D3: SYSTEM_USER_ID の固定 UUID を seed.ts 内でハードコードする

**選択**: seed.ts 内に `00000000-0000-0000-0000-000000000000` をハードコードし、`.env.example` にも同じ値をデフォルトとして記載する。
**却下**: 環境変数から動的に取得して seed に使用する方式

**Rationale**: seed.ts は既にこの固定 UUID で system user を作成済み（L108-121）。`.env.example` に同じ値を記載することで、開発者が `.env.example` を `.env.local` にコピーするだけで SYSTEM_USER_ID と seed の system user が一致する。

### D4: db:reset は専用スクリプト reset.ts で実装する

**選択**: `src/infrastructure/reset.ts` を新規作成し、SQL で `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` を実行後、`bunx drizzle-kit push` と `bun src/infrastructure/seed.ts` を子プロセスで順次実行する。
**却下**: シェルスクリプトでの実装、package.json の `&&` チェーンでの実装

**Rationale**: TypeScript で統一することでクロスプラットフォーム対応を維持する。また、SQL の `DROP SCHEMA public CASCADE` は全テーブル・enum・sequence を一括削除でき、個別テーブルの DROP 順序（FK 制約）を気にする必要がない。子プロセスで drizzle-kit push を呼ぶことで、push のロジックを重複させずに済む。

### D5: .gitignore に `!.env.example` を追加する

**選択**: 既存の `.env*` パターンの直後に `!.env.example` を追加して明示的に追跡対象にする。
**却下**: `.env*` パターンを個別の `.env.local`, `.env.development.local` 等に書き換える方式

**Rationale**: 既存パターンの変更は影響範囲が広い。`!.env.example` の追加は最小限の変更で目的を達成でき、Next.js プロジェクトの慣例にも合致する。既存テスト（TC-025）が `.env.example` の存在を前提としているため、git 管理下にする必要がある。

## Risks / Trade-offs

**[Risk]** docker-compose.yml の PostgreSQL パスワードが `postgres` のハードコードである
→ **Mitigation**: 開発専用であることを `.env.example` のコメントで明記する。本番環境では別途セキュアな値を設定する前提。

**[Risk]** `db:reset` の `DROP SCHEMA public CASCADE` は破壊的操作である
→ **Mitigation**: 開発環境専用のスクリプトとして位置付ける。スクリプト内に確認プロンプトは追加しないが、コマンド名 `db:reset` により意図が明確。

**[Risk]** ポート 5432 がホスト上で既に使用されている場合に衝突する
→ **Mitigation**: docker-compose.yml のポートマッピングをデフォルト 5432:5432 とし、必要に応じて開発者が変更できるようにする。

## Open Questions

なし — architect により設計判断が評価済みであり、未解決の技術的判断はない。
