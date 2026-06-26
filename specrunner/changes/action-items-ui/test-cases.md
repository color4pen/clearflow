# Test Cases: アクションアイテム UI の action_items テーブル切り替え

## Summary

- **Total**: 32 cases
- **Automated** (unit/integration): 9
- **Manual**: 23
- **Priority**: must: 18, should: 10, could: 4

---

## DealActionItemsSection — データ表示・完了切替

### TC-001: Deal detail page shows action items from action_items table

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: DealActionItemsSection SHALL display action items from the action_items table > Scenario: Deal detail page shows action items from action_items table

---

### TC-002: Toggle completion on deal action item

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: DealActionItemsSection SHALL display action items from the action_items table > Scenario: Toggle completion on deal action item

---

### TC-003: 完了切替で updateMeetingAction を呼び出さない

**Category**: integration  
**Priority**: should  
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** DealActionItemsSection が action_items テーブル由来の ActionItem[] を受け取りレンダリングされている  
**WHEN** ユーザーがいずれかのアイテムのチェックボックスをクリックする  
**THEN** `updateMeetingAction` は呼び出されず、`toggleActionItemAction({ id: actionItemId })` のみが呼び出される

---

### TC-004: action_items テーブルが空のとき空リストを表示する

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-06 Acceptance Criteria

**GIVEN** deal "deal-1" に紐づく action_items テーブルのエントリが存在しない  
**WHEN** ユーザーが `/deals/deal-1` に遷移する  
**THEN** DealActionItemsSection はエラーを発生させずに空のリストを表示する

---

### TC-005: assigneeId が null のアクションアイテムを「未設定」と表示する

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** deal "deal-1" に assigneeId が null のアクションアイテムが 1 件ある  
**WHEN** ユーザーが `/deals/deal-1` に遷移する  
**THEN** DealActionItemsSection はそのアイテムの担当者欄に「未設定」を表示する

---

### TC-006: dueDate が null のアクションアイテムをエラーなく表示する

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-04

**GIVEN** dueDate が null の ActionItem が DealActionItemsSection に渡される  
**WHEN** コンポーネントがレンダリングされる  
**THEN** ランタイムエラーが発生せず、dueDate 欄は空または「-」等で表示される

---

## DealActionItemsSection — 追加フォーム

### TC-007: Add action item from deal detail without meeting

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: DealActionItemsSection SHALL provide an add form for deal-level action items > Scenario: Add action item from deal detail without meeting

---

### TC-008: 「追加」ボタンが表示されフォームを開閉できる

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** DealActionItemsSection がレンダリングされており追加フォームが非表示状態  
**WHEN** ユーザーが「追加」ボタンをクリックする  
**THEN** description・assigneeId（セレクトボックス）・dueDate の入力フィールドを含む追加フォームが表示される

---

### TC-009: createActionItemAction が dealId 付き・meetingId なしで呼び出される

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** ユーザーが deal "deal-1" の追加フォームに description "社内確認" を入力して送信する  
**WHEN** フォームが送信される  
**THEN** `createActionItemAction` が `{ description: "社内確認", dealId: "deal-1" }` で呼び出され、`meetingId` は null または未設定である

---

### TC-010: 作成成功後にフォームがリセットされ画面が更新される

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-05

**GIVEN** ユーザーが追加フォームに入力して送信した  
**WHEN** `createActionItemAction` が成功（エラーなし）を返す  
**THEN** フォームの入力値がリセットされ、`router.refresh()` が呼び出されてリストが再取得される

---

### TC-011: createActionItemAction がエラーを返した場合にエラーメッセージを表示する

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-05

**GIVEN** ユーザーが追加フォームに入力して送信した  
**WHEN** `createActionItemAction` が `{ message: "作成に失敗しました" }` を返す  
**THEN** フォーム付近にエラーメッセージが表示され、フォームは閉じられない

---

### TC-012: description が空のとき送信できない

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-05

**GIVEN** 追加フォームが表示されており description が未入力  
**WHEN** ユーザーが送信ボタンをクリックする  
**THEN** `createActionItemAction` は呼び出されない（HTML5 required バリデーションまたはクライアントガード）

---

## MeetingActionItemsSection

### TC-013: Meeting detail page shows action items from action_items table

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: MeetingActionItemsSection SHALL read and write action items via the action_items table > Scenario: Meeting detail page shows action items from action_items table

---

### TC-014: Add action item from meeting detail

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: MeetingActionItemsSection SHALL read and write action items via the action_items table > Scenario: Add action item from meeting detail

---

### TC-015: Toggle completion on meeting action item

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: MeetingActionItemsSection SHALL read and write action items via the action_items table > Scenario: Toggle completion on meeting action item

---

### TC-016: 操作時に updateMeetingAction を呼び出さない

**Category**: integration  
**Priority**: should  
**Source**: tasks.md > T-07 Acceptance Criteria

**GIVEN** MeetingActionItemsSection がレンダリングされている  
**WHEN** ユーザーがアクションアイテムの追加または完了切替を行う  
**THEN** `updateMeetingAction` は呼び出されない。追加は `createActionItemAction`、完了切替は `toggleActionItemAction` のみが呼び出される

---

### TC-017: 担当者入力がセレクトボックスで「未設定」選択肢を含む

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-07 Acceptance Criteria

**GIVEN** `orgUsers` に 3 名のユーザーが含まれている状態で MeetingActionItemsSection の追加フォームが表示される  
**WHEN** 担当者フィールドを確認する  
**THEN** 自由テキスト入力ではなく `<select>` が表示され、先頭に「未設定」の選択肢と 3 名分のユーザー選択肢がある

---

### TC-018: 各アイテムの React key が index ではなく id ベースである

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-07

**GIVEN** MeetingActionItemsSection に複数のアクションアイテムが渡されている  
**WHEN** コンポーネントがレンダリングされる  
**THEN** 各アイテム要素の React key に index ではなく `item.id`（UUID）が使われている

---

### TC-019: dueDate（Date）を人が読める日付文字列にフォーマットして表示する

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-07

**GIVEN** dueDate が `new Date("2025-12-31")` の ActionItem が MeetingActionItemsSection に渡される  
**WHEN** コンポーネントがレンダリングされる  
**THEN** 「2025-12-31」または「2025年12月31日」等の人が読める形式で表示され、Date オブジェクトが `[object Object]` のまま表示されない

---

## getDashboardActions

### TC-020: Dashboard collects undone action items from action_items table

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: getDashboardActions SHALL retrieve undone action items from the action_items table > Scenario: Dashboard collects undone action items from action_items table

---

### TC-021: meeting.actionItems JSON ループを使用しない

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** org-1 に 2 件の meeting があり、それぞれ `meeting.actionItems` JSON に未完了アイテムが含まれる  
**WHEN** `getDashboardActions("org-1", "member")` が呼び出される  
**THEN** 返却リストは `meeting.actionItems` の内容を含まず、`actionItemRepository.findByOrganization` が返す action_items テーブルの内容のみを返す

---

### TC-022: done: true のアクションアイテムは結果に含まれない

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** action_items テーブルに `done: true` のアイテムが 2 件、`done: false` のアイテムが 1 件ある  
**WHEN** `getDashboardActions` が呼び出される  
**THEN** 返却リストの `action_item` バリアントは `done: false` の 1 件のみを含む

---

### TC-023: dueDate（Date | null）が string | null に変換される

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** `dueDate` が `Date` オブジェクトのアクションアイテム 1 件と `dueDate` が `null` のアイテム 1 件がある  
**WHEN** `getDashboardActions` が呼び出される  
**THEN** 返却される `DashboardActionItem` の `dueDate` フィールドは Date が `string` に変換されており、null のものは null のまま返される

---

## SalesDashboard

### TC-024: Action item with null dealId on dashboard

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: SalesDashboard SHALL handle nullable dealId and resolve assigneeId to user name > Scenario: Action item with null dealId on dashboard

---

### TC-025: Action item with valid dealId on dashboard

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: SalesDashboard SHALL handle nullable dealId and resolve assigneeId to user name > Scenario: Action item with valid dealId on dashboard

---

### TC-026: userMap props を受け取り assigneeId から名前を解決する

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** `userMap = { "user-1": "田中", "user-2": "鈴木" }` が SalesDashboard に渡されている  
**WHEN** assigneeId が "user-1" の action_item がレンダリングされる  
**THEN** 担当者欄に「田中」が表示される

---

### TC-027: assigneeId が null の場合に「未設定」を表示する

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** assigneeId が null の action_item がダッシュボードに表示されている  
**WHEN** SalesDashboard がレンダリングされる  
**THEN** 担当者欄に「未設定」（または同等のプレースホルダー）が表示される

---

### TC-028: dealId が null の場合に一意な React key が生成される

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-03

**GIVEN** dealId が null の action_item が複数ある  
**WHEN** SalesDashboard がレンダリングされる  
**THEN** 各アイテムの React key が重複せず一意であり、ブラウザコンソールに key 重複警告が出ない

---

## 型安全・ビルド

### TC-029: bun run build が成功する

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** 全タスク（T-01〜T-08）の変更が適用されている  
**WHEN** `bun run build` を実行する  
**THEN** ビルドエラーが 0 件で完了する

---

### TC-030: typecheck が 0 エラーで通る

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** 全タスクの変更が適用されている  
**WHEN** typecheck コマンドを実行する  
**THEN** 型エラーが 0 件で終了する

---

### TC-031: DashboardActionItem から assignee フィールドが削除されている

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** T-01 の変更が適用されている  
**WHEN** `src/domain/models/dashboard.ts` の `DashboardActionItem` union の `action_item` バリアントを確認する  
**THEN** `assignee: string` フィールドは存在せず、`assigneeId: string | null` と `dealId: string | null` が定義されている

---

### TC-032: 既存テストが green

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** 全タスクの変更が適用されている  
**WHEN** `bun test` を実行する  
**THEN** 既存の全テストが pass する

---

## Result

```yaml
result: completed
total: 32
automated: 9
manual: 23
must: 18
should: 10
could: 4
blocked_reasons: []
```
