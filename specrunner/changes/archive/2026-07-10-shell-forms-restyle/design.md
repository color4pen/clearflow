# Design: シェルと共有部品の刷新（サイドバー装飾・フォーム規律・トースト/ダイアログ）

## Context

Clearflow ダッシュボードの UI 層に蓄積された視覚的不整合・未配線のバッジ・
未定義トークン参照・フォーム規律のばらつきを一括して刷新する。

**対象範囲**: `src/app` 配下の UI ファイルと `globals.css` / `styles.ts`。
ドメイン・application・infrastructure・api レイヤーは変更しない（バッジ件数取得も既存の `listRequests` の戻り値 count を使うにとどめる）。

**前提条件**: デザイントークン（slate 基調・ステータス 6 系統）・`StatusBadge`・
ボタン定数 (`BTN_PRIMARY/SECONDARY/DANGER`)・PageToolbar ヒーロー化 (page-chrome-restyle) が
main に取り込み済みであること。

### 現状の問題点

| 問題 | 該当箇所 |
|---|---|
| サイドバーがフラット 11 項目。active に `border-white`（ブランド色なし）| `SidebarNav.tsx` |
| 申請バッジの `<span className="hidden" />` 未配線 | `SidebarNav.tsx` |
| `NotificationPanel.tsx` が未定義トークン `dark:bg-bg-card` を参照 | `NotificationPanel.tsx` |
| ユーザー領域がプレーンテキスト（アバターなし、ログアウトが no-color） | `layout.tsx` |
| `FormField` と `FORM_LABEL` でラベルスタイルが二重管理 | `FormField.tsx`, `styles.ts` |
| `FormField` に `required` prop がなく `*` 表示が散発的（手書き `<span>`） | 各フォーム |
| エラー時に赤枠なし（赤メッセージのみ） | `FormField.tsx`, 各入力部品 |
| deals/new・contracts/new が縦 1 カラムで間延び | `NewDealForm.tsx`, `NewContractForm.tsx` |
| トーストが右上・白地・アイコンなし・アニメーションなし | `Toast.tsx`, `globals.css` |
| 新規作成成功時にトーストなし（無言リダイレクト） | 4 フォーム |
| `ConfirmDialog` ボタンに角丸クラスなし。本体が単一ブロック | `ConfirmDialog.tsx` |
| `ActionItemModal` に生 `<select>` とラベルの個別スタイル | `ActionItemModal.tsx` |

---

## Goals / Non-Goals

**Goals**:

- サイドバーにセクション分け・絵文字アイコン・`border-primary` active・申請バッジを追加する
- `NotificationPanel` の未定義トークンを修正し、パネル幅を `w-[340px]` に拡張する
- ユーザー領域に頭文字アバター・縦 2 段テキスト・danger 色ログアウトを追加する
- `FormField`/入力部品を統一（`required` prop・`invalid` prop・`FORM_LABEL` 一元化）
- deals/new・contracts/new を 2 カラムグリッドに変更する
- Toast を右下・ダーク地・プレフィックス付き・スライドアニメーション付きに刷新する
- 新規作成 4 フォームの成功時トーストを追加する
- `ConfirmDialog` を 3 分割レイアウト・`BTN_SECONDARY`/`BTN_DANGER` ボタンに整形する
- `ActionItemModal` のラベルを `FORM_LABEL`・`<select>` を共有 `Select` に統一する

**Non-Goals**:

- 固定ヘッダー新設・通知パネルのドロップダウン化・ユーザードロップダウン
- 一覧・詳細・ログイン画面（page-chrome-restyle 担当）
- モバイルドロワー化・レスポンシブ挙動の変更
- checkbox/radio の共通部品化、`FormGrid` 部品の新設
- 基本情報セクション（詳細画面）のグリッド化
- 新規の usecase・DB クエリ・API の追加

---

## Decisions

### D1: サイドバーのセクション分けは `SidebarNav.tsx` 内部の `navSections` 配列として宣言する

**Rationale**: セクション構造は UI 層のみに閉じた静的設定であり、DB や props で管理する必要がない。
配列をコンポーネント内で完結させることで、外部からの依存が増えず可読性を保つ。

**Alternatives**:
- `layout.tsx` に構造を持たせて props で渡す案 → セクション定義と描画が分離して保守コストが増える
- JSON ファイルに外出し → 型安全性が落ちる

---

### D2: バッジ件数を `layout.tsx`（server）で計算し `SidebarNav` に props で渡す

**Rationale**: `SidebarNav` は `"use client"` コンポーネントであり、server-side の DB 取得はできない。
`layout.tsx` が既に `auth()` を呼んでいるため、同じ `session` から `organizationId` と `role` を
取得して `listRequests` を呼ぶのが最小コスト。新規 usecase・DB クエリは不要。

**実装方法**: `listRequests(organizationId)` の結果を受け取り、
`requests.filter(r => r.status === 'pending' && r.approvalSteps.some(s => s.status === 'pending' && s.approverRole === role)).length`
で件数を算出する（`requests/page.tsx` と同じロジック）。

**Alternatives**:
- 専用の count usecase を追加 → 要件に反する
- client fetch → レンダリング時のちらつきが生じる

---

### D3: `FormField` に `required` / `invalid` を追加し、`FORM_LABEL` を `FormField` が参照する

**Rationale**: ラベルスタイルは `FormField.tsx` の `label` と `styles.ts` の `FORM_LABEL` で
二重管理されている。`FormField` が `FORM_LABEL` 定数を内部参照することで一元化できる。
`required` / `invalid` を props として公開することで、各フォームの JSX を最小変更で統一できる。

**Alternatives**:
- `FORM_LABEL` を廃止して `FormField` に埋め込む → `FORM_LABEL` を直接使っているファイルが残っている
  ため後方互換を壊す。定数は維持しつつ値を同期させるのが安全。

---

### D4: Toast をダーク地（`bg-bg-toast`）にするため新トークンを `globals.css` に追加する

**Rationale**: 既存トークン（`bg-bg-surface`）はライト地であり、ダーク地白文字の Toast に使えない。
`--bg-toast` をライト/ダーク両モードで定義し `@theme inline` で配線することで、
生 hex 直書きを避けつつテーマ対応を実現する。

**Alternatives**:
- `bg-slate-800` 等の生パレットクラスを使用 → 要件違反（hex 直書き・生パレット禁止）

---

### D5: `@keyframes toast-slide-in` を `globals.css` に追加する

**Rationale**: Tailwind v4 ではカスタム `@keyframes` を `globals.css` で直接定義できる。
CSS アニメーションはサーバーレンダリングとの親和性が高く、JS なしで動作する。

**Alternatives**:
- Framer Motion 等の外部ライブラリ → 依存追加・バンドルサイズ増
- inline style の JS animation → SSR との相性が悪い

---

### D6: `ConfirmDialog` を header / body / footer の 3 分割に改修し、既存 BTN 定数を使う

**Rationale**: `BTN_SECONDARY` と `BTN_DANGER` はすでに角丸 (`rounded`) を含んでおり、
これらに置き換えることで角丸欠落バグを解消できる。3 分割は視覚的な情報整理と
スクロール時のボタン固定のための構造的基盤となる。

**Alternatives**:
- 既存構造を維持してボタンのみ修正 → 将来的に children が増えた場合のスクロール対応が難しい

---

## Risks / Trade-offs

**[Risk] `layout.tsx` に `listRequests` 呼び出しを追加することで毎回の DashboardLayout レンダリングに
DB クエリが 1 件追加される**
→ Mitigation: Next.js App Router では `auth()` も DB 参照しており、1 クエリ追加は許容範囲内。
また `listRequests` は既存の申請一覧ページでも呼ばれており、クエリパターンは既知・安全。

**[Risk] `FormField` の `FORM_LABEL` 参照化により、`FORM_LABEL` を直接参照している他のファイルとの
スタイル同期が崩れる可能性**
→ Mitigation: `FORM_LABEL` 定数の値を新しい値（`text-xs font-semibold text-text-secondary`）に
更新するため、直接参照しているファイルも同時に新しいスタイルになる。
直接参照箇所を Grep で洗い出して確認する。

**[Risk] Toast の position が `top-4 right-4` → `bottom-4 right-4` に変わることで、
既存の Toast 結合テストが位置クラスを期待している場合に壊れる**
→ Mitigation: 既存テストが挙動を assert している箇所のみ守護する。クラス名固定テストは
新しい期待値に追随してよい（受け入れ基準に明記済み）。

**[Risk] `NotificationPanel` のパネル位置（`left-[210px]`）がサイドバー幅変更（`w-[220px]`）に
追随していない**
→ Mitigation: パネルのオフセット値を `left-[220px]` に更新する。

---

## Open Questions

なし（要件・設計方針ともに確定済み）。
