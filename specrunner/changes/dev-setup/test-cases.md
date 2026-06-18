# Test Cases: 開発環境セットアップ整備

## Summary

- **Total**: 21 cases
- **Automated** (unit/integration): 12
- **Manual**: 9
- **Priority**: must: 12, should: 9, could: 0

---

### TC-001: PostgreSQL コンテナが起動する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: docker-compose.yml で PostgreSQL 16 が起動できる > Scenario: PostgreSQL コンテナが起動する

---

### TC-002: データが永続化される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: docker-compose.yml で PostgreSQL 16 が起動できる > Scenario: データが永続化される

---

### TC-003: .env.example に必須環境変数が含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: .env.example に全環境変数が記載されている > Scenario: .env.example に必須環境変数が含まれる

---

### TC-004: DATABASE_URL のデフォルト値が docker-compose と一致する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: .env.example に全環境変数が記載されている > Scenario: DATABASE_URL のデフォルト値が docker-compose と一致する

---

### TC-005: AUTH_SECRET の生成方法がコメントで記載されている

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: .env.example に全環境変数が記載されている > Scenario: AUTH_SECRET の生成方法がコメントで記載されている

---

### TC-006: .env.example が git 管理下にある

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: .env.example が git で追跡される > Scenario: .env.example が git 管理下にある

---

### TC-007: db:push でスキーマが DB に反映される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: package.json に DB 操作・型チェック・テスト用の scripts が追加される > Scenario: db:push でスキーマが DB に反映される

---

### TC-008: db:generate でマイグレーションファイルが生成される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: package.json に DB 操作・型チェック・テスト用の scripts が追加される > Scenario: db:generate でマイグレーションファイルが生成される

---

### TC-009: db:seed でシードデータが投入される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: package.json に DB 操作・型チェック・テスト用の scripts が追加される > Scenario: db:seed でシードデータが投入される

---

### TC-010: db:reset で DB がクリーンな状態に戻る

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: package.json に DB 操作・型チェック・テスト用の scripts が追加される > Scenario: db:reset で DB がクリーンな状態に戻る

---

### TC-011: typecheck で型チェックが実行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: package.json に DB 操作・型チェック・テスト用の scripts が追加される > Scenario: typecheck で型チェックが実行される

---

### TC-012: test でテストが実行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: package.json に DB 操作・型チェック・テスト用の scripts が追加される > Scenario: test でテストが実行される

---

### TC-013: reset.ts が全テーブルを削除しスキーマを再構築する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: reset.ts が DB のフルリセットを安全に実行する > Scenario: reset.ts が全テーブルを削除しスキーマを再構築する

---

### TC-014: reset.ts の実行後に DB 接続が正常にクローズされる

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: reset.ts が DB のフルリセットを安全に実行する > Scenario: reset.ts の実行後に DB 接続が正常にクローズされる

---

### TC-015: docker-compose.yml に pg_isready healthcheck が定義されている

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** docker-compose.yml がプロジェクトルートに作成されている
**WHEN** ファイル内容を確認する
**THEN** `healthcheck` セクションに `pg_isready -U postgres` を使用するコマンドが定義されている

---

### TC-016: 既存の package.json scripts が破壊されていない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 変更前の package.json に `dev`, `build`, `start`, `lint` スクリプトが定義されている
**WHEN** 新しい scripts を追加した後の package.json を確認する
**THEN** `dev`, `build`, `start`, `lint` の各スクリプトが元の値のまま残っており、変更されていない

---

### TC-017: DATABASE_URL 未設定時に reset.ts がエラーで終了する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `DATABASE_URL` 環境変数が設定されていない状態
**WHEN** `bun src/infrastructure/reset.ts` を実行する
**THEN** エラーメッセージをコンソールに出力し、`process.exit(1)` で非ゼロ終了する

---

### TC-018: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** すべての変更（docker-compose.yml, .env.example, package.json, reset.ts, .gitignore）が適用された状態のコードベース
**WHEN** `bun run build` を実行する
**THEN** Next.js ビルドが exit 0 で正常完了する

---

### TC-019: typecheck が green になる（型エラーなし）

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** reset.ts を含むすべての新規・変更ファイルが適用された状態
**WHEN** `bun run typecheck`（`tsc --noEmit`）を実行する
**THEN** TypeScript の型エラーが0件で完了し、exit 0 で終了する

---

### TC-020: .env.example に SYSTEM_USER_ID のデフォルト値が記載されている

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03 / design.md > D3

**GIVEN** .env.example がプロジェクトルートに作成されている
**WHEN** ファイルの `SYSTEM_USER_ID` 行を確認する
**THEN** `SYSTEM_USER_ID=00000000-0000-0000-0000-000000000000` が記載されており、seed.ts の system user UUID と一致することがコメントで説明されている

---

### TC-021: .gitignore の既存 env ファイル除外が維持される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-02 / design.md > D5

**GIVEN** `.gitignore` に `.env*` パターンと `!.env.example` が追加されている
**WHEN** `.env.local` が存在する状態で `git status` を確認する
**THEN** `.env.local` は untracked/ignored として表示され、`.env.example` のみ追跡対象として表示される

---

## Result

```yaml
result: completed
total: 21
automated: 12
manual: 9
must: 12
should: 9
could: 0
blocked_reasons: []
```
