# Code Review Feedback — iteration 002

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

- **verdict**: needs-fix
- **iteration**: 002

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | high | testing | `src/__tests__/usecases/` (missing) | TC-008 / TC-009（must / integration）が iteration 001 から未修正のまま持ち越されている。T-06 で追加した `toggleActionItemDone` の status 同期ロジック（`status: !existing.done ? "done" : "todo"`）を動的テストで固定するファイルが存在しない。tasks.md T-06 の Acceptance Criteria と test-cases.md の "must" 分類は動的テストによる固定を要求しており、新規追加動作のテストなしは受け入れ基準未達である。 | `src/__tests__/usecases/toggleActionItemDone.dynamic.test.ts` を新規作成する。mock.module で `@/infrastructure/repositories/actionItemRepository` と `@/infrastructure/db` をモックし、(a) done=false の行を toggle → update の引数に `status: "done"` が渡ること（TC-008）、(b) done=true の行を toggle → update の引数に `status: "todo"` が渡ること（TC-009）、(c) recordAudit が `action: "action_item.toggle"` / `metadata: { done }` のままであること（TC-024）を assert する。 | yes |
| 2 | high | testing | `src/__tests__/usecases/actionItemStatusDerivation.dynamic.test.ts` | TC-001〜003（must / unit）が iteration 001 から空洞のまま持ち越されている。本テストは `actionItemRepository` をモックして既に導出済みの `ActionItem`（`status: "todo"` 等）を直接 state にセットしており、`mapRow` の導出コード `(row.status as ActionItemStatus \| null) ?? (row.done ? "done" : "todo")` を一度も実行しない。mapRow のロジックを誤って書き換えてもテストは通過し続けるため、受け入れ基準「status=null の行が done から導出されることをテストで固定する」を満たしていない。 | モック対象を repository 層から DB 層に変更する。`mock.module("@/infrastructure/db", ...)` で Drizzle クエリをモックし、`actionItemRepository` 本体を実際に動かす。モックが返す DB 行の型は `typeof actionItems.$inferSelect`（`status: null`）とし、TC-001: `status=null, done=false` → ActionItem.status が "todo"、TC-002: `status=null, done=true` → "done"、TC-003: `status="in_progress", done=false` → "in_progress" を assert する。これにより mapRow の実コードが実行される。代替として `mapRow` を named export にしてユニットテストする方針でも可。 | yes |
| 3 | medium | testing | `src/__tests__/usecases/` (missing) | TC-011（must / integration）が iteration 001 から未修正のまま持ち越されている。`findByOrganization({ done: false })` フィルタが status カラム追加後も従来どおり動作する（todo + in_progress は含まれ done は除外される）ことを assert するテストがない。test-cases.md で "must" に分類されている後方互換テストが欠落している。 | 既存の dynamic test ファイル（例: `updateActionItemStatus.dynamic.test.ts`）に補足テスト、または独立した `actionItemFilterBackcompat.dynamic.test.ts` を追加する。mock.module で `actionItemRepository.findByOrganization` をモックし、`done: false` フィルタを受け取ったときに `status=todo` / `status=in_progress` の行を返し `status=done` の行を含まないことを assert する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 3 | 0.10 |

- **total**: 7.95

## Summary

実装コードの正確性は高い。マイグレーション（status カラム追加のみ・nullable・backfill なし）、mapRow 導出ロジック、`updateActionItemStatus` usecase（transaction / done 同期 / 監査記録）、`toggleActionItemDone` の status 同期、`updateActionItemStatusAction`（auth / 認可 / zod / revalidatePath）、`ActionItemRow` のセレクタ置き換えはすべて仕様どおりに実装されており、build / typecheck / lint / 既存テスト（1420件）は全 green。

**Iteration 002 での変更点:**

- `uiBusinessStyle.test.ts` に `updateActionItemStatusAction` の静的確認テストを追加（`toggleActionItemAction` → `updateActionItemStatusAction` へ更新）。UI 変更の静的追跡として妥当。
- 上記以外のテスト変更なし。F-01 / F-02 / F-03 は未対処のまま。

**未解決の問題（iteration 001 からの持ち越し）:**

**F-01**: T-06 で新規追加した `toggleActionItemDone` の status 同期動作（`status: !existing.done ? "done" : "todo"`）に対するテストが iteration 002 でも存在しない。test-cases.md が "must / integration" と分類し、tasks.md T-06 の Acceptance Criteria が動的テストによる固定を明示要求しているため、severity を medium から **high** に格上げする。

**F-02**: `actionItemStatusDerivation.dynamic.test.ts` は repository モックが導出済み値を直接返すため、`mapRow` の実装が実行されない空洞テストのまま。受け入れ基準「status=null の行が done から導出されることをテストで固定する」を依然として満たさないため、severity を medium から **high** に格上げする。

**F-03**: done=false フィルタの後方互換テスト（TC-011 / must）が引き続き欠落。severity medium を維持する。
