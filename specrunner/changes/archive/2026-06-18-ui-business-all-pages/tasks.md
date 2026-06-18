# Tasks: 業務システムUIを全ページに展開

## T-01: styles.ts の定数を業務システムスタイルに更新する

対象: `src/app/(dashboard)/styles.ts`

- [x] `BTN_PRIMARY` を `"text-[#2980b9] underline text-xs"` に変更
- [x] `BTN_PRIMARY_DISABLED` を `"text-[#2980b9] underline text-xs disabled:text-[#bdc3c7] disabled:no-underline disabled:cursor-not-allowed"` に変更
- [x] `BTN_SECONDARY` を `"text-xs text-[#7f8c8d] underline"` に変更
- [x] `BTN_DANGER` を `"text-[#c0392b] underline text-xs"` に変更
- [x] `BTN_SUCCESS` を `"text-[#1a8a4a] underline text-xs"` に変更
- [x] `BTN_WARNING` を `"text-[#d35400] underline text-xs"` に変更
- [x] `INPUT_BASE` を `"w-full border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none"` に変更
- [x] `SELECT_BASE` を `"block w-full border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none"` に変更
- [x] 新定数 `BTN_SUBMIT` を追加: `"bg-[#2980b9] text-white text-xs px-3 py-1 rounded-none disabled:opacity-50 disabled:cursor-not-allowed"`（フォーム送信専用の塗りボタン）
- [x] 新定数 `TOOLBAR` を追加: `"bg-[#f5f5f5] border border-[#cccccc] px-2 py-1"`
- [x] 新定数 `SECTION_CARD` を追加: `"bg-white border border-[#e0e0e0]"`
- [x] 新定数 `FOOTER_BAR` を追加: `"bg-[#f5f5f5] border border-[#cccccc] border-t-0 px-2 py-0.5 text-xs text-[#7f8c8d]"`
- [x] 新定数 `FORM_LABEL` を追加: `"text-xs font-bold text-[#2c3e50]"`

**Acceptance Criteria**:
- styles.ts に `rounded-md`, `rounded-lg`, `shadow-sm`, `shadow`, `bg-blue-600`, `bg-red-600`, `bg-green-600`, `bg-orange-500` が含まれない
- `BTN_SUBMIT` が export されている
- TypeScript コンパイルエラーがない

## T-02: ログインページを業務システムスタイルに変換する

対象: `src/app/(auth)/login/page.tsx`

- [x] 外側コンテナ `bg-gray-50` → `bg-[#e8e8e8]`
- [x] タイトル `text-3xl font-bold text-gray-900` → `text-sm font-bold text-[#2c3e50]`
- [x] サブタイトル `text-gray-600` → `text-xs text-[#7f8c8d]`
- [x] カード `bg-white py-8 px-6 shadow rounded-lg` → `bg-white border border-[#e0e0e0] py-4 px-4`
- [x] カード内見出し `text-xl font-semibold text-gray-900` → `text-sm font-bold text-[#2c3e50]`
- [x] エラーメッセージ `bg-red-50 border border-red-200 rounded text-red-700 text-sm` → `bg-red-50 border border-red-200 text-[#c0392b] text-xs`（`rounded` を除去）
- [x] ラベル `text-sm font-medium text-gray-700` → `text-xs font-bold text-[#2c3e50]`
- [x] 入力フィールド: インラインの `w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500` → `w-full border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none`
- [x] バリデーションエラー `text-sm text-red-600` → `text-xs text-[#c0392b]`
- [x] 送信ボタン: `rounded-md shadow-sm ... bg-blue-600 hover:bg-blue-700 ...` → `BTN_SUBMIT` を import して使用。`w-full` は維持。`focus:ring-*` や `shadow-sm` は除去

**Acceptance Criteria**:
- ページに `rounded-md`, `rounded-lg`, `shadow-sm`, `shadow-md`, `shadow`, `bg-blue-600` が含まれない
- 入力フィールドが `rounded-none` で影なし
- 送信ボタンが `bg-[#2980b9] text-white rounded-none` の塗りボタン

## T-03: 申請詳細ページを業務システムスタイルに変換する

対象: `src/app/(dashboard)/requests/[id]/page.tsx`

- [x] 「← 申請一覧に戻る」リンク: `text-sm text-blue-600 hover:text-blue-800` → `text-xs text-[#2980b9] underline`
- [x] メインカード `bg-white shadow rounded-lg p-6 max-w-2xl` → `bg-white border border-[#e0e0e0] max-w-none`（`max-w-2xl` 除去、全幅使用）
- [x] ツールバーを追加: カード冒頭に `bg-[#f5f5f5] border border-[#cccccc] px-2 py-1` のツールバーを配置。タイトル `text-sm font-bold text-[#333333]` + ステータス表示をツールバー内に
- [x] タイトル `text-2xl font-bold text-gray-900` → ツールバー内の `text-sm font-bold text-[#333333]`
- [x] ステータス表示: 既存の `statusClass()` を使用（すでに正しい色）。ツールバー右端に配置
- [x] 説明セクション見出し `text-sm font-medium text-gray-700` → `text-xs font-bold text-[#2c3e50]`
- [x] 説明本文 `text-gray-600` → `text-xs text-[#2c3e50]`
- [x] メタ情報（作成日時、更新日時、金額）のラベル `text-gray-500` → `text-xs text-[#7f8c8d]`。値 `text-gray-900` → `text-xs text-[#2c3e50]`
- [x] `ApprovalStepsSection` をテーブル形式に書き換え:
  - `<ol>` + `<li>` → `<table>` + `<thead>` + `<tbody>`
  - テーブルヘッダー: `bg-[#dcdde1] border border-[#bdc3c7]`、列: No. / 承認者ロール / ステータス / 承認者名 / 処理日時 / 期限 / コメント
  - セルスタイル: `text-xs text-[#2c3e50] font-bold`
  - 行スタイル: 偶数行 `bg-white`、奇数行 `bg-[#f9f9f9]`
  - `rounded-md`, `rounded-full`, `bg-gray-100` を除去
  - ステータス表示には `stepStatusClass()` を使用
  - 差し戻しコメント: `text-orange-700 bg-orange-50 rounded` → `text-xs text-[#d35400]`（rounded を除去、背景なし）
- [x] `DeadlineDisplay` のスタイル: `text-red-600 font-medium` → `text-xs text-[#c0392b] font-bold`。`text-gray-500` → `text-xs text-[#7f8c8d]`

**Acceptance Criteria**:
- ページに `shadow`, `rounded-lg`, `rounded-md`, `rounded-full`, `bg-gray-100` が含まれない
- 承認ステップがテーブル形式で表示される
- テーブルヘッダーが `bg-[#dcdde1]` スタイル

## T-04: ActionButtons を業務システムスタイルに変換する

対象: `src/app/(dashboard)/requests/[id]/ActionButtons.tsx`

- [x] import を更新: `BTN_PRIMARY, BTN_SUCCESS, BTN_DANGER, BTN_WARNING, INPUT_BASE` → styles.ts の更新後の値を使用（T-01 で更新済みのため、import はそのまま。ただし使い方を確認）
- [x] draft 状態の「提出する（審査へ）」ボタン: `BTN_PRIMARY` がテキストリンクになるため、フォーム送信として `BTN_SUBMIT` に変更。import に `BTN_SUBMIT` を追加
- [x] pending 状態の「承認する」ボタン: `BTN_SUCCESS` → テキストリンクに。`<button>` → テキストリンクスタイル `text-[#1a8a4a] underline text-xs`
- [x] pending 状態の「却下する」ボタン: `BTN_DANGER` → テキストリンクスタイル。`text-[#c0392b] underline text-xs`
- [x] 差し戻しコメントラベル `text-sm font-medium text-gray-700` → `text-xs font-bold text-[#2c3e50]`
- [x] textarea: `INPUT_BASE` は T-01 で更新済み。追加のインラインスタイル変更不要
- [x] 「差し戻す」ボタン: `BTN_WARNING` → テキストリンクスタイル `text-[#d35400] underline text-xs`
- [x] revision 状態の「再申請する」ボタン: `BTN_PRIMARY` → `BTN_SUBMIT` に変更
- [x] セクション見出し `text-sm font-medium text-gray-700` → `text-xs font-bold text-[#2c3e50]`
- [x] セクション border `border-gray-200` → `border-[#e0e0e0]`
- [x] エラーメッセージ `text-sm text-red-600` → `text-xs text-[#c0392b]`
- [x] ボタン配置: 承認/却下/差戻しを `承認 | 却下 | 差戻` のようにパイプ区切りのテキストリンクで並べる形式にする

**Acceptance Criteria**:
- `bg-blue-600`, `bg-green-600`, `bg-red-600`, `bg-orange-500` が含まれない
- 承認・却下はテキストリンク形式
- 提出・再申請はフォーム送信ボタン（`BTN_SUBMIT`）

## T-05: 申請作成フォームを業務システムスタイルに変換する

対象: `src/app/(dashboard)/requests/new/page.tsx`

- [x] ページヘッダー: `text-2xl font-bold text-gray-900` + `text-sm text-gray-600` → ツールバー形式 `bg-[#f5f5f5] border border-[#cccccc] px-2 py-1` 内に `text-sm font-bold text-[#333333]`
- [x] カード `bg-white shadow rounded-lg p-6 max-w-2xl` → `bg-white border border-[#e0e0e0] p-4`（`max-w-2xl` は除去して全幅）
- [x] エラーメッセージ `bg-red-50 border border-red-200 rounded text-red-700 text-sm` → `bg-red-50 border border-red-200 text-[#c0392b] text-xs`（`rounded` を除去）
- [x] ラベル `text-sm font-medium text-gray-700` → `text-xs font-bold text-[#2c3e50]`
- [x] 入力フィールド（title, description, amount）: インラインの `rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500` → `border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none`
- [x] バリデーションエラー `text-sm text-red-600` → `text-xs text-[#c0392b]`
- [x] 送信ボタン: `px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md ...` → `BTN_SUBMIT` を import して使用
- [x] キャンセルリンク: `px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50` → `text-xs text-[#7f8c8d] underline`

**Acceptance Criteria**:
- ページに `rounded-md`, `shadow-sm`, `shadow`, `bg-blue-600` が含まれない
- 入力フィールドが `rounded-none` で影なし
- 送信ボタンが `BTN_SUBMIT` スタイル（最小限の塗りボタン）

## T-06: 設定レイアウトと SettingsNav を業務システムスタイルに変換する

対象: `src/app/(dashboard)/settings/layout.tsx`, `src/app/(dashboard)/settings/SettingsNav.tsx`

- [x] `layout.tsx`: `space-y-6` → `space-y-0`（設定ページ全体の余白を詰める。ナビとコンテンツの間の余白は最小限に）
- [x] `SettingsNav.tsx`: 外側 `border-b border-gray-200` → `bg-[#f5f5f5] border border-[#cccccc]`
- [x] タブのアクティブスタイル: `border-b-2 border-blue-600 text-blue-600 font-medium` → `text-[#2c3e50] font-bold bg-white border-b-0`（白背景でアクティブを示す）
- [x] タブの非アクティブスタイル: `text-gray-500 hover:text-gray-700` → `text-[#7f8c8d] hover:text-[#2c3e50]`
- [x] タブのテキストサイズを `text-sm` → `text-xs` に変更

**Acceptance Criteria**:
- SettingsNav に `border-blue-600` が含まれない
- アクティブタブが `text-[#2c3e50] font-bold`
- ナビ全体が `bg-[#f5f5f5] border border-[#cccccc]`

## T-07: テンプレート管理ページを業務システムスタイルに変換する

対象: `src/app/(dashboard)/settings/templates/page.tsx`, `src/app/(dashboard)/settings/templates/new/page.tsx`, `src/app/(dashboard)/settings/templates/[id]/edit/page.tsx`

### templates/page.tsx
- [x] ヘッダーセクション: `text-2xl font-bold text-gray-900` + `text-sm text-gray-500` → ツールバー形式。`text-sm font-bold text-[#333333]` + 右端に `[テンプレートを追加]` リンク
- [x] 「テンプレートを追加」リンク: `BTN_PRIMARY`（テキストリンクになる）をそのまま使用。`inline-flex items-center` は除去
- [x] テーブルコンテナ `bg-white border border-gray-200 rounded-lg shadow-sm` → `bg-white border border-[#e0e0e0]`
- [x] `<thead>`: `text-xs text-gray-500 uppercase bg-gray-50` → `bg-[#dcdde1] border border-[#bdc3c7]`。`uppercase` を除去
- [x] `<th>`: `px-6 py-3` → `px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left`
- [x] `<tbody>`: `divide-y divide-gray-200` を除去
- [x] `<tr>`: `hover:bg-gray-50` → `hover:bg-[#eef2f7]`。偶数行 `bg-white`、奇数行 `bg-[#f9f9f9]` を index で振り分け。`border border-[#e0e0e0]` を追加
- [x] `<td>`: `px-6 py-4` → `px-1 py-1 text-xs`。`font-medium text-gray-900` → `text-[#2c3e50]`。`text-gray-600` → `text-[#2c3e50]`。`text-gray-500` → `text-[#7f8c8d]`
- [x] 編集リンク `text-blue-600 hover:underline text-xs` → `text-[#2980b9] underline text-xs`
- [x] 空状態メッセージ: `px-6 py-8 text-center text-sm text-gray-500` → `text-center py-4 text-xs text-[#95a5a6]`
- [x] フッターバーを追加: テーブル下部に `bg-[#f5f5f5] border border-[#cccccc] border-t-0 px-2 py-0.5 text-xs text-[#7f8c8d]` で件数表示

### templates/new/page.tsx
- [x] ヘッダー: `text-2xl font-bold text-gray-900` + `text-sm text-gray-500` → ツールバー形式
- [x] フォームコンテナ: `bg-white border border-gray-200 rounded-lg shadow-sm p-6` → `bg-white border border-[#e0e0e0] p-4`

### templates/[id]/edit/page.tsx
- [x] ヘッダー: 同上
- [x] フォームコンテナ: 同上

**Acceptance Criteria**:
- テーブルヘッダーが `bg-[#dcdde1]` スタイル
- `rounded-lg`, `shadow-sm`, `uppercase` がテーブル周辺に含まれない
- 行が偶数/奇数で色分けされている

## T-08: TemplateForm を業務システムスタイルに変換する

対象: `src/app/(dashboard)/settings/templates/TemplateForm.tsx`

- [x] エラーメッセージ `bg-red-50 border border-red-200 rounded-md` → `bg-red-50 border border-red-200`（`rounded-md` を除去）
- [x] ラベル `text-sm font-medium text-gray-700` → `text-xs font-bold text-[#2c3e50]`
- [x] 入力フィールド: `INPUT_BASE` は T-01 で更新済み。`mt-1 block` はそのまま維持
- [x] 承認ステップの小ラベル `text-xs font-medium text-gray-600` → `text-xs font-bold text-[#2c3e50]`
- [x] ステップカード `p-3 border border-gray-200 rounded-md bg-gray-50` → `p-2 border border-[#e0e0e0] bg-[#f9f9f9]`（`rounded-md` を除去）
- [x] ロールセレクト: `border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500` → `border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none`
- [x] 期限入力: 同上
- [x] 「+ ステップを追加」ボタン: `text-sm text-blue-600 hover:text-blue-800 font-medium` → `text-xs text-[#2980b9] underline`
- [x] 削除ボタン: `text-xs text-red-500 hover:text-red-700` → `text-xs text-[#c0392b] underline`
- [x] 送信ボタン: `BTN_PRIMARY` → `BTN_SUBMIT` に変更（import 追加）
- [x] キャンセルリンク: `BTN_SECONDARY` → テキストリンクスタイル（T-01 で更新済み）

**Acceptance Criteria**:
- `rounded-md`, `focus:ring-2`, `bg-blue-600`, `text-blue-600` が含まれない
- 送信ボタンが `BTN_SUBMIT` スタイル
- セレクトボックスが `rounded-none`

## T-09: DeleteButton を業務システムスタイルに変換する

対象: `src/app/(dashboard)/settings/templates/DeleteButton.tsx`

- [x] ボタン: `text-xs text-red-600 hover:text-red-800 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50` → `text-xs text-[#c0392b] underline`（border, rounded, hover:bg を除去。テキストリンク形式に）
- [x] エラーメッセージ `text-xs text-red-600` → `text-xs text-[#c0392b]`

**Acceptance Criteria**:
- 削除ボタンがテキストリンク形式（`text-[#c0392b] underline`）
- `rounded`, `border-red-300`, `hover:bg-red-50` が含まれない

## T-10: ユーザー管理ページを業務システムスタイルに変換する

対象: `src/app/(dashboard)/settings/users/page.tsx`, `src/app/(dashboard)/settings/users/UserRoleSelect.tsx`

### users/page.tsx
- [x] ヘッダー: `text-2xl font-bold text-gray-900` + `text-sm text-gray-500` → ツールバー形式
- [x] テーブルコンテナ: `bg-white border border-gray-200 rounded-lg shadow-sm` → `bg-white border border-[#e0e0e0]`
- [x] `<thead>`: `text-xs text-gray-500 uppercase bg-gray-50` → `bg-[#dcdde1] border border-[#bdc3c7]`。`uppercase` を除去
- [x] `<th>`: `px-6 py-3` → `px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left`
- [x] `<tbody>`: `divide-y divide-gray-200` を除去
- [x] `<tr>`: `hover:bg-gray-50` → `hover:bg-[#eef2f7]`。偶数/奇数行色分け + `border border-[#e0e0e0]`
- [x] `<td>`: `px-6 py-4` → `px-1 py-1 text-xs`。`font-medium text-gray-900` → `text-[#2c3e50]`。`text-gray-600` → `text-[#2c3e50]`。`text-gray-500` → `text-[#7f8c8d]`。`text-gray-400` → `text-[#95a5a6]`
- [x] 「（自分）」表示: `text-xs text-gray-400` → `text-xs text-[#95a5a6]`
- [x] ロールテキスト: `text-sm text-gray-600` → `text-xs text-[#2c3e50]`
- [x] 「（変更不可）」表示: `text-xs text-gray-400` → `text-xs text-[#95a5a6]`
- [x] 空状態メッセージ: `px-6 py-8 text-center text-sm text-gray-500` → `text-center py-4 text-xs text-[#95a5a6]`

### UserRoleSelect.tsx
- [x] `SELECT_BASE` は T-01 で更新済みのため、import そのまま
- [x] `disabled:bg-gray-100 disabled:cursor-not-allowed` → `disabled:bg-[#f5f5f5] disabled:cursor-not-allowed`
- [x] エラーメッセージ `text-xs text-red-600` → `text-xs text-[#c0392b]`

**Acceptance Criteria**:
- テーブルヘッダーが `bg-[#dcdde1]` スタイル
- `rounded-lg`, `shadow-sm`, `uppercase` が含まれない
- セレクトボックスが `rounded-none`

## T-11: Webhook 管理ページを業務システムスタイルに変換する

対象: `src/app/(dashboard)/settings/webhooks/page.tsx`, `src/app/(dashboard)/settings/webhooks/WebhookCreateForm.tsx`

### webhooks/page.tsx
- [x] ヘッダー: ツールバー形式に変換
- [x] エンドポイント一覧セクション: `bg-white border border-gray-200 rounded-lg shadow-sm` → `bg-white border border-[#e0e0e0]`
- [x] セクション見出し `px-6 py-4 border-b border-gray-200` + `text-lg font-medium text-gray-900` → 不要（ツールバーに統合）
- [x] `<thead>`: `text-xs text-gray-500 uppercase bg-gray-50` → `bg-[#dcdde1] border border-[#bdc3c7]`
- [x] `<th>`: `px-6 py-3` → `px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left`
- [x] `<tbody>`: `divide-y divide-gray-200` を除去
- [x] `<tr>`: 偶数/奇数行色分け + border
- [x] `<td>`: `px-6 py-4` → `px-1 py-1 text-xs`。`font-mono` を除去
- [x] 状態バッジ: `bg-green-100 text-green-800` / `bg-gray-100 text-gray-600` + `rounded` → `text-[#1a8a4a] text-xs font-bold` / `text-[#95a5a6] text-xs`（テキストのみ）
- [x] 配信ログリンク: `text-blue-600 hover:underline text-xs` → `text-[#2980b9] underline text-xs`
- [x] 有効化/無効化ボタン: `text-xs text-gray-600 ... border border-gray-300 rounded px-2 py-0.5 hover:bg-gray-50` → `text-xs text-[#2980b9] underline`（テキストリンク形式）
- [x] 削除ボタン: `text-xs text-red-600 ... border border-red-300 rounded px-2 py-0.5 hover:bg-red-50` → `text-xs text-[#c0392b] underline`（テキストリンク形式）
- [x] エンドポイント追加セクション: `bg-white border border-gray-200 rounded-lg shadow-sm` → `bg-white border border-[#e0e0e0]`
- [x] セクション見出し: 同上

### WebhookCreateForm.tsx
- [x] 成功メッセージ: `bg-green-50 border border-green-200 rounded-md` → `bg-green-50 border border-green-200`（`rounded-md` を除去）
- [x] Secret 表示: `font-mono bg-green-100 px-1 py-0.5 rounded` → `bg-green-100 px-1 py-0.5 text-xs`（`font-mono`, `rounded` を除去）
- [x] エラーメッセージ: `bg-red-50 border border-red-200 rounded-md` → `rounded-md` を除去
- [x] ラベル: `text-sm font-medium text-gray-700` → `text-xs font-bold text-[#2c3e50]`
- [x] イベントチェックボックスラベル: `text-sm` → `text-xs`。`font-mono text-xs` → `text-xs`（`font-mono` を除去）
- [x] チェックボックス: `rounded border-gray-300` → `border-[#cccccc]`（`rounded` を除去）
- [x] 送信ボタン: `BTN_PRIMARY` → `BTN_SUBMIT` に変更
- [x] 注釈: `text-xs text-gray-500` → `text-xs text-[#7f8c8d]`

**Acceptance Criteria**:
- `font-mono`, `rounded-md`, `rounded-lg`, `shadow-sm`, `bg-blue-600` が含まれない
- テーブルヘッダーが `bg-[#dcdde1]` スタイル
- ステータスバッジがテキスト表現

## T-12: Webhook 配信ログページを業務システムスタイルに変換する

対象: `src/app/(dashboard)/settings/webhooks/[id]/deliveries/page.tsx`

- [x] ヘッダー: ツールバー形式に変換。「← エンドポイント一覧に戻る」リンクを `text-xs text-[#2980b9] underline` に
- [x] テーブルコンテナ: `bg-white border border-gray-200 rounded-lg shadow-sm` → `bg-white border border-[#e0e0e0]`
- [x] `<thead>`: `text-xs text-gray-500 uppercase bg-gray-50` → `bg-[#dcdde1] border border-[#bdc3c7]`
- [x] `<th>`: `px-6 py-3` → `px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left`
- [x] `<tbody>`: `divide-y divide-gray-200` を除去
- [x] `<tr>`: 偶数/奇数行色分け + border
- [x] `<td>`: `px-6 py-4` → `px-1 py-1 text-xs`。`font-mono` を除去
- [x] ステータスバッジ: `bg-green-100 text-green-800` / `bg-red-100 text-red-800` / `bg-gray-100 text-gray-600` + `rounded` → テキスト表現。成功 = `text-[#1a8a4a] text-xs font-bold`、失敗 = `text-[#c0392b] text-xs font-bold`、処理中 = `text-[#d4880f] text-xs`
- [x] リトライ予定: `text-xs text-orange-500` → `text-xs text-[#d35400]`
- [x] リトライボタン: `text-xs text-blue-600 ... border border-blue-300 rounded px-2 py-0.5 hover:bg-blue-50` → `text-xs text-[#2980b9] underline`
- [x] `statusColors` / `statusLabels` 定数のスタイルを更新

**Acceptance Criteria**:
- `font-mono`, `rounded-lg`, `shadow-sm`, `rounded` が含まれない
- テーブルヘッダーが `bg-[#dcdde1]` スタイル
- ステータスがテキスト表現

## T-13: 代理承認管理ページを業務システムスタイルに変換する

対象: `src/app/(dashboard)/settings/delegations/page.tsx`

- [x] ヘッダー: ツールバー形式に変換
- [x] 委譲一覧セクション: `bg-white border border-gray-200 rounded-lg shadow-sm` → `bg-white border border-[#e0e0e0]`
- [x] セクション見出し: `px-6 py-4 border-b border-gray-200` + `text-lg font-medium text-gray-900` → 不要（ツールバーに統合するか、小見出しとして `text-sm font-bold text-[#333333]` に縮小）
- [x] `<thead>`: `text-xs text-gray-500 uppercase bg-gray-50` → `bg-[#dcdde1] border border-[#bdc3c7]`
- [x] `<th>`: `px-6 py-3` → `px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left`
- [x] `<tbody>`: `divide-y divide-gray-200` を除去
- [x] `<tr>`: 偶数/奇数行色分け + border
- [x] `<td>`: `px-6 py-4` → `px-1 py-1 text-xs`。`font-mono` を除去。`text-gray-500` → `text-[#7f8c8d]`
- [x] 状態バッジ: テキスト表現に（有効 = `text-[#1a8a4a] text-xs font-bold`、無効 = `text-[#95a5a6] text-xs`）
- [x] 無効化ボタン: `text-xs text-red-600 ... border border-red-300 rounded px-2 py-0.5 hover:bg-red-50` → `text-xs text-[#c0392b] underline`
- [x] 委譲追加セクション: `bg-white border border-gray-200 rounded-lg shadow-sm` → `bg-white border border-[#e0e0e0]`
- [x] フォームラベル: `text-sm font-medium text-gray-700` → `text-xs font-bold text-[#2c3e50]`
- [x] セレクト: `SELECT_BASE` は T-01 で更新済み
- [x] 日付入力: `INPUT_BASE` は T-01 で更新済み
- [x] 送信ボタン: `BTN_PRIMARY` → `BTN_SUBMIT` に変更

**Acceptance Criteria**:
- `font-mono`, `rounded-lg`, `shadow-sm`, `rounded` が含まれない
- テーブルヘッダーが `bg-[#dcdde1]` スタイル
- 送信ボタンが `BTN_SUBMIT` スタイル

## T-14: 監査ログページを業務システムスタイルに変換する

対象: `src/app/(dashboard)/settings/audit-logs/page.tsx`

- [x] ヘッダー: ツールバー形式に変換。CSVダウンロードリンクをツールバー右端に `text-xs text-[#2980b9] underline` で配置（`BTN_PRIMARY` がテキストリンクになるので調整）
- [x] フィルタフォーム: `bg-white border border-gray-200 rounded-lg p-4 space-y-4` → `bg-[#f5f5f5] border border-[#cccccc] px-2 py-1`（ツールバースタイル）
- [x] フィルタラベル: `text-sm font-medium text-gray-700` → `text-xs font-bold text-[#2c3e50]`
- [x] フィルタ入力: `INPUT_BASE`, `SELECT_BASE` は T-01 で更新済み
- [x] フィルタボタン: `BTN_PRIMARY` → テキストリンクスタイルに（フォーム送信だがフィルタなのでリンク形式が適切）
- [x] テーブルコンテナ: `bg-white border border-gray-200 rounded-lg shadow-sm` → `bg-white border border-[#e0e0e0]`
- [x] `<thead>`: `text-xs text-gray-500 uppercase bg-gray-50` → `bg-[#dcdde1] border border-[#bdc3c7]`
- [x] `<th>`: `px-6 py-3` → `px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left`
- [x] `<tbody>`: `divide-y divide-gray-200` を除去
- [x] `<tr>`: 偶数/奇数行色分け + border
- [x] `<td>`: `px-6 py-4` → `px-1 py-1 text-xs`。`font-mono` を除去。`text-gray-500` → `text-[#7f8c8d]`。`text-gray-600` → `text-[#2c3e50]`
- [x] ページネーション: `px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50` → `text-xs text-[#2980b9] underline`（テキストリンク形式）
- [x] ページ番号: `text-sm text-gray-500` → `text-xs text-[#7f8c8d]`

**Acceptance Criteria**:
- `font-mono`, `rounded-lg`, `rounded-md`, `shadow-sm`, `uppercase` が含まれない
- テーブルヘッダーが `bg-[#dcdde1]` スタイル
- フィルタがツールバースタイル
- ページネーションがテキストリンク

## T-15: 全ファイル検証スイープ

- [x] `src/app/` 配下で `rounded-md` を grep → 0件
- [x] `src/app/` 配下で `rounded-lg` を grep → 0件
- [x] `src/app/` 配下で `shadow-sm` を grep → 0件
- [x] `src/app/` 配下で `shadow-md` を grep → 0件
- [x] `src/app/` 配下で `"shadow"` を grep（`shadow-none` を除く） → styles.ts 以外で 0件
- [x] `src/app/` 配下で `bg-blue-600` を grep → 0件
- [x] `src/app/` 配下で `font-mono` を grep → 0件（globals.css の CSS変数定義を除く）
- [x] `bun run build` が成功する
- [x] `bun test` が全件 green（400 pass, 0 fail）
- [x] TypeScript 型チェックが green

**Acceptance Criteria**:
- 上記の全 grep チェックがクリア
- ビルドが成功する
- 型チェックが成功する
