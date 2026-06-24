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
| 1 | MEDIUM | defensive-coding | `src/application/usecases/evaluatePolicies.ts:27-29` | `conditionField` が非 null の場合に `policy.conditionOperator!` と `policy.conditionValue!` を非 null アサーションで使用している。「conditionField が非 null なら conditionOperator / conditionValue も非 null」という DB 不変条件を型レベルで保証していない。マイグレーションバグや手動 DB 編集で片方のみ null になった場合、`evaluateCondition` の `operator` に null が渡り実行時例外が発生しうる。 | `evaluateCondition` 呼び出し前に防御的チェックを追加する: `if (policy.conditionOperator === null \|\| policy.conditionValue === null) return false;` これにより不正データに対して安全に false を返せ、型の暗黙的仮定が明示化される。 | yes |
| 2 | MEDIUM | testing | `src/__tests__/usecases/approvalPolicyFlow.test.ts` | TC-023〜TC-033 の must 統合テストケースの大半がソースコードの文字列マッチング（静的解析）のみで確認されており、実際のランタイム動作を検証していない。ポリシー合致時に Deal が生成されないこと、skipPolicyCheck=true でポリシー評価がスキップされること、ApprovalCompleted イベントが実際に dispatch されることは動的テストで確認されていない。conditionEvaluator（pure function）は 167 行の動的ユニットテストで網羅されているが、フロー全体の結合確認が弱い。 | スパイ/モックを使ったランタイム検証テストを補完的に追加することを推奨する。特に「ポリシー合致時に dealRepository.create が呼ばれないこと」と「skipPolicyCheck=true 時に evaluatePolicies が呼ばれないこと」の2ケースは回帰検出の価値が高い。現状 DB モッキング基盤が未整備であればスコープ外として許容し、テスト環境整備時に対処すること。 | no |
| 3 | LOW | documentation | `specrunner/changes/approval-policy-logic/design.md:89` | Risks セクションに「ポリシーの作成順（`createdAt` 降順）で先頭を採用」と記述されているが、実装（`approvalPolicyRepository.findActiveByTriggerAction`）は `asc(approvalPolicies.createdAt)`（昇順）を使用しており、tasks.md T-03 の「ORDER BY created_at ASC」とも整合している。design.md の記述が実装事実と逆方向になっており将来の読者が混乱する可能性がある（spec-review-result-003 #1 の残存問題）。 | design.md Risks セクションの「`createdAt` 降順」を「`createdAt` 昇順（ASC）」に修正し、「最も古いポリシーを先頭として採用」と明記する。 | yes |
| 4 | LOW | testing | `src/__tests__/usecases/approvalPolicyFlow.test.ts` | TC-033（skipPolicyCheck による無限ループ防止）が動的テストでカバーされていない。静的解析でハンドラに `skipPolicyCheck: true` が渡ることは確認できるが、将来の変更でフラグが除去された場合に回帰を検出できない。 | `handleApprovalCompleted` の呼び出し引数に `skipPolicyCheck: true` が含まれることをスパイで確認するテストを追加する。DB 不要で実装できるため低コスト。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 6 | 0.10 |

- **total**: 8.40

## Summary

全受け入れ基準を充足しており、`typecheck && test`（849 pass / 0 fail）・build・lint すべて通過。CRITICAL / HIGH の阻害所見はなく、verdict は **approved**。

**実装品質の評価**

- `conditionEvaluator.ts` は pure function として domain 層に正しく分離されており、7 演算子・エッジケース（null/undefined・型不一致・in の空文字列）を網羅した動的ユニットテストが付属している。
- `updateInquiryStatus.ts` のポリシーゲートフローは D2 / D4 / D6 / D7 の設計判断を忠実に実装。重複防止チェックがポリシー評価前に先行実行され、テンプレート不在時のフォールバックも正しく機能する。
- `approveRequest.ts` は single-approve と multi-step の両フローで `originType === "system"` チェックを適用しており、manual フローへの影響がない。
- `approvalCompletedHandler.ts` は `originTriggerEntityId === null` のガード・エラーログ・安全な早期リターンを備えており堅牢。
- ハンドラ登録（handlers/index.ts）で Webhook ハンドラと `handleApprovalCompleted` が `approval.completed` に対して独立登録されており、非同期二重実行の設計が正しい。

**要修正所見**（code-fixer 対象）

- Finding #1: `evaluatePolicies.ts` の非 null アサーション → 防御的 null チェックに置換（1 行追加）。
- Finding #3: `design.md` Risks セクションの DESC/ASC 誤記修正（ドキュメントのみ）。

