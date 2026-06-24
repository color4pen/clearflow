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
| 1 | HIGH | functional | tasks.md / T-05 | T-05 では `requestRepository.create` を直接呼び出すが、`createRequest` ユースケースが書き込む `action: "request.create"` / `metadata.templateId` の監査ログを作成しない。`requestRepository.existsPendingByTemplateId` は `audit_logs.action = 'request.create'` との JOIN でテンプレート利用中チェックを行うため、システム生成の pending リクエストが存在しても `deleteTemplate` がそれを検出できず、使用中テンプレートを削除してしまう（承認ステップが孤立し、承認フロー破損）。 | T-05 のトランザクション内で `auditLogRepository.create({ action: "request.create", targetType: "request", targetId: createdRequest.id, metadata: { templateId: template.id } })` を追加する旨をタスクに明記する。または `existsPendingByTemplateId` を audit_logs JOIN から `requests.templateId` への直接クエリに変更する対応タスクを追加する。 |
| 2 | HIGH | functional | design.md / tasks.md | design.md は「複数ポリシー合致時はポリシーの作成順（`createdAt` 降順）で先頭を採用」と定義するが、`approvalPolicyRepository.findActiveByTriggerAction` に ORDER BY 句がなく、tasks.md にもその追加タスクが存在しない。複数のアクティブポリシーが合致した場合、DBのクエリプラン次第でどのポリシーが選ばれるか非決定的になり、環境差異や再デプロイで適用ポリシーが変わる可能性がある。 | T-01 または T-03 に「`findActiveByTriggerAction` に `.orderBy(desc(approvalPolicies.createdAt))` を追加する」タスクを追記する。あるいは `evaluatePolicies` の実装内でリターン前に `createdAt` 降順ソートを行う旨を tasks.md に明記する。 |
| 3 | MEDIUM | functional | tasks.md / T-05, T-07 | ポリシーゲート合致時、引合ステータスを変更せず `new` のまま返す設計のため、同じ引合に対して複数のユーザーが同時に `updateInquiryStatus(newStatus: "converted")` を呼ぶと、両者が `canTransition` を通過してそれぞれポリシー評価を行い、同一引合に対して複数のシステム承認リクエストが生成されてしまう。最適化ロックは引合ステータス更新時のみ適用されるため、ポリシーゲートパスでは競合を防げない。 | T-05 のポリシーゲートパスで `requestRepository.create` の前に「同一 `originTriggerEntityId` + `originTriggerAction: "inquiry.convert"` かつ `status: "pending"` のリクエストが既に存在する場合は作成をスキップ（または `pendingApproval` として既存IDを返す）」チェックを追加するタスクを明記する。または DB に `(originTriggerEntityId, originTriggerAction)` ユニーク制約（status が pending の場合）を設ける対応を検討する。 |
| 4 | LOW | spec-consistency | request.md vs tasks.md | `request.md` の要件2は `evaluatePolicies(organizationId, triggerAction, context, tx?)` と `tx?` パラメータを列挙しているが、`tasks.md` T-03 の関数シグネチャは `tx?` を省略している。設計上 `evaluatePolicies` はトランザクション開始前に呼ばれる（合致有無でトランザクション内容が変わるため）ので `tx?` は不要だが、仕様間に不整合がある。 | `request.md` の要件2から `tx?` を削除して `tasks.md` と統一する。 |
