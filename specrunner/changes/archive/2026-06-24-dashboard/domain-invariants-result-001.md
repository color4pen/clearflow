# Domain-Invariants Review Result — dashboard — iter 1

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    invariants intact, no blocking issues
  - needs-fix:   invariant violation found that must be corrected
  - escalation:  unresolvable conflict or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: tenant data leak, audit bypass, approval state corruption
  - HIGH:     invariant violation with no workaround — blocks approval
  - MEDIUM:   quality degradation, future risk, maintainability concern
  - LOW:      informational, minor improvement
-->

- **verdict**: approved

## Review Scope

**観点**: テナント分離・監査ログの完全性・承認ワークフロー不変条件の維持

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Consistency | `src/infrastructure/repositories/invoiceRepository.ts` | `findAllByOrganization` は他の `findAll*` 系関数（`findAllByContract`, `findById` 等）と異なり `tx?: Transaction` パラメータを受け取らない。現状はダッシュボードの読み取り専用ユースケースでのみ使用されるため問題ないが、将来トランザクション内で呼び出す必要が生じた場合に署名変更が必要になる。 | 差し当たり変更不要。将来トランザクション内で利用する際に `tx?: Transaction` を追加すること。 |

## Tenant Isolation Assessment

全新設クエリのテナント分離を確認した。

| クエリ / 関数 | 分離条件 | 判定 |
|---|---|---|
| `invoiceRepository.findAllByOrganization` | `eq(invoices.organizationId, organizationId)` を `conditions` 配列の先頭に固定し、フィルタの有無に関わらず必ず適用 | ✅ |
| `listInvoicesByOrganization` | `data.organizationId` をリポジトリに委譲。呼び出し元は `session.user.organizationId` 由来 | ✅ |
| `getDashboardActions` | 内部の 4 クエリすべてが `organizationId` を WHERE 条件として使用（`requestRepository.findAllWithStepsByOrganization`, `meetingRepository.findAllByOrganization`, `inquiryRepository.findAllWithClientByOrganization`, `listDeals` → `dealRepository.findAllByOrganization`） | ✅ |
| `getPipelineSummary` | `listDeals(organizationId)` 経由で `eq(deals.organizationId, organizationId)` が適用 | ✅ |
| `getRecentActivities` | `auditLogRepository.findByOrganization(organizationId, { limit: 20 })` が `eq(auditLogs.organizationId, organizationId)` を適用 | ✅ |
| `page.tsx` | `organizationId = session.user.organizationId` をセッションから取得し、全クエリに渡す。クライアントからの入力は介在しない | ✅ |

`requestRepository.findAllWithStepsByOrganization` の JOIN 条件:

```ts
.leftJoin(
  approvalSteps,
  and(
    eq(approvalSteps.requestId, requests.id),
    eq(approvalSteps.organizationId, requests.organizationId)  // JOIN にも orgId 制約
  )
)
.where(eq(requests.organizationId, organizationId))
```

JOIN 条件に `organizationId` を含めることで、UUID 衝突等の異常時でも他テナントのステップが混入しない多層防御が実装されている。✅

## Audit Log Completeness Assessment

ダッシュボードは純粋に読み取り専用の機能であり、データを変更しない。

- 新設の全ユースケース（`getDashboardActions`, `getPipelineSummary`, `getRecentActivities`, `listInvoicesByOrganization`）はデータ書き込みを行わない
- 既存の書き込みパス（承認・却下・ステータス更新等の Server Actions）は本変更の対象外であり、変更されていない
- `getRecentActivities` は `auditLogRepository.findByOrganization(organizationId, { limit: 20 })` により組織スコープの監査ログを正しく読み取る
- ダッシュボード閲覧自体を監査ログに記録しない設計は、既存の読み取り操作（一覧ページ等）と一貫している

**結論**: 監査ログの完全性を損なう変更なし。✅

## Approval Workflow Invariant Assessment

承認ワークフローの不変条件が変更によって破壊されていないことを確認した。

### 検証項目

| 不変条件 | 実装 | 判定 |
|---|---|---|
| ダッシュボードは承認状態を変更しない（読み取り専用） | `getDashboardActions` は SELECT のみ。Server Actions（承認・却下）は変更なし | ✅ |
| `pending` ステータスのリクエストのみ表示される | `if (req.status !== "pending") continue;` により非 pending リクエストを除外 | ✅ |
| ロール一致の pending ステップを持つリクエストのみ表示される | `step.approverRole === userRole && step.status === "pending"` で二重フィルタ | ✅ |
| ステップは対応するリクエストに正しく紐付けられる | `Map<requestId, RequestWithSteps>` によるグルーピングで、他リクエストのステップが混入しない | ✅ |
| finance ロールは営業データを閲覧できない | `if (userRole === "finance") { ... return <FinanceDashboard /> }` がサーバーサイドで分岐。クライアントバイパス不可 | ✅ |
| member ロールは停滞案件リストを閲覧できない | `staleDeals` は `userRole === "manager" \|\| userRole === "admin"` の場合のみ non-null。サーバーサイドで制御 | ✅ |

### 特記事項

- `approverRole` はロール単位のフィルタであり個人指定（`approverId`）ではない。これは要件に明記された設計（現時点では `approverId` 未実装）であり、不変条件の違反ではない
- アクションアイテムを全件表示（assignee フィルタなし）する設計は architect 判断 #2 で承認済み。承認ワークフローとは独立した表示設計であり、ワークフロー不変条件に影響しない

## Summary

全テナント分離条件が正しく実装されている。監査ログの完全性を損なう変更はない。承認ワークフローの不変条件はすべて維持されている。

build / typecheck / test が green（verification-result.md 確認済み）。blocking 所見なし。
