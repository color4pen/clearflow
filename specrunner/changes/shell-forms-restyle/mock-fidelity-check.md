# Mock Fidelity Check: shell-forms-restyle

参照資料: `/Users/seki/Documents/GitHub/clearflow/specrunner/reference/juchu-mock/`

---

## 1. サイドバー

### モックの該当箇所
- `mock.html` sidebar 要素: 幅 220px（`--sidebar-w: 220px`）
- ロゴ行高さ 56px（`--header-h: 56px`）
- セクションラベル: 10px, uppercase, letter-spacing 0.08em, `--text-muted`（`#94a3b8`）相当
- active 項目: `--brand`（`#1a56db`）の左ボーダー＋`--sidebar-active-bg`（`#1e293b`）背景
- 通知バッジ: `bg-danger` 赤地白文字の小円

### 適用した値
- 幅: `w-[220px]` ✓（モックの `--sidebar-w: 220px` に一致）
- ロゴ行: `h-14`（56px）`border-b border-white/10` ✓
- セクションラベル: `text-2xs font-semibold uppercase tracking-wider text-text-sidebar-muted`（`#64748b` → モックの `--text-muted` `#94a3b8` より若干濃いが既存トークン内で最近似）
- active border: `border-l-[3px] border-primary`（`--brand` = `#1a56db` = `primary` ✓）

### 意図的な差異と理由
- セクションラベルの色: モックは `#94a3b8`（slate-400）だが、既存トークン `text-sidebar-muted`（`#64748b` = slate-500）を使用。新トークン追加を避けるため。
- ダークテーマ: モックはライトのみ。ダーク対応は既存トークン体系で自己完結。

---

## 2. 通知パネル・ユーザー領域

### モックの該当箇所
- ユーザーアバター: 32px 円形、`--brand` 背景、白文字、頭文字
- ユーザー名: 13px、氏名とロールの縦 2 段
- ログアウト: `--text-sub`（`#64748b`）程度の弱め赤系

### 適用した値
- アバター: `w-8 h-8 rounded-full bg-primary text-white font-bold text-sm` ✓
- ユーザー名: `text-xs text-text-on-dark-secondary`、ロール: `text-2xs text-text-on-dark-muted` ✓
- ログアウト: `text-status-red-text`（ダークテーマでコントラスト成立）

### 意図的な差異と理由
- ログアウトボタン色: モックは弱い灰色だが、仕様書が danger 系を指定しているため `text-status-red-text` を採用。

---

## 3. フォームラベル・必須マーク

### モックの該当箇所
- フォームラベル: 12.5px, weight 600, `--text-sub`（`#64748b`）
- 必須マーク: `*` を赤（`--danger`）で表示

### 適用した値
- `FORM_LABEL = "text-xs font-semibold text-text-secondary"`
  - `text-xs`（12px）: モックの 12.5px に近似（`text-2xs` では小さすぎる）
  - `font-semibold`（600）✓
  - `text-text-secondary`（`#64748b`）✓ モックの `--text-sub` に一致
- 必須マーク: `<span className="text-danger"> *</span>` ✓

### 意図的な差異と理由
- フォントサイズ: 12px（`text-xs`）vs モック 12.5px。Tailwind に 12.5px 相当の定義がないため `text-xs` を採用。視覚的差異は最小限。

---

## 4. トースト

### モックの該当箇所
- 位置: 右下（`bottom: 24px; right: 24px`）
- 背景: `#1e293b`（slate-800）・白文字
- 形状: `border-radius: 8px`・`--shadow-md`
- プレフィックス: success=緑チェック / error=赤×
- アニメーション: 右からスライドイン

### 適用した値
- 位置: `bottom-4 right-4` ✓
- 背景: `bg-bg-toast`（`--bg-toast: #1e293b` ライト / `#334155` ダーク）✓
- 形状: `rounded shadow-lg` ✓（`--radius: 8px` に対応）
- プレフィックス: `✓`（`text-status-green-text`）/ `✗`（`text-status-red-text`）✓
- アニメーション: `toast-slide-in` `translateX(60px)` → 0 ✓

### 意図的な差異と理由
- ダーク時の背景: ライトの `#1e293b` より明るい `#334155` に。ダークページ背景（`#0f172a`）との十分なコントラストを確保するため。

---

## 5. ConfirmDialog

### モックの該当箇所
- 本体幅: 480px
- 角丸: `border-radius: 8px`（`--radius`）
- 3 分割: header / body / footer の区切り線
- ボタン: primary=`--brand` / danger=`--danger`、rounded

### 適用した値
- 幅: `maxWidth: 480` ✓
- 角丸: `rounded-lg`（8px）✓
- 区切り線: `border-b border-border`（header/body）・`border-t border-border`（body/footer）✓
- ボタン: `BTN_PRIMARY`（`bg-primary rounded`）/ `BTN_DANGER`（`bg-danger rounded`）/ `BTN_SECONDARY` ✓

### 意図的な差異と理由
- overlay 濃度: `bg-black/45`（モック `rgba(0,0,0,0.4)` 相当の若干増加）。視認性向上のため仕様書指定値を採用。
