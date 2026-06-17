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
| 1 | low | testing | `src/__tests__/usecases/webhookRetryAuditExport.test.ts` | TC-006 の検証が不完全。`deliverSingleAttempt` がエクスポートされ呼び出されることは確認しているが、関数内に `for`/`while` ループや `Bun.sleep` が存在しない（= 単発試行である）ことを機械的に保証するアサーションがない。将来リグレッションが混入しても検出できない。 | `deliverSingleAttempt` 定義以降のソース断片を切り出し、`expect(snippet).not.toContain("for ")` と `expect(snippet).not.toContain("Bun.sleep")` を追加する。 | no |
| 2 | low | testing | `src/__tests__/static/projectStructure.test.ts` | `bun test` 実行時に TC-025（`.env.example` 存在チェック）が 1 件失敗する。ただし `main` ブランチ上でも同様に失敗する pre-existing な問題であり、本変更での導入ではない。新規追加テスト 24 件は全件 pass。 | 本 PR スコープ外。別途 `.env.example` の追加またはテストのスキップ処理を検討する。 | no |
| 3 | low | standards | `src/app/api/audit-logs/export/route.ts:75` | CSV 行区切りに `\n`（LF）を使用しているが、RFC 4180 は `\r\n`（CRLF）を規定している。BOM 付与済みのため Excel では実用上問題ないケースが多いが、厳格な RFC 4180 パーサを使う外部システムで改行が正しく認識されない可能性がある。 | `[header, ...rows].join("\r\n")` に変更する。デモ用途では現状のままでも許容範囲。 | no |
| 4 | low | architecture | `src/app/(dashboard)/settings/audit-logs/page.tsx:52` | ページコンポーネントが `auditLogRepository.findByOrganization` を直接呼び出している。既存の `deliveries/page.tsx` が `listWebhookDeliveriesAction`（Server Action）を経由するパターンと不整合。tasks.md で直接呼び出しが明示されているため意図的な選択だが、一貫性は低下している。 | 読み取り専用の Server Action（例: `listAuditLogsAction`）を追加することで既存パターンと統一できる。デモ規模では現状許容範囲。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 8 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.65

## Summary

全 12 タスクが仕様通りに実装されている。指摘事項はいずれも low レベルであり、マージを阻害するものはない。

**正確性**: Webhook リトライの指数バックオフ計算（1s/4s/16s）・`nextRetryAt` のタイミング算出・手動リトライでの既存 attempts 引き継ぎ、いずれも仕様と一致している。CSV エスケープは RFC 4180 準拠のクォーティングと CWE-1236 対策（Formula Injection 防止）を両立している。

**セキュリティ**: 監査ログの全エンドポイント・リポジトリ関数に `organizationId` 条件が付与されており、テナント間のデータ漏洩はない。手動リトライのエンドポイント取得時に `webhookEndpointRepository.findById(id, organizationId)` で組織所属を確認しており、クロスオーガニゼーション操作を防いでいる。

**テスト**: 静的コード解析パターンで受け入れ基準を網羅。新規 24 テスト全件 pass。pre-existing な TC-025 失敗（`.env.example` 不在）はこの変更とは無関係。

**アーキテクチャ**: `domain/` 配下に `@/infrastructure` の import なし。依存方向の規律に違反する実装はない。

