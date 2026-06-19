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
| 1 | HIGH | Test coverage gap | `tasks.md` T-15 / `src/__tests__/static/projectStructure.test.ts` TC-054 | TC-054（行 432–444）は「金額ベース自動選択が現行実装である」前提で書かれており、今回の変更と真逆のアサーションを持つ。`expect(content).not.toContain('name="templateId"')` は本変更後に `name="templateId"` が存在するため必ず失敗する。また `expect(content).toContain('name="amount"')` は、amount が動的フィールド（`name="field_amount"`）に変わるため同様に失敗する。T-15 の projectStructure.test.ts 更新指示は「templateSelectionService.ts の存在確認の変更」と「evaluateStepCondition 追加」のみを記載し、TC-054 の修正を明示していない。実装者が T-15 を厳密に追えば TC-054 を見落とし、`bun test` が失敗して受け入れ基準を満たせない。 | T-15 に「TC-054 を今回の変更に合わせて反転させる」旨を追記する。具体的には、`name="templateId"` が存在すること・固定の `name="amount"` が存在しないことを検証するアサーションに書き換え、テスト名を「テンプレート選択UIが表示され固定の金額フィールドが存在しない」に変更する。 |
| 2 | HIGH | Test coverage gap | `tasks.md` T-15 / `src/__tests__/static/projectStructure.test.ts` TC-057 | TC-057（行 597–619）の `keyFiles` 配列に `"domain/services/templateSelectionService.ts"` が含まれており、ファイル削除後に `expect(exists).toBe(true)` が失敗する。T-15 は「templateSelectionService.ts の存在を検証するテストを『存在しないこと』に変更する」と記載しているが、これは TC-057b（行 625–634）を主に指すと読め、TC-057 の keyFiles 行（行 606）まで対象に含むか曖昧。 | T-15 の指示を「TC-057 の `keyFiles` 配列からも `templateSelectionService.ts` を削除する」と明確化する。TC-057b の削除判断と同じ修正範囲として明示的に記載する。 |
| 3 | MEDIUM | Security | `tasks.md` T-08 / `src/app/actions/requests.ts` | `type: "select"` のフィールドに対して、Server Action でユーザーが送信した値が `options` の一覧に含まれているか検証する仕様が存在しない。テンプレートの `fields` 定義を取得して required チェックと number 型変換は行うが、select の許可値チェックが記載されていない。これにより任意の文字列が `formData.value` として永続化される（OWASP A03 Input Validation）。 | T-08 に「`type: "select"` のフィールドは、送信値が `field.options` に含まれていることを検証し、含まれない場合はバリデーションエラーを返す」旨を追加する。spec.md の「formData バリデーション」Requirement にも同条件のシナリオを加える。 |
| 4 | LOW | Type safety | `spec.md` / `tasks.md` T-01 | domain モデルの `formData: Record<string, unknown>` は、実際の格納形式 `{ [name]: { value: unknown, label: string } }` と型が一致しない。UI コンポーネントが `value` と `label` にアクセスする際にキャストが必要となり、型安全性が損なわれる。request-review-result-002 でも LOW 指摘されている既知事項。 | T-01 で `formData` の型を `Record<string, { value: unknown; label: string }>` に変更することを検討する。または spec.md の Request ドメインモデル Requirement に「UI コンポーネントは `formData[key].value` と `formData[key].label` を参照する」旨の注釈を加え、実装者に格納形式を明示する。 |
| 5 | LOW | Spec completeness | `tasks.md` T-15 / `src/__tests__/actions/requestValidation.test.ts` | 既存の `requestValidation.test.ts`（行 5–8）はテスト内でスキーマを独自定義しており、`description: z.string().optional()` を含む。T-15 は「`templateId` の必須バリデーションテストを追加する」とのみ記載しているが、既存の `description` オプショナルテストを削除・書き換える必要があることが明示されていない。 | T-15 の requestValidation.test.ts 更新指示に「既存の `description` バリデーションテストを削除し、スキーマ定義を `templateId: z.string().uuid()` に置き換える」を追記する。 |

## Summary

コードベース（`schema.ts`, `approvalTemplate.ts`, `request.ts`, `templateSelectionService.ts`, `approvalTemplateRepository.ts`, `createRequest.ts`, `requests.ts`, `templates.ts`, `projectStructure.test.ts`）を実査した。

設計方針（D1–D8）・spec シナリオ・tasks はいずれも整合しており、アーキテクチャの依存方向遵守・migration 戦略・条件付きステップ評価ロジックも適切に定義されている。

ブロッカーは 2 件の HIGH（TC-054 と TC-057 keyFiles のテスト更新漏れ）で、いずれも T-15 の記述を補完すれば解消できる。`resubmitRequest` は既存ステップをリセットするのみで新規生成しないため、`filterStepsByCondition` の対象外であり設計上の矛盾はない。`existsPendingByTemplateId` は audit_logs 経由の実装を維持しつつ新 `templateId` カラム追加後も正常動作するため、変更対象から外すことは問題ない。
