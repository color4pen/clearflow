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
| 1 | HIGH | Correctness | spec.md | "案件化済み引き合いへの案件重複作成" シナリオが依然として論理矛盾している。Given は「すでに案件が存在する **converted** 引き合い」であり、When は「createDeal を2回目に呼び出す」。しかし Then に記されたエラー `"案件化済みの引き合いにのみ案件を作成できます"` は「引き合いが converted でない場合」に発火するガードであり、converted な引き合いはこのチェックを通過する。T-05 はエラー文言の「商談化」→「案件化」という字句修正のみを定義しており、重複案件作成を防ぐロジック追加はどのタスクにも存在しない。結果として、spec.md のシナリオは実装されない振る舞いを期待している。 | 選択肢A（シナリオ修正）: Given を「converted でない引き合い」に変更し、当該エラーが本来カバーするケースに合わせる。When を「converted でない引き合いに createDeal を呼び出す」に直す。選択肢B（実装追加）: converted 引き合いへの重複案件作成を防ぐビジネスルール（`deal` が既に存在する場合のチェック）を T-05 に追加し、That チェック専用のエラーメッセージを定義する。どちらを採用するかを確定し、spec.md と tasks.md を一致させる。 |
| 2 | MEDIUM | Completeness | tasks.md (T-12) | T-12 は `dealRepository.findByInquiryId` を用いて案件を取得する設計であり、かつ「（新規リポジトリメソッドは追加しない）」と制約している。しかし現状コードの前提（request.md 記載の 14 リポジトリ概要）に `findByInquiryId` の存在を示す記述がなく、顧客詳細ページの「案件一覧セクション」は新機能（要件 32）であるため、このメソッドは現時点では存在しない可能性が高い。メソッドが存在しない場合、T-12 は実装不可となる。 | `dealRepository.findByInquiryId` が現行コードに既存か否かを確認する。既存であれば T-12 に「既存メソッドを使用する」と注記する。存在しない場合は、T-04 に `dealRepository.findByInquiryId(inquiryId, organizationId)` の追加を項目として追記し、T-12 の制約文言を削除または修正する。 |
| 3 | LOW | Correctness | tasks.md (T-04 / T-10) | `findAllByInquiryOrDeal(inquiryId, organizationId)` のクエリ条件は `meetings.dealId IN (SELECT id FROM deals WHERE inquiryId = ?)` であり、同一引き合いから複数案件が派生した場合（ドメイン上明示的に禁止されていない）、対象案件以外の兄弟案件に紐づく商談も返す。T-10 は案件詳細の「商談履歴」セクションでこのメソッドを呼び出しており、意図しない兄弟案件の商談が混入するリスクがある。 | 一引き合い一案件が業務上の前提であれば、その制約を `createDeal` の仕様に明記して本所見をクローズする。複数案件を許容するなら、`findAllByInquiryOrDeal(inquiryId, dealId, organizationId)` とシグネチャを変更し、`meetings.inquiryId = inquiryId OR meetings.dealId = dealId` に絞り込む。 |

## Previous Review Resolution

前回レビュー（spec-review-result-001.md）5件の解消状況:

- Finding #1（HIGH: シナリオ矛盾）: **未解消** — 字句は修正されたが論理矛盾が残存（本レビュー Finding #1 として継続）
- Finding #2（MEDIUM: T-10 の null チェック欠落）: **解消済み** — T-10 に `deal.inquiryId が null の場合は findAllByDeal にフォールバック` が追記された
- Finding #3（MEDIUM: T-12 の実装方針が二択）: **解消済み** — 単一アプローチに確定し `（新規リポジトリメソッドは追加しない）` と明記された
- Finding #4（LOW: deal_contacts CRUD の仕様欠落）: **解消済み** — spec.md に「案件ごとの担当者と役割を管理できる」Requirement と Scenario が追加された
- Finding #5（LOW: T-07 AC に allPhases 検証がない）: **解消済み** — T-07 AC に `estimate_approval` / `internal_approval` の確認項目が追加された
