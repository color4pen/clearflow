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
| 1 | medium | testing | `src/__tests__/usecases/` (missing) | TC-008 / TC-009（must / integration）が未実装。T-06 で `toggleActionItemDone` に追加した status 同期ロジック（`status: !existing.done ? "done" : "todo"`）に対する dynamic test がない。test-cases.md が "must" と分類した自動テスト 2 件が欠落しており、toggle 変更時のリグレッション防止アサートがない。実装は正しく機能不全ではないが、品質低下・将来リスクとして記録する。 | `src/__tests__/usecases/toggleActionItemDone.dynamic.test.ts` を新規作成し、mock.module 方式で (a) done=false→true のとき update の status="done" が渡ること、(b) done=true→false のとき update の status="todo" が渡ること、(c) recordAudit が `action_item.toggle` / `{ done }` のままであること（TC-024）を assert する。 | yes |
| 2 | medium | testing | `src/__tests__/usecases/actionItemStatusDerivation.dynamic.test.ts` | TC-001〜003 の derivation テストが `actionItemRepository` をモックしており、実際の `mapRow` の導出コード `(row.status as ActionItemStatus \| null) ?? (row.done ? "done" : "todo")` を一度も実行していない。テストタイトルは「status=null の行が done から導出される」と主張しているが、mock が返す値は既に導出済み（`status: "todo"` 等）のため、mapRow が誤って実装されても本テストは通過してしまう。品質低下（テストカバレッジの空洞）として記録する。 | モック対象を repository 層から DB 層に下げる。`@/infrastructure/db` をモックして `actionItemRepository` 本体を実際に動かし、`typeof actionItems.$inferSelect` 型の行（`status: null, done: false` 等）を DB から返すように構成する。これにより mapRow の導出ロジックが実際に実行される。あるいは `mapRow` を named export にして直接ユニットテストする方針でもよい。 | yes |
| 3 | medium | testing | `src/__tests__/usecases/` (missing) | TC-011（must / integration）が未実装。`findByOrganization({ done: false })` フィルタは変更されていないが、status=null を持つ既存行が done フィールドで正しくフィルタされることを assert するテストがない。test-cases.md で "must" とされている。実装は正しいが、将来の schema 変更でフィルタが壊れた際の検知手段がない。 | 既存の dynamic test ファイルに、`findByOrganization` を mock しつつ `done=false` の行のみが返るシナリオ（status=null を含む）を追加する。あるいは `updateActionItemStatus.dynamic.test.ts` に補足テストとして追記する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 4 | 0.10 |

- **total**: 8.05

## Summary

実装の正確性は高い。マイグレーション・スキーマ・ドメインモデル・usecase・action・UI のすべてにわたって仕様どおりに実装されており、build / typecheck / lint / 既存テスト（1420件）は全 green。

**適合している点:**

- マイグレーション SQL: `ALTER TABLE "action_items" ADD COLUMN "status" text;` のみ。nullable・backfill なし ✓
- mapRow 導出: `(row.status as ActionItemStatus | null) ?? (row.done ? "done" : "todo")` — 正しい ✓
- `updateActionItemStatus`: transaction → update({ status, done: status === "done" }) → recordAudit の順序・楽観ロック維持 ✓
- `toggleActionItemDone`: `status: !existing.done ? "done" : "todo"` で正確に同期。監査記録 `action_item.toggle / { done }` も変更なし ✓
- `updateActionItemStatusAction`: auth → `canPerform("actionItem", "edit")` → `z.enum(ACTION_ITEM_STATUSES)` → revalidatePath すべて仕様準拠 ✓
- `ActionItemRow`: チェックボックスを `<select>` に置き換え。3値対応・isPending 中 disabled・done 時 line-through ✓
- 依存方向 actions → usecases → domain / infrastructure 遵守 ✓

**要修正の背景:**

F-01 は T-06 で追加した新動作（toggle の status 同期）がテストで全く固定されていないことが問題。新動作には必ず動的テストが必要であり、test-cases.md も "must" と明示している。

F-02 はテストが存在するにもかかわらず、肝心の導出ロジック（mapRow）を実行していないため、仕様が求める「repository 経由で行を読み取る」シナリオの検証として機能していない。mapRow に誤りがあっても検知できない空洞になっている。

