# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | LOW | Clarity | 要件 2 — invoices ツール / `update_status` operation | 入金日（paidAt）の「本日以前」バリデーションは Server Action 側のスキーマ（`paidAt.refine(val <= today)`）に実装されているが、MCP ツール側には該当するバリデーションが未定義。Zod スキーマを Server Action と共有するか再実装するかが実装者の裁量に委ねられている。 | 実装ガイドとして spec.md に「`paidAt` は ISO 8601 date 文字列で本日以前であること」を記載するよう設計ステップで補足させると、テストケース生成との整合が取りやすい。実装上のブロッカーではない。 |

## Summary

前提条件（mcp-server-core マージ済み）を `src/app/api/mcp/tools/` 配下のファイル群（deals.ts / inquiries.ts 等）で確認済み。コードベース検証結果:

- 必要な usecase はすべて存在する（`createContract` / `updateContract` / `updateContractStatus` / `deleteContract` / `listContracts` / `getContract`、`createInvoice` / `updateInvoice` / `updateInvoiceStatus` / `listInvoicesByContract` / `listInvoicesByOrganization`、`getRevenueDashboard` / `getRevenueDetails` / `getRevenueForecast`、`setRevenueTarget` / `updateRevenueTarget` / `deleteRevenueTarget`）。
- 認可マトリクスは contracts（admin/manager/finance）・invoices（admin/finance）・revenue 閲覧（全ロール）・revenue_targets 設定（admin/manager）として適切に定義済み。
- 楽観的ロックは `updateContract` / `updateInvoice` / `updateInvoiceStatus` の各 usecase でバージョン照合→null 返却→固定メッセージの形で実装済み。受け入れ基準の「version 不一致の衝突エラー」はこの既存パスで固定可能。
- 前回 iteration (001) の二つのブロッキング懸念（契約承認ゲートのスコープ曖昧性 / revenue operation 粒度の未定義）は、今回の request.md 要件 1・要件 3 の追記によりいずれも解消された。contracts 承認ゲートは「Server Action と同一挙動、承認ゲート追加なし、型は pendingApproval を受け取れる形を推奨、注記必須、別 request 対象」と明記され、revenue ツールは `dashboard` / `details` / `forecast` の operation 値と対応 usecase が一対一で示されている。
- `toToolError` / `handleToolError` のエラー変換モジュールは整備済み。usecase の `reason` フィールドにビジネスロジックメッセージが含まれる（例: 請求金額合計が契約金額を超えた場合の詳細金額）が、これは想定された情報開示であり、DB 内部エラー文の素通しとは異なる。実装者は点 #3（エラー変換）の適用範囲を実装時に判断できる。

全受け入れ基準は既存の usecase・認可・パターンで達成可能と判断する。
