# Regression Gate Result — Iteration 1

- **change**: multi-stage-approval
- **iteration**: 1
- **verdict**: approved

## Summary

All 10 findings in the ledger were verified against the current branch (`feat/multi-stage-approval-bea3d04f`). Nine findings represent code fixes that are confirmed present. One finding (#10) documents an intentional design decision that is consistent with the spec.

No regressions detected. No contradictions detected.

---

## Finding Verification

### F1 [HIGH] resetSteps に organizationId フィルターが欠落（TC-026 must 違反）

- **File**: `src/infrastructure/repositories/approvalStepRepository.ts`
- **Status**: FIXED ✓
- **Evidence**: `resetSteps` WHERE 句（lines 119–124）に `eq(approvalSteps.organizationId, organizationId)` が追加されており、テナント分離が適用されている。

---

### F2 [MEDIUM] approveRequest 多段階パスで validateTransition が欠落（設計 D4 未実装）

- **File**: `src/application/usecases/approveRequest.ts`
- **Status**: FIXED ✓
- **Evidence**: 多段階パスの先頭（line 83）で `validateTransition(existing.status, "approved")` を呼び、`ok` でなければ早期リターンしている（lines 83–86）。pending 以外の状態では承認ステップが進行しない。

---

### F3 [LOW] テンプレート未発見時に throw を使用し createRequestAction がハンドルしない（TC-043 should）

- **File**: `src/application/usecases/createRequest.ts`
- **Status**: FIXED ✓
- **Evidence**: テンプレート未発見時（lines 27–31）は `throw` ではなく `return { ok: false, reason: ... }` を返している。`createRequestAction` 側（`src/app/actions/requests.ts` lines 65–67）が `result.ok` をチェックしてエラーメッセージを返している。

---

### F4 [LOW] ApprovalStepsSection に承認者の表示名が未表示（TC-051 manual）

- **File**: `src/app/(dashboard)/requests/[id]/page.tsx`
- **Status**: FIXED ✓
- **Evidence**: `ApprovalStepsSection` 内（lines 77–79）で `step.approvedByName` を表示している。`ApprovalStep` 型に `approvedByName: string | null` が追加され（`src/domain/models/approvalStep.ts` line 10）、`findByRequestId` が users テーブルを LEFT JOIN して値を取得している（`approvalStepRepository.ts` lines 55–71）。

---

### F5 [LOW] テンプレート未発見時の throw が createRequestAction に伝播し 500 エラーになる

- **File**: `src/application/usecases/createRequest.ts`
- **Status**: FIXED ✓
- **Evidence**: F3 と同一修正。`throw` を排除し `{ ok: false, reason }` を返すように変更済み。

---

### F6 [LOW] findByRequestId がトランザクション外でフェッチされている（TOCTOU）

- **File**: `src/application/usecases/approveRequest.ts`
- **Status**: FIXED ✓
- **Evidence**: 多段階パスのトランザクション内（lines 105–109）でステップを再フェッチ（`freshSteps`）している。`isAllApproved` の計算は `freshSteps` をベースとした `updatedSteps`（lines 143–152）に対して行われており、古いスナップショットによる誤判定が解消されている。トランザクション外の初期フェッチ（lines 33–36）は fast-fail 用のプリチェックに限定されており、セキュリティクリティカルな判定には使用されていない。

---

### F7 [LOW] 承認済みステップに承認者名を表示できない（approvedBy が UUID）

- **File**: `src/app/(dashboard)/requests/[id]/page.tsx`
- **Status**: FIXED ✓
- **Evidence**: F4 と同一修正。`approvedByName` フィールドが型・リポジトリ・UI の各層に追加されており、承認者名が表示される。

---

### F8 [MEDIUM] updateStatus の WHERE 句に organizationId フィルターが欠落

- **File**: `src/infrastructure/repositories/approvalStepRepository.ts`
- **Status**: FIXED ✓
- **Evidence**: `updateStatus` のシグネチャに `organizationId: string` パラメータが追加され（line 76）、WHERE 句（lines 94–99）に `eq(approvalSteps.organizationId, organizationId)` が含まれている。DB 層の防御的テナント分離が確保されている。

---

### F9 [LOW] 非テンプレート申請作成パスで audit log がトランザクション外に記録される

- **File**: `src/application/usecases/createRequest.ts`
- **Status**: FIXED ✓
- **Evidence**: 非テンプレートパス（lines 82–114）が `db.transaction()` で囲まれており、`requestRepository.create` と `auditLogRepository.create` が同一トランザクション内で実行される。audit log 欠落リスクが解消されている。

---

### F10 [LOW] resubmitRequest が申請者本人（creatorId）確認を行わない

- **File**: `src/app/actions/requests.ts`
- **Status**: INTENTIONAL — no regression
- **Evidence**: `resubmitRequestAction`（lines 159–181）は creatorId チェックを行っていないが、これは `spec.md` の Requirement「resubmitRequest は認証済みユーザーのみが実行できる」に明示された意図的な設計判断である（「初期実装では組織内の認証済みユーザーであれば実行可能、申請者本人確認は将来対応」）。テナント分離（organizationId 境界）は維持されており、別テナントのデータへのアクセスは不可能。本 iteration での修正対象外であり、仕様との矛盾なし。
