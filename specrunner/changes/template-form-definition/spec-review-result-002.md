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

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Spec consistency | `request.md` Requirement 4 | `request.md` の要件4はドメインモデルの `formData` 型を `Record<string, unknown>` と記述しているが、`tasks.md` T-01（line 9）と `spec.md`（line 74–80）では `Record<string, { value: unknown; label: string }>` と具体的に定義されている。ドキュメント間で型定義が食い違っており、`request.md` が古い定義のままとなっている。`tasks.md` / `spec.md` が実装ガイドとして優先されるため実装上の混乱は起きにくいが、`request.md` を参照した際に誤解を招く可能性がある。 | `request.md` 要件4の `Record<string, unknown>` を `Record<string, { value: unknown; label: string }>` に統一する。`request.md` → `design.md` → `tasks.md` / `spec.md` の順に具体化する構成なので、`request.md` だけ旧型のまま残すと後のステップでの参照に齟齬が生じる。 |
| 2 | LOW | Implementation guidance | `tasks.md` T-08 / T-10 | `tasks.md` T-10 は HTML フォーム入力の `name` 属性を `field_${field.name}`（例：`field_amount`）と指定しているが、`tasks.md` T-08 はフォームデータを受け取る Server Action でこのプレフィックスを除去してから formData キーを構築する旨を明示していない。`spec.md` の Scenario は formData に `{ "amount": { ... } }` が保存されると示しており、`field_` を除いたキーが必要になる。T-08 とT-10 を合わせて読めば推論可能だが、実装者がプレフィックス除去ロジックを見落とす余地がある。 | T-08 の Server Action 変更タスクに「`field_` プレフィックスを持つフォーム入力値を取得し、`field_` を除いた field.name をキーとして formData を構築する」旨を明示する一文を追加する。 |
| 3 | LOW | Test coverage gap | `tasks.md` T-15 | `spec.md` の「formData バリデーション」Requirement には select フィールドの options 外の値を拒否するシナリオが 2 件あり、`tasks.md` T-08 の受け入れ基準にも同条件が記載されているが、`tasks.md` T-15 はこれらの動作を検証するテストケースをどのファイル・どのテストブロックに追加するかを指定していない。`requestValidation.test.ts` の書き換え対象は `createRequestSchema`（Zod スキーマ）の静的バリデーションのみとされており、動的バリデーション（テンプレート定義を DB から取得して options を照合するロジック）のテストが T-15 に明示されていない。 | T-15 に「`createRequestAction` の動的バリデーション（select options 外値拒否、required フィールド未入力）を `src/__tests__/actions/requestValidation.test.ts` または `src/__tests__/usecases/requestWorkflow.test.ts` にテストケースとして追加する」旨を明記する。または T-08 の受け入れ基準に「対応するユニットテストが存在すること」を加える。 |

## Summary

コードベース（`schema.ts`、`approvalTemplate.ts`、`request.ts`、`domain/services/index.ts`、`approvalStepService.ts`、`approvalTemplateRepository.ts`、`createRequest.ts`、`requests.ts`、`projectStructure.test.ts`、`requestValidation.test.ts`）を実査した。

**spec-review-result-001 で指摘した HIGH / MEDIUM / LOW 所見の修正確認:**

- **HIGH #1（TC-054 更新未記載）**: `tasks.md` T-15 line 227 に「TC-054 を更新する：`name="templateId"` が存在すること・`name="amount"` が存在しないことをアサートする」が明示的に追加されている。✓ 解消
- **HIGH #2（TC-057 keyFiles 未記載）**: `tasks.md` T-15 line 228 に「TC-057 の `keyFiles` 配列から `templateSelectionService.ts` を削除する」が明示的に追加されている。✓ 解消
- **MEDIUM #3（select option バリデーション欠如）**: `tasks.md` T-08 line 108 に select option 検証と拒否処理が追記され、`spec.md` に「select フィールドに options 外の値が送信された場合にエラー」「options 内の値は通過」の 2 シナリオが追加されている。✓ 解消
- **LOW #4（formData 型不整合）**: `tasks.md` T-01 line 9 と `spec.md` 要件「Request ドメインモデル」で `Record<string, { value: unknown; label: string }>` に統一されている。✓ 解消（`request.md` 要件 4 は旧型のままだが上位ドキュメントとして許容範囲 — LOW #1 として記載）
- **LOW #5（requestValidation.test.ts 更新未明示）**: `tasks.md` T-15 line 226 に「既存の `description` バリデーションテストを削除し、`templateId` 必須バリデーションテストに書き換える」が明示されている。✓ 解消

設計方針（D1–D8）・spec シナリオ・tasks の整合性は前回より向上しており、アーキテクチャ依存方向、migration 戦略、条件付きステップ評価ロジック、select option セキュリティバリデーションの要件定義はすべて適切。

新規に発見した所見は 3 件すべて LOW であり、実装を妨げるものはない。スペックは実装着手可能な状態と判断する。
