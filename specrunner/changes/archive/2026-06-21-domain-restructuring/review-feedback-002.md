# Code Review Feedback — iteration 002

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 002

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | security | `src/infrastructure/repositories/dealContactRepository.ts:59-74` | `deleteByDealAndContact` の `_organizationId` パラメータが WHERE 句で使用されておらず、テナント分離が保証されない。iter 001 F-01 の "How to Fix" で「`deleteByDealAndContact` の `_organizationId` パターンとの不整合も解消する」と明記されていたが未対処。現時点では呼び出し元が存在しないため即時の脅威はないが、将来のコード追加時に悪用されうる。 | `findByDeal` と同様に `clientContacts` → `clients` を inner join し `eq(clients.organizationId, organizationId)` を WHERE に追加する。パラメータ名の `_` プレフィックスを外す。 | yes |
| 2 | low | correctness | `src/app/actions/meetings.ts:172` | `updateMeetingSchema.inquiryId` が `z.string().uuid()` 必須のまま。本 PR で案件直紐づき商談（`dealId` のみ）の作成が可能になったが、これらの商談の更新は `inquiryId` バリデーションで弾かれる。iter 001 F-05 で Fix:yes だったが未対処。 | `inquiryId: z.string().uuid().optional()` に変更し、`revalidatePath` の `/inquiries/${...}` 呼び出しを `if (parsed.data.inquiryId)` で条件分岐する。 | yes |
| 3 | low | maintainability | `src/__tests__/usecases/dealManagement.test.ts:61,75-76,87` | テスト名・コメントに `internal_approval` が3箇所残存（例: `"requestRepository.create の呼び出しが含まれる（internal_approval 時の...）"`）。テストロジック自体は正しく `estimate_approval` を検証しており pass するが、テスト名が実装と乖離している。iter 001 F-04 で Fix:yes だったが未対処。 | 各テスト名を `estimate_approval` に修正する（例: `"estimate_approval 時の見積承認リクエスト作成"`、`"TC-008: templateId が未指定の場合に estimate_approval 遷移がエラーを返すガードが含まれる"`）。 | yes |
| 4 | low | maintainability | `src/infrastructure/schema.ts:319` | `deals.contractType` カラムのコメントに旧型制約 `"quasi_delegation" \| "contract" \| "ses"` が残存。`contract` → `fixed_price` の改名後も更新されていない。 | コメントを `"quasi_delegation" \| "fixed_price" \| "ses"` に修正する。 | yes |
| 5 | low | maintainability | `src/app/(dashboard)/inquiries/[id]/meetings/[meetingId]/page.tsx:8-14` | `meetingTypeLabels` がローカルに定義されており `labels.ts` と重複している。T-07 のスコープ外（対象ページ一覧に明記なし）のため意図的に残された可能性があるが、ラベル集約の目的に反する。 | `import { meetingTypeLabels } from "@/app/(dashboard)/labels"` に変更してローカル定義を削除する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 7 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.30

## Summary

iter 001 の5件のうち高・中 severity の3件（F-01 `findByDeal` テナント分離、F-02 InquiryActions.tsx コメント "商談化"、F-03 seed `estimateRequestId` 流用問題）はすべて正確に修正されている。ビルド・型チェック・テスト（502件 green）・lint の4フェーズは引き続き通過しており、スキーマ変更・ドメインモデル・リポジトリ・ユースケース・アクション・UI の広範な変更が一貫した品質で実装されている。

残課題は5件。R-01 は iter 001 F-01 の "How to Fix" で明記されていた `deleteByDealAndContact` のテナント分離漏れ（現時点で呼び出し元なし）。R-02・R-03 は iter 001 で Fix:yes だった低 severity 項目の未対処。R-04 はコメントの軽微な不整合。R-05 はスコープ外の既存重複定義（Fix:no）。いずれも `high` 以上の finding がなく、blocking ルール上の verdict は `approved`。
