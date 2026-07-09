# Tasks: controls-tables-restyle

## T-01: styles.ts ボタン定数の 3 階層化と不要定数の廃止

`src/app/(dashboard)/styles.ts` を編集する。

- [x] `BTN_PRIMARY` を `"bg-primary text-white text-xs font-medium rounded px-4 py-1.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"` に変更する
- [x] `BTN_SECONDARY` を `"bg-bg-surface text-text text-xs font-medium rounded px-4 py-1.5 border border-border hover:bg-bg-surface-alt disabled:opacity-50"` に変更する
- [x] `BTN_DANGER` を `"bg-danger text-white text-xs font-medium rounded px-4 py-1.5 hover:opacity-90 disabled:opacity-50"` に変更する
- [x] `BTN_PRIMARY_DISABLED` export を削除する
- [x] `BTN_SUCCESS` export を削除する
- [x] `BTN_WARNING` export を削除する
- [x] `BTN_SUBMIT` export を削除する
- [x] `INPUT_BASE` を `"w-full border border-border rounded px-2.5 py-1.5 text-xs text-text bg-bg-surface focus:border-primary focus:outline-none placeholder:text-text-placeholder"` に更新する（`text-text bg-bg-surface placeholder:text-text-placeholder` を追加）
- [x] `SELECT_BASE` を `"block w-full border border-border rounded px-2.5 py-1.5 text-xs text-text bg-bg-surface focus:border-primary focus:outline-none"` に更新する（`text-text bg-bg-surface` を追加）

**Acceptance Criteria**:
- `styles.ts` の export に `BTN_PRIMARY_DISABLED` / `BTN_SUCCESS` / `BTN_WARNING` / `BTN_SUBMIT` が存在しない
- `BTN_PRIMARY` の値に `bg-primary text-white` と `hover:opacity-90` と `disabled:opacity-50` が含まれる
- `BTN_SECONDARY` の値に `bg-bg-surface` と `border border-border` と `hover:bg-bg-surface-alt` が含まれる
- `BTN_DANGER` の値に `bg-danger text-white` が含まれる
- `INPUT_BASE` と `SELECT_BASE` に `text-text` と `bg-bg-surface` が含まれる
- `bun run typecheck` が通る（`UserDeactivateButton.tsx` の既存 import が壊れていない）

---

## T-02: DataTable ヘッダー色と行 hover の統一

`src/app/components/DataTable.tsx` を編集する。

- [x] th の className を `text-table-head text-text font-medium` から `text-table-head text-text-secondary font-medium` に変更する（`text-text` → `text-text-secondary`）
- [x] クリック可能行の hover クラスを `hover:bg-primary/10` から `hover:bg-bg-surface-alt` に変更する
  - 変更前: `` `border-b border-border-light ${clickable ? "cursor-pointer hover:bg-primary/10" : "hover:bg-bg-surface-alt"} ...` ``
  - 変更後: `` `border-b border-border-light ${clickable ? "cursor-pointer hover:bg-bg-surface-alt" : "hover:bg-bg-surface-alt"} ...` ``
  - さらに同一クラスなので: `` `border-b border-border-light hover:bg-bg-surface-alt ${clickable ? "cursor-pointer" : ""} ...` `` に整理してもよい

**Acceptance Criteria**:
- `DataTable.tsx` の th className に `text-text-secondary` が含まれ、`text-text` の単独指定が残っていない（`text-text-secondary` は別物なので確認）
- `DataTable.tsx` に `hover:bg-primary/10` が存在しない
- `DataTable.tsx` の clickable 行・非 clickable 行ともに `hover:bg-bg-surface-alt` が適用されている

---

## T-03: BulkApprovalPanel 結果アラートのトークン化

`src/app/(dashboard)/requests/BulkApprovalPanel.tsx` を編集する。

- [x] 結果アラートのクラスを以下のように置換する:
  - `resultType === "success"` の分岐: `bg-green-50 border-green-300 text-green-800` → `bg-bg-success-light border-border-success-light text-success`
  - `resultType === "error"` の分岐: `bg-red-50 border-red-300 text-red-800` → `bg-status-red-bg border-status-red-text/30 text-status-red-text`
  - `else`（partial）の分岐: `bg-yellow-50 border-yellow-300 text-yellow-800` → `bg-bg-row-pending border-border-row-pending text-warning`

変更箇所（現在の 149〜153 行あたりのテンプレートリテラル）:
```tsx
// Before
resultType === "success"
  ? "bg-green-50 border-green-300 text-green-800"
  : resultType === "error"
    ? "bg-red-50 border-red-300 text-red-800"
    : "bg-yellow-50 border-yellow-300 text-yellow-800"
// After
resultType === "success"
  ? "bg-bg-success-light border-border-success-light text-success"
  : resultType === "error"
    ? "bg-status-red-bg border-status-red-text/30 text-status-red-text"
    : "bg-bg-row-pending border-border-row-pending text-warning"
```

**Acceptance Criteria**:
- `BulkApprovalPanel.tsx` に `bg-green-50` / `bg-red-50` / `bg-yellow-50` が存在しない
- `bg-bg-success-light` / `bg-status-red-bg` / `bg-bg-row-pending` が各分岐に存在する

---

## T-04: InvoiceSection 進捗チャートのトークン化

`src/app/(dashboard)/contracts/[id]/InvoiceSection.tsx` を編集する。

- [x] プログレスバーのトラック: `bg-gray-200` → `bg-border`
- [x] 入金済セグメント: `bg-green-500` → `bg-success`（2 箇所: バーと凡例ドット）
- [x] 請求済セグメント: `bg-blue-500` → `bg-primary`（2 箇所: バーと凡例ドット）
- [x] 凡例の残り部分: `bg-gray-200 border border-gray-300` → `bg-border border border-border`

**Acceptance Criteria**:
- `InvoiceSection.tsx` に `bg-green-500` / `bg-blue-500` / `bg-gray-200` / `border-gray-300` が存在しない
- `bg-success` / `bg-primary` / `bg-border` / `border-border` が各対応箇所にある

---

## T-05: DealPhaseStepper 終端ボタンのトークン化

`src/app/(dashboard)/deals/[id]/DealPhaseStepper.tsx` を編集する。

- [x] 「受注にする」ボタンの className: `border-green-600 text-green-700 hover:bg-green-50` → `border-status-green-text text-status-green-text hover:bg-status-green-bg`（その他のクラスは維持）
- [x] 「失注にする」ボタンの className の `hover:bg-red-50` → `hover:bg-status-red-bg`（`border-danger text-danger` は既にトークン参照のため変更不要）
- [x] 「見送りにする」ボタンの className: `border-gray-500 text-gray-600 hover:bg-gray-50` → `border-status-gray-text text-status-gray-text hover:bg-status-gray-bg`

**Acceptance Criteria**:
- `DealPhaseStepper.tsx` に `border-green-600` / `text-green-700` / `hover:bg-green-50` / `hover:bg-red-50` / `border-gray-500` / `text-gray-600` / `hover:bg-gray-50` が存在しない
- 3 つの終端ボタンがそれぞれ `status-green-*` / `danger` / `status-gray-*` トークンを参照している

---

## T-06: ActionButtons 却下ボタンのトークン化

`src/app/(dashboard)/requests/[id]/ActionButtons.tsx` を編集する。

- [x] 却下ボタンの className の `bg-white` → `bg-bg-surface`
- [x] 却下ボタンの className の `hover:bg-red-50` → `hover:bg-status-red-bg`

変更箇所（123 行あたり）:
```tsx
// Before
className="text-xs border border-danger text-danger bg-white rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 transition-colors"
// After
className="text-xs border border-danger text-danger bg-bg-surface rounded px-3 py-1.5 hover:bg-status-red-bg disabled:opacity-50 transition-colors"
```

**Acceptance Criteria**:
- `ActionButtons.tsx` に `bg-white` と `hover:bg-red-50` が存在しない
- 却下ボタンが `bg-bg-surface` と `hover:bg-status-red-bg` を持つ

---

## T-07: セクション内保存ボタン（`bg-green-600`）の `bg-primary` 化

以下の各ファイルで `bg-green-600` を `bg-primary` に、関連する `text-green-700` / `text-green-white` → `text-white` に置換する（`text-white` は既に正しい場合は変更不要）。

対象ファイルと変更内容:

- [x] `src/app/(dashboard)/clients/[id]/ClientInfoSection.tsx`
  - `"bg-green-600 text-white cursor-pointer"` → `"bg-primary text-white cursor-pointer hover:opacity-90"`
- [x] `src/app/(dashboard)/inquiries/[id]/InquiryCustomerSection.tsx`
  - `bg-green-600 text-white cursor-pointer disabled:opacity-50 mt-1` → `bg-primary text-white cursor-pointer disabled:opacity-50 hover:opacity-90 mt-1`
- [x] `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx`
  - line 54: `className="bg-green-600 text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"` → `className="bg-primary text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50 hover:opacity-90"`
- [x] `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx`
  - `"bg-green-600 text-white cursor-pointer"` → `"bg-primary text-white cursor-pointer hover:opacity-90"`
- [x] `src/app/(dashboard)/contracts/[id]/ContractInfoSection.tsx`
  - `"bg-green-600 text-white cursor-pointer"` → `"bg-primary text-white cursor-pointer hover:opacity-90"`
- [x] `src/app/(dashboard)/contracts/[id]/ContractStatusActions.tsx`
  - `variantStyles` の `success: "bg-green-600 text-white"` → `success: "bg-primary text-white"`
- [x] `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/InvoiceActions.tsx`
  - `className="text-xs px-3 py-1.5 bg-green-600 text-white cursor-pointer disabled:opacity-50"` → `className="text-xs px-3 py-1.5 bg-primary text-white cursor-pointer disabled:opacity-50 hover:opacity-90"`
- [x] `src/app/(dashboard)/deals/[id]/DealNotesSection.tsx`
  - `"bg-green-600 text-white cursor-pointer"` → `"bg-primary text-white cursor-pointer hover:opacity-90"`
- [x] `src/app/(dashboard)/deals/[id]/DealInfoSection.tsx`
  - `"bg-green-600 text-white cursor-pointer"` → `"bg-primary text-white cursor-pointer hover:opacity-90"`
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingActionItemsSection.tsx`
  - 両方の `bg-green-600 text-white` → `bg-primary text-white hover:opacity-90`
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingSummarySection.tsx`
  - `"bg-green-600 text-white cursor-pointer"` → `"bg-primary text-white cursor-pointer hover:opacity-90"`
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingHearingSection.tsx`
  - `"bg-green-600 text-white cursor-pointer"` → `"bg-primary text-white cursor-pointer hover:opacity-90"`
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingInfoSection.tsx`
  - `className="text-xs font-bold px-3 py-1 bg-green-600 text-white cursor-pointer disabled:opacity-50"` → `className="text-xs font-bold px-3 py-1 bg-primary text-white cursor-pointer disabled:opacity-50 hover:opacity-90"`
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingAttendeesSection.tsx`
  - `"bg-green-600 text-white cursor-pointer"` → `"bg-primary text-white cursor-pointer hover:opacity-90"`

**Acceptance Criteria**:
- 上記全ファイルに `bg-green-600` が存在しない
- 各保存ボタンが `bg-primary text-white` を持つ

---

## T-08: フォームフィードバックアラートと required asterisk のトークン化

### 8-1: フォームフィードバックアラート

以下のファイルで success / error アラートを置換する:

- [x] `src/app/(dashboard)/settings/organization/OrganizationForm.tsx`
  - success: `bg-green-50 border border-green-200` + `text-green-800` → `bg-bg-success-light border border-border-success-light` + `text-success`
  - error: `bg-red-50 border border-red-200` + 内部テキストクラスを削除（`text-danger` を使用）
- [x] `src/app/(dashboard)/settings/users/CreateUserForm.tsx`
  - success: 同上
  - error: 同上
- [x] `src/app/(dashboard)/settings/templates/TemplateForm.tsx`
  - error: `bg-red-50 border border-red-200` → `bg-status-red-bg border border-status-red-text/30`（テキストは `text-status-red-text` に）
- [x] `src/app/(dashboard)/settings/webhooks/WebhookCreateForm.tsx`
  - success: `bg-green-50 border border-green-200` → `bg-bg-success-light border border-border-success-light`
  - 内部テキスト: `text-green-800` → `text-success`、`text-green-700` → `text-success`、`bg-green-100` → `bg-bg-success-light`
  - error: `bg-red-50 border border-red-200` → `bg-status-red-bg border border-status-red-text/30`
- [x] `src/app/(dashboard)/settings/policies/PolicyForm.tsx`
  - error: 同上
- [x] `src/app/(dashboard)/requests/new/page.tsx`
  - error: `bg-red-50 border border-red-200 text-danger` → `bg-status-red-bg border border-status-red-text/30 text-status-red-text`
- [x] `src/app/(dashboard)/account/ProfileForm.tsx`
  - success/error: 同パターン
- [x] `src/app/(dashboard)/account/PasswordForm.tsx`
  - success/error: 同パターン
- [x] `src/app/(dashboard)/account/ApiTokenSection.tsx`
  - error: 同パターン

### 8-2: required asterisk のトークン化

以下のファイルの `text-red-500` を `text-danger` に置換する:

- [x] `src/app/(dashboard)/settings/organization/OrganizationForm.tsx`
- [x] `src/app/(dashboard)/settings/policies/PolicyForm.tsx`
- [x] `src/app/(dashboard)/settings/templates/TemplateForm.tsx`
- [x] `src/app/(dashboard)/settings/webhooks/WebhookCreateForm.tsx`
- [x] `src/app/(dashboard)/settings/users/CreateUserForm.tsx`

**Acceptance Criteria**:
- 上記全ファイルに `bg-green-50` / `bg-red-50` / `border-green-200` / `border-red-200` / `text-green-800` / `text-green-700` / `bg-green-100` / `text-red-500` が存在しない
- アラートが `bg-bg-success-light` / `bg-status-red-bg` 等のトークンを参照している

---

## T-09: 情報バナー・バッジ・その他の生パレット全廃

### 9-1: SystemOriginBanner（青い情報バナー）

`src/app/(dashboard)/requests/[id]/SystemOriginBanner.tsx` を編集する。

- [x] `bg-blue-50` → `bg-bg-info`
- [x] `border-blue-200` → `border-status-blue-text/30`
- [x] `text-blue-500`（アイコン）→ `text-status-blue-text`
- [x] `text-blue-800`（テキスト）→ `text-status-blue-text`

### 9-2: contracts/[id]/page.tsx（amber 警告バナー）

`src/app/(dashboard)/contracts/[id]/page.tsx` を編集する。

- [x] `bg-amber-50` → `bg-bg-row-pending`
- [x] `border-amber-300` → `border-border-row-pending`
- [x] `text-amber-800` → `text-warning`

### 9-3: contracts/page.tsx（rowClass の amber）

`src/app/(dashboard)/contracts/page.tsx` を編集する。

- [x] `isExpiringWithin30Days(row) ? "bg-amber-50" : undefined` → `isExpiringWithin30Days(row) ? "bg-bg-row-pending" : undefined`

### 9-4: NotificationPanel バッジ

`src/app/(dashboard)/NotificationPanel.tsx` を編集する。

- [x] `bg-red-500 text-white` → `bg-danger text-white`

### 9-5: revenue/forecast/page.tsx プログレスバー

`src/app/(dashboard)/revenue/forecast/page.tsx` を編集する。

- [x] `bg-gray-200` → `bg-border`

### 9-6: revenue/page.tsx ミニバー

`src/app/(dashboard)/revenue/page.tsx` を編集する。

- [x] `bg-gray-100` → `bg-bg-surface-alt`

### 9-7: account/OAuthConnectionSection.tsx テキスト

`src/app/(dashboard)/account/OAuthConnectionSection.tsx` を編集する。

- [x] `text-gray-600` → `text-text-secondary`

**Acceptance Criteria**:
- 上記全ファイルに `bg-amber-*` / `bg-blue-*` / `border-amber-*` / `border-blue-*` / `text-amber-*` / `text-blue-*` / `bg-red-500` / `bg-gray-200` / `bg-gray-100` / `text-gray-600` が存在しない

---

## T-10: フォームレベルの submit/cancel ボタン統一

### 10-1: 新規作成フォームの submit ボタンを SubmitButton に統一

以下の各ファイルで inline submit ボタンを `SubmitButton` コンポーネントに置き換える:

- [x] `src/app/(dashboard)/contracts/new/NewContractForm.tsx`
  - `<button type="submit" ... className="bg-primary text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50">` → `<SubmitButton pending={isSubmitting}>契約を作成</SubmitButton>`
  - `SubmitButton` を `@/app/components` から import する（既存 import に追加）
  - キャンセルボタン: `className="border border-border text-text text-xs px-3 py-1.5 cursor-pointer"` → `BTN_SECONDARY` を styles.ts から import して `className={BTN_SECONDARY}`
- [x] `src/app/(dashboard)/contracts/[id]/invoices/new/NewInvoiceForm.tsx`
  - 同様に inline submit → `SubmitButton` に置換
  - キャンセルボタン → `BTN_SECONDARY`
- [x] `src/app/(dashboard)/deals/new/NewDealForm.tsx`
  - 同様

### 10-2: TaskList モーダル内ボタン

`src/app/(dashboard)/tasks/TaskList.tsx` を編集する。

- [x] モーダル「作成」ボタン（`bg-primary text-white text-xs px-3 py-1.5 cursor-pointer disabled:opacity-50`）→ `BTN_PRIMARY` を import して `className={BTN_PRIMARY}`
- [x] モーダル「キャンセル」ボタン（`border border-border text-text text-xs px-3 py-1.5 cursor-pointer disabled:opacity-50`）→ `BTN_SECONDARY` を import して `className={BTN_SECONDARY}`
- [x] 「新規作成」トップバーボタン（`text-xs font-medium px-3 py-1.5 bg-primary text-white rounded cursor-pointer`）→ `BTN_PRIMARY` を import して `className={BTN_PRIMARY}`
- [x] select 要素の className `w-full text-xs border border-border rounded px-2 py-1.5 bg-bg-surface text-text` → `SELECT_BASE` を import して `className={SELECT_BASE}`

### 10-3: その他のインラインボタンのトークン化

- [x] `src/app/(dashboard)/settings/audit-logs/AuditLogFilter.tsx`
  - `className="bg-primary text-white text-xs px-3 py-1.5 rounded font-medium"` → `BTN_PRIMARY` を import して `className={BTN_PRIMARY}`
- [x] `src/app/(dashboard)/contracts/[id]/ContractInteractionSection.tsx`
  - `className="text-xs px-3 py-1 bg-primary text-white disabled:opacity-50"` → `className={BTN_PRIMARY}` に変更（`BTN_PRIMARY` に disabled 処理が含まれる）
- [x] `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/InvoiceInteractionSection.tsx`
  - 同様
- [x] `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/InvoiceActions.tsx`
  - `className="text-xs px-3 py-1.5 bg-primary text-white cursor-pointer disabled:opacity-50"` → `BTN_PRIMARY`
- [x] `src/app/(dashboard)/contracts/[id]/InvoiceSection.tsx`
  - `className="text-xs px-3 py-1 bg-primary text-white"` → `BTN_PRIMARY`
- [x] `src/app/(dashboard)/clients/[id]/ClientContactsSection.tsx`
  - 2 箇所の `bg-primary text-white` ボタン → `BTN_PRIMARY`
  - キャンセルボタン → `BTN_SECONDARY`
- [x] `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx`
  - `className="bg-primary text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"` → `BTN_PRIMARY`
- [x] `src/app/(dashboard)/deals/[id]/DealContactsSection.tsx`
  - `className="text-xs bg-primary text-white px-3 py-1 rounded"` → `BTN_PRIMARY`
- [x] `src/app/(dashboard)/deals/[id]/DealActionItemsSection.tsx`
  - `className="text-xs font-medium px-3 py-1.5 bg-primary text-white rounded cursor-pointer"` → `BTN_PRIMARY`
- [x] `src/app/(dashboard)/components/ActionItemModal.tsx`
  - confirm ボタン `bg-primary text-white text-xs px-3 py-1.5` → `BTN_PRIMARY`
  - 対応する import を `src/app/(dashboard)/styles` から追加

対象ファイルの `BTN_PRIMARY` / `BTN_SECONDARY` import: `import { BTN_PRIMARY, BTN_SECONDARY } from "@/app/(dashboard)/styles"` の形で追加する。

**注意**: `src/app/(dashboard)/dashboard/SalesDashboard.tsx` line 114 のボタンは `text-sm` を使用しており、フォント変更はスコープ外のため対象外とする。

**Acceptance Criteria**:
- 各ファイルに `import { BTN_PRIMARY` または `import { BTN_SECONDARY` があり、該当ボタンの className で参照している
- `NewContractForm.tsx` / `NewInvoiceForm.tsx` / `NewDealForm.tsx` に `type="submit"` の inline `bg-primary text-white` button が存在せず、`SubmitButton` が使われている
- `TaskList.tsx` の select が `SELECT_BASE` を参照している
- `bun run typecheck` が通る

---

## T-11: `dueDateClass` ヘルパーの実装とユニットテスト

### 11-1: ヘルパー実装

- [x] `src/app/(dashboard)/lib/` ディレクトリを作成する
- [x] `src/app/(dashboard)/lib/dueDateClass.ts` を作成する:

```typescript
export function dueDateClass(date: Date | string | null, now?: Date): string {
  if (!date) return "";
  const target = typeof date === "string" ? new Date(date) : date;
  const base = now ?? new Date();
  const targetStr = target.toDateString();
  const baseStr = base.toDateString();
  if (targetStr === baseStr) return "text-warning font-semibold";
  if (target < base && targetStr !== baseStr) return "text-danger font-semibold";
  return "";
}
```

（注: 実装は上記ロジックに準ずるが、暦日比較が正しく機能することを確認すること）

### 11-2: ユニットテスト

- [x] `src/__tests__/dashboard/dueDateClass.test.ts` を作成する
- [x] 以下のテストケースを含める:
  - 過去日（昨日）→ `"text-danger font-semibold"` を返す
  - 当日（今日）→ `"text-warning font-semibold"` を返す
  - 未来日（明日）→ `""` を返す
  - `null` → `""` を返す
  - 文字列型の日付（`"2024-06-14"`）→ 正しく判定する
  - 日付境界: `now` が `2024-06-15T00:00:00` で `date` が `2024-06-15T00:00:00` → `"text-warning font-semibold"`
  - 日付境界: `now` が `2024-06-15T23:59:59` で `date` が `2024-06-15T00:00:00` → `"text-warning font-semibold"`（同一暦日）
  - `now` を渡さない場合は `new Date()` が使われる（実行時点で未来の日付を渡すとテスト）

**Acceptance Criteria**:
- `src/app/(dashboard)/lib/dueDateClass.ts` が存在し、`dueDateClass` を named export している
- `src/__tests__/dashboard/dueDateClass.test.ts` が存在する
- `bun test src/__tests__/dashboard/dueDateClass.test.ts` が green

---

## T-12: ActionItemRow への `dueDateClass` 適用とコンポーネントテスト

### 12-1: ActionItemRow の期日表示に dueDateClass を適用

`src/app/(dashboard)/components/ActionItemRow.tsx` を編集する。

- [x] `dueDateClass` を import する: `import { dueDateClass } from "@/app/(dashboard)/lib/dueDateClass";`
- [x] `showSource=true`（グリッド行）モードの期日セル（現在 `<span className="text-text-muted font-mono">`）を以下に変更する:
  ```tsx
  <span className={`font-mono whitespace-nowrap ${item.dueDate ? dueDateClass(item.dueDate) : "text-text-muted"}`}>
    {item.dueDate ? formatDueDate(item.dueDate) : "—"}
  </span>
  ```
  - 期日がある場合: `dueDateClass` が `""` を返す時は `text-text-muted` をフォールバックとして使用する（クラスの連結を検討）。あるいは `text-text-muted` を base として `dueDateClass` の結果を追記する形でもよい（実装者判断）。
  - `—` 表示の時は `text-text-muted` を維持する。
- [x] `showSource=false`（カード行）モードの期日表示（現在 `<span className="font-mono whitespace-nowrap">`）も同様に dueDateClass を適用する
- [x] 既存の `formatDueDate` 関数はそのまま維持する

### 12-2: 表示テスト

- [x] `src/__tests__/dashboard/ActionItemRow.test.ts` を作成する（または既存ファイルに追記する）
- [x] 以下のテストケースを含める（静的解析ベース、@testing-library/react 非搭載環境のため）:
  - `dueDateClass` が import されていることを確認
  - `_testNow` prop が定義されていることを確認
  - 期日 span に `dueDateClass` が適用されていることを確認
  - `text-text-muted` がフォールバッククラスとして使用されていることを確認
- [x] mock.module 汚染を防ぐため、`afterAll` で restore する

**Acceptance Criteria**:
- `ActionItemRow.tsx` が `dueDateClass` を import し、両モードの期日 span に適用している
- `bun test` でコンポーネントテストが green

---

## T-13: 最終 grep 検証・lint・typecheck・build

- [x] 以下のコマンドを実行し、全件ゼロであることを確認する:
  ```bash
  grep -rE '(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|emerald)-[0-9]+' src/app/\(dashboard\)
  ```
  - 残件がある場合は対応するタスクに戻って修正する
- [x] `bun run lint` が green であることを確認する
- [x] `bun run typecheck` が green であることを確認する
- [x] `bun run build` が green であることを確認する
- [x] `bun test` が全件 green であることを確認する
- [x] `aozu check` が exit 0 であることを確認する（architecture test green）

**Acceptance Criteria**:
- grep がゼロ件
- lint / typecheck / build / test が全て green
- `aozu check` exit 0
