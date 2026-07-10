# Mock Fidelity Check: page-chrome-restyle

参照資料: `specrunner/reference/juchu-mock/mock.html` / `mock-styles.css` / `design-spec.md`

---

## 1. 一覧ツールバー（PageToolbar）

### モックの該当箇所
- `mock.html` に明示的なツールバーバーなし。詳細ページの `detail-header` / `detail-header-info h1`（font-size: 20px; font-weight: 700）がタイトルの基準。

### 適用した値
- `h1` に `text-lg font-bold text-text`（Tailwind `text-lg` = 1.125rem ≒ 18px）
- 外枠: `flex items-center gap-2 flex-wrap mb-3`（バー背景なし）

### 意図的な差異と理由
- モックの詳細ヘッダー h1 が 20px に対し、`text-lg`（18px）を採用。Tailwind のスケール制約上、`text-xl`（20px）は本実装では「Clearflow」ロゴタイプに割り当て済みのため、一覧タイトルは一段下げて統一感を保つ。

---

## 2. 一覧フィルタバー

### モックの該当箇所
- `mock.html` 引合画面に filter bar 相当の構造なし（一覧テーブルのみ）。`InquiryListView` の Source dropdown / Search input は実装独自。

### 適用した値
- フィルタバー div: `flex items-center gap-2 px-2 py-2 bg-bg-toolbar border border-border border-t-0`（変更なし）
- フィルタ内容（select / input）は変更なし。

### 意図的な差異と理由
- モックにフィルタバーの定義がないため、既存のトークン参照を維持。変更対象はタブスタイルのみ。

---

## 3. 空状態（EmptyState）

### モックの該当箇所
- `mock.html` line 982–990: `.empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }` / `.empty-state .icon { font-size: 40px; margin-bottom: 10px; }`

### 適用した値
- 外枠: `py-10 text-center`（40px = py-10: 2.5rem）
- icon: `text-4xl block mb-2`（40px 相当）
- message: `text-xs text-text-muted`

### 意図的な差異と理由
- モックの padding は `40px 20px` に対し、`py-10`（上下のみ）を採用。横方向の padding は呼び出し元の `className` で上書き可能とした。
- モックは `color: var(--text-muted)` に対し `text-xs text-text-muted` を採用（フォントサイズはアプリの xs 基調に統一）。

---

## 4. タブ

### モックの該当箇所
- `mock.html` line 620–648:
  - `.tabs { display: flex; border-bottom: 2px solid var(--border); }`
  - `.tab { padding: 10px 18px; font-size: 13.5px; color: var(--text-sub); border-bottom: 2px solid transparent; font-weight: 500; }`
  - `.tab.active { color: var(--brand); border-bottom-color: var(--brand); }`
  - `.tab:hover { color: var(--text); }`

### 適用した値
- タブコンテナ: `flex items-end gap-0 border-b border-border`
- タブ button/link ベース: `px-4 py-2 text-xs font-medium transition-colors border-b-2`
- active: `border-primary text-primary font-bold`
- 非 active: `border-transparent text-text-secondary hover:text-text hover:border-border`

### 意図的な差異と理由
- モック padding は `10px 18px` に対し `px-4 py-2`（16px / 8px）を採用。アプリの xs スケール基調に合わせて縦方向を圧縮。
- モックの hover は `color: var(--text)` のみ。実装では hover 時に `border-border` も付与してフィードバックを強化。
- RequestTabs の件数は `(n)` テキスト形式に変更（モックに pill 定義なし）。

---

## 5. 詳細ヒーロー — inquiries/[id]

### モックの該当箇所
- `mock.html` の detail-header パターン: `flex items-start gap-4` / `h1 { font-size: 20px; font-weight: 700; }` / `detail-meta` に badge 類を配置

### 適用した値
- パンくず: `text-xs text-text-muted mb-0.5`
- ヒーロー行: `flex items-center gap-2 flex-wrap mb-3`
- h1: `text-lg font-bold text-text`
- StatusBadge: 既存実装をそのまま配置
- `InquiryActions` を ml-auto コンテナに移動

### 意図的な差異と理由
- モックの h1 は 20px に対し `text-lg`（18px）を採用（PageToolbar と統一）。
- `flex-wrap` を追加しモバイル幅での折り返しを保証。

---

## 6. 詳細ヒーロー — contracts/[id]

### モックの該当箇所
- mock.html の detail-header パターンと同一（contracts 専用画面はモックに存在しないため detail-header 基準を適用）。

### 適用した値
- ヒーロー行: `flex items-center gap-2 flex-wrap mb-3`
- h1: `text-lg font-bold text-text`
- StatusBadge をヒーロー行に配置（dl の ステータス行を削除）
- 「案件を表示」「顧客を表示」を `ml-auto flex items-center gap-3` に配置

### 意図的な差異と理由
- 旧 dl の ステータス行を削除（ヒーロー行に移動済み）。重複排除のため。

---

## 7. 詳細ヒーロー — contracts/[id]/invoices/[invoiceId]

### モックの該当箇所
- 請求専用画面はモックに存在しないため detail-header 基準を適用。

### 適用した値
- ヒーロー行: `flex items-center gap-2 flex-wrap mb-3`
- h1: `text-lg font-bold text-text`
- StatusBadge をヒーロー行に配置（dl の ステータス行を削除）
- ml-auto アクションなし（InvoiceActions は SectionCard 内に維持）
- `max-w-[560px] mx-auto` 中央寄せラッパーはヒーロー行の外に配置

### 意図的な差異と理由
- 請求詳細の中央寄せレイアウトはそのまま維持。ヒーローはその外（全幅）に配置。

---

## 8. 詳細ヒーロー — requests/[id]

### モックの該当箇所
- 申請専用画面はモックに存在しないため detail-header 基準を適用。

### 適用した値
- パンくず: `text-xs text-text-muted mb-0.5`
- ヒーロー行: `flex items-center gap-2 flex-wrap mb-1`
- h1: `text-lg font-bold text-text`
- StatusBadge を h1 の隣に配置
- メタ行（申請者・申請日時）をヒーロー直下に配置
- SectionCard 内の旧ヘッダーブロックを削除

### 意図的な差異と理由
- `ActionButtons`（承認操作）は SectionCard 内のフローの一部として維持（ステッパーの下に配置することがワークフロー UI として自然なため）。

---

## 9. ログイン画面

### モックの該当箇所
- `mock.html` line 909–936:
  - `#login-page { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); }`
  - `.login-card { border-radius: 12px; padding: 40px 36px; width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }`
  - `.login-logo h1 { font-size: 20px; font-weight: 700; color: var(--brand); }`
  - `.login-logo p { font-size: 12px; color: var(--text-muted); }`

### 適用した値
- 背景: `style={{ background: "var(--bg-login-gradient)" }}`（`globals.css` に `--bg-login-gradient: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)` 定義）
- カード幅: `max-w-[380px]`（モックと一致）
- カード角丸: `rounded-xl`（12px）
- カード padding: `p-9`（36px 相当、モックの 36px と一致）
- カード影: `shadow-lg`
- ロゴ h1: `text-xl font-bold text-center text-primary`（20px）
- サブコピー: `text-xs text-text-muted`
- エラー div: `bg-status-red-bg border border-status-red-text text-status-red-text`

### 意図的な差異と理由
- モックの `box-shadow: 0 20px 60px rgba(0,0,0,0.3)` は `shadow-lg` に近似（`shadow-2xl` でより忠実だが `shadow-lg` でも視覚的効果は十分）。
- モックに「ログイン」見出し（h3）なし → 削除（モック準拠）。
- カード背景はダーク時も白（`bg-bg-surface` のトークンで自動対応）。ログインは常時同一グラデーション背景のためダーク/ライト共通の gradient CSS variable を使用。
