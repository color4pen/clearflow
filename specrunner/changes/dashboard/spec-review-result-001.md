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
| 1 | MEDIUM | Architecture | tasks.md T-09 | ページコンポーネントが `meetingRepository.findAllByOrganization` と `auditLogRepository.findByOrganization` をユースケース層を介さず直接呼び出す。同ページ内の他のデータ取得（`listRequests`, `listInquiries`, `listDeals`, `listInvoicesByOrganization`）はユースケース経由であり、一貫性を欠く。D7 で明示的に許容されているが、将来の保守担当者が「どこから repository を直接呼んでよいか」の基準を誤解するリスクがある。 | 実装上は D7 の設計判断として許容。中長期的には `listMeetingsByOrganization` ユースケースを追加し、他のユースケース同様に barrel export 経由に統一することを推奨する。 |
| 2 | MEDIUM | Performance | design.md D3 / tasks.md T-09 | `listRequests(organizationId)` は組織内の全ステータスのリクエストを取得し、`buildActionableItems` でアプリケーション層にて `status === "pending"` にフィルタする。承認済み・却下済み・期限切れの過去リクエストが多い組織では不要なデータ転送が発生する。 | `requestRepository.findAllWithStepsByOrganization` に `status` フィルタ（例: `status?: RequestStatus[]`）を追加し、DB 層で `pending` のみ取得するよう改善を検討する。本 change スコープ内での修正は必須ではないが tasks に注記を追加しておくと実装者が認識できる。 |
| 3 | LOW | Typo | tasks.md T-04 | タスク見出しが `filterStaleDealss`（末尾に 's' が余分）になっている。関数シグネチャは正しく `filterStaleDeals`。コードの正確性に影響はないが混乱を招く。 | タスク見出しを `filterStaleDeals` に修正する。 |
| 4 | LOW | Edge case | tasks.md T-03 | `ActionItem.dueDate` は `string \| null` 型。T-03 は「Date にパース（null なら null）」と指示しているが、不正な日付文字列（例: `"未定"` 等の自由入力）に対する挙動が未定義。`new Date("未定")` は `Invalid Date`（NaN）となり、ソート比較で不定動作が発生しうる。 | 実装時に `isNaN(parsed.getTime())` チェックを加え、パース失敗時は `null` として扱い末尾に配置することを `dashboardService.ts` の実装コメントに明記する。 |
| 5 | LOW | Boundary semantics | tasks.md T-01 | `paidAtTo` フィルタは `lt`（exclusive）で実装し呼び出し側が「翌月初日 00:00:00 UTC」を渡す設計。一方 `issueDateTo` は `lte`（inclusive）で「翌月末日」を渡す設計。対称性のない境界条件は呼び出し側（T-09）での実装ミスを招きやすい。 | `findAllByOrganization` のインラインコメントまたは JSDoc に各フィルタの境界条件（`paidAtTo` は exclusive、`issueDateTo` は inclusive）を明記し、呼び出し側が正しい日付を渡せるようにする。 |

## Security Review

| Area | Status | Notes |
|------|--------|-------|
| Authentication | ✅ | `(dashboard)/layout.tsx` が `auth()` でセッション確認。未認証は `/login` にリダイレクト済み。ページコンポーネントはこの auth guard の内側にある。 |
| Authorization (Role) | ✅ | ロール判定（finance vs 営業、manager/admin 向け停滞案件）はサーバーサイドの Server Component で実施。クライアント入力に依存しない。 |
| Tenant Isolation | ✅ | T-01 で `eq(invoices.organizationId, organizationId)` を WHERE 必須と明示。`organizationId` はセッションから取得し URL パラメータ・クエリ文字列から取得しない。IDOR リスクなし。 |
| SQL Injection | ✅ | 全 DB 操作が Drizzle ORM のパラメータ化クエリ経由。ユーザー入力の直接文字列結合なし。 |
| Information Disclosure | ✅ | 経理ダッシュボードは finance ロールのみに表示。営業データ（案件・引合）は finance ユーザーには返されない（ページ分岐がサーバーサイドで先行する）。 |
| OWASP A01 (Access Control) | ✅ | データスコープが常にセッションの `organizationId` に固定されており、クロステナントアクセス不可。 |
| OWASP A03 (Injection) | ✅ | 上記 SQL Injection と同様。 |
