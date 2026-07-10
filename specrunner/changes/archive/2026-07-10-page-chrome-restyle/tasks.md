# Tasks: 画面骨格の格上げ

<!-- FORMAT REQUIREMENTS:
Task heading format: `## T-NN: <task name>` (2-digit zero-padded, e.g. T-01)
Sub-task format:     `- [ ] <implementation detail>` (checkbox)

Each task MUST end with an **Acceptance Criteria** section listing verifiable conditions.
Tasks must be granular enough for the implementer to execute without additional clarification.
-->

## T-01: PageToolbar コンポーネントの再スタイル

対象ファイル: `src/app/components/PageToolbar.tsx`

- [x] 外枠 div のクラスを `"flex items-center gap-2 flex-wrap mb-3"` に変更する（`bg-bg-toolbar border border-border px-2 py-1` を削除、`justify-between` も削除）
- [x] タイトルを `<span className="text-sm font-bold text-text">` から `<h1 className="text-lg font-bold text-text">` に変更する
- [x] `children` がある場合の `|` 区切り span（`<span className="text-border mx-1">|</span>`）を削除する
- [x] `actions` を `{actions && <div className="ml-auto flex items-center gap-3">{actions}</div>}` でラップする（右端固定）
- [x] `ToolbarActions` コンポーネントのクラスを `"flex items-center gap-3"` に更新する（`gap-2` → `gap-3`）

**Acceptance Criteria**:
- `PageToolbar.tsx` の外枠 div に `bg-bg-toolbar` が含まれない
- `PageToolbar.tsx` に `<h1` タグが存在し `text-lg font-bold` クラスを持つ
- `|` 区切り span が存在しない
- `actions` が `ml-auto` を持つコンテナでラップされている

---

## T-02: requests/page.tsx のインラインツールバーを PageToolbar に置換

対象ファイル: `src/app/(dashboard)/requests/page.tsx`

- [x] `PageToolbar` と `ToolbarActions` を `@/app/components` からインポートする
- [x] lines 79-84 のインライン div（`flex items-center justify-between bg-bg-toolbar border border-border...`）を `<PageToolbar>` に置き換える
- [x] タイトル「申請管理」を `title` prop として渡す
- [x] 新規作成リンク（T-03 で BTN_PRIMARY 化する対象）を `actions` prop として渡す
- [x] `<div className="mb-0">` の外側ラッパーが不要になった場合は除去する

**Acceptance Criteria**:
- `requests/page.tsx` にインラインの `bg-bg-toolbar border border-border` div が存在しない
- `requests/page.tsx` が `PageToolbar` を使用してタイトル「申請管理」を描画している

---

## T-03: 新規作成 6 箇所をブラケットリンクから BTN_PRIMARY Link に置換

対象ファイル:
- `src/app/(dashboard)/deals/page.tsx`
- `src/app/(dashboard)/inquiries/page.tsx`
- `src/app/(dashboard)/clients/page.tsx`
- `src/app/(dashboard)/requests/page.tsx`（T-02 完了後）
- `src/app/(dashboard)/settings/policies/page.tsx`
- `src/app/(dashboard)/settings/templates/page.tsx`

各ファイルで以下を行う:
- [x] `BTN_PRIMARY` を `src/app/(dashboard)/styles.ts` からインポートする（既にインポート済みの場合はスキップ）
- [x] 旧リンク形式 `className="text-xs text-primary underline"` の新規作成 Link を `className={BTN_PRIMARY}` の Link に変更する
- [x] ラベル文言を以下の通りに変更する:
  - deals: `[新規作成]` → `＋ 新規作成`
  - inquiries: `[新規登録]` → `＋ 新規登録`
  - clients: `[新規登録]` → `＋ 新規登録`
  - requests: `[新規作成]` → `＋ 新規作成`
  - policies: `[ポリシーを追加]` → `＋ ポリシーを追加`
  - templates: `[テンプレートを追加]` → `＋ テンプレートを追加`
- [x] 遷移先 href は変更しない

**Acceptance Criteria**:
- 上記 6 ファイルそれぞれで `[新規作成]` や `[新規登録]` 等のブラケット表記が存在しない
- 各ファイルで新規作成 Link が `bg-primary text-white` を含むクラス（BTN_PRIMARY）を持つ
- 各ファイルで遷移先 href が変更されていない

---

## T-04: 欠番

contracts への新規作成導線は新設しない（request.md 要件 2: `/contracts/new` は `?dealId=` 必須の案件起点フローのため）。本タスクは削除された。

**Acceptance Criteria**:
- `contracts/page.tsx` に `/contracts/new` への新規リンクが追加されていない

---

## T-05: tasks の新規作成ボタンを PageToolbar へ移動（CreateTaskButton 抽出）

対象ファイル:
- 新規: `src/app/(dashboard)/tasks/CreateTaskButton.tsx`
- `src/app/(dashboard)/tasks/TaskList.tsx`
- `src/app/(dashboard)/tasks/page.tsx`

### CreateTaskButton.tsx の作成

- [x] `"use client"` ディレクティブを付与する
- [x] Props: `orgUsers: { id: string; name: string }[]`、`currentUserId: string`
- [x] `TaskList.tsx` の create 関連 state をそのままコピー移植する:
  - `showAddModal`・`showPicker`・`description`・`assigneeId`・`dueDate`・`linkTarget`・`error`
  - `isPending`・`startTransition`
  - `handleOpenAdd()`・`handleAdd()`
  - `router`（`useRouter`）・`showToast`（`useToast`）
- [x] モーダルダイアログ JSX（`showAddModal &&` ブロック、`fixed inset-0`）を丸ごとコピー移植する
- [x] `LinkTargetPicker` の使用（`showPicker` state 制御）を含める
- [x] 「新規作成」ボタン（`<button onClick={handleOpenAdd} className={BTN_PRIMARY}>`）を含める
- [x] コンポーネントの return は `<>ボタン + モーダル + Picker</>` のフラグメント形式とする
- [x] 必要な import を全て含める（`createActionItemAction`・`useRouter`・`useToast`・`Input`・`BTN_PRIMARY`・`BTN_SECONDARY`・`SELECT_BASE`・`LinkTargetPicker`）

### TaskList.tsx の変更

- [x] create 関連 state・ハンドラ・import（`useRouter`・`useToast`・`createActionItemAction`・`useTransition` 等）のうち、リスト描画に不要なものを削除する
- [x] モーダルダイアログ JSX ブロック（lines 77-123 相当）を削除する
- [x] `LinkTargetPicker` のモーダル外 JSX（lines 125-133 相当）を削除する
- [x] `<div className="flex items-center justify-between px-3.5 py-2">` ブロックのボタン部分を削除し、件数表示（`{items.length} 件`）のみ残す
- [x] `import { createActionItemAction }` 等の不要 import を削除する
- [x] `"use client"` ディレクティブは維持する（`ActionItemRow` が Client Component のため）

### page.tsx の変更

- [x] `CreateTaskButton` を `"./CreateTaskButton"` からインポートする
- [x] `<PageToolbar title="タスク" />` を `<PageToolbar title="タスク" actions={<CreateTaskButton orgUsers={orgUsers} currentUserId={currentUserId} />} />` に変更する
- [x] `orgUsers` と `currentUserId` は既存の変数から渡す

**Acceptance Criteria**:
- `CreateTaskButton.tsx` が存在し `"use client"` を持ち、ボタンとモーダルを含む
- `TaskList.tsx` に `showAddModal`・`handleOpenAdd` 等の create 関連 state が存在しない
- `tasks/page.tsx` の PageToolbar に `CreateTaskButton` が配置されている
- タスク作成のモーダル起動・フォーム操作・Server Action 呼び出し・router.refresh() の挙動が変わらない

---

## T-06: EmptyState コンポーネントの新設

対象ファイル:
- 新規: `src/app/components/EmptyState.tsx`
- `src/app/components/index.ts`

### EmptyState.tsx の作成

- [x] Props: `icon?: string`（絵文字）、`message: string`、`children?: ReactNode`、`className?: string`
- [x] 外枠: `<div className={`py-10 text-center ${className ?? ""}`}>`
- [x] `icon` が存在する場合: `<span className="text-4xl block mb-2">{icon}</span>`
- [x] メッセージ: `<p className="text-xs text-text-muted">{message}</p>`
- [x] `children` が存在する場合: `<div className="mt-2">{children}</div>`
- [x] `import type { ReactNode } from "react"` を追加する

### index.ts への追加

- [x] `export { EmptyState } from "./EmptyState"` を追加する

**Acceptance Criteria**:
- `EmptyState.tsx` が存在し Props に `icon?`・`message`・`children?`・`className?` を持つ
- icon を渡した場合と渡さない場合で条件分岐がある
- `index.ts` から EmptyState がエクスポートされている

---

## T-07: EmptyState の一覧・詳細サブセクションへの適用

対象ファイル（一覧 0 件）:
- `src/app/(dashboard)/clients/page.tsx`
- `src/app/(dashboard)/deals/page.tsx`（SectionCard 内の `py-4` 系）
- `src/app/(dashboard)/contracts/page.tsx`（SectionCard 内の `py-4` 系）
- `src/app/(dashboard)/inquiries/InquiryListView.tsx`
- `src/app/(dashboard)/tasks/TaskList.tsx`
- `src/app/(dashboard)/requests/page.tsx`

対象ファイル（詳細サブセクション 0 件・**この 2 ファイルのみ**）:
- `src/app/(dashboard)/deals/[id]/page.tsx`（商談記録・契約 0 件メッセージ）
- `src/app/(dashboard)/clients/[id]/page.tsx`（関連引合・関連案件・関連契約・担当者の 0 件メッセージ）

### 一覧 0 件への適用

各ファイルで以下を行う:
- [x] `EmptyState` を `@/app/components` からインポートする
- [x] 既存の 0 件表示 div/p を `<EmptyState icon="絵文字" message="...">` に置き換える
- [x] 絵文字の割り当て: clients 🏢 / deals 💼 / inquiries 📨 / contracts 📁 / tasks 📋 / requests 📝
- [x] 既存の導線リンク（「最初の○○を登録する」等）は `children` として維持する
- [x] `inquiries/InquiryListView.tsx` の 0 件表示（`text-center py-8 text-text-disabled text-sm` 相当）を `<EmptyState icon="📨" message="該当する引合はありません" />` に置き換える
- [x] `tasks/TaskList.tsx` の 0 件表示（`text-xs text-text-muted px-3.5 py-4`）を `<EmptyState icon="📋" message="タスクはありません" className="px-3.5" />` に置き換える

### 詳細サブセクション 0 件への適用

- [x] `deals/[id]/page.tsx` の商談記録 0 件（`<p className="text-xs text-text-muted">商談記録がありません</p>`）を `<EmptyState message="商談記録がありません" />` に置き換える
- [x] `deals/[id]/page.tsx` の契約 0 件メッセージを `<EmptyState message="..." />` に置き換える
- [x] `clients/[id]/page.tsx` の SectionCard 内 `text-xs text-text-muted` 0 件メッセージ（関連引合・関連案件・関連契約）を `<EmptyState message="..." />` に置き換える（icon は省略・文言不変）
- [x] 上記 2 ファイル以外の詳細画面には適用しない

**Acceptance Criteria**:
- 一覧 6 ページで 0 件表示が `EmptyState` コンポーネントを使用し、各絵文字が設定されている
- 一覧の既存導線リンク（「最初の○○を登録する」等）の文言・href が変わらない
- 詳細サブセクションの 0 件表示が `EmptyState`（icon なし）を使用している

---

## T-08: タブを下線式に統一（InquiryListView・TasksPage）

### inquiries/InquiryListView.tsx の変更

- [x] ステータスタブの button 要素のクラスを塗りボタン式から下線式に変更する:
  - 旧 active: `"bg-primary text-white border-primary font-bold"`
  - 新 active: `"border-b-2 border-primary text-primary font-bold"`
  - 旧 非 active: `"bg-bg-surface text-text border-border hover:bg-bg-toolbar"`
  - 新 非 active: `"border-b-2 border-transparent text-text-secondary hover:text-text hover:border-border"`
- [x] ボタン外枠（タブコンテナ）を `"flex items-end gap-0 border-b border-border"` でラップする（`px-2 py-2 bg-bg-toolbar border border-border border-t-0` の filter bar から分離する必要がある場合はレイアウトを調整）
- [x] `active === tab.value` による選択状態の判定は不変
- [x] タブボタンに `px-4 py-2 text-xs font-medium transition-colors` のベースクラスを付与する
- [x] フィルタ（source dropdown・search input）は変更しない

### tasks/page.tsx の変更

- [x] 未完了・完了タブのクラスを RequestTabs 基準に揃える:
  - active: `"border-b-2 border-primary text-primary font-bold bg-bg-surface px-4 py-2 text-xs font-medium"`
  - 非 active: `"border-b-2 border-transparent text-text-secondary hover:text-text hover:border-border px-4 py-2 text-xs font-medium"`
- [x] タブコンテナ（`flex gap-0 border-b border-border`）は維持する
- [x] 「自分のタスク」「全員」のフィルタ Link は変更しない

**Acceptance Criteria**:
- `InquiryListView.tsx` のタブ button に `border-b-2` が存在し、`bg-primary text-white border-primary` の組み合わせが存在しない
- `tasks/page.tsx` のタブクラスが RequestTabs と同系統のクラス構成になっている
- フィルタ挙動（state・URL パラメータ）が変わらない

---

## T-09: RequestTabs の件数 pill をインラインテキストに変更

対象ファイル: `src/app/(dashboard)/requests/RequestTabs.tsx`

- [x] 件数 pill の span 要素（`className={...} "rounded-full px-1.5 py-0.5 text-[10px] ..."}`）を削除する
- [x] ラベルの描画を `<span>{tab.label}</span>` から `{tab.label} ({tab.count})` のインラインテキストに変更する（span を使わずに直接テキストとして展開、またはシンプルな span で包む）
- [x] active 時の件数テキストカラーは Link の `text-primary` を継承させる（追加クラス不要）
- [x] 非 active 時の件数テキストカラーは Link の `text-text-secondary` を継承させる

**Acceptance Criteria**:
- `RequestTabs.tsx` に `rounded-full bg-primary text-white` の pill クラスが存在しない
- `RequestTabs.tsx` が `{tab.label} ({tab.count})` 形式または同等のテキストを描画するコードを含む
- タブの件数取得元（`count` prop）が変わらない

---

## T-10: inquiries/[id] の詳細ヒーロー横展開

対象ファイル: `src/app/(dashboard)/inquiries/[id]/page.tsx`

- [x] 先頭の `bg-bg-toolbar border border-border px-2 py-1` div（lines 57-66 相当）を削除する
- [x] パンくず行を新設する: `<div className="text-xs text-text-muted mb-0.5"><Link href="/inquiries" className="text-primary underline">引合一覧</Link>{" > "}{inquiry.title}</div>`
- [x] ヒーロー行を新設する: `<div className="flex items-center gap-2 flex-wrap">`
  - `<h1 className="text-lg font-bold text-text">{inquiry.title}</h1>`
  - `<StatusBadge variant={INQUIRY_STATUS_VARIANT[inquiry.status] ?? "gray"}>{statusLabels[inquiry.status] ?? inquiry.status}</StatusBadge>`
  - `<div className="ml-auto flex items-center gap-3"><InquiryActions .../></div>`
- [x] `InquiryActions` コンポーネントを Actions SectionCard（lines 124-141 相当）から ml-auto エリアへ移動する
- [x] Actions SectionCard の `inquiry.status !== "converted"` 条件での `InquiryActions` 呼び出しを削除する
- [x] `DeleteInquiryButton` は Actions SectionCard 内に残す（ml-auto に移動しない）
- [x] `InquiryStatusBanner` は現位置（ヒーロー行の直下）に維持する

**Acceptance Criteria**:
- `inquiries/[id]/page.tsx` に `<h1` と `StatusBadge` がヒーロー行の flex コンテナ内に存在する
- パンくずに `/inquiries` へのリンクが存在し「引合一覧」テキストを持つ
- `bg-bg-toolbar border border-border` の旧バーが存在しない
- `InquiryActions` が ml-auto コンテナ内に存在する
- `DeleteInquiryButton` が ml-auto に移動していない

---

## T-11: contracts/[id] の詳細ヒーロー横展開

対象ファイル: `src/app/(dashboard)/contracts/[id]/page.tsx`

- [x] 先頭の `bg-bg-toolbar border border-border px-2 py-1` div（lines 55-61 相当）を削除する
- [x] パンくず行を新設する: `<div className="text-xs text-text-muted mb-0.5"><Link href="/contracts" className="text-primary underline">契約一覧</Link>{" > "}{contract.title}</div>`
- [x] ヒーロー行を新設する: `<div className="flex items-center gap-2 flex-wrap">`
  - `<h1 className="text-lg font-bold text-text">{contract.title}</h1>`
  - `<StatusBadge variant={CONTRACT_STATUS_VARIANT[contract.status] ?? "gray"}>{contractStatusLabels[contract.status] ?? contract.status}</StatusBadge>`
  - `<div className="ml-auto flex items-center gap-3">「案件を表示」「顧客を表示」リンク</div>`
- [x] 「案件を表示」リンク（`href={/deals/${contract.dealId}}`）を ml-auto エリアへ移動する
- [x] 「顧客を表示」リンク（`href={/clients/${contract.clientId}}`）を ml-auto エリアへ移動する
- [x] SectionCard 内の dl の `<div className="flex gap-2">` ステータス行（`<dt>ステータス</dt>`）を削除する（ヒーロー行に移動済み）
- [x] `ContractStatusActions`・`DeleteContractButton`・`isPending` バナーは現位置を維持する
- [x] 関連情報 dl の案件・顧客リンクは dl から削除する（ml-auto エリアに移動したため）

**Acceptance Criteria**:
- `contracts/[id]/page.tsx` に `<h1` と `StatusBadge` がヒーロー行の flex コンテナ内に存在する
- パンくずに `/contracts` へのリンクが存在する
- `bg-bg-toolbar border border-border` の旧バーが存在しない
- dl 内に `<dt>ステータス</dt>` 行が存在しない
- 「案件を表示」「顧客を表示」リンクが ml-auto コンテナ内に存在する

---

## T-12: contracts/[id]/invoices/[invoiceId] の詳細ヒーロー横展開

対象ファイル: `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx`

- [x] 先頭の `bg-bg-toolbar border border-border px-2 py-1` div（lines 50-58 相当）を削除する
- [x] パンくず行を新設する: `<div className="text-xs text-text-muted mb-0.5"><Link href="/contracts" className="text-primary underline">契約一覧</Link>{" > "}<Link href={/contracts/${contractId}} className="text-primary underline">{contract.title}</Link>{" > "}{invoice.title}</div>`
- [x] ヒーロー行を新設する: `<div className="flex items-center gap-2 flex-wrap">`
  - `<h1 className="text-lg font-bold text-text">{invoice.title}</h1>`
  - `<StatusBadge variant={INVOICE_STATUS_VARIANT[invoice.status] ?? "gray"}>{invoiceStatusLabels[invoice.status] ?? invoice.status}</StatusBadge>`
  - ml-auto 要素なし（右端アクションなし）
- [x] `max-w-[560px] mx-auto` の中央寄せラッパーを維持する（ヒーロー行はその外か内かを判断: 仕様通り `max-w-[560px] mx-auto` 内に収める）
- [x] SectionCard 内の dl の `<dt>ステータス</dt>` 行を削除する（ヒーロー行に移動済み）
- [x] `InvoiceActions` は SectionCard 内の現位置を維持する

**Acceptance Criteria**:
- `invoices/[invoiceId]/page.tsx` に `<h1` と `StatusBadge` がヒーロー行の flex コンテナ内に存在する
- パンくずに `/contracts` へのリンクと契約詳細リンクが存在する
- `bg-bg-toolbar border border-border` の旧バーが存在しない
- dl 内に `<dt>ステータス</dt>` 行が存在しない

---

## T-13: requests/[id] の詳細ヒーロー横展開

対象ファイル: `src/app/(dashboard)/requests/[id]/page.tsx`

- [x] 先頭の「← 申請一覧に戻る」リンク div（lines 75-78 相当）を削除する
- [x] パンくず行を新設する: `<div className="text-xs text-text-muted mb-0.5"><Link href="/requests" className="text-primary underline">申請一覧</Link>{" > "}{request.title}</div>`
- [x] ヒーロー行を新設する: `<div className="flex items-center gap-2 flex-wrap">`
  - `<h1 className="text-lg font-bold text-text">{request.title}</h1>`
  - `<StatusBadge variant={statusVariant(request.status)}>{statusLabel(request.status)}</StatusBadge>`
  - ml-auto 要素なし
- [x] メタ行（申請者・申請日時）をヒーロー行の直下に配置する: `<div className="mt-1.5 flex items-center gap-3 text-xs text-text-muted flex-wrap">` （内容は不変）
- [x] SectionCard 内の `border-b border-border px-4 py-3` ヘッダーブロック（h1・StatusBadge・メタ行を含む部分）を削除する
- [x] SectionCard は `<div className="p-4">` の内容のみ残す（SystemOriginBanner・フォームデータ・更新日時・ApprovalStepper・ActionButtons）
- [x] `SectionCard` タグを `<SectionCard>` のまま維持し、内容の再配置のみを行う

**Acceptance Criteria**:
- `requests/[id]/page.tsx` に `<h1` と `StatusBadge` が SectionCard 外のヒーロー行 flex コンテナ内に存在する
- パンくずに `/requests` へのリンクが存在し「申請一覧」テキストを持つ
- 「← 申請一覧に戻る」テキストが存在しない
- `SectionCard` 内の `border-b border-border px-4 py-3` ブロックが存在しない
- `ActionButtons` が SectionCard 内に引き続き存在する

---

## T-14: ログイン画面の刷新

対象ファイル:
- `src/app/globals.css`
- `src/app/(auth)/login/page.tsx`

### globals.css の変更

- [x] `:root` ブロックに `--bg-login-gradient: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);` を追加する
- [x] `[data-theme="dark"]` ブロックにも同値で `--bg-login-gradient: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);` を追加する

### login/page.tsx の変更

- [x] 最外 div のクラスから `bg-bg-page` を削除し、`style={{ background: 'var(--bg-login-gradient)' }}` を付与する（`min-h-screen flex items-center justify-center` は維持）
- [x] 内側ラッパー div のクラスを `max-w-md w-full space-y-4 px-4` から `max-w-[380px] w-full space-y-4` に変更する（幅制約 380px はラッパー側で担う）
- [x] カードの `SectionCard` の `className` を `py-4 px-4` から `rounded-xl p-9 shadow-lg` に変更する（幅指定は付けない。ラッパーの 380px に従う）
- [x] ロゴ `h1` のクラスを `"text-sm font-bold text-center text-text"` から `"text-xl font-bold text-center text-primary"` に変更する
- [x] サブコピー `h2` の文言を「承認ワークフローシステム」から「案件管理システム」に変更する（クラスは `"mt-1 text-center text-xs text-text-muted"` のまま）
- [x] 「ログイン」の `h3` ラベル（`text-sm font-bold text-text mb-4`）を削除する
- [x] エラー表示の div のクラスを `"mb-4 p-3 bg-red-50 border border-red-200 text-danger text-xs"` から `"mb-4 p-3 bg-status-red-bg border border-status-red-text text-status-red-text text-xs"` に変更する
- [x] `space-y-4` の外側 div は維持する
- [x] フォーム（email・password・SubmitButton）は変更しない

**Acceptance Criteria**:
- `globals.css` の `:root` ブロックに `--bg-login-gradient` が定義されている
- `login/page.tsx` の最外 div に `bg-bg-page` が含まれず `var(--bg-login-gradient)` の参照が含まれる
- `login/page.tsx` のエラー div に `bg-red-50`・`border-red-200` が含まれず `bg-status-red-bg` が含まれる
- ログイン h1 が `text-xl font-bold text-primary` を含む
- 「案件管理システム」テキストが存在し「承認ワークフローシステム」テキストが存在しない
- 認証処理・フォーム項目が変更されていない

---

## T-15: テストの追加と既存テストの追随更新

対象ファイル:
- 新規: `src/__tests__/components/pageToolbar.test.ts`
- 新規: `src/__tests__/components/emptyState.test.ts`
- 新規: `src/__tests__/components/detailHeroPages.test.ts`
- 新規: `src/__tests__/static/newCreateLinks.test.ts`
- `src/__tests__/components/dealDetailHeroHeader.test.ts`（既存・変更不要なことを確認）

### pageToolbar.test.ts

- [x] `PageToolbar.tsx` が `<h1` を含むことを確認するテストを書く
- [x] `PageToolbar.tsx` が `text-lg font-bold` クラスを含むことを確認するテストを書く
- [x] `PageToolbar.tsx` に `bg-bg-toolbar` が含まれないことを確認するテストを書く
- [x] テストは `readFile` + `expect(content).toContain()` 形式（既存パターンに準拠）

### emptyState.test.ts

- [x] `EmptyState.tsx` が `icon` prop に対する条件分岐を含むことを確認するテストを書く
- [x] `EmptyState.tsx` が `message` prop の描画コードを含むことを確認するテストを書く
- [x] `EmptyState.tsx` が `children` prop の描画コードを含むことを確認するテストを書く
- [x] `EmptyState.tsx` が `text-xs text-text-muted` を含むことを確認するテストを書く
- [x] `EmptyState.tsx` が `py-10 text-center` を含むことを確認するテストを書く

### detailHeroPages.test.ts

以下 4 ファイルそれぞれに対し:
- [x] `<h1` が存在することを確認するテストを書く
- [x] `StatusBadge` が存在することを確認するテストを書く
- [x] 一覧リンク（`/inquiries`・`/contracts`・`/requests`）が存在することを確認するテストを書く
- [x] `bg-bg-toolbar border border-border` の旧バーが存在しないことを確認するテストを書く

対象: `inquiries/[id]/page.tsx`・`contracts/[id]/page.tsx`・`contracts/[id]/invoices/[invoiceId]/page.tsx`・`requests/[id]/page.tsx`

### newCreateLinks.test.ts

以下 6 ファイルそれぞれに対し:
- [x] `BTN_PRIMARY` またはその定数値（`bg-primary text-white`）を含む新規作成 Link が存在することを確認するテストを書く
- [x] ブラケット `[` が新規作成テキストに含まれないことを確認するテストを書く

対象: `deals/page.tsx`・`inquiries/page.tsx`・`clients/page.tsx`・`requests/page.tsx`・`settings/policies/page.tsx`・`settings/templates/page.tsx`

さらに contracts について（spec.md「存在しない」シナリオ対応）:
- [x] `contracts/page.tsx` に `/contracts/new` へのリンクが**存在しない**ことを確認するテストを書く

### 既存テストの調査と追随更新

- [x] `bun test` を実行し、クラス名・DOM 構造固定テストが新しい実装によって失敗していないか確認する
- [x] 失敗している場合、期待値の変更が「クラス名・DOM 構造の追随」であれば更新する（挙動アサーションは変更しない）
- [x] `src/__tests__/static/uiBusinessStyle.test.ts` の既存テストが引き続きパスすることを確認する
- [x] `src/__tests__/components/dealDetailHeroHeader.test.ts` の既存テストが変更なしでパスすることを確認する

**Acceptance Criteria**:
- `pageToolbar.test.ts` が存在し全テストが green
- `emptyState.test.ts` が存在し全テストが green
- `detailHeroPages.test.ts` が存在し全テストが green（4 ページ × 4 項目 = 16 テスト以上）
- `newCreateLinks.test.ts` が存在し全テストが green（6 ファイル × 2 項目 = 12 テスト以上 ＋ contracts 非存在テスト 1 件以上）
- `bun test` 全体が green

---

## T-16: mock-fidelity-check.md の作成

対象ファイル: `specrunner/changes/page-chrome-restyle/mock-fidelity-check.md`

参照資料: `/Users/seki/Documents/GitHub/clearflow/specrunner/reference/juchu-mock/mock.html`・`mock-styles.css`・`design-spec.md`

- [x] 参照資料（`mock.html`・`mock-styles.css`・`design-spec.md`）の該当箇所を読む
- [x] 対象画面ごとに「モックの該当箇所 / 適用した値 / 意図的な差異と理由」を記録するセクションを作成する
- [x] 対象画面: 一覧ツールバー（PageToolbar）/ 一覧フィルタバー / 空状態 / タブ / 詳細ヒーロー（4 画面）/ ログイン
- [x] 参照資料が存在しない環境では「参照資料なし」と明記し、本書の仕様値のみを正として記録する

**Acceptance Criteria**:
- `specrunner/changes/page-chrome-restyle/mock-fidelity-check.md` が存在する
- 対象画面ごとのセクションが存在する
- 各セクションに「モックの該当箇所 / 適用した値 / 意図的な差異と理由」が記録されている（または参照資料なし旨の記録がある）

---

## T-17: 品質ゲート確認

- [x] `bun run typecheck` が exit 0 で完了する
- [x] `bun run lint` が exit 0 で完了する
- [x] `bun run build` が exit 0 で完了する
- [x] `bun test` の全テストが green（既存 144 件 + 新規追加分）
- [x] `aozu check` が exit 0 で完了する
- [x] アーキテクチャテスト（`src/__tests__/static/architecture.test.ts`）が green
- [x] `src/app` 配下の変更ファイルに `bg-red-\d+`・`border-red-\d+`・`text-[#`・`bg-[#` が存在しないことを確認する

**Acceptance Criteria**:
- 上記全コマンドが exit 0
- 生パレット正規表現チェックで新規導入がない
