# Regression Gate Result — ui-business-style / Iteration 1

- **verdict**: approved
- **date**: 2026-06-18
- **branch**: change/ui-business-style-5c9d8cac
- **findings checked**: 6 (2 HIGH, 4 LOW)
- **regressions**: 0
- **contradictions**: 0

---

## Verification Details

### Finding 1 & 2 (HIGH): automated 7件のテスト未実装（TC-021/TC-022 must、TC-008/TC-011/TC-012/TC-032/TC-033）

**Status: FIXED ✓**

検証結果:
- `src/__tests__/domain/statusUtils.test.ts` に TC-008、TC-011、TC-012 が実装されている。
  - TC-008: `statusClass` 関数の各ステータス（draft/pending/approved/rejected/revision/expired）に対する戻り値を検証。
  - TC-011: `statusRowClass` 関数の各ステータスに対する戻り値を検証。
  - TC-012: `stepStatusLabel`/`stepStatusClass` のエクスポートと動作を検証。
- `src/__tests__/static/uiBusinessStyle.test.ts` に TC-021、TC-022、TC-032、TC-033 が実装されている。
  - TC-021: `domain/models/request.ts` の `RequestWithSteps` 型・`ApprovalStepSummary[]` の存在を静的検証（5テスト）。
  - TC-022: `findAllWithStepsByOrganization` の `leftJoin`、`new Map()`、`map.has/set`、`approvalSteps: []`、null ガード、`Array.from(map.values())`、`orderBy` の各要素をソースコードレベルで検証（6テスト）。
  - TC-032: `BTN_PRIMARY_DISABLED` に `disabled:opacity-50 disabled:cursor-not-allowed` が含まれることを検証。
  - TC-033: `SELECT_BASE` に `block w-full border border-gray-300 rounded-md` が含まれることを検証。

実装の実態確認:
- `requestRepository.ts` の `findAllWithStepsByOrganization` は `new Map<string, RequestWithSteps>()`、`map.has`/`map.set`/`map.get`、`approvalSteps: []` 初期化、`!== null` ガード、`approvalSteps.push`、`Array.from(map.values())` をすべて含む。`leftJoin(approvalSteps, ...)` で N+1 を回避し、`orderBy(requests.createdAt, approvalSteps.stepOrder)` でソート済み。
- `domain/models/request.ts` に `ApprovalStepSummary`（`approverRole: string`、`status: "pending"|"approved"|"rejected"`、`deadline: Date | null`）と `RequestWithSteps = Request & { approvalSteps: ApprovalStepSummary[] }` が定義済み。
- `styles.ts` に `BTN_PRIMARY_DISABLED`（`disabled:opacity-50 disabled:cursor-not-allowed` 含む）と `SELECT_BASE`（`block w-full border border-gray-300 rounded-md` 含む）が定義済み。

---

### Finding 3 & 5 (LOW): TC-020 — インラインアクションリンクが未実装かつスコープ外の明示なし

**Status: FIXED ✓**

検証結果:
- `tasks.md` T-05 末尾にスコープ外注記が追加された: 「要件3「アクション（承認/却下）はインラインのテキストリンク（`text-blue-600 text-xs underline`）にする」は今回のスコープ外とする。一覧からの個別承認は詳細画面（`/requests/[id]`）へのリンク経由で行う。一括承認チェックボックスを代替として実装済み。」
- `test-cases.md` TC-020 の優先度が `should` → `could` に降格され、スコープ外であることが本文に明記された。
- 前回指摘の「スコープ外の明示なし・3イテレーション対処なし」という問題は解消済み。インラインアクション列は実装されていないが、スコープ外として適切に記録・降格されているため承認ブロッカーではない。

---

### Finding 4 & 6 (LOW): design.md D5 と実装の記述不整合（設定リンクの表示ロール）

**Status: FIXED ✓**

検証結果:
- `design.md` D5 の記述が修正された。以前は「設定リンクも全ロールに表示する」と誤記されていたが、現在は「設定リンクは admin のみに表示する。」と明記されており、`spec.md` Requirement 1・`tasks.md` T-03・`layout.tsx` 実装すべてと整合している。
- ドキュメント不整合は解消済み。

---

## Summary

| Finding | Severity | Status |
|---------|----------|--------|
| TC-021/TC-022/TC-008/TC-011/TC-012/TC-032/TC-033 テスト未実装 | HIGH | FIXED ✓ |
| 同上（重複） | HIGH | FIXED ✓ |
| TC-020 スコープ外の明示なし | LOW | FIXED ✓ |
| design.md D5 記述不整合 | LOW | FIXED ✓ |
| TC-020 スコープ外の明示なし（重複） | LOW | FIXED ✓ |
| design.md D5 記述不整合（重複） | LOW | FIXED ✓ |

すべての findings が修正済み。リグレッションなし。矛盾なし。
