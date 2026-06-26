# Tasks: アクションアイテム UI の action_items テーブル切り替え

## T-01: DashboardActionItem 型の action_item バリアントを変更する

- [ ] `src/domain/models/dashboard.ts` の `DashboardActionItem` union の `action_item` バリアントを変更する:
  - `dealId: string` → `dealId: string | null`
  - `assignee: string` → `assigneeId: string | null`
  - `dealTitle: string` は維持（null dealId 時は空文字列）

**Acceptance Criteria**:
- `DashboardActionItem` の `action_item` バリアントが `dealId: string | null`, `assigneeId: string | null` を持つ
- `assignee` フィールドが削除されている

## T-02: getDashboardActions を action_items テーブル経由に切り替える

- [ ] `src/application/usecases/getDashboardActions.ts` の import に `actionItemRepository` を追加する
- [ ] (b) セクション（Meeting ループによるアクションアイテム集約）を `actionItemRepository.findByOrganization(organizationId, { done: false })` に置き換える
- [ ] 取得した `ActionItem[]` を `DashboardActionItem[]` にマッピングする。`dealId` はそのまま渡す（null 含む）。`dealTitle` は既存の `dealTitleMap` で解決する（null dealId の場合は空文字列）。`assigneeId` はそのまま渡す
- [ ] `meetingRepository` の import が (b) 以外で使われていなければ import を削除する（使われていれば残す）

**Acceptance Criteria**:
- getDashboardActions が `actionItemRepository.findByOrganization` を使用してアクションアイテムを取得する
- `meeting.actionItems` のループが削除されている
- 返却される `DashboardActionItem` の `action_item` バリアントが T-01 の型に適合する
- `dueDate` フィールドは `ActionItem.dueDate`（`Date | null`）を `string | null` に変換する（`toISOString()` または既存フォーマットに合わせる）

## T-03: SalesDashboard の表示を新しい DashboardActionItem 型に対応させる

- [ ] `src/app/(dashboard)/dashboard/page.tsx` で `listOrganizationUsers` を呼び出し、`userMap: Record<string, string>`（userId → name）を生成して `SalesDashboard` に渡す
- [ ] `src/app/(dashboard)/dashboard/SalesDashboard.tsx` の Props に `userMap: Record<string, string>` を追加する
- [ ] `action_item` タイプの表示部分を変更する:
  - `item.dealId` が null の場合は案件リンクを表示せず、代わりに description をプレーンテキストで表示する
  - `item.dealId` が non-null の場合は既存通り案件リンクを表示する
  - `item.assignee` の参照を `item.assigneeId` に変更し、`userMap[item.assigneeId]` で名前を解決して表示する（assigneeId が null の場合は「未設定」等を表示）
- [ ] `isOverdue` 関数の `action_item` 分岐を確認する。`dueDate` が `string | null` のまま維持されているなら変更不要。型が `Date | null` に変わった場合は比較ロジックを調整する
- [ ] `itemKey` の生成で `item.dealId` が null の場合のキーを調整する（例: `action-${item.assigneeId ?? "none"}-${item.description}`）

**Acceptance Criteria**:
- SalesDashboard が `userMap` props を受け取り、assigneeId から名前を解決して表示する
- dealId が null の action_item はリンクなしで表示される
- dealId が non-null の action_item は既存通りリンク付きで表示される
- typecheck が通る

## T-04: DealActionItemsSection を action_items テーブルベースに書き換える

- [ ] `src/app/(dashboard)/deals/[id]/DealActionItemsSection.tsx` の import を変更する:
  - `updateMeetingAction` の import を削除する
  - `ActionItem` の import を `@/domain/models/meeting` から `@/domain/models/actionItem` に変更する
  - `toggleActionItemAction` を `@/app/actions/actionItems` から import する
- [ ] Props 型を変更する:
  - `items: FlatItem[]` と `allMeetingActionItems: MeetingActionItems[]` を削除する
  - `actionItems: ActionItem[]`（`@/domain/models/actionItem`）を追加する
  - `dealId: string` を追加する（追加フォーム用）
  - `orgUsers: { id: string; name: string }[]` を追加する（追加フォームの担当者セレクト用）
- [ ] `FlatItem` 型と `MeetingActionItems` 型を削除する
- [ ] `handleToggle` を `toggleActionItemAction({ id: actionItemId })` の呼び出しに書き換える
- [ ] 表示リストを `actionItems` から直接レンダリングする。各アイテムの key は `actionItem.id` を使用する
- [ ] `assignee` の表示を `assigneeId` から `orgUsers` で名前解決して表示する（assigneeId が null の場合は「未設定」）
- [ ] `dueDate` の表示を `Date | null` から日付文字列に変換する
- [ ] 商談ラベル（`[meetingLabel]`）の表示は削除する（action_items テーブルの ActionItem には meetingId はあるが商談ラベルの情報がないため。必要であれば meetingId の有無のみ表示する）

**Acceptance Criteria**:
- DealActionItemsSection が `ActionItem[]`（`@/domain/models/actionItem`）を受け取る
- 完了切替が `toggleActionItemAction` 経由で動作する
- `updateMeetingAction` への依存が削除されている
- コンポーネントが typecheck に通る

## T-05: DealActionItemsSection に追加フォームを実装する

- [ ] `createActionItemAction` を `@/app/actions/actionItems` から import する
- [ ] MeetingActionItemsSection と同様の追加フォーム UI を実装する:
  - 「追加」ボタンで表示/非表示を切り替える
  - description（テキスト入力、必須）
  - assigneeId（セレクトボックス、orgUsers から選択、任意）
  - dueDate（日付入力、任意）
- [ ] 送信時に `createActionItemAction({ description, assigneeId, dueDate, dealId })` を呼び出す（meetingId は渡さない）
- [ ] 成功後にフォームをリセットし `router.refresh()` で再描画する
- [ ] エラーハンドリング: `createActionItemAction` の返却に `message` がある場合はエラー表示する

**Acceptance Criteria**:
- DealActionItemsSection に「追加」ボタンがあり、クリックでフォームが表示される
- フォームから description, assigneeId, dueDate を入力してアクションアイテムを作成できる
- `createActionItemAction` が `dealId` 付きで呼び出される（`meetingId` は null / 未設定）
- 作成後にリストが更新される

## T-06: deals/[id]/page.tsx のデータ取得を listActionItemsByDeal に切り替える

- [ ] `listActionItemsByDeal` と `listOrganizationUsers` を import する
- [ ] `Promise.all` に `listActionItemsByDeal({ dealId: deal.id, organizationId })` を追加する
- [ ] `listOrganizationUsers({ organizationId })` を呼び出す（既存で呼ばれていなければ追加）
- [ ] `flatActionItems` と `allMeetingActionItems` の生成コード（dealMeetings.flatMap / dealMeetings.map）を削除する
- [ ] `DealActionItemsSection` に渡す props を変更する:
  - `items={flatActionItems}` → 削除
  - `allMeetingActionItems={allMeetingActionItems}` → 削除
  - `actionItems={actionItemsResult.ok ? actionItemsResult.actionItems : []}` を追加
  - `dealId={deal.id}` を追加
  - `orgUsers={users.map(u => ({ id: u.id, name: u.name }))}` を追加
- [ ] `meetingTypeLabels` が flatActionItems の商談ラベル用にのみ import されていた場合でも、商談記録テーブルで使用しているため import は維持する

**Acceptance Criteria**:
- deals/[id]/page.tsx が `listActionItemsByDeal` でアクションアイテムを取得する
- `flatActionItems` / `allMeetingActionItems` の生成コードが削除されている
- DealActionItemsSection に `actionItems`, `dealId`, `orgUsers` が渡される
- typecheck が通る

## T-07: MeetingActionItemsSection を action_items テーブルベースに書き換える

- [ ] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingActionItemsSection.tsx` の import を変更する:
  - `updateMeetingAction` の import を削除する
  - `ActionItem` の import を `@/domain/models/meeting` から `@/domain/models/actionItem` に変更する
  - `createActionItemAction`, `toggleActionItemAction` を `@/app/actions/actionItems` から import する
- [ ] Props 型を変更する:
  - `actionItems: ActionItem[]` の型参照を `@/domain/models/actionItem` の `ActionItem` に変更する
  - `orgUsers: { id: string; name: string }[]` を追加する（担当者セレクト用）
- [ ] `handleToggle` を書き換える: index ベースの JSON 書き換えを削除し、`toggleActionItemAction({ id: actionItems[idx].id })` を呼び出す
- [ ] `handleAdd` を書き換える: JSON 配列への追記と `updateMeetingAction` の呼び出しを削除し、`createActionItemAction({ description, assigneeId, dueDate, meetingId, dealId })` を呼び出す
- [ ] 担当者入力を自由テキストから `<select>` に変更する。`orgUsers` から選択肢を生成する。「未設定」の選択肢を先頭に追加する
- [ ] state 変数 `newAssignee` を `newAssigneeId` に rename する（string → string（UUID or ""））
- [ ] 表示部分の `item.assignee` を `orgUsers` で名前解決に変更する
- [ ] `item.dueDate`（`Date | null`）の表示を日付文字列にフォーマットする
- [ ] 各アイテムの `key` を `item.id` に変更する（index ベースから id ベースへ）
- [ ] `boundUpdateMeetingAction` の削除

**Acceptance Criteria**:
- MeetingActionItemsSection が `ActionItem[]`（`@/domain/models/actionItem`）を受け取る
- 追加が `createActionItemAction` 経由で動作する
- 完了切替が `toggleActionItemAction` 経由で動作する
- 担当者が自由テキストではなくセレクトボックスで選択できる
- `updateMeetingAction` への依存が削除されている

## T-08: meetings/[meetingId]/page.tsx のデータ取得を listActionItemsByMeeting に切り替える

- [ ] `listActionItemsByMeeting` を import する
- [ ] `listActionItemsByMeeting({ meetingId, organizationId })` を呼び出す（既存の `Promise.all` に追加するか、meeting 取得後に呼び出す）
- [ ] `MeetingActionItemsSection` に渡す `actionItems` を `meeting.actionItems`（JSON）から `listActionItemsByMeeting` の結果に変更する
- [ ] `MeetingActionItemsSection` に `orgUsers` を渡す（既に `users` として取得済みのデータを変換して渡す）

**Acceptance Criteria**:
- meetings/[meetingId]/page.tsx が `listActionItemsByMeeting` でアクションアイテムを取得する
- `meeting.actionItems`（JSON）が MeetingActionItemsSection に渡されなくなる
- `orgUsers` が MeetingActionItemsSection に渡される
- typecheck が通る

## T-09: typecheck とテストの最終確認

- [ ] `bun run build` を実行してビルドエラーがないことを確認する
- [ ] 型エラーがある場合は修正する（特に `DashboardActionItem` 型変更の影響箇所）
- [ ] 既存テストがある場合は実行して green であることを確認する

**Acceptance Criteria**:
- `bun run build` が成功する
- 全テストが green（テストが存在する場合）
