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
| 1 | MEDIUM | Scope Ambiguity | 要件8（申請詳細・一覧の変更） | formData のキー・値ペア表示において、表示キーを `name`（英語フィールド名: "amount" 等）とするか `label`（日本語ラベル: "金額" 等）とするかが未定義。`requests` テーブルに `templateId` を持たない設計では、表示時に template の `fields` 定義を参照する手段がなく、実装者が独自判断で name 表示を選択した場合 UX が劣化する。 | 「formData のキー・値ペア表示は `label` を表示キーとし、`templateId` を都度参照して取得する」または「`name` をキーとしてそのまま表示する（英語表記許容）」のいずれかを明記する。あるいは formData の格納形式を `{ [name]: { value, label } }` とすることで表示時のテンプレート参照を不要にする設計変更も検討可。 |
| 2 | MEDIUM | Scope Ambiguity | 要件2（承認条件ルール）、要件6（条件評価） | `StepCondition.value` が `number` 型に固定されているが、`operator: "eq"` は文字列・日付フィールドへの等値比較としても自然に使いたいケースがある。どの field `type` に対して condition を適用できるかが未定義のまま実装委任されると、型安全でない評価ロジックが生まれる可能性がある。 | 「condition は `type: "number"` のフィールドにのみ適用可能とする」旨を要件2に明記するか、`value: number \| string` に型を拡張してすべてのフィールド型を対象にできる設計に変更する。 |
| 3 | MEDIUM | Scope Ambiguity | 要件7（申請作成UI）、Server Action 層 | createRequest Server Action が formData 内の required フィールドの必須チェックや select フィールドの allowed values バリデーションをどのように行うかが未定義。アーキテクチャ規約上 Server Actions がバリデーション責務を担うが、テンプレート依存の動的バリデーションロジックについて受け入れ基準に含まれていない。 | 受け入れ基準に「createRequest Server Action がテンプレートの fields 定義を参照し、required: true のフィールドが formData に含まれることを検証する」を追加する。 |
| 4 | LOW | Clarity | 要件1（TemplateField 型定義） | `type: "select"` の場合に `options` は `options?: string[]`（省略可）だが、options なしの select フィールドは動作不能。型定義では必須性を表現できていない。 | 実装ノートとして「type が "select" の場合、options は必須とし、実装時に Zod 等で discriminated union による型制約を設ける」を要件1に補足する。 |
| 5 | LOW | Clarity | 要件10（シードデータ更新） | シードデータの fields 定義に日本語ラベルのみが記載されており、formData のキーとなる `name` 値（例: "amount", "purpose", "vendor"）が未指定。実装者が独自に決定した name が条件評価（`condition.field` との照合）に影響するため、シードの condition 定義との整合性が取れない可能性がある。 | 要件10の各フィールドに `name` 値を明示する（例: 経費申請 — `amount`, `purpose`, `vendor`; 購買申請 — `amount`, `item`, `quantity`, `deliveryDate`; 休暇申請 — `startDate`, `endDate`, `reason`）。 |

## Summary

現状コードの前提はすべてコードベースと一致しており（`schema.ts`, `approvalTemplate.ts`, `templateSelectionService.ts`, `approvalTemplateRepository.ts`, `createRequest.ts`, `requests/new/page.tsx` を確認）、要件の方向性・技術的整合性・アーキテクチャへの準拠に問題はない。HIGH 相当の欠陥（ゴール不明瞭・受け入れ基準の不在・テスト不可能）は存在しない。MEDIUM 3 件はいずれも実装者が判断を迫られる曖昧点であり、実装工程でコンフリクトが生じやすいが、design ステップでの補足または実装者の合理的判断で解消可能なレベル。LOW 2 件は表現の精緻化。
