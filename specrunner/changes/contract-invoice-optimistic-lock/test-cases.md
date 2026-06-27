# Test Cases: 契約・請求の楽観的ロック

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

- **Total**: 23 cases
- **Automated** (unit/integration): 19
- **Manual**: 4
- **Priority**: must: 22, should: 1, could: 0

---

## スキーマ・マイグレーション

### TC-001: 既存の contracts 行に version が付与される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: contracts テーブルは version カラムを持つ > Scenario: 既存の contracts 行に version が付与される

### TC-002: 既存の invoices 行に version が付与される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: invoices テーブルは version カラムを持つ > Scenario: 既存の invoices 行に version が付与される

### TC-017: マイグレーション SQL が ADD COLUMN のみで構成される

**Category**: manual
**Priority**: must
**Source**: tasks.md T-02

**GIVEN** src/infrastructure/schema.ts の contracts テーブルおよび invoices テーブルに `integer("version").notNull().default(1)` が追加されている
**WHEN** `bunx drizzle-kit generate` を実行する
**THEN** 生成された差分マイグレーション SQL が contracts / invoices それぞれについて `ALTER TABLE ... ADD COLUMN "version" integer DEFAULT 1 NOT NULL` を含み、DROP TABLE / CREATE TABLE / DROP COLUMN が一切含まれない

---

## ドメインモデル

### TC-003: Contract 型に version がある

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Contract 型は version フィールドを持つ > Scenario: Contract 型に version がある

### TC-004: Invoice 型に version がある

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Invoice 型は version フィールドを持つ > Scenario: Invoice 型に version がある

---

## リポジトリ層 — contractRepository

### TC-005: contractRepository.update — version 一致で更新が成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: contractRepository.update は楽観的ロックを適用する > Scenario: version 一致で更新が成功する

### TC-006: contractRepository.update — version 不一致で更新が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: contractRepository.update は楽観的ロックを適用する > Scenario: version 不一致で更新が拒否される

---

## リポジトリ層 — invoiceRepository.update

### TC-007: invoiceRepository.update — version 一致で更新が成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: invoiceRepository.update は楽観的ロックを適用する > Scenario: version 一致で更新が成功する

### TC-008: invoiceRepository.update — version 不一致で更新が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: invoiceRepository.update は楽観的ロックを適用する > Scenario: version 不一致で更新が拒否される

---

## リポジトリ層 — invoiceRepository.updateStatus

### TC-009: invoiceRepository.updateStatus — version 一致でステータス更新が成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: invoiceRepository.updateStatus は楽観的ロックを適用する > Scenario: version 一致でステータス更新が成功する

### TC-010: invoiceRepository.updateStatus — version 不一致でステータス更新が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: invoiceRepository.updateStatus は楽観的ロックを適用する > Scenario: version 不一致でステータス更新が拒否される

---

## ユースケース層 — ロック失敗（ok: false）

### TC-011: updateContract — 楽観的ロック失敗で契約更新が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: updateContract usecase はロック失敗時に統一メッセージを返す > Scenario: 楽観的ロック失敗で契約更新が拒否される

### TC-012: updateContractStatus — 楽観的ロック失敗で契約ステータス更新が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: updateContractStatus usecase はロック失敗時に統一メッセージを返す > Scenario: 楽観的ロック失敗で契約ステータス更新が拒否される

### TC-013: updateInvoice — 楽観的ロック失敗で請求更新が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: updateInvoice usecase はロック失敗時に統一メッセージを返す > Scenario: 楽観的ロック失敗で請求更新が拒否される

### TC-014: updateInvoiceStatus — 楽観的ロック失敗で請求ステータス更新が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: updateInvoiceStatus usecase はロック失敗時に統一メッセージを返す > Scenario: 楽観的ロック失敗で請求ステータス更新が拒否される

---

## ユースケース層 — version 受け渡し（静的コード解析）

### TC-018: updateContract が findById 取得時の contract.version を contractRepository.update に渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md T-10

**GIVEN** updateContract usecase のソースコード
**WHEN** 静的コード解析で参照関係を確認する
**THEN** findById から取得した `contract.version` が `contractRepository.update` の `expectedVersion` パラメータとして渡されている

### TC-019: updateContractStatus が findById 取得時の contract.version を contractRepository.update に渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md T-11

**GIVEN** updateContractStatus usecase のソースコード
**WHEN** 静的コード解析で参照関係を確認する
**THEN** findById から取得した `contract.version` が `contractRepository.update` の `expectedVersion` パラメータとして渡されている

### TC-020: updateInvoice が findById 取得時の invoice.version を invoiceRepository.update に渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md T-12

**GIVEN** updateInvoice usecase のソースコード（金額変更パス・非変更パス双方を含む）
**WHEN** 静的コード解析で参照関係を確認する
**THEN** トランザクション開始前の findById で取得した `invoice.version` が、全パスで `invoiceRepository.update` の `expectedVersion` として渡されている

### TC-021: updateInvoiceStatus が findById 取得時の invoice.version を invoiceRepository.updateStatus に渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md T-13

**GIVEN** updateInvoiceStatus usecase のソースコード
**WHEN** 静的コード解析で参照関係を確認する
**THEN** findById から取得した `invoice.version` が `invoiceRepository.updateStatus` の `expectedVersion` パラメータとして渡されている

### TC-022: updateInvoice で freshInvoice.version を expectedVersion として使用しない

**Category**: unit
**Priority**: should
**Source**: tasks.md T-12（注記: 金額変更パスで freshInvoice を再取得するが、version 追跡には使用しない）

**GIVEN** updateInvoice usecase のソースコード（金額合計検証のため freshInvoice を再取得するパスを含む）
**WHEN** 静的コード解析で `invoiceRepository.update` の `expectedVersion` 引数を確認する
**THEN** `freshInvoice.version` が `invoiceRepository.update` の `expectedVersion` として使用されていない（`freshInvoice` は金額合計検証にのみ使用され、常に初期 findById の `invoice.version` が `expectedVersion` として渡される）

---

## 作成時の初期値

### TC-015: 新規契約の version が 1 である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 契約・請求の作成時に version は 1 で始まる > Scenario: 新規契約の version が 1 である

### TC-016: 新規請求の version が 1 である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 契約・請求の作成時に version は 1 で始まる > Scenario: 新規請求の version が 1 である

---

## 全体品質ゲート

### TC-023: ビルド・型チェック・既存テストが全件 green である

**Category**: manual
**Priority**: must
**Source**: tasks.md T-15

**GIVEN** T-01 〜 T-14 の全実装タスクが完了した状態
**WHEN** `bun run build` / `typecheck` / `bun test` を順に実行する
**THEN** ビルドエラーなし・型エラーなし・全テスト（既存テストを含む）が green である

---

## Result

```yaml
result: completed
total: 23
automated: 19
manual: 4
must: 22
should: 1
could: 0
blocked_reasons: []
```
