# Tasks: MCP ツール — 経理系（契約・請求・売上）

## T-01: contracts ツールの実装

`src/app/api/mcp/tools/contracts.ts` を新規作成する。

- [ ] `registerContractsTools(server: McpServer)` 関数をエクスポートする
- [ ] `getAuthInfo` ヘルパーを定義する（deals.ts と同一パターン）
- [ ] `z.discriminatedUnion("operation", [...])` で 6 operation のスキーマを定義する
- [ ] **list** operation:
  - canPerform(role, "contract", "list") で認可判定
  - `listContracts` usecase を呼び出す（`@/application/usecases/listContracts` から個別 import）
  - organizationId は authInfo.extra から取得
- [ ] **get** operation:
  - canPerform(role, "contract", "view") で認可判定
  - `getContract` usecase を呼び出す（`@/application/usecases/getContract` から個別 import）
  - contractId（UUID）は必須引数
  - 結果が null の場合は toToolError("契約が見つかりません")
- [ ] **create** operation:
  - canPerform(role, "contract", "create") で認可判定
  - checkRateLimit でレート制限
  - `createContract` usecase を呼び出す（`@/application/usecases/createContract` から個別 import）
  - 必須引数: dealId（UUID）, amount（正の整数）, startDate（文字列 → Date 変換）
  - optional 引数: title, contractType（enum: quasi_delegation / fixed_price / ses）, endDate, paymentTerms, renewalType（enum: one_time / recurring）, renewalCycle
  - optional 引数の未指定は undefined として usecase に渡す（usecase が deal から defaults を補完する）
- [ ] **update** operation:
  - canPerform(role, "contract", "edit") で認可判定
  - checkRateLimit でレート制限
  - `updateContract` usecase を呼び出す（`@/application/usecases/updateContract` から個別 import）
  - contractId（UUID）は必須
  - 全フィールドは optional: title, contractType(.nullable().optional()), amount, startDate, endDate(.nullable().optional()), paymentTerms(.nullable().optional()), renewalType, renewalCycle(.nullable().optional())
  - undefined（変更なし）と null（クリア）を区別する
  - startDate / endDate は文字列 → Date 変換（undefined はそのまま undefined、null はそのまま null）
- [ ] **update_status** operation:
  - canPerform(role, "contract", "changeStatus") で認可判定
  - checkRateLimit でレート制限
  - `updateContractStatus` usecase を呼び出す（`@/application/usecases/updateContractStatus` から個別 import）
  - contractId（UUID）, newStatus（enum: active / completed / cancelled）は必須
- [ ] **delete** operation:
  - canPerform(role, "contract", "delete") で認可判定
  - checkRateLimit でレート制限
  - `deleteContract` usecase を呼び出す（`@/application/usecases/deleteContract` から個別 import）
  - contractId（UUID）は必須
  - 成功時は `{ deleted: true, contractId }` を返す
- [ ] 全 operation の catch で `handleToolError(error)` を使用する
- [ ] usecase の Result が `{ ok: false }` の場合は `toToolError(result.reason)` を返す

**Acceptance Criteria**:
- contracts ツールが 6 operation を持つ discriminated union スキーマを持つ
- 各 operation が対応する usecase を呼び出す
- organizationId は authInfo.extra からのみ取得される
- create の optional 引数が undefined として usecase に渡される
- update で undefined と null が区別される

## T-02: invoices ツールの実装

`src/app/api/mcp/tools/invoices.ts` を新規作成する。

- [ ] `registerInvoicesTools(server: McpServer)` 関数をエクスポートする
- [ ] `getAuthInfo` ヘルパーを定義する
- [ ] `z.discriminatedUnion("operation", [...])` で 4 operation のスキーマを定義する
- [ ] **list** operation:
  - canPerform(role, "invoice", "list") で認可判定
  - contractId（UUID, optional）の有無で分岐:
    - contractId あり → `listInvoicesByContract` usecase を呼び出す（`@/application/usecases/listInvoicesByContract` から個別 import）
    - contractId なし → `listInvoicesByOrganization` usecase を呼び出す（`@/application/usecases/listInvoicesByOrganization` から個別 import）
  - listInvoicesByOrganization 用の optional フィルタ: status（enum: scheduled / invoiced / paid / overdue）, paidAtFrom / paidAtTo / issueDateFrom / issueDateTo（文字列 → Date 変換）
- [ ] **create** operation:
  - canPerform(role, "invoice", "create") で認可判定
  - checkRateLimit でレート制限
  - `createInvoice` usecase を呼び出す（`@/application/usecases/createInvoice` から個別 import）
  - 必須引数: contractId（UUID）, title（文字列, min 1）, amount（正の整数）, dueDate（文字列 → Date 変換）
  - optional 引数: issueDate（文字列 → Date 変換, null なら null）, notes
- [ ] **update** operation:
  - canPerform(role, "invoice", "edit") で認可判定
  - checkRateLimit でレート制限
  - `updateInvoice` usecase を呼び出す（`@/application/usecases/updateInvoice` から個別 import）
  - invoiceId（UUID）は必須
  - optional フィールド: title, amount, issueDate(.nullable().optional()), dueDate, notes(.nullable().optional())
  - undefined（変更なし）と null（クリア）を区別する
  - issueDate / dueDate は文字列 → Date 変換（undefined はそのまま undefined、null はそのまま null）
- [ ] **update_status** operation:
  - canPerform(role, "invoice", "changeStatus") で認可判定
  - checkRateLimit でレート制限
  - `updateInvoiceStatus` usecase を呼び出す（`@/application/usecases/updateInvoiceStatus` から個別 import）
  - invoiceId（UUID）, newStatus（enum: scheduled / invoiced / paid / overdue）は必須
  - paidAt（`YYYY-MM-DD` 文字列, optional）→ `new Date(paidAt)` で変換して usecase に渡す。省略時は undefined（usecase のデフォルトに委ねる）
- [ ] 全 operation の catch で `handleToolError(error)` を使用する

**Acceptance Criteria**:
- invoices ツールが 4 operation を持つ
- list が contractId の有無で 2 つの usecase を切り替える
- update_status で paidAt を Date に変換して usecase に渡す
- update で undefined と null が区別される

## T-03: revenue ツールの実装（読み取り専用）

`src/app/api/mcp/tools/revenue.ts` を新規作成する。

- [ ] `registerRevenueTools(server: McpServer)` 関数をエクスポートする
- [ ] `getAuthInfo` ヘルパーを定義する
- [ ] `z.discriminatedUnion("operation", [...])` で 3 operation のスキーマを定義する
- [ ] **dashboard** operation:
  - canPerform(role, "revenue", "view") で認可判定
  - `getRevenueDashboard` usecase を呼び出す（`@/application/usecases/getRevenueDashboard` から個別 import）
  - 引数なし（usecase 内で当月・過去 12 ヶ月を自動計算）
  - 結果: `{ currentMonthRevenue, confirmedRevenue, monthlyTrend, pipelineSummary, topCustomers }`
- [ ] **details** operation:
  - canPerform(role, "revenue", "view") で認可判定
  - `getRevenueDetails` usecase を呼び出す（`@/application/usecases/getRevenueDetails` から個別 import）
  - 必須引数: startDate（文字列 → Date）, endDate（文字列 → Date）, axis（enum: monthly / customer / deal）
  - 結果: `{ axis, data }` （axis に応じて MonthlyRevenue[] / CustomerRevenue[] / DealRevenue[]）
- [ ] **forecast** operation:
  - canPerform(role, "revenue", "view") で認可判定
  - `getRevenueForecast` usecase を呼び出す（`@/application/usecases/getRevenueForecast` から個別 import）
  - 必須引数: periodStart（文字列 → Date）, periodEnd（文字列 → Date）
  - 結果: `{ items: RevenueForecastItem[], pipelineTotal }`
- [ ] 全 operation の catch で `handleToolError(error)` を使用する
- [ ] 読み取り専用のため checkRateLimit は不要（search 用リミットも不適用。UI と同一の負荷特性）

**Acceptance Criteria**:
- revenue ツールが 3 operation を持つ
- 全 operation が読み取り専用（書き込みなし）
- 人間の売上画面と同一の usecase を共有する
- dashboard が引数なしで呼べる

## T-04: revenue_targets ツールの実装

`src/app/api/mcp/tools/revenueTargets.ts` を新規作成する。

- [ ] `registerRevenueTargetsTools(server: McpServer)` 関数をエクスポートする
- [ ] `getAuthInfo` ヘルパーを定義する
- [ ] `z.discriminatedUnion("operation", [...])` で 3 operation のスキーマを定義する
- [ ] **set** operation:
  - canPerform(role, "revenue", "setTarget") で認可判定
  - checkRateLimit でレート制限
  - `setRevenueTarget` usecase を呼び出す（`@/application/usecases/setRevenueTarget` から個別 import）
  - 必須引数: periodStart（文字列 → Date）, periodEnd（文字列 → Date）, targetAmount（正の整数）
- [ ] **update** operation:
  - canPerform(role, "revenue", "setTarget") で認可判定
  - checkRateLimit でレート制限
  - `updateRevenueTarget` usecase を呼び出す（`@/application/usecases/updateRevenueTarget` から個別 import）
  - id（UUID）は必須
  - optional フィールド: periodStart（文字列 → Date）, periodEnd（文字列 → Date）, targetAmount（正の整数）
- [ ] **delete** operation:
  - canPerform(role, "revenue", "setTarget") で認可判定
  - checkRateLimit でレート制限
  - `deleteRevenueTarget` usecase を呼び出す（`@/application/usecases/deleteRevenueTarget` から個別 import）
  - id（UUID）は必須
  - 成功時は `{ deleted: true, id }` を返す
- [ ] 全 operation の catch で `handleToolError(error)` を使用する

**Acceptance Criteria**:
- revenue_targets ツールが 3 operation を持つ
- 全 operation で canPerform(role, "revenue", "setTarget") を使用する
- update で undefined と既存値の区別が正しく usecase に渡される

## T-05: route.ts にツール登録を追加

`src/app/api/mcp/route.ts` の `createMcpServer()` 内に新ツールの登録を追加する。

- [ ] `import { registerContractsTools } from "./tools/contracts"` を追加
- [ ] `import { registerInvoicesTools } from "./tools/invoices"` を追加
- [ ] `import { registerRevenueTools } from "./tools/revenue"` を追加
- [ ] `import { registerRevenueTargetsTools } from "./tools/revenueTargets"` を追加
- [ ] `createMcpServer()` 内で 4 つの register 関数を呼び出す

**Acceptance Criteria**:
- `createMcpServer()` が 11 ツール（既存 7 + 新規 4）を登録する
- typecheck が通る

## T-06: won でない案件への契約作成拒否の実行検証テスト

`src/__tests__/mcp/mcpContracts.dynamic.test.ts` を新規作成する。

- [ ] `createContract` usecase を `mock.module` で個別ファイルモックする
- [ ] `@/infrastructure/rateLimit` をモックする（全テストで `{ allowed: true }` を返す）
- [ ] contracts ツールの `create` operation を実際に実行する
- [ ] `createContract` のモックが `{ ok: false, reason: "受注済みの案件にのみ契約を作成できます" }` を返すよう設定する
- [ ] ツール結果が `isError: true` であることを assert する
- [ ] ツール結果のテキストに拒否メッセージが含まれることを assert する
- [ ] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「won でない案件への契約作成が拒否されることをテストで固定する」を満たす
- behavioral test（実行検証）である

## T-07: 未発行請求の入金記録拒否の実行検証テスト

`src/__tests__/mcp/mcpInvoices.dynamic.test.ts` を新規作成する。

- [ ] `updateInvoiceStatus` usecase を `mock.module` で個別ファイルモックする
- [ ] `@/infrastructure/rateLimit` をモックする
- [ ] invoices ツールの `update_status` operation で `newStatus: "paid"` を実際に実行する
- [ ] `updateInvoiceStatus` のモックが `{ ok: false, reason: "scheduled から paid への遷移は許可されていません" }` を返すよう設定する
- [ ] ツール結果が `isError: true` であることを assert する
- [ ] `updateInvoiceStatus` が呼ばれたときの引数に `newStatus: "paid"` が含まれることを assert する
- [ ] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「未発行請求の入金記録が拒否されること」をテストで固定する
- behavioral test（実行検証）である

## T-08: 入金記録に入金日の伝播テスト

同ファイル `src/__tests__/mcp/mcpInvoices.dynamic.test.ts` に追加。

- [ ] invoices ツールの `update_status` operation で `newStatus: "paid"`, `paidAt: "2026-07-01"` を実行する
- [ ] `updateInvoiceStatus` のモックが呼ばれたときの引数で paidAt が `Date` オブジェクトとして渡されていることを assert する（文字列 → Date 変換の検証）
- [ ] paidAt を省略して `newStatus: "paid"` を実行したとき、usecase 引数の paidAt が undefined であることを assert する

**Acceptance Criteria**:
- 受け入れ基準「入金記録に入金日が必須なこと」のテスト（MCP 層では optional だが、usecase に正しく伝播することを検証する）
- paidAt の文字列 → Date 変換が正しく行われる

## T-09: finance / member ロールの操作可否テスト

`src/__tests__/mcp/mcpFinanceAuthz.dynamic.test.ts` を新規作成する。

- [ ] `createContract`, `createInvoice`, `setRevenueTarget` usecases を `mock.module` で個別ファイルモックする
- [ ] `@/infrastructure/rateLimit` をモックする
- [ ] **member ロール**で contracts の `create` を呼び、`isError: true` で拒否され `createContract` usecase に到達しないことを assert する（member は contract.create 権限なし）
- [ ] **finance ロール**で contracts の `create` を呼び、`createContract` usecase に到達することを assert する（finance は contract.create 権限あり）
- [ ] **member ロール**で invoices の `create` を呼び、`isError: true` で拒否され `createInvoice` usecase に到達しないことを assert する（member は invoice.create 権限なし）
- [ ] **finance ロール**で invoices の `update_status` を呼び、`updateInvoiceStatus` usecase に到達することを assert する（finance は invoice.changeStatus 権限あり）
- [ ] **member ロール**で revenue_targets の `set` を呼び、`isError: true` で拒否され `setRevenueTarget` usecase に到達しないことを assert する（member は revenue.setTarget 権限なし）
- [ ] **finance ロール**で revenue_targets の `set` を呼び、`isError: true` で拒否されることを assert する（finance は revenue.setTarget 権限なし — admin / manager のみ）
- [ ] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「finance / member ロールの操作可否が Server Action と同一判定になることをテストで固定する」を満たす
- 権限外ロールの拒否と権限内ロールの到達の両方を検証する

## T-10: version 不一致の衝突エラーテスト

同ファイル `src/__tests__/mcp/mcpContracts.dynamic.test.ts` に追加。

- [ ] `updateContract` usecase を `mock.module` で個別ファイルモックする
- [ ] contracts ツールの `update` operation を実行する
- [ ] `updateContract` のモックが `{ ok: false, reason: "この契約は他のユーザーによって更新されました。画面を更新してください" }` を返すよう設定する
- [ ] ツール結果が `isError: true` であることを assert する

追加: invoices の version 衝突も同パターンで検証する（`src/__tests__/mcp/mcpInvoices.dynamic.test.ts` 内）。

- [ ] `updateInvoice` usecase をモックし、version 不一致の reason を返す
- [ ] ツール結果が `isError: true` であることを assert する

**Acceptance Criteria**:
- 受け入れ基準「version 不一致の更新が衝突エラーになることをテストで固定する」を満たす
- contracts と invoices の両方で検証する

## T-11: 売上サマリが UI と同一の集計値を返すことのテスト

`src/__tests__/mcp/mcpRevenue.dynamic.test.ts` を新規作成する。

- [ ] `getRevenueDashboard` usecase を `mock.module` で個別ファイルモックする
- [ ] revenue ツールの `dashboard` operation を実行する
- [ ] `getRevenueDashboard` が organizationId（authInfo 由来）で呼ばれることを assert する
- [ ] モックが返す `RevenueDashboard` 構造（currentMonthRevenue, confirmedRevenue, monthlyTrend, pipelineSummary, topCustomers）がそのままツール結果に含まれることを assert する（usecase 共有 = 同一集計値の保証）
- [ ] `getRevenueDetails` usecase をモックし、`details` operation で `startDate`, `endDate`, `axis: "customer"` を指定して実行し、引数が正しく Date 変換されて usecase に渡ることを assert する
- [ ] `getRevenueForecast` usecase をモックし、`forecast` operation で `periodStart`, `periodEnd` を指定して実行し、引数が正しく渡ることを assert する
- [ ] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「売上サマリが人間の売上画面と同じ集計値を返すことをテストで固定する」を満たす
- usecase 共有であることを実行検証で固定する（モック化した usecase が呼ばれること = 同一ロジックの証明）

## T-12: 書き込みの監査ログ記録とテナント分離のテスト

`src/__tests__/mcp/mcpFinanceAuditTenant.dynamic.test.ts` を新規作成する。

- [ ] **監査記録の実行検証**: contracts ツールの `create` operation を実行し、`createContract` usecase が `organizationId` と `actorId` を受け取って呼ばれることを assert する（usecase 内で recordAudit が呼ばれる = 監査記録される）
- [ ] **テナント分離の実行検証**: organizationId="org-A" と "org-B" の 2 つの authInfo で contracts の `create` を呼び、usecase に渡される organizationId がそれぞれ正しいことを assert する
- [ ] invoices の `create` でも同様に organizationId 伝播を検証する
- [ ] revenue_targets の `set` でも organizationId 伝播を検証する
- [ ] revenue の `dashboard` でも organizationId 伝播を検証する
- [ ] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「書き込みが監査ログに記録され、他テナントに触れられないことをテストで固定する」を満たす
- 全 4 ツールについてテナント分離が実行検証される

## T-13: エラー変換で内部詳細を漏らさないテスト

既存テストファイル（`mcpContracts.dynamic.test.ts` 等）に追加。

- [ ] `createContract` usecase のモックが DB 例外をスローするよう設定する
- [ ] ツール結果が `isError: true` で、テキストが「内部エラーが発生しました」であることを assert する
- [ ] スローされた例外メッセージ（例: "duplicate key value violates unique constraint"）がツール結果に含まれないことを assert する

**Acceptance Criteria**:
- handleToolError で例外が固定文言に変換される
- DB エラー詳細がクライアントに漏れない

## T-14: typecheck・test green の確認

- [ ] `bun run typecheck` が green であることを確認する
- [ ] `bun test` が green であることを確認する（既存テスト無変更で green）
- [ ] 新規テストファイルが全て pass することを確認する

**Acceptance Criteria**:
- 受け入れ基準「`typecheck && test` green」を満たす
