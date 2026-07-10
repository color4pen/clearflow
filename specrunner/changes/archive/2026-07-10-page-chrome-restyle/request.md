# 画面骨格の格上げ（一覧ツールバー・空状態・タブ・詳細ヒーロー横展開・ログイン）

## Meta

- **type**: refactoring
- **slug**: page-chrome-restyle
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: UI 層内の再スタイル・再配置であり、層構造・port/adapter の選択は無いため false -->

前提: デザイントークン（slate 基調・ステータス 6 系統）・`StatusBadge`・ボタン 3 階層（`BTN_PRIMARY` 等）・案件詳細のヒーローヘッダーが main に取り込み済みであること。

## 参照資料（ローカル・任意）

- `/Users/seki/Documents/GitHub/clearflow/specrunner/reference/juchu-mock/mock.html`（+ `mock-styles.css`）: デザイン出典のモック実装（全 15 画面の HTML/CSS）
- 同ディレクトリ `design-spec.md`: モックから抽出したデザイン仕様書
- **実装前**に、対象画面に対応するモックの該当箇所（一覧のフィルタバー・テーブル・詳細ヘッダー・ログイン・空状態）を読み、寸法・色・階層の根拠として用いること。
- **実装後**、対象画面ごとに「モックの該当箇所 / 適用した値 / 意図的な差異と理由」を `specrunner/changes/page-chrome-restyle/mock-fidelity-check.md` に記録すること。
- 参照資料が存在しない環境では本節をスキップし、本書の仕様値のみを正とする（本書は参照資料なしで完結する）。

## 背景

- **一覧のページタイトルが埋没している**: `PageToolbar` はタイトルを `span.text-sm` でグレーのバー内に置いており、ページの起点として目に入らない。案件詳細（deals/[id]）で導入済みのヒーロー行（背景なし・`h1.text-lg.font-bold`）と調子が揃っていない。
- **主要導線がリンク表記**: 「[新規作成]」等のブラケット付き下線リンクが 6 箇所。主要操作の視覚的階層（塗りボタン）が一覧画面に無い。
- **空状態が 4 系統に分裂**: 中央 `py-8 text-text-disabled` 系 / `py-4 text-text-muted` 中央系 / 左寄せ系 / サブセクション系が混在。
- **タブが 3 実装**: 下線式（requests・件数 pill 付き）/ 下線式（tasks・件数なし）/ 塗りボタン式（inquiries）。
- **詳細ヒーローが deals のみ**: contracts / inquiries / 請求 / requests は旧トグルバー（`bg-bg-toolbar` に `span` タイトル）のままで、ステータスバッジが本文に埋没し操作が分散。
- **ログイン画面が未刷新**: 単色背景・旧配色の名残（`bg-red-50 border-red-200` の生パレット）が残る。

## 決定事項

1. **挙動不変**: 画面遷移・Server Actions・API/MCP・DB・権限・集計に変更なし。変わるのは要素の配置・マークアップ・クラスのみ。
2. **表示ラベルの文字列は原則不変**。例外は本書で明示する 2 点のみ: (a) 新規作成リンクのブラケット `[ ]` 除去と「＋ 」プレフィックス付与、(b) ログイン画面のサブコピー変更（要件 6）。
3. ライト/ダーク両対応（トークン参照のみ。生パレット・hex 直書きを持ち込まない）。
4. 直列前提: 本リクエストは単独で完結し、他ジョブと worktree を共有しない。

## 現状コードの前提

- `src/app/components/PageToolbar.tsx`: `bg-bg-toolbar border border-border px-2 py-1` のバー。タイトル `span.text-sm.font-bold`、`children`（フィルタ等）を `|` 区切りで横並び、`actions` 右端。19 ファイルで使用。
- `requests/page.tsx:79-84`: PageToolbar を使わず同等 div をインライン実装。
- 新規作成リンク: `deals/page.tsx` `[新規作成]`・`inquiries/page.tsx` `[新規登録]`・`clients/page.tsx` `[新規登録]`・`requests/page.tsx` `[新規作成]`・`settings/policies/page.tsx` `[ポリシーを追加]`・`settings/templates/page.tsx` `[テンプレートを追加]`（いずれも `text-xs text-primary underline`）。
- `tasks/TaskList.tsx:135-139`: 既に `BTN_PRIMARY` の「新規作成」ボタンだが、位置はリストカード上部。
- 空状態: `clients/page.tsx:33-42`・`requests/page.tsx:88-99`・`inquiries/InquiryListView.tsx:102-105`（中央 py-8 系）、`deals/page.tsx:120`・`contracts/page.tsx:29`（py-4 系）、`tasks/TaskList.tsx:143`（左寄せ）、詳細サブセクション約 10 箇所（`px-2 py-3` 系）。
- タブ: `requests/RequestTabs.tsx`（下線式＋件数 pill）、`tasks/page.tsx:38-59`（下線式）、`inquiries/InquiryListView.tsx:47-60`（塗りボタン式）。
- 詳細ヘッダー: `contracts/[id]/page.tsx:55-61`・`inquiries/[id]/page.tsx:57-66`・`contracts/[id]/invoices/[invoiceId]/page.tsx:50-58` は旧トグルバー。`requests/[id]/page.tsx:75-96` は戻りリンク＋カード内 h1+バッジ。deals/[id] のヒーロー構造（`page.tsx:83-109`: パンくず行 → `flex items-center gap-2 flex-wrap` に h1 + StatusBadge + `ml-auto` 操作群）が基準。
- ログイン: `src/app/(auth)/login/page.tsx`。`bg-bg-page` 単色・`max-w-md` の SectionCard・エラーは `bg-red-50 border-red-200 text-danger`。

## 要件

### 1. PageToolbar のヒーロー行化（全一覧に一括波及）

`src/app/components/PageToolbar.tsx` を再スタイル:

- 外枠: `bg-bg-toolbar border` を廃し `flex items-center gap-2 flex-wrap`（deals/[id] ヒーロー行と同じ調子）。
- タイトル: `span.text-sm.font-bold` → **`h1` `text-lg font-bold text-text`**。
- `children`（フィルタ・タブ等）: 表示内容不変。`|` 区切りは廃止可（スタイルのみ調整）。
- `actions`: `ml-auto flex items-center gap-3` で右端。
- `requests/page.tsx` のインラインツールバーを PageToolbar 使用に置き換える（表示内容不変）。
- 利用 19 ファイルでレイアウト崩れがないこと（特に `settings/webhooks/[id]/deliveries`、`revenue` 系、`deals/new` 等のフォーム画面）。

### 2. 新規作成の塗りボタン化

- 上記 6 箇所のブラケットリンクを `BTN_PRIMARY` の Link（`＋ 新規作成` / `＋ 新規登録` / `＋ ポリシーを追加` / `＋ テンプレートを追加`）に置き換える。遷移先・配置（PageToolbar の `actions`）・表示ロール条件は不変。
- `tasks`: TaskList 内の「新規作成」ボタンを `tasks/page.tsx` の PageToolbar `actions` へ移動する。ボタンとモーダル開閉はローカル state に結合した Client Component のため、**ボタン＋追加モーダルを独立 Client Component `CreateTaskButton` に抽出して PageToolbar の `actions` に渡す**（開閉・作成の挙動は不変。位置と部品分割のみ）。
- 空状態内の導線リンク（「最初の◯◯を登録する」等）はリンクのまま維持。
- `contracts` 一覧への新規作成導線は**新設しない**（`/contracts/new` は `?dealId=` 必須の案件起点フローであり、一覧からの直接導線はドメインフローに反するため）。

### 3. 共有 EmptyState コンポーネントの新設と適用

`src/app/components/EmptyState.tsx`（表示専用）:

- Props: `icon?: string`（絵文字）, `message: string`, `children?`（導線リンク等）, `className?`
- 形状: 中央寄せ・`py-10`・絵文字は `text-4xl`・メッセージ `text-xs text-text-muted`。
- 適用先と絵文字: clients 🏢 / deals 💼 / inquiries 📨 / contracts 📁 / tasks 📋 / requests 📝。一覧 0 件時の表示を EmptyState に統一（既存の文言・導線リンクは children として維持）。
- 詳細内サブセクション 0 件表示は **`deals/[id]` と `clients/[id]` の 2 ファイルのみ**対象とし、絵文字なし（`icon` 省略）で統一適用。文言不変。他の詳細画面には適用しない。

### 4. タブの下線式統一

- 基準スタイル: `requests/RequestTabs.tsx` の下線式（`border-b-2`、active = `border-primary text-primary font-bold`、非 active = `border-transparent text-text-secondary`）。
- `inquiries/InquiryListView.tsx` のステータストグル（塗りボタン式）を下線式へ（選択状態・フィルタ挙動は不変）。
- `tasks/page.tsx` のタブ（未完了/完了）はスタイル差分のみ基準に追随。**「自分のタスク/全員」トグルはタブではなくフィルタ切替のため現行スタイルを維持（対象外）**。
- `RequestTabs` の件数 pill（`rounded-full bg-primary text-white`）を「ラベル (n)」形式のテキスト（active 色に追随）へ変更。件数の取得元は不変。
- 新たな件数取得（サーバー集計の追加）は行わない。

### 5. 詳細ヒーローの横展開（4 画面）

deals/[id] と同型（パンくず行 → ヒーロー行 `flex items-center gap-2 flex-wrap` に h1 `text-lg font-bold` + `StatusBadge` + `ml-auto` 右端群）へ再配置する。パンくずは「一覧リンク > タイトル」順に統一。

| 画面 | h1 | バッジ | 右端（`ml-auto`）へ移すもの | 現位置を維持するもの |
|---|---|---|---|---|
| `inquiries/[id]` | 件名 | 既存の引合ステータスバッジ | `InquiryActions`（案件化・辞退） | `DeleteInquiryButton`・ステータスバナー |
| `contracts/[id]` | 契約タイトル | 契約ステータス（本文 dl から移動） | 「案件を表示」「顧客を表示」リンク | `ContractStatusActions`・Delete・承認待ちバナー |
| `contracts/[id]/invoices/[invoiceId]` | 請求タイトル | 請求ステータス（本文 dl から移動） | —（移動なし） | `InvoiceActions`・関連契約リンク |
| `requests/[id]` | 申請タイトル（カード内 h1 をページ最上部へ） | 申請ステータス（同カードから移動) | —（移動なし） | `ActionButtons`（ステッパー下のまま）・メタ行はヒーロー直下 |

- 本文 dl からバッジを移した行は dl から削除する（重複表示しない）。それ以外のセクション構成・中身は不変。
- 請求詳細の `max-w-[560px] mx-auto` 中央寄せは維持してよい（ヒーローはその幅内でよい）。
- `deals/[id]/meetings/[meetingId]` と `clients/[id]` は対象外（ステータス概念が無く効果が薄いため。パンくず順の統一のみ任意で可）。

### 6. ログイン画面の刷新（`src/app/(auth)/login/page.tsx`）

- 背景: `linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)`（ライト/ダーク共通。トークン `--bg-login-gradient` 等として `globals.css` に定義し、任意値クラスで参照）。
- カード: 幅 `max-w-[380px]`・`rounded-xl`（12px）・padding `p-9` 相当・影 `shadow-lg` 相当。
- ロゴ部: 「Clearflow」`text-xl font-bold text-primary` ＋ サブコピー `text-xs text-text-muted`。**サブコピーの文言を「承認ワークフローシステム」から「案件管理システム」へ変更する**（現機能の実態に合わせる。ラベル変更はこの 1 点のみ）。
- エラー表示の `bg-red-50 border-red-200` を `bg-status-red-bg text-status-red-text` 等のトークン参照へ置換。
- 認証処理・フォーム項目・遷移は不変。

## スコープ外

- サイドバー・通知パネル・ユーザー領域・フォーム部品・トースト・ダイアログ（別リクエスト）。
- 固定ヘッダー新設、ページネーション、行内アクションアイコン、検索 input の新設、基本情報グリッドの 2 カラム化、アコーディオン。
- 新しい集計・件数取得の追加。
- FinanceDashboard / dashboard の変更。

## 受け入れ基準

- [ ] 既存の全テストが green（挙動不変。クラス名・DOM 構造固定テストの期待値追随は可、挙動アサーションの変更は不可）。`typecheck` / `lint` / `build` green。
- [ ] PageToolbar のタイトルが `h1` で描画されることをテストで固定。
- [ ] EmptyState の単体テスト（icon あり/なし・children 描画）。
- [ ] 4 詳細画面のヒーロー行（h1＋StatusBadge 同居、パンくず順）をコンポーネント/表示テストで固定。
- [ ] 新規作成導線 6 箇所（置換）＋tasks の移設ボタンが `BTN_PRIMARY` 相当のクラスで従来と同じ遷移先/挙動を持つことを固定。
- [ ] `src/app` 配下に生パレットクラス・hex 直書きクラスを新たに持ち込んでいない（`(auth)` のエラー表示置換で既存分は減る）。
- [ ] `aozu check` exit 0・architecture test green。
- [ ] 参照資料が利用可能な場合、`mock-fidelity-check.md` が change folder に存在し、対象画面ごとの突き合わせ結果を含む。

## 実装上の必須事項

1. **挙動不変**（遷移・Server Action・API/MCP・DB・権限・集計に変更なし）。変更ファイルは `src/app` 配下（UI）と `globals.css` に限定。
2. 表示ラベル文字列は決定事項 2 の例外 2 点以外は不変（既存テストの `getByText` を壊さない）。
3. **ダークテーマ確認**: ヒーロー行・ボタン・EmptyState・ログインが `[data-theme="dark"]` でコントラスト成立すること。
4. mock.module 汚染回避（個別ファイル・afterAll 復元）。
5. 成果物は単体で読めること（コード・コメントに経緯を書かない）。

## aozu 影響判定（起票前判定・必須）: **不要**

- 新モジュール(mod): なし（既存 `mod-ui` の実装範囲内。`EmptyState` は mod-ui 内の共有コンポーネント）。
- 新依存辺(deps): なし。
- 新ドメイン概念(term/ent/inv/act): なし（配置とスタイルの規約のみ）。
- 新シーケンス(seq): なし。

type: refactoring のため設計要素引用は必須対象外。architecture test は緑のまま。
