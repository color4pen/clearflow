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

- **verdict**: needs-discussion

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | HIGH | Stale premise | request.md — 要件6「Contract の amount / startDate を NOT NULL に変更」および受け入れ基準 | `src/infrastructure/schema.ts` の実コードでは `amount: integer("amount").notNull()` および `startDate: timestamp("start_date").notNull()` がすでに NOT NULL である（`drizzle/0002_early_nicolaos.sql` により適用済み）。`src/domain/models/contract.ts` も `amount: number` / `startDate: Date` で nullable でない。「現状コードの前提」の `src/infrastructure/schema.ts:356-382` 記述が実態と一致していない。 | 要件6と対応する受け入れ基準をリクエストから削除するか、「すでに適用済みのため実装不要」と明記して残す。マイグレーション 0002 の意図と現在の実装差分を再確認してから更新すること。 |
| 2 | HIGH | Stale premise | request.md — 要件7「Invoice に issueDate を追加」および受け入れ基準 | `src/infrastructure/schema.ts` の実コードでは `issueDate: timestamp("issue_date")` がすでに存在する（`drizzle/0002_early_nicolaos.sql` により追加済み）。`src/domain/models/invoice.ts` も `issueDate: Date \| null` を持つ。「現状コードの前提」の `src/infrastructure/schema.ts:384-402` 記述が実態と一致していない。 | 要件7と対応する受け入れ基準をリクエストから削除するか、「すでに適用済みのため実装不要」と明記して残す。 |
| 3 | HIGH | Missing reference | request.md — 背景「ドメイン設計書（docs/design/01-domain-design.md）と現在の実装の間に乖離がある」 | `docs/design/01-domain-design.md` はリポジトリに存在しない。`docs/design/` 配下には `03-authorization-design.md` のみ存在する。リクエストの根拠となる設計書が参照できないため、設計意図の正確性を独立して検証できない。 | 設計書の正確なパスを修正するか、`docs/design/01-domain-design.md` を作成してリポジトリに追加する。あるいは設計書への参照を削除し、要件自体に設計意図を自己完結で記述する。 |
| 4 | MEDIUM | Scope ambiguity | request.md — 要件8「ClientContact の isPrimary 検証」 | `src/application/usecases/createClientContact.ts` は `isPrimary` パラメータを受け付けていない（関数シグネチャに存在しない）。また `updateClientContact` ユースケースも存在しない。要件8の「作成・更新時に検証する関数を追加する」は、単体のバリデーション関数の追加のみを意味するのか、`createClientContact` への `isPrimary` サポート追加も含むのかが不明確。 | 要件8のスコープを明確化すること。（a）`createClient` 経由の一括作成時のみバリデーション対象とするか、（b）`createClientContact` に `isPrimary` パラメータを追加してバリデーション対象に含めるかを明記する。 |
