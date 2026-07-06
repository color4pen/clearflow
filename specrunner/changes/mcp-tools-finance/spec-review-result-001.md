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
| 1 | HIGH | Security / Incorrect Technical Claim | design.md D10 / spec.md T-13 | **D10 の前提が実コードと矛盾し、DB エラー文字列がクライアントに漏れる経路が塞がれない。** design.md D10 は「usecase 内で exception が reason に混入する経路（`err.message`）はビジネスメッセージ（金額超過等）であり、DB 接続エラー等の技術詳細ではない」と述べるが、これは事実と異なる。`createContract` / `updateContract` / `updateInvoiceStatus` / `setRevenueTarget` 等の catch ブロックは DB トランザクション全体を囲んでおり、`contractRepository.create()` や `invoiceRepository.update()` 等のリポジトリ操作が投げる PostgreSQL エラー（例: "duplicate key value violates unique constraint …"、"Connection refused"、deadlock メッセージ）をすべて `reason: err.message` に変換して返す。spec の実装方針「`toToolError(result.reason)` をそのまま返す」に従うと、これらの内部詳細がそのまま MCP クライアントに露出する。request.md 必須事項 3 は「usecase の Result reason に例外メッセージが入る経路をツール結果へ素通ししない」を明示しているが、spec の D10 と T-13 はこれを達成できない設計になっている。加えて T-13 のテストシナリオ（「usecase が DB 例外をスローする」→「ツールハンドラが catch する」）は実際のコードパスと乖離している。実コードでは usecase は例外をスローせず内部で catch して `{ ok: false, reason: err.message }` を返す。T-13 は `handleToolError` 経路を検証するだけで、`toToolError(result.reason)` 経路に DB エラー文字列が流れるケースを検証しない。テストは green になるが脆弱性は残る。 | **D10 の修正**: 「catch ブロックが捕捉する例外には、意図的なビジネス throw（`createInvoice` の金額超過など）と予期しないインフラ例外（DB エラー等）の両方が含まれる。後者の `err.message` はクライアントに返してはならない」と正確に記述する。**実装方針の修正（選択肢 A）**: MCP ツール層で `result.ok === false` の場合、`result.reason` を直接 `toToolError` に渡さず、reason の内容を業務定義済みメッセージとして扱えない場合は固定文言（「処理に失敗しました」等）に差し替えるガードを追加する。**実装方針の修正（選択肢 B）**: 各 usecase の catch ブロックを修正し、意図的な business throw には専用の ErrorCode やプレフィックスを付与し、その他の予期しない例外は固定文言のみ返す設計に変更する（ただしこれは usecase への変更を伴うためスコープ判断が必要）。**T-13 の修正**: テストシナリオを「mock が `{ ok: false, reason: "duplicate key value violates unique constraint" }` を返す」→「ツール結果が `isError: true` で reason を素通しせず固定文言を返す」に変更する。つまり throw ではなく return によるテストに切り替える。 |
| 2 | LOW | Input Validation Gap (Security) | spec.md — invoices update_status シナリオ | **`paidAt` の「本日以前」バリデーションが MCP 経路のみ欠落している。** Server Action (`invoices.ts`) は `paidAt.refine(val <= today)` で未来日付を拒否するが、spec.md は MCP ツール層でこのバリデーションを意図的に省略し usecase に委ねると規定している。実際の usecase (`updateInvoiceStatus`) にも当該バリデーションが存在しないため、finance ロールを持つ MCP 利用者が将来日付（例: `2099-12-31`）で入金記録できる状態になる。request-review-002 でも LOW として指摘済みだが spec に反映されていない。 | spec.md の `update_status` シナリオに「`paidAt` を指定する場合は本日以前の日付であること（Server Action と同一制約）を MCP 層で検証する」旨を追記するか、もしくは「MCP 層では日付制約を省略する（将来的に usecase 側で統一）」という意図的な差分として注記する。現状はどちらの判断か読み取れないため、実装者が迷う可能性がある。 |

## Summary

spec.md は 8 つの Requirement を Given/When/Then 形式で記述しており、SHALL/MUST normative keyword の付与も適切。tasks.md は 14 タスクに分割され、各タスクの受け入れ基準も明確。設計意思決定（D1〜D10）は contracts / invoices / revenue / revenue_targets の 4 ツール構成・認可マトリクス・楽観的ロック・テナント分離・部分更新の各側面で request.md の要件をほぼ忠実に反映している。

ブロッカーは 1 件（Finding #1）。D10 が実コードの catch パターンを誤って「ビジネスメッセージのみ」と断言しており、これを実装に従うと request.md 必須事項 3 に反した情報漏洩が発生する。また T-13 がその経路を正しく検証できないため、テストによる防御も機能しない。D10 の記述と T-13 のシナリオを上記の通り修正すれば、それ以外の設計判断・受け入れ基準・テスト方針は implementation ready の水準に達している。

Finding #2 は LOW（既指摘事項の未反映）であり承認ブロックではないが、spec への一行注記で実装者の迷いを除去できる。
