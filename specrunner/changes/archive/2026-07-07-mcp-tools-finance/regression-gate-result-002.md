# Regression Gate Result — Iteration 002

- **change**: mcp-tools-finance
- **iteration**: 2
- **date**: 2026-07-07
- **verdict**: approved

## Summary

Ledger の 5 件（HIGH × 3、LOW × 2）をすべて確認。退行なし。矛盾なし。

---

## Finding Verification

### [HIGH] TC-016: 将来日付 paidAt 拒否の実行検証テスト

- **file**: `src/__tests__/mcp/mcpInvoices.dynamic.test.ts`
- **status**: fixed — 退行なし

`mcpInvoices.dynamic.test.ts` の `describe("TC-016: 将来日付 paidAt の拒否")` ブロックにて、`paidAt: '2099-12-31'` で `update_status` を呼んだとき `isError: true` かつ `updateInvoiceStatusCalls.length === 0` を assert するテストが存在する。実装側（`invoices.ts` 205–213 行）の JST バリデーション（`args.paidAt > todayJST → toToolError`）も変更なし。

---

### [HIGH] TC-038: contracts update の null vs undefined 区別

- **file**: `src/__tests__/mcp/mcpContracts.dynamic.test.ts`
- **status**: fixed — 退行なし

`mcpContracts.dynamic.test.ts` の `describe("TC-038: contracts update の null vs undefined 区別")` ブロックにて、`endDate: null` と `contractType` 省略で `update` を呼んだとき、`callArgs.endDate === null` かつ `callArgs.contractType === undefined` を assert するテストが存在する。実装側（`contracts.ts` 164–174 行）の三分岐（`undefined | null | 文字列`）も変更なし。

---

### [HIGH] TC-039: invoices update の null vs undefined 区別

- **file**: `src/__tests__/mcp/mcpInvoices.dynamic.test.ts`
- **status**: fixed — 退行なし

`mcpInvoices.dynamic.test.ts` の `describe("TC-039: invoices update の null vs undefined 区別")` ブロックにて、`notes: null` と `issueDate` 省略で `update` を呼んだとき、`callArgs.notes === null` かつ `callArgs.issueDate === undefined` を assert するテストが存在する。実装側（`invoices.ts` 163–183 行）も変更なし。

---

### [LOW] 基本操作 happy-path シナリオ 16 件

- **files**: `src/__tests__/mcp/mcpContractsCrud.dynamic.test.ts`, `mcpInvoicesList.dynamic.test.ts`, `mcpRevenueTargets.dynamic.test.ts`
- **status**: fixed — 退行なし

新規テストファイル 3 件で以下のシナリオを実行検証で固定済み:

| ファイル | カバーする TC |
|---|---|
| `mcpContractsCrud.dynamic.test.ts` | TC-001 (list), TC-002 (get), TC-005 (update_status), TC-006 (delete), TC-007 (partial-update), TC-027 (organizationId not in schema) |
| `mcpInvoicesList.dynamic.test.ts` | TC-009 (list by contract), TC-010 (list by org), TC-017 (partial-update) |
| `mcpRevenueTargets.dynamic.test.ts` | TC-023 (update) |

TC-003（contracts create）は `mcpFinanceAuditTenant` で、TC-013（invoiced→paid）は `mcpFinanceAuthz` で、TC-011（invoices create）・TC-022（revenue_targets set）は `mcpFinanceAuditTenant` でそれぞれ実行検証済み（finding rationale に記載の通り、暗黙カバーに退行なし）。

---

### [LOW] 基本 CRUD 成功シナリオ 7 件（iter-001 F-04 継続）

- **files**: `src/__tests__/mcp/mcpContractsCrud.dynamic.test.ts`, `mcpInvoicesList.dynamic.test.ts`
- **status**: fixed — 退行なし

TC-001, TC-002, TC-005, TC-006, TC-009, TC-010, TC-027 はすべて `mcpContractsCrud.dynamic.test.ts` および `mcpInvoicesList.dynamic.test.ts` に専用ハッピーパステストが追加されている。TC-003（mcpFinanceAuditTenant で暗黙カバー）・TC-013（mcpFinanceAuthz で暗黙カバー）の扱いも変化なし。

---

## Regressions

なし。

## Contradictions

なし。
