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
| 1 | HIGH | Migration | `tasks.md` T-07 | `source` カラムの enum 変換で手書き UPDATE SQL の挿入位置が不明確。T-07 は「生成された SQL に手書き SQL を追記する」と指示しているが、`drizzle-kit generate` が出力する DDL は `CREATE TYPE inquiry_source ... ; ALTER TABLE "inquiries" ALTER COLUMN "source" TYPE inquiry_source USING "source"::"inquiry_source";` の順になる。「追記」を末尾への追加と解釈した場合、UPDATE が ALTER COLUMN の後に実行され、PostgreSQL が `invalid input value for enum inquiry_source` エラーで失敗する。migration が本番で失敗すると、その後の全テーブル変更もロールバックされる。 | tasks.md T-07 の手順を「(a) drizzle-kit generate 実行 → (b) 生成ファイルの ALTER COLUMN 行の直前に UPDATE 文を挿入 → (c) ファイル末尾に CHECK 制約追加」と書き直す。実行順序を「enum 作成 → データ変換 → 型変更 → CHECK 制約」と明示し、「末尾に追記」表現を削除する。 |
| 2 | MEDIUM | Architecture | `tasks.md` T-06 / `src/domain/services/clientContactService.ts` | `validatePrimaryUniqueness` を `domain/services/` に配置するが、この関数は clientId に紐づく `isPrimary=true` レコードを DB 照会する必要があり、`clientRepository` を呼び出す。既存の domain service（`contractValidation.ts`, `inquiryTransition.ts` 等）はすべて純粋関数で、プロジェクトの「domain layer は repository を呼び出さない」原則を維持している。request-review でも同様の指摘があった。 | `validatePrimaryUniqueness` を `application/` 層に移動する。例: `application/services/clientContactValidator.ts` を新設する（または `createClientContact` use case 内にインライン実装する）。`clientRepository.findContactsByClientId` を呼び出してフィルタリングする。domain/services にはリポジトリ依存を持たせない。 |
| 3 | MEDIUM | DataIntegrity | `tasks.md` T-06 / `src/application/usecases/createClientContact.ts` | T-06 は `validatePrimaryUniqueness(clientId, null, isPrimary, tx)` と `tx` を渡す想定だが、`createClientContact` use case は現在 `db.transaction` ブロックを持たないため `tx` は常に `undefined` になる。結果として validation（SELECT）と insert が別トランザクションで実行され、並行リクエストが同時に primary なしを確認して双方とも `isPrimary=true` でレコードを作成できる TOCTOU 競合が発生する。 | `createClientContact` use case を `db.transaction(async (tx) => { await validatePrimaryUniqueness(..., tx); await clientRepository.createContact(..., tx); ... })` で包み、validate と insert を同一トランザクション内で実行する。あるいは DB の partial unique index（`CREATE UNIQUE INDEX ON client_contacts (client_id) WHERE is_primary = true`）を追加して DB 制約として保証する（アプリ層チェックと二重防御）。 |
| 4 | MEDIUM | Schema | `tasks.md` T-04 / `src/infrastructure/schema.ts` | `meetings` テーブルの CHECK 制約 `deal_id IS NOT NULL OR inquiry_id IS NOT NULL` をコメントのみで記載し、Drizzle の `check()` として schema.ts に定義しない方針。この場合、将来 `drizzle-kit generate` を実行すると Drizzle はスキーマと DB の差分を検出し、次の migration で `ALTER TABLE DROP CONSTRAINT` を生成してしまう可能性がある。 | Drizzle ORM の `check()` ヘルパーを使い、`meetings` テーブル定義のコールバックに `check("meetings_deal_or_inquiry_check", sql\`"deal_id" IS NOT NULL OR "inquiry_id" IS NOT NULL\`)` を追加する。`sql` は `drizzle-orm` から import する。これにより schema と DB が整合し、drizzle-kit が制約を正しく認識する。 |
