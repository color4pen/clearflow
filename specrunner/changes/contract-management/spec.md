# Spec: 契約管理

## Requirements

### Requirement: Contract 作成は Deal が won フェーズの場合のみ許可する

createContract usecase は、指定された Deal の phase が `won` でない場合にエラーを返さなければならない（SHALL）。

#### Scenario: won フェーズの Deal に対して Contract を作成する

**Given** Deal の phase が `won` であり、その Deal に Contract が存在しない
**When** admin が `createContract` を実行する
**Then** Contract が作成され、Deal の title, contractType, estimatedAmount, estimatedStartDate, estimatedEndDate, clientId が初期値として引き継がれる

#### Scenario: negotiation フェーズの Deal に対して Contract を作成しようとする

**Given** Deal の phase が `negotiation` である
**When** admin が `createContract` を実行する
**Then** エラーメッセージが返り、Contract は作成されない

---

### Requirement: 同一 Deal に対して2件目の Contract を作成できない

createContract usecase は、指定された Deal に既に Contract が存在する場合にエラーを返さなければならない（MUST）。

#### Scenario: 既に Contract が存在する Deal に対して2件目を作成しようとする

**Given** Deal A（phase: won）に Contract が1件存在する
**When** admin が Deal A に対して `createContract` を実行する
**Then** エラーメッセージが返り、2件目の Contract は作成されない

---

### Requirement: Contract ステータス遷移は active からのみ許可する

updateContractStatus usecase は、`active` → `completed` と `active` → `cancelled` の遷移のみを許可しなければならない（SHALL）。`completed` と `cancelled` は終端状態であり、これらからの遷移は拒否する。

#### Scenario: active から completed への遷移

**Given** Contract の status が `active` である
**When** admin が status を `completed` に変更する
**Then** Contract の status が `completed` に更新され、`contract.updateStatus` の監査ログが記録される

#### Scenario: active から cancelled への遷移

**Given** Contract の status が `active` である
**When** admin が status を `cancelled` に変更する
**Then** Contract の status が `cancelled` に更新され、`contract.updateStatus` の監査ログが記録される

#### Scenario: completed から active への遷移が拒否される

**Given** Contract の status が `completed` である
**When** admin が status を `active` に変更しようとする
**Then** エラーメッセージが返り、status は変更されない

#### Scenario: cancelled から active への遷移が拒否される

**Given** Contract の status が `cancelled` である
**When** admin が status を `active` に変更しようとする
**Then** エラーメッセージが返り、status は変更されない

---

### Requirement: 契約操作は admin または manager ロールのみ実行可能

契約の作成・更新・ステータス変更の Server Action は、セッションユーザーのロールが `admin` または `manager` でない場合にエラーを返さなければならない（SHALL）。一覧取得と詳細取得は全ロールに公開する。

#### Scenario: admin が契約を作成する

**Given** ログインユーザーのロールが `admin` である
**When** `createContractAction` を実行する
**Then** 契約が作成され、成功レスポンスが返る

#### Scenario: member が契約を作成しようとする

**Given** ログインユーザーのロールが `member` である
**When** `createContractAction` を実行する
**Then** エラーメッセージ「権限がありません」が返り、契約は作成されない

#### Scenario: member が契約一覧を取得する

**Given** ログインユーザーのロールが `member` である
**When** `listContractsAction` を実行する
**Then** 自組織の契約一覧が返る

---

### Requirement: テナント分離 — 全クエリに organizationId 条件を付与する

contractRepository の全メソッドは organizationId をパラメータに含み、WHERE 条件に organizationId を付与しなければならない（SHALL）。organizationId はセッションから取得し、リクエストボディから受け取ってはならない。

#### Scenario: 契約一覧が自組織のみ返る

**Given** 組織 A の契約が 2 件、組織 B の契約が 3 件存在する
**When** 組織 A のユーザーが `listContracts(orgA.id)` を呼び出す
**Then** 組織 A の 2 件のみが返る

---

### Requirement: 監査ログの記録

契約の作成・更新・ステータス変更は、同一トランザクション内で audit_logs に記録しなければならない（MUST）。

#### Scenario: 契約作成時に監査ログが記録される

**Given** admin が契約を作成する
**When** `createContract` usecase がトランザクションを完了する
**Then** `action='contract.create'`, `targetType='contract'`, `targetId=新契約ID` の監査ログが同一トランザクション内で記録される

#### Scenario: 契約更新時に監査ログが記録される

**Given** admin が契約を更新する
**When** `updateContract` usecase がトランザクションを完了する
**Then** `action='contract.update'`, `targetType='contract'`, `targetId=契約ID` の監査ログが同一トランザクション内で記録される

#### Scenario: ステータス変更時に監査ログが記録される

**Given** admin が契約ステータスを変更する
**When** `updateContractStatus` usecase がトランザクションを完了する
**Then** `action='contract.updateStatus'`, `targetType='contract'` の監査ログが記録され、metadata に変更前後のステータスが含まれる

---

### Requirement: 案件詳細ページに契約セクションを表示する

案件詳細ページ（`/deals/[id]`）は、Deal の phase が `won` の場合に契約セクションを表示しなければならない（SHALL）。契約未作成の場合は「契約を作成」ボタン、契約が存在する場合は契約へのリンクを表示する。

#### Scenario: won フェーズで契約未作成の場合

**Given** Deal の phase が `won` であり、Contract が存在しない
**When** 案件詳細ページを表示する
**Then** 「契約を作成」ボタンが表示される

#### Scenario: won フェーズで契約が存在する場合

**Given** Deal の phase が `won` であり、Contract が存在する
**When** 案件詳細ページを表示する
**Then** 契約詳細ページへのリンクが表示される

#### Scenario: negotiation フェーズの場合

**Given** Deal の phase が `negotiation` である
**When** 案件詳細ページを表示する
**Then** 契約セクションは表示されない
