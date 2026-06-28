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
| 1 | MEDIUM | Documentation Gap | spec.md / design.md | `invoice に href が無い`の根拠が不明確。request-review-result-001.md で「invoice の詳細ページ（`/contracts/[id]/invoices/[invoiceId]`）は実際に存在する」と指摘されたにもかかわらず、spec.md は "詳細ページ無し" の誤記を継承したまま。URL 組み立てに `contractId` が追加で必要になる複雑性を避けてスコープ外としたと推測されるが、その設計意図が spec に明記されていない。実装者が迷う余地がある。 | spec.md の Requirements か design.md の Non-Goals に「invoice 詳細ページ（`/contracts/[id]/invoices/[invoiceId]`）は存在するが、URL 構築に `contractId` が追加で必要なため本変更ではスコープ外とした」と明記する。 |
| 2 | MEDIUM | Test Coverage Gap | tasks.md (T-05/T-06/T-07) | spec.md の BDD シナリオ（例: meeting ラベルが `"ヒアリング 2026/06/15"` となること、contract の `href` が正確に `/contracts/{contractId}` となること）は精密な期待値を記述しているが、T-05〜T-07 のテストはすべて静的ソース解析（文字列の存在確認）のみで、実際の返却値・レンダリング結果を検証しない。例として `"ヒアリング: 2026/06/15"`（コロン入り）や `href: "/deals/"+dealId+"/meetings"` のような誤実装でも静的テストは通過する。既存コードベースの静的解析テスト慣行に沿った設計ではあるが、spec.md の精密なシナリオとテストの検証力に乖離がある。 | 対応として以下のいずれかを選択する: (a) T-05/T-06 に `getDealActivity` を直接呼び出す単体テスト（モック版リポジトリを使用）を 1〜2 件追加し、`targetInfoMap` の実値を検証する。(b) spec.md の BDD シナリオの期待値（ラベル文字列、href パターン）を「静的解析で検証可能な範囲の例示」として緩和する旨を明記し、精密な値検証は手動確認事項とする。 |
| 3 | LOW | Spec/Task Inconsistency | spec.md シナリオ / tasks.md T-02 | spec.md の Scenario（"ヒアリング 2026/06/15"）はゼロパディングされた月日（`06/15`）を示しているが、T-02 で指示する `m.date.toLocaleDateString("ja-JP")` はゼロパディングなし（`"2026/6/15"`）を出力する。`toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" })` を指定しないと、シナリオの例示と実装結果がずれる。 | T-02 の date フォーマット指示を `m.date.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })` に変更するか、spec.md シナリオの例示を `"ヒアリング 2026/6/15"`（非パディング）に合わせる。既存 page.tsx の日付レンダリングでは `{ year: "numeric", month: "2-digit", day: "2-digit" }` オプションを使用しているため、統一のためにも前者を推奨。 |
| 4 | LOW | Task Ordering Risk | tasks.md T-01 / T-04 | T-01 AC に「一時的に型エラーが出る場合は T-04 と合わせて解消」と記載されているが、T-01 完了後に `bun run build` を AC として課している（T-01 AC: "`bun run build` が通る（呼び出し元の page.tsx は T-04 で修正するため…）」）。T-01 単独では page.tsx が `AuditLog[]` を受け取るコードのままとなり型エラーが必発で build は通らない。AC の記述と実態が矛盾している。 | T-01 の AC から `bun run build` を削除し、代わりに「T-04 完了後にビルドが通ること」とする。または T-01 と T-04 をマージして一括完了のタスクとする。 |

## Security Review

OWASP Top 10 の観点で変更範囲を評価した。

- **A01 Broken Access Control**: `getDealActivity` は既存の `organizationId`（セッション由来）スコープを引き継ぐ。新パラメータ `dealTitle` は `getDeal(id, organizationId)` で既認可済みの値を渡すため、追加のアクセス制御破綻なし。
- **A03 Injection / XSS**: `targetInfoMap` に格納されるラベル（`deal.title`、`contract.title` 等）はデータベース由来のユーザー入力だが、React テキストノードとして描画されるため自動エスケープ済み。`dangerouslySetInnerHTML` 非使用。XSS リスクなし。
- **A03 Open Redirect**: `href` 値は DB から取得したエンティティ ID を用いたハードコードパスパターン（`/deals/${id}` 等）で構成。Next.js `Link` はクライアントサイドナビゲーションのみ。外部 URL 注入の経路なし。
- **A05/A07 認証・セッション**: 既存の auth フロー・セッション検証に変更なし。

セキュリティ上のブロッキング事項はなし。
