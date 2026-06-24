# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✓ | All checkboxes [x]; T-01 through T-10 fully complete |
| design.md | ✓ | All 6 design decisions (D1–D6) implemented correctly |
| spec.md | ✓ | All 9 SHALL/MUST requirements and all scenarios satisfied |
| request.md | ✓ | All 12 acceptance criteria met; build/typecheck/test/lint green |

---

## 1. tasks.md — Checkbox Completion

All tasks T-01 through T-10 have every checkbox marked `[x]`. No incomplete items.

---

## 2. Design Decision Traceability

| Decision | Verdict | Evidence |
|----------|---------|----------|
| D1: URL structure `/contracts/[id]/invoices/[invoiceId]` and `.../new` | ✓ | Pages exist at exact paths; confirmed in build route output |
| D2: `getInvoice` returns `{ invoice: Invoice; contract: Contract } \| null` | ✓ | `getInvoice.ts` returns `{ invoice, contract }` or `null` |
| D3: `paidAt?: Date` with `new Date()` fallback | ✓ | `updateInvoiceStatus.ts` uses `data.paidAt ?? new Date()` |
| D4: Dialog UI for payment date, default = today | ✓ | `InvoiceActions.tsx` shows dialog; `todayString()` (JST-aware) as default |
| D5: `InvoiceSection` simplified; `CreateInvoiceModal` / `InvoiceStatusButtons` deleted | ✓ | Both files deleted in diff; rows link to detail; summary preserved |
| D6: `overdue → paid` emits `invoice.paid` event | ✓ | `updateInvoiceStatus.ts` dispatches `invoice.paid` for all `paid` transitions |

---

## 3. Spec Requirements and Scenario Coverage

### Requirement: overdue → paid 遷移の許可 (SHALL)

- `VALID_INVOICE_TRANSITIONS.overdue = ["paid"]` added ✓
- Comment updated from "paid と overdue は終端状態" → "paid は終端状態" ✓
- TC-007 (`overdue → paid` → `{ ok: true }`) and TC-008 (`overdue → invoiced` → `{ ok: false }`) pass ✓

### Requirement: updateInvoiceStatus の paidAt パラメータ (MUST)

- `paidAt?: Date` added to usecase input type ✓
- `data.paidAt ?? new Date()` used for paid transition ✓
- `updateInvoiceStatusSchema` validates `paidAt` as `YYYY-MM-DD`; JST-based future-date rejection with message "入金日は本日以前の日付を指定してください" ✓
- Rate limit added to `updateInvoiceStatusAction` ✓
- Tests TC-004, TC-005, TC-006 pass ✓

### Requirement: getInvoice ユースケース (MUST)

- `getInvoice.ts` created; input `{ invoiceId, organizationId }`; return type `{ invoice, contract } | null` ✓
- Exported from `usecases/index.ts` ✓
- `organizationId` passed to `invoiceRepository.findById` for multi-tenant isolation ✓
- Tests TC-007, TC-008, TC-009 pass ✓

### Requirement: 請求詳細ページの表示 (SHALL)

- Page at `/contracts/[id]/invoices/[invoiceId]/page.tsx` ✓
- Displays amount, issueDate, dueDate, paidAt, status, notes, contract link ✓
- `notFound()` when result is null or `invoice.contractId !== contractId` ✓
- Breadcrumb "契約一覧 > 契約詳細 > 請求詳細" with links ✓
- Test TC-011 passes ✓

### Requirement: ステータスに応じた操作ボタン (SHALL)

- `InvoiceActions.tsx` handles all four states:
  - `scheduled` → 「発行する」のみ ✓
  - `invoiced` → 「入金確認」「期日超過にする」の2ボタン ✓
  - `overdue` → 「入金確認」のみ ✓
  - `paid` → `return null`（操作なし）✓
- `canPerform(role, "invoice", "changeStatus")` gates the entire actions component ✓

### Requirement: 入金確認時の入金日入力ダイアログ (MUST)

- Dialog shown on 「入金確認」press; default `paidAt` = `todayString()` (JST-aware) ✓
- `max={todayString()}` on `<input type="date">` for browser-level prevention ✓
- Server-side rejection of future dates via `refine` in `updateInvoiceStatusSchema` ✓
- Error surfaced to UI via `setError(result.message)` ✓
- Test TC-022 passes ✓

### Requirement: 請求登録ページ (SHALL)

- Page at `/contracts/[id]/invoices/new/page.tsx` ✓
- `notFound()` if contract missing; message shown if contract not active ✓
- Form fields: title (required), amount (required), issueDate (optional), dueDate (required), notes (optional) ✓
- `contractId` set via hidden input ✓
- Success → `router.push(`/contracts/${contractId}`)` ✓
- Breadcrumb "契約一覧 > 契約詳細 > 請求登録" ✓

### Requirement: 単発契約の残り請求可能金額表示 (MUST)

- Server Component calculates `contract.amount - existingTotal` for `one_time` contracts ✓
- Passed as `remainingAmount` prop to `NewInvoiceForm` ✓
- Displayed only when `remainingAmount !== null && remainingAmount !== undefined` (one_time only) ✓
- Over-limit error handled server-side by existing `createInvoice` usecase ✓

### Requirement: バリデーション表示 (SHALL)

- Client-side: `issueDate > dueDate` → "請求予定日は支払期限以前の日付を入力してください" ✓
- Server-side: amount exceeds one_time contract limit → error from `createInvoice` ✓

### Requirement: 契約詳細の請求セクション簡素化 (SHALL)

- `CreateInvoiceModal.tsx` deleted ✓
- `InvoiceStatusButtons.tsx` deleted ✓
- Each row: `<Link href={/contracts/${contractId}/invoices/${row.id}}>` ✓
- 「請求を追加」 → `<Link href={/contracts/${contractId}/invoices/new}>` ✓
- Summary (請求済合計, 入金済合計, 未請求合計) preserved ✓

### Requirement: パンくずリスト (SHALL)

- Detail page: "契約一覧 > 契約詳細 > 請求詳細" with `/contracts` and `/contracts/${contractId}` links ✓
- New invoice page: "契約一覧 > 契約詳細 > 請求登録" ✓

---

## 4. Acceptance Criteria (request.md)

| Criterion | Status |
|-----------|--------|
| `getInvoice` ユースケースが存在し、請求と契約情報を返す | ✓ |
| `invoiceTransition` で overdue → paid 遷移が許可される | ✓ |
| `updateInvoiceStatus` が paidAt パラメータを受け取る | ✓ |
| `/contracts/[id]/invoices/[invoiceId]` で請求詳細が表示される | ✓ |
| 各ステータスに応じた操作ボタンが表示される | ✓ |
| 入金確認操作で入金日入力ダイアログが表示される | ✓ |
| `/contracts/[id]/invoices/new` で請求が作成できる | ✓ |
| 単発契約の場合に残り請求可能金額が表示される | ✓ |
| バリデーションエラーが正しく表示される | ✓ |
| 契約詳細の請求セクションから請求詳細にリンクで遷移できる | ✓ |
| パンくずリストが正しく表示される | ✓ |
| `typecheck && test` が green | ✓ |

---

## 5. Verification Summary

| Phase | Status | Detail |
|-------|--------|--------|
| build | passed | 11.4s; all 32 routes generated including 2 new invoice routes |
| typecheck | passed | 4.5s; 0 errors |
| test | passed | 673 pass, 0 fail (0.4s) |
| lint | passed | 5.7s; 10 warnings (pre-existing), 0 errors |

---

## 6. Observations

- **D6 conformance**: `invoice.paid` event is dispatched for any `paid` transition (`invoiced → paid` and `overdue → paid`), satisfying D6 without special-casing.
- **Multi-tenant isolation**: `getInvoice` enforces `organizationId` at the repository level; test TC-009 statically verifies this.
- **Scope**: No out-of-scope items implemented; `/invoices` top-level page not created per Non-Goals.
- **revalidatePath coverage**: Both `/contracts/${contractId}` and `/contracts/${contractId}/invoices/${invoiceId}` are revalidated on status update (T-09 satisfied).
