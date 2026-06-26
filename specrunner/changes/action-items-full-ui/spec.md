# Spec: アクションアイテムの編集 UI・タスク一覧ページ・サイドバーメニュー追加

## Requirements

### Requirement: タスク一覧ページで組織のアクションアイテムを一覧表示できる

`/tasks` にアクセスした場合、ログインユーザーの組織に属するアクションアイテムが一覧表示される。一覧には内容、担当者名、期日、紐づけ先（案件名 / 商談日 / 引合名 / 「個人タスク」）、完了チェックが表示される。デフォルトでは未完了のアイテムのみ表示される。`listActionItems` ユースケース経由でデータを取得し、page.tsx から repository を直接呼び出してはならない（SHALL）。

#### Scenario: 未完了タスクのデフォルト表示

**Given** 組織に未完了のアクションアイテムが 3 件、完了済みが 2 件存在する
**When** ユーザーが `/tasks` にアクセスする
**Then** 未完了の 3 件が一覧に表示され、完了済みの 2 件は表示されない

#### Scenario: 完了タブへの切替

**Given** 組織に未完了のアクションアイテムが 3 件、完了済みが 2 件存在する
**When** ユーザーが完了タブをクリックする
**Then** 完了済みの 2 件が一覧に表示され、未完了の 3 件は表示されない

#### Scenario: 紐づけ先の表示

**Given** アクションアイテム A は案件「受託開発案件」に紐づき、アクションアイテム B は紐づけ先がない
**When** ユーザーがタスク一覧を閲覧する
**Then** A の紐づけ先列に「受託開発案件」が、B の紐づけ先列に「個人タスク」が表示される

### Requirement: タスク一覧ページから個人タスクを新規作成できる

タスク一覧ページに新規作成ボタンを配置し、紐づけ先なしの個人タスクを作成できるフォームを表示する。description（必須）、assigneeId（任意、デフォルト: 自分）、dueDate（任意）を入力でき、`createActionItemAction` を呼び出す。作成後はページが再表示される（SHALL）。

#### Scenario: 個人タスクの作成

**Given** ユーザーがタスク一覧ページを開いている
**When** ユーザーが新規作成ボタンを押し、description に「議事録を書く」と入力して追加ボタンを押す
**Then** 紐づけ先なしのアクションアイテムが作成され、タスク一覧に「議事録を書く」が表示される

### Requirement: サイドバーに「タスク」メニューが表示される

SidebarNav の navItems に `{ href: "/tasks", label: "タスク" }` を追加する。「案件」と「契約」の間に配置する（SHALL）。

#### Scenario: サイドバーにタスクリンクが表示される

**Given** ユーザーがダッシュボードにログインしている
**When** サイドバーが表示される
**Then** 「案件」の次、「契約」の前に「タスク」メニューが表示され、クリックで `/tasks` に遷移する

### Requirement: アクションアイテムをインライン編集できる

DealActionItemsSection、MeetingActionItemsSection、タスク一覧ページの各アクションアイテム行に「編集」ボタンを表示する。クリックで行がインライン編集モードに切り替わり、description / assigneeId / dueDate を編集できる。保存ボタンで `updateActionItemAction` を呼び出す（SHALL）。キャンセルボタンで編集モードを解除する。

#### Scenario: インライン編集の実行

**Given** アクションアイテム「見積書作成」が表示されている
**When** ユーザーが「編集」ボタンを押し、description を「見積書送付」に変更して「保存」を押す
**Then** `updateActionItemAction` が呼び出され、表示が「見積書送付」に更新される

#### Scenario: 編集のキャンセル

**Given** アクションアイテム「見積書作成」が編集モードになっている
**When** ユーザーが「キャンセル」ボタンを押す
**Then** 編集モードが解除され、「見積書作成」が元の表示に戻る

### Requirement: アクションアイテムを確認ダイアログ付きで削除できる

各アクションアイテム行に「削除」ボタンを表示する。ボタン押下で ConfirmDialog が表示され、確認後に `deleteActionItemAction` を呼び出す（SHALL）。キャンセルでダイアログを閉じる。

#### Scenario: 削除の実行

**Given** アクションアイテム「見積書作成」が表示されている
**When** ユーザーが「削除」ボタンを押し、確認ダイアログで「削除」を押す
**Then** `deleteActionItemAction` が呼び出され、アクションアイテムが一覧から消える

#### Scenario: 削除のキャンセル

**Given** 削除確認ダイアログが表示されている
**When** ユーザーが「キャンセル」を押す
**Then** ダイアログが閉じ、アクションアイテムは削除されない

### Requirement: Server Actions が /tasks パスを revalidate する

`actionItems.ts` の createActionItemAction、toggleActionItemAction、updateActionItemAction、deleteActionItemAction は、処理成功時に `revalidatePath("/tasks")` を呼び出す（SHALL）。これにより、他のページでの操作がタスク一覧に反映される。

#### Scenario: 案件詳細から追加したアクションアイテムがタスク一覧に反映される

**Given** ユーザーが案件詳細ページでアクションアイテムを追加した
**When** ユーザーがタスク一覧ページに遷移する
**Then** 追加したアクションアイテムがタスク一覧に表示される
