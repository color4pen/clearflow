# Test Cases: 画面骨格の格上げ

## Summary

- **Total**: 58 cases
- **Automated** (unit/integration): 55
- **Manual**: 3
- **Priority**: must: 51, should: 7, could: 0

---

## PageToolbar

### TC-001: PageToolbar がタイトルを h1 で描画する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: PageToolbar はページタイトルを h1 要素で描画する > Scenario: PageToolbar がタイトルを h1 で描画する

---

### TC-002: PageToolbar の外枠に bg-bg-toolbar が含まれない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: PageToolbar はページタイトルを h1 要素で描画する > Scenario: PageToolbar の外枠に bg-bg-toolbar が含まれない

---

### TC-016: requests/page.tsx がインラインの bg-bg-toolbar を使わない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/app/(dashboard)/requests/page.tsx` のソースコードを読む
**WHEN** div 要素のクラス文字列を確認する
**THEN** インライン実装の `bg-bg-toolbar border border-border` div が存在せず、`PageToolbar` コンポーネントがタイトル「申請管理」を描画している

---

### TC-017: PageToolbar の | 区切り span が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/app/components/PageToolbar.tsx` のソースコードを読む
**WHEN** span 要素を検索する
**THEN** `text-border mx-1` を持つ `|` 区切り span が存在しない

---

### TC-018: actions が ml-auto コンテナでラップされている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/app/components/PageToolbar.tsx` のソースコードを読む
**WHEN** actions の描画コードを確認する
**THEN** `ml-auto` および `flex items-center gap-3` を持つコンテナ内に `actions` が配置されている

---

## 新規作成ボタン

### TC-006: deals/page.tsx の新規作成が BTN_PRIMARY を使用する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 新規作成導線 6 箇所が BTN_PRIMARY スタイルのリンクである > Scenario: deals/page.tsx の新規作成が BTN_PRIMARY を使用する

---

### TC-007: contracts/page.tsx に新規作成リンクが存在しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 新規作成導線 6 箇所が BTN_PRIMARY スタイルのリンクである > Scenario: contracts/page.tsx に新規作成リンクが存在しない

---

### TC-019: inquiries/page.tsx の新規作成が BTN_PRIMARY を使用する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/app/(dashboard)/inquiries/page.tsx` のソースコードを読む
**WHEN** 新規登録 Link のクラスと文言を確認する
**THEN** `bg-primary text-white` を含むクラスが存在し、`[新規登録]` というブラケット表記が存在せず、`＋ 新規登録` テキストを含む

---

### TC-020: clients/page.tsx の新規作成が BTN_PRIMARY を使用する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/app/(dashboard)/clients/page.tsx` のソースコードを読む
**WHEN** 新規登録 Link のクラスと文言を確認する
**THEN** `bg-primary text-white` を含むクラスが存在し、`[新規登録]` というブラケット表記が存在せず、`＋ 新規登録` テキストを含む

---

### TC-021: requests/page.tsx の新規作成が BTN_PRIMARY を使用する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/app/(dashboard)/requests/page.tsx` のソースコードを読む
**WHEN** 新規作成 Link のクラスと文言を確認する
**THEN** `bg-primary text-white` を含むクラスが存在し、`[新規作成]` というブラケット表記が存在せず、`＋ 新規作成` テキストを含む

---

### TC-022: settings/policies/page.tsx の新規作成が BTN_PRIMARY を使用する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/app/(dashboard)/settings/policies/page.tsx` のソースコードを読む
**WHEN** ポリシー追加 Link のクラスと文言を確認する
**THEN** `bg-primary text-white` を含むクラスが存在し、`[ポリシーを追加]` というブラケット表記が存在せず、`＋ ポリシーを追加` テキストを含む

---

### TC-023: settings/templates/page.tsx の新規作成が BTN_PRIMARY を使用する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/app/(dashboard)/settings/templates/page.tsx` のソースコードを読む
**WHEN** テンプレート追加 Link のクラスと文言を確認する
**THEN** `bg-primary text-white` を含むクラスが存在し、`[テンプレートを追加]` というブラケット表記が存在せず、`＋ テンプレートを追加` テキストを含む

---

## CreateTaskButton

### TC-024: CreateTaskButton.tsx が存在し use client を持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/app/(dashboard)/tasks/CreateTaskButton.tsx` のソースコードを読む
**WHEN** ファイルの存在と先頭ディレクティブを確認する
**THEN** ファイルが存在し、`"use client"` ディレクティブを持ち、`BTN_PRIMARY` スタイルのボタンとモーダルダイアログの JSX が含まれる

---

### TC-025: TaskList.tsx に create 関連 state が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/app/(dashboard)/tasks/TaskList.tsx` のソースコードを読む
**WHEN** state 定義と modal 関連コードを確認する
**THEN** `showAddModal`・`handleOpenAdd` 等の create 関連 state が存在せず、モーダルダイアログ JSX ブロックが存在しない

---

### TC-026: tasks/page.tsx の PageToolbar に CreateTaskButton が配置されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/app/(dashboard)/tasks/page.tsx` のソースコードを読む
**WHEN** PageToolbar の actions prop を確認する
**THEN** `CreateTaskButton` コンポーネントが `actions` prop として PageToolbar に渡されている

---

## EmptyState

### TC-003: icon あり EmptyState を描画する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: EmptyState コンポーネントは icon・message・children を条件に応じて描画する > Scenario: icon あり EmptyState を描画する

---

### TC-004: icon なし EmptyState を描画する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: EmptyState コンポーネントは icon・message・children を条件に応じて描画する > Scenario: icon なし EmptyState を描画する

---

### TC-005: children を持つ EmptyState を描画する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: EmptyState コンポーネントは icon・message・children を条件に応じて描画する > Scenario: children を持つ EmptyState を描画する

---

### TC-027: EmptyState が py-10 text-center を持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/app/components/EmptyState.tsx` のソースコードを読む
**WHEN** 外枠 div のクラスを確認する
**THEN** `py-10` および `text-center` が外枠に含まれ、メッセージに `text-xs text-text-muted` が使われている

---

### TC-028: EmptyState が index.ts からエクスポートされている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/app/components/index.ts` のソースコードを読む
**WHEN** エクスポート定義を確認する
**THEN** `EmptyState` が `./EmptyState` からエクスポートされている

---

### TC-029: 一覧 6 ページで EmptyState が適切な絵文字を設定している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** clients/page.tsx・deals/page.tsx・contracts/page.tsx・inquiries/InquiryListView.tsx・tasks/TaskList.tsx・requests/page.tsx の各ソースコードを読む
**WHEN** 0 件表示の実装を確認する
**THEN** 各ファイルが `EmptyState` コンポーネントを使用し、icon prop に clients 🏢 / deals 💼 / contracts 📁 / inquiries 📨 / tasks 📋 / requests 📝 の絵文字がそれぞれ設定されている

---

### TC-030: 詳細サブセクション 0 件は deals/[id] と clients/[id] のみ EmptyState を適用している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/deals/[id]/page.tsx` と `src/app/(dashboard)/clients/[id]/page.tsx` のソースコードを読む
**WHEN** サブセクションの 0 件表示を確認する
**THEN** `EmptyState` コンポーネントが使用され `icon` prop が省略されている（文言不変）

---

### TC-031: 一覧の既存導線リンクが children として維持されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** clients/page.tsx・deals/page.tsx 等の一覧ページのソースコードを読む
**WHEN** EmptyState コンポーネントの children を確認する
**THEN** 「最初の○○を登録する」等の導線リンクが文言・href ともに変更されず、EmptyState の `children` として渡されている

---

## タブ統一

### TC-011: InquiryListView のタブが border-b-2 を使用する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: タブは下線式（border-b-2）スタイルに統一されている > Scenario: InquiryListView のタブが border-b-2 を使用する

---

### TC-012: RequestTabs の件数 pill が削除されている

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: タブは下線式（border-b-2）スタイルに統一されている > Scenario: RequestTabs の件数 pill が削除されている

---

### TC-032: tasks/page.tsx のタブが RequestTabs 準拠クラス構成になっている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/app/(dashboard)/tasks/page.tsx` のソースコードを読む
**WHEN** 未完了・完了タブの button クラスを確認する
**THEN** active 時に `border-b-2 border-primary text-primary font-bold`、非 active 時に `border-b-2 border-transparent text-text-secondary` が含まれ、RequestTabs と同系統のクラス構成になっている

---

### TC-033: RequestTabs が `{tab.label} ({tab.count})` 形式を描画する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/app/(dashboard)/requests/RequestTabs.tsx` のソースコードを読む
**WHEN** 件数の描画コードを確認する
**THEN** `tab.count` が `({tab.count})` または同等のインラインテキスト形式で描画され、`rounded-full bg-primary text-white` の pill クラスが存在しない

---

### TC-034: tasks の「自分のタスク/全員」フィルタが現行スタイルを維持している

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** `src/app/(dashboard)/tasks/page.tsx` のソースコードを読む
**WHEN** 「自分のタスク」「全員」の切替 Link のクラスを確認する
**THEN** 下線式タブとは異なる現行スタイルが維持されており、URL パラメータによる切替実装が変更されていない

---

## 詳細ヒーロー

### TC-008: inquiries/[id] のヒーロー行に h1 と StatusBadge が存在する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 詳細ヒーロー行は h1 と StatusBadge が同一 flex コンテナに存在する > Scenario: inquiries/[id] のヒーロー行に h1 と StatusBadge が存在する

---

### TC-009: contracts/[id] のヒーロー行でステータスバッジが dl から移動している

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 詳細ヒーロー行は h1 と StatusBadge が同一 flex コンテナに存在する > Scenario: contracts/[id] のヒーロー行でステータスバッジが dl から移動している

---

### TC-010: requests/[id] のカード外にヒーロー行が存在する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 詳細ヒーロー行は h1 と StatusBadge が同一 flex コンテナに存在する > Scenario: requests/[id] のカード外にヒーロー行が存在する

---

### TC-035: contracts/[id] の「案件を表示」「顧客を表示」リンクが ml-auto コンテナ内に存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/contracts/[id]/page.tsx` のソースコードを読む
**WHEN** ヒーロー行の ml-auto コンテナの内容を確認する
**THEN** `ml-auto` コンテナ内に `/deals/${contract.dealId}` リンクと `/clients/${contract.clientId}` リンクが存在し、dl には案件・顧客リンクが残存しない

---

### TC-036: contracts/[id]/invoices/[invoiceId] のヒーロー行に h1 と StatusBadge が存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx` のソースコードを読む
**WHEN** ヒーロー行のマークアップを確認する
**THEN** `flex items-center gap-2 flex-wrap` コンテナ内に `<h1` と `StatusBadge` が存在し、`bg-bg-toolbar border border-border` の旧バーが存在しない

---

### TC-037: contracts/[id]/invoices/[invoiceId] のパンくずに契約詳細リンクが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx` のソースコードを読む
**WHEN** パンくず行のリンクを確認する
**THEN** `/contracts` へのリンクと `/contracts/${contractId}` への契約詳細リンクが両方存在し「契約一覧 > 契約名 > 請求タイトル」順になっている

---

### TC-038: contracts/[id]/invoices/[invoiceId] の dl 内にステータス行が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx` のソースコードを読む
**WHEN** dl 内の dt 要素を確認する
**THEN** `<dt>ステータス</dt>` の行が dl 内に存在しない

---

### TC-039: requests/[id] に「← 申請一覧に戻る」テキストが存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx` のソースコードを読む
**WHEN** 先頭リンクのテキストを確認する
**THEN** 「← 申請一覧に戻る」テキストが存在せず、パンくずに `/requests` へのリンクが存在し「申請一覧」テキストを持つ

---

### TC-040: requests/[id] の SectionCard 内 border-b ブロックが存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx` のソースコードを読む
**WHEN** SectionCard 内のクラスを確認する
**THEN** `border-b border-border px-4 py-3` のヘッダーブロックが SectionCard 内に存在しない

---

### TC-041: requests/[id] の ActionButtons が SectionCard 内に存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx` のソースコードを読む
**WHEN** ActionButtons コンポーネントの配置を確認する
**THEN** `ActionButtons` が SectionCard 内（ステッパー下）に引き続き存在する

---

### TC-042: inquiries/[id] の DeleteInquiryButton が ml-auto に移動していない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/inquiries/[id]/page.tsx` のソースコードを読む
**WHEN** DeleteInquiryButton の配置を確認する
**THEN** `DeleteInquiryButton` が ml-auto コンテナ外（Actions SectionCard 内）に存在する

---

### TC-043: contracts/[id] の dl から案件・顧客リンクが削除されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/contracts/[id]/page.tsx` のソースコードを読む
**WHEN** SectionCard 内の dl の内容を確認する
**THEN** dl 内の案件表示リンクと顧客表示リンクが dl から削除されており（ml-auto コンテナに移動済み）、dl に重複が存在しない

---

## ログイン画面

### TC-013: ログイン画面のエラー表示がトークン参照を使用する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: src/app 配下に生パレットクラスを新たに持ち込まない > Scenario: ログイン画面のエラー表示がトークン参照を使用する

---

### TC-014: globals.css に --bg-login-gradient が定義されている

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ログイン画面のグラジエント背景は CSS カスタムプロパティ経由で適用される > Scenario: globals.css に --bg-login-gradient が定義されている

---

### TC-015: ログイン画面のサブコピーが変更されている

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ログイン画面のグラジエント背景は CSS カスタムプロパティ経由で適用される > Scenario: ログイン画面のサブコピーが変更されている

---

### TC-044: login/page.tsx の最外 div に bg-bg-page が含まれない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** `src/app/(auth)/login/page.tsx` のソースコードを読む
**WHEN** 最外 div のクラスを確認する
**THEN** `bg-bg-page` が含まれず、`var(--bg-login-gradient)` を参照する `style` 属性が付与されている

---

### TC-045: login/page.tsx の h1 が text-xl font-bold text-primary を含む

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** `src/app/(auth)/login/page.tsx` のソースコードを読む
**WHEN** ロゴ h1 のクラスを確認する
**THEN** `text-xl font-bold text-primary` が含まれ、旧クラス `text-sm font-bold text-text` が存在しない

---

### TC-046: login/page.tsx のカードが rounded-xl shadow-lg を含む

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-14

**GIVEN** `src/app/(auth)/login/page.tsx` のソースコードを読む
**WHEN** SectionCard の className prop を確認する
**THEN** `rounded-xl` と `shadow-lg` が含まれ、幅制約は外側ラッパーの `max-w-[380px]` で担われている

---

### TC-047: [data-theme="dark"] ブロックにも --bg-login-gradient が定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** `src/app/globals.css` のソースコードを読む
**WHEN** `[data-theme="dark"]` ブロック内のカスタムプロパティを確認する
**THEN** `--bg-login-gradient` が `[data-theme="dark"]` ブロック内にも定義されている

---

### TC-048: login/page.tsx の「ログイン」h3 ラベルが削除されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-14

**GIVEN** `src/app/(auth)/login/page.tsx` のソースコードを読む
**WHEN** h3 要素の存在を確認する
**THEN** `text-sm font-bold text-text mb-4` を持つ「ログイン」h3 ラベルが存在しない

---

## テスト整備

### TC-049: pageToolbar.test.ts が存在し全テストが green

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** `src/__tests__/components/pageToolbar.test.ts` のソースコードを読む
**WHEN** テストファイルの内容を確認し bun test で実行する
**THEN** ファイルが存在し、`<h1`・`text-lg font-bold`・`bg-bg-toolbar 非存在` の 3 項目以上のテストを含み、全テストが green となる

---

### TC-050: emptyState.test.ts が存在し全テストが green

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** `src/__tests__/components/emptyState.test.ts` のソースコードを読む
**WHEN** テストファイルの内容を確認し bun test で実行する
**THEN** ファイルが存在し、icon 条件分岐・message 描画・children 描画・`text-xs text-text-muted`・`py-10 text-center` の 5 項目以上のテストを含み、全テストが green となる

---

### TC-051: detailHeroPages.test.ts が存在し全テストが green

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** `src/__tests__/components/detailHeroPages.test.ts` のソースコードを読む
**WHEN** テストファイルの内容を確認し bun test で実行する
**THEN** ファイルが存在し、4 ページ × （h1 存在・StatusBadge 存在・一覧リンク存在・旧バー非存在）= 16 テスト以上を含み、全テストが green となる

---

### TC-052: newCreateLinks.test.ts が存在し全テストが green

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** `src/__tests__/static/newCreateLinks.test.ts` のソースコードを読む
**WHEN** テストファイルの内容を確認し bun test で実行する
**THEN** ファイルが存在し、6 ファイル × （BTN_PRIMARY 存在・ブラケット非存在）= 12 テスト以上 ＋ contracts 新規リンク非存在テスト 1 件以上を含み、全テストが green となる

---

### TC-053: bun test 全体が green（既存テスト含む）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** 本変更のソースコードが実装済みの状態
**WHEN** `bun test` をプロジェクトルートで実行する
**THEN** 既存テスト 144 件 + 新規追加テスト全件が green となり、挙動アサーションが変更されていない

---

## 品質ゲート

### TC-054: typecheck / lint / build が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-17

**GIVEN** 本変更のソースコードが実装済みの状態
**WHEN** `bun run typecheck`・`bun run lint`・`bun run build` をそれぞれ実行する
**THEN** 全コマンドが exit 0 で完了する

---

### TC-055: src/app 配下に生パレットクラスを新たに持ち込んでいない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-17

**GIVEN** 本変更で追加・変更された `src/app` 配下のファイルを対象とする
**WHEN** `bg-red-\d+`・`border-red-\d+`・`bg-green-\d+`・`bg-yellow-\d+`・`text-\[#`・`bg-\[#` の正規表現でファイルを検索する
**THEN** マッチが 0 件であり、`(auth)/login/page.tsx` の `bg-red-50`・`border-red-200` がトークン参照に置換済みである

---

### TC-056: aozu check exit 0 かつアーキテクチャテストが green

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-17

**GIVEN** 本変更のソースコードが実装済みの状態
**WHEN** `aozu check` を実行し、`src/__tests__/static/architecture.test.ts` を bun test で実行する
**THEN** `aozu check` が exit 0 で完了し、アーキテクチャテストが全件 green となる

---

### TC-057: ダークテーマ時にヒーロー行・ボタン・EmptyState・ログインのコントラストが成立する

**Category**: manual
**Priority**: should
**Source**: request.md > 実装上の必須事項 3

**GIVEN** アプリを `[data-theme="dark"]` で起動した状態
**WHEN** 一覧ヒーロー行（h1）・BTN_PRIMARY ボタン・EmptyState のメッセージ・ログイン画面のカード内テキストを目視確認する
**THEN** いずれの要素も背景色と文字色のコントラストが成立しており、テキストが判読可能である

---

### TC-058: PageToolbar 利用 19 ファイルでレイアウト崩れがない

**Category**: manual
**Priority**: should
**Source**: design.md > Risks / Trade-offs

**GIVEN** PageToolbar の外枠から `bg-bg-toolbar border border-border px-2 py-1` が除去された状態
**WHEN** settings/webhooks/[id]/deliveries・revenue 系・deals/new・requests/new 等のフォーム画面を含む全 19 使用ページをブラウザで目視確認する
**THEN** タイトルとコンテンツの垂直間隔が適切に確保されており（mb-3 相当）、コンテンツが詰まってレイアウトが崩れているページが存在しない

---

## Result

```yaml
result: completed
total: 58
automated: 55
manual: 3
must: 51
should: 7
could: 0
blocked_reasons: []
```
