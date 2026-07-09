# Tasks: UI デザイン基盤の刷新（デザイントークン＋ステータスバッジ体系）

## T-01: globals.css — デザイントークン値の刷新

- [x] `:root` ブロックの以下の変数値を更新する:
  - `--bg-page: #f1f5f9`
  - `--bg-surface: #ffffff`
  - `--bg-surface-alt: #f8fafc`
  - `--bg-toolbar: #f8fafc`
  - `--bg-header: #0f172a`
  - `--bg-table-head: #f8fafc`
  - `--bg-row-pending: #fffbeb`（既存値が近いが揃える）
  - `--bg-row-revision: #fff7ed`
  - `--bg-info: #e8effd`
  - `--bg-success-light: #f0fdf4`
  - `--border: #e2e8f0`
  - `--border-light: #f1f5f9`
  - `--border-table-head: #e2e8f0`
  - `--border-row-pending: #fde68a`（amber-200 相当）
  - `--border-row-revision: #fed7aa`（orange-200 相当）
  - `--border-success-light: #bbf7d0`（green-200 相当）
  - `--text: #0f172a`
  - `--text-secondary: #64748b`
  - `--text-muted: #94a3b8`
  - `--text-disabled: #cbd5e1`
  - `--text-placeholder: #94a3b8`
  - `--text-on-dark: #f8fafc`
  - `--text-on-dark-secondary: #cbd5e1`
  - `--text-on-dark-muted: #94a3b8`
  - `--text-on-dark-disabled: #64748b`
  - `--text-sidebar-muted: #64748b`
  - `--theme-primary: #1a56db`
  - `--theme-success: #16a34a`
  - `--theme-warning: #d97706`
  - `--theme-danger: #dc2626`
  - `--theme-revision: #ea580c`
  - `--theme-draft: #1a56db`
  - `--theme-expired: #94a3b8`
- [x] `[data-theme="dark"]` ブロックの以下の変数値を更新する:
  - `--bg-page: #0f172a`
  - `--bg-surface: #1e293b`
  - `--bg-surface-alt: #334155`
  - `--bg-toolbar: #334155`
  - `--bg-header: #020617`
  - `--bg-table-head: #334155`
  - `--bg-row-pending: #3d3520`（現行維持）
  - `--bg-row-revision: #3d2e20`（現行維持）
  - `--bg-info: #172554`
  - `--bg-success-light: #14532d`
  - `--border: #334155`
  - `--border-light: #293548`
  - `--border-table-head: #475569`
  - `--border-row-pending: #5a4a20`（現行維持）
  - `--border-row-revision: #5a3a20`（現行維持）
  - `--border-success-light: #166534`（green-800 相当）
  - `--text: #f1f5f9`
  - `--text-secondary: #cbd5e1`
  - `--text-muted: #94a3b8`
  - `--text-disabled: #475569`
  - `--text-placeholder: #475569`
  - `--text-on-dark: #f8fafc`（同左）
  - `--text-on-dark-secondary: #cbd5e1`（同左）
  - `--text-on-dark-muted: #94a3b8`（同左）
  - `--text-on-dark-disabled: #64748b`（同左）
  - `--theme-primary: #60a5fa`
  - `--theme-success: #4ade80`
  - `--theme-warning: #fbbf24`
  - `--theme-danger: #f87171`
  - `--theme-revision: #fb923c`
  - `--theme-draft: #60a5fa`
  - `--theme-expired: #64748b`
  - （`--text-sidebar-muted` はサイドバー専用。ダーク値は変更不要）

**Acceptance Criteria**:
- `:root` の全対象トークン値が仕様値に更新されている
- `[data-theme="dark"]` の全対象トークン値が仕様値に更新されている
- `@theme inline` の配線（`--color-*: var(--*)`）が既存のまま正しく動作する（ファイル変更不要）
- `bun run typecheck && bun run lint && bun run build` がエラーなく通る

---

## T-02: globals.css — ステータス系統トークンの新設

- [x] `:root` ブロックに以下のステータス系統トークンを追加する（既存トークンの後）:
  ```css
  /* ステータス系統トークン */
  --status-gray-text: #6b7280;
  --status-gray-bg: #f3f4f6;
  --status-blue-text: #2563eb;
  --status-blue-bg: #dbeafe;
  --status-green-text: #16a34a;
  --status-green-bg: #dcfce7;
  --status-yellow-text: #d97706;
  --status-yellow-bg: #fef3c7;
  --status-red-text: #dc2626;
  --status-red-bg: #fee2e2;
  --status-navy-text: #1e3a5f;
  --status-navy-bg: #dbeafe;
  ```
- [x] `[data-theme="dark"]` ブロックに以下のダーク値を追加する:
  ```css
  /* ステータス系統トークン（ダーク） */
  --status-gray-text: #d1d5db;
  --status-gray-bg: #374151;
  --status-blue-text: #93c5fd;
  --status-blue-bg: #1e3a8a;
  --status-green-text: #86efac;
  --status-green-bg: #14532d;
  --status-yellow-text: #fcd34d;
  --status-yellow-bg: #78350f;
  --status-red-text: #fca5a5;
  --status-red-bg: #7f1d1d;
  --status-navy-text: #bfdbfe;
  --status-navy-bg: #1e3a5f;
  ```
- [x] `@theme inline` ブロックに以下を追加する:
  ```css
  /* ステータス系統 */
  --color-status-gray-text: var(--status-gray-text);
  --color-status-gray-bg: var(--status-gray-bg);
  --color-status-blue-text: var(--status-blue-text);
  --color-status-blue-bg: var(--status-blue-bg);
  --color-status-green-text: var(--status-green-text);
  --color-status-green-bg: var(--status-green-bg);
  --color-status-yellow-text: var(--status-yellow-text);
  --color-status-yellow-bg: var(--status-yellow-bg);
  --color-status-red-text: var(--status-red-text);
  --color-status-red-bg: var(--status-red-bg);
  --color-status-navy-text: var(--status-navy-text);
  --color-status-navy-bg: var(--status-navy-bg);
  ```

**Acceptance Criteria**:
- `:root` に 6 系統 × 2（text/bg）= 12 変数が定義されている
- `[data-theme="dark"]` に同じ 12 変数のダーク値が定義されている
- `@theme inline` に `--color-status-*` が 12 個配線されている
- Tailwind クラス `bg-status-green-bg`・`text-status-red-text` 等がビルドで解決される

---

## T-03: StatusBadge.tsx — 共有コンポーネント新設

- [x] `src/app/(dashboard)/components/StatusBadge.tsx` を新規作成する
- [x] Props 型を定義する:
  ```typescript
  export type StatusBadgeVariant = "gray" | "blue" | "green" | "yellow" | "red" | "navy";
  type Props = {
    variant: StatusBadgeVariant;
    children: React.ReactNode;
    className?: string;
  };
  ```
- [x] variant ごとのクラスマップを定義する（例）:
  ```typescript
  const VARIANT_CLASS: Record<StatusBadgeVariant, string> = {
    gray: "bg-status-gray-bg text-status-gray-text",
    blue: "bg-status-blue-bg text-status-blue-text",
    green: "bg-status-green-bg text-status-green-text",
    yellow: "bg-status-yellow-bg text-status-yellow-text",
    red: "bg-status-red-bg text-status-red-text",
    navy: "bg-status-navy-bg text-status-navy-text",
  };
  ```
- [x] コンポーネント本体を実装する。`<span>` を使い `rounded-full px-2 py-0.5 text-2xs font-semibold whitespace-nowrap inline-block` のクラスを適用する
- [x] インタラクション（クリックハンドラ・フォーカス）は一切持たないこと
- [x] `"use client"` ディレクティブは付けない（Server Component として動作可能にする）

**Acceptance Criteria**:
- `src/app/(dashboard)/components/StatusBadge.tsx` が存在する
- `StatusBadgeVariant` 型がエクスポートされている
- `variant="green"` 時に `bg-status-green-bg` および `text-status-green-text` クラスが付与される
- `variant="red"` 時に `bg-status-red-bg` および `text-status-red-text` クラスが付与される
- `children` が描画される
- `bun run typecheck` が通る

---

## T-04: statusUtils.ts — variant 返却関数に置き換え

- [x] `statusClass` 関数を `statusVariant` 関数に置き換える（戻り値: `StatusBadgeVariant`）:
  - draft → `"gray"`
  - pending → `"yellow"`
  - approved → `"green"`
  - rejected → `"red"`
  - revision → `"yellow"`
  - expired → `"gray"`
- [x] `stepStatusClass` 関数を `stepStatusVariant` 関数に置き換える（戻り値: `StatusBadgeVariant`）:
  - pending → `"yellow"`
  - approved → `"green"`
  - rejected → `"yellow"`
- [x] `statusRowClass` 関数を更新する（Tailwind パレット直参照を廃止）:
  - pending → `"bg-bg-row-pending"`
  - revision → `"bg-bg-row-revision"`
  - その他 → `""`
- [x] `StatusBadgeVariant` 型を `StatusBadge.tsx` からインポートする
- [x] ファイル内に `text-[#` 形式の文字列が残っていないことを確認する

**Acceptance Criteria**:
- `statusVariant` 関数がエクスポートされ、全 6 ステータスに対して正しい variant を返す
- `stepStatusVariant` 関数がエクスポートされ、全 3 ステップステータスに対して正しい variant を返す
- `statusRowClass` が `bg-bg-row-pending` / `bg-bg-row-revision` / `""` を返す
- `statusClass`・`stepStatusClass` の export が削除されている（rename のため）
- ファイル内に `text-[#` が存在しない

---

## T-05: deals — フェーズ表示を StatusBadge に置換

### deals/page.tsx

- [x] `phaseVariant` ヘルパー関数を定義する（ファイル内または `labels.ts` の近傍に配置）:
  ```typescript
  const PHASE_VARIANT: Record<string, StatusBadgeVariant> = {
    hearing: "gray",
    proposal_prep: "blue",
    proposed: "blue",
    negotiation: "blue",
    won: "green",
    lost: "red",
    passed: "gray",
  };
  function phaseVariant(phase: string): StatusBadgeVariant {
    return PHASE_VARIANT[phase] ?? "gray";
  }
  ```
- [x] DataTable の `phase` 列の render を以下に変更する:
  ```tsx
  render: (row) => (
    <StatusBadge variant={phaseVariant(row.phase)}>
      {phaseLabels[row.phase] ?? row.phase}
    </StatusBadge>
  )
  ```
- [x] `StatusBadge` をインポートする

### deals/[id]/page.tsx — 契約テーブルのステータス列

- [x] 案件詳細ページ内の `dealContracts` テーブルの `status` 列 render を `<StatusBadge>` に変更する（contractStatusVariant を使用。T-07 の関数を参照/先行定義する）

**Acceptance Criteria**:
- `deals/page.tsx` のフェーズ列で `StatusBadge` が使用されている
- won=green / lost=red / hearing=gray のマッピングがソースに存在する
- `phaseLabels` の文字列は変更されていない（`getByText` で引き続き取得可能）
- `bun run typecheck` が通る

---

## T-06: inquiries — ステータス表示を StatusBadge に置換

### inquiries/InquiryStatusBadge.tsx

- [x] ファイルを削除する（StatusBadge に統合するため）

### inquiries/InquiryListView.tsx

- [x] `InquiryStatusBadge` のインポートを削除する
- [x] `StatusBadge` をインポートする
- [x] `inquiryStatusVariant` ヘルパー関数を定義する:
  ```typescript
  const INQUIRY_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
    new: "gray",
    converted: "green",
    declined: "gray",
  };
  ```
- [x] `<InquiryStatusBadge status={row.status} />` を以下に置換する:
  ```tsx
  <StatusBadge variant={INQUIRY_STATUS_VARIANT[row.status] ?? "gray"}>
    {statusLabels[row.status] ?? row.status}
  </StatusBadge>
  ```

### inquiries/[id]/InquiryStatusBanner.tsx

- [x] インラインスタイルの `style={{ backgroundColor: "#eef5fb", borderLeft: "3px solid #2980b9" }}` を Tailwind クラス `bg-bg-info border-l-4 border-primary` に置換する
- [x] インラインスタイルの `style={{ backgroundColor: "#eef7f1", borderLeft: "3px solid #cde6d8" }}` を `bg-bg-success-light border-l-4 border-success` に置換する

**Acceptance Criteria**:
- `InquiryStatusBadge.tsx` が削除されている
- `InquiryListView.tsx` が `StatusBadge` を使用し `statusLabels` の文字列が変わらない
- `InquiryStatusBanner.tsx` に `#eef5fb` 等のインライン hex が残っていない
- `bun run typecheck` が通る

---

## T-07: contracts — ステータス表示を StatusBadge に置換

- [x] `contractStatusVariant` ヘルパー関数を定義する（`labels.ts` の近傍または `contracts/page.tsx` 内）:
  ```typescript
  const CONTRACT_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
    active: "green",
    completed: "navy",
    cancelled: "red",
  };
  ```
- [x] `contracts/page.tsx` の DataTable `status` 列 render を `<StatusBadge>` に変更する
- [x] `contracts/[id]/page.tsx` の `contractStatusLabels[contract.status]` 表示を `<StatusBadge>` に変更する

**Acceptance Criteria**:
- `contracts/page.tsx` と `contracts/[id]/page.tsx` の契約ステータス表示が `StatusBadge` を使用している
- active=green / completed=navy / cancelled=red のマッピングがある
- `contractStatusLabels` の文字列は変更されていない
- `bun run typecheck` が通る

---

## T-08: invoices — 請求ステータスを StatusBadge に置換

- [x] `invoiceStatusVariant` ヘルパー関数を定義する（`InvoiceSection.tsx` 内または `labels.ts` 近傍）:
  ```typescript
  const INVOICE_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
    scheduled: "gray",
    invoiced: "blue",
    paid: "green",
    overdue: "red",
  };
  ```

### contracts/[id]/InvoiceSection.tsx

- [x] DataTable `status` 列の render を変更する:
  - 現行: `<span className={colorClass}>{invoiceStatusLabels[row.status] ?? row.status}</span>`
  - 変更後: `<StatusBadge variant={INVOICE_STATUS_VARIANT[row.status] ?? "gray"}>{invoiceStatusLabels[row.status] ?? row.status}</StatusBadge>`
- [x] `colorClass` の条件分岐（`text-primary` / `text-success` / `text-danger`）を削除する
- [x] `StatusBadge` をインポートする

### contracts/[id]/invoices/[invoiceId]/page.tsx

- [x] `invoice.status` 表示部分（`<span className={...}>` の条件分岐）を `<StatusBadge>` に置換する:
  ```tsx
  <StatusBadge variant={INVOICE_STATUS_VARIANT[invoice.status] ?? "gray"}>
    {invoiceStatusLabels[invoice.status] ?? invoice.status}
  </StatusBadge>
  ```

**Acceptance Criteria**:
- 両ファイルで請求ステータスが `StatusBadge` を使用している
- scheduled=gray / invoiced=blue / paid=green / overdue=red のマッピングがある
- `invoiceStatusLabels` の文字列は変更されていない
- `bun run typecheck` が通る

---

## T-09: requests 一覧 — BulkApprovalPanel を StatusBadge に移行

### requests/page.tsx

- [x] `statusClass` のインポートを削除し `statusVariant` をインポートする
- [x] `requests.map(...)` で渡す `statusClass: statusClass(r.status)` を `statusVariant: statusVariant(r.status)` に変更する

### requests/BulkApprovalPanel.tsx

- [x] `RequestItem` 型の `statusClass: string` フィールドを `statusVariant: StatusBadgeVariant` に変更する
- [x] `StatusBadge`・`StatusBadgeVariant` をインポートする
- [x] ステータス列の描画を変更する:
  ```tsx
  // 変更前
  <span className={`text-xs ${request.statusClass}`}>{request.statusText}</span>
  // 変更後
  <StatusBadge variant={request.statusVariant}>{request.statusText}</StatusBadge>
  ```

**Acceptance Criteria**:
- `requests/page.tsx` に `statusClass` のインポートが残っていない
- `BulkApprovalPanel.tsx` に `statusClass: string` フィールドが存在しない
- ステータス列が `StatusBadge` で描画される
- `bun run typecheck` が通る

---

## T-10: requests 詳細 — ローカル statusBadgeClass を StatusBadge に置換

### requests/[id]/page.tsx

- [x] ファイル末尾のローカル関数 `statusBadgeClass()` を削除する
- [x] `statusVariant` をインポートする（`statusUtils.ts` から）
- [x] `StatusBadge` をインポートする
- [x] ヘッダーのステータス表示を変更する:
  ```tsx
  // 変更前
  <span className={`rounded-full px-2 py-0.5 text-xs border flex-shrink-0 ${statusBadgeClass(request.status)}`}>
    {statusLabel(request.status)}
  </span>
  // 変更後
  <StatusBadge variant={statusVariant(request.status)} className="flex-shrink-0">
    {statusLabel(request.status)}
  </StatusBadge>
  ```
  （`className` prop を利用して `flex-shrink-0` を渡す）

**Acceptance Criteria**:
- `statusBadgeClass` 関数が削除されている
- ヘッダーのステータス表示が `StatusBadge` を使用している
- `bun run typecheck` が通る

---

## T-11: ApprovalStepper — ステップステータスチップを StatusBadge に置換

### requests/[id]/ApprovalStepper.tsx

- [x] `stepStatusVariant` を `statusUtils.ts` からインポートする
- [x] `StatusBadge` をインポートする
- [x] step のステータスラベルチップを `StatusBadge` に変更する:
  ```tsx
  // 変更前（条件分岐の inline クラス）
  <span className={[
    "text-[10px] rounded px-1.5 py-0.5",
    step.status === "approved" ? "bg-emerald-100 text-emerald-700" :
    step.status === "rejected" ? "bg-red-100 text-red-700" :
    isCurrent ? "bg-blue-100 text-blue-700" :
    "bg-bg-toolbar text-text-muted",
  ].join(" ")}>
    {stepStatusLabel(step.status)}
  </span>
  // 変更後
  <StatusBadge variant={stepStatusVariant(step.status)}>
    {stepStatusLabel(step.status)}
  </StatusBadge>
  ```
- [x] `StepIcon` の `bg-emerald-500`（承認済み丸）を `bg-status-green-text` に変更する
- [x] `StepIcon` の `bg-red-500`（却下丸）を `bg-status-red-text` に変更する
- [x] `ConnectorLine` の `bg-emerald-400`（完了ライン）を `bg-status-green-text/70` に変更する
- [x] 現在ステップ行のハイライト `bg-blue-50 border border-blue-200` を `bg-status-blue-bg border border-status-blue-bg` に変更する

**Acceptance Criteria**:
- ステップステータスチップが `StatusBadge` を使用している
- `bg-emerald-*`・`bg-red-*`・`bg-blue-*` のハードコード Tailwind パレットが残っていない
- `stepStatusLabel` の文字列は変更されていない
- `bun run typecheck` が通る

---

## T-12: StatusChipSelect — チップ配色をシステムトークン参照に置換

### src/app/(dashboard)/components/StatusChipSelect.tsx

- [x] `CHIP` マップのクラスを系統トークン参照に変更する:
  ```typescript
  const CHIP: Record<ActionItemStatus, string> = {
    todo: "bg-status-gray-bg text-status-gray-text border-status-gray-bg",
    in_progress: "bg-status-blue-bg text-status-blue-text border-status-blue-bg",
    done: "bg-status-green-bg text-status-green-text border-status-green-bg",
  };
  ```
- [x] `DOT` マップのクラスを系統トークン参照に変更する:
  ```typescript
  const DOT: Record<ActionItemStatus, string> = {
    todo: "bg-status-gray-text",
    in_progress: "bg-status-blue-text",
    done: "bg-status-green-text",
  };
  ```
- [x] `bg-blue-50`・`text-blue-700`・`bg-green-50`・`text-green-700` 等の Tailwind パレット直参照が残っていないことを確認する
- [x] ドロップダウンの開閉・onChange の挙動は一切変更しない

**Acceptance Criteria**:
- `CHIP` マップに `bg-blue-50`・`text-blue-700` 等の直参照が存在しない
- `DOT` マップに `bg-gray-400`・`bg-blue-500` 等の直参照が存在しない
- 開閉・選択の挙動が不変
- `bun run typecheck` が通る

---

## T-13: DealPhaseStepper — 終端フェーズ色をシステムトークン参照に更新

### src/app/(dashboard)/deals/[id]/DealPhaseStepper.tsx

- [x] 終端フェーズ表示 `<span>` のクラス条件分岐を更新する:
  - won: `"bg-status-green-bg text-status-green-text border-status-green-text/30"`
  - lost: `"bg-status-red-bg text-status-red-text border-status-red-text/30"`
  - その他（passed）: `"bg-status-gray-bg text-status-gray-text border-status-gray-text/30"`
- [x] `bg-green-50 text-green-700 border-green-300`・`bg-red-50 text-danger border-red-300`・`bg-gray-50 text-gray-700 border-gray-300` のハードコードが残っていないことを確認する
- [x] 既存の pill 形状・パディング（`rounded-full px-3.5 py-1.5 border`）は変更しない
- [x] ボタン類（受注にする・失注にする・見送りにする）のスタイルはスコープ外のため変更しない

**Acceptance Criteria**:
- 終端フェーズ span のクラスにシステムトークン参照が使用されている
- `bg-green-50`・`text-green-700` 等の直参照が削除されている
- ステッパーの操作挙動（フェーズ変更・ConfirmDialog 表示）は不変
- `bun run typecheck` が通る

---

## T-14: styles.ts — SECTION_CARD を rounded-lg に更新

### src/app/(dashboard)/styles.ts

- [x] `SECTION_CARD` の定義を以下に変更する:
  ```typescript
  export const SECTION_CARD = "bg-bg-surface border border-border rounded-lg shadow-sm";
  ```
  （`rounded` → `rounded-lg`。他の定数は変更しない）

**Acceptance Criteria**:
- `SECTION_CARD` に `rounded-lg` が含まれ、`rounded` のみの記述が残っていない（`rounded-lg` は `rounded` を包含しないので置換が必要）
- `BTN_*`・`INPUT_BASE`・`SELECT_BASE` 等の他定数は変更されていない
- `src/__tests__/static/uiBusinessStyle.test.ts` の `SECTION_CARD` に関する既存アサーションが壊れていないことを確認する（テストに `rounded-lg` アサーションはないため問題ないはず）

---

## T-15: statusUtils.test.ts — 期待値更新

### src/__tests__/domain/statusUtils.test.ts

- [x] TC-008 の関数名を `statusClass` → `statusVariant` に更新する
- [x] TC-008 のインポートを `statusClass` → `statusVariant` に変更する
- [x] TC-008 の各ステータスの期待値を variant 文字列に更新する:
  - `statusVariant("draft")` → `"gray"`
  - `statusVariant("pending")` → `"yellow"`
  - `statusVariant("approved")` → `"green"`
  - `statusVariant("rejected")` → `"red"`
  - `statusVariant("revision")` → `"yellow"`
  - `statusVariant("expired")` → `"gray"`
- [x] TC-011 の `statusRowClass` 期待値を更新する:
  - pending → `"bg-bg-row-pending"`
  - revision → `"bg-bg-row-revision"`
  - approved/draft/rejected → `""`
- [x] TC-012 の関数名を `stepStatusClass` → `stepStatusVariant` に更新し、期待値を更新する:
  - pending → `"yellow"`
  - approved → `"green"`
  - rejected → `"yellow"`

**Acceptance Criteria**:
- `bun test src/__tests__/domain/statusUtils.test.ts` が全件 pass する
- 挙動アサーション（関数の存在・ステータスごとの対応関係）が維持されている
- 新しいテストケースの追加・削除はしない（期待値の更新のみ）

---

## T-16: StatusBadge 単体テスト新設

- [x] `src/__tests__/components/StatusBadge.test.ts` を新規作成する
- [x] ファイル読み込みによる静的解析テストを実装する（既存テストパターンに倣う）:
  - `StatusBadge.tsx` が存在することを確認する
  - `StatusBadgeVariant` がエクスポートされていることを確認する
  - 各 variant のクラス文字列（`bg-status-green-bg text-status-green-text` 等）が全 6 系統ソースに存在することを確認する
  - `"use client"` ディレクティブが存在しないことを確認する（Server Component 対応）
  - `rounded-full` と `whitespace-nowrap` が含まれることを確認する（pill 形状）

**Acceptance Criteria**:
- `bun test src/__tests__/components/StatusBadge.test.ts` が全件 pass する
- 全 6 variant（gray/blue/green/yellow/red/navy）のクラスが検証されている

---

## T-17: 代表画面の表示テスト新設

- [x] `src/__tests__/components/statusBadgeIntegration.test.ts` を新規作成する
- [x] 静的解析テストを実装する（ファイル読み込みパターン）:
  - `deals/page.tsx` が `StatusBadge` をインポートしていること
  - `deals/page.tsx` に `phaseVariant` または `PHASE_VARIANT` が定義されていること
  - `deals/page.tsx` に `won.*green`（won フェーズ → green）相当のマッピングが存在すること
  - `deals/page.tsx` に `lost.*red` 相当のマッピングが存在すること
  - `deals/page.tsx` に `hearing.*gray` 相当のマッピングが存在すること
  - `requests/BulkApprovalPanel.tsx` が `StatusBadge` をインポートしていること
  - `requests/BulkApprovalPanel.tsx` に `statusVariant` の使用が存在すること
  - `contracts/[id]/InvoiceSection.tsx` が `StatusBadge` をインポートしていること
  - `contracts/[id]/InvoiceSection.tsx` に `overdue.*red` 相当のマッピングが存在すること
  - `contracts/[id]/InvoiceSection.tsx` に `paid.*green` 相当のマッピングが存在すること
  - `requests/statusUtils.ts` に `text-[#` が存在しないこと

**Acceptance Criteria**:
- `bun test src/__tests__/components/statusBadgeIntegration.test.ts` が全件 pass する
- 受け入れ基準の「代表画面のコンポーネント/表示テスト」を満たす

---

## T-18: 最終検証

- [x] `bun run typecheck` がエラーなしで通ること
- [x] `bun run lint` がエラーなしで通ること
- [x] `bun run build` がエラーなしで通ること
- [x] `bun test` で既存テストが全件 pass することを確認する（新テスト含む）
- [x] `bunx aozu check` が exit 0 であること
- [x] `src/__tests__/static/architecture.test.ts` が pass することを確認する（StatusBadge が mod-ui にマップされること）
- [x] `requests/statusUtils.ts` に `text-[#` が残っていないことを最終確認する
- [x] `StatusBadge.tsx` に `"use client"` が付いていないことを確認する

**Acceptance Criteria**:
- typecheck / lint / build / test / aozu check / architecture test が全件グリーン
- `requests/statusUtils.ts` に `text-[#` が存在しない
- `globals.css` にステータス 6 系統 × text/bg × ライト/ダーク のトークンが定義されている
