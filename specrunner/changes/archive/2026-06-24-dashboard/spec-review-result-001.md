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
| 1 | HIGH | Spec inconsistency / Bug | tasks.md T-01, T-06 | `issueDateTo` のフィルタ境界が矛盾している。T-01 は「同様に `gte` / `lte` を追加する」と明記するが、T-06 は `issueDateTo` に `nextNextMonthStart`（翌々月初）を渡し「exclusive 境界」と説明する。`lte(issueDate, nextNextMonthStart)` を実装すると翌々月1日が範囲に含まれ、「今月〜翌月末」という要件を超えるデータが返される。 | T-01 の issueDateTo を「同様に `lt` で exclusive にする（paidAt と同じ方式）」と修正し、`lte` の記述を削除する。T-06 との整合を明示する。 |
| 2 | HIGH | Spec gap / Type error | tasks.md T-03 | `DashboardActionItem` の `action_item` 型が `dealTitle: string` を要求するが、T-03 が指定するデータソース（`meetingRepository.findAllByOrganization` が返す `Meeting[]`）には案件タイトルが含まれない。`Meeting` モデルは `dealId` のみ持ち `dealTitle` を持たない。TypeScript が型エラーを起こすためコンパイル不能になる。 | T-03 の `Promise.all` に `listDeals(organizationId)` を追加し、`dealId` で案件タイトルを引き当てる手順を記述する。または `DashboardActionItem.action_item` から `dealTitle` を除去して `dealId` のみに留め、UI 層でタイトルを別途解決する設計を明示する。 |
| 3 | MEDIUM | Architecture violation | tasks.md T-05 | `page.tsx`（Server Component）が `auditLogRepository.findByOrganization(organizationId, { limit: 20 })` をリポジトリ層に直接呼び出している。プロジェクトのアーキテクチャ規約では Pages は UI のみを担当し、データアクセスはユースケース経由が前提。同ページ内の他の呼び出し（`getDashboardActions`, `getPipelineSummary`）はすべてユースケース経由であり、監査ログだけが例外となっている。 | `src/application/usecases/getRecentActivities.ts` を新設して `auditLogRepository.findByOrganization` を委譲し、T-05 からはユースケースを呼ぶよう修正する。T-08 のテスト対象にも追加する。 |
| 4 | MEDIUM | Spec scenario / Clarity | spec.md, tasks.md T-01 T-06 | spec.md の paidAt フィルタシナリオが `paidAtTo: 2026-06-30`（月末の当日）を渡す例を使っているが、T-01・T-06 は「呼び出し側は翌月初 00:00:00 UTC を渡す（exclusive 境界）」という規約を採用している。同様に issueDate シナリオでも `issueDateTo: 2026-07-31` を使っており、T-06 の `nextNextMonthStart` 規約と異なる。テストケース生成ステップがシナリオの値をそのまま使った場合、境界条件の検証が正しく行われない。 | spec.md の両シナリオの `paidAtTo` / `issueDateTo` 値を T-06 の規約（翌月初 / 翌々月初の UTC 値）に揃える。または `paidAtTo` / `issueDateTo` が inclusive か exclusive かを spec.md 内で明記する。 |
| 5 | LOW | Clarity | tasks.md T-01 | paidAtTo の説明が自己矛盾している。同一箇条書き内で「`lte(invoices.paidAt, to)` を追加する」と述べた直後に「`lte` ではなく `lt` で」と訂正しており、読み手を混乱させる。 | 冒頭の `lte` 記述を削除し、「`lt(invoices.paidAt, to)` を追加する（呼び出し側が翌月初 00:00:00 UTC を渡す前提で exclusive 境界とする）」と一文で書き直す。 |

## Security Assessment

セキュリティ観点でのレビュー結果（問題なし）。

- **認証**: `page.tsx` が `auth()` でセッションを確認し、未認証の場合 `/login` にリダイレクトする。`(dashboard)/layout.tsx` でも同様の確認が行われており多層防御として妥当。
- **テナント分離**: 全データ取得（`getDashboardActions`, `getPipelineSummary`, `listInvoicesByOrganization`, 監査ログ）が `session.user.organizationId` を起点とし、各クエリで `eq(organizationId)` を必須条件としている。新設の `findAllByOrganization` も T-01 でテナント分離を必須と明記。
- **ロールベースアクセス制御**: finance ダッシュボードと停滞案件セクションの表示判定は Server Component 側で `session.user.role` を読み取り実施。クライアント操作による bypass 不可。
- **入力検証**: ダッシュボードへの外部ユーザー入力はない。全クエリパラメータはセッション由来であり、Drizzle ORM のパラメータ化クエリで安全に処理される。
- **OWASP Top 10 (A01〜A10)**: 新たに露出するエンドポイントや権限昇格経路は見当たらない。XSS は React JSX エスケープで防護済み。

## Codebase Verification

実際のソースコードを確認した事実を以下に記載する。

- `Meeting` モデル（`src/domain/models/meeting.ts`）: `dealId: string` を持つが `dealTitle` フィールドは存在しない。T-03 の型不整合（Finding #2）を確認。
- `meetingRepository.findAllByOrganization`（`src/infrastructure/repositories/meetingRepository.ts`）: `Meeting[]` を返す実装。Deal との JOIN なし。
- `invoiceRepository`（`src/infrastructure/repositories/invoiceRepository.ts`）: `findAllByOrganization` は存在しない。`findAllByContract` のみ。T-01 の新設は妥当。`mapRow` 関数は再利用可能な形式で定義済み。
- `auditLogRepository.findByOrganization`（`src/infrastructure/repositories/auditLogRepository.ts`）: `limit` オプション対応済みを確認。
- `requestRepository.findAllWithStepsByOrganization`（`src/infrastructure/repositories/requestRepository.ts`）: `approverRole`・`status`・`deadline` を含む `ApprovalStepSummary[]` を返す。T-03 のフィルタ条件（`approverRole === userRole` かつ pending ステップ）に必要なフィールドが揃っている。
- `(dashboard)/layout.tsx`: ダッシュボードリンクが nav に存在しないことを確認。T-07 の追加対象として正確。
- `src/app/page.tsx`: `redirect("/requests")` を確認。T-07 で `/dashboard` へ変更が必要。
- `DealPhase`（`src/domain/models/deal.ts`）: `"proposal_prep" | "proposed" | "negotiation" | "won" | "lost"` の 5 フェーズ。T-04 の全フェーズ集計要件と一致。
- `InvoiceStatus`（`src/domain/models/invoice.ts`）: `"scheduled" | "invoiced" | "paid" | "overdue"` の 4 種。T-01〜T-06 の status フィルタ値すべてが有効。
