# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | MEDIUM | Scope/Implementation | 要件1 `list` / `listRequests` usecase | `listRequests(organizationId)` はフィルタ引数を持たない。「自分が申請した」「自分が承認すべき」「状態フィルタ」の 3 条件は、既存 usecase を素通しするだけでは実現できない。「自分が承認すべき」の実装には、`RequestWithSteps` の `ApprovalStepSummary.approverRole` と `getActiveDelegationsForUser` を組み合わせたアプリケーション層フィルタ、または新たな usecase 拡張が必要になる。コードベースには `getActiveDelegationsForUser` usecase が存在しており実装素材は揃っているが、実装方針が request に明記されていない。 | ツールハンドラ内でアプリケーション層フィルタ（`RequestWithSteps.approvalSteps` の pending 先頭ステップの `approverRole` と user role 比較 ＋ `getActiveDelegationsForUser` による委任判定）を行う方針を spec または design で明示すること。大規模テナントのスケーリング懸念があれば repository メソッド拡張も検討。 |
| 2 | LOW | Implementation Detail | 要件1 `get` | `getRequest` usecase は `Request | null`（steps なし）を返す。`get（ステップ状況含む）` の実装はハンドラで `getRequest` + `getApprovalSteps` を合成するか、新規 composite usecase が必要。`Request` モデルには `originTriggerAction` / `originTriggerEntityId` が既存フィールドとして存在しており、システム連動情報の返却は追加実装なしで対応可能。 | ツールハンドラで `getRequest` + `getApprovalSteps` を合成して返すパターンを採用する方針を spec に記載すること。既存フィールドで賄えるため usecase 追加は不要。 |
| 3 | LOW | Implementation Detail | `mcpToolsRegistration.test.ts` | 既存の TC-025 は「ちょうど 7 ツール」を検証しているが、`route.ts` は既に 11 ツールを登録しており、テストとの乖離がある。新規 4 ツールを追加すると TC-025 が壊れる、または新 registration テストが 15 ツールを期待する必要がある。 | 新規 4 ツール追加時に TC-025 を更新（または companion test を新設）し、登録ツール数と tool name 一覧を最新化すること。 |
| 4 | LOW | Clarity | 要件1 `create` 操作の入力スキーマ | `createRequest` usecase の `formData` は `Record<string, unknown>` だが、Server Action 側でテンプレートフィールド定義に沿った構造へ変換してから渡している。MCP ツールの `create` では AI エージェントが `formData` を直接構築するため、期待するフォーマット（フィールド名 → `{ value, label }` 形式、または値のみの `Record<string, string | number>`）を spec で明示する必要がある。 | `approval_templates.get` / `list` でテンプレートフィールド定義を取得してから `create` を呼ぶ 2-step フローを spec に明記し、`formData` の型（例: `Record<string, string \| number>` で MCP 層が `label` を補完）を確定させること。 |
