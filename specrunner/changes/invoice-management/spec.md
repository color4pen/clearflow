# Spec: invoice-management

## Requirements

### Requirement: 請求ステータス遷移ルール

請求ステータスの遷移 SHALL follow fixed rules: `scheduled → invoiced`、`invoiced → paid`、`invoiced → overdue`。`paid` と `overdue` は終端状態であり、これらからの遷移 SHALL NOT be permitted。`scheduled` からは `invoiced` のみ許可し、`scheduled → paid` や `scheduled → overdue` は拒否する。

#### Scenario: scheduled から invoiced への遷移が許可される

**Given** 請求のステータスが `scheduled` である
**When** ステータスを `invoiced` に変更する
**Then** 遷移が成功し、`invoicedAt` に現在日時がセットされる

#### Scenario: invoiced から paid への遷移が許可される

**Given** 請求のステータスが `invoiced` である
**When** ステータスを `paid` に変更する
**Then** 遷移が成功し、`paidAt` に現在日時がセットされる

#### Scenario: invoiced から overdue への遷移が許可される

**Given** 請求のステータスが `invoiced` である
**When** ステータスを `overdue` に変更する
**Then** 遷移が成功する

#### Scenario: paid からの遷移が拒否される

**Given** 請求のステータスが `paid` である
**When** ステータスを `invoiced` に変更する
**Then** 遷移が拒否され、エラーが返される

#### Scenario: overdue からの遷移が拒否される

**Given** 請求のステータスが `overdue` である
**When** ステータスを `invoiced` に変更する
**Then** 遷移が拒否され、エラーが返される

#### Scenario: scheduled から paid への直接遷移が拒否される

**Given** 請求のステータスが `scheduled` である
**When** ステータスを `paid` に変更する
**Then** 遷移が拒否され、エラーが返される

### Requirement: one_time 契約での請求合計金額チェック

`createInvoice` は、対象契約が `one_time` の場合、既存請求の合計金額 + 新規請求金額が契約金額を超えないことを検証 SHALL する。契約金額（`contract.amount`）が null の場合はチェックをスキップする。`recurring` 契約では合計金額チェックをスキップ MUST する。

#### Scenario: one_time 契約で合計金額が契約金額以内の場合に請求が作成される

**Given** one_time 契約の金額が 3000 万円で、既存請求の合計が 1800 万円である
**When** 金額 1200 万円の請求を作成する
**Then** 請求が正常に作成される（合計 3000 万円 = 契約金額）

#### Scenario: one_time 契約で合計金額が契約金額を超える場合にエラーが返る

**Given** one_time 契約の金額が 3000 万円で、既存請求の合計が 1800 万円である
**When** 金額 1300 万円の請求を作成する
**Then** エラーが返され、請求は作成されない

#### Scenario: recurring 契約で合計金額チェックがスキップされる

**Given** recurring 契約に既存請求が存在する
**When** 任意の金額の請求を作成する
**Then** 合計金額チェックなしで請求が作成される

#### Scenario: one_time 契約で contract.amount が null の場合にチェックがスキップされる

**Given** one_time 契約の金額が null である
**When** 請求を作成する
**Then** 合計金額チェックなしで請求が作成される

### Requirement: 請求作成時に契約ステータスを検証

`createInvoice` は、対象契約のステータスが `active` であることを検証 SHALL する。`active` 以外の契約への請求作成は拒否する。

#### Scenario: active 契約への請求作成が許可される

**Given** 契約のステータスが `active` である
**When** 請求を作成する
**Then** 請求が正常に作成される

#### Scenario: completed 契約への請求作成が拒否される

**Given** 契約のステータスが `completed` である
**When** 請求を作成する
**Then** エラーが返され、請求は作成されない

### Requirement: 請求ステータス変更時の日時自動セット

`updateInvoiceStatus` は、`scheduled → invoiced` 遷移時に `invoicedAt` を現在日時に自動セット SHALL する。`invoiced → paid` 遷移時に `paidAt` を現在日時に自動セット SHALL する。

#### Scenario: invoiced 遷移時に invoicedAt がセットされる

**Given** 請求のステータスが `scheduled` で、`invoicedAt` が null である
**When** ステータスを `invoiced` に変更する
**Then** `invoicedAt` に現在日時がセットされる

#### Scenario: paid 遷移時に paidAt がセットされる

**Given** 請求のステータスが `invoiced` で、`paidAt` が null である
**When** ステータスを `paid` に変更する
**Then** `paidAt` に現在日時がセットされる

### Requirement: 請求操作の権限制御

請求の作成・ステータス変更は `admin` と `manager` ロールのみ許可 SHALL する。`member` ロールのユーザーは請求の閲覧のみ可能とする。

#### Scenario: admin が請求を作成できる

**Given** ユーザーのロールが `admin` である
**When** 請求を作成する
**Then** 請求が正常に作成される

#### Scenario: member が請求を作成しようとするとエラーになる

**Given** ユーザーのロールが `member` である
**When** 請求を作成する
**Then** 権限エラーが返される

### Requirement: テナント分離

全ての請求リポジトリクエリに `organizationId` 条件 MUST be included。異なるテナントの請求データにアクセスできてはならない。

#### Scenario: 自テナントの請求のみ取得される

**Given** テナント A に属する請求が 3 件、テナント B に属する請求が 2 件存在する
**When** テナント A のユーザーが契約に紐づく請求一覧を取得する
**Then** テナント A の請求 3 件のみが返される

### Requirement: 監査ログ記録

請求の作成・ステータス変更時に監査ログ MUST be recorded。アクション名は `invoice.create` および `invoice.update_status` とする。

#### Scenario: 請求作成時に監査ログが記録される

**Given** ユーザーが請求を作成する
**When** 請求作成が成功する
**Then** `action: "invoice.create"` の監査ログが記録される

#### Scenario: ステータス変更時に監査ログが記録される

**Given** ユーザーが請求ステータスを変更する
**When** ステータス変更が成功する
**Then** `action: "invoice.update_status"` の監査ログが記録される
