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
| 1 | MEDIUM | Scope ambiguity | 要件8 | "updateInvoiceStatus 等で金額変更がある場合" が曖昧。`updateInvoiceStatus` は amount を変更しない。`invoiceRepository.update` は amount を更新できるが、それを呼ぶ usecase (`updateInvoice`) は現在存在しない。 | 「単発契約合計チェックを適用する具体的な usecase」を明記するか、本リクエスト内で `updateInvoice` usecase を新規作成することを明示する。 |
| 2 | MEDIUM | Scope ambiguity | 要件6 / 受け入れ基準 | `invoices.due_date` を NOT NULL にする際、既存 null データのデフォルト値が「適切なデフォルト値」と抽象的で、実装者が値を決定できない。 | `created_at` または `NOW()` 等、具体的なデフォルト値をマイグレーション要件に記載する。 |
| 3 | LOW | Clarity | 要件1 / 要件4 | `contracts.amount` の既存 null を 0 に設定（要件1）した後、amount > 0 バリデーション（要件4）を追加する。マイグレーション後に amount = 0 の契約レコードが残り、次回 `updateContract` 実行時にバリデーションエラーとなる。意図した挙動か確認が望ましい。 | 許容する場合は設計意図をコメントに記載。懸念の場合は migration で 0 以外の値（例: 1）にするか、update 時の 0 許容を検討。 |
| 4 | LOW | Clarity | 受け入れ基準 | date 検証（startDate > endDate, issueDate > dueDate）が「作成時」のみ受け入れ基準に記載されている。要件3・7はアプリ層検証関数の追加を求めており、更新時も同関数を呼ぶ想定と推測されるが、受け入れ基準に更新ケースが不在。 | 受け入れ基準に「契約更新時」「請求更新時」の date 検証ケースを追記する。 |
| 5 | LOW | Clarity | 全体 | `amount` / `startDate` / `dueDate` を NOT NULL に変更すると、既存の `createContract` / `updateContract` / `createInvoice` の入力型（現在 `number \| null`, `Date \| null` で optional）と Server Action の Zod スキーマにカスケード変更が必要。要件に明示されていない。 | 実装フェーズで対応可能な範囲だが、implementer への補足として「型・バリデーション層の更新が伴う」旨を要件か備考に記載するとよい。 |
