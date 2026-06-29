# Test Cases: interaction-contract-invoice

## Summary

- **Total**: 29 cases
- **Automated** (unit/integration): 24
- **Manual**: 5
- **Priority**: must: 17, should: 11, could: 1

---

## Contract Adjustment — 作成・監査

### TC-001: 契約調整の記録で Interaction が作成され監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Contract adjustment interactions SHALL be created with kind=contract_adjustment and contractId > Scenario: Recording a contract adjustment creates an Interaction

---

### TC-002: contractId なしで契約調整を試みると失敗する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Contract adjustment interactions SHALL be created with kind=contract_adjustment and contractId > Scenario: Contract adjustment requires contractId

---

### TC-003: 存在しない contractId で契約調整を試みると失敗する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Contract adjustment interactions SHALL be created with kind=contract_adjustment and contractId > Scenario: Contract adjustment requires an existing contract

---

## Invoice Adjustment — 作成・監査

### TC-004: 請求調整の記録で Interaction が作成され監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Invoice adjustment interactions SHALL be created with kind=invoice_adjustment and invoiceId > Scenario: Recording an invoice adjustment creates an Interaction

---

### TC-005: invoiceId なしで請求調整を試みると失敗する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Invoice adjustment interactions SHALL be created with kind=invoice_adjustment and invoiceId > Scenario: Invoice adjustment requires invoiceId

---

### TC-006: 存在しない invoiceId で請求調整を試みると失敗する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Invoice adjustment interactions SHALL be created with kind=invoice_adjustment and invoiceId > Scenario: Invoice adjustment requires an existing invoice

---

## 一覧取得 — findAllByContract / findAllByInvoice

### TC-007: 契約に紐づく顧客接点が日付降順で一覧取得できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Interaction listing by contract and invoice SHALL return associated interactions > Scenario: Listing interactions by contract

---

### TC-008: 請求に紐づく顧客接点が日付降順で一覧取得できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Interaction listing by contract and invoice SHALL return associated interactions > Scenario: Listing interactions by invoice

---

### TC-009: 顧客接点が存在しない契約では空配列が返る

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Interaction listing by contract and invoice SHALL return associated interactions > Scenario: No interactions for contract returns empty array

---

### TC-010: 顧客接点が存在しない請求では空配列が返る

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** 請求 I-999 に対する Interaction が存在しない
**WHEN** `findAllByInvoice("I-999", orgId)` を呼び出す
**THEN** 空配列が返る

---

## 認可 — contract_adjustment

### TC-011: admin ユーザーは契約調整を記録できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Authorization for contract adjustment SHALL allow admin/manager/member > Scenario: Admin records contract adjustment

---

### TC-012: finance ユーザーは契約調整を記録できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Authorization for contract adjustment SHALL allow admin/manager/member > Scenario: Finance user denied contract adjustment

---

### TC-013: manager / member ユーザーは契約調整を記録できる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** role が `manager` または `member` のユーザー
**WHEN** `canPerform(role, "interaction", "recordContractAdjustment")` を呼び出す
**THEN** `true` が返る（manager: true、member: true）

---

## 認可 — invoice_adjustment

### TC-014: finance ユーザーは請求調整を記録できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Authorization for invoice adjustment SHALL allow admin/manager/finance > Scenario: Finance user records invoice adjustment

---

### TC-015: member ユーザーは請求調整を記録できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Authorization for invoice adjustment SHALL allow admin/manager/finance > Scenario: Member user denied invoice adjustment

---

### TC-016: admin / manager ユーザーは請求調整を記録できる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** role が `admin` または `manager` のユーザー
**WHEN** `canPerform(role, "interaction", "recordInvoiceAdjustment")` を呼び出す
**THEN** `true` が返る（admin: true、manager: true）

---

## タイムライン統合 — getDealActivity

### TC-017: 契約に紐づく contract_adjustment が案件タイムラインに含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Deal activity timeline SHALL include contract and invoice interactions > Scenario: Contract adjustment appears in deal timeline

---

### TC-018: 請求に紐づく invoice_adjustment が案件タイムラインに含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Deal activity timeline SHALL include contract and invoice interactions > Scenario: Invoice adjustment appears in deal timeline

---

### TC-019: getDealActivity の targetInfoMap に契約・請求顧客接点のラベルと href が登録される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** 案件に契約 C-001 が紐づき、C-001 に contract_adjustment Interaction が存在する
**WHEN** `getDealActivity(dealId, orgId)` を呼び出す
**THEN** `targetInfoMap` にその interaction の targetId をキーとするエントリが存在し、label と href が設定されている

---

## Server Action

### TC-020: 未認証ユーザーが記録 Action を呼ぶと認証エラーが返る

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** 認証セッションが存在しない
**WHEN** `recordContractAdjustmentAction` または `recordInvoiceAdjustmentAction` を呼び出す
**THEN** `{ message: "認証が必要です" }` 相当のエラーが返り、usecase は呼ばれない

---

### TC-021: 認可不足のユーザーが記録 Action を呼ぶと権限エラーが返る

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** 認証済みだが role が許可されていないユーザー（例: contract_adjustment に対して finance）
**WHEN** 対応する記録 Action を呼び出す
**THEN** `{ message: "この操作を実行する権限がありません" }` 相当のエラーが返り、usecase は呼ばれない

---

### TC-022: 必須フィールド欠損で記録 Action を呼ぶとバリデーションエラーが返る

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** 認証・認可済みのユーザー
**WHEN** `summary` が空文字または `contractId`/`invoiceId` が UUID 形式でない入力で Action を呼び出す
**THEN** フィールドレベルのバリデーションエラーが返り、usecase は呼ばれない

---

### TC-023: 正常入力で記録 Action を呼ぶと usecase が実行されパスが revalidate される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** 認証・認可済みのユーザーと有効な contractId / summary
**WHEN** `recordContractAdjustmentAction` を呼び出す
**THEN** `createContractAdjustment` usecase が呼ばれ、`revalidatePath` が実行され、`{}` が返る

---

## UI — 契約詳細ページ

### TC-024: 契約詳細ページに「契約調整（やり取り）」セクションが表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: Contract detail page SHALL display contract adjustment section > Scenario: Contract detail shows interaction list and form

---

### TC-025: 権限のないユーザーには記録フォームが表示されない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `canRecord=false` のユーザーが契約詳細ページを表示している
**WHEN** 「契約調整（やり取り）」セクションを確認する
**THEN** 記録フォームは表示されず、顧客接点の一覧表示のみが見える

---

### TC-026: 契約調整が存在しない場合に空状態メッセージが表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-07

**GIVEN** 契約に対する contract_adjustment Interaction が存在しない
**WHEN** 契約詳細ページの「契約調整（やり取り）」セクションを確認する
**THEN** 「やり取りはまだありません」等の空状態メッセージが表示される

---

## UI — 請求詳細ページ

### TC-027: 請求詳細ページに「請求調整（やり取り）」セクションが表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: Invoice detail page SHALL display invoice adjustment section > Scenario: Invoice detail shows interaction list and form

---

## ビルド・型チェック

### TC-028: typecheck と build が成功し既存テストが壊れない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 本変更のすべての実装が完了した状態
**WHEN** `bun run typecheck` および `bun run build` および `bun test` を実行する
**THEN** 型エラー・ビルドエラーがなく、既存テストを含む全テストが green で通過する

---

### TC-029: 既存テストは変更なしで green を維持する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 本変更の実装前後で既存の `.dynamic.test.ts` / `.test.ts` ファイルの内容が変わっていない（dealActivity.dynamic.test.ts へのケース追加を除く）
**WHEN** `bun test` を実行する
**THEN** 既存テストはすべて green のまま通過し、新規テストも green である

---

## Result

```yaml
result: completed
total: 29
automated: 24
manual: 5
must: 17
should: 11
could: 1
blocked_reasons: []
```
