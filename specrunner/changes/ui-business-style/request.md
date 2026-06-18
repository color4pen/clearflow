# UIを業務システムスタイルにリデザイン

## Meta

- **type**: spec-change
- **slug**: ui-business-style
- **base-branch**: main
- **adr**: false

## 背景

現在のUIは素のTailwindそのままで、情報密度が低く視覚的な優先順位がない。業務システムとして振り切り、高密度テーブル・薄いヘッダー・色テキストによるステータス表現に統一する。装飾を足すのではなく、密度と色の濃淡で情報の優先度を表現する。

## 現状コードの前提

- `src/app/(dashboard)/layout.tsx:17-18` — ヘッダーが `bg-white border-b shadow-sm` で `py-4` の余白。高さ約64px
- `src/app/(dashboard)/requests/page.tsx:20-30` — ステータスが `bg-xxx-100 text-xxx-700` のバッジスタイル（`rounded-full px-2 py-1`）
- `src/app/(dashboard)/requests/page.tsx:44-50` — 「新規申請」ボタンが `bg-blue-600 px-4 py-2 rounded-md`
- `src/app/(dashboard)/requests/page.tsx:8-30` — `statusLabel()` と `statusClass()` がこのファイルに定義。`requests/[id]/page.tsx` にも重複定義
- `src/app/(dashboard)/settings/layout.tsx` — 設定タブにactive状態のスタイルがない。全タブが同じ色
- `src/app/(dashboard)/settings/layout.tsx` — delegations がナビゲーションに含まれていない
- ボタンスタイル（`px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700`）が10箇所以上にコピペ
- inputスタイル（`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm`）が同様にコピペ

## 要件

1. **ダッシュボードヘッダーの圧縮**: ヘッダー高さを36px（`py-1`）に圧縮する。背景色を `bg-slate-900`（濃紺）に変更。ロゴ「Clearflow」を白文字13px。ナビゲーションリンク（申請一覧 / 設定 / 監査ログ）をヘッダー内にインラインで配置。ユーザー名・ロール・ログアウトを右端に配置。設定リンクは admin 以外のロールでも表示するが、admin 専用ページへのリンクは admin のみ表示
2. **ステータス表現の変更**: バッジ（rounded-full + 背景色）を廃止し、色テキストのみ（`font-medium` + ステータスカラー）に変更する。承認待=`text-amber-700 font-bold`、承認済=`text-emerald-700`、却下=`text-red-700`、差戻し=`text-orange-600 font-bold`、期限切れ=`text-gray-400`、下書き=`text-gray-500`
3. **申請一覧テーブルの高密度化**: 行高を28px（`py-0.5`）に圧縮する。テーブルヘッダーは `bg-slate-50 text-xs text-slate-500 font-medium uppercase`。承認待ち行の背景を `bg-amber-50`、差し戻し行を `bg-orange-50` にして対応が必要な行を視覚的に浮かせる。承認進捗（`● ○ manager → finance`）を一覧テーブルに直接表示する列を追加する。期限列を追加し、残り3日以内は `text-red-600 font-bold` で表示する。アクション（承認/却下）はインラインのテキストリンク（`text-blue-600 text-xs underline`）にする
4. **statusLabel / statusClass の共通化**: `src/app/(dashboard)/requests/page.tsx` と `src/app/(dashboard)/requests/[id]/page.tsx` の重複を解消し、`src/app/(dashboard)/requests/statusUtils.ts` に切り出す
5. **設定タブのactive状態**: 現在のパスに応じてactive タブに `border-b-2 border-blue-600 text-blue-600 font-medium` を適用する。非active は `text-gray-500 hover:text-gray-700`。`usePathname()` を使用するため Client Component に変更する
6. **設定ナビゲーションに delegations を追加**: NAV_ITEMS に `{ href: "/settings/delegations", label: "代理承認" }` を追加する
7. **フッター統計**: 一覧テーブルの下に件数サマリーを表示する。`24件中 1-20件表示 | 承認待: 8件 承認済: 12件 却下: 3件` 形式。`text-xs text-slate-400`
8. **共通スタイル定数**: ボタン・input のTailwindクラスを `src/app/(dashboard)/styles.ts` に定数として切り出す。`BTN_PRIMARY`, `BTN_SECONDARY`, `BTN_DANGER`, `INPUT_BASE` 等。各ページは定数を参照する

## スコープ外

- レスポンシブ対応（モバイル）
- ダークモード
- アイコン・ロゴの追加
- ページネーション機能の実装（表示のみ）
- フィルタ機能の実装（表示のみ）
- フォームページ（申請作成、テンプレート編集等）のリデザイン

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] ダッシュボードヘッダーの高さが36px以下（`py-1` 以下）
- [ ] ステータス表示にバッジスタイル（`rounded-full`）が使われていない
- [ ] `statusLabel` と `statusClass` が `statusUtils.ts` に定義され、重複が解消されている
- [ ] 設定タブに active 状態のスタイルが適用されている
- [ ] 設定ナビゲーションに「代理承認」リンクが存在する
- [ ] 一覧テーブルの行に承認進捗列が存在する
- [ ] ボタン・input のスタイルが `styles.ts` の定数を参照している
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **スタイル定数ファイル（styles.ts）を採用、コンポーネントラッパー方式を却下** — `<Button variant="primary">` のようなコンポーネントは Server Component で使えない制約がある。Tailwindクラスの文字列定数なら Server/Client どちらでも使える
2. **設定タブを Client Component に変更を採用** — `usePathname()` でactive判定するため。タブのリンクリストだけが Client Component になり、ページ本体は Server Component のまま
3. **一覧テーブルへの承認進捗列追加を採用** — 詳細画面に遷移しなくても進捗がわかる。承認ステップデータは既に `listRequests` で取得可能（approval_steps テーブルとの JOIN が必要な場合は repository を拡張する）
