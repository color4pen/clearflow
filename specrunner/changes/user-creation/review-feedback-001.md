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
| 1 | medium | testing | `src/__tests__/settings/userSettingsActions.test.ts` | TC-018（must）欠落: `createUserAction が organizationId と actorId をセッションから取得する` のテストが存在しない。受け入れ基準「作成されたユーザーが自組織に属することをテストで固定する」のうち、静的コード検証で固定すべき箇所が未カバー。 | `createUserAction — 静的コード解析` describe に「`session.user.organizationId` と `session.user.id` を参照し、`formData.get("organizationId")` を使用していない」ことを確認する静的テストを追加する。 | yes |
| 2 | medium | testing | `src/__tests__/settings/userSettingsActions.test.ts` | TC-010（must）欠落: `認証されていないユーザーからの呼び出し` テストが存在しない。`createUserAction` が `!session?.user?.id` を確認して「認証が必要です」を返す経路がテストで固定されていない。 | `createUserAction — 静的コード解析` describe に「ソース中に `session?.user?.id` チェックと `"認証が必要です"` メッセージが含まれる」ことを確認する静的テストを追加する。 | yes |
| 3 | low | correctness | `src/application/usecases/createUser.ts` | PostgreSQL UNIQUE 制約違反エラーの型キャストが意味的に不正確。`NodeJS.ErrnoException` はシステムエラー（`ENOENT` 等）向けの型であり、node-postgres の `DatabaseError`（`.code === "23505"`）とは別物。現時点では `.code` プロパティの存在チェック（`"code" in err`）と文字列比較で実際に動作するが、コードの意図が不明瞭。 | `NodeJS.ErrnoException` キャストを除去し、`(err as { code?: string }).code === "23505"` または pg の `DatabaseError` 型ガードを用いる。 | yes |
| 4 | low | security | `src/application/usecases/createUser.ts` | 一般エラー時に `err.message` を直接クライアントへ返している（line 66: `reason: err instanceof Error ? err.message : "ユーザーの作成に失敗しました"`）。DB 接続エラー等の内部情報が expose される可能性がある。内製ツールとして許容範囲内だが記録する。 | `err.message` の代わりに汎用メッセージ `"ユーザーの作成に失敗しました"` を固定で返す。詳細はサーバーログに出力する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.70

## Summary

実装の全体品質は高い。T-01〜T-08 の全タスクが完了しており、ビルド・typecheck・lint・テスト（1291 pass）もすべて green。

**正常な実装点:**

- AuditAction への `"user.create"` 追加、`authorization.ts` への `createUser: ADMIN_ONLY` 追加、いずれも既存パターンに沿って正確に実装されている。
- `userRepository.create` は `tx ?? db` パターンを踏襲し、`.returning()` で User 型を返す設計になっている。スキーマの `id: uuid().defaultRandom()` により、挿入時に id が自動生成される。
- `createUser` usecase の処理順（事前メール重複チェック → パスワードハッシュ → トランザクション内で create + recordAudit）は spec.md の要件仕様と一致している。DB UNIQUE 制約のフォールバック処理も存在する。
- `createUserAction` は auth() 認証 → canPerform 認可 → zod バリデーション → usecase 呼び出し → revalidatePath の順を正しく遵守している。`organizationId` と `actorId` はセッション由来であり、フォームから受け付けていない（実装は正しい）。
- `CreateUserForm` は `useActionState` + Server Action のパターン、既存共通コンポーネント（FormField/Input/Select/SubmitButton）の使用、成功時のフォームリセット（`useEffect + ref.reset()`）を適切に実装している。
- 依存方向（actions → usecases → domain/infrastructure）が遵守されている。

**ブロッキング指摘なし。** Finding #1 と #2 は test-cases.md で must 指定された静的解析テストの欠落であり、コードの動作は正しいが受け入れ基準のテスト固定が未完了。Finding #3・#4 は軽微な品質改善。いずれも `needs-fix` 閾値（critical/high）には達しない。
