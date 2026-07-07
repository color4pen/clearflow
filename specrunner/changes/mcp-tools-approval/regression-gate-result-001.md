# Regression Gate Result — mcp-tools-approval / Iteration 1

- **verdict**: needs-fix
- **date**: 2026-07-07

## 検証サマリー

Findings Ledger 4 件を個別検証。3 件は修正が確認できた。1 件（TC-005/TC-006）はテストが存在せずリグレッションと判定。

---

## 検証結果

### ✅ TC-017 — 未知エラーの固定文言サニタイズ（修正確認）

- **File**: `src/__tests__/mcp/mcpApprovalRequestsApprove.dynamic.test.ts` (lines 341–375)
- **状態**: 修正済み・存在確認
- **内容**: `describe("TC-017: approve — 未知エラーが固定文言にサニタイズされる")` ブロックが実装されている。DB エラー文字列（"connection", "mysql"）がクライアントに漏れず、「操作を完了できませんでした」の固定文言が返されることを behavioral test で検証している。

---

### ✅ TC-032 — delegations.list の admin/非admin フィルタリング（修正確認）

- **File**: `src/__tests__/mcp/mcpApprovalAuthz.dynamic.test.ts` (lines 412–437)
- **状態**: 修正済み・存在確認
- **内容**: `describe("TC-032: delegations.list — admin 以外は自身の委任のみ返される")` ブロックが実装されている。manager ロールでは自身の委任のみ、admin ロールでは全委任が返されることを実行検証している。

---

### ✅ TC-033 — delegations.deactivate の ownership check（修正確認）

- **File**: `src/__tests__/mcp/mcpApprovalAuthz.dynamic.test.ts` (lines 440–470)
- **状態**: 修正済み・存在確認
- **内容**: `describe("TC-033: delegations.deactivate — admin 以外の他人委任無効化が拒否される")` ブロックが実装されている。manager ロールが他ユーザーの委任を deactivate しようとした場合に isError=true で拒否されることを確認している。

---

### ❌ TC-005/TC-006 — filter=all の非admin/manager 空配列返却・statusFilter の絞り込み（リグレッション）

- **File**: `src/__tests__/mcp/mcpApprovalRequestsList.dynamic.test.ts`
- **状態**: テストなし（リグレッション）
- **内容**: 
  - 実装側（`src/app/api/mcp/tools/approvalRequests.ts` lines 141–152）は filter=all と statusFilter の両方が正しく実装されている。
  - しかし `mcpApprovalRequestsList.dynamic.test.ts` には TC-005（filter=all で member ロールが空配列を受け取ること）および TC-006（statusFilter による絞り込み）に対応する behavioral test が存在しない。
  - `grep -rn "filter.*all\|statusFilter"` で全 MCP テストファイルを検索したが、承認リクエスト list に関するこれらのテストは一切発見されなかった。

---

## Findings

| # | Severity | File | Title | Resolution |
|---|----------|------|-------|------------|
| 1 | high | src/__tests__/mcp/mcpApprovalRequestsList.dynamic.test.ts | TC-005/TC-006: filter=all 非admin 空配列・statusFilter 絞り込みテスト欠落 | fixable |

## 修正方針

`mcpApprovalRequestsList.dynamic.test.ts` に以下を追加する:

- TC-005: `filter: "all"` を member ロールで呼び出した場合に空配列が返されることを検証するテスト
- TC-006: `statusFilter` で絞り込んだ場合に status が一致するリクエストのみ返されることを検証するテスト
