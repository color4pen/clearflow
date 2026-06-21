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
| 1 | HIGH | Correctness | spec.md | "案件化済み引き合いへの案件重複作成" シナリオが内部矛盾している。When に「createDeal を呼び出す（1件目）」と書かれているのに Then は2件目の重複エラーを記述している。さらに Then に登場するエラーメッセージ `"この引き合いにはすでに案件が存在します"` はどのタスク（T-01〜T-14）にも存在せず、実装者が新規ビヘイビアと誤解するリスクがある。 | シナリオを修正する: タイトルを「2回目の案件作成試行」に変更し、When を「同じ converted 引き合いに対して `createDeal` を2回目に呼び出す」に直す。Then では `"案件化済みの引き合いにのみ案件を作成できます"` 以外の重複エラーを期待するなら T-05 にその実装を追加する。期待しないなら `"この引き合いにはすでに案件が存在します"` の記述を削除し、Then を `"案件化済みの引き合いにのみ案件を作成できます"` に揃える。 |
| 2 | MEDIUM | Correctness | tasks.md (T-10) | `meetingRepository.findAllByInquiryOrDeal(deal.inquiryId, organizationId)` を null チェックなしで呼び出している。`deal.inquiryId` が null になりうるか（deal の schema で NOT NULL か nullable か）がタスク・設計書のどこにも明記されていない。null の場合、型エラーまたはクエリ不正になる。 | `deals.inquiryId` が NOT NULL であることを T-01 の acceptance criteria に明記するか、T-10 に「`deal.inquiryId` が null の場合は `findAllByDeal(deal.id, organizationId)` にフォールバックする」を追記する。 |
| 3 | MEDIUM | Architecture | tasks.md (T-12) | 顧客詳細の案件一覧取得方法が「inquiryRepository → 各 inquiryId に dealRepository を呼ぶ Promise.all」と「dealRepository.findByClientId を追加」の二択として記述されており、実装者が選択する形になっている。タスクで実装アプローチが未定義だと実装品質がばらつく。 | いずれか一方に確定して記述する。N+1 が現データ規模で許容できるなら Promise.all を明記し「または」を削除する。パフォーマンスを優先するなら `dealRepository.findByClientId(clientId, organizationId)` の追加を T-04 に項目追記し T-12 からは「または」節を削除する。 |
| 4 | LOW | Completeness | spec.md | `deal_contacts` の CRUD（担当者の案件への紐づけ追加・一覧取得・削除）に対応する Requirements / Scenario が spec.md に存在しない。T-04・T-13・T-14 で実装・シード・テストが定義されているが、形式仕様がない。 | spec.md に「案件ごとの担当者と役割を管理できる」Requirement と、create / findByDeal / delete の代表 Scenario を追加する。 |
| 5 | LOW | Correctness | tasks.md (T-07) | T-07 のタスク本文に「`deals/page.tsx` の `allPhases` 配列で `internal_approval` を `estimate_approval` に変更する」が含まれているが、T-07 の Acceptance Criteria にこの変更の検証項目がない。 | T-07 の AC に「`deals/page.tsx` の `allPhases` 配列に `estimate_approval` が含まれ `internal_approval` が含まれない」を追加する。 |
