# Regression Gate Result — Iteration 2

- **change**: mcp-tools-approval
- **iteration**: 2
- **date**: 2026-07-07
- **verdict**: approved

## Summary

Ledger に記録された 4 件の findings（TC-017, TC-032, TC-033, TC-005/TC-006）を全件検証した。いずれも修正済みであり、リグレッションなし。

## Verification Results

### TC-017: approve — 未知エラーの固定文言サニタイズ
- **Status**: FIXED
- **File**: `src/__tests__/mcp/mcpApprovalRequestsApprove.dynamic.test.ts`
- **Evidence**:
  - `describe("TC-017: approve — 未知エラーが固定文言にサニタイズされる")` ブロックが lines 342–375 に存在する
  - `approveMode = "unknown_error"` でモックが DB エラー文字列を返し、テストは `isError=true`・`"connection"` 未含有・`"mysql"` 未含有・`"操作を完了できませんでした"` 含有を assert する
  - 実装 `approvalRequests.ts` の `sanitizeApprovalReason` 関数（lines 38–43）が `KNOWN_APPROVAL_REASONS` 外の reason を固定文言に変換し、`approve` 操作（line 293）でこれを呼び出している

### TC-032: delegations.list — admin/非admin フィルタリング
- **Status**: FIXED
- **File**: `src/__tests__/mcp/mcpApprovalAuthz.dynamic.test.ts`
- **Evidence**:
  - `describe("TC-032: delegations.list — admin 以外は自身の委任のみ返される")` ブロックが lines 414–437 に存在する
  - manager ロールで list → `delegationOwnedByMgr`（1件）のみ返却・`delegationOwnedByOther` を含まない、admin ロールで list → 全2件返却をそれぞれ assert する
  - 実装 `delegations.ts` lines 67–73 の `role === 'admin' ? delegations : delegations.filter(d => d.fromUserId === userId)` がこの挙動を担保している

### TC-033: delegations.deactivate — ownership check
- **Status**: FIXED
- **File**: `src/__tests__/mcp/mcpApprovalAuthz.dynamic.test.ts`
- **Evidence**:
  - `describe("TC-033: delegations.deactivate — admin 以外の他人委任無効化が拒否される")` ブロックが lines 442–470 に存在する
  - manager が他ユーザーの委任を deactivate → `isError=true`・`"権限"` 含有を assert する
  - 存在しない委任 ID を deactivate → `isError=true`・`"委任が見つかりません"` 含有を assert する
  - 実装 `delegations.ts` lines 116–127 の ownership check（`findByOrganization` 後に `fromUserId !== userId` を確認）がこの挙動を担保している

### TC-005・TC-006: filter=all の非admin/manager 空配列返却と statusFilter の絞り込み
- **Status**: FIXED
- **File**: `src/__tests__/mcp/mcpApprovalRequestsList.dynamic.test.ts`
- **Evidence**:
  - `describe("TC-005: approval_requests.list — filter=all の非対称挙動")` ブロックが lines 403–441 に存在する（member→空配列、admin→全件、manager→全件 の 3 ケース）
  - `describe("TC-006: approval_requests.list — statusFilter による絞り込み")` ブロックが lines 445–510 に存在する（statusFilter=approved, pending, 組み合わせの 4 ケース）
  - 実装 `approvalRequests.ts` lines 141–146 の `filter === 'all'` 非admin/non-manager→空配列ロジック、lines 149–152 の statusFilter 絞り込みがこれを担保している

## Findings

なし（リグレッションなし）
