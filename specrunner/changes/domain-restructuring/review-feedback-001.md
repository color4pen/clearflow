# Code Review Feedback — iteration 001

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

- **verdict**: needs-fix
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | high | security | `src/infrastructure/repositories/dealContactRepository.ts:41-56` | `findByDeal` が受け取った `organizationId` をクエリで一切使用していない。コメントには「clients テーブル経由で絞り込む」とあるが実装は `dealContacts` と `clientContacts` の join のみで `clients.organizationId` まで辿っていない。ESLint が `'organizationId' is defined but never used` を警告している。別テナントの `dealId` を知っていれば別テナントの担当者情報を取得できる。TC-033（must）が満たせない。 | `clients` テーブルを inner join して `clients.organizationId = organizationId` を WHERE に追加する。`deleteByDealAndContact` の `_organizationId` パターンとの不整合も解消する。 | yes |
| 2 | medium | correctness | `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx:31` | コメント `// 商談化ボタンが非表示になる可能性があるが、対応中→見送りは可能` に「商談化」が残存。TC-048（must）「InquiryActions.tsx に「商談化」の文言が存在しない」に違反する。ボタンラベル・アクションテキストは修正済みだがこのコメント行が漏れた。 | コメントを削除するか「案件化ボタンが非表示になる可能性があるが、対応中→見送りは可能」に書き換える。 | yes |
| 3 | medium | correctness | `src/infrastructure/seed.ts:610-612` | T-13 タスク「案件シードの `estimateRequestId` を経費申請の `approvedRequest` ではなく seed 内で作成した案件化承認リクエストに変更する」が未実施。`wonDeal.estimateRequestId: approvedRequest.id` は「ソフトウェアライセンス購入」経費申請を参照したまま。`conversionRequestId` の修正は正しく行われている。自動テストは通るが、タスクの明示的な要件が満たされていない。 | seed 内で `estimateApprovalRequest` を別途生成し（templateId に見積承認テンプレートを使用）、`wonDeal.estimateRequestId` に割り当てる。 | yes |
| 4 | low | maintainability | `src/__tests__/usecases/dealManagement.test.ts:61,75-76,87` | テスト名・コメントに旧用語 `internal_approval` が残存。テストロジック自体は正しく `estimate_approval` を検証しているため pass するが、テスト名が誤解を招く。 | テスト名を「`estimate_approval` 時の見積承認リクエスト作成」等に修正する。 | yes |
| 5 | low | architecture | `src/app/actions/meetings.ts:172-174` | `updateMeetingSchema.inquiryId` が必須（optional 化されていない）。本 PR で案件直紐づき商談（`dealId` のみ）を作成できるようになったが、そのような商談の更新は `updateMeetingAction` がバリデーションエラーを返す。本 PR スコープ外だが次 PR 実装時に障害となる。 | `updateMeetingSchema.inquiryId` を `z.string().uuid().optional()` に変更し、`revalidatePath` も `inquiryId` が存在する場合のみ呼ぶよう条件分岐する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 5 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 7.40

## Summary

36 要件のうち 33 件は正確に実装されており、ビルド・型チェック・静的テストはすべて green。
スキーマ変更（nullable 化・リネーム・新テーブル）、ドメインモデル更新、リポジトリ・ユースケース・アクションの全面改修、ラベル集約、UI 修正、シードデータ整備まで広範な変更が一貫した品質で実施されている。

ブロッカーは 2 件。F-01 はマルチテナント分離の保証漏れ（organizationId が WHERE に入っておらず ESLint 警告も出ている）、F-02 は must テストケース TC-048 に違反するコメントの漏れ。いずれも修正コストは低い。
F-03 は明示的なタスク要件の未実施。F-04・F-05 は次イテレーションで対応可能な軽微な問題。

