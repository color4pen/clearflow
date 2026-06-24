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
| 1 | MEDIUM | spec-consistency | design.md / tasks.md T-03 | ORDER BY 方向の矛盾が残存。design.md の Risks セクションは「ポリシーの作成順（`createdAt` 降順）で先頭を採用」と記述し、tasks.md T-03 は「ORDER BY created_at ASC で決定的な順序を保証」と逆順を指定している。複数ポリシーが合致した場合にどちらのポリシーが選択されるか、仕様が矛盾している。ORDER BY 責務を repository 層に配置する修正（T-03 の括弧書き）は前回レビューから適切に追加されており、その点は解消済み。 | design.md の Risks セクションの「`createdAt` 降順」を `createdAt` 昇順（ASC）に統一するか、T-03 の ORDER BY を DESC に変更するかのいずれかで一本化する。どちらを採用するかはビジネス判断（最新ポリシー優先 vs 最古ポリシー優先）のため、仕様担当者が決定して両ファイルを同一方向に修正すること。 |
| 2 | MEDIUM | spec-consistency | tasks.md / T-05 | T-05 の監査ログ metadata に `templateId` が欠落している。T-05 のコメントは「existsPendingByTemplateId がテンプレート利用中を検出するために必要」と記述しているが、指定の metadata は `{ originType: "system", policyId: policy.id }` のみ。一方、`requestRepository.ts` の `existsPendingByTemplateId` は `auditLogs.metadata->>'templateId' = ${templateId}` でクエリするため、templateId フィールドが含まれない監査ログでは system 起因リクエストのテンプレート利用中検出が機能しない。結果として `existsPendingByTemplateId` が false を誤返却し、進行中の承認リクエストがあるテンプレートの無効化・削除を防げなくなる可能性がある。 | T-05 の audit log metadata に `templateId: template.id` を追加し、`{ originType: "system", policyId: policy.id, templateId: template.id }` とする。これにより `existsPendingByTemplateId` が system 起因リクエストを正しく検出できるようになる。 |
| 3 | LOW | spec-consistency | request.md | 要件2の `evaluatePolicies` シグネチャに `tx?` が含まれているが（`evaluatePolicies(organizationId, triggerAction, context, tx?)`）、tasks.md T-03 の型シグネチャでは `tx?` が省略されており仕様間で不整合がある（前回レビュー #3 から未修正）。 | request.md 要件2の `tx?` を削除し、tasks.md T-03 の `evaluatePolicies(organizationId: string, triggerAction: string, context: Record<string, unknown>): Promise<ApprovalPolicy[]>` と統一する。 |

## セキュリティレビュー結果

全体的にセキュリティ上の重大な問題は検出されなかった。以下は確認済み項目と所見。

| 観点 | 確認結果 |
|------|---------|
| テナント分離 | `evaluatePolicies` は `organizationId` を第1引数で受け取り `findActiveByTriggerAction` に渡す。T-04b の `findByOriginTriggerEntity` も `organizationId` を含む WHERE 句で検索する。`approvalTemplateRepository.findById(policy.templateId, organizationId)` も組織スコープ付き。問題なし。 |
| `skipPolicyCheck` の悪用リスク | `skipPolicyCheck` は `updateInquiryStatus` のオプション引数。Server Action (T-09) からは明示的に渡していないため、エンドユーザーからは設定不可。ただし TypeScript レベルの型制約のみに依存しており、将来の開発者が誤って Server Action から渡すリスクは低いが存在する（LOW レベル）。本 PR では許容範囲と判断。 |
| conditionEvaluator のインジェクション | `value` は DB の `conditionValue` カラムから取得（ポリシー作成時に設定済み）。評価は文字列比較のみで SQL 生成を行わないため、インジェクションリスクはない。 |
| `in` 演算子のスペース処理 | T-02 はカンマ区切り分割のみ定義し、トリム処理を明記していない。`"web, phone"` のように末尾スペースが含まれる conditionValue では比較が失敗する可能性があるが、conditionValue は管理者が設定する値であり UI 層でのバリデーションが想定される。実装上の注意事項として許容範囲。 |
| 並行性・重複リクエスト | T-05 の `findByOriginTriggerEntity` による重複チェックは CHECK-THEN-ACT パターンであり、同一引合に対する同時リクエストで競合状態が発生しうる。結果として pending system リクエストが重複する可能性がある（MEDIUM リスク）。現実的な発生頻度は低く、発生しても手動対応で回復可能なため許容範囲として設計側で認識されていることを確認した。DB 一意制約（将来の改善候補）での根本解決が望ましい。 |

## 前回レビュー（spec-review-result-002）との対応

| 前回 # | 前回 Severity | 対応状況 |
|--------|--------------|---------|
| 1 | HIGH | ✅ 解消: T-04b が追加され `requestRepository.findByOriginTriggerEntity` の実装タスクが明記された |
| 2 | MEDIUM | ⚠️ 部分的: ORDER BY 責務の配置（repository 層）は解消。方向の矛盾（design.md: DESC vs tasks.md: ASC）は本レビュー #1 として継続 |
| 3 | LOW | ❌ 未修正: request.md の `tx?` 不整合が残存。本レビュー #3 として継続 |
