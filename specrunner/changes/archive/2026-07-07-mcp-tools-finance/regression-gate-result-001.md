# Regression Gate Result — Iteration 1

- **change**: mcp-tools-finance
- **iteration**: 1
- **verdict**: needs-fix

---

## Verification Summary

`git diff main...HEAD` で追加されたテストファイルを精査し、Findings Ledger の各項目が現在のコードに残存しているかを確認した。

---

## Finding 1 — [HIGH] TC-016: 将来日付 paidAt 拒否テスト

- **status**: fixed ✅
- **file**: `src/__tests__/mcp/mcpInvoices.dynamic.test.ts`
- **evidence**:
  - Lines 216–228 に `describe("TC-016: 将来日付 paidAt の拒否")` ブロックが存在する。
  - `paidAt: "2099-12-31"` で `update_status` を呼んだとき `result.isError` が `true` になること、かつ `state.updateInvoiceStatusCalls` が `toHaveLength(0)` であることを assert している。
  - MCP レイヤーでの JST バリデーション（paidAt > todayJST → toToolError）が実行検証で固定されている。

---

## Finding 2 — [HIGH] TC-038: contracts update の null vs undefined 区別テスト

- **status**: fixed ✅
- **file**: `src/__tests__/mcp/mcpContracts.dynamic.test.ts`
- **evidence**:
  - Lines 201–218 に `describe("TC-038: contracts update の null vs undefined 区別")` ブロックが存在する。
  - `endDate: null`・`contractType` 省略で `update` を呼んだとき、`callArgs.endDate === null` かつ `callArgs.contractType === undefined` を assert している。
  - `contracts.ts` 168–174 行の実装（undefined→undefined, null→null, string→Date の三分岐）を実行検証で固定している。

---

## Finding 3 — [HIGH] TC-039: invoices update の null vs undefined 区別テスト

- **status**: fixed ✅
- **file**: `src/__tests__/mcp/mcpInvoices.dynamic.test.ts`
- **evidence**:
  - Lines 231–248 に `describe("TC-039: invoices update の null vs undefined 区別")` ブロックが存在する。
  - `notes: null`・`issueDate` 省略で `update` を呼んだとき、`callArgs.notes === null` かつ `callArgs.issueDate === undefined` を assert している。
  - `invoices.ts` 163–173 行の実装を実行検証で固定している。

---

## Finding 4 — [LOW] 基本操作 happy-path シナリオ 16 件（test-cases.md priority: must）

- **status**: partially fixed — 3 件が未実装のまま残存 ⚠️
- **severity**: low
- **resolution**: fixable

### 実装済み（13 件）

| TC | シナリオ | カバーファイル |
|----|---------|-------------|
| TC-001 | 契約一覧 | `mcpContractsCrud.dynamic.test.ts` |
| TC-002 | 契約詳細 | `mcpContractsCrud.dynamic.test.ts` |
| TC-003 | 契約作成正常系 | `mcpFinanceAuditTenant.dynamic.test.ts`（監査記録テスト + テナント分離テストで暗黙カバー） |
| TC-005 | 契約ステータス更新成功 | `mcpContractsCrud.dynamic.test.ts` |
| TC-006 | 契約削除成功 | `mcpContractsCrud.dynamic.test.ts` |
| TC-009 | 請求一覧・契約別 | `mcpInvoicesList.dynamic.test.ts` |
| TC-010 | 請求一覧・組織全体 | `mcpInvoicesList.dynamic.test.ts` |
| TC-011 | 請求作成正常系 | `mcpFinanceAuditTenant.dynamic.test.ts`（テナント分離テストで暗黙カバー） |
| TC-013 | invoiced→paid 成功 | `mcpFinanceAuthz.dynamic.test.ts`（finance ロール許可テストで暗黙カバー） |
| TC-022 | 売上目標設定 | `mcpFinanceAuditTenant.dynamic.test.ts`（テナント分離テストで暗黙カバー） |
| TC-027 | organizationId スキーマ非公開 | `mcpContractsCrud.dynamic.test.ts` |

### 未実装（3 件）

以下の 3 件は今 iteration で追加されず、依然として専用テストが存在しない。

| TC | シナリオ | 内容 |
|----|---------|------|
| TC-007 | contracts 部分更新成功 | `title` のみ指定して `update` を呼んだとき `ok:true` が返りデータが含まれることの happy-path 検証 |
| TC-017 | invoices 部分更新成功 | `amount` のみ指定して `update` を呼んだとき `ok:true` が返りデータが含まれることの happy-path 検証 |
| TC-023 | revenue_targets 更新成功（version チェック） | `updateRevenueTarget` が `ok:true` を返すとき、ツール結果が正常であることの happy-path 検証 |

**注記**: TC-007・TC-017 は TC-038/TC-039（null vs undefined）や T-10（version 不一致）テストで update 経路に到達しているが、`ok:true` の成功応答を返すシナリオのテストは存在しない。TC-023 は `updateRevenueTarget` の実行検証が皆無。いずれも test-cases.md で `priority: must` に分類されている。

---

## Finding 5 — [LOW] 基本 CRUD 成功シナリオ 7 件（iter-001 F-04 継続）

- **status**: fixed ✅
- **evidence**:
  - TC-001, TC-002, TC-005, TC-006, TC-027: `mcpContractsCrud.dynamic.test.ts` に専用テストあり
  - TC-009, TC-010: `mcpInvoicesList.dynamic.test.ts` に専用テストあり
  - TC-003（契約作成）は `mcpFinanceAuditTenant` で暗黙カバー、TC-013（invoiced→paid）は `mcpFinanceAuthz` で暗黙カバーとする元々の評価を維持

---

## 回帰・矛盾の検出

- 回帰なし（[HIGH] 3 件はいずれも現コードに修正が残存している）
- 矛盾なし（fixing A が B を再導入するケースは検出されなかった）

---

## 対処が必要な残存事項

| 優先度 | TC | 対応内容 |
|-------|-----|---------|
| LOW | TC-007 | `contracts update`（title のみ）成功シナリオテストを `mcpContractsCrud.dynamic.test.ts` に追加 |
| LOW | TC-017 | `invoices update`（amount のみ）成功シナリオテストを `mcpInvoicesList.dynamic.test.ts` または新ファイルに追加 |
| LOW | TC-023 | `revenue_targets update` 成功シナリオテスト（`updateRevenueTarget` 実行検証）を追加 |
