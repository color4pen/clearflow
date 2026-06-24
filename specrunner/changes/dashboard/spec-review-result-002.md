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

## Previous Review Resolution

spec-review-result-001.md で報告された 5 件の findings がすべて解消されていることを確認した。

| # | 前回の Finding | 解消確認 |
|---|----------------|----------|
| 1 | HIGH: T-01 の `issueDateTo` が `lte` を使用（境界が exclusive と矛盾） | tasks.md T-01 が `lt(invoices.issueDate, to)` に修正済み ✓ |
| 2 | HIGH: `DashboardActionItem.action_item` の `dealTitle` がデータソースに存在しない | T-03 の `Promise.all` に `listDeals` が追加され、Map 経由で解決する設計に修正済み ✓ |
| 3 | MEDIUM: `page.tsx` が `auditLogRepository` をリポジトリ層に直接呼び出すアーキテクチャ違反 | T-05 で `getRecentActivities` ユースケースを新設し、ページはユースケース経由で呼ぶ設計に修正済み ✓ |
| 4 | MEDIUM: spec.md の境界日付値が T-01/T-06 の exclusive 境界規約と不整合 | spec.md のシナリオが `paidAtTo: 2026-07-01T00:00:00Z`、`issueDateTo: 2026-08-01T00:00:00Z` に修正済み ✓ |
| 5 | LOW: T-01 の `paidAtTo` 説明が `lte` と `lt` で自己矛盾 | T-01 が `lt(invoices.paidAt, to)` の一文に整理済み ✓ |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Spec inconsistency | tasks.md T-01, T-06 | `findAllByOrganization` は常に `asc(invoices.dueDate)` でソートするが、T-06 の「請求予定セクション」は `issueDate` 順での表示を要求する。実際のコードベースでは `Invoice.dueDate` は非 nullable（必須）、`Invoice.issueDate` は nullable で、契約ごとに異なる支払いサイト（net-30 / net-60 等）を持つ場合、`dueDate` 順と `issueDate` 順は一致しない。T-06 は `issueDateFrom`/`issueDateTo` フィルタで null 以外の `issueDate` を保証するが、ソート順をどこで担保するかが spec に記述されていない。 | T-06 の請求予定セクションの実装に「リポジトリから取得後、`issueDate` 昇順でクライアント側（コンポーネント内）または usecase 内で再ソートする」という手順を明記する。または T-01 の `findAllByOrganization` に `orderBy` オプションを追加してクエリ側で解決する設計を明記する。 |
| 2 | LOW | Test coverage | tasks.md T-08 | `getRecentActivities` ユースケース（T-05 新設）に対応するユニットテストが T-08 に含まれていない。他の新設ユースケース（`getDashboardActions`, `getPipelineSummary`, `listInvoicesByOrganization`）は全てテスト対象に挙げられており、`getRecentActivities` だけが漏れている。 | T-08 に `getRecentActivities.test.ts` を追加する。最低限「`auditLogRepository.findByOrganization` に `{ limit: 20 }` を渡して結果を返すこと」のテストケースを記載する。 |

## Security Assessment

セキュリティ観点での新規指摘事項なし（前回レビューから変更なし）。

- **認証**: `page.tsx` が `auth()` でセッションを確認し、未認証は `/login` へリダイレクト。`(dashboard)/layout.tsx` との多層防御も維持。
- **テナント分離**: 全データ取得（`getDashboardActions`, `getPipelineSummary`, `listInvoicesByOrganization`, `getRecentActivities`）が `session.user.organizationId` を起点として `eq(organizationId)` を必須条件とする。T-01 に明記のテナント分離受け入れ基準も変わらず有効。
- **ロールベースアクセス制御**: finance ダッシュボードと停滞案件セクションの表示判定は Server Component の `session.user.role` で実施。クライアント操作による bypass 不可。admin ロールも停滞案件を閲覧可能である点は仕様と一致。
- **入力検証**: ダッシュボードへの外部ユーザー入力なし。全クエリパラメータはセッション由来。Drizzle ORM のパラメータ化クエリで SQL インジェクション対策済み。
- **OWASP Top 10 (A01〜A10)**: 新たに露出するエンドポイントや権限昇格経路なし。XSS は React JSX エスケープで防護済み。監査ログの `targetType` 不明値を `null`（リンクなし）として扱う設計により、意図しないリダイレクト (A10) も排除されている。

## Codebase Verification

- `Invoice`（`src/domain/models/invoice.ts`）: `dueDate: Date`（非 nullable）、`issueDate: Date | null`（nullable）を確認。`scheduled` 請求でも `dueDate` は必須だが `issueDate` は任意。Finding #1 の根拠となる型差異を確認。
- `invoiceRepository`（`src/infrastructure/repositories/invoiceRepository.ts`）: `findAllByOrganization` は未実装（`findAllByContract` のみ）。`mapRow` 関数は再利用可能な形で定義済み。T-01 の前提と一致。
- `ActionItem`（`src/domain/models/meeting.ts`）: `dueDate: string | null` であることを確認。T-03 の型定義と一致。`Meeting` に `dealId` は存在するが `dealTitle` は持たない。T-03 が `listDeals` で解決する設計は型整合性を満たす。
- `auditLogRepository.findByOrganization`（`src/infrastructure/repositories/auditLogRepository.ts`）: `{ limit?: number }` オプション対応済みを確認。`desc(createdAt)` ソートで最新件から返される。T-05 の `{ limit: 20 }` 呼び出しと整合する。
