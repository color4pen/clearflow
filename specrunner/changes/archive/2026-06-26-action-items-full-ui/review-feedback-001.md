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
| 1 | medium | maintainability | src/app/(dashboard)/tasks/TaskList.tsx | `canDelete={true}` がロールによらず全行に渡される。`actionItem.delete` は `ADMIN_MANAGER` のみが許可されているが（authorization.ts:137）、タスク一覧ではロール問わず削除ボタンが表示される。DealActionItemsSection は `canDelete={editable}` でロール制御しているため挙動が不一致。member ユーザーが削除ボタンを押すとサーバーエラーになるが UI 上は操作可能に見える | `page.tsx` で `canPerform(session!.user.role, "actionItem", "delete")` を評価して `canDelete` prop を TaskList に渡し、TaskList から ActionItemRow へ伝播させる | yes |
| 2 | low | testing | src/__tests__/usecases/actionItemManagement.test.ts | test-cases.md TC-026〜TC-034（Category: unit、Priority: must）は listActionItems の実際の振る舞い（sourceName 解決 / done フィルタ / sourceHref 解決）を要求しているが、実装は静的解析（ソース文字列検索）のみで、モックを使った動作検証テストが存在しない。T-08 が「静的解析で確認」と明示しているため実装は仕様内だが、test-cases.md との乖離が残る | T-08 の指示に従い静的解析で対応済みのため今回は対応不要。将来 listActionItems の実装変更時はモックを使ったユニットテストの追加を検討する | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.2

## Summary

実装の全体品質は高く、受け入れ基準はすべて満たされている。

**実装の良い点**:
- レイヤードアーキテクチャが厳守されている（page.tsx → listActionItems ユースケース → repository。page から repository を直接呼ばない）
- `ActionItemRow` 共通コンポーネントによる DRY 化が適切（DealSection / MeetingSection / TaskList の 3 箇所で再利用）
- `listActionItems` の N+1 回避が正しく実装されている（Map + Promise.all によるバッチ並列取得）
- 4 つの Server Actions すべてに `revalidatePath("/tasks")` が追加されており、タスク一覧のキャッシュ無効化が漏れなく対応されている
- `ConfirmDialog`（variant="danger"）による削除確認 UX が仕様通りに実装されている
- サイドバーの「タスク」メニューが「案件」と「契約」の間に正しく配置されている
- ビルド・型チェック・テスト・lint がすべて green（verification-result.md 参照）

**修正が必要な点**:
- **F01（medium）**: タスク一覧ページで `canDelete={true}` がロールに関係なく全ユーザーに渡される。`page.tsx` でロールを確認し、`canDelete` を適切に制御することで DealActionItemsSection との UX 一貫性を保つ。セキュリティ上の問題ではないが（Server Action 側で権限チェック済み）、member が操作不能なボタンを見てエラーになる UX 上の不一致を修正すべき。

**注意点**:
- F02（low）の behavioral ユニットテスト不足は tasks.md T-08 の指示範囲内の実装であるため、fixer では対応不要（Fix=no）。
