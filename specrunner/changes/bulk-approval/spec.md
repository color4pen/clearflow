# Spec: bulk-approval

## Requirements

### Requirement: bulkApprove usecase が複数 requestId を受け取り個別に承認する

bulkApprove usecase SHALL `requestIds: string[]` を受け取り、各 requestId に対して既存の `approveRequest` usecase を順次呼び出す。1件の失敗が他の申請の承認を阻止してはならない。

#### Scenario: 3件の pending 申請を一括承認する

**Given** requestId A, B, C の3件が pending 状態で存在する
**When** `bulkApprove({ requestIds: [A, B, C], actorId, actorRole: "manager", organizationId })` を呼び出す
**Then** 3件全てが承認され、results に `{ requestId: A, success: true }, { requestId: B, success: true }, { requestId: C, success: true }` が返る

#### Scenario: 2件目が失敗しても1件目と3件目は承認される

**Given** requestId A (pending), B (approved 済み), C (pending) の3件が存在する
**When** `bulkApprove({ requestIds: [A, B, C], actorId, actorRole: "manager", organizationId })` を呼び出す
**Then** A と C は承認され、B は `{ success: false, reason: "..." }` を返す。results の配列長は3で、入力順序と一致する

### Requirement: bulkApprove の結果型は BulkApproveResult に準拠する

bulkApprove usecase SHALL `{ results: Array<{ requestId: string, success: boolean, reason?: string }> }` 形式の結果を返す。

#### Scenario: 結果型の構造

**Given** 任意の requestIds を入力する
**When** bulkApprove を実行する
**Then** 返り値の `results` 配列の各要素は `requestId`, `success` を必須プロパティとして持ち、失敗時のみ `reason` が付与される

### Requirement: requestIds の上限は 20 件

bulkApproveAction SHALL requestIds が 21 件以上の場合にバリデーションエラーを返し、usecase を呼び出さない。

#### Scenario: 21件の requestIds でエラーになる

**Given** 21件の requestId 配列を用意する
**When** `bulkApproveAction` を呼び出す
**Then** `{ success: false, message: "一括承認は20件までです" }` が返り、いずれの申請も承認されない

#### Scenario: 20件の requestIds は受け付けられる

**Given** 20件の valid な requestId 配列を用意する
**When** `bulkApproveAction` を呼び出す
**Then** バリデーションエラーにならず、bulkApprove usecase が呼び出される

#### Scenario: 空配列はバリデーションエラーになる

**Given** 空の requestIds 配列を用意する
**When** `bulkApproveAction` を呼び出す
**Then** `{ success: false, message: "..." }` が返り、usecase は呼び出されない

### Requirement: bulkApproveAction は admin / manager / finance ロールのみ実行可能

bulkApproveAction SHALL member ロールのユーザーが呼び出した場合に `{ success: false, message: "権限がありません" }` を返す。

#### Scenario: member ロールで一括承認しようとする

**Given** session.user.role が "member" である
**When** `bulkApproveAction` を呼び出す
**Then** `{ success: false, message: "権限がありません" }` が返る

#### Scenario: manager ロールで一括承認する

**Given** session.user.role が "manager" である
**When** `bulkApproveAction` を呼び出す
**Then** ロールチェックを通過し、bulkApprove usecase が呼び出される

### Requirement: 一覧画面に pending 申請のみ選択可能なチェックボックスを表示する

申請一覧画面 SHALL pending 状態の申請行にのみチェックボックスを表示する。draft, approved, rejected, revision, expired 状態の申請にはチェックボックスを表示しない。

#### Scenario: pending 申請にチェックボックスが表示される

**Given** 申請一覧に pending 状態の申請が存在する
**When** 一覧画面を表示する
**Then** pending 状態の申請行にチェックボックスが表示される

#### Scenario: approved 申請にチェックボックスが表示されない

**Given** 申請一覧に approved 状態の申請が存在する
**When** 一覧画面を表示する
**Then** approved 状態の申請行にチェックボックスは表示されない

### Requirement: 一括承認ボタンは1件以上選択時のみ有効化される

一括承認ボタン SHALL チェックボックスが0件選択の場合は disabled 状態とする。

#### Scenario: 0件選択時にボタンが disabled

**Given** チェックボックスが1つも選択されていない
**When** 一括承認ボタンの状態を確認する
**Then** ボタンは disabled 属性を持つ

#### Scenario: 1件以上選択時にボタンが有効

**Given** 1件以上のチェックボックスが選択されている
**When** 一括承認ボタンの状態を確認する
**Then** ボタンは disabled 属性を持たない

### Requirement: 一括承認後に成功件数と失敗件数を表示する

一括承認完了後、結果 SHALL 成功件数と失敗件数（失敗理由含む）をユーザーに通知する。

#### Scenario: 全件成功

**Given** 3件の一括承認が全て成功した
**When** 結果を表示する
**Then** 「3件の承認が完了しました」の旨を表示する

#### Scenario: 一部失敗

**Given** 3件中1件が失敗した
**When** 結果を表示する
**Then** 「2件成功、1件失敗」の旨と失敗理由を表示する

### Requirement: 監査ログは個別に記録される

各申請の承認 SHALL 個別に audit_logs に記録される。bulkApprove usecase は既存の approveRequest 内の監査ログ記録をそのまま利用するため、追加実装は不要である。

#### Scenario: 3件の一括承認で3件の監査ログが生成される

**Given** 3件の requestId を一括承認する
**When** 一括承認が完了する
**Then** audit_logs に3件の `request.approve` または `approval_step.approve` アクションが記録される

### Requirement: Webhook は個別に配信される

各申請の承認 SHALL 個別に Webhook 配信される。bulkApprove usecase は既存の approveRequest 内の Webhook 配信をそのまま利用するため、追加実装は不要である。

#### Scenario: 3件の一括承認で3件の Webhook が配信される

**Given** 3件の requestId を一括承認する
**When** 一括承認が完了する
**Then** 各承認に対して個別に `request.approved` または `step.approved` Webhook イベントが配信される

### Requirement: 依存方向を遵守する

bulkApprove usecase SHALL `actions → usecases → domain / infrastructure` の依存方向を遵守する。bulkApprove usecase ファイルは domain および infrastructure からのみ import する。bulkApproveAction は usecase のみを呼び出す。

#### Scenario: bulkApprove.ts に actions 層からの import がない

**Given** `src/application/usecases/bulkApprove.ts` が存在する
**When** ファイルの import 文を検査する
**Then** `@/app/actions` からの import は存在しない
