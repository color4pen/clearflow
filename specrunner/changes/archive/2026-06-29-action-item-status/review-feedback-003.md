# Code Review Feedback — iteration 003

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
- **iteration**: 003

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | testing | `src/__tests__/usecases/listActionItemsDoneFilter.dynamic.test.ts` | TC-011（must）の "todo + in_progress は含まれ done は除外される" の側面が未検証。テストは `done: false` フィルタが `findByOrganization` に渡ることを確認しているが、done=true の行が除外されるシナリオを assert していない。フィルタ伝播の確認にとどまり、除外動作を明示的に固定していない。実際の SQL フィルタリング（`WHERE done = false`）はリポジトリコードで変更なしに維持されているため影響は限定的。 | mock が `done` フィルタ値に応じて条件付きで行を返すよう実装し（`done: false` のとき todo + in_progress のみ返し、status=done の行を含まない）、result に done=true の項目が含まれないことを assert するテストケースを追加する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.75

## Summary

Iteration 003 で iteration 002 の F-01（high）、F-02（high）の両 blocking 指摘が解決された。

**F-01 → 解決済み**: `toggleActionItemDone.dynamic.test.ts` が新規追加され、TC-008（done=false→true で status="done" に同期）、TC-009（done=true→false で status="todo" に同期）、TC-024（監査が `action_item.toggle` / `metadata.done` のまま）をすべて動的テストで固定している。mock.module で `actionItemRepository` と `auditRecorder` をモックし、update 引数と audit 引数を捕捉する設計は適切。

**F-02 → 解決済み**: `mapRow` が `actionItemRepository.ts` で named export になり、`actionItemStatusDerivation.dynamic.test.ts` が `mapRow` を直接インポートして生の DB 行（`typeof actionItems.$inferSelect`）を渡す方式に変更された。TC-001（status=null, done=false → "todo"）、TC-002（status=null, done=true → "done"）、TC-003（status="in_progress" → 明示値優先）がすべて実際に `mapRow` の実装を実行して assert しており、以前の「空洞テスト」問題が解消された。追加で `status="done", done=false → "done"`（明示値優先）も検証されている。

**F-03 → 部分対処（non-blocking）**: `listActionItemsDoneFilter.dynamic.test.ts` が追加され、`done: false` フィルタが `findByOrganization` に正しく伝播することを確認している。TC-011 の "除外" 側面（done=true の行が結果に含まれないこと）は明示的に assert されていないが、実際の SQL フィルタリング（`conditions.push(eq(actionItems.done, filters.done))`）はリポジトリコードで変更なしに維持されており、機能的な後方互換は保たれている。severity medium のまま維持し、今反復のブロッカーではない。

**実装品質の再確認**:
- マイグレーション: `ALTER TABLE "action_items" ADD COLUMN "status" text;` — nullable・backfill なし・他カラム変更なし ✓
- `mapRow` 導出: `(row.status as ActionItemStatus | null) ?? (row.done ? "done" : "todo")` ✓
- `updateActionItemStatus`: status 設定 + done 同期（`status === "done"`）+ 監査記録 ✓
- `toggleActionItemDone`: status 同期追加（`!existing.done ? "done" : "todo"`）+ 既存監査フォーマット維持 ✓
- `updateActionItemStatusAction`: auth / 認可 / zod（`z.enum(ACTION_ITEM_STATUSES)`）/ revalidatePath ✓
- `ActionItemRow`: チェックボックス → select 置き換え、disabled 制御（`isPending || !editable`）、スタイリング ✓
- `auditLog.ts`: `action_item.updateStatus` + `{ status: string }` metadata ✓
- 依存方向（actions → usecases → domain/infrastructure）遵守 ✓
- build / typecheck / lint / 既存テスト全 green（verification-result.md 確認済み）✓
