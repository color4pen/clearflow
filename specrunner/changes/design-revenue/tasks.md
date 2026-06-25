# Tasks: 売上画面のデザイン適用

## T-01: 確定見込みデータの取得追加

- [x] `src/infrastructure/repositories/revenueRepository.ts` に `getConfirmedRevenue(organizationId, startDate, endDate): Promise<number>` を追加する。invoices テーブルから `status IN ('scheduled', 'invoiced')` かつ期間内のレコードの amount 合計を返す
- [x] `src/application/usecases/getRevenueDashboard.ts` の `RevenueDashboard` 型に `confirmedRevenue: number` フィールドを追加する
- [x] `getRevenueDashboard` 関数の `Promise.all` に `revenueRepository.getConfirmedRevenue(organizationId, currentMonthStart, currentMonthEnd)` を追加し、戻り値に含める

**Acceptance Criteria**:
- `getRevenueDashboard` が `confirmedRevenue` を含むオブジェクトを返す
- `confirmedRevenue` は当月の scheduled + invoiced ステータスの請求合計金額である
- 既存の `currentMonthRevenue`, `monthlyTrend`, `pipelineSummary`, `topCustomers` が引き続き正しく返る
- `bun run build` が成功する

## T-02: 売上ダッシュボード KPI カードの 3 カラム化

- [x] `src/app/(dashboard)/revenue/page.tsx` の KPI エリアを `grid-cols-2` から `grid-cols-3` に変更する
- [x] 1 列目「今月の売上」カードの金額テキストを `text-success` クラス（緑系）に変更する。見出しは「今月の売上」に統一する
- [x] 2 列目に「確定見込み」カードを追加する。`dashboard.confirmedRevenue` の金額を `¥{n.toLocaleString("ja-JP")}` 形式で表示する。見出し下に「契約・請求予定の金額」の補足テキストを `text-xs text-text-muted` で表示する
- [x] 3 列目「パイプライン見込み」カードは既存のフェーズ別内訳表示を維持する

**Acceptance Criteria**:
- KPI カードが 3 列で表示される
- 今月の売上が緑系テキストで表示される
- 確定見込みカードに請求予定金額が表示される
- パイプラインカードの内訳表示が維持される

## T-03: 売上ダッシュボード 月次推移セクションの改善

- [x] 月次推移テーブルの各行に CSS バーを追加する。金額セルの横（または下）に `<div>` を配置し、`width` を `(amount / maxAmount) * 100 + '%'` で算出する。バーの色は `bg-primary` とする
- [x] テーブルの最大金額を `Math.max(...dashboard.monthlyTrend.map(i => i.amount))` で算出し、各行のバー幅計算に使用する
- [x] テーブルを DataTable に置き換えるか、`<tr>` に `data-href` と `cursor-pointer hover:bg-primary/10` を追加する。リンク先は `/revenue/details?startDate={yearMonth}-01&endDate={yearMonth の末日}&axis=monthly` とする
- [x] 末日の算出は `new Date(year, month, 0).getDate()` で行う（例: 2026-05 → 2026-05-31）
- [x] `RowClickHandler` コンポーネントが月次推移テーブルでも動作するよう、既にページ内で DataTable が使用されている（顧客ランキング）ため、RowClickHandler の重複登録に注意する。DataTable を使う場合は rowHref を設定するだけで対応可能

**Acceptance Criteria**:
- 月次推移テーブルの各行に金額に比例した CSS バーが表示される
- 行クリックで `/revenue/details` に月フィルタ付きで遷移する
- 金額ゼロの月は DataTable の既存表示で対応する

## T-04: 売上ダッシュボード 顧客別ランキングのリンク追加

- [x] 顧客別ランキングの DataTable に `rowHref={(row) => `/clients/${row.clientId}`}` を追加する
- [x] RowClickHandler は DataTable コンポーネント内で rowHref 指定時に自動レンダリングされるため、追加作業は不要

**Acceptance Criteria**:
- 顧客行クリックで `/clients/{clientId}` に遷移する
- 行ホバー時に `cursor-pointer` と背景色変化が表示される

## T-05: 売上明細 集計軸タブ UI への変更

- [x] `src/app/(dashboard)/revenue/details/page.tsx` のフィルタフォーム内の `<select name="axis">` を削除する
- [x] 代わりに `aggregationAxisLabels` をイテレートして Link ベースのタブ UI を生成する。各タブは `<Link href={`/revenue/details?startDate=${startDateStr}&endDate=${endDateStr}&axis=${key}`}>` とする
- [x] アクティブタブのスタイル: `bg-primary text-white rounded px-3 py-1 text-sm font-medium`。非アクティブ: `text-text-muted px-3 py-1 text-sm hover:text-text`
- [x] タブ UI はフィルタフォーム（期間指定）の下に配置する。フォームの submit ボタンは期間フィルタ用に残す。CSV エクスポートリンクも維持する

**Acceptance Criteria**:
- 「月別」「顧客別」「案件別」の 3 タブが表示される
- アクティブタブが視覚的に強調される
- タブクリックで axis searchParam が変わりテーブルが切り替わる
- 期間フィルタと CSV エクスポートが引き続き動作する

## T-06: 売上明細 テーブル行クリック遷移の追加

- [x] axis が `customer` の場合: DataTable に `rowHref={(row) => `/clients/${row.clientId}`}` を追加する
- [x] axis が `deal` の場合: DataTable に `rowHref={(row) => `/deals/${row.dealId}`}` を追加する
- [x] axis が `monthly` の場合: 行クリック遷移は不要（明細自体が最終表示）

**Acceptance Criteria**:
- 顧客別テーブルの行クリックで `/clients/{clientId}` に遷移する
- 案件別テーブルの行クリックで `/deals/{dealId}` に遷移する
- 月別テーブルは行クリック遷移なし

## T-07: 予実管理 期間種別セレクタの追加

- [x] `src/app/(dashboard)/revenue/forecast/page.tsx` に `periodType` searchParam のパース処理を追加する。有効値: `monthly` | `quarterly` | `yearly`。デフォルト: `yearly`
- [x] `periodType` に応じた periodStart / periodEnd の算出ロジックを追加する:
  - `yearly`: 当年 1/1 〜 12/31（既存と同じ）
  - `quarterly`: 現在の四半期の開始月 〜 終了月（Q1=1-3, Q2=4-6, Q3=7-9, Q4=10-12）
  - `monthly`: 当月 1 日 〜 末日
- [x] `searchParams` を `Promise<{ periodType?: string }>` に拡張する
- [x] PageToolbar の下に期間種別の Link ベースタブを配置する。3 つのタブ: 「月次」「四半期」「年次」。スタイルは T-05 と同様のタブスタイル
- [x] 前後ナビゲーション（< >）ボタンを追加する。monthly なら前月/次月、quarterly なら前四半期/次四半期、yearly なら前年/次年。Link で `?periodType=...&offset=N` のように実装するか、直接 periodStart/periodEnd を searchParam に持たせる

**Acceptance Criteria**:
- 「月次」「四半期」「年次」の 3 つのタブが表示される
- タブ切替で表示期間が変わる
- デフォルトは「年次」（既存互換）
- 前後ナビゲーションで期間を移動できる

## T-08: 予実管理 目標金額インライン編集

- [x] `src/app/actions/revenue.ts` に `updateRevenueTargetAction(formData: FormData)` を追加する。formData から `targetId` と `targetAmount` を取得し、revenueTargetRepository の update メソッドで更新する。権限チェック（`canPerform(userRole, "revenue", "setTarget")`）を含める
- [x] `src/infrastructure/repositories/revenueTargetRepository.ts` に `update(id, organizationId, data: { targetAmount: number })` メソッドが存在するか確認し、なければ追加する
- [x] 予実管理ページの目標カード内「目標金額」の `<p>` 表示を、`canSetTarget` の場合は `<form action={updateRevenueTargetAction}>` + `<MoneyInput>` + hidden `targetId` + submit ボタンに置き換える。`canSetTarget` でない場合は従来の `<p>` 表示を維持する
- [x] submit ボタンは小さめのテキストリンクスタイル（「保存」、`text-xs text-primary underline`）とする

**Acceptance Criteria**:
- 権限のあるユーザーが既存目標の金額を直接編集・保存できる
- 保存後にページがリフレッシュされ更新後の金額と進捗率が表示される
- 権限のないユーザーには金額が読み取り専用で表示される

## T-09: 予実管理 プログレスバーの着地予測表示改善

- [x] 予実管理ページのプログレスバー（`<div className="w-full bg-gray-200 rounded-full h-2">`）を 2 セグメント構成に変更する
- [x] セグメント 1（実績）: `bg-primary` で `width: progressRate * 100 + '%'`（既存と同じ）
- [x] セグメント 2（パイプライン分）: `bg-primary/30` で `width: Math.min((pipelineRate - progressRate) * 100, 100 - progressRate * 100) + '%'`。ここで `pipelineRate = landingForecast / targetAmount`
- [x] 2 セグメントの実装方法: バー全体を `flex` にし、2 つの子 `<div>` を並べる。または `background: linear-gradient(...)` で表現する
- [x] 着地予測の数値表示（既存の `¥{item.landingForecast.toLocaleString("ja-JP")}` ラベル）は維持する

**Acceptance Criteria**:
- プログレスバーが実績（濃い primary）とパイプライン見込み（薄い primary）の 2 色で表示される
- 着地予測が目標を超える場合、バーは 100% で止まる
- 着地予測の金額が数値でも表示される
