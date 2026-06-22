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

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | correctness | `src/application/usecases/deleteDeal.ts:47` | `inquiryRepository.updateStatus` の戻り値（`Inquiry \| null`）を検査していない。楽観的ロックが並行更新で競合した場合、`null` が返ってもトランザクションは継続し、引き合いが `converted` のまま案件だけ削除されるデータ不整合が起こりうる。実行頻度は極めて低いが、design.md の「部分的な状態変更は起こらない」保証と矛盾する。 | `const updated = await inquiryRepository.updateStatus(...)` として戻り値を受け取り、`if (!updated) throw new Error("...")` でロールバックさせる。 | yes |
| 2 | low | testing | `src/__tests__/static/projectStructure.test.ts:1346` | `deleteDeal` の静的テストは `findAllByDeal` と `findAllByDealId` の存在のみを確認し、`deleteById` より前に出現することを検証していない。`deleteInquiry` / `deleteContract` のテストは順序まで検証しているため一貫性に欠ける。 | `findIdx < deleteIdx` の assertion を追加する（`deleteInquiry` / `deleteContract` のテストと同パターン）。 | yes |
| 3 | low | maintainability | `src/app/(dashboard)/deals/[id]/page.tsx:13,19` | `DealEditForm`（line 13）と `Contract` 型（line 19）がインポートされているが JSX 内で使用されていない。lint が warning を報告している。本 PR 以前からの残置の可能性が高い。 | 未使用インポートを削除する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.2

## Summary

実装の品質は全体的に高い。削除 usecase 3件・deleteById 3件・deleteAllByDeal・Server Action 3件・削除ボタン UI・商談編集ページ・案件フォームへの担当者フィールド追加と、変更規模に対して設計通りの実装が揃っている。

**承認の根拠**:
- テナント分離（`organizationId` 条件）が全 deleteById に正しく実装されている
- admin / manager ガードが 3 つの Server Action で一貫している
- `deleteDeal` のトランザクション内実行順序（dealContacts 削除 → 引き合いステータス復帰 → deal 削除 → 監査ログ）が設計通り
- `dealContactRepository.deleteAllByDeal` が deals.organizationId を経由した正しいテナント検証パターンを使用している
- 静的テストで organizationId 条件・依存チェック順序・権限ガード・監査ログ記録がカバーされている
- build / typecheck / test / lint がすべて passed（lint は pre-existing の warning のみ、エラー 0）

**要対処（Finding #1）**: `deleteDeal` の `updateStatus` 戻り値未検査はデータ整合性リスク。極めて狭い競合ウィンドウとはいえ、設計書の「トランザクション内で全操作が原子的」という保証と矛盾するため修正を推奨する。

**要対処（Finding #2）**: `deleteDeal` の静的テストに順序検証を追加して他の削除 usecase テストと一貫させる。

これらは correctness / testing の軽微な課題であり、高 severity の問題はないため verdict は `approved`。
