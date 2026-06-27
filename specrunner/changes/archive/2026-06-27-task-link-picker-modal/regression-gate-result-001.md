# Regression Gate Result — Iteration 1

- **change**: task-link-picker-modal
- **iteration**: 1
- **verdict**: needs-fix

## Summary

Ledger に記載された4件の修正をすべて検証した結果、いずれも現在のコードに反映されていない（全件リグレッション）。

---

## Finding Verification

### [HIGH] LINK_SEARCH_LIMIT 定数が import 文の途中に配置されている — リグレッション

- **File**: src/infrastructure/repositories/dealRepository.ts:3
- **Status**: ❌ NOT FIXED
- **Resolution**: fixable
- **Rationale**: `const LINK_SEARCH_LIMIT = 20;` が3ファイル（dealRepository.ts:3、inquiryRepository.ts:3、meetingRepository.ts:3）すべてで1行目の import 直後・残り import 群の前に存在している。全 import の後に移動すること。

---

### [HIGH] searchLinkTargetsAction: canPerform の前に checkRateLimit が実行されている — リグレッション

- **File**: src/app/actions/actionItems.ts:328
- **Status**: ❌ NOT FIXED
- **Resolution**: fixable
- **Rationale**: actionItems.ts の `searchLinkTargetsAction`（line 320〜）は依然として auth → checkRateLimit（line 328）→ canPerform（line 337）の順。権限のない認証済みユーザーのレートリミット枠が消費されてしまう。canPerform を checkRateLimit の前に移動し、他アクション（createActionItemAction 等）と同パターンに統一すること。

---

### [HIGH] searchBySummary テストが isNotNull 条件を明示的に検証していない — リグレッション

- **File**: src/__tests__/usecases/linkTargetSearch.test.ts
- **Status**: ❌ NOT FIXED
- **Resolution**: fixable
- **Rationale**: 「検索対象フィールド」describe 内の `meetingRepository.ts の searchBySummary に meetings.summary への検索条件が含まれる` テスト（line 132〜138）に `isNotNull` の存在を確認するアサーションが追加されていない。`expect(body).toContain('isNotNull')` 等を追記すること。

---

### [HIGH] TC-038 が存在しない MeetingType 値 'kickoff' を参照している — リグレッション

- **File**: specrunner/changes/task-link-picker-modal/test-cases.md:370
- **Status**: ❌ NOT FIXED
- **Resolution**: fixable
- **Rationale**: TC-038 の GIVEN 節に `type="kickoff"` が残っている。MeetingType の定義は `"hearing" | "proposal" | "negotiation" | "closing" | "followup"` であり `"kickoff"` は存在しない。有効な値（例: `"hearing"`）に変更すること。
