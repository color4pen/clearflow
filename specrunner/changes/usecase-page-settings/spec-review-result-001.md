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
| 1 | LOW | Consistency | tasks.md > T-01 | `listAuditLogs` の `data` 引数でフィルタを `filters?: { ... }` というネストオブジェクトにしている。T-02〜T-04 の他の新設 usecase は同じ `data` 内にフラットなプロパティを持つ設計で若干不統一。ただしリポジトリの第2引数が options オブジェクトである事情を反映した意図的な選択であり、動作上の問題はない。 | 実装時に `filters` キーを使うか `data` へフラット展開するかを統一したい場合は任意で変更可。現仕様のまま実装しても問題なし。 |
| 2 | LOW | Scope note | design.md > Goals/Non-Goals | `src/app/actions/policies.ts` の `listPoliciesAction` が `approvalPolicyRepository.findByOrganization` を直接呼んでいる（action → repository の層分離違反）。design.md はこれをスコープ外と明示しており判断は妥当。将来の移行時に `listApprovalPolicies` usecase の新設が必要になる点を記録として残す。 | 今回は対応不要。後続 request（F01a 相当）で対処。 |

## Security Review

本 request は純粋なリファクタリングであり、新しい入力経路・権限チェック・データ公開面は一切生まれない。以下の点を確認済み。

- **認証**: 全対象 page.tsx は既存の `auth()` → role/permission チェックを維持する。新設 usecase は呼び出し元が担う認証の下に置かれる設計で、既存パターン（`listDelegations` 等）と一致している。
- **マルチテナント分離 (IDOR)**: `getApprovalPolicy` / `getApprovalTemplate` はいずれも `organizationId` を必須引数として持ち、repository 側でテナントスコープを強制する。`organizationId` は常に `session.user.organizationId` から取得されており、ユーザー制御の入力は介在しない。
- **入力バリデーション**: audit-logs のクエリパラメータ（`startDate`, `endDate` 等）は page.tsx 側で既にサニタイズされており、usecase への引き渡し前に型変換・undefined 処理が済んでいる。新設 usecase に追加のバリデーション面はない。
- **OWASP Top 10**: 注入・アクセス制御・セキュリティ設定ミス等の観点で新規リスクは確認されない。

## Codebase Cross-check

実コードと仕様の整合性を確認した結果:

| 確認項目 | 結果 |
|---|---|
| `grep @/infrastructure/repositories src/app/(dashboard)/settings/` の対象ファイル | 5件（audit-logs/page.tsx, policies/page.tsx, policies/new/page.tsx, policies/[id]/edit/page.tsx, templates/[id]/edit/page.tsx）— design.md の表と完全一致 |
| `webhooks/page.tsx` に repository 直接 import なし | ✓ `listWebhookEndpointsAction` 経由のみ（D4 の根拠を実コードで確認） |
| `templates/page.tsx` に repository 直接 import なし | ✓ `listTemplatesAction` 経由のみ（対象外の判断は正しい） |
| `auditLogRepository.findByOrganization` の引数型 | tasks.md T-01 の filters 型定義と一致 |
| `approvalTemplateRepository.findById` の引数型 | tasks.md T-03 と一致（`id, organizationId`） |
| `approvalPolicyRepository.findById` の引数型 | tasks.md T-04 と一致（`id, organizationId`） |
| `index.ts` に新設 usecase の再エクスポートが未追加 | ✓ 未追加（実装タスクで追加する前提） |
