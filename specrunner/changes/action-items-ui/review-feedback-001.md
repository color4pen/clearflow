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
| 1 | medium | correctness | src/domain/models/dashboard.ts, src/app/(dashboard)/dashboard/SalesDashboard.tsx | `DashboardActionItem.action_item` に `id` フィールドがなく、SalesDashboard の React key が `action-${dealId ?? "none"}-${assigneeId ?? "none"}-${description}` の合成値に頼っている。同一案件・同一担当者・同一説明の action item が複数存在するときに key が重複し、React の差分更新が誤動作する（コンソール警告 + 状態の不一致リスク）。`ActionItem` モデルは `id: string` を持つが `getDashboardActions` のマッピングで省いている | `DashboardActionItem.action_item` に `id: string` フィールドを追加する。`getDashboardActions` の push 時に `id: actionItem.id` を含める。SalesDashboard の itemKey を `action-${item.id}` に変更する | yes |
| 2 | low | maintainability | src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingActionItemsSection.tsx | `handleToggle(idx: number)` が `actionItems[idx]` でアイテムを引いてから `toggleActionItemAction({ id: item.id })` を呼ぶ。T-07 の "index ベースから id ベースへ" 方針を踏まえると、シグネチャ自体を `handleToggle(id: string)` にする方が意図と一致する。現行コードは機能的に正しいが、将来の修正時に index と id の混在が混乱を招く | 関数を `handleToggle(id: string)` に変更し、呼び出し側を `onChange={() => handleToggle(item.id)}` にする | yes |

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

全 must 受け入れ基準を達成しており、ビルド・typecheck・テスト（990 pass）・lint（新規エラーなし）がすべて green であることを確認した。

**適合している点**

- `DashboardActionItem.action_item` の型が `dealId: string | null` / `assigneeId: string | null` に正しく変更され（T-01、TC-031）、`assignee` フィールドは削除されている
- `getDashboardActions` が `actionItemRepository.findByOrganization(organizationId, { done: false })` を使用し、旧来の `meeting.actionItems` JSON ループが完全に削除されている（T-02、TC-021、TC-022）
- `dueDate` が `toISOString()` で `string | null` に変換されており、`getSortDate` の `new Date(item.dueDate)` とも整合している（TC-023）
- `DealActionItemsSection` が `ActionItem[]`（`@/domain/models/actionItem`）を受け取り、`toggleActionItemAction` / `createActionItemAction` 経由で action_items テーブルに書き込む（T-04、T-05）
- `MeetingActionItemsSection` が `createActionItemAction({ meetingId, dealId, ... })` / `toggleActionItemAction({ id })` を使用し、`updateMeetingAction` への依存がない（T-07）
- 担当者入力が自由テキストから `<select>` に変更され、「未設定」選択肢が先頭にある（TC-017）
- `deals/[id]/page.tsx` が `listActionItemsByDeal` と `listOrganizationUsers` を `Promise.all` で並列取得し、`DealActionItemsSection` に `actionItems` / `dealId` / `orgUsers` を渡している（T-06）
- `meetings/[meetingId]/page.tsx` が `listActionItemsByMeeting` を呼び出し、`MeetingActionItemsSection` に `actionItems` / `orgUsers` を渡している（T-08）
- `SalesDashboard` が `userMap` props で `assigneeId` → 表示名を解決し、`dealId` が null の場合はリンクなしで description を表示する（TC-024、TC-025、TC-026、TC-027）
- セキュリティ面: `createActionItemAction` / `toggleActionItemAction` が auth チェック・権限チェック・レート制限・Zod バリデーションを実装済みで問題なし

**指摘事項**

Finding 1（medium）は `DashboardActionItem.action_item` に `id` を含めない設計上の省略で、同一内容の action item が複数存在するエッジケースで React key 衝突が発生しうる。`approved` で進めて code-fixer で対処を推奨する。Finding 2（low）は動作上の問題はなくリファクタの範囲。
