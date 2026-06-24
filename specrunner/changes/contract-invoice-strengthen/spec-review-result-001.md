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
| 1 | LOW | Clarity | tasks.md T-09 | `db.transaction` に `{ isolationLevel: 'serializable' }` を渡すことが spec.md と design.md D4 に明記されているが、T-09 のタスクチェックリスト項目には記載がない。実装者が見落とすリスクは低い（spec.md に明示されており test-case-gen/verification でも検出可能）が、チェックリストに「`{ isolationLevel: 'serializable' }` を db.transaction に渡す」を追加すると実装精度が上がる。 | T-09 のチェックリストに `{ isolationLevel: 'serializable' }` の明示を追加する。 |
| 2 | LOW | Logic gap | tasks.md T-08 | T-08 は `createInvoice.ts` に `issueDate` と日付バリデーションを追加するが、既存の合計金額チェック条件 `contract.amount !== null` の更新に言及していない。T-01/T-02 で `contracts.amount` が NOT NULL になった後、この比較は TypeScript strict mode で「`number !== null` は常に true」として型エラーになる。さらに正しい修正は `contract.amount > 0` であり（マイグレーションで null → 0 になった契約でのチェックスキップを維持するため）、`> 0` と `!== null` は amount=0 で意味が異なる。T-12 の typecheck 要件で検出可能であり blocking ではないが、T-08 に明示するとよい。 | T-08 チェックリストに「`contract.amount !== null` を `contract.amount > 0` に変更する」を追加する。 |
| 3 | LOW | Clarity | tasks.md T-10 / T-11 | 既存の全 invoice/contract Server Action は `admin \| manager` のロールチェックを実装しているが、新規作成する `updateInvoiceAction`（T-11）のタスク記述は「認証・認可・レート制限チェックを含める」とのみ記載し、対象ロールを明示していない。実装者は既存コードパターンから正しく判断できるが、新規 Action のタスクには明記するのが望ましい。 | T-11 に「認可: `admin \| manager` のロールチェック（既存 Action と同パターン）を追加する」と明記する。 |
| 4 | LOW | Spec completeness | spec.md | `Requirement: 単発契約の請求金額合計チェックは請求更新時にも適用される` に、amount = 0（マイグレーションで null → 0 に移行された契約）に対する挙動のシナリオがない。Finding #2 で示した `contract.amount > 0` 条件の採用により、amount = 0 の既存契約は合計チェックをスキップする（one_time 契約でも）。この意図した挙動が spec.md に記述されていないため、実装者・テスト生成者が判断を迷う可能性がある。 | spec.md に「amount = 0 の one_time 契約（マイグレーション由来）は合計チェックをスキップし、請求金額更新が成功する」シナリオを追加する。 |

## Security Review

以下の観点で確認を実施した。

### OWASP Top 10 適用箇所

| 項目 | 評価 | 根拠 |
|------|------|------|
| A01 Broken Access Control | ✅ 問題なし | 全 usecase / repository 操作が `organizationId` でテナントスコープされる。新規 `updateInvoice` usecase も `organizationId` を受け取り、全 DB クエリに適用（T-09 仕様から確認）。 |
| A03 Injection | ✅ 問題なし | Drizzle ORM のパラメータ化クエリを一貫して使用。マイグレーション SQL は静的な UPDATE 文のみでユーザー入力を含まない。 |
| A04 Insecure Design | ✅ 問題なし | SERIALIZABLE 分離レベルのトランザクションで SUM → 検証 → UPDATE を原子実行し TOCTOU を防止（createInvoice の既存パターンを継承）。Domain service によるバリデーションと Action 層 Zod スキーマの二重防御。 |
| A07 Authentication Failures | ✅ 問題なし | 全 Server Action で `auth()` による session 検証あり。新規 `updateInvoiceAction` も T-11 で認証チェックを含めることが明記。 |
| A08 Software Integrity | ✅ 問題なし | 2ステップマイグレーション（UPDATE で null 埋め → ALTER SET NOT NULL）はデータ整合性を保ち、ロールバック時も情報損失なし（元が null のため）。 |

### その他のセキュリティ考慮点

- **レート制限**: `createInvoiceAction` は既存 RATE_LIMITS.createRequest を使用。T-11 で `updateInvoiceAction` にもレート制限チェックを明示しており適切。
- **Input validation**: Action 層 Zod (`z.coerce.number().int().positive()`) + Domain 層 `validateContractAmount` / `validateInvoiceDates` の多層バリデーション。
- **IDOR**: `invoiceRepository.findById(id, organizationId)` など、ID ルックアップは常に organizationId を付加しており、テナント越えアクセスを防止。

## 総評

request-review-result-001.md で指摘された全 5 件の findings（MEDIUM 2 件、LOW 3 件）は design.md・tasks.md で適切に解決されている。設計（layered architecture 準拠、SERIALIZABLE トランザクション、型の完全なカスケード更新）は一貫しており、受け入れ基準と spec.md の BDD シナリオは主要なビジネスルールを網羅している。上記 4 件の LOW findings はいずれも `typecheck && test` の green 要件（T-12）またはコードレビューで検出可能であり、実装着手を阻むものではない。
