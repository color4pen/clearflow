# Tasks: 売上モジュールの実装

## T-01: revenue_targets テーブルのスキーマ定義とマイグレーション

- [ ] `src/infrastructure/schema.ts` に `revenueTargets` テーブル定義を追加する:
  - `id`: `uuid("id").primaryKey().defaultRandom()`
  - `organizationId`: `uuid("organization_id").notNull().references(() => organizations.id)`
  - `periodStart`: `timestamp("period_start").notNull()`
  - `periodEnd`: `timestamp("period_end").notNull()`
  - `targetAmount`: `integer("target_amount").notNull()`
  - `createdAt`: `timestamp("created_at").defaultNow().notNull()`
  - `updatedAt`: `timestamp("updated_at").defaultNow().notNull()`
- [ ] `revenueTargetsRelations` を追加する（`organization` への `one` リレーション）
- [ ] `organizationsRelations` に `revenueTargets: many(revenueTargets)` を追加する
- [ ] `bun run db:generate` でマイグレーション SQL を生成する

**Acceptance Criteria**:
- マイグレーション SQL が `drizzle/` 配下に生成されている
- `revenueTargets` テーブルの全カラムが NOT NULL（id, organizationId, periodStart, periodEnd, targetAmount, createdAt, updatedAt）
- `organizationId` が organizations テーブルへの FK を持つ

## T-02: ドメインモデルの追加（RevenueTarget と集計結果型）

- [ ] `src/domain/models/revenueTarget.ts` を新規作成する:
  - `RevenueTarget` 型: `{ id, organizationId, periodStart: Date, periodEnd: Date, targetAmount: number, createdAt: Date, updatedAt: Date }`
- [ ] `src/domain/models/revenue.ts` を新規作成する — 集計結果の型定義:
  - `MonthlyRevenue`: `{ yearMonth: string, amount: number, count: number }`
  - `CustomerRevenue`: `{ clientId: string, clientName: string, amount: number, count: number }`
  - `DealRevenue`: `{ dealId: string, dealTitle: string, amount: number, count: number }`
  - `PipelineSummary`: `{ phase: DealPhase, dealCount: number, estimatedAmount: number }`
- [ ] `src/domain/models/index.ts` に `RevenueTarget`, `MonthlyRevenue`, `CustomerRevenue`, `DealRevenue`, `PipelineSummary` の export を追加する

**Acceptance Criteria**:
- `RevenueTarget` 型が `src/domain/models/revenueTarget.ts` に定義されている
- 集計結果型（`MonthlyRevenue`, `CustomerRevenue`, `DealRevenue`, `PipelineSummary`）が `src/domain/models/revenue.ts` に定義されている
- `src/domain/models/index.ts` から全型が export されている
- TypeScript コンパイルエラーがない

## T-03: 認可マトリクスに revenue エンティティを追加する

- [ ] `src/domain/authorization.ts` の `Entity` 型に `"revenue"` を追加する
- [ ] `PERMISSION_MATRIX` に `revenue` エントリを追加する:
  - `view`: 全ロール（`ALL_ROLES`）
  - `setTarget`: `admin`, `manager`（`ADMIN_MANAGER`）
  - `export`: `admin`, `manager`, `finance`（`ADMIN_MANAGER_FINANCE`）

**Acceptance Criteria**:
- `canPerform("member", "revenue", "view")` が `true` を返す
- `canPerform("admin", "revenue", "setTarget")` が `true` を返す
- `canPerform("manager", "revenue", "setTarget")` が `true` を返す
- `canPerform("finance", "revenue", "setTarget")` が `false` を返す
- `canPerform("member", "revenue", "setTarget")` が `false` を返す
- `canPerform("finance", "revenue", "export")` が `true` を返す
- `canPerform("member", "revenue", "export")` が `false` を返す

## T-04: revenueRepository（集計クエリ専用）の実装

- [ ] `src/infrastructure/repositories/revenueRepository.ts` を新規作成する
- [ ] `getMonthlyRevenue(organizationId: string, startDate: Date, endDate: Date): Promise<MonthlyRevenue[]>` を実装する:
  - `invoices` JOIN `contracts` で `organizationId` フィルタ
  - `invoices.status = "paid"` AND `invoices.paidAt IS NOT NULL` AND `invoices.paidAt BETWEEN startDate AND endDate`
  - `DATE_TRUNC('month', paid_at)` で GROUP BY し、SUM(amount) と COUNT(*) を取得
  - 結果を `yearMonth`（`YYYY-MM` 形式）でソート
- [ ] `getCustomerRevenue(organizationId: string, startDate: Date, endDate: Date, limit?: number): Promise<CustomerRevenue[]>` を実装する:
  - `invoices` JOIN `contracts` JOIN `clients` で集計
  - `status = "paid"` AND `paidAt` 期間フィルタ
  - `clients.id`, `clients.name` で GROUP BY し、SUM(amount), COUNT(*) を取得
  - amount DESC でソート、limit が指定されていれば LIMIT を適用
- [ ] `getDealRevenue(organizationId: string, startDate: Date, endDate: Date): Promise<DealRevenue[]>` を実装する:
  - `invoices` JOIN `contracts` JOIN `deals` で集計
  - `status = "paid"` AND `paidAt` 期間フィルタ
  - `deals.id`, `deals.title` で GROUP BY し、SUM(amount), COUNT(*) を取得
  - amount DESC でソート
- [ ] `getPipelineSummary(organizationId: string): Promise<PipelineSummary[]>` を実装する:
  - `deals` テーブルから `phase IN ('proposal_prep', 'proposed', 'negotiation')` でフィルタ
  - `phase` で GROUP BY し、COUNT(*) と `SUM(COALESCE(estimated_amount, 0))` を取得
- [ ] `src/infrastructure/repositories/index.ts` に `export * as revenueRepository from "./revenueRepository"` を追加する

**Acceptance Criteria**:
- 4 つの集計関数が実装されている
- 全関数が `organizationId` でテナント分離している
- パイプライン集計で `won` と `lost` フェーズが除外される
- `estimatedAmount` が NULL の案件は 0 として集計される
- TypeScript コンパイルエラーがない

## T-05: revenueTargetRepository（CRUD）の実装

- [ ] `src/infrastructure/repositories/revenueTargetRepository.ts` を新規作成する
- [ ] `mapRow` 関数を実装する（DB row → `RevenueTarget` ドメインモデル）
- [ ] `create(data: { organizationId, periodStart, periodEnd, targetAmount }, tx?)` を実装する
- [ ] `findById(id, organizationId, tx?)` を実装する
- [ ] `findByOrganization(organizationId)` を実装する — 全目標を `periodStart` ASC でソート
- [ ] `findByPeriod(organizationId, date: Date, tx?)` を実装する — 指定日が `periodStart <= date <= periodEnd` に含まれる目標を返す
- [ ] `findOverlapping(organizationId, periodStart, periodEnd, excludeId?, tx?)` を実装する — 期間が重複する目標を検索する（`NOT (period_end <= startDate OR period_start >= endDate)` 条件）
- [ ] `update(id, organizationId, data: Partial<{ periodStart, periodEnd, targetAmount }>, tx?)` を実装する
- [ ] `deleteById(id, organizationId, tx?)` を実装する
- [ ] `src/infrastructure/repositories/index.ts` に `export * as revenueTargetRepository from "./revenueTargetRepository"` を追加する

**Acceptance Criteria**:
- CRUD 関数が全て実装されている
- 全関数が `organizationId` でテナント分離している
- `findOverlapping` が正しく期間重複を検出する
- TypeScript コンパイルエラーがない

## T-06: 売上集計ユースケースの実装

- [ ] `src/application/usecases/getRevenueDashboard.ts` を新規作成する:
  - 引数: `{ organizationId }`
  - 今月の開始日・終了日を算出し、`revenueRepository.getMonthlyRevenue` で今月の合計を取得
  - 12 ヶ月前の開始日を算出し、`revenueRepository.getMonthlyRevenue` で月次推移を取得
  - `revenueRepository.getPipelineSummary` でパイプライン集計を取得
  - `revenueRepository.getCustomerRevenue` で顧客別トップ 10 を取得
  - 全結果をまとめて返す
- [ ] `src/application/usecases/getRevenueDetails.ts` を新規作成する:
  - 引数: `{ organizationId, startDate, endDate, axis: "monthly" | "customer" | "deal" }`
  - `axis` に応じて `revenueRepository` の対応する関数を呼び出す
- [ ] `src/application/usecases/index.ts` に export を追加する

**Acceptance Criteria**:
- `getRevenueDashboard` が 4 種の集計データを含むオブジェクトを返す
- `getRevenueDetails` が axis パラメータに応じて正しい集計関数を呼び出す
- TypeScript コンパイルエラーがない

## T-07: 予実管理ユースケースの実装

- [ ] `src/application/usecases/setRevenueTarget.ts` を新規作成する:
  - 引数: `{ organizationId, periodStart, periodEnd, targetAmount }`
  - `revenueTargetRepository.findOverlapping` で期間重複をチェックし、重複があれば `{ ok: false, reason: "指定した期間には既に目標が設定されています" }` を返す
  - `targetAmount > 0` をバリデーションする
  - `periodStart < periodEnd` をバリデーションする
  - `revenueTargetRepository.create` で目標を作成する
  - `{ ok: true, target }` を返す
- [ ] `src/application/usecases/updateRevenueTarget.ts` を新規作成する:
  - 引数: `{ id, organizationId, periodStart?, periodEnd?, targetAmount? }`
  - `revenueTargetRepository.findById` で存在確認
  - 期間が変更される場合は `findOverlapping` で重複チェック（自身を除外）
  - `targetAmount` が指定されている場合は `> 0` をバリデーション
  - `revenueTargetRepository.update` で更新する
- [ ] `src/application/usecases/deleteRevenueTarget.ts` を新規作成する:
  - 引数: `{ id, organizationId }`
  - `revenueTargetRepository.deleteById` で削除する
- [ ] `src/application/usecases/getRevenueForecast.ts` を新規作成する:
  - 引数: `{ organizationId, periodStart, periodEnd }`
  - `revenueTargetRepository.findByOrganization` で対象期間の目標を取得
  - `revenueRepository.getMonthlyRevenue` で対象期間の実績を取得
  - `revenueRepository.getPipelineSummary` でパイプライン見込みを取得
  - 各目標に対して: 実績金額、進捗率（実績 / 目標）、着地予測（実績 + パイプライン合計）を算出
- [ ] `src/application/usecases/index.ts` に export を追加する

**Acceptance Criteria**:
- `setRevenueTarget` が期間重複時にエラーを返す
- `setRevenueTarget` が targetAmount <= 0 でエラーを返す
- `setRevenueTarget` が periodStart >= periodEnd でエラーを返す
- `updateRevenueTarget` が存在しない ID でエラーを返す
- `getRevenueForecast` が目標・実績・進捗率・着地予測を含む結果を返す

## T-08: Server Action の実装（売上目標 CRUD）

- [ ] `src/app/actions/revenue.ts` を新規作成する
- [ ] `setRevenueTargetAction(formData: FormData)` を実装する:
  - `auth()` で認証チェック
  - `canPerform(role, "revenue", "setTarget")` で認可チェック
  - `checkRateLimit` でレート制限チェック
  - Zod スキーマで `periodStart`（string → Date）、`periodEnd`（string → Date）、`targetAmount`（coerce number, positive integer）をバリデーション
  - `setRevenueTarget` usecase を呼び出す
  - `revalidatePath("/revenue/forecast")` で再検証
- [ ] `updateRevenueTargetAction(formData: FormData)` を実装する:
  - 認証・認可・レート制限チェック
  - Zod スキーマで `id`（UUID）、`periodStart?`、`periodEnd?`、`targetAmount?` をバリデーション
  - `updateRevenueTarget` usecase を呼び出す
  - `revalidatePath("/revenue/forecast")` で再検証
- [ ] `deleteRevenueTargetAction(id: string)` を実装する:
  - 認証・認可チェック
  - `deleteRevenueTarget` usecase を呼び出す
  - `revalidatePath("/revenue/forecast")` で再検証

**Acceptance Criteria**:
- 認証なしの呼び出しでエラーが返る
- `member` ロールの呼び出しで認可エラーが返る
- `admin` ロールで正常に目標が作成される
- FormData のバリデーションエラーが適切なメッセージで返る

## T-09: 売上ダッシュボードページ `/revenue` の実装

- [ ] `src/app/(dashboard)/revenue/page.tsx` を新規作成する
- [ ] `auth()` でセッションを取得し、`getRevenueDashboard` usecase を呼び出す
- [ ] 今月の入金確認済み合計金額を `SectionCard` で表示する（`¥` + `toLocaleString("ja-JP")` フォーマット）
- [ ] 月次推移データを `SectionCard` 内のテーブルまたはリストで表示する（12 ヶ月分）
- [ ] パイプライン売上予測を `SectionCard` で表示する（フェーズ名、案件数、合計金額）
  - フェーズ名は `labels.ts` の `phaseLabels` を使用する
- [ ] 顧客別売上ランキング（上位 10 社）を `SectionCard` + `DataTable` で表示する
- [ ] `PageToolbar` で「売上ダッシュボード」タイトルを表示する

**Acceptance Criteria**:
- `/revenue` にアクセスすると売上ダッシュボードが表示される
- 今月の合計金額が正しくフォーマットされている
- 月次推移データが 12 ヶ月分表示される
- パイプラインのフェーズ名が日本語ラベルで表示される
- 顧客別ランキングが金額降順で最大 10 社表示される

## T-10: 売上明細ページ `/revenue/details` の実装

- [ ] `src/app/(dashboard)/revenue/details/page.tsx` を新規作成する
- [ ] URL の searchParams から `startDate`、`endDate`、`axis` パラメータを取得する
- [ ] デフォルト値: `startDate` = 当月初日、`endDate` = 当月末日、`axis` = `"monthly"`
- [ ] フィルタ UI を実装する — 開始日・終了日の入力と集計軸の選択（月別 / 顧客別 / 案件別）
  - 集計軸の変更は searchParams を更新する方式で実装する（Server Component 対応）
- [ ] `getRevenueDetails` usecase を呼び出し、結果を `DataTable` で表示する
  - 月別: 列 = 期間, 金額, 件数
  - 顧客別: 列 = 顧客名, 金額, 件数
  - 案件別: 列 = 案件名, 金額, 件数
- [ ] CSV エクスポートボタンを表示する — `/api/revenue/export?startDate=...&endDate=...&axis=...` へのリンク
- [ ] `PageToolbar` で「売上明細」タイトルを表示する

**Acceptance Criteria**:
- `/revenue/details` にアクセスすると売上明細ページが表示される
- 期間フィルタで開始日・終了日を指定できる
- 集計軸を切り替えるとテーブルの内容が変わる
- CSV エクスポートボタンが表示される

## T-11: CSV エクスポート API エンドポイントの実装

- [ ] `src/app/api/revenue/export/route.ts` を新規作成する
- [ ] GET ハンドラを実装する:
  - `auth()` で認証チェック（未認証なら 401）
  - `canPerform(role, "revenue", "export")` で認可チェック（権限なしなら 403）
  - searchParams から `startDate`、`endDate`、`axis` を取得・バリデーション
  - `axis` に応じて `revenueRepository` の対応する集計関数を呼び出す
  - CSV ヘッダーと行を `axis` に応じて構築する:
    - `monthly`: `期間,金額,件数`
    - `customer`: `顧客名,金額,件数`
    - `deal`: `案件名,金額,件数`
  - 全フィールドに `escapeCsvValue` を適用する（既存の audit-log export と同じパターン）
  - BOM 付き UTF-8 で Response を返す
  - `Content-Disposition: attachment; filename="revenue-export-YYYY-MM-DD.csv"`

**Acceptance Criteria**:
- 認証なしリクエストで 401 が返る
- `member` ロールのリクエストで 403 が返る
- `admin` / `manager` / `finance` ロールで CSV ファイルがダウンロードされる
- CSV に BOM が含まれている
- CSV の各フィールドがインジェクション対策されている

## T-12: 予実管理ページ `/revenue/forecast` の実装

- [ ] `src/app/(dashboard)/revenue/forecast/page.tsx` を新規作成する
- [ ] `auth()` でセッション取得
- [ ] `getRevenueForecast` usecase を呼び出し、目標リストと実績データを取得する
- [ ] 各目標に対して以下を表示する:
  - 期間（periodStart 〜 periodEnd）
  - 目標金額
  - 実績金額
  - 進捗率（実績 / 目標、パーセント表示）
  - 着地予測（実績 + パイプライン合計）
- [ ] `canPerform(role, "revenue", "setTarget")` が true のユーザーに目標設定フォームを表示する:
  - 期間の開始日・終了日入力
  - 目標金額入力（`MoneyInput` コンポーネント使用）
  - 送信ボタン（`setRevenueTargetAction` を呼び出す）
- [ ] 既存目標の削除ボタンを認可ユーザーにのみ表示する（`deleteRevenueTargetAction` を呼び出す）
- [ ] `PageToolbar` で「予実管理」タイトルを表示する

**Acceptance Criteria**:
- `/revenue/forecast` にアクセスすると予実管理ページが表示される
- 目標金額、実績金額、進捗率、着地予測が表示される
- `admin` / `manager` ロールでは目標設定フォームが表示される
- `member` / `finance` ロールでは目標設定フォームが表示されない（閲覧のみ）
- 目標の作成・削除が正常に動作する

## T-13: ナビゲーションに「売上」リンクを追加する

- [ ] `src/app/(dashboard)/layout.tsx` のナビゲーション部分に「売上」リンクを追加する:
  - 「契約」リンクの後に配置する
  - `<Link href="/revenue" className="text-text-on-dark-secondary hover:text-white text-sm">売上</Link>`
  - 全ロールに表示する（`isAdmin` による条件分岐なし）

**Acceptance Criteria**:
- ダッシュボードのナビゲーションに「売上」リンクが表示される
- リンクをクリックすると `/revenue` に遷移する
- 「契約」と「申請一覧」の間に配置されている

## T-14: ラベル定義の追加

- [ ] `src/app/(dashboard)/labels.ts` に以下を追加する:
  - `aggregationAxisLabels`: `{ monthly: "月別", customer: "顧客別", deal: "案件別" }`

**Acceptance Criteria**:
- `aggregationAxisLabels` が `labels.ts` に定義されている
- TypeScript コンパイルエラーがない

## T-15: typecheck と test の確認

- [ ] `bun run typecheck` が型エラーなしで完了する
- [ ] `bun run test` が全テスト green で完了する
- [ ] 既存の全テストが引き続き pass する

**Acceptance Criteria**:
- `bun run typecheck && bun run test` が exit 0 で完了する
