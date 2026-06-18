# 業務システムUIを全ページに展開

## Meta

- **type**: spec-change
- **slug**: ui-business-all-pages
- **base-branch**: main
- **adr**: false

## 背景

申請一覧ページに業務システムスタイルを適用済み（PR#18）。残りの全ページにも同じスタイルルールを展開して統一感を持たせる。

## デザインルール（申請一覧で確立済み）

以下のルールを全ページに一貫して適用する:

- **角丸なし**: `rounded-md` / `rounded-lg` を使わない。`rounded-none` またはデフォルト
- **影なし**: `shadow-sm` / `shadow` を使わない
- **背景**: ページ全体は `bg-[#e8e8e8]`。テーブル/カードは `bg-white` に `border border-[#e0e0e0]`
- **テーブルヘッダー**: `bg-[#dcdde1] border border-[#bdc3c7]`。テキストは `text-xs text-[#2c3e50] font-bold`
- **行**: 偶数行 `bg-white`、奇数行 `bg-[#f9f9f9]`。対応が必要な行は薄色背景（黄色/オレンジ）
- **テキストサイズ**: 本文 `text-xs`（12px）。見出し `text-sm`（14px）。`text-[8px]` / `text-[9px]` は使わない
- **フォント**: 全体 sans-serif（Geist）統一。`font-mono` は使わない
- **ステータス色**: 承認待=`text-[#d4880f] font-bold`、承認済=`text-[#1a8a4a]`、却下=`text-[#c0392b]`、差戻し=`text-[#d35400] font-bold`、期限切れ=`text-[#999999]`、下書き=`text-[#2980b9]`
- **終端状態の行**: approved / rejected / expired の行はテキストを `text-[#95a5a6]` でグレーアウト。draft / pending / revision は通常色
- **ボタン**: プライマリアクションはテキストリンク（`text-[#2980b9] underline`）。`bg-blue-600 rounded-md` のような塗りボタンは使わない
- **危険操作**: `text-[#c0392b] underline`
- **入力フィールド**: `border border-[#cccccc] rounded-none px-2 py-1 text-xs`。影なし。`focus:border-[#2980b9] focus:outline-none`
- **セレクトボックス**: 同上
- **ツールバー**: `bg-[#f5f5f5] border border-[#cccccc] px-2 py-1`。見出し + フィルタ + アクションリンクを1行に
- **フッター**: `bg-[#f5f5f5] border border-[#cccccc] border-t-0 px-2 py-0.5 text-xs text-[#7f8c8d]`
- **カード/セクション**: `bg-white border border-[#e0e0e0]` で囲む。影なし、角丸なし
- **ラベル**: `text-xs text-[#7f8c8d]`。フォームのラベルは `text-xs font-bold text-[#2c3e50]`

## 現状コードの前提

- `src/app/(dashboard)/requests/page.tsx` — 業務システムスタイル適用済み（参考実装）
- `src/app/(dashboard)/requests/BulkApprovalPanel.tsx` — 業務システムスタイル適用済み（参考実装）
- `src/app/(dashboard)/requests/[id]/page.tsx` — 旧スタイル（`bg-white shadow rounded-lg`、`bg-blue-600 rounded-md` ボタン）
- `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` — 旧スタイル（塗りボタン）
- `src/app/(dashboard)/requests/new/page.tsx` — 旧スタイル（フォーム）
- `src/app/(auth)/login/page.tsx` — 旧スタイル（`bg-white shadow-md rounded-lg`）
- `src/app/(dashboard)/settings/layout.tsx` — タブは SettingsNav で対応済みだが、レイアウトの余白が旧スタイル
- `src/app/(dashboard)/settings/templates/page.tsx` — 旧スタイル（テーブル + 塗りボタン）
- `src/app/(dashboard)/settings/templates/TemplateForm.tsx` — 旧スタイル（フォーム）
- `src/app/(dashboard)/settings/templates/DeleteButton.tsx` — 旧スタイル（赤塗りボタン）
- `src/app/(dashboard)/settings/users/page.tsx` — 旧スタイル
- `src/app/(dashboard)/settings/users/UserRoleSelect.tsx` — 旧スタイル
- `src/app/(dashboard)/settings/webhooks/page.tsx` — 旧スタイル
- `src/app/(dashboard)/settings/webhooks/WebhookCreateForm.tsx` — 旧スタイル
- `src/app/(dashboard)/settings/webhooks/[id]/deliveries/page.tsx` — 旧スタイル
- `src/app/(dashboard)/settings/delegations/page.tsx` — 旧スタイル
- `src/app/(dashboard)/settings/audit-logs/page.tsx` — 旧スタイル
- `src/app/(dashboard)/styles.ts` — `BTN_PRIMARY` 等が旧スタイル定数。業務システムスタイルに更新が必要

## 要件

1. **styles.ts の更新**: 全定数を業務システムスタイルに変更する。`BTN_PRIMARY` → `text-[#2980b9] underline text-xs`（テキストリンク）。`BTN_DANGER` → `text-[#c0392b] underline text-xs`。`INPUT_BASE` → `border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none`。`SELECT_BASE` → 同上
2. **ログインページ**: カードスタイル（`shadow-md rounded-lg`）を削除。`bg-white border border-[#e0e0e0]` に変更。入力フィールドとボタンを新スタイルに
3. **申請詳細ページ**: カードスタイルを削除。セクションを `bg-white border border-[#e0e0e0]` に。承認ステップの表示をテーブル形式に。アクションボタン（承認/却下/差戻し/再申請）をテキストリンクに
4. **申請作成フォーム**: 入力フィールドを新スタイルに。送信ボタンをテキストリンクに。ページタイトルをツールバースタイルに
5. **設定ページ共通**: 全設定ページのテーブルを業務システムスタイル（`bg-[#dcdde1]` ヘッダー、偶数奇数行、border-collapse）に統一
6. **テンプレート管理**: テンプレート一覧テーブル、作成/編集フォーム、削除ボタンを新スタイルに
7. **ユーザー管理**: ユーザー一覧テーブル、ロール変更セレクトボックスを新スタイルに
8. **Webhook管理**: エンドポイント一覧テーブル、作成フォーム、配信ログテーブルを新スタイルに
9. **代理承認管理**: 委譲一覧テーブル、作成フォームを新スタイルに
10. **監査ログ**: 監査ログテーブル、フィルタ、CSVダウンロードリンクを新スタイルに

## スコープ外

- レスポンシブ対応
- ダークモード
- アイコン追加
- 新しい機能の追加

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] 全ページで `rounded-md` / `rounded-lg` / `shadow-sm` / `shadow-md` が使われていない（ログインページ含む）
- [ ] 全ページで `bg-blue-600` の塗りボタンが使われていない
- [ ] 全テーブルのヘッダーが `bg-[#dcdde1]` スタイル
- [ ] 全入力フィールドが `rounded-none` で影なし
- [ ] `styles.ts` の定数が業務システムスタイルに更新されている
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **全ページ一括変更を採用、段階的変更を却下** — スタイルの不統一は中途半端な印象を与える。全ページを1つのrequestで統一する
2. **塗りボタンをテキストリンクに全面置換** — 業務システムはテキストリンクが主な操作手段。`[新規作成]` `承認 | 却下` のような形式。ただしフォームの送信ボタンのみ `bg-[#2980b9] text-white text-xs px-3 py-1 rounded-none` の最小限の塗りボタンを許容する（フォーム送信はリンクと区別する必要がある）
