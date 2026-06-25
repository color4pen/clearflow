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

- **verdict**: approved

## Review Summary

spec-review-001 の 3 件の指摘（HIGH×1, MEDIUM×1, LOW×1）はいずれも解消されている。

- **Finding #1 (HIGH → 解消)**: `canApprove` → `canApproveWithDelegation` に修正済み。design.md D6 が `approvalDelegationRepository.findActiveByToUserId` の呼び出しと `canApproveWithDelegation(currentStep, role, delegations).allowed` による判定を明示。tasks.md T-08 も同様に記述されており、既存の委任機能リグレッションは回避される設計となっている。approveRequest.ts 実装を確認したところ `getCurrentStep`・`canApproveWithDelegation` は既存ドメインサービスとして存在し、正しく参照可能である。
- **Finding #2 (MEDIUM → 解消)**: tasks.md T-03 のフィルタ条件に `approvalSteps.length === 0` の場合のフォールバックが追加されており、レガシー申請（ステップなし単一承認フロー）が「要対応」タブから消える問題は設計上解決されている。approveRequest.ts の `steps.length === 0` 分岐とも整合している。
- **Finding #3 (LOW → 解消)**: tasks.md T-01 が `getInquiry({ inquiryId, organizationId })` 形式（named args）を明示。tasks.md T-06 も `getInquiry({ inquiryId: originTriggerEntityId, organizationId })` と記述されており、既存 `getContract` との API スタイル統一が図られている。

残存する指摘はすべて MEDIUM 以下であり、実装ブロッカーではない。

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Spec Coverage | spec.md | spec-review-001 の finding #1 修正要求として「spec.md のシナリオに『委任を持つユーザーには操作ボタンが表示される』ケースを追加する」と指示されたが、spec.md には追加されていない。design.md D6 と tasks.md T-08 では委任対応が設計されているものの、spec.md がテストケース生成の入力となるため、この委任シナリオに対応するテストが生成されない可能性がある。委任ユーザーへの表示が（実装は正しく行われていても）テストで検証されないリグレッションリスクが残る | spec.md の「承認/却下ボタンは該当ステップの承認者にのみ表示する」Requirement に以下のシナリオを追加する: **Given** `approverRole: "manager"` の pending ステップがあり、ロールが `member` だが `manager` からの有効な委任を受けているユーザーがアクセスする **When** リクエスト詳細ページを表示する **Then** 「承認する」「却下する」ボタンが表示される |
| 2 | LOW | Architecture Consistency | design.md (D6), tasks.md (T-08) | design.md D6 および tasks.md T-08 が `approvalDelegationRepository.findActiveByToUserId` を page.tsx から直接呼び出す設計としているが、request.md の実装方針には「repository の直接呼び出し禁止: page.tsx から repository を直接呼ばない」と明記されており、仕様内で矛盾している。D6 では「usecase 層と同じパターン」と説明しているが、usecase は repository を呼んでよいが page.tsx は本来不可である | 矛盾の周知のため design.md D6 の Rationale に「この呼び出しは委任データ取得専用の例外とし、usecase 化は将来の拡張とする」旨を一文追記することを推奨。実装上は D6 の設計判断に従い page.tsx からの直接呼び出しを許容してよい（Server Action 側での二重認可チェックにより security は維持される） |
| 3 | LOW | Spec Ambiguity | tasks.md (T-08) | T-08 の現在ステップ特定方法として「`getCurrentStep` ドメインサービス使用、または `steps.find(s => s.status === "pending")` を `stepOrder` 順で取得」と記載されているが、`getCurrentStep` は approveRequest.ts で実際に使用されている既存のドメインサービスである。「または」の記述がインライン実装を許容するように読め、ロジックが二重化するリスクがある | T-08 の記述を「`getCurrentStep` ドメインサービス（`@/domain/services/approvalStepService`）を使用して現在の pending ステップを特定する」に一本化することを推奨。既存ドメインサービスが存在するため独自実装は不要 |
| 4 | LOW | UX Specification Gap | spec.md | design.md D7 では「承認操作の comment フィールドは UI に表示するが `approveRequest` が受け付けないため値は送信しない」と明記されているが、spec.md にはこの動作差異（コメント入力欄の表示 vs 送信保留）を説明するシナリオがない。実装者がコメントを誤って送信しようとした場合に型エラー以外のフィードバックがなく、実装上の混乱リスクがある | spec.md の「承認/却下操作にコメントフィールドが表示される」シナリオに補足を追加するか、D7 の設計判断を明記した注釈をシナリオに付与することを推奨。最小対応としては tasks.md T-07 の記述（「`approveRequestAction` は comment を使用しない」）で代替可能であり、ブロッカーではない |
