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
| 1 | HIGH | functional | tasks.md / T-05 | T-05 の重複防止チェックで `requestRepository.findByOriginTriggerEntity(organizationId, "inquiry.convert", inquiryId)` を呼び出すと記述されているが、このメソッドは `requestRepository.ts` に存在しない。追加するタスクも存在しない。メソッド未実装のままでは T-05 のコンパイルが通らず、並行性による重複 pending system リクエスト生成の防止が実装できない。 | T-05 のチェックリストに `requestRepository.ts` への `findByOriginTriggerEntity(organizationId: string, triggerAction: string, entityId: string): Promise<Request \| null>` 追加（WHERE originTriggerAction = triggerAction AND originTriggerEntityId = entityId AND status = "pending" AND organizationId = organizationId, LIMIT 1）を明記する。または独立したタスク T-xx として切り出す。 |
| 2 | MEDIUM | spec-consistency | design.md / tasks.md T-01, T-03 | design.md の Risks セクションは「ポリシーの作成順（`createdAt` 降順）で先頭を採用」と記述するが、tasks.md T-03 は「ORDER BY created_at ASC で決定的な順序を保証」と逆順を指定しており、どのポリシーが選択されるか仕様間で矛盾している。加えて、ORDER BY の追加は `findActiveByTriggerAction` のリポジトリ実装の変更（T-01 スコープ）として記述すべきだが、T-01 のチェックリストに記載がなく、usecase 層（T-03）がリポジトリ内部の ORDER を制御することはできない。 | (a) design.md と tasks.md の順序方向を統一する（ビジネス判断: 最新ポリシー優先なら DESC、最古優先なら ASC）。(b) `findActiveByTriggerAction` に `.orderBy(createdAt <ASC/DESC>)` を追加する旨を T-01 のチェックリストに明記し、T-03 からその記述を削除する。 |
| 3 | LOW | spec-consistency | request.md | request.md 要件2の `evaluatePolicies` シグネチャに `tx?` が含まれているが、tasks.md T-03 の型シグネチャでは省略されており、仕様間で不整合がある（前回レビュー #4 から未修正）。 | request.md 要件2の `evaluatePolicies(organizationId, triggerAction, context, tx?)` から `tx?` を削除し、tasks.md T-03 と統一する。 |

## 前回レビュー（spec-review-result-001）との対応

| 前回 # | 前回 Severity | 対応状況 |
|--------|--------------|---------|
| 1 | HIGH | ✅ 解消: T-05 に `auditLogRepository.create`（action: "request.create"）の明示が追加された |
| 2 | HIGH | ⚠️ 部分的: T-03 に ORDER BY の記述が追加されたが、direction の矛盾（design.md: DESC vs tasks.md: ASC）と実装責務の誤配置（usecase が repository の ORDER を制御できない）が残存。本レビュー #2 に継続 |
| 3 | MEDIUM | ⚠️ 部分的: T-05 に重複防止チェックが追加されたが、参照する `findByOriginTriggerEntity` メソッドが存在しない。本レビュー #1 に継続（HIGH に昇格）|
| 4 | LOW | ❌ 未修正: request.md の `tx?` 不整合が残存。本レビュー #3 に継続 |
