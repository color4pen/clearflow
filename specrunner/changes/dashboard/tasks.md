# Tasks: ダッシュボードの実装

## T-01: 組織レベル請求リポジトリメソッドの追加

- [ ] `src/infrastructure/repositories/invoiceRepository.ts` に `findAllByOrganization` 関数を追加する
- [ ] 引数: `organizationId: string`, `filters?: { status?: InvoiceStatus; paidAtFrom?: Date; paidAtTo?: Date; issueDateFrom?: Date; issueDateTo?: Date }`
- [ ] WHERE 句に `eq(invoices.organizationId, organizationId)` を必ず含める（テナント分離）
- [ ] filters が指定された場合、条件を AND で追加する: `status` → `eq(invoices.status, filters.status)`、`paidAtFrom` → `gte(invoices.paidAt, filters.paidAtFrom)`、`paidAtTo` → `lt(invoices.paidAt, filters.paidAtTo)`、`issueDateFrom` → `gte(invoices.issueDate, filters.issueDateFrom)`、`issueDateTo` → `lte(invoices.issueDate, filters.issueDateTo)`
- [ ] `orderBy(asc(invoices.dueDate))` でソートする
- [ ] 戻り値は `Promise<Invoice[]>`、既存の `mapRow` 関数を再利用する
- [ ] `drizzle-orm` からの import に `gte`, `lt`, `lte` を追加する（`lte` は既存にないため）

**Acceptance Criteria**:
- `findAllByOrganization("org-1")` が org-1 の全請求を返す
- `findAllByOrganization("org-1", { status: "overdue" })` が overdue の請求のみ返す
- `findAllByOrganization("org-1", { paidAtFrom: new Date("2026-06-01"), paidAtTo: new Date("2026-07-01") })` が paidAt が範囲内の請求のみ返す
- org-2 の請求が混入しない（テナント分離）

## T-02: listInvoicesByOrganization ユースケースの新設

- [ ] `src/application/usecases/listInvoicesByOrganization.ts` を新規作成する
- [ ] 関数シグネチャ: `listInvoicesByOrganization(data: { organizationId: string; status?: InvoiceStatus; paidAtFrom?: Date; paidAtTo?: Date; issueDateFrom?: Date; issueDateTo?: Date }): Promise<Invoice[]>`
- [ ] `invoiceRepository.findAllByOrganization` に委譲する
- [ ] `src/application/usecases/index.ts` に `export { listInvoicesByOrganization } from "./listInvoicesByOrganization"` を追加する

**Acceptance Criteria**:
- `listInvoicesByOrganization({ organizationId: "org-1", status: "overdue" })` が正しく動作する
- usecase の barrel export から import 可能

## T-03: アクション待ちリスト統合のためのドメインサービス関数

- [ ] `src/domain/services/dashboardService.ts` を新規作成する
- [ ] 統合表示用の型 `ActionableItem` を定義する: `{ type: "approval" | "action_item" | "inquiry"; title: string; dueDate: Date | null; linkHref: string; meta: Record<string, string> }`
- [ ] 関数 `buildActionableItems(params: { requests: RequestWithSteps[]; userRole: string; meetings: Meeting[]; inquiries: InquiryWithClient[] }): ActionableItem[]` を実装する
- [ ] 承認リクエストの抽出: `requests` から `status === "pending"` かつ `approvalSteps` に `approverRole === userRole && status === "pending"` のステップが存在するものを抽出。各リクエストの最も早い pending ステップの deadline を dueDate とする。linkHref は `/requests/${request.id}`
- [ ] アクションアイテムの抽出: 全 `meetings` の `actionItems` から `done === false` のものを抽出。`dueDate` は `actionItem.dueDate` を Date にパース（null なら null）。linkHref は `/deals/${meeting.dealId}/meetings/${meeting.id}`。meta に `assignee` を含める
- [ ] 引合の抽出: `inquiries` から `status === "new"` のものを抽出。dueDate は null。linkHref は `/inquiries`（引合は個別詳細ページがないため一覧へ）
- [ ] ソート: dueDate 昇順。dueDate が null のアイテムは末尾に配置
- [ ] この関数は純粋関数（副作用なし）とする

**Acceptance Criteria**:
- 3 種類のアイテムが統合されて 1 つの配列として返る
- dueDate 昇順でソートされ、null は末尾
- 入力データが空の場合は空配列を返す

## T-04: 停滞案件フィルタのためのドメインサービス関数

- [ ] `src/domain/services/dashboardService.ts` に `filterStaleDealss` 関数を追加する
- [ ] 関数シグネチャ: `filterStaleDeals(deals: DealWithDetails[], now: Date, thresholdDays: number): DealWithDetails[]`
- [ ] フィルタ条件: `deal.phase !== "won" && deal.phase !== "lost"` かつ `now - deal.updatedAt >= thresholdDays * 24 * 60 * 60 * 1000`
- [ ] 純粋関数（`now` を引数で受け取りテスト容易にする）

**Acceptance Criteria**:
- updatedAt が 14 日以上前の negotiation フェーズの案件が含まれる
- updatedAt が 10 日前の案件は含まれない
- phase が won の案件は updatedAt が古くても含まれない

## T-05: パイプラインサマリ集約のためのドメインサービス関数

- [ ] `src/domain/services/dashboardService.ts` に `buildPipelineSummary` 関数を追加する
- [ ] 戻り値型: `PipelineSummaryItem[]` where `PipelineSummaryItem = { phase: DealPhase; label: string; count: number; totalAmount: number }`
- [ ] 引数: `deals: DealWithDetails[]`
- [ ] 全 5 フェーズ（`proposal_prep`, `proposed`, `negotiation`, `won`, `lost`）を常に返す（案件がないフェーズは count: 0, totalAmount: 0）
- [ ] `estimatedAmount` が null の案件は金額集計から除外する（count には含める）
- [ ] フェーズの label は `phaseLabels` マップから取得するか、引数で受け取る

**Acceptance Criteria**:
- 全 5 フェーズが常に含まれる
- count と totalAmount がフェーズごとに正しく集計される
- estimatedAmount が null の案件は金額に影響しない

## T-06: 経理ダッシュボード用の月次売上集計関数

- [ ] `src/domain/services/dashboardService.ts` に `calcMonthlyRevenue` 関数を追加する
- [ ] 引数: `invoices: Invoice[]` — status=paid かつ当月の paidAt でフィルタ済みの請求配列を受け取る想定
- [ ] 戻り値: `number` — amount の合計
- [ ] 空配列の場合は 0 を返す

**Acceptance Criteria**:
- `[{amount: 100000}, {amount: 200000}]` → `300000`
- 空配列 → `0`

## T-07: 営業ダッシュボードコンポーネントの実装

- [ ] `src/app/(dashboard)/dashboard/SalesDashboard.tsx` を新規作成する（Server Component）
- [ ] Props: `{ actionItems: ActionableItem[]; pipelineSummary: PipelineSummaryItem[]; recentLogs: AuditLog[]; staleDeals: DealWithDetails[] | null; userRole: string }`
- [ ] アクション待ちリストセクション: `ActionableItem[]` をリスト表示。各アイテムは type に応じたアイコン/ラベル、title、dueDate（あれば日付表示）、linkHref へのリンクを含む。meta.assignee がある場合は担当者名を表示
- [ ] パイプラインサマリセクション: フェーズごとにカード or 行を表示。件数・金額・フェーズ名を含む。各フェーズは `/deals?phase={phase}` へのリンク
- [ ] 直近の活動セクション: `AuditLog[]` をリスト表示。各エントリは action、targetType、createdAt を表示。targetType と targetId から対象エンティティへのリンクを生成する関数 `getEntityLink(targetType, targetId): string` を実装（例: `targetType === "deal"` → `/deals/${targetId}`）
- [ ] 停滞案件セクション: `staleDeals` が null でない場合のみ表示。各案件は title、phase、clientName、updatedAt を表示。`/deals/${deal.id}` へのリンク
- [ ] 既存の共通コンポーネント（`SectionCard`, `DataTable` 等）を活用する
- [ ] 空の場合は適切なメッセージ（「アクション待ちはありません」等）を表示する

**Acceptance Criteria**:
- 4 セクション（アクション待ち、パイプライン、活動、停滞案件）が正しく描画される
- staleDeals が null の場合、停滞案件セクションが描画されない
- 各リンクが正しい URL を指している
- データが空の場合にエラーにならず空状態が表示される

## T-08: 経理ダッシュボードコンポーネントの実装

- [ ] `src/app/(dashboard)/dashboard/FinanceDashboard.tsx` を新規作成する（Server Component）
- [ ] Props: `{ overdueInvoices: Invoice[]; unpaidInvoices: Invoice[]; monthlyRevenue: number; upcomingInvoices: Invoice[] }`
- [ ] 期日超過セクション: `overdueInvoices` をテーブル表示。カラム: title, amount, dueDate, contractId へのリンク
- [ ] 未入金セクション: `unpaidInvoices` をテーブル表示。同上のカラム構成
- [ ] 今月の売上サマリセクション: `monthlyRevenue` を `¥{amount.toLocaleString("ja-JP")}` 形式で大きく表示
- [ ] 請求予定セクション: `upcomingInvoices` をテーブル表示。カラム: title, amount, issueDate
- [ ] 既存の共通コンポーネント（`SectionCard`, `DataTable` 等）を活用する
- [ ] 空の場合は適切なメッセージを表示する

**Acceptance Criteria**:
- 4 セクション（期日超過、未入金、売上サマリ、請求予定）が正しく描画される
- 金額が日本円フォーマットで表示される
- データが空の場合にエラーにならず空状態が表示される

## T-09: ダッシュボードページの実装

- [ ] `src/app/(dashboard)/dashboard/page.tsx` を新規作成する
- [ ] Server Component として実装する
- [ ] `auth()` でセッションを取得し、`session.user.role` と `session.user.organizationId` を使用する
- [ ] ロール判定: `role === "finance"` なら経理、それ以外なら営業
- [ ] **営業ダッシュボードのデータフェッチ**: `Promise.all` で以下を並列実行
  - [ ] `listRequests(organizationId)` — 承認リクエスト一覧
  - [ ] `meetingRepository.findAllByOrganization(organizationId)` — 全商談（アクションアイテム取得のため）
  - [ ] `listInquiries(organizationId)` — 引合一覧
  - [ ] `listDeals(organizationId)` — 案件一覧
  - [ ] `auditLogRepository.findByOrganization(organizationId, { limit: 20 })` — 最新監査ログ
- [ ] フェッチ結果を `buildActionableItems`, `buildPipelineSummary`, `filterStaleDeals`（manager/admin のみ）に渡す
- [ ] `SalesDashboard` コンポーネントに props を渡して描画する
- [ ] **経理ダッシュボードのデータフェッチ**: `Promise.all` で以下を並列実行
  - [ ] `listInvoicesByOrganization({ organizationId, status: "overdue" })` — 期日超過
  - [ ] `listInvoicesByOrganization({ organizationId, status: "invoiced" })` — 未入金
  - [ ] `listInvoicesByOrganization({ organizationId, status: "paid", paidAtFrom: 今月初日, paidAtTo: 翌月初日 })` — 今月の入金済み
  - [ ] `listInvoicesByOrganization({ organizationId, status: "scheduled", issueDateFrom: 今月初日, issueDateTo: 翌月末日 })` — 請求予定
- [ ] `calcMonthlyRevenue` で月次売上を算出する
- [ ] `FinanceDashboard` コンポーネントに props を渡して描画する

**Acceptance Criteria**:
- `/dashboard` にアクセスするとエラーなくページが描画される
- member ロールで営業ダッシュボードが表示される
- finance ロールで経理ダッシュボードが表示される
- manager/admin ロールで停滞案件セクションが表示される
- member ロールで停滞案件セクションが表示されない

## T-10: ルートリダイレクトの変更

- [ ] `src/app/page.tsx` の `redirect("/requests")` を `redirect("/dashboard")` に変更する

**Acceptance Criteria**:
- `/` にアクセスすると `/dashboard` にリダイレクトされる

## T-11: グローバルナビゲーションの更新

- [ ] `src/app/(dashboard)/layout.tsx` の `<nav>` 内に「ダッシュボード」リンクを追加する
- [ ] 配置位置: `<nav>` の最初のリンクとして追加（`顧客` リンクの前）
- [ ] JSX: `<Link href="/dashboard" className="text-text-on-dark-secondary hover:text-white text-sm">ダッシュボード</Link>`
- [ ] 既存のリンクのスタイルに統一する

**Acceptance Criteria**:
- ナビゲーションの最初に「ダッシュボード」リンクが表示される
- リンク先が `/dashboard` である
- 既存のリンクとスタイルが統一されている

## T-12: 型チェックとテストの確認

- [ ] `bun run build` が成功することを確認する（型チェック含む）
- [ ] 既存テストが破壊されていないことを確認する
- [ ] 新規追加した関数（`buildActionableItems`, `filterStaleDeals`, `buildPipelineSummary`, `calcMonthlyRevenue`）の単体テストを追加する（テストファイル: `src/domain/services/__tests__/dashboardService.test.ts`）

**Acceptance Criteria**:
- `typecheck && test` が green
- ドメインサービスの純粋関数にテストが存在する
