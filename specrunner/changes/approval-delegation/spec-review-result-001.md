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
| 1 | HIGH | Specification Inconsistency | tasks.md (T-02) | `ApprovalDelegation` 型定義に `fromUserRole` フィールドが欠落している。request.md 要件 2 は `fromUserRole (string — repository が users テーブルと JOIN して取得)` を明示しており、tasks.md T-05 も `findActiveByToUserId` が JOIN して `fromUserRole` を含む `ApprovalDelegation[]` を返すと定義している。しかし T-02 の TypeScript 型定義にはこのフィールドが存在しない。`canApproveWithDelegation`（T-03）は「委譲元ロールが `step.approverRole` と一致する委譲を検索」する必要があるが、フィールドなしでは判定不能となり、機能の核心が動作しない。 | T-02 の `ApprovalDelegation` 型定義に `fromUserRole: string` を追加する。これにより T-03・T-05 と一致する。 |
| 2 | HIGH | Specification Contradiction | tasks.md (T-10) vs request.md (要件 5) | `rejectRequest` への代理承認統合について request.md と tasks.md/design.md が矛盾している。request.md 要件 5:「`rejectRequest` には canApprove チェックを追加しない（却下は現在ロールチェックなしで動作しているため、スコープを維持する）」。一方 tasks.md T-10 は `rejectRequest` に `canApproveWithDelegation` チェックを追加し、design.md のリスク軽減策も同様の追加を指示している。実装者はどちらに従うか判断できず、かつ挙動変更は既存動作への影響リスクがある。 | 仕様を一方に統一する。T-10（design.md のリスク軽減策）を採用する場合は request.md 要件 5 の記述を更新し、`rejectRequest` への統合を明示的に要件として追記する。スコープ維持（request.md 要件 5 を採用）する場合は tasks.md T-10 および design.md のリスク軽減策の記述を削除・修正する。どちらを採用するかを確定した上で、対応する受け入れ基準も更新すること。 |
| 3 | MEDIUM | Test Coverage | tasks.md (T-13) | クロスオーグ委譲拒否のテストが静的解析タスクに含まれていない。request.md 受け入れ基準に「クロスオーグ委譲が拒否されることをテストで確認する」と明記されているが、T-13 の静的解析テストは自己委譲チェック (`fromUserId === toUserId`) と重複チェック (`findOverlapping`) のみを対象とし、クロスオーグチェック（`userRepository.findById` 呼び出しによる組織確認）は対象外。 | T-13 の静的解析チェックリストに「`createDelegation.ts` にクロスオーグチェック（`userRepository.findById` の呼び出しと organizationId の一致確認）が存在する」を追加する。 |
| 4 | LOW | Specification Clarity | tasks.md (T-03) | T-03 が `canApprove` について「第3引数 `delegations?: ApprovalDelegation[]` を追加（optional で後方互換）」と記述した直後に「既存の `canApprove` はそのまま維持して後方互換を保つ」と記述しており、「変更する」と「変更しない」が混在している。実装者が `canApprove` 本体を変更すべきか迷う可能性がある（optional 追加は後方互換だが文言上の矛盾として読める）。 | T-03 の記述を整理する。「`canApprove` には optional の `delegations?` 引数を追加し後方互換を維持する。既存の呼び出しは変更不要。`canApproveWithDelegation` は `{ allowed, delegation }` を返す別関数として新設する」のように意図を明示する。 |
