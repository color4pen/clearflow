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
| 1 | MEDIUM | Scope ambiguity | 要件4 vs 要件6 | `submitRequest` は楽観的ロック対象（要件4）に明示されているが、冪等性対象（要件6）は「承認・却下・差し戻し・再申請」のみで `submitRequest` を含まない。スコープ外には「申請作成の冪等性は対象外」とあるが、submit は申請作成（create）ではなく draft→pending の状態変更であり、扱いが曖昧 | `submitRequest` を冪等性の対象とするかどうかを要件内に明記する。対象外であれば、楽観的ロックとの非対称性が意図的である旨を補足する |
| 2 | MEDIUM | Scope ambiguity | 要件3 / requestRepository・approvalStepRepository | version 不一致時の repository の戻り値・エラー識別手段が未規定。現在 `updateStatus` は `Request \| null`（null = not found）を返す。version 不一致でも null を返すと、usecase 層で「競合」と「not found」を区別できず、要件4 で指定された特定エラーメッセージ「この申請は他のユーザーによって更新されました。」を正しく返せない | version 不一致時の識別方法（例: 専用の throw / discriminated union 戻り値 / `ConflictError` 型）を要件に明示する |
| 3 | LOW | Clarity | 要件4 / 要件7 / Server Actions | UI → Server Action への `version` の受け渡し経路が未規定。現在の action 署名 `(requestId: string, _formData: FormData)` に version をどう含めるか（hidden input か第3引数か）の指針がない | version の受け渡し方法（例: hidden input フィールド、または action 引数追加）を要件内で補足すると実装の揺れを防げる |
| 4 | LOW | Clarity | 要件6 / idempotency_keys | 同一冪等性キーを持つリクエストが並行して同時到達した場合の競合処理が未記述。DB の `key (unique)` 制約で INSERT が失敗するケースを「前回結果の返却」として扱う旨が明示されていない | ON CONFLICT / constraint violation を通常フロー（前回結果を返す）として処理する旨を明記する |
