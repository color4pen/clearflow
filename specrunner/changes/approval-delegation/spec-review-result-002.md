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
| 1 | HIGH | Specification Contradiction | design.md / spec.md | `rejectRequest` への委譲チェック追加に関する記述が design.md と spec.md の3箇所に残存し、tasks.md T-10 および request.md 要件5（「rejectRequest には canApprove チェックを追加しない」）と矛盾している。①design.md D2: "採用: `approveRequest` / `rejectRequest` の TX 内で `findActiveByToUserId` を呼び出し…" ②design.md Risks: "Mitigation: `rejectRequest` でも委譲データを取得し、代理権限の検証を追加する" ③spec.md Requirement "Delegation data SHALL be fetched inside transaction": "`approveRequest` および `rejectRequest` usecase は、トランザクション内で `findActiveByToUserId` を呼び出し…なければならない（SHALL）"。実装者がこれら3文書を参照すると、spec.md の SHALL 要件が `rejectRequest` 実装を強制するように読めるが、tasks.md T-10 は明示的にスコープ外としており、どちらに従うか判断できない。 | ①design.md D2 の「採用」行を `approveRequest` のみに修正する。②design.md Risks の rejectRequest Mitigation 記述を削除または「スコープ外（将来対応）」に変更する。③spec.md の該当 Requirement を `approveRequest` のみに修正し、`rejectRequest` への言及を削除する。修正後、design.md / spec.md / tasks.md / request.md の4文書で「rejectRequest はスコープ外」に統一されることを確認する。 |
| 2 | MEDIUM | Missing Requirement | tasks.md (T-06, T-07) | request.md 要件6「createDelegation: 成功時に audit_logs に記録する」および要件7「deactivateDelegation: audit_logs に記録する」が tasks.md T-06・T-07 に実装タスクとして含まれておらず、spec.md にも対応する SHALL 要件が存在しない。実装者が tasks.md のみに従って実装すると、委譲管理操作（作成・無効化）の監査ログが記録されない。承認ワークフロー SaaS において委譲権限の変更は監査上重要な操作であり、欠落は運用時の問題になりうる。 | T-06 に「成功時に `auditLogRepository.create` を呼び出し、委譲作成を audit_log に記録する」ステップを追加する。T-07 に同様の無効化記録ステップを追加する。spec.md に "Delegation management actions SHALL be recorded in audit_logs" 要件を追加するか、意図的に省略する場合は request.md 要件6・7 との差異を design.md Non-Goals または Open Questions に明記して意図的なスコープ縮小であることを示す。 |
| 3 | MEDIUM | Security | tasks.md (T-11) | Server Actions (`createDelegationAction`, `deactivateDelegationAction`, `listDelegationsAction`) において `organizationId` の取得元が明示されていない。T-11 の zod スキーマ定義には `organizationId` が含まれておらず（fromUserId, toUserId, startDate, endDate のみ）、usecase (T-06) の入力には `organizationId` が存在する。マルチテナント SaaS において `organizationId` をユーザー入力（フォームデータ）から受け取ると、admin が自組織外の委譲を操作できるテナント境界バイパスのリスクがある。セッションから取得する意図であれば明示が必要。 | T-11 の各アクション説明に「`organizationId` は認証セッション（Auth.js session.user.organizationId 相当）から取得し、ユーザー入力からは受け取らない」と明記する。zod スキーマには `organizationId` を含めないことを仕様として確定させる。 |

## Resolution of Previous Findings (Attempt 1)

| # | Previous Finding | Status |
|---|-----------------|--------|
| 1 | HIGH: T-02 に `fromUserRole` フィールド欠落 | ✅ 解消: T-02 に `fromUserRole: string` が追加された |
| 2 | HIGH: `rejectRequest` 矛盾 (tasks.md T-10 vs request.md 要件5) | ⚠️ 部分解消: tasks.md T-10 は修正済みだが、design.md と spec.md に矛盾記述が残存 (Finding 1 参照) |
| 3 | MEDIUM: T-13 のクロスオーグ委譲テストが欠落 | ✅ 解消: T-13 にクロスオーグチェックの静的解析項目が追加された |
| 4 | LOW: T-03 の `canApprove` 記述の曖昧さ | ✅ 解消: `canApproveWithDelegation` を別関数として新設する意図が明確化された |
