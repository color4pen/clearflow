# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | testing | `src/__tests__/infrastructure/apiTokenResolver.test.ts`, `src/__tests__/usecases/apiTokenManagement.test.ts` | テストが全て静的解析（ソースにキーワードが含まれるか）のみ。Bearer 解決・トークン失効・監査ログ記録・テナント分離等、セキュリティ上重要な挙動が実行時に正しく動作することを保証するランタイムテストが存在しない。tasks.md で「静的解析で確認」と明記されており設計上の選択ではあるが、受け入れ基準（「テストで固定する」）との乖離がある。 | DB モックを使った integration test を追加するか、次期 PR でランタイムテストを計画に含める。少なくとも resolveBearer の正常系・失効済み・期限切れ・deactivated の4ケースは実行テストで固定することを推奨。 | no |
| 2 | low | correctness | `src/app/actions/apiTokens.ts:101-109` | `listApiTokensAction` は未認証呼び出し時に空配列 `[]` をサイレントに返す。TC-033 「未認証ユーザーが各 Server Action を呼び出すとエラーが返る」に反する。ページ側（`account/page.tsx`）が `redirect("/login")` を持つため実害はないが、Server Action 単体としての契約が壊れている。 | `if (!session?.user?.id) throw new Error("認証が必要です")` に変更するか、`createApiTokenAction`・`revokeApiTokenAction` と同じ `{ success: false, message }` 型を返すように修正する。 | yes |
| 3 | low | maintainability | `src/application/usecases/index.ts:123` | `export type { } from "./createApiToken"` — 空の型 re-export が残っている。型のエクスポートが何もなく、コード自動生成の残骸と思われる。 | 該当行を削除する。 | yes |
| 4 | low | correctness | `src/app/actions/apiTokens.ts:12` | `createApiTokenSchema` の `name` フィールドが `z.string().min(1)` であり、スペースのみの文字列（例: `"   "`）が通過する。ユースケース側で `name.trim().length === 0` を検査するため最終的に拒否されるが、バリデーション層とユースケース層の不一致が存在する。 | `z.string().trim().min(1, "トークン名は必須です")` に変更し、zod 側でトリミング後の長さを検証する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 6 | 0.10 |

- **total**: 7.95

## Summary

全体として実装品質は高く、設計仕様を忠実に実現している。

**正しく実装されている点**:

- `api_tokens` テーブルのスキーマ定義（全必須カラム・外部キー・ユニーク制約・複合インデックス）が完備している
- 差分マイグレーション（`0019_third_blonde_phantom.sql`）が正しく生成されており、既存テーブルへの変更はない
- `resolveBearer` は Bearer prefix / cfp_ prefix / SHA-256 ハッシュ照合 / revokedAt / expiresAt / deactivatedAt の全ステップを正しい順序で実装している
- `createApiToken` はトランザクション内でトークン作成と監査ログを原子的に記録し、`plainToken` を戻り値で一度だけ返す
- `revokeApiToken` は `userId AND organizationId AND revokedAt IS NULL` 条件により本人かつ未失効のトークンのみを操作対象にしており、他ユーザー・admin からの操作を正しく拒否する
- Server Action が全て `session.user.id` / `session.user.organizationId` をセッションから取得し、formData から受け取らない（TC-018 相当）
- `ApiToken` ドメインモデルに `tokenHash` を含まず、リポジトリ層のみがハッシュを扱う設計が維持されている
- `ent-api-token` が `design/domain/model.md` に追加されている（TC-054）
- 監査ログのメタデータに `plainToken` / `tokenHash` を渡すコードが存在しない（TC-021）
- ビルド・型チェック・テスト・lint の全フェーズが green（verification-result.md 確認済み）

**要修正の問題**（low のみ・ブロックなし）:

- `listApiTokensAction` が未認証時に空配列を返す（low: TC-033 乖離）
- 空の `export type {}` 文（low: 不要なコード）
- Zod バリデーションが whitespace-only name を通過させる（low: 層間の不一致）

**テストカバレッジの観察**:

テストは全て静的解析（ソースコード文字列検査）により実装されており、実際のランタイム動作の検証がない。これは tasks.md が「静的解析で確認」と明記した設計上の選択であり、既存プロジェクトのテストパターンとも一致している。ただし、Bearer 解決・失効・期限切れ・deactivated チェック等のセキュリティ上重要な条件分岐は、静的解析では誤った条件式（例: `>` と `<` の取り違え、null 検査の欠落）を検出できない。次期 PR でランタイムテストを追加することを強く推奨する。
