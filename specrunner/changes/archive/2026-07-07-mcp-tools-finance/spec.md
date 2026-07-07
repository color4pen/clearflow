# Spec: MCP ツール — 経理系（契約・請求・売上）

## Requirements

### Requirement: contracts ツールは契約の CRUD・ステータス遷移をサポートする

contracts ツール SHALL `list` / `get` / `create` / `update` / `update_status` / `delete` の 6 operation を提供する。各 operation は対応する既存 usecase を呼び出す。

#### Scenario: 契約一覧の取得

**Given** 有効なトークン（contract.list 権限あり）で MCP ツールを呼び出す
**When** contracts ツールに `operation: "list"` を指定して呼び出す
**Then** `listContracts` usecase が organizationId（authInfo 由来）で呼ばれ、`ContractWithClient[]` が返る

#### Scenario: 契約詳細の取得

**Given** 有効なトークン（contract.view 権限あり）で MCP ツールを呼び出す
**When** contracts ツールに `operation: "get"`, `contractId` を指定して呼び出す
**Then** `getContract` usecase が contractId と organizationId で呼ばれ、契約データ（version 含む）が返る

#### Scenario: 契約の作成（正常系）

**Given** 有効なトークン（contract.create 権限あり）で MCP ツールを呼び出す
**When** contracts ツールに `operation: "create"`, `dealId`, `amount`, `startDate` を指定して呼び出す
**Then** `createContract` usecase が呼ばれ、新しい契約が返る

#### Scenario: won でない案件への契約作成が拒否される

**Given** 有効なトークン（contract.create 権限あり）で MCP ツールを呼び出す
**When** contracts ツールに `operation: "create"` で won 以外の案件の `dealId` を指定する
**Then** usecase が `{ ok: false, reason: "受注済みの案件にのみ契約を作成できます" }` を返し、ツール結果が `isError: true` になる

#### Scenario: 契約のステータス更新

**Given** 有効なトークン（contract.changeStatus 権限あり）で MCP ツールを呼び出す
**When** contracts ツールに `operation: "update_status"`, `contractId`, `newStatus` を指定する
**Then** `updateContractStatus` usecase が呼ばれ、ステータスが更新される

#### Scenario: 契約の削除

**Given** 有効なトークン（contract.delete 権限あり）で MCP ツールを呼び出す
**When** contracts ツールに `operation: "delete"`, `contractId` を指定する
**Then** `deleteContract` usecase が呼ばれ、成功結果が返る

### Requirement: contracts ツールの update は部分更新と楽観的ロックをサポートする

contracts の update SHALL 省略フィールドを「変更なし」として扱い、既存値を破壊しない MUST。`null` は「クリア」を意味する。version 不一致時はツールエラーを返す。

#### Scenario: title のみ更新する

**Given** 既存の契約が存在する
**When** `operation: "update"` で `title` のみ指定する
**Then** title だけが更新され、他のフィールド（amount, startDate, endDate 等）は変更されない

#### Scenario: version 不一致で衝突エラーが返る

**Given** 契約が他のユーザーによって更新された（version が進んだ）
**When** `operation: "update"` を呼ぶ
**Then** usecase が version 不一致を検出し、ツール結果が `isError: true` で再取得を促すメッセージが返る

### Requirement: invoices ツールは請求の CRUD・ステータス遷移をサポートする

invoices ツール SHALL `list` / `create` / `update` / `update_status` の 4 operation を提供する。

#### Scenario: 契約別の請求一覧

**Given** 有効なトークン（invoice.list 権限あり）で MCP ツールを呼び出す
**When** invoices ツールに `operation: "list"`, `contractId` を指定する
**Then** `listInvoicesByContract` usecase が contractId と organizationId で呼ばれる

#### Scenario: 組織全体の請求一覧（フィルタあり）

**Given** 有効なトークン（invoice.list 権限あり）で MCP ツールを呼び出す
**When** invoices ツールに `operation: "list"` で contractId を指定せず、`status: "overdue"` を指定する
**Then** `listInvoicesByOrganization` usecase が organizationId と status フィルタで呼ばれる

#### Scenario: 請求の作成

**Given** 有効なトークン（invoice.create 権限あり）で MCP ツールを呼び出す
**When** invoices ツールに `operation: "create"`, `contractId`, `title`, `amount`, `dueDate` を指定する
**Then** `createInvoice` usecase が呼ばれ、新しい請求が返る

### Requirement: 未発行請求の入金記録が拒否される

invoices の update_status SHALL 遷移ルール `validateInvoiceTransition` に従い、scheduled → paid のような不正遷移を拒否する MUST。

#### Scenario: scheduled から paid への遷移が拒否される

**Given** ステータスが `scheduled` の請求が存在する
**When** `operation: "update_status"` で `newStatus: "paid"` を指定する
**Then** usecase が `{ ok: false }` を返し、ツール結果が `isError: true` になる（invoiced を経由する必要がある）

#### Scenario: invoiced から paid への遷移が成功する

**Given** ステータスが `invoiced` の請求が存在する
**When** `operation: "update_status"` で `newStatus: "paid"`, `paidAt: "2026-07-01"` を指定する
**Then** `updateInvoiceStatus` usecase が paidAt を含む引数で呼ばれ、ステータスが更新される

### Requirement: 入金記録に入金日が必要な場合のバリデーション

update_status で `newStatus: "paid"` の場合、`paidAt` は MCP ツールレイヤーでは optional とし、usecase のデフォルト動作（paidAt 未指定時は現在日時）に委ねる SHALL。ただし paidAt が指定された場合は `YYYY-MM-DD` 形式の文字列で受け取り Date に変換する。`paidAt` が指定された場合、MCP ツールレイヤーで本日以前（JST）の日付であることを検証する MUST。将来日付の入金記録は Server Action と同様に拒否する。

#### Scenario: paidAt 指定ありで入金記録

**Given** invoiced 状態の請求がある
**When** `operation: "update_status"`, `newStatus: "paid"`, `paidAt: "2026-06-30"` を指定する
**Then** usecase に `paidAt: new Date("2026-06-30")` が渡される

#### Scenario: paidAt 未指定で入金記録

**Given** invoiced 状態の請求がある
**When** `operation: "update_status"`, `newStatus: "paid"` で paidAt を省略する
**Then** usecase に paidAt が渡されず、usecase のデフォルト動作（現在日時）が適用される

#### Scenario: 将来日付の paidAt が拒否される

**Given** invoiced 状態の請求がある
**When** `operation: "update_status"`, `newStatus: "paid"`, `paidAt: "2099-12-31"` を指定する
**Then** MCP ツールレイヤーで `isError: true` となり、`updateInvoiceStatus` usecase は呼ばれない

### Requirement: invoices ツールの update は部分更新と楽観的ロックをサポートする

invoices の update SHALL 省略フィールドを「変更なし」として扱う MUST。version 不一致時はツールエラーを返す。

#### Scenario: amount のみ更新する

**Given** 既存の請求が存在する
**When** `operation: "update"` で `amount` のみ指定する
**Then** amount だけが更新され、他のフィールド（title, dueDate 等）は変更されない

#### Scenario: version 不一致で衝突エラーが返る

**Given** 請求が他のユーザーによって更新された（version が進んだ）
**When** `operation: "update"` を呼ぶ
**Then** usecase が version 不一致を検出し、ツール結果が `isError: true` で返る

### Requirement: revenue ツールは売上の読み取り専用クエリをサポートする

revenue ツール SHALL `dashboard` / `details` / `forecast` の 3 operation を提供する MUST。全て読み取り専用で、書き込み操作は含まない。

#### Scenario: 売上ダッシュボードの取得

**Given** 有効なトークン（revenue.view 権限あり）で MCP ツールを呼び出す
**When** revenue ツールに `operation: "dashboard"` を指定する
**Then** `getRevenueDashboard` usecase が organizationId で呼ばれ、currentMonthRevenue / confirmedRevenue / monthlyTrend / pipelineSummary / topCustomers が返る

#### Scenario: 売上明細の取得（顧客別）

**Given** 有効なトークンで MCP ツールを呼び出す
**When** revenue ツールに `operation: "details"`, `startDate`, `endDate`, `axis: "customer"` を指定する
**Then** `getRevenueDetails` usecase が呼ばれ、CustomerRevenue[] が返る

#### Scenario: 売上予実の取得

**Given** 有効なトークンで MCP ツールを呼び出す
**When** revenue ツールに `operation: "forecast"`, `periodStart`, `periodEnd` を指定する
**Then** `getRevenueForecast` usecase が呼ばれ、RevenueForecastItem[]（target + actualAmount + progressRate + landingForecast）と pipelineTotal が返る

### Requirement: revenue_targets ツールは売上目標の設定・更新・削除をサポートする

revenue_targets ツール SHALL `set` / `update` / `delete` の 3 operation を提供する。

#### Scenario: 売上目標の設定

**Given** 有効なトークン（revenue.setTarget 権限あり）で MCP ツールを呼び出す
**When** revenue_targets ツールに `operation: "set"`, `periodStart`, `periodEnd`, `targetAmount` を指定する
**Then** `setRevenueTarget` usecase が呼ばれ、新しい RevenueTarget が返る

#### Scenario: 売上目標の更新（version チェック）

**Given** 既存の売上目標がある
**When** `operation: "update"`, `id`, `targetAmount` を指定する
**Then** `updateRevenueTarget` usecase が呼ばれ、更新された RevenueTarget が返る

#### Scenario: 売上目標の削除

**Given** 有効なトークン（revenue.setTarget 権限あり）で MCP ツールを呼び出す
**When** revenue_targets ツールに `operation: "delete"`, `id` を指定する
**Then** `deleteRevenueTarget` usecase が呼ばれ、成功結果が返る

### Requirement: 全ツールの書き込みが監査ログに記録される

書き込み操作（contracts の create / update / update_status / delete、invoices の create / update / update_status、revenue_targets の set / update / delete）は既存 usecase 内の `recordAudit` を通じて監査ログに記録される MUST。MCP ツールレイヤーに監査ロジックを追加しない。

#### Scenario: 契約作成の監査記録

**Given** MCP ツール経由で契約を作成する
**When** `createContract` usecase が成功する
**Then** `recordAudit` が `contract.create` アクションで呼ばれる

#### Scenario: 請求ステータス更新の監査記録

**Given** MCP ツール経由で請求ステータスを更新する
**When** `updateInvoiceStatus` usecase が成功する
**Then** `recordAudit` が `invoice.update_status` アクションで呼ばれる

### Requirement: 全ツールがテナント分離を保証する

organizationId は authInfo.extra からのみ取得し、ツール引数から受け取らない MUST。全 usecase 呼び出しにこの organizationId を渡す。

#### Scenario: organizationId がツール引数に含まれない

**Given** ツールの Zod スキーマを確認する
**When** 入力スキーマを検査する
**Then** organizationId フィールドが存在しない

#### Scenario: 異なるテナントの操作が分離される

**Given** organizationId="org-A" と "org-B" の authInfo がある
**When** 同一の contractId で contracts ツールを呼ぶ
**Then** 各呼び出しで usecase に渡される organizationId が authInfo の値と一致する

### Requirement: 権限外ロールでのツール実行が拒否される

canPerform による認可判定 SHALL ハンドラ経路で実行され、権限外ロールは usecase に到達せず isError で拒否される MUST。

#### Scenario: member ロールが contract.create を拒否される

**Given** member ロールのトークン
**When** contracts ツールで `operation: "create"` を呼ぶ
**Then** `isError: true` で拒否され、createContract usecase は呼ばれない

#### Scenario: member ロールが invoice.create を拒否される

**Given** member ロールのトークン
**When** invoices ツールで `operation: "create"` を呼ぶ
**Then** `isError: true` で拒否され、createInvoice usecase は呼ばれない

#### Scenario: member ロールが revenue.setTarget を拒否される

**Given** member ロールのトークン
**When** revenue_targets ツールで `operation: "set"` を呼ぶ
**Then** `isError: true` で拒否され、setRevenueTarget usecase は呼ばれない

#### Scenario: finance ロールが contract.create を許可される

**Given** finance ロールのトークン
**When** contracts ツールで `operation: "create"` を呼ぶ
**Then** 認可チェックを通過し、createContract usecase に到達する

#### Scenario: finance ロールが invoice.changeStatus を許可される

**Given** finance ロールのトークン
**When** invoices ツールで `operation: "update_status"` を呼ぶ
**Then** 認可チェックを通過し、updateInvoiceStatus usecase に到達する

### Requirement: エラー変換で内部詳細を漏らさない

usecase が返す例外メッセージ（DB エラー文等）はクライアントに素通ししない MUST。`handleToolError` で固定文言に変換する。

#### Scenario: usecase 例外がマスクされる

**Given** usecase が DB 例外をスローする
**When** ツールハンドラがそれを catch する
**Then** クライアントには「内部エラーが発生しました」が返り、DB エラー詳細は含まれない
