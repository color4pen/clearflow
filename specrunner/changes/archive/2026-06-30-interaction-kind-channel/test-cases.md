# Test Cases: interaction-kind-channel

<!-- FORMAT REQUIREMENTS:
Test Case heading format: `### TC-{NNN}: {Name}` (3-digit zero-padded, e.g. TC-001)

Required fields per test case:
  **Category**: unit | integration | manual
  **Priority**: must | should | could
  **Source**: reference to spec Scenario (spec.md > Requirement: <name> > Scenario: <name>) or design.md / tasks.md section

GIVEN/WHEN/THEN structure (mixed format — depends on TC type):
  Scenario 由来 TC (Source = spec.md > Requirement: <name> > Scenario: <name>):
    GWT は記述しない。Source 参照のみ。behavior の正典は spec の Scenario。
  非 Scenario 由来 TC (Source = design.md or tasks.md section):
    GWT は必須:
    **GIVEN** <preconditions>
    **WHEN** <action>
    **THEN** <expected result>

Category determination:
  unit        — pure logic, validation, helper functions (automated)
  integration — DB operations, API endpoints, multi-module interaction (automated)
  manual      — UI/UX confirmation, visual verification, build artifact check (not automated)

Priority determination:
  must   — core functionality; if broken, the feature does not work
  should — important but core still works; edge cases, error handling
  could  — nice to have; performance, UX details

Summary section MUST appear immediately after the title with ALL 4 items:
  ## Summary
  - **Total**: {count} cases
  - **Automated** (unit/integration): {count}
  - **Manual**: {count}
  - **Priority**: must: {count}, should: {count}, could: {count}

Result section MUST appear at the very end as a YAML code block:
  ## Result
  ```yaml
  result: completed | partial | failed
  total: {count}
  automated: {count}
  manual: {count}
  must: {count}
  should: {count}
  could: {count}
  blocked_reasons: []
  ```

  result determination:
    completed — all testable behaviors are documented
    partial   — some cases could not be derived due to design ambiguity
    failed    — spec is absent AND design.md / tasks.md are also missing
-->

## Summary

- **Total**: 37 cases
- **Automated** (unit/integration): 24
- **Manual**: 13
- **Priority**: must: 33, should: 4, could: 0

---

## ドメイン型・スキーマ

### TC-001: InteractionKind 型が 4 値 union である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InteractionKind はチャネルのみを表す 4 値 enum であること > Scenario: InteractionKind 型が 4 値 union である

---

### TC-002: DB enum が 4 値である

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: InteractionKind はチャネルのみを表す 4 値 enum であること > Scenario: DB enum が 4 値である

---

### TC-003: interactionKindEnum が ["meeting","call","email","note"] の 4 値配列である

**Category**: unit
**Priority**: must
**Source**: tasks.md T-02

**GIVEN** `src/infrastructure/schema.ts` の `interactionKindEnum` が更新されている
**WHEN** `interactionKindEnum.enumValues` を確認する
**THEN** `["meeting", "call", "email", "note"]` の 4 値であり、`"contract_adjustment"` / `"invoice_adjustment"` が含まれないこと

---

### TC-004: interactions.kind 列の DEFAULT が "meeting" のまま維持されている

**Category**: unit
**Priority**: should
**Source**: tasks.md T-02

**GIVEN** `src/infrastructure/schema.ts` が更新されている
**WHEN** `interactions` テーブル定義の `kind` 列の DEFAULT 設定を確認する
**THEN** DEFAULT が `"meeting"` であること

---

## マイグレーション

### TC-005: マイグレーション SQL が旧値を note に寄せる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 差分マイグレーションはデータを安全に保持すること > Scenario: マイグレーション SQL が旧値を note に寄せる

---

### TC-006: マイグレーション SQL が商談行を変更しない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 差分マイグレーションはデータを安全に保持すること > Scenario: マイグレーション SQL が商談行を変更しない

---

### TC-007: マイグレーション SQL に破壊的操作が含まれない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 差分マイグレーションはデータを安全に保持すること > Scenario: マイグレーション SQL に破壊的操作が含まれない

---

### TC-008: マイグレーション SQL に 7 ステップの安全な手順が含まれる

**Category**: manual
**Priority**: must
**Source**: tasks.md T-03

**GIVEN** `drizzle/0018_interaction_kind_channel.sql` が作成されている
**WHEN** SQL ファイルの内容を確認する
**THEN** 以下の 7 ステップを含み、各 statement の間に `--> statement-breakpoint` が挿入されていること:
  1. `UPDATE interactions SET kind = 'note' WHERE kind IN ('contract_adjustment', 'invoice_adjustment')`
  2. `ALTER TABLE interactions ALTER COLUMN kind DROP DEFAULT`
  3. `CREATE TYPE "public"."interaction_kind_new" AS ENUM('meeting', 'call', 'email', 'note')`
  4. `ALTER TABLE interactions ALTER COLUMN kind TYPE "public"."interaction_kind_new" USING kind::text::"public"."interaction_kind_new"`
  5. `ALTER TABLE interactions ALTER COLUMN kind SET DEFAULT 'meeting'`
  6. `DROP TYPE "public"."interaction_kind"`
  7. `ALTER TYPE "public"."interaction_kind_new" RENAME TO "interaction_kind"`

---

### TC-009: drizzle/meta/_journal.json に 0018 エントリが追加されている

**Category**: manual
**Priority**: must
**Source**: tasks.md T-03

**GIVEN** `drizzle/meta/_journal.json` が更新されている
**WHEN** `_journal.json` のエントリ一覧を確認する
**THEN** `tag: "0018_interaction_kind_channel"` のエントリが存在すること

---

### TC-010: 0018_snapshot.json の interactionKindEnum が 4 値である

**Category**: manual
**Priority**: must
**Source**: tasks.md T-03

**GIVEN** `drizzle/meta/0018_snapshot.json` が作成されている
**WHEN** スナップショット内の `interactionKindEnum` の値を確認する
**THEN** `["meeting", "call", "email", "note"]` であり、`contract_adjustment` / `invoice_adjustment` が含まれないこと

---

### TC-011: bun run db:generate で追加差分が生成されない

**Category**: manual
**Priority**: should
**Source**: tasks.md T-03

**GIVEN** `schema.ts` と `0018_interaction_kind_channel.sql` が整合している
**WHEN** `bun run db:generate` を実行する
**THEN** 新たなマイグレーションファイルが生成されないこと（schema.ts と SQL が一致している状態）

---

## ユースケース — createContractAdjustment

### TC-012: 契約調整を記録すると kind=note の Interaction が作成される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 契約に紐づく接点の記録は kind=note + contractId で作成されること > Scenario: 契約調整を記録すると kind=note の Interaction が作成される

---

### TC-013: 契約調整の監査ログは metadata.kind="note" で記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 契約に紐づく接点の記録は kind=note + contractId で作成されること > Scenario: 契約調整の監査ログは metadata.kind="note" で記録される

---

### TC-014: createContractAdjustment が contractId を relatedTo に設定する

**Category**: unit
**Priority**: must
**Source**: tasks.md T-04

**GIVEN** 有効な契約（`contractId` あり）が存在する
**WHEN** `createContractAdjustment` を呼び出す
**THEN** `interactionRepository.create` に `contractId` が渡されること（relatedTo が不変）

---

## ユースケース — createInvoiceAdjustment

### TC-015: 請求調整を記録すると kind=note の Interaction が作成される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 請求に紐づく接点の記録は kind=note + invoiceId で作成されること > Scenario: 請求調整を記録すると kind=note の Interaction が作成される

---

### TC-016: 請求調整の監査ログは metadata.kind="note" で記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 請求に紐づく接点の記録は kind=note + invoiceId で作成されること > Scenario: 請求調整の監査ログは metadata.kind="note" で記録される

---

### TC-017: createInvoiceAdjustment が invoiceId を relatedTo に設定する

**Category**: unit
**Priority**: must
**Source**: tasks.md T-05

**GIVEN** 有効な請求（`invoiceId` あり）が存在する
**WHEN** `createInvoiceAdjustment` を呼び出す
**THEN** `interactionRepository.create` に `invoiceId` が渡されること（relatedTo が不変）

---

## 認可

### TC-018: admin は契約に紐づく接点を記録できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 認可は relatedTo 文脈ベースで権限値を維持すること > Scenario: admin は契約に紐づく接点を記録できる

---

### TC-019: finance は契約に紐づく接点を記録できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 認可は relatedTo 文脈ベースで権限値を維持すること > Scenario: finance は契約に紐づく接点を記録できない

---

### TC-020: member は請求に紐づく接点を記録できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 認可は relatedTo 文脈ベースで権限値を維持すること > Scenario: member は請求に紐づく接点を記録できない

---

### TC-021: finance は請求に紐づく接点を記録できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 認可は relatedTo 文脈ベースで権限値を維持すること > Scenario: finance は請求に紐づく接点を記録できる

---

### TC-022: manager は契約に紐づく接点を記録できる

**Category**: unit
**Priority**: must
**Source**: tasks.md T-06

**GIVEN** ユーザーのロールが `manager` である
**WHEN** `canPerform("manager", "interaction", "recordContractInteraction")` を呼び出す
**THEN** `true` が返ること

---

### TC-023: member は契約に紐づく接点を記録できる

**Category**: unit
**Priority**: must
**Source**: tasks.md T-06

**GIVEN** ユーザーのロールが `member` である
**WHEN** `canPerform("member", "interaction", "recordContractInteraction")` を呼び出す
**THEN** `true` が返ること

---

### TC-024: admin は請求に紐づく接点を記録できる

**Category**: unit
**Priority**: must
**Source**: tasks.md T-06

**GIVEN** ユーザーのロールが `admin` である
**WHEN** `canPerform("admin", "interaction", "recordInvoiceInteraction")` を呼び出す
**THEN** `true` が返ること

---

### TC-025: manager は請求に紐づく接点を記録できる

**Category**: unit
**Priority**: must
**Source**: tasks.md T-06

**GIVEN** ユーザーのロールが `manager` である
**WHEN** `canPerform("manager", "interaction", "recordInvoiceInteraction")` を呼び出す
**THEN** `true` が返ること

---

### TC-026: finance ロールで recordContractAdjustmentAction を呼ぶと認可エラーになる

**Category**: unit
**Priority**: should
**Source**: tasks.md T-07, T-12

**GIVEN** ユーザーのロールが `finance` である
**WHEN** `recordContractAdjustmentAction` を呼び出す
**THEN** 認可エラー（unauthorized）が返ること

---

### TC-027: member ロールで recordInvoiceAdjustmentAction を呼ぶと認可エラーになる

**Category**: unit
**Priority**: should
**Source**: tasks.md T-07, T-12

**GIVEN** ユーザーのロールが `member` である
**WHEN** `recordInvoiceAdjustmentAction` を呼び出す
**THEN** 認可エラー（unauthorized）が返ること

---

## 接点一覧取得

### TC-028: 契約に紐づく接点の一覧が取得できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 契約・請求に紐づく接点の一覧取得は relatedTo ベースで従来どおり動作すること > Scenario: 契約に紐づく接点の一覧が取得できる

---

### TC-029: 請求に紐づく接点の一覧が取得できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 契約・請求に紐づく接点の一覧取得は relatedTo ベースで従来どおり動作すること > Scenario: 請求に紐づく接点の一覧が取得できる

---

## 商談不変性

### TC-030: 商談の作成は kind=meeting で行われる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 商談（kind=meeting）の振る舞いは不変であること > Scenario: 商談の作成は kind=meeting で行われる

---

## getDealActivity ラベル

### TC-031: 契約経由の接点ラベルが「契約のやり取り」である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: getDealActivity のタイムラインラベルは relatedTo ベースの表現であること > Scenario: 契約経由の接点ラベルが「契約のやり取り」である

---

### TC-032: 請求経由の接点ラベルが「請求のやり取り」である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: getDealActivity のタイムラインラベルは relatedTo ベースの表現であること > Scenario: 請求経由の接点ラベルが「請求のやり取り」である

---

## 全体品質確認

### TC-033: コードベースに contract_adjustment / invoice_adjustment 文字列が残っていない

**Category**: manual
**Priority**: must
**Source**: tasks.md T-16

**GIVEN** コードベース全体が更新されている
**WHEN** マイグレーション SQL 内の `UPDATE` 文以外のファイル全体を `contract_adjustment` / `invoice_adjustment` で grep する
**THEN** 該当する文字列が存在しないこと（マイグレーション SQL の `WHERE kind IN ('contract_adjustment','invoice_adjustment')` は例外）

---

### TC-034: コードベースに旧認可操作名が残っていない

**Category**: manual
**Priority**: must
**Source**: tasks.md T-16

**GIVEN** `authorization.ts` / `interactions.ts` / `contracts/[id]/page.tsx` / `invoices/[invoiceId]/page.tsx` が更新されている
**WHEN** コードベース全体を `recordContractAdjustment` / `recordInvoiceAdjustment` で grep する
**THEN** 該当する文字列が存在しないこと

---

### TC-035: bun run typecheck が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md T-16

**GIVEN** T-01〜T-15 の変更が完了している
**WHEN** `bun run typecheck` を実行する
**THEN** 型エラーなく成功すること

---

### TC-036: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md T-16

**GIVEN** T-01〜T-15 の変更が完了している
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーなく成功すること

---

### TC-037: bun test が全件 green である

**Category**: manual
**Priority**: must
**Source**: tasks.md T-16

**GIVEN** T-01〜T-15 の変更が完了している
**WHEN** `bun test` を実行する
**THEN** 全テストケースが green であること

---

## Result

```yaml
result: completed
total: 37
automated: 24
manual: 13
must: 33
should: 4
could: 0
blocked_reasons: []
```
