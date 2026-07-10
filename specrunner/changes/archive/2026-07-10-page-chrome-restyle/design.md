# Design: 画面骨格の格上げ

## Context

Clearflow の主要一覧・詳細画面は異なる時期に実装されており、ページ要素の視覚的階層と共通パターンが揃っていない。

**現状の問題点:**

1. **PageToolbar の埋没** — `bg-bg-toolbar border border-border px-2 py-1` のバー内に `span.text-sm.font-bold` でタイトルを表示。deals/[id] で先行済みのヒーロー行（背景なし・`h1.text-lg.font-bold`）と調子が合っていない。19 ファイルが使用する共有コンポーネントを 1 箇所変更することで全ページに波及できる。
2. **主要操作のリンク表記** — deals / inquiries / clients / requests / settings/policies / settings/templates の 6 箇所で `[新規作成]` 等のブラケット付き下線リンクが主操作に使われており、BTN_PRIMARY（塗りボタン）がない。contracts/page.tsx には新規作成の導線自体が存在しない。
3. **空状態の 4 系統分裂** — `py-8 text-text-disabled`・`py-4 text-text-muted`・左寄せ・`px-2 py-3` の小さな差が散在している。
4. **タブ 3 実装** — 下線式（requests・件数 pill 付き）/ 下線式（tasks・件数なし）/ 塗りボタン式（inquiries）の 3 系統が混在。
5. **詳細ヒーローが deals/[id] のみ** — contracts/[id]・inquiries/[id]・contracts/[id]/invoices/[invoiceId]・requests/[id] は旧 `bg-bg-toolbar` バーのままで、ステータスバッジが本文に埋没している。
6. **ログイン画面の未刷新** — 単色 `bg-bg-page` 背景・生パレット `bg-red-50 border-red-200` が残存。

前提として `StatusBadge`・BTN_PRIMARY 等のデザイントークン基盤・deals/[id] のヒーロー行が main に取り込み済みである。本変更は UI 層（`src/app` 配下と `globals.css`）に限定した再スタイル・再配置であり、遷移・Server Actions・API/MCP・DB・権限・集計は不変。

## Goals / Non-Goals

**Goals**:
- `PageToolbar.tsx` を背景なし・`h1.text-lg.font-bold` のヒーロー行に変更し、19 ファイルに一括波及させる
- 新規作成 6 箇所のブラケットリンクを BTN_PRIMARY の Link に置換（contracts への導線新設は行わない）
- tasks の「新規作成」ボタンを `TaskList` 内から `tasks/page.tsx` の PageToolbar actions に移動
- `EmptyState` 共有コンポーネントを新設し、一覧 0 件表示と詳細サブセクションに統一適用
- タブを下線式（`border-b-2`、RequestTabs 基準）に統一。RequestTabs の件数 pill をインラインテキストに変更
- inquiries/[id]・contracts/[id]・contracts/[id]/invoices/[invoiceId]・requests/[id] に deals/[id] 型ヒーロー行を横展開
- ログイン画面をグラジエント背景・拡大カード・トークン参照エラー・サブコピー変更に刷新

**Non-Goals**:
- 挙動・遷移・Server Action・API/MCP・DB・権限・集計の変更
- サイドバー・通知パネル・ユーザー領域・フォーム部品・トースト・ダイアログ
- 固定ヘッダー新設・ページネーション・行内アクションアイコン・検索 input 新設・アコーディオン
- 基本情報グリッドの 2 カラム化・新しい件数取得の追加
- FinanceDashboard / dashboard の変更
- deals/[id]/meetings/[meetingId] と clients/[id] のヒーロー化

## Decisions

### D1: PageToolbar を背景なし・h1 のヒーロー行に変更する

**決定**: `PageToolbar.tsx` の外枠を `flex items-center gap-2 flex-wrap mb-3`（`bg-bg-toolbar border border-border px-2 py-1` を除去）に変更する。タイトルを `<h1 className="text-lg font-bold text-text">` に昇格する。`|` 区切り span は除去する。`actions` は PageToolbar 内で `<div className="ml-auto flex items-center gap-3">` で右端に配置する。`ToolbarActions` コンポーネントは `flex items-center gap-3` のシンプルなラッパーとして維持する（ml-auto は PageToolbar 側で担う）。

`mb-3` を PageToolbar の外枠に持たせることで、現行ページの `border-t-0` による隣接 SectionCard との視覚的分離を代替する。

**Rationale**: 共有コンポーネント 1 箇所の変更で 19 ファイル全てに波及でき、個別修正コストを最小化する。deals/[id] のヒーロー行パターン（`flex items-center gap-2 flex-wrap`）と同型にすることで一貫性を保つ。`|` 区切りはバー形式に固有のビジュアルであり、背景なし行では不要。

**Alternatives**: 各ページを個別書き換えする案は修正箇所が多く、将来の乖離リスクが高い。

### D2: 新規作成アクションを BTN_PRIMARY の Link で統一する

**決定**: 6 箇所のブラケットリンクを `<Link href="..." className={BTN_PRIMARY}>＋ テキスト</Link>` に置換する。`BTN_PRIMARY` は既存 `src/app/(dashboard)/styles.ts` の定数を使用する。contracts/page.tsx への新規作成導線は**新設しない**（`/contracts/new` は `?dealId=` 必須の案件起点フローであり、request.md 要件 2 の決定に従う）。

tasks の「新規作成」ボタンは `TaskList.tsx` からすべての作成 UI（ボタン・モーダル・関連 state）を分離した `CreateTaskButton.tsx`（クライアントコンポーネント）として抽出し、`tasks/page.tsx` の PageToolbar `actions` に配置する。TaskList はリスト描画のみに専念する。

**Rationale**: 主要操作の視覚的階層を一覧全体で統一する。`CreateTaskButton` の抽出は、`tasks/page.tsx`（Server Component）と `TaskList`（Client Component）の境界を維持しながら位置だけを変更する手段として適切。モーダルが `fixed inset-0` オーバーレイを使用しているため、DOM 位置が変わっても動作は不変。

### D3: EmptyState を共有コンポーネントとして新設する

**決定**: `src/app/components/EmptyState.tsx` を新設し `src/app/components/index.ts` からエクスポートする。Props: `icon?: string`（絵文字）、`message: string`（必須）、`children?: ReactNode`（導線リンク等）、`className?: string`。形状: `py-10 text-center`、絵文字は `text-4xl block mb-2`、メッセージは `text-xs text-text-muted`。

適用方針:
- 一覧 0 件: `icon` を付与（clients 🏢 / deals 💼 / inquiries 📨 / contracts 📁 / tasks 📋 / requests 📝）
- 詳細サブセクション 0 件: `icon` 省略、文言のみ（**deals/[id] と clients/[id] の 2 ファイルのみ**。他の詳細画面には適用しない）

**Rationale**: 4 系統の空状態を 1 コンポーネントに集約し、将来の変更コストを最小化する。optional な icon prop により一覧・サブセクションの 2 パターンを単一コンポーネントでカバーできる。

### D4: タブを RequestTabs 型の下線式に統一する

**決定**: 基準スタイル: `border-b-2`、active = `border-primary text-primary font-bold`、非 active = `border-transparent text-text-secondary hover:text-text hover:border-border`。

- `inquiries/InquiryListView.tsx` の塗りボタン式（`bg-primary text-white border-primary`）を基準の下線式に書き換える。`setActiveTab` による state 管理・フィルタ挙動は不変。
- `tasks/page.tsx` のタブは既に下線式だが、クラスを RequestTabs に正確に揃える。
- `requests/RequestTabs.tsx` の件数 pill（`rounded-full bg-primary text-white px-1.5 py-0.5`）を削除し、ラベルを `{tab.label} ({tab.count})` のインラインテキストとして展開する。active 時は親 Link の `text-primary` を継承し、非 active 時は `text-text-secondary` を継承する。

**Rationale**: 3 系統のタブを 1 パターンに統一しユーザーの認知コストを下げる。件数 pill はモバイルで折り返しリスクがあり、parenthetical テキスト形式がシンプルで視認性が高い。

### D5: 詳細ヒーロー行を 4 画面に横展開する

**決定**: deals/[id] のパターン（パンくず行 → `flex items-center gap-2 flex-wrap` の h1 + StatusBadge + `ml-auto` 右端群）を 4 画面に適用する。dl にあるステータスバッジを移動した場合は dl から削除する。

| 画面 | 廃止するもの | パンくず | h1 の中身 | badge | ml-auto に移すもの | 現位置維持 |
|---|---|---|---|---|---|---|
| `inquiries/[id]` | 旧 `bg-bg-toolbar` バー全体 | 引合一覧 > 件名 | 件名 | 引合ステータス（既存 badge） | `InquiryActions`（案件化・辞退） | `DeleteInquiryButton`・`InquiryStatusBanner` |
| `contracts/[id]` | 旧 `bg-bg-toolbar` バー全体 | 契約一覧 > タイトル | 契約タイトル | 契約ステータス（dl から移動・dl 行削除） | 「案件を表示」「顧客を表示」リンク | `ContractStatusActions`・`DeleteContractButton`・承認待ちバナー |
| `invoices/[invoiceId]` | 旧 `bg-bg-toolbar` バー全体 | 契約一覧 > 契約名 > 請求タイトル | 請求タイトル | 請求ステータス（dl から移動・dl 行削除） | なし | `InvoiceActions`・`max-w-[560px] mx-auto` 維持 |
| `requests/[id]` | 先頭の「← 申請一覧に戻る」リンク・SectionCard 内の `border-b` ヘッダーブロック（h1・badge・メタ行） | 申請一覧 > タイトル | 申請タイトル | 申請ステータス | なし | `ActionButtons`（ステッパー下のまま）・メタ行はヒーロー直下 |

requests/[id] の変更詳細: SectionCard の `border-b border-border px-4 py-3` セクション（h1 + StatusBadge + メタ行を含む部分）を SectionCard から除去し、その内容をページ最上部のヒーロー行・パンくず行・メタ行として再配置する。SectionCard は `p-4` でフォームデータ・ApprovalStepper・ActionButtons のみを内包する。

**Rationale**: deals/[id] のパターンは既存の承認済みベストプラクティス。ステータスをヒーロー行に集約することで視認性が向上し、操作ボタンが右端に整列してスキャン性が上がる。

### D6: ログイン画面をグラジエント背景・トークン参照エラーに刷新する

**決定**: グラジエント値（`linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)`）を CSS カスタムプロパティ `--bg-login-gradient` として `globals.css` の `:root` と `[data-theme="dark"]` 双方に定義し（ライト/ダーク共通値）、JSX では `style={{ background: 'var(--bg-login-gradient)' }}` で参照する（hex を `src/app` 配下に直書きしない）。

変更詳細:
- 外側 div: `bg-bg-page` を除去し `style={{ background: 'var(--bg-login-gradient)' }}` を付与
- カード: `max-w-md` → `max-w-[380px]`、`py-4 px-4` → `p-9`、既存 `SectionCard`（`rounded shadow-sm`）は `rounded-xl shadow-lg` に変更（`SectionCard` の `className` prop で上書きする）
- ロゴ h1: `text-sm font-bold` → `text-xl font-bold text-primary`
- サブコピー h2: `text-xs text-text-muted`（クラス不変）・文言「承認ワークフローシステム」→「案件管理システム」
- エラー div: `bg-red-50 border border-red-200 text-danger` → `bg-status-red-bg border border-status-red-text text-status-red-text`
- `h3.text-sm.font-bold.text-text.mb-4`「ログイン」ラベルは削除する（ロゴが役割を担う）

**Rationale**: CSS 変数として切り出すことで `src/app` 配下に hex が入らない。ライト/ダーク共通グラジエントのため変数値は同一で構わないが、両セクションへの定義を残すことで将来の差分対応を可能にする。`bg-red-50 border-red-200` という生パレット残滓を解消し、トークン参照の一貫性を保つ。

## Risks / Trade-offs

- **[Risk] PageToolbar 利用 19 ファイルでのレイアウト崩れ**: `bg-bg-toolbar border` と `px-2 py-1` の除去により、ツールバーが描いていた視覚的枠がなくなる。フォーム画面（deals/new・requests/new 等）や settings 系・revenue 系でコンテンツとの間隔が詰まる可能性がある。
  **Mitigation**: 変更後に全 19 ページを目視確認する。PageToolbar に `mb-3` を持たせることで最低限の垂直間隔を確保する。

- **[Risk] tasks の CreateTaskButton 抽出による挙動変化**: モーダルの state 管理を別コンポーネントに移すことで、DOM 位置・z-index・スクロール挙動が変わる可能性がある。
  **Mitigation**: `fixed inset-0` オーバーレイは DOM 位置に依存しないため影響は最小。`router.refresh()` 呼び出しも変わらない。

- **[Risk] requests/[id] のカード構造変更で既存テスト失敗**: 既存テストが SectionCard 内 h1 の存在を文字列で確認している場合、移動後に失敗する。
  **Mitigation**: T-15 で既存テストを先に調査し、クラス名・DOM 構造固定テストの期待値のみを追随更新する（挙動アサーションは変更しない）。

## Open Questions

なし。全ての設計判断は本書の決定事項に網羅されている。
