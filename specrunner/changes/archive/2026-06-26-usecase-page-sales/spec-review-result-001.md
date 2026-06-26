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
| 1 | HIGH | Spec Defect | `tasks.md` T-11 / `src/app/(dashboard)/contracts/[id]/page.tsx` | T-11 が `import { getContract, listInvoicesByContract, hasPendingApproval } from "@/application/usecases"` を追加する指示を出しているが、同ページ内に `let hasPendingApproval = false;` というローカル変数が既に存在する（line 31, 33, 48）。TypeScript strict モードでは import した識別子と同名のブロックスコープ変数の宣言はコンパイルエラーになるため、spec 通りに実装すると `bun run build` が必ず失敗する | tasks.md T-11 に「ローカル変数 `hasPendingApproval` を `isPending`（または同等の別名）にリネームしてから、usecase 関数と使い分ける」旨を追記する。具体的には `let isPending = false; try { isPending = await hasPendingApproval(organizationId, id); } catch { }` のパターンとし、JSX 内の `{hasPendingApproval && ...}` も `{isPending && ...}` に変更する手順を明示する |
| 2 | MEDIUM | Security | `tasks.md` T-01 / `src/application/usecases/listClientContacts.ts`（新設予定） | `listClientContacts(clientId)` は organizationId を引数に取らない（D2 の設計判断）。design.md にはこのパターンを許容する根拠が記述されているが、新設 usecase ファイル自体には何の注記もない。将来の実装者がこの usecase を呼び出す際に「先行する getClient 呼び出しでテナント検証を行う必要がある」というコントラクトが伝わらないリスクがある。repository 側には JSDoc があるが usecase 側には何もない | `listClientContacts.ts` の関数に、repository の JSDoc と同等の注記（「テナント分離の前提: 呼び出し前に getClient 等で clientId が organizationId に属することを確認すること」）を追記するよう tasks.md T-01 の Acceptance Criteria に加える |
| 3 | LOW | Completeness | `spec.md` | spec.md のシナリオが「全ページで repository import が 0 件」「usecase が 1 行ラッパーである」「ビルドと型チェックが通る」の 3 点に留まっており、T-11 の変数リネームや T-07 の `getInquiry` object args 切り替えといった呼び出し形式変更を検証するシナリオがない。シナリオ不足のため test-case-gen が変換後の呼び出し形式を検証するテストケースを生成しにくい | spec.md に「既存 usecase の object args シグネチャ（getInquiry, getContract, listInvoicesByContract）が正しい形式で呼び出されている」ことを確認する Scenario を追加することを検討する（LOW のため任意） |

## Review Notes

### 方法論

- change folder の全ファイル（request.md, design.md, tasks.md, spec.md）と対象 11 ファイルのソースコード、13 種の repository メソッドシグネチャ、既存 usecase の実装をすべて照合した
- セキュリティレビュー（認証・テナント分離・OWASP Top 10）を実施した

### 正常確認事項

- **全 repository メソッド存在確認**: tasks.md が呼び出す repository メソッド（`findAllByClientId`, `findAllByDealId`, `findByInquiryId`, `findAllByInquiry`, `findByDeal`, `sumAmountByContract`, `findByOriginTriggerEntity`, `existsPendingByTriggerEntityId` 等）がすべて実際に存在し、引数順序も spec 記載と一致している ✓
- **既存 usecase のシグネチャ整合**: design.md D4 が正確に記述している通り、`getInquiry`, `getContract`, `listInvoicesByContract` は object args パターンであり、T-07/T-10/T-11/T-13 でそれぞれ呼び出し形式を変更する指示が正しく記載されている ✓
- **D3 の DealWithDetails 型**: `listDeals` が返す `DealWithDetails` は `Deal` の superset であり `clientId` フィールドを保持しているため、T-05/T-09 で `dealRepository.findAllByOrganization` を `listDeals` に切り替えても既存のアクセスパターン（`deal.clientId`）は型安全に動作する ✓
- **テナント分離**: 全新規 usecase は organizationId を受け取り、それを repository メソッドに直接渡す設計になっており、マルチテナント安全性は維持される ✓
- **認証**: 対象ページはすべて冒頭で `await auth()` を呼び出し、`session!.user.organizationId` を使っており、この構造はリファクタリング後も変わらない ✓
- **OWASP Top 10**: 本リファクタリングは import 切り替えのみで DB クエリの実体（Drizzle ORM パラメータ化クエリ）は変わらないため、SQL インジェクション等の攻撃面に変化なし ✓
- **副作用なし**: 新規 usecase は全て読み取り専用の 1 行ラッパー。ミューテーション・トランザクション・ドメインロジックを含まない ✓
