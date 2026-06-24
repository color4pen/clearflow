# Test Cases: invoice-standalone

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

- **Total**: 34 cases
- **Automated** (unit/integration): 14
- **Manual**: 20
- **Priority**: must: 28, should: 6, could: 0

---

## ドメイン: invoiceTransition

### TC-001: overdue → paid 遷移の許可

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: overdue → paid 遷移の許可 > Scenario: overdue 状態の請求を paid に遷移する

---

### TC-002: overdue → paid 以外への遷移拒否

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: overdue → paid 遷移の許可 > Scenario: overdue から paid 以外への遷移は不可

---

### TC-003: paid → overdue 遷移の拒否

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-01（Acceptance Criteria）

**GIVEN** 請求のステータスが paid である  
**WHEN** `validateInvoiceTransition("paid", "overdue")` を呼び出す  
**THEN** `{ ok: false, reason: "..." }` が返される

---

## ユースケース: updateInvoiceStatus

### TC-004: paidAt 指定で入金確認

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: updateInvoiceStatus の paidAt パラメータ > Scenario: paidAt を指定して入金確認する

---

### TC-005: paidAt 未指定で入金確認（現在日時フォールバック）

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: updateInvoiceStatus の paidAt パラメータ > Scenario: paidAt 未指定で入金確認する

---

### TC-006: overdue から paidAt 指定で入金確認（ドメインイベント含む）

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: updateInvoiceStatus の paidAt パラメータ > Scenario: overdue から paidAt 指定で入金確認する

---

## ユースケース: getInvoice

### TC-007: 存在する請求を取得

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: getInvoice ユースケース > Scenario: 存在する請求を取得する

---

### TC-008: 存在しない請求を取得

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: getInvoice ユースケース > Scenario: 存在しない請求を取得する

---

### TC-009: 異なる organizationId での取得拒否（マルチテナント分離）

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-03（Acceptance Criteria）

**GIVEN** `invoiceId` に対応する請求がデータベースに存在するが、その `organizationId` は呼び出し側と異なる  
**WHEN** `getInvoice({ invoiceId, organizationId: differentOrgId })` を呼び出す  
**THEN** `null` が返される

---

## 請求詳細ページ（/contracts/[id]/invoices/[invoiceId]）

### TC-010: 請求詳細ページの基本情報表示

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 請求詳細ページの表示 > Scenario: 請求詳細ページを表示する

---

### TC-011: contractId 不一致で 404

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 請求詳細ページの表示 > Scenario: URL の contractId と請求の contractId が不一致

---

### TC-012: 請求詳細ページのパンくずリスト

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: パンくずリスト > Scenario: 請求詳細ページのパンくずリスト

---

### TC-013: 契約へのリンク表示

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-04（Acceptance Criteria）

**GIVEN** ログインユーザーが有効な請求の詳細ページ（`/contracts/{contractId}/invoices/{invoiceId}`）を表示している  
**WHEN** ページが描画される  
**THEN** 紐づく契約詳細ページ（`/contracts/{contractId}`）へのリンクが表示される

---

### TC-014: 権限なしユーザーの操作ボタン非表示

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-04（Acceptance Criteria）

**GIVEN** `canPerform(role, "invoice", "changeStatus")` が false を返すロールを持つユーザーが、invoiced 状態の請求詳細ページを表示している  
**WHEN** ページが描画される  
**THEN** 「発行する」「入金確認」「期日超過にする」のいずれのボタンも表示されない

---

## ステータス操作ボタン（InvoiceActions）

### TC-015: scheduled 状態の操作ボタン

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: ステータスに応じた操作ボタン > Scenario: scheduled 状態の操作ボタン

---

### TC-016: invoiced 状態の操作ボタン

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: ステータスに応じた操作ボタン > Scenario: invoiced 状態の操作ボタン

---

### TC-017: overdue 状態の操作ボタン

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: ステータスに応じた操作ボタン > Scenario: overdue 状態の操作ボタン

---

### TC-018: paid 状態は操作ボタンなし

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: ステータスに応じた操作ボタン > Scenario: paid 状態は操作ボタンなし

---

### TC-019: 送信中は全ボタン disabled

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-05（Acceptance Criteria）

**GIVEN** invoiced 状態の請求詳細ページで「入金確認」ボタンが表示されている  
**WHEN** 「入金確認」ボタンを押し、Server Action の応答を待っている状態  
**THEN** ページ上のすべての操作ボタンが `disabled` 状態になる

---

## 入金確認ダイアログ

### TC-020: 入金確認ダイアログのデフォルト値で送信

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 入金確認時の入金日入力ダイアログ > Scenario: 入金確認ダイアログでデフォルト値を使用

---

### TC-021: 入金確認ダイアログで日付変更して送信

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 入金確認時の入金日入力ダイアログ > Scenario: 入金確認ダイアログで日付を変更

---

### TC-022: 未来日付の入金日は拒否

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 入金確認時の入金日入力ダイアログ > Scenario: 未来日付の入金日は拒否される

---

## 請求登録ページ（/contracts/[id]/invoices/new）

### TC-023: 請求の新規作成

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 請求登録ページ > Scenario: 請求を新規作成する

---

### TC-024: active でない契約では作成不可

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 請求登録ページ > Scenario: active でない契約では作成不可

---

### TC-025: 請求登録ページのパンくずリスト

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-06（Acceptance Criteria）

**GIVEN** active 状態の契約の請求登録ページ（`/contracts/{contractId}/invoices/new`）を表示している  
**WHEN** ページが描画される  
**THEN** 「契約一覧 > 契約詳細 > 請求登録」のパンくずリストが表示され、各階層が正しいリンクになっている

---

## 残り請求可能金額表示

### TC-026: 単発契約で残り請求可能金額を表示

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 単発契約の残り請求可能金額表示 > Scenario: 単発契約で残り請求可能金額を表示

---

### TC-027: 合計が契約金額を超過する入力でエラー

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 単発契約の残り請求可能金額表示 > Scenario: 合計が契約金額を超過する入力でエラー

---

### TC-028: recurring 契約では残り金額表示なし

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-07（Acceptance Criteria）

**GIVEN** `recurring` 種別の契約に紐づく請求登録ページ（`/contracts/{contractId}/invoices/new`）を表示している  
**WHEN** ページが描画される  
**THEN** 残り請求可能金額が表示されない

---

## バリデーション

### TC-029: 請求日が支払期日より後でエラー

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: バリデーション表示 > Scenario: 請求日が支払期日より後

---

## InvoiceSection 簡素化

### TC-030: 請求一覧から詳細ページへ遷移

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 契約詳細の請求セクション簡素化 > Scenario: 請求一覧から詳細ページへ遷移

---

### TC-031: 請求追加ボタンが登録ページへのリンクになる

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 契約詳細の請求セクション簡素化 > Scenario: 請求追加ボタンが登録ページへのリンクになる

---

### TC-032: InvoiceSection サマリー表示が維持される

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-08（Acceptance Criteria）

**GIVEN** invoiced・paid を含む複数の請求が紐づく契約の詳細ページを表示している  
**WHEN** 請求セクションを表示する  
**THEN** 請求済合計・入金済合計・未請求合計のサマリーが引き続き表示される

---

### TC-033: CreateInvoiceModal・InvoiceStatusButtons が削除される

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-08（Acceptance Criteria）

**GIVEN** `InvoiceSection.tsx` のソースコードと、削除対象ファイル一覧を確認する  
**WHEN** ファイルの内容とディレクトリを検査する  
**THEN** `CreateInvoiceModal` および `InvoiceStatusButtons` のインポートと使用が `InvoiceSection.tsx` に存在しない。また `CreateInvoiceModal.tsx` および `InvoiceStatusButtons.tsx` のファイル自体が存在しない

---

## Server Action

### TC-034: ステータス更新後の revalidatePath

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-09（Acceptance Criteria）

**GIVEN** `updateInvoiceStatusAction` が呼び出される  
**WHEN** ステータス更新が成功する  
**THEN** `/contracts/{contractId}/invoices/{invoiceId}` と `/contracts/{contractId}` の両パスに対して `revalidatePath` が呼び出される

---

## Result

```yaml
result: completed
total: 34
automated: 14
manual: 20
must: 28
should: 6
could: 0
blocked_reasons: []
```
