# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Functional Regression | design.md (D6), tasks.md (T-07, T-08) | `isCurrentApprover` の判定に `canApprove(step, role)`（直接ロール一致のみ）を使用しているが、既存の委任（delegation）機能は `canApproveWithDelegation` で評価される。委任を受けているユーザーは `approverRole` と自身の `role` が異なるため、UI 上で「承認する」「却下する」ボタンが非表示となる。現行 UI はステータスのみで表示判定しているため委任者も操作可能だが、新仕様では操作できなくなる（既存機能リグレッション）。なお usecase 層の認可は引き続き `canApproveWithDelegation` であるため、直接 Server Action を呼べば承認できるが UI からは不可能になる | D6 の設計判断を修正し、`page.tsx` での `isCurrentApprover` 判定に `canApproveWithDelegation` を使用する。`page.tsx` 内でセッションユーザー向けの委任を取得する必要があるため、`listDelegations` ユースケースまたは `approvalDelegationRepository.findActiveByToUserId(userId, organizationId, new Date())` 経由で委任を取得し、`canApproveWithDelegation(currentStep, role, delegations).allowed` を `isCurrentApprover` とする。あわせて spec.md のシナリオに「委任を持つユーザーには操作ボタンが表示される」ケースを追加する |
| 2 | MEDIUM | Functional Gap | tasks.md (T-03), spec.md | 「要対応」タブのフィルタが `approvalSteps.some(s => s.status === "pending" && s.approverRole === role)` のため、`approvalSteps` が空（ステップなし申請）かつ `status === "pending"` のレガシー申請が「要対応」タブに表示されない。現行コードは `steps.length === 0` の場合に単一承認フローを実行しており（`approveRequest` usecase 参照）、これらの申請は全タブから事実上消える可能性がある | T-03 のフィルタロジックに `approvalSteps.length === 0` の場合のフォールバックを追加する。例: `action-required` フィルタ条件を `r.status === "pending" && (r.approvalSteps.length === 0 \|\| r.approvalSteps.some(s => s.status === "pending" && s.approverRole === role))` とする。またはレガシー申請が存在しない運用前提であればその旨を spec.md に明記して設計判断を文書化する |
| 3 | LOW | Consistency | tasks.md (T-01, T-06) | 新規作成する `getInquiry` は positional args `getInquiry(inquiryId, organizationId)` と記述されているが、既存の `getContract` は named args `getContract({ contractId, organizationId })` を使用しており、ユースケース API スタイルが不統一。T-06 では `getContract(originTriggerEntityId, organizationId)` のように positional 呼び出しで記述しているが実際のシグネチャは named | `getInquiry` の API を既存パターンに合わせ named args `getInquiry({ inquiryId, organizationId })` に統一することを推奨。T-06 の `getContract` 呼び出し記述も `getContract({ contractId: originTriggerEntityId, organizationId })` に修正する |
