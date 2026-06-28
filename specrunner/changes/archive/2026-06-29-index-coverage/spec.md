# Spec: index-coverage

## Requirements

### Requirement: 差分マイグレーションはインデックス追加のみを含む

The generated migration SQL SHALL consist only of `CREATE INDEX` statements. It MUST NOT contain table creation, column modification, or data manipulation statements.

#### Scenario: マイグレーションファイルの内容検証

**Given** schema.ts に 13 本のインデックス定義が追加されている
**When** `bun run db:generate` で差分マイグレーションを生成する
**Then** 生成された SQL ファイルには `CREATE INDEX` 文のみが含まれ、`CREATE TABLE` / `ALTER TABLE ... ADD COLUMN` / `ALTER TABLE ... DROP` / `INSERT` / `UPDATE` / `DELETE` 文は含まれない

### Requirement: 既存のインデックス・制約と重複しない

New indexes SHALL NOT duplicate the column composition of any existing index or UNIQUE constraint.

#### Scenario: deal_contacts テーブルは新規インデックスを追加しない

**Given** deal_contacts テーブルに `UNIQUE(deal_id, contact_id)` 制約が存在する
**When** インデックス追加の対象テーブルを決定する
**Then** deal_contacts テーブルには新規インデックスを追加しない（UNIQUE 制約が deal_id 先頭のインデックスとして機能するため）

### Requirement: drizzle-kit check が通る

After adding indexes and generating the migration, `drizzle-kit check` SHALL pass with no errors, confirming journal and snapshot consistency.

#### Scenario: drizzle-kit check の成功

**Given** schema.ts にインデックス定義を追加し、`bun run db:generate` でマイグレーションを生成済み
**When** `drizzle-kit check` を実行する
**Then** エラーなく正常終了する

### Requirement: 既存テスト・ビルドに影響しない

Index additions SHALL NOT affect existing tests, type checks, or builds. All existing tests MUST pass without modification.

#### Scenario: 既存テストが無変更で通る

**Given** schema.ts にインデックス定義を追加済み
**When** `bun test` / `bun run typecheck` / `bun run build` を実行する
**Then** すべて成功する（テストの修正は不要）
