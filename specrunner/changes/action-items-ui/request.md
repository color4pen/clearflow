# アクションアイテム UI の action_items テーブル切り替え

## Meta

- **type**: spec-change
- **slug**: action-items-ui
- **base-branch**: main
- **adr**: false

## 背景

AI-a（PR #104）で action_items テーブル、モデル、リポジトリ、ユースケース、サーバーアクションを新設した。本リクエストでは UI コンポーネントを meetings.action_items の JSON 操作から action_items テーブル（リポジトリ経由）に切り替える。

## 現状コードの前提

- `src/app/(dashboard)/deals/[id]/DealActionItemsSection.tsx` — 全商談の actionItems JSON を展開して表示。完了切替は meetings の actionItems JSON を丸ごと更新する formData.set("actionItems", JSON.stringify(...))
- `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingActionItemsSection.tsx` — 商談の actionItems JSON を操作。追加・完了切替とも JSON 全体を書き換え
- `src/application/usecases/getDashboardActions.ts:43-50` — 全 Meeting を取得し meeting.actionItems をループして未完了アクションを集約
- `src/app/actions/actionItems.ts` — AI-a で新設済み。createActionItemAction, toggleActionItemAction, updateActionItemAction, deleteActionItemAction が実装済み
- `src/application/usecases/listActionItemsByDeal.ts` — AI-a で新設済み
- `src/application/usecases/listActionItemsByMeeting.ts` — AI-a で新設済み
- `src/infrastructure/repositories/actionItemRepository.ts` — AI-a で新設済み。findByOrganization(filters) が done/assigneeId/dealId/meetingId でフィルタ可能

## 要件

1. **DealActionItemsSection の切り替え**: 全商談の actionItems JSON 走査を `listActionItemsByDeal(dealId, organizationId)` に変更する。完了切替は `toggleActionItemAction(actionItemId)` を呼び出す。案件詳細ページ（deals/[id]/page.tsx）で listActionItemsByDeal を呼び出してデータを渡す
2. **MeetingActionItemsSection の切り替え**: actionItems JSON 操作を削除する。追加は `createActionItemAction` を呼び出す（meetingId と dealId を自動設定）。完了切替は `toggleActionItemAction` を呼び出す。商談詳細ページ（meetings/[meetingId]/page.tsx）で listActionItemsByMeeting を呼び出してデータを渡す
3. **getDashboardActions の切り替え**: Meeting のループによるアクションアイテム集約を `actionItemRepository.findByOrganization({ done: false })` に変更する。DashboardActionItem の action_item タイプの型を ActionItem モデルに合わせる（dealId を nullable に、assignee を assigneeId に）
4. **SalesDashboard の表示更新**: DashboardActionItem の型変更に合わせて、アクション待ちリストの表示を更新する。dealId が null の場合はリンクを非表示にする。assigneeId からユーザー名を解決して表示する
5. **案件詳細のアクションアイテム追加フォーム**: 商談に紐づかないアクションアイテムを案件から直接追加できるフォームを DealActionItemsSection に追加する（description, assigneeId, dueDate の入力。createActionItemAction に dealId を渡す）

## スコープ外

- meetings.action_items カラムの削除
- meetings の updateMeetingAction 内の actionItems JSON 処理の削除（後方互換で残す）
- 引合詳細からのアクションアイテム追加
- 個人タスク管理画面

## 受け入れ基準

- [ ] DealActionItemsSection が action_items テーブルからデータを取得する
- [ ] MeetingActionItemsSection が action_items テーブルにデータを読み書きする
- [ ] ダッシュボードのアクション待ちが action_items テーブルから取得される
- [ ] 案件詳細から商談に紐づかないアクションアイテムを追加できる
- [ ] 完了切替が toggleActionItemAction 経由で動作する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **JSON 処理は残す** — updateMeetingAction 内の actionItems JSON 処理は後方互換のため残す。新規の読み書きは全て action_items テーブル経由にする。JSON カラムの削除は別リクエストで対応
