# Spec: 契約・請求の楽観的ロック

## Requirements

### Requirement: contracts テーブルは version カラムを持つ

contracts テーブルの schema 定義 SHALL `version integer NOT NULL DEFAULT 1` カラムを含む。差分マイグレーションにより既存行に version = 1 が付与される。

#### Scenario: 既存の contracts 行に version が付与される

**Given** contracts テーブルに version カラムが存在しない既存行がある
**When** マイグレーションが適用される
**Then** 既存の全 contracts 行の version は 1 である

### Requirement: invoices テーブルは version カラムを持つ

invoices テーブルの schema 定義 SHALL `version integer NOT NULL DEFAULT 1` カラムを含む。差分マイグレーションにより既存行に version = 1 が付与される。

#### Scenario: 既存の invoices 行に version が付与される

**Given** invoices テーブルに version カラムが存在しない既存行がある
**When** マイグレーションが適用される
**Then** 既存の全 invoices 行の version は 1 である

### Requirement: Contract 型は version フィールドを持つ

Contract ドメインモデル型 SHALL `version: number` フィールドを含む。

#### Scenario: Contract 型に version がある

**Given** Contract 型の定義
**When** version フィールドを参照する
**Then** `version: number` が存在する

### Requirement: Invoice 型は version フィールドを持つ

Invoice ドメインモデル型 SHALL `version: number` フィールドを含む。

#### Scenario: Invoice 型に version がある

**Given** Invoice 型の定義
**When** version フィールドを参照する
**Then** `version: number` が存在する

### Requirement: contractRepository.update は楽観的ロックを適用する

contractRepository.update SHALL WHERE 条件に `version = expectedVersion` を含み、SET で `version + 1` する。更新行数が 0 の場合は null を返す。

#### Scenario: version 一致で更新が成功する

**Given** contracts テーブルに id=X, version=3 の行が存在する
**When** contractRepository.update(X, orgId, data, expectedVersion=3, tx) が呼ばれる
**Then** 行が更新され、version=4 の Contract が返される

#### Scenario: version 不一致で更新が拒否される

**Given** contracts テーブルに id=X, version=4 の行が存在する
**When** contractRepository.update(X, orgId, data, expectedVersion=3, tx) が呼ばれる
**Then** 更新行数は 0 であり、null が返される

### Requirement: invoiceRepository.update は楽観的ロックを適用する

invoiceRepository.update SHALL WHERE 条件に `version = expectedVersion` を含み、SET で `version + 1` する。更新行数が 0 の場合は null を返す。

#### Scenario: version 一致で更新が成功する

**Given** invoices テーブルに id=Y, version=2 の行が存在する
**When** invoiceRepository.update(Y, orgId, data, expectedVersion=2, tx) が呼ばれる
**Then** 行が更新され、version=3 の Invoice が返される

#### Scenario: version 不一致で更新が拒否される

**Given** invoices テーブルに id=Y, version=3 の行が存在する
**When** invoiceRepository.update(Y, orgId, data, expectedVersion=2, tx) が呼ばれる
**Then** 更新行数は 0 であり、null が返される

### Requirement: invoiceRepository.updateStatus は楽観的ロックを適用する

invoiceRepository.updateStatus SHALL WHERE 条件に `version = expectedVersion` を含み、SET で `version + 1` する。更新行数が 0 の場合は null を返す。

#### Scenario: version 一致でステータス更新が成功する

**Given** invoices テーブルに id=Z, version=1 の行が存在する
**When** invoiceRepository.updateStatus(Z, orgId, "invoiced", expectedVersion=1, {}, tx) が呼ばれる
**Then** 行が更新され、version=2 の Invoice が返される

#### Scenario: version 不一致でステータス更新が拒否される

**Given** invoices テーブルに id=Z, version=2 の行が存在する
**When** invoiceRepository.updateStatus(Z, orgId, "paid", expectedVersion=1, {}, tx) が呼ばれる
**Then** 更新行数は 0 であり、null が返される

### Requirement: updateContract usecase はロック失敗時に統一メッセージを返す

updateContract usecase SHALL エンティティ取得時の version を保持し、contractRepository.update に渡す。update が null を返した場合、`{ ok: false, reason: "この契約は他のユーザーによって更新されました。画面を更新してください" }` を返す MUST。

#### Scenario: 楽観的ロック失敗で契約更新が拒否される

**Given** contracts テーブルに id=X, version=3 の行が存在し、usecase が findById で version=3 を取得した
**When** 別のユーザーが先に version=3 → 4 に更新し、元のユーザーの updateContract が実行される
**Then** `{ ok: false, reason: "この契約は他のユーザーによって更新されました。画面を更新してください" }` が返される

### Requirement: updateContractStatus usecase はロック失敗時に統一メッセージを返す

updateContractStatus usecase SHALL エンティティ取得時の version を保持し、contractRepository.update に渡す。update が null を返した場合、`{ ok: false, reason: "この契約は他のユーザーによって更新されました。画面を更新してください" }` を返す MUST。

#### Scenario: 楽観的ロック失敗で契約ステータス更新が拒否される

**Given** contracts テーブルに id=X, version=5 の行が存在し、usecase が findById で version=5 を取得した
**When** 別のユーザーが先に version を更新し、元のユーザーの updateContractStatus が実行される
**Then** `{ ok: false, reason: "この契約は他のユーザーによって更新されました。画面を更新してください" }` が返される

### Requirement: updateInvoice usecase はロック失敗時に統一メッセージを返す

updateInvoice usecase SHALL エンティティ取得時の version を保持し、invoiceRepository.update に渡す。update が null を返した場合、`{ ok: false, reason: "この請求は他のユーザーによって更新されました。画面を更新してください" }` を返す MUST。

#### Scenario: 楽観的ロック失敗で請求更新が拒否される

**Given** invoices テーブルに id=Y, version=2 の行が存在し、usecase が findById で version=2 を取得した
**When** 別のユーザーが先に version を更新し、元のユーザーの updateInvoice が実行される
**Then** `{ ok: false, reason: "この請求は他のユーザーによって更新されました。画面を更新してください" }` が返される

### Requirement: updateInvoiceStatus usecase はロック失敗時に統一メッセージを返す

updateInvoiceStatus usecase SHALL エンティティ取得時の version を保持し、invoiceRepository.updateStatus に渡す。updateStatus が null を返した場合、`{ ok: false, reason: "この請求は他のユーザーによって更新されました。画面を更新してください" }` を返す MUST。

#### Scenario: 楽観的ロック失敗で請求ステータス更新が拒否される

**Given** invoices テーブルに id=Z, version=1 の行が存在し、usecase が findById で version=1 を取得した
**When** 別のユーザーが先に version を更新し、元のユーザーの updateInvoiceStatus が実行される
**Then** `{ ok: false, reason: "この請求は他のユーザーによって更新されました。画面を更新してください" }` が返される

### Requirement: 契約・請求の作成時に version は 1 で始まる

contractRepository.create / invoiceRepository.create で作成されたエンティティの version SHALL 1 である。

#### Scenario: 新規契約の version が 1 である

**Given** 契約が存在しない
**When** contractRepository.create が呼ばれる
**Then** 返された Contract の version は 1 である

#### Scenario: 新規請求の version が 1 である

**Given** 請求が存在しない
**When** invoiceRepository.create が呼ばれる
**Then** 返された Invoice の version は 1 である
