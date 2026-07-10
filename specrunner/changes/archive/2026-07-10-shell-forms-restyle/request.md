# シェルと共有部品の刷新（サイドバー装飾・フォーム規律・トースト/ダイアログ）

## Meta

- **type**: refactoring
- **slug**: shell-forms-restyle
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: UI 層内のスタイル統一・表示部品の刷新であり、層構造・port/adapter の選択は無いため false -->

前提: デザイントークン（slate 基調・ステータス 6 系統）・`StatusBadge`・ボタン 3 階層（`BTN_PRIMARY/SECONDARY/DANGER`）・PageToolbar のヒーロー行化（page-chrome-restyle）が main に取り込み済みであること。

## 参照資料（ローカル・任意）

- `/Users/seki/Documents/GitHub/clearflow/specrunner/reference/juchu-mock/mock.html`（+ `mock-styles.css`）: デザイン出典のモック実装
- 同ディレクトリ `design-spec.md`: モックから抽出したデザイン仕様書
- **実装前**に、対象部品に対応するモックの該当箇所（sidebar・form-group・toast・modal）を読み、寸法・色・階層の根拠として用いること。
- **実装後**、対象部品ごとに「モックの該当箇所 / 適用した値 / 意図的な差異と理由」を `specrunner/changes/shell-forms-restyle/mock-fidelity-check.md` に記録すること。
- 参照資料が存在しない環境では本節をスキップし、本書の仕様値のみを正とする（本書は参照資料なしで完結する）。

## 背景

- **サイドバーが素のリスト**: アイコン・セクション分けが無く全 11 項目がフラット。active は左 2px の白ボーダーで、ブランド色のアクセントが無い。申請件数バッジは `hasBadge` フラグだけ存在し描画は `<span className="hidden" />` の placeholder（未配線）。
- **フォームの規律が不統一**: 必須マーク `*` が画面によって有無バラバラ（deals/new・contracts/new は皆無）、エラー時に赤枠が付かない（赤メッセージのみ）、deals/new・contracts/new は縦 1 カラムで間延び。ラベルは `font-bold` の濃色で `FormField` と `FORM_LABEL` 定数が二重管理。
- **保存フィードバックの欠落と様式差**: 新規作成成功時は無言でリダイレクトのみ。トーストは右上・白地・アイコンなしで、アニメーションも無い。
- **ConfirmDialog の内部不整合**: キャンセル/確定ボタンに角丸クラスが無く直角のまま。本体も 420px・4px 角丸・区切り線なしの単一ブロック。
- **通知パネルの実バグ**: `NotificationPanel.tsx` が未定義トークン `dark:bg-bg-card` を参照しており、ダークテーマで背景指定が効いていない。

## 決定事項

1. **挙動不変**: 画面遷移・Server Actions・API/MCP・DB・権限・集計に変更なし。例外は本書で明示する 2 点のみ: (a) サイドバー申請バッジの件数表示（既存データの表示専用の取得追加）、(b) 新規作成成功時のトースト表示（表示の追加のみ）。
2. **表示ラベルの文字列は原則不変**。追加されるのはトースト文言と必須マーク `*` のみ（本書で文言を指定）。
3. ライト/ダーク両対応（トークン参照のみ。生パレット・hex 直書きクラスを持ち込まない。新色はトークンとして `globals.css` に定義）。
4. ドメイン・DB・API に「バッジ件数」等の新概念を持ち込まない（既存取得ロジックの流用に限る）。

## 現状コードの前提

- サイドバー: `src/app/(dashboard)/layout.tsx`（`<aside>` 全体、通知・ユーザー領域含む）＋ `src/app/(dashboard)/SidebarNav.tsx`（`navItems` 定義: `{ href, label, hasBadge?, adminOnly? }` の 11 項目、active = `bg-white/10 text-white border-l-2 border-white`）。幅 `w-[210px]`。
- 通知: `NotificationBell.tsx`（server・データ取得）→ `NotificationPanel.tsx`（client・左ドッキング flyout `w-80`、`dark:bg-bg-card` 参照が 1 箇所）。
- ユーザー領域: `layout.tsx` 34-54 行。氏名/ロールのプレーンテキスト＋`[ログアウト]` テキストボタン＋`ThemeToggle`。
- フォーム部品: `src/app/components/FormField.tsx`（`FormField`/`Input`/`Select`/`Textarea`、ラベル `text-xs font-bold text-text`、エラーは赤メッセージのみ）、`MoneyInput.tsx`、`styles.ts` の `FORM_LABEL`/`INPUT_BASE`/`SELECT_BASE`。
- フォーム画面: `deals/new/NewDealForm.tsx`・`contracts/new/NewContractForm.tsx`（縦 1 カラム・必須マークなし）、`clients/new/ClientForm.tsx`・`inquiries/new/InquiryForm.tsx`（`grid-cols-2 gap-3`・必須マーク部分的）。
- トースト: `src/app/components/Toast.tsx`（`fixed top-4 right-4`・白地・左カラーバー・3 秒・アニメーションなし）。`@keyframes` はリポジトリ全体で未定義。
- ダイアログ: `src/app/components/ConfirmDialog.tsx`（overlay `bg-black/40`・本体 `rounded` 420px・ボタン 2 個に角丸クラスなし）、`(dashboard)/components/ActionItemModal.tsx`（ラベル `text-text-muted`・生 `<select>`）。
- 新規作成フォームの成功時: `router.push` のみ（`ClientForm.tsx:35-38` 等）。`ToastProvider` は `DashboardProviders.tsx` でマウント済みのため、クライアント遷移後もトーストは生存する。

## 要件

### 1. サイドバーの装飾（`layout.tsx` + `SidebarNav.tsx`）

- 幅: `w-[210px]` → `w-[220px]`。ロゴ行を高さ 56px（`h-14`）固定・下線 `border-b border-white/10`。
- セクション分け（ラベルは `text-2xs font-semibold uppercase tracking-wider` で `#475569` 相当のトークン参照、`px-4 pt-4 pb-1`）:

| セクション | 項目（絵文字アイコン付き） |
|---|---|
| メイン | 📊 ダッシュボード |
| 営業 | 🏢 顧客 / 📨 引き合い / 💼 案件 / 📋 タスク |
| 管理 | 📁 契約 / 💰 売上 / 📝 申請一覧 |
| 個人・設定 | 👤 アカウント / ⚙️ 設定 / 🧾 監査ログ |

- 項目: アイコンは幅 20px 固定のカラム（`inline-block w-5`）＋ラベル。`adminOnly` の絞り込み挙動は不変。
- active: `border-l-2 border-white` → **`border-l-[3px] border-primary`**＋背景 `bg-white/10` 維持＋白文字。非 active の hover も現状トーン維持。
- **申請件数バッジの配線**: `layout.tsx`（server）で「ログインユーザーが承認者として対応すべき pending 申請」の件数を**既存の申請取得ロジック（usecase/query）を流用して**取得し、`SidebarNav` に props で渡す。1 件以上のとき「申請一覧」右端に `bg-danger text-white text-2xs font-bold rounded-full min-w-4 h-4 px-1` のピルで表示、0 件は非表示。既存 `hasBadge` の `hidden` placeholder を置き換える。新規の usecase・DB クエリ・API は追加しない（既存 list 系の結果 count で可）。

### 2. 通知パネル・ユーザー領域（`layout.tsx` + `NotificationPanel.tsx`）

- `NotificationPanel.tsx` の未定義トークン `dark:bg-bg-card` を実在トークン（`bg-bg-surface` はテーマ対応済みのため `dark:` 分岐ごと削除）に修正。パネル幅 `w-80` → `w-[340px]`。開閉・既読挙動は不変。
- ユーザー領域: 氏名の左に **32px の円形アバター**（`bg-primary text-white font-bold` に氏名の頭 1 文字）を追加。氏名 `text-xs text-text-on-dark-secondary`・ロール `text-2xs text-text-on-dark-muted` の縦 2 段。
- `[ログアウト]` は文言不変のまま色を danger 系（ダーク地で読める `text-status-red-text` 等のトークン）へ。`ThemeToggle` は現位置維持。

### 3. フォーム部品の規律統一（`FormField.tsx` + `styles.ts`）

- ラベル: `text-xs font-bold text-text` → **`text-xs font-semibold text-text-secondary`**。`FORM_LABEL` 定数を同値に更新し、`FormField` は `FORM_LABEL` を参照する（二重管理の解消）。
- **`FormField` に `required?: boolean` を追加**: true でラベル末尾に `<span className="text-danger"> *</span>` を自動描画。全フォーム（deals/inquiries/clients/contracts の new、settings 系、ActionItemModal）で、HTML の `required` 属性を持つ入力・実装上必須の入力に `required` を付与して統一。
- **エラー赤枠**: `Input`/`Select`/`Textarea`/`MoneyInput` に `invalid?: boolean` を追加し、true で `border-danger` を適用（focus 時も `focus:border-danger`）。`FormField` の `error` とセットで使えるようにする（既存の赤メッセージは維持）。
- `Textarea` に `min-h-20`（80px）を追加（既存の `rows` 指定は併存可）。

### 4. フォームレイアウトの 2 カラム化

- `deals/new/NewDealForm.tsx`・`contracts/new/NewContractForm.tsx` を `grid grid-cols-2 gap-x-6 gap-y-4` へ（備考・textarea 等の長文項目は `col-span-2`）。**項目・並び順・ラベル・送信挙動は不変**。
- `clients/new/ClientForm.tsx`・`inquiries/new/InquiryForm.tsx` の grid gap を `gap-x-6 gap-y-4` 相当に統一（列構成は現状維持）。

### 5. トーストの刷新（`Toast.tsx` + `globals.css`）

- 位置: `top-4 right-4` → **`bottom-4 right-4`**（右下）。
- 配色: 新トークン `--bg-toast`（ライト `#1e293b` / ダーク `#334155`）を `globals.css` に定義・`@theme inline` 配線し、`bg-bg-toast text-text-on-dark` のダーク地白文字へ。左カラーバーは廃止。
- プレフィックス: success = `✓`（`text-status-green-text` 相当のトークン色）/ error = `✗`（`text-status-red-text` 相当）。
- アニメーション: `globals.css` に `@keyframes toast-slide-in`（`translateX(60px)` + opacity 0 → 0 + 1、0.25s ease）を定義し適用。
- 自動消滅 3 秒・`showToast` の API・既存呼び出し箇所は不変。

### 6. 新規作成成功時のトースト

`showToast(message, "success")` を `router.push` の直前に追加する（4 フォーム）:

| フォーム | 文言 |
|---|---|
| `clients/new/ClientForm.tsx` | `顧客を登録しました` |
| `inquiries/new/InquiryForm.tsx` | `引き合いを登録しました` |
| `deals/new/NewDealForm.tsx` | `案件を作成しました` |
| `contracts/new/NewContractForm.tsx` | `契約を作成しました` |

リダイレクト先・作成処理は不変（トースト追加のみ）。

### 7. ダイアログの整形

- `ConfirmDialog.tsx`: overlay `bg-black/40` → `bg-black/45`。本体 `maxWidth: 420` → `480`・`rounded` → `rounded-lg`。header（title）/ body（message・children）/ footer（ボタン行）を `border-b` / `border-t` の区切り線付き 3 分割に。**キャンセルボタンを `BTN_SECONDARY`、確定ボタンを `BTN_PRIMARY`（`variant="danger"` 時は `BTN_DANGER`）へ置換**（角丸欠落の解消）。開閉・確定・overlay クリックの挙動は不変。閉じる ✕ ボタンは追加しない。
- `ActionItemModal.tsx`: ラベルを要件 3 の基準（`FORM_LABEL`）に統一し、生 `<select>` を共有 `Select` に置換。overlay・幅 560px・開閉挙動は不変。

## スコープ外

- 固定ヘッダー新設・通知パネルのドロップダウン化・ユーザードロップダウン・通知の重要度絵文字（通知に重要度概念が無いため）。
- 一覧・詳細・ログイン画面（page-chrome-restyle で実施）。
- モバイルドロワー化・レスポンシブ挙動の変更。
- checkbox/radio の共通部品化、FormGrid 部品の新設（レイアウトは各フォームのクラスで実現）。
- 基本情報セクション（詳細画面）のグリッド化。

## 受け入れ基準

- [ ] 既存の全テストが green（挙動不変。クラス名固定テストの期待値追随は可、挙動アサーションの変更は不可）。`typecheck` / `lint` / `build` green。
- [ ] SidebarNav: セクションラベル・アイコン・active の `border-primary`・バッジ（1 件以上で表示 / 0 件で非表示）をコンポーネントテストで固定。
- [ ] FormField: `required` で `*` が描画されること、`invalid` で `border-danger` が付くことの単体テスト。
- [ ] Toast: 右下配置・variant ごとの `✓`/`✗` プレフィックスをテストで固定。
- [ ] ConfirmDialog: ボタンが `BTN_SECONDARY`/`BTN_DANGER` 相当のクラス（角丸を含む）を持つことをテストで固定。
- [ ] 4 フォームの成功時トースト文言をテストで固定。
- [ ] `NotificationPanel` に未定義トークン参照（`bg-bg-card`）が残っていない。
- [ ] `src/app` 配下に生パレット・hex 直書きクラスを新たに持ち込んでいない。
- [ ] `aozu check` exit 0・architecture test green。
- [ ] 参照資料が利用可能な場合、`mock-fidelity-check.md` が change folder に存在し、対象部品ごとの突き合わせ結果を含む。

## 実装上の必須事項

1. **挙動不変**（決定事項 1 の明示 2 点を除く）。変更ファイルは `src/app` 配下（UI）と `globals.css` / `styles.ts` に限定。ドメイン・application・infrastructure・api には触れない（バッジ件数も既存の公開関数の呼び出しのみ）。
2. 表示ラベル文字列は不変（追加は本書指定のトースト文言と `*` のみ）。
3. **ダークテーマ確認**: サイドバー・バッジ・トースト・ダイアログ・エラー赤枠が `[data-theme="dark"]` でコントラスト成立すること。
4. mock.module 汚染回避（個別ファイル・afterAll 復元）。
5. 成果物は単体で読めること（コード・コメントに経緯を書かない）。

## aozu 影響判定（起票前判定・必須）: **不要**

- 新モジュール(mod): なし（既存 `mod-ui` の実装範囲内）。
- 新依存辺(deps): なし（バッジ件数は UI→application の既存辺の範囲内）。
- 新ドメイン概念(term/ent/inv/act): なし（バッジは既存 pending 申請の件数表示であり新状態を定義しない）。
- 新シーケンス(seq): なし。

type: refactoring のため設計要素引用は必須対象外。architecture test は緑のまま。
