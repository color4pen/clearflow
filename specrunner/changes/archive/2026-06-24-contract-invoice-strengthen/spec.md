# Spec: 契約・請求モデルの強化

## Requirements

### Requirement: 契約金額は正の整数でなければならない

契約の作成時および更新時に `amount` が指定される場合、システム SHALL `amount > 0` を検証し、0 以下の値を拒否すること。

#### Scenario: 契約作成時に amount = 0 がバリデーションエラーになる

**Given** 受注済みの案件が存在する
**When** amount = 0 で契約を作成する
**Then** バリデーションエラーが返され、契約は作成されない

#### Scenario: 契約作成時に amount = -1 がバリデーションエラーになる

**Given** 受注済みの案件が存在する
**When** amount = -1 で契約を作成する
**Then** バリデーションエラーが返され、契約は作成されない

#### Scenario: 契約更新時に amount を 0 に変更するとバリデーションエラーになる

**Given** amount = 100000 の契約が存在する
**When** amount = 0 に更新する
**Then** バリデーションエラーが返され、契約は更新されない

#### Scenario: 契約更新時に amount を含まない更新はバリデーションをスキップする

**Given** マイグレーションで amount = 0 が設定された契約が存在する
**When** title のみを更新する（amount フィールドを指定しない）
**Then** 更新が成功する（amount の > 0 チェックは実施されない）

### Requirement: 契約の開始日は終了日以前でなければならない

契約の作成時および更新時に `startDate` と `endDate` の両方が存在する場合、システム SHALL `startDate <= endDate` を検証すること。`endDate` が null（未設定）の場合、この検証はスキップされる。

#### Scenario: 契約作成時に startDate > endDate がバリデーションエラーになる

**Given** 受注済みの案件が存在する
**When** startDate = 2026-07-01, endDate = 2026-06-01 で契約を作成する
**Then** バリデーションエラーが返され、契約は作成されない

#### Scenario: 契約作成時に startDate = endDate が許容される

**Given** 受注済みの案件が存在する
**When** startDate = 2026-07-01, endDate = 2026-07-01 で契約を作成する
**Then** 契約が正常に作成される

#### Scenario: endDate が null の場合は startDate の検証をスキップする

**Given** 受注済みの案件が存在する
**When** startDate = 2026-07-01, endDate = null で契約を作成する
**Then** 契約が正常に作成される

#### Scenario: 契約更新時に startDate > endDate がバリデーションエラーになる

**Given** startDate = 2026-01-01, endDate = 2026-12-31 の契約が存在する
**When** startDate = 2027-01-01 に更新する（endDate は変更しない）
**Then** バリデーションエラーが返され、契約は更新されない

### Requirement: 請求予定日は支払期限以前でなければならない

請求の作成時および更新時に `issueDate` と `dueDate` の両方が存在する場合、システム SHALL `issueDate <= dueDate` を検証すること。`issueDate` が null の場合、この検証はスキップされる。

#### Scenario: 請求作成時に issueDate > dueDate がバリデーションエラーになる

**Given** 有効な契約が存在する
**When** issueDate = 2026-08-01, dueDate = 2026-07-01 で請求を作成する
**Then** バリデーションエラーが返され、請求は作成されない

#### Scenario: 請求作成時に issueDate = dueDate が許容される

**Given** 有効な契約が存在する
**When** issueDate = 2026-07-01, dueDate = 2026-07-01 で請求を作成する
**Then** 請求が正常に作成される

#### Scenario: issueDate が null の場合は日付検証をスキップする

**Given** 有効な契約が存在する
**When** issueDate = null, dueDate = 2026-07-01 で請求を作成する
**Then** 請求が正常に作成される

### Requirement: 単発契約の請求金額合計チェックは請求更新時にも適用される

単発（one_time）契約の場合、請求の金額更新時にもシステム SHALL 全請求金額の合計が契約金額を超えないことを検証すること。合計チェックは SERIALIZABLE 分離レベルのトランザクション内で実行される。

#### Scenario: 請求金額を増額して合計が契約金額を超えるとエラーになる

**Given** amount = 100000 の単発契約に、amount = 60000 と amount = 30000 の 2 つの請求が存在する
**When** amount = 30000 の請求を amount = 50000 に更新する
**Then** バリデーションエラーが返される（合計 110000 > 契約金額 100000）

#### Scenario: 請求金額を増額しても合計が契約金額以内なら成功する

**Given** amount = 100000 の単発契約に、amount = 40000 と amount = 30000 の 2 つの請求が存在する
**When** amount = 30000 の請求を amount = 50000 に更新する
**Then** 更新が成功する（合計 90000 ≤ 契約金額 100000）

#### Scenario: 定期契約の請求金額更新は合計チェックをスキップする

**Given** amount = 100000 の定期契約（recurring）に請求が存在する
**When** 請求の金額を任意の値に更新する
**Then** 合計チェックなしで更新が成功する

### Requirement: issueDate は請求予定日として機能し invoicedAt とは独立する

`issueDate` は請求予定日（事前設定可能）であり、`invoicedAt` は発行処理の実行日時（ステータス遷移時に自動記録）である。システム SHALL 両フィールドを独立して管理すること。

#### Scenario: 請求作成時に issueDate を設定できる

**Given** 有効な契約が存在する
**When** issueDate = 2026-07-15 を指定して請求を作成する
**Then** 請求の issueDate が 2026-07-15 に設定され、invoicedAt は null のまま

#### Scenario: ステータスを invoiced に変更すると invoicedAt が記録されるが issueDate は変更されない

**Given** issueDate = 2026-07-15 の scheduled 請求が存在する
**When** ステータスを invoiced に変更する
**Then** invoicedAt に現在日時が記録され、issueDate は 2026-07-15 のまま変更されない

### Requirement: 既存データのマイグレーションが安全に完了する

マイグレーション MUST 既存の null データにデフォルト値を設定してから NOT NULL 制約を追加すること。

#### Scenario: contracts.amount が null の既存レコードが 0 に設定される

**Given** contracts.amount が null のレコードが存在する
**When** マイグレーションを実行する
**Then** amount が 0 に設定され、NOT NULL 制約が追加される

#### Scenario: contracts.start_date が null の既存レコードが created_at に設定される

**Given** contracts.start_date が null のレコードが存在する
**When** マイグレーションを実行する
**Then** start_date が created_at の値に設定され、NOT NULL 制約が追加される

#### Scenario: invoices.due_date が null の既存レコードにデフォルト値が設定される

**Given** invoices.due_date が null のレコードが存在する
**When** マイグレーションを実行する
**Then** due_date が created_at + 30 日に設定され、NOT NULL 制約が追加される

#### Scenario: invoices テーブルに issue_date カラムが追加される

**Given** invoices テーブルに issue_date カラムが存在しない
**When** マイグレーションを実行する
**Then** issue_date（nullable timestamp）カラムが追加される
