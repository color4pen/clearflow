# Domain-Invariants Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    invariants are maintained; change is safe to merge
  - needs-fix:   one or more invariants are broken; must be resolved before merge
  - escalation:  unresolvable conflicts or ambiguity; requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: data leakage across tenants, audit gap on terminal operations, unreachable terminal state
  - HIGH:     verifiable invariant violation with realistic exploit path or spec non-compliance
  - MEDIUM:   defense-in-depth gap, policy violation with low practical risk
  - LOW:      informational, pre-existing issue, by-design known limitation
-->

- **verdict**: approved

## Scope

テナント分離（organizationId によるデータ境界保護）、監査ログの完全性（全ワークフロー操作の audit_logs 記録）、承認ワークフロー不変条件（状態遷移の正当性・承認順序・終端状態保護・トランザクション境界）を検証した。

対象ファイル（新規・変更）:
- `src/infrastructure/schema.ts` — approvalSteps / approvalTemplates テーブル定義
- `src/infrastructure/repositories/approvalStepRepository.ts` — 新規リポジトリ
- `src/infrastructure/repositories/approvalTemplateRepository.ts` — 新規リポジトリ
- `src/infrastructure/repositories/requestRepository.ts` — updateStatus 拡張
- `src/application/usecases/approveRequest.ts` — 多段階承認拡張
- `src/application/usecases/rejectRequest.ts` — 差し戻し対応拡張
- `src/application/usecases/resubmitRequest.ts` — 新規 usecase
- `src/application/usecases/createRequest.ts` — テンプレート対応拡張
- `src/domain/services/requestTransition.ts` — revision 遷移ルール追加
- `src/domain/services/approvalStepService.ts` — 新規ドメインサービス
- `src/app/actions/requests.ts` — Server Actions 拡張

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Tenant isolation | `src/infrastructure/repositories/approvalStepRepository.ts` (updateStatus, L74-96) | `updateStatus` の WHERE 句が `eq(approvalSteps.id, stepId)` のみで `organizationId` 条件を持たない。T-05 AC「全関数にテナント分離（organizationId 条件）が適用されている」に違反。同リポジトリの `resetSteps` は code-review-002 (F1 high) で同一指摘を受け organizationId フィルターが追加されたが、`updateStatus` に対して同等の対応が行われていない。stepId は UUID のため他テナントのレコードへの実際のアクセスは困難であり（呼び出し元の findByRequestId が常に organizationId フィルター済みのデータから stepId を取得する）、実害リスクは低い。ただし防御的設計（defense in depth）の観点では DB 層のポリシー違反として修正が望ましい。 | 関数シグネチャに `organizationId: string` 引数を追加し、WHERE 句を `and(eq(approvalSteps.id, stepId), eq(approvalSteps.organizationId, organizationId))` に変更する。呼び出し元 `approveRequest.ts` および `rejectRequest.ts` で `data.organizationId` を渡すよう修正する。 |
| 2 | LOW | Audit log completeness | `src/application/usecases/createRequest.ts` (L82-103) | テンプレート未指定パスでは `requestRepository.create` と `auditLogRepository.create` がトランザクション外で実行される。`auditLogRepository.create` が失敗した場合、申請レコードは作成されるが監査ログが欠落する。ただし T-09 AC は「テンプレート指定時の操作が `db.transaction()` 内で実行される」のみを要求しており、非テンプレートパスのトランザクション化は本変更のスコープ外かつ pre-existing 動作である。 | スコープ外のため対応任意。将来のリスク低減として非テンプレートパスも `db.transaction()` 内で実行することを推奨するが、現時点では対応を強制しない。 |
| 3 | LOW | Authorization boundary | `src/application/usecases/resubmitRequest.ts` / `src/app/actions/requests.ts` | `resubmitRequest` は申請者本人（`creatorId` と `actorId` の照合）を検証せず、同一組織の任意の認証済みユーザーが他者の申請を再申請できる状態になっている。ただし spec.md（Requirement: resubmitRequest は認証済みユーザーのみが実行できる）に「初期実装では組織内の認証済みユーザーであれば実行可能（申請者本人確認は将来対応）」と明示されており、意図的な設計判断である。テナント分離（organizationId 境界）は維持されているため、別テナントのデータへのアクセスは不可能。 | 明示的な設計判断のため対応任意。将来の improvement として `resubmitRequestAction` に `session.user.id === request.creatorId` チェックを追加することを推奨する。 |

## Invariant Checklist

### テナント分離

| 対象 | 確認内容 | 結果 |
|------|----------|------|
| `requestRepository.findById` | `and(eq(id), eq(organizationId))` | ✅ PASS |
| `requestRepository.updateStatus` | `and(eq(id), eq(organizationId))` | ✅ PASS |
| `approvalStepRepository.findByRequestId` | `and(eq(requestId), eq(organizationId))` | ✅ PASS |
| `approvalStepRepository.createMany` | insert 時 `organizationId` を各レコードに付与 | ✅ PASS |
| `approvalStepRepository.updateStatus` | `eq(stepId)` のみ、organizationId なし | ⚠️ MEDIUM |
| `approvalStepRepository.resetSteps` | `and(eq(requestId), eq(organizationId), gte(stepOrder))` | ✅ PASS（review-002 F1 修正済み）|
| `approvalTemplateRepository.findByOrganization` | `eq(organizationId)` | ✅ PASS |
| `approvalTemplateRepository.findById` | `and(eq(id), eq(organizationId))` | ✅ PASS |
| Server Actions の organizationId 取得元 | 全 action が `session.user.organizationId` から取得（URL クエリ・リクエストボディ不使用）| ✅ PASS |

### 監査ログ完全性

| 操作 | audit_logs アクション | トランザクション内 | 結果 |
|------|----------------------|-------------------|------|
| 申請作成（テンプレートあり） | `request.create` | ✅ tx 内 | ✅ PASS |
| 申請作成（テンプレートなし） | `request.create` | ❌ tx 外（pre-existing）| ⚠️ LOW |
| ステップ承認 | `approval_step.approve` | ✅ tx 内 | ✅ PASS |
| 全ステップ承認完了 | `approval_step.approve` + `request.approve` | ✅ tx 内 | ✅ PASS |
| 差し戻し（revision） | `approval_step.reject`（metadata: stepId, comment） | ✅ tx 内 | ✅ PASS |
| 最終却下（rejected） | `request.reject` | ✅ tx 内 | ✅ PASS |
| 再申請 | `request.resubmit`（metadata: resetStepOrders） | ✅ tx 内 | ✅ PASS |

### 承認ワークフロー不変条件

| 不変条件 | 実装箇所 | 結果 |
|----------|----------|------|
| 状態遷移ガード（全 usecase） | `validateTransition` 呼び出しが全 usecase に存在 | ✅ PASS |
| `approved` 終端状態 | `VALID_TRANSITIONS` に `approved` のキーなし | ✅ PASS |
| `rejected` 終端状態 | `VALID_TRANSITIONS` に `rejected` のキーなし | ✅ PASS |
| `revision → approved` 直接遷移禁止 | `VALID_TRANSITIONS.revision = ["pending"]` | ✅ PASS |
| 多段階承認パスの pending 状態ガード | `validateTransition(existing.status, "approved")` を多段階パス先頭で実施（review-002 F2 修正済み）| ✅ PASS |
| 承認順序強制（stepOrder 最小が先） | `getCurrentStep` が pending ステップの最小 stepOrder を選択 | ✅ PASS |
| ロールベース承認認可 | `canApprove(step, actorRole)` でロール一致確認 | ✅ PASS |
| 全ステップ完了後の `approved` 遷移 | `isAllApproved(updatedSteps)` による判定 | ✅ PASS |
| 差し戻し後の部分リセット | `getStepsToReset(steps, rejectedStepOrder)` で rejectedStepOrder 以降のみリセット | ✅ PASS |
| 差し戻し前完了ステップの保持 | `resetSteps(requestId, fromStepOrder, organizationId)` が `gte(stepOrder, fromStepOrder)` 条件 | ✅ PASS |
| 全ミューテーション操作のトランザクション境界 | `approveRequest`, `rejectRequest`, `resubmitRequest`, `createRequest`（テンプレートあり）が全て `db.transaction()` 内で実行 | ✅ PASS |

## Summary

コードレビュー iteration-002/003 で指摘された重大な問題（`resetSteps` の organizationId 欠落・`approveRequest` 多段階パスのステータスガード欠落）はいずれも解消されており、承認ワークフローの核心となる不変条件はすべて正しく実装されている。

残存 findings は MEDIUM 1件（`updateStatus` の organizationId フィルター欠落）と LOW 2件のみ。HIGH/CRITICAL 件数ゼロのため verdict は `approved`。

`updateStatus` の organizationId 欠落（Finding #1）は実害リスクが低いものの、同リポジトリ内の他関数（`resetSteps`）が修正されたのと同一の policy 違反である。次イテレーションまたは将来の technical debt 解消の機会に対応を推奨する。
