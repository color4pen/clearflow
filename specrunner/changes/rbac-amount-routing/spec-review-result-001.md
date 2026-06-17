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
| 1 | HIGH | テンプレート選択の非決定性 — 仕様とアルゴリズムの矛盾 | `spec.md` / `tasks.md (T-03, T-04)` | `selectTemplate` の選択ロジック（T-04）で amount が指定された場合、条件は `(minAmount === null \|\| minAmount <= amount) && (maxAmount === null \|\| maxAmount >= amount)` となる。シードのデフォルトテンプレート（minAmount=null, maxAmount=null）はあらゆる amount に対してこの条件を満たすため、amount=100000 では「デフォルト」と「少額」の両方がマッチする。`findByOrganizationForAmount`（T-03）に ORDER BY が未指定のため、最初に返るテンプレートはDB挿入順に依存する。シード挿入順（デフォルト→少額→高額）では amount=100000 でデフォルトが先に返り、spec.md の「金額10万円 → 少額テンプレートが選択される」シナリオが失敗する。同様に amount=100001 でも「デフォルト」と「高額」の両方がマッチし非決定的になる。 | `templateSelectionService` の選択ロジックを2段階にする：① amount が指定された場合は minAmount と maxAmount の両方が null でないテンプレートを優先検索し、② 該当なしの場合のみデフォルト（null/null）を返す。あるいは `findByOrganizationForAmount` で amount 指定時は `NOT (minAmount IS NULL AND maxAmount IS NULL)` 条件を付加してデフォルトを除外し、null を返す場合に呼び出し側（usecase）がデフォルトを別途取得するフォールバックパスを設ける。spec.md のシナリオ記述もこの選択優先順位を明確に記載する。 |
| 2 | HIGH | 既存テスト TC-047 / TC-054 の削除・更新漏れ — bun test が失敗する | `tasks.md (T-11)` | T-06 は `listApprovalTemplatesAction` を削除し、T-08 は申請作成画面のテンプレート選択UI（`<select name="templateId">` など）を除去する。しかし既存テスト2件がこれらの存在を要求している。（1）`src/__tests__/usecases/requestWorkflow.test.ts` の TC-047（L341–357）は `listApprovalTemplatesAction` 関数が `requests.ts` に存在することを `expect(src).toContain("listApprovalTemplatesAction")` で検証する。（2）`src/__tests__/static/projectStructure.test.ts` の TC-054（L422–434）は新規申請ページに `listApprovalTemplatesAction` の import、`<select`、`name="templateId"` が存在することを検証する。T-11 は TC-018/019/020/023 の更新を明記するが TC-047 と TC-054 の記載がなく、実装後に `bun test` が失敗する。 | T-11 に以下を追記する：「`src/__tests__/usecases/requestWorkflow.test.ts` の TC-047 を削除する（`listApprovalTemplatesAction` が削除されるため）」「`src/__tests__/static/projectStructure.test.ts` の TC-054 を、テンプレート選択UIの削除と金額入力UIの追加を検証する新テストに書き換える（`listApprovalTemplatesAction` の import が存在しないこと、`name="amount"` の input が存在することを確認する）」。 |
| 3 | MEDIUM | セキュリティ: 承認ゲートの排他パターンが将来ロール追加時に暗黙的に権限付与する | `design.md (D5)` / `tasks.md (T-06)` | `approveRequestAction` / `rejectRequestAction` のガードを `role !== "admin"` から `role === "member"` に変更する（T-06）。この排他パターンは「member 以外はすべて承認可能」を意味し、将来 "auditor" や "viewer" などの閲覧専用ロールが追加された際に、明示的な設計意図なく承認・却下権限が自動付与されるリスクがある。D5 ではこのトレードオフを "ロール追加に強い" として採用しているが、将来の実装者がこの暗黙の挙動に気づかない可能性がある。 | design.md の D5 に「新ロールを追加する際は、このアクション層ガードが自動的に承認権限を付与する点を必ず確認すること」という注記を追加する。また tasks.md T-06 のコメントにも同じ警告を記載する。実装上の変更は不要（設計判断として許容済み）だが、リスクの可視性を高める。 |
| 4 | LOW | T-07 の説明が auth.ts の型キャスト更新を省略しており misleading | `tasks.md (T-07)` | T-07 は「`src/types/next-auth.d.ts` — Role 型を import している箇所は変更不要（T-02 で Role 型を拡張済みのため自動的に反映される）」と記述する。確かに `next-auth.d.ts` は `Role` を import しているため自動反映される。しかし `src/infrastructure/auth.ts` の JWT/session コールバックには `(user as { role: "admin" \| "member" }).role` と `token.role as "admin" \| "member"` のハードコードキャストが残る。これらは T-02 後も自動更新されない。TypeScript エラーは発生しない（`"admin" \| "member"` は `Role` に対して上位互換で代入可能）が、キャストが意味的に陳腐化して将来の保守者を混乱させる。request.md 要件9では auth.ts の更新が明記されており、tasks.md が矛盾している。 | T-07 に「`src/infrastructure/auth.ts` の JWT コールバック内 `as { role: "admin" \| "member" }` および session コールバック内 `as "admin" \| "member"` キャストを `as { role: Role }` / `as Role` に更新する」というサブタスクを追記する。 |
