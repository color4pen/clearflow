# アクションアイテムの編集 UI・タスク一覧ページ・サイドバーメニュー追加

## Meta

- **type**: new-feature
- **slug**: action-items-full-ui
- **base-branch**: main
- **adr**: false

## 背景

AI-a/AI-b で action_items テーブルとUI切り替えを行ったが、現状は追加と完了切替しかできない。編集・削除の UI がなく、アクションアイテムを横断的に見る画面もない。

本リクエストでは編集・削除 UI の追加、タスク一覧ページの新設、サイドバーへのメニュー追加を行い、個人タスクの作成も可能にする。

## 現状コードの前提

- `src/app/actions/actionItems.ts` — createActionItemAction, toggleActionItemAction, updateActionItemAction, deleteActionItemAction が実装済み
- `src/app/(dashboard)/deals/[id]/DealActionItemsSection.tsx` — 追加フォームと完了切替のみ。編集・削除 UI なし
- `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingActionItemsSection.tsx` — 追加と完了切替のみ
- `src/app/(dashboard)/SidebarNav.tsx:13-22` — navItems にタスクメニューなし
- `src/infrastructure/repositories/actionItemRepository.ts` — findByOrganization(organizationId, filters) が done/assigneeId/dealId/meetingId でフィルタ可能
- `src/application/usecases/updateActionItem.ts` — description, assigneeId, dueDate の更新が実装済み
- `src/application/usecases/deleteActionItem.ts` — 削除が実装済み

## 要件

1. **タスク一覧ページの新設**: `/tasks/page.tsx` を新設する。自分の組織のアクションアイテムを一覧表示する
   - フィルタ: 完了/未完了のタブ切替（デフォルト: 未完了）
   - テーブル: 内容、担当者、期日、紐づけ先（案件名 or 商談日 or 引合名 or 「個人タスク」）、完了チェック
   - 完了切替: 行のチェックボックスで toggleActionItemAction を呼び出す
   - 新規作成ボタン: 個人タスク（紐づけ先なし）を作成できるフォーム。description（必須）、assigneeId（任意、デフォルト: 自分）、dueDate（任意）
2. **サイドバーに「タスク」メニュー追加**: SidebarNav の navItems に `{ href: "/tasks", label: "タスク" }` を追加する。「案件」と「契約」の間に配置する
3. **アクションアイテムの編集 UI**: DealActionItemsSection と MeetingActionItemsSection の各アクションアイテム行に「編集」ボタンを追加する。クリックでインライン編集モードに切り替わり、description / assigneeId / dueDate を編集できる。保存は updateActionItemAction を呼び出す
4. **アクションアイテムの削除 UI**: 各行に「削除」ボタンを追加する。確認ダイアログ（ConfirmDialog）を表示してから deleteActionItemAction を呼び出す
5. **タスク一覧ページでの編集・削除**: 一覧ページでも行ごとに編集・削除が可能

## スコープ外

- 引合詳細からのアクションアイテム追加
- リマインダー・優先度・カテゴリ
- ドラッグ&ドロップによる並び替え

## 受け入れ基準

- [ ] `/tasks` にタスク一覧ページが表示される
- [ ] サイドバーに「タスク」メニューが表示される
- [ ] 未完了/完了のフィルタ切替ができる
- [ ] タスク一覧から個人タスクを新規作成できる
- [ ] アクションアイテムの内容・担当者・期日を編集できる
- [ ] アクションアイテムを削除できる（確認ダイアログ付き）
- [ ] 紐づけ先（案件名・商談日・引合名・個人タスク）が表示される
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **インライン編集** — モーダルではなく行内で編集モードに切り替える。理由: アクションアイテムは短いテキストなのでインラインで十分。モーダルは過剰
2. **タスク一覧のデータ取得** — Server Component で actionItemRepository.findByOrganization を呼び出す。ただし page.tsx から repository を直接呼ばず、listActionItems ユースケースを新設する（F01a/F01b の方針に従う）
