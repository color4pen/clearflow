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
| 1 | MEDIUM | Scope ambiguity | 要件 #9 / #10（経理 — 期日超過・未入金・請求予定テーブル） | `listInvoicesByOrganization` は `Invoice[]` を返すが、`Invoice` モデルに `契約名`・`顧客名` フィールドが存在しない（`contractId` のみ）。スコープ外として「データ取得ロジックの変更なし」と明示されているが、既存の `listContracts` ユースケース（`ContractWithClient` を返す）を page.tsx 内で追加呼び出しして contractId→{title,clientName} マップを構築すれば、既存ユースケースの修正なしに対応可能。ただし、この追加 fetch がスコープ内か否かが request.md では明確でない。 | 実装者は `listContracts` を追加呼び出しして契約名・顧客名を解決する前提で進めてよい。スコープ外の意図が「ユースケース関数の新規作成・変更禁止」であれば問題なし。必要に応じて request.md の「スコープ外」欄に「既存ユースケースの追加呼び出しは許容」と補足すると明確になる。 |
| 2 | MEDIUM | Scope ambiguity | 要件 #6 / 受け入れ基準（営業 — 直近の活動：担当者名） | `AuditLog` モデルが `actorId` のみ持ち `actorName` を含まない。受け入れ基準「直近の活動が担当者名 + 操作テキスト + 相対時間で表示される」を達成するには、既存の `listOrganizationUsers` ユースケースを追加呼び出しして actorId→name マップを構築する必要がある（`src/app/(dashboard)/settings/audit-logs/page.tsx` と同じパターン）。これもスコープとの整合が曖昧。 | `listOrganizationUsers`（既存ユースケース）を page.tsx で追加呼び出しして名前解決する実装で対応可能。`audit-logs/page.tsx` の実装パターンを参照することを推奨。 |
| 3 | LOW | Clarity | 要件 #9（請求番号カラム） | `Invoice` モデルに連番の請求番号フィールドはなく、`id` は UUID。6カラムの最初の「請求番号」列に何を表示するか（`id` の短縮、`title` の流用など）が未指定。 | `invoice.title` を請求番号列に表示するか、`id.slice(0,8)` を使うかを実装者が判断する。どちらでもスコープ内で実装可能。 |
| 4 | LOW | Clarity | 要件 #6（相対時間） | 「相対時間（text-muted）」表示のためのユーティリティ関数がコードベースに存在しない。 | 実装者がシンプルな相対時間フォーマッタ（例: 「N分前 / N時間前 / N日前」）をコンポーネント内に実装する。ライブラリ追加は不要。 |
