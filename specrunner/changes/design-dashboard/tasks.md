# Tasks: ダッシュボード画面のデザイン適用

## T-01: DashboardHeader 共通コンポーネント作成

- [x] `src/app/(dashboard)/dashboard/DashboardHeader.tsx` を新規作成する
- [x] Props: `title: string`, `subtitle: string`, `actions: ReactNode`
- [x] レイアウト: flex、左に `title`（`text-lg font-bold`）+ `subtitle`（`text-xs text-text-muted`）を縦積み、右に `actions` スロット
- [x] `"use client"` は不要（children を受け取るだけの表示コンポーネント）

**Acceptance Criteria**:
- DashboardHeader が title, subtitle, actions を受け取り正しくレンダリングされる
- `typecheck` が green

---

## T-02: SalesDashboard — ヘッダー差し替え + パイプラインサマリ 6 カラム化

- [x] `SalesDashboard.tsx` から `PageToolbar` の import と使用を除去する
- [x] `DashboardHeader` を導入し、title=「ダッシュボード」、subtitle に今日の日付を表示する
- [x] actions スロットに 2 つのボタンを配置する:
  - 「案件を見る」: outline スタイル（`border border-border text-text`）、`/deals` へ `Link`
  - 「引合を登録」: primary スタイル（`bg-primary text-white`）、`/inquiries/new` へ `Link`
- [x] パイプラインサマリを 5 カラムから 6 カラム（`grid-cols-6`）に変更する
- [x] 6 列目に「合計」セルを追加する。件数は `pipelineSummary.reduce((s, i) => s + i.count, 0)`、金額は同様に `totalAmount` を sum
- [x] 合計セルはクリック時 `/deals` へ遷移（フェーズフィルタなし）
- [x] 各セルの件数表示を大きめフォント（`text-xl font-bold`）+ 「件」サフィックスに変更する
- [x] 各セルの金額表示に `font-mono` クラスを付与する
- [x] 各セルに右 border（`border-r border-border`、最終セルは除外）で区切りを入れる
- [x] `SectionCard` でラップする（既存通り）

**Acceptance Criteria**:
- PageToolbar が表示されず、DashboardHeader が表示される
- 「案件を見る」クリックで /deals に遷移する
- 「引合を登録」クリックで /inquiries/new に遷移する
- パイプラインサマリが 6 カラムで表示され、合計列が正しく算出される
- 金額が mono フォントで表示される
- セル間にボーダー区切りがある
- 各セルクリックで /deals?phase=xxx に遷移する（合計は /deals）

---

## T-03: SalesDashboard — 2 カラムメインコンテンツレイアウト

- [x] パイプラインサマリ以降のコンテンツを 2 カラム CSS grid に変更する
- [x] グリッド定義: `grid` + `grid-cols-[1.55fr_1fr]` + `gap-6`（24px）
- [x] 左カラム: アクション待ちリスト（SectionCard）
- [x] 右カラム: 停滞案件（SectionCard）+ 直近の活動（SectionCard）を `space-y-2` で縦積み
- [x] `staleDeals` が `null` の場合（非 manager/admin）、右カラムには直近の活動のみ表示する

**Acceptance Criteria**:
- メインコンテンツが 2 カラムで表示される
- 左カラムの幅比率が約 1.55:1 で右カラムより広い
- カラム間に 24px の gap がある

---

## T-04: SalesDashboard — アクション待ちリスト flex レイアウト化

- [x] `<table>` を `<div>` ベースの flex レイアウトに置換する
- [x] セクションヘッダーに件数表示を追加する（例: `12件`）
- [x] 超過件数がある場合、ヘッダーに赤バッジ（`bg-danger text-white text-2xs rounded-full px-1.5`）で超過件数を表示する
- [x] 超過判定: `approval` は `deadline` が過去、`action_item` は `dueDate` が過去。`inquiry` は超過なし
- [x] 各行を flex で構成する:
  - 左: タイプラベル（62px 固定幅 `w-[62px] shrink-0`）。テキスト・背景色は D4 準拠:
    - approval → 「承認待ち」、`bg-warning/10 text-warning`
    - action_item → 「アクション」、`bg-primary/10 text-primary`
    - inquiry → 「新規引合」、`bg-success/10 text-success`
  - 中央（`flex-1 min-w-0`）: 件名（Link、`text-primary underline truncate`）+ サブテキスト（`text-xs text-text-muted`。approval → approverRole、action_item → description、inquiry → なし）
  - 右（`shrink-0 text-right`）: 日付表示。超過の場合は `text-danger font-bold` + 「超過」ラベル。通常は `text-text-secondary`
- [x] 各行に `border-b border-border-light` + `py-2` を付与する
- [x] 空の場合は「アクション待ちのアイテムはありません」を表示する（既存メッセージ維持）

**Acceptance Criteria**:
- アクション待ちリストがテーブルではなく flex レイアウトで表示される
- 各行にタイプラベルが色分けされて表示される（62px 固定幅）
- 超過アイテムの日付が赤文字 + 「超過」ラベルで表示される
- ヘッダーに件数と超過件数バッジが表示される
- 件名クリックで対応詳細画面に遷移する

---

## T-05: SalesDashboard — 停滞案件レイアウト変更

- [x] `<table>` を `<div>` ベースの flex レイアウトに置換する
- [x] 各行の構成:
  - 上段: 案件名（Link、`text-primary underline`）+ 停滞日数（`text-danger font-bold`、`○日停滞`）を flex で左右配置
  - 下段: サブテキスト（`text-xs text-text-muted`）にフェーズ名・金額（`¥` + toLocaleString）・担当者名を `·`（middle dot）区切りで表示
- [x] 停滞日数の算出: `Math.floor((Date.now() - deal.updatedAt.getTime()) / 86400000)`
- [x] `deal.assigneeName` が null の場合は担当者部分を省略する
- [x] `deal.estimatedAmount` が null の場合は金額部分を省略する
- [x] 各行に `border-b border-border-light` + `py-2` を付与する
- [x] 空の場合は「停滞している案件はありません」を表示する（既存メッセージ維持）

**Acceptance Criteria**:
- 停滞案件がテーブルではなく flex レイアウトで表示される
- 停滞日数が赤文字で表示される
- サブテキストにフェーズ・金額・担当者がドット区切りで表示される
- 案件名クリックで案件詳細に遷移する

---

## T-06: SalesDashboard — 直近の活動 flex レイアウト化

- [x] `<table>` を `<div>` ベースの flex レイアウトに置換する
- [x] `formatRelativeTime(date: Date): string` ユーティリティ関数を `SalesDashboard.tsx` 内に追加する:
  - 1 分未満 → 「たった今」
  - 60 分未満 → 「○分前」
  - 24 時間未満 → 「○時間前」
  - それ以上 → 「○日前」
- [x] 各行を flex で構成する:
  - 左: アクター表示（`w-[46px] shrink-0 text-xs text-text-secondary truncate`）。`actorId` の先頭 8 文字を表示
  - 中央（`flex-1 min-w-0`）: 操作テキスト（`text-xs`）。`{action} {targetType}/{targetId.slice(0,8)}`。targetType + targetId が Link 可能な場合はリンク付き
  - 右（`shrink-0`）: 相対時間（`text-xs text-text-muted`）
- [x] 各行に `border-b border-border-light` + `py-1.5` を付与する
- [x] 空の場合は「活動ログがありません」を表示する（既存メッセージ維持）

**Acceptance Criteria**:
- 直近の活動がテーブルではなく flex レイアウトで表示される
- アクター表示が 46px 幅で固定される
- 時間表示が「○分前」「○時間前」等の相対時間で表示される
- 対象エンティティのリンクが機能する

---

## T-07: FinanceDashboard — ヘッダー差し替え + KPI カードグリッド

- [x] `FinanceDashboard.tsx` から `PageToolbar` の import と使用を除去する
- [x] `DashboardHeader` を導入し、title=「ダッシュボード（経理）」、subtitle に今日の日付を表示する
- [x] actions スロットに「契約を見る」ボタン: outline スタイル（`border border-border text-text`）、`/contracts` へ `Link`
- [x] 「今月の売上サマリ」の SectionCard を 4 カラム KPI グリッドに置換する
- [x] グリッド定義: `grid` + `grid-cols-[1.4fr_1fr_1fr_1fr]` + `gap-3`
- [x] 各 KPI セル（SectionCard 内 div）:
  - セル 1: ラベル「今月の売上」、値 `¥{monthlySalesTotal.toLocaleString()}`（`text-xl font-bold text-success`）
  - セル 2: ラベル「期日超過」、値 `{overdueInvoices.length}件`（`text-xl font-bold text-danger`）
  - セル 3: ラベル「未入金」、値 `{unpaidInvoices.length}件`（`text-xl font-bold text-text`）
  - セル 4: ラベル「請求予定」、値 `{upcomingInvoices.length}件`（`text-xl font-bold text-text`）
- [x] KPI グリッド全体を SectionCard でラップする
- [x] 各セルの値に `font-mono` を付与する

**Acceptance Criteria**:
- PageToolbar が表示されず、DashboardHeader が表示される
- 「契約を見る」クリックで /contracts に遷移する
- 4 カラム KPI グリッドが表示される
- 今月の売上が green（`text-success`）で表示される
- 期日超過件数が赤（`text-danger`）で表示される
- 金額・件数が mono フォントで表示される

---

## T-08: FinanceDashboard — 期日超過テーブル grid 化

- [x] 期日超過セクションの `InvoiceTable` 呼び出しを、専用の grid レイアウトに置換する
- [x] ヘッダー行: 5 カラムグリッド（`grid-cols-[1fr_80px_100px_100px_80px]`）。列: 請求タイトル, 契約, 金額, 支払期日, 超過日数
  - ※ D7 決定に基づき、Invoice モデルに contractName / customerName がないため、「請求タイトル」+「契約リンク」で構成する
- [x] ヘッダー行: `text-table-head text-text-muted bg-bg-table-head py-1.5 px-2`
- [x] データ行: 各フィールドを grid セルとして表示する
  - 請求タイトル: `inv.title`（`text-xs`）
  - 契約: `inv.contractId` を `/contracts/{contractId}` への Link（`text-primary underline text-xs`）
  - 金額: `¥{inv.amount.toLocaleString()}`（`text-xs font-mono text-right`）
  - 支払期日: `formatDate(inv.dueDate)`（`text-xs font-mono text-right`）
  - 超過日数: `{days}日超過`（`text-xs text-danger font-bold text-right`）
- [x] 超過日数の算出: `Math.floor((Date.now() - inv.dueDate.getTime()) / 86400000)`
- [x] 各行に `border-b border-border-light py-1.5 px-2` を付与する
- [x] 空の場合は「期日超過の請求はありません」を表示する

**Acceptance Criteria**:
- 期日超過セクションが grid レイアウトで表示される
- 金額・日付が mono フォントで表示される
- 超過日数が赤文字で表示される
- 契約リンクが機能する

---

## T-09: FinanceDashboard — 下部 2 カラム（未入金 + 請求予定）

- [x] 未入金セクションと請求予定セクションを 2 カラム CSS grid でラップする
- [x] グリッド定義: `grid` + `grid-cols-2` + `gap-4`
- [x] 左カラム: 「未入金の請求」（SectionCard）
- [x] 右カラム: 「請求予定」（SectionCard）
- [x] 両セクションの `InvoiceTable` / `UpcomingInvoiceTable` を flex レイアウトに置換する
- [x] 各行を flex で構成する:
  - 左（`flex-1 min-w-0`）: `inv.title`（`text-xs truncate`）+ 契約リンク（`text-2xs text-text-muted`）
  - 右（`shrink-0 text-right`）: 期日（`text-xs font-mono text-text-secondary`）+ 金額（`text-xs font-mono font-bold`）
- [x] 各行に `border-b border-border-light py-2` を付与する
- [x] 各カラムのヘッダーに件数を表示する（既存の `{n}件` 表示を維持）
- [x] 空の場合は既存メッセージを表示する

**Acceptance Criteria**:
- 未入金と請求予定が 2 カラムで横並び表示される
- 各請求が flex レイアウトで表示される
- 金額・日付が mono フォントで表示される

---

## T-10: 不要コードの除去 + typecheck / test 確認

- [x] `SalesDashboard.tsx` から未使用の import を除去する（`PageToolbar` 等）
- [x] `FinanceDashboard.tsx` から未使用の import / コンポーネント（`InvoiceTable`, `UpcomingInvoiceTable`）を除去する
- [x] `bun run build` が green であることを確認する
- [x] 既存テストが pass することを確認する（`bun test` 等）

**Acceptance Criteria**:
- 未使用 import / コンポーネントが除去されている
- `typecheck` が green
- 既存テストが全件 pass
