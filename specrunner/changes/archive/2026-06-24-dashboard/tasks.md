# Tasks: ダッシュボードの実装

## T-01: invoiceRepository に findAllByOrganization を追加する

- [x] `src/infrastructure/repositories/invoiceRepository.ts` に `findAllByOrganization` 関数を追加する
- [x] シグネチャ: `findAllByOrganization(organizationId: string, filters?: { status?: InvoiceStatus; paidAtFrom?: Date; paidAtTo?: Date; issueDateFrom?: Date; issueDateTo?: Date }): Promise<Invoice[]>`
- [x] `eq(invoices.organizationId, organizationId)` を必須条件とする（テナント分離）
- [x] `filters.status` が指定された場合、`eq(invoices.status, filters.status)` を追加する
- [x] `filters.paidAtFrom` / `filters.paidAtTo` が指定された場合、`gte(invoices.paidAt, from)` / `lt(invoices.paidAt, to)` を追加する（呼び出し側が翌月初 00:00:00 UTC を exclusive 境界として渡す前提）
- [x] `filters.issueDateFrom` / `filters.issueDateTo` が指定された場合、`gte(invoices.issueDate, from)` / `lt(invoices.issueDate, to)` を追加する（呼び出し側が翌々月初 00:00:00 UTC を exclusive 境界として渡す前提）
- [x] 結果を `asc(invoices.dueDate)` でソートする
- [x] 既存の `mapRow` 関数を再利用する

**Acceptance Criteria**:
- `findAllByOrganization(orgId)` でフィルタなしの全請求が返される
- `findAllByOrganization(orgId, { status: "overdue" })` で overdue のみ返される
- `findAllByOrganization(orgId, { status: "paid", paidAtFrom, paidAtTo })` で期間内の paid 請求のみ返される
- `findAllByOrganization(orgId, { status: "scheduled", issueDateFrom, issueDateTo })` で期間内の scheduled 請求のみ返される
- 異なる organizationId では他テナントの請求が返されない

## T-02: listInvoicesByOrganization ユースケースを新設する

- [x] `src/application/usecases/listInvoicesByOrganization.ts` を新規作成する
- [x] シグネチャ: `listInvoicesByOrganization(data: { organizationId: string; status?: InvoiceStatus; paidAtFrom?: Date; paidAtTo?: Date; issueDateFrom?: Date; issueDateTo?: Date }): Promise<Invoice[]>`
- [x] 内部で `invoiceRepository.findAllByOrganization(data.organizationId, { status, paidAtFrom, paidAtTo, issueDateFrom, issueDateTo })` を呼ぶ
- [x] `src/application/usecases/index.ts` に `export { listInvoicesByOrganization } from "./listInvoicesByOrganization";` を追加する

**Acceptance Criteria**:
- `listInvoicesByOrganization({ organizationId })` が `invoiceRepository.findAllByOrganization` に委譲される
- `src/application/usecases/index.ts` からエクスポートされている
- `bun run typecheck` が green

## T-03: DashboardActionItem 型とアクション待ちリスト取得ユースケースを実装する

- [x] `src/domain/models/dashboard.ts` を新規作成する
- [x] 以下の型を定義する:
  ```typescript
  export type DashboardActionItem =
    | { type: "approval"; requestId: string; requestTitle: string; approverRole: string; deadline: Date | null }
    | { type: "action_item"; dealId: string; dealTitle: string; description: string; assignee: string; dueDate: string | null }
    | { type: "inquiry"; inquiryId: string; inquiryTitle: string; createdAt: Date };
  ```
- [x] `src/domain/models/index.ts` に `export type { DashboardActionItem } from "./dashboard";` を追加する
- [x] `src/application/usecases/getDashboardActions.ts` を新規作成する
- [x] シグネチャ: `getDashboardActions(organizationId: string, userRole: string): Promise<DashboardActionItem[]>`
- [x] 内部で以下を `Promise.all` で並列取得する:
  - `requestRepository.findAllWithStepsByOrganization(organizationId)` — pending かつ `approverRole === userRole` のステップを持つリクエストを抽出
  - `meetingRepository.findAllByOrganization(organizationId)` — 全商談から `done === false` のアクションアイテムを抽出（dealId, description, assignee, dueDate を保持）
  - `inquiryRepository.findAllWithClientByOrganization(organizationId)` — `status === "new"` の引合を抽出
  - `listDeals(organizationId)` — 案件リストを取得し、`Map<dealId, dealTitle>` を構築する。action_item の `dealTitle` はこの Map から解決する（Map に存在しない場合は空文字列）
- [x] 3 種類のアイテムを `DashboardActionItem[]` にマージし、期日昇順でソートする。ソートキー: approval は `deadline`、action_item は `dueDate`（ISO 文字列を Date 化）、inquiry は `createdAt`。期日が null のアイテムは末尾に配置する
- [x] `src/application/usecases/index.ts` にエクスポートを追加する

**Acceptance Criteria**:
- ロール一致の pending 承認リクエストのみがリストに含まれる
- `done === false` のアクションアイテムのみがリストに含まれる
- `status === "new"` の引合のみがリストに含まれる
- 結果が期日昇順でソートされ、期日 null は末尾
- `bun run typecheck` が green

## T-04: パイプラインサマリ用の集計ロジックを実装する

- [x] `src/domain/models/dashboard.ts` に以下の型を追加する:
  ```typescript
  export type PipelineSummaryItem = {
    phase: DealPhase;
    count: number;
    totalAmount: number;
  };
  ```
- [x] `src/domain/models/index.ts` に `PipelineSummaryItem` のエクスポートを追加する
- [x] `src/application/usecases/getPipelineSummary.ts` を新規作成する
- [x] シグネチャ: `getPipelineSummary(organizationId: string): Promise<{ summary: PipelineSummaryItem[]; deals: DealWithDetails[] }>`
- [x] 内部で `listDeals(organizationId)` を呼び、フェーズごとに案件数と `estimatedAmount` の合計を集計する
- [x] `estimatedAmount` が null の案件は金額 0 として集計する
- [x] 全 5 フェーズ（`proposal_prep`, `proposed`, `negotiation`, `won`, `lost`）を含む結果を返す（案件 0 件のフェーズも含む）
- [x] `deals` も返す（停滞案件フィルタで再利用するため）
- [x] `src/application/usecases/index.ts` にエクスポートを追加する

**Acceptance Criteria**:
- 全 5 フェーズの集計結果が返される
- 案件がないフェーズは count: 0, totalAmount: 0 で含まれる
- estimatedAmount が null の案件は金額 0 として扱われる
- `bun run typecheck` が green

## T-05: 営業ダッシュボードの Server Component とクライアントコンポーネントを実装する

- [x] `src/application/usecases/getRecentActivities.ts` を新規作成する。シグネチャ: `getRecentActivities(organizationId: string): Promise<AuditLog[]>`。内部で `auditLogRepository.findByOrganization(organizationId, { limit: 20 })` を呼ぶ
- [x] `src/application/usecases/index.ts` に `export { getRecentActivities } from "./getRecentActivities";` を追加する
- [x] `src/app/(dashboard)/dashboard/page.tsx` を新規作成する（Server Component）
- [x] `auth()` でセッションを取得し、未認証の場合 `/login` にリダイレクトする
- [x] `session.user.role` で分岐: `finance` なら経理ダッシュボードデータを取得、それ以外は営業ダッシュボードデータを取得する
- [x] 営業ダッシュボード向けデータ取得（`Promise.all` で並列化）:
  - `getDashboardActions(organizationId, userRole)`
  - `getPipelineSummary(organizationId)`
  - `getRecentActivities(organizationId)`
- [x] `deals` 配列から停滞案件をフィルタする: `phase` が `won`/`lost` 以外かつ `updatedAt` が 14 日以上前
- [x] `session.user.role` が `manager` / `admin` の場合のみ停滞案件を props に渡す（それ以外は `null`）
- [x] `src/app/(dashboard)/dashboard/SalesDashboard.tsx` をクライアントコンポーネント（`"use client"`）として新規作成する
- [x] Props: `{ actions: DashboardActionItem[]; pipelineSummary: PipelineSummaryItem[]; recentActivities: AuditLog[]; staleDeals: DealWithDetails[] | null }`
- [x] アクション待ちリストセクション: `SectionCard` 内に `DataTable` またはリストで表示。種別（承認/TODO/引合）をアイコンまたはラベルで区別。各アイテムに対象エンティティへのリンクを含む
- [x] パイプラインサマリセクション: `SectionCard` 内にフェーズ別カード or テーブルで表示。フェーズ名（`phaseLabels` を使用）、件数、金額合計。各フェーズは `/deals?phase=xxx` へのリンク
- [x] 直近の活動セクション: `SectionCard` 内に監査ログを表示。`targetType` と `targetId` からエンティティ詳細へのリンクを生成する。リンク生成ルール — `targetType` が `deal` → `/deals/{targetId}`, `request` → `/requests/{targetId}`, `inquiry` → `/inquiries/{targetId}`, `contract` → `/contracts/{targetId}`, `invoice` → `null`（請求は契約詳細内のため直リンク不可）, その他 → `null`
- [x] 停滞案件セクション（`staleDeals` が null でない場合のみ表示）: `SectionCard` 内に案件名、フェーズ、最終更新日を表示。各行は `/deals/{id}` へのリンク
- [x] 既存の UI コンポーネント（`PageToolbar`, `SectionCard`, `DataTable`）を活用する

**Acceptance Criteria**:
- `/dashboard` にアクセスすると営業ダッシュボード（member/manager/admin）が表示される
- アクション待ちリストに承認リクエスト、アクションアイテム、引合が統合表示される
- パイプラインサマリにフェーズ別の件数と金額が表示される
- 直近の活動に監査ログ 20 件が表示される
- manager/admin では停滞案件リストが表示される
- member では停滞案件リストが表示されない
- `bun run typecheck` が green

## T-06: 経理ダッシュボードのクライアントコンポーネントを実装する

- [x] `page.tsx` の経理ダッシュボード向けデータ取得を実装する（`Promise.all` で並列化）:
  - `listInvoicesByOrganization({ organizationId, status: "overdue" })`
  - `listInvoicesByOrganization({ organizationId, status: "invoiced" })`
  - `listInvoicesByOrganization({ organizationId, status: "paid", paidAtFrom: monthStart, paidAtTo: nextMonthStart })`（`paidAtTo` は翌月初を exclusive 境界として渡す）
  - `listInvoicesByOrganization({ organizationId, status: "scheduled", issueDateFrom: monthStart, issueDateTo: nextNextMonthStart })`（`issueDateTo` は翌々月初を exclusive 境界として渡す）
- [x] 月初・翌月初・翌々月初の計算: `new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))` 等で UTC ベースで算出する
- [x] paid 請求の `amount` を合計して今月の売上サマリ金額を算出する
- [x] `src/app/(dashboard)/dashboard/FinanceDashboard.tsx` をクライアントコンポーネント（`"use client"`）として新規作成する
- [x] Props: `{ overdueInvoices: Invoice[]; unpaidInvoices: Invoice[]; monthlySalesTotal: number; upcomingInvoices: Invoice[] }`
- [x] 期日超過の請求セクション: `SectionCard` 内に dueDate 昇順で表示。金額、タイトル、支払期日を含む
- [x] 未入金の請求セクション: `SectionCard` 内に dueDate 昇順で表示
- [x] 今月の売上サマリセクション: 合計金額を `¥xxx,xxx` 形式で大きく表示する
- [x] 請求予定セクション: `SectionCard` 内に issueDate 順で表示
- [x] 各請求行に契約詳細へのリンク（`/contracts/{contractId}`）を含む

**Acceptance Criteria**:
- finance ロールで経理ダッシュボードが表示される
- 期日超過の請求が dueDate 昇順で表示される
- 未入金の請求が dueDate 昇順で表示される
- 今月の売上サマリに paid 請求の合計金額が表示される
- 請求予定に今月〜翌月の scheduled 請求が表示される
- `bun run typecheck` が green

## T-07: ルートリダイレクトの変更とナビゲーション更新

- [x] `src/app/page.tsx` の `redirect("/requests")` を `redirect("/dashboard")` に変更する
- [x] `src/app/(dashboard)/layout.tsx` のナビゲーション `<nav>` 内の先頭に以下を追加する:
  ```tsx
  <Link href="/dashboard" className="text-text-on-dark-secondary hover:text-white text-sm">
    ダッシュボード
  </Link>
  ```
- [x] 既存のナビゲーションリンク（顧客、引き合い、案件、契約、売上、申請一覧）の順序・スタイルは変更しない

**Acceptance Criteria**:
- `/` にアクセスすると `/dashboard` にリダイレクトされる
- グローバルナビゲーションの先頭に「ダッシュボード」リンクが表示される
- 「ダッシュボード」リンクをクリックすると `/dashboard` に遷移する
- 既存のナビゲーションリンクが維持されている

## T-08: テストの追加

- [x] `src/__tests__/usecases/dashboardActions.test.ts` を新規作成する
- [x] テストケース: ロール一致の pending 承認リクエストが含まれること
- [x] テストケース: ロール不一致の承認リクエストが除外されること
- [x] テストケース: `done === false` のアクションアイテムのみ含まれること
- [x] テストケース: `status === "new"` の引合のみ含まれること
- [x] テストケース: 期日昇順でソートされ、null は末尾であること
- [x] `src/__tests__/usecases/pipelineSummary.test.ts` を新規作成する
- [x] テストケース: 全 5 フェーズの集計結果が返されること
- [x] テストケース: estimatedAmount が null の案件は金額 0 扱いであること
- [x] `src/__tests__/usecases/listInvoicesByOrganization.test.ts` を新規作成する
- [x] テストケース: フィルタなしで全請求が返されること
- [x] テストケース: status フィルタが適用されること
- [x] テストケース: paidAt 期間フィルタが適用されること
- [x] テストケース: issueDate 期間フィルタが適用されること

**Acceptance Criteria**:
- `bun test src/__tests__/usecases/dashboardActions.test.ts` が green
- `bun test src/__tests__/usecases/pipelineSummary.test.ts` が green
- `bun test src/__tests__/usecases/listInvoicesByOrganization.test.ts` が green

## T-09: 最終検証

- [x] `bun run typecheck` が green であることを確認する
- [x] `bun run test` が全件 green であることを確認する
- [x] `bun run build` が成功することを確認する

**Acceptance Criteria**:
- `bun run typecheck` が型エラーなしで完了する
- `bun run test` が全テスト pass する
- `bun run build` が exit 0 で完了する
