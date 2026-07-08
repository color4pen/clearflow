# Domain Invariants Review — mcp-tools-admin — iteration 002

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip
- Severity values: critical | high | medium | low | info
-->

- **verdict**: approved
- **iteration**: 002

## Reviewer Purpose

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

## Invariants Under Review

| Invariant | Definition |
|-----------|-----------|
| `[[inv-all-tenant-scoped]]` | 全データアクセスは authInfo.extra の organizationId でスコープされなければならない。ツール引数から organizationId を受け取ってはならない |
| `[[inv-audit-log-append-only]]` | 監査ログは追記のみ。読み取りツールが書き込み経路を公開してはならない |
| 承認ワークフロー不変条件 | 承認フロー（申請・承認・委任）のエンティティに MCP ツールが直接変更を加えてはならない |

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | tenant-isolation / testing | src/__tests__/mcp/mcpWebhooks.dynamic.test.ts | `[[inv-all-tenant-scoped]]` の実行検証が webhooks の write 操作に欠落している。`list` と tenant isolation（org-1/org-2 で list を呼び分ける）はテスト済みだが、`delete`・`toggle`・`retry_delivery` では repository に渡る `organizationId` が authInfo から正しく取得されていることを assert するテストがない。実装コードは全 case で `organizationId`（authInfo 由来）を repository に渡しており正しいが、動的回帰テストが欠落しているため、将来の変更で deleteById などが org スコープ外になっても検出できない。 | `delete`・`toggle` 操作について、org-1 の admin で呼んだとき `deleteByIdCalls[0].organizationId === ORG_1`、`updateIsActiveCalls[0].organizationId === ORG_1` であることを assert するテストを追加する。`retry_delivery` については `deliveryFindByIdCalls[0].organizationId === ORG_1` を assert するか、org-2 の admin では org-1 の deliveryId が取得不能（findById が null を返す）であることを検証する。 | yes |
| 2 | low | audit-integrity / testing | src/__tests__/mcp/mcpWebhooks.dynamic.test.ts | `[[inv-audit-log-append-only]]` の確認事項ではないが、member ロールでの webhooks 操作（`delete`・`toggle`・`list_deliveries`・`retry_delivery`）の拒否テストが不足している。認可チェックは switch 外の共通パスにあり実装は正しいが、全 operation を通じた拒否が動的に検証されていない。これは code-review-feedback-001 Finding #1 で指摘済みだが未対処のまま。 | member ロールで `delete`・`toggle`・`list_deliveries`・`retry_delivery` を呼び `isError: true` になることを各 1 ケース追加し、対応する repository コールが 0 件であることも assert する。 | yes |
| 3 | info | audit-integrity / design | src/app/api/mcp/tools/webhooks.ts | `[[inv-audit-log-append-only]]` の範囲外だが、webhook 管理操作（create / delete / toggle）は監査ログに記録されない。設計 D-spec（spec.md「全管理系ツールの書き込み操作は監査ログに記録される」要件）でも「Server Actions と同一挙動」として明示的に受け入れられており、新規リグレッションではない。ただし MCP という自動化可能な新規操作面の追加により、admin PAT を使った外部 URL 追加・削除操作が証跡なしで行える状態になる。 | 現スコープでの修正は不要。将来のセキュリティ強化 backlog として「webhook 管理操作の監査ログ記録」を検討する（spec-review Finding #2 でも同様に指摘済み）。 | no |

## Invariant-by-Invariant Verdict

### [[inv-all-tenant-scoped]]

**実装**: 4 ツールすべてで `organizationId` は `authInfo.extra` からのみ取得し、ツール引数には含まれない。各 repository 呼び出しおよび usecase 呼び出しに `organizationId` が渡されている。

- `organization.get`: `findById(organizationId, organizationId)` ✅
- `organization.update`: `updateOrganization({ organizationId, ... })` ✅
- `users.list/create/update_role/deactivate/reactivate`: 全 usecase に `organizationId` を渡す ✅
- `webhooks.list`: `findByOrganization(organizationId)` ✅
- `webhooks.create`: `create({ organizationId, ... })` ✅
- `webhooks.delete`: `deleteById(args.endpointId, organizationId)` ✅
- `webhooks.toggle`: `updateIsActive(args.endpointId, organizationId, ...)` ✅
- `webhooks.list_deliveries`: `findByEndpointId(endpointId, organizationId, ...)` ✅
- `webhooks.retry_delivery`: 配信とエンドポイント両方の `findById` に `organizationId` を渡す ✅
- `audit_logs.search`: `listAuditLogs({ organizationId, ... })` ✅

**テスト**: `mcpUsers`・`mcpOrganization`・`mcpAuditLogs` は org-1/org-2 の切り替えで organizationId 伝播を実行検証している。`mcpWebhooks` は `list` のみ（Finding #1）。

**判定**: 実装は不変条件を維持している。テスト網羅の低所見あり。

### [[inv-audit-log-append-only]]

**実装**: `audit_logs` ツールは `search` 操作のみを discriminatedUnion で定義しており、write 操作は schema レベルで存在しない。`listAuditLogs` usecase は読み取り専用であり、MCP ツールから監査ログへの書き込み・削除経路は存在しない。

**判定**: 不変条件を完全に維持している。

### 承認ワークフロー不変条件

**実装**: 追加された 4 ツール（organization / users / webhooks / audit_logs）は承認フローエンティティ（ApprovalRequest / ApprovalPolicy / ApprovalTemplate / Delegation）を直接操作しない。

- `deactivateUser`・`updateUserRole` が既存の承認フローに影響するのは Server Actions と同一の範囲（approver が無効化された場合の処理はドメインロジック側の問題であり、MCP ツールの追加による新規リグレッションではない）。

**判定**: 承認ワークフロー不変条件は破壊されていない。

## Summary

**実装品質（不変条件の観点）**: 高い。

4 ツールすべてにおいて `[[inv-all-tenant-scoped]]` の中核要件（organizationId をツール引数から受け取らず、authInfo.extra から取得する）が一貫して守られている。`[[inv-audit-log-append-only]]` は audit_logs ツールの schema 設計レベルで保証されており、書き込み経路は存在しない。承認ワークフローへの直接変更も確認されなかった。

**テスト面の残課題**: webhook write 操作（delete / toggle / retry_delivery）に対するテナント分離の実行検証（Finding #1）と member ロール拒否の網羅確認（Finding #2）が不足している。いずれも low 所見であり、実装自体のバグではない。code-review-feedback-001 で Finding #1 が既に指摘されていたが、未対処のまま iter 2 に持ち越されている点を記録する。

不変条件の破壊は確認されなかったため **approved** とする。
