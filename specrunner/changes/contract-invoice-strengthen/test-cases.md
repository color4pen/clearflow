# Test Cases: 契約・請求モデルの強化

## Summary

- **Total**: 37 cases
- **Automated** (unit/integration): 32
- **Manual**: 5
- **Priority**: must: 28, should: 9, could: 0

---

## Unit: 契約バリデーション関数

### TC-001: validateContractAmount — amount = 0 はエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `validateContractAmount` 関数が存在する
**WHEN** `validateContractAmount(0)` を呼び出す
**THEN** `{ ok: false }` が返り、reason に説明文字列が含まれる

---

### TC-002: validateContractAmount — amount = -1 はエラーを返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `validateContractAmount` 関数が存在する
**WHEN** `validateContractAmount(-1)` を呼び出す
**THEN** `{ ok: false }` が返る

---

### TC-003: validateContractAmount — amount = 1 は成功を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `validateContractAmount` 関数が存在する
**WHEN** `validateContractAmount(1)` を呼び出す
**THEN** `{ ok: true }` が返る

---

### TC-004: validateContractDates — startDate > endDate はエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `validateContractDates` 関数が存在する
**WHEN** `validateContractDates(new Date('2026-07-01'), new Date('2026-06-01'))` を呼び出す
**THEN** `{ ok: false }` が返る

---

### TC-005: validateContractDates — startDate = endDate は成功を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `validateContractDates` 関数が存在する
**WHEN** `validateContractDates(new Date('2026-07-01'), new Date('2026-07-01'))` を呼び出す
**THEN** `{ ok: true }` が返る

---

### TC-006: validateContractDates — endDate = null の場合は成功を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `validateContractDates` 関数が存在する
**WHEN** `validateContractDates(new Date('2026-07-01'), null)` を呼び出す
**THEN** `{ ok: true }` が返る

---

### TC-007: validateInvoiceDates — issueDate > dueDate はエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `validateInvoiceDates` 関数が存在する
**WHEN** `validateInvoiceDates(new Date('2026-08-01'), new Date('2026-07-01'))` を呼び出す
**THEN** `{ ok: false }` が返る

---

### TC-008: validateInvoiceDates — issueDate = dueDate は成功を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `validateInvoiceDates` 関数が存在する
**WHEN** `validateInvoiceDates(new Date('2026-07-01'), new Date('2026-07-01'))` を呼び出す
**THEN** `{ ok: true }` が返る

---

### TC-009: validateInvoiceDates — issueDate = null の場合は成功を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `validateInvoiceDates` 関数が存在する
**WHEN** `validateInvoiceDates(null, new Date('2026-07-01'))` を呼び出す
**THEN** `{ ok: true }` が返る

---

## Integration: 契約金額バリデーション

### TC-010: 契約作成時に amount = 0 がバリデーションエラーになる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 契約金額は正の整数でなければならない > Scenario: 契約作成時に amount = 0 がバリデーションエラーになる

---

### TC-011: 契約作成時に amount = -1 がバリデーションエラーになる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 契約金額は正の整数でなければならない > Scenario: 契約作成時に amount = -1 がバリデーションエラーになる

---

### TC-012: 契約更新時に amount を 0 に変更するとバリデーションエラーになる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 契約金額は正の整数でなければならない > Scenario: 契約更新時に amount を 0 に変更するとバリデーションエラーになる

---

### TC-013: 契約更新時に amount を含まない更新はバリデーションをスキップする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 契約金額は正の整数でなければならない > Scenario: 契約更新時に amount を含まない更新はバリデーションをスキップする

---

## Integration: 契約日付バリデーション

### TC-014: 契約作成時に startDate > endDate がバリデーションエラーになる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 契約の開始日は終了日以前でなければならない > Scenario: 契約作成時に startDate > endDate がバリデーションエラーになる

---

### TC-015: 契約作成時に startDate = endDate が許容される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 契約の開始日は終了日以前でなければならない > Scenario: 契約作成時に startDate = endDate が許容される

---

### TC-016: endDate が null の場合は startDate の検証をスキップする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 契約の開始日は終了日以前でなければならない > Scenario: endDate が null の場合は startDate の検証をスキップする

---

### TC-017: 契約更新時に startDate > endDate がバリデーションエラーになる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 契約の開始日は終了日以前でなければならない > Scenario: 契約更新時に startDate > endDate がバリデーションエラーになる

---

## Integration: 請求日付バリデーション

### TC-018: 請求作成時に issueDate > dueDate がバリデーションエラーになる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求予定日は支払期限以前でなければならない > Scenario: 請求作成時に issueDate > dueDate がバリデーションエラーになる

---

### TC-019: 請求作成時に issueDate = dueDate が許容される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 請求予定日は支払期限以前でなければならない > Scenario: 請求作成時に issueDate = dueDate が許容される

---

### TC-020: issueDate が null の場合は日付検証をスキップする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求予定日は支払期限以前でなければならない > Scenario: issueDate が null の場合は日付検証をスキップする

---

## Integration: 請求金額合計チェック（更新時）

### TC-021: 請求金額を増額して合計が契約金額を超えるとエラーになる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 単発契約の請求金額合計チェックは請求更新時にも適用される > Scenario: 請求金額を増額して合計が契約金額を超えるとエラーになる

---

### TC-022: 請求金額を増額しても合計が契約金額以内なら成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 単発契約の請求金額合計チェックは請求更新時にも適用される > Scenario: 請求金額を増額しても合計が契約金額以内なら成功する

---

### TC-023: 定期契約の請求金額更新は合計チェックをスキップする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 単発契約の請求金額合計チェックは請求更新時にも適用される > Scenario: 定期契約の請求金額更新は合計チェックをスキップする

---

## Integration: issueDate と invoicedAt の独立管理

### TC-024: 請求作成時に issueDate を設定できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: issueDate は請求予定日として機能し invoicedAt とは独立する > Scenario: 請求作成時に issueDate を設定できる

---

### TC-025: ステータスを invoiced に変更すると invoicedAt が記録されるが issueDate は変更されない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: issueDate は請求予定日として機能し invoicedAt とは独立する > Scenario: ステータスを invoiced に変更すると invoicedAt が記録されるが issueDate は変更されない

---

## Integration: updateInvoice ユースケース

### TC-026: updateInvoice — 監査ログが同一トランザクション内で記録される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** 有効な請求が存在し、`updateInvoice` usecase が実装されている
**WHEN** 任意のフィールドを更新する
**THEN** `auditLogRepository.create` が同一トランザクション内で呼ばれ、action = `"invoice.update"` で監査ログが記録される

---

## Integration: Server Action — 契約

### TC-027: createContractAction — amount が 0 以下の場合に Zod バリデーションエラーが返る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `createContractAction` が `createContractSchema` で `amount` を `positive()` として定義している
**WHEN** `amount = 0` または `amount` が未入力の FormData で `createContractAction` を呼び出す
**THEN** Zod バリデーションエラーが返され、`createContract` usecase は呼ばれない

---

### TC-028: createContractAction — startDate が未指定の場合に Zod バリデーションエラーが返る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `createContractAction` が `createContractSchema` で `startDate` を必須として定義している
**WHEN** `startDate` が未入力の FormData で `createContractAction` を呼び出す
**THEN** Zod バリデーションエラーが返され、`createContract` usecase は呼ばれない

---

### TC-029: updateContractAction — amount を空文字列で送ると undefined として扱われバリデーションをスキップする

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** `updateContractSchema` で `amount` が `z.coerce.number().int().positive().optional()` として定義されている
**WHEN** `amount = ""` の FormData で `updateContractAction` を呼び出す
**THEN** `amount` が `undefined` として扱われ、`updateContract` usecase が amount バリデーションなしで呼ばれる

---

## Integration: Server Action — 請求

### TC-030: createInvoiceAction — dueDate が未指定の場合にバリデーションエラーが返る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `createInvoiceAction` が `createInvoiceSchema` で `dueDate` を必須として定義している
**WHEN** `dueDate` が未入力の FormData で `createInvoiceAction` を呼び出す
**THEN** バリデーションエラーが返され、`createInvoice` usecase は呼ばれない

---

### TC-031: createInvoiceAction — issueDate を指定すると請求に格納される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** `createInvoiceAction` が `issueDate` フィールドを受け付けるよう実装されている
**WHEN** `issueDate = "2026-07-15"` を含む FormData で `createInvoiceAction` を呼び出す
**THEN** 作成された請求の `issueDate` が `2026-07-15` に設定される

---

### TC-032: updateInvoiceAction — 請求の金額を更新できる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `updateInvoiceAction` が `updateInvoice` usecase を呼び出すよう実装されている
**WHEN** `amount = 50000` を含む FormData で `updateInvoiceAction` を呼び出す
**THEN** `updateInvoice` usecase が呼ばれ、請求の amount が更新される

---

## Manual: マイグレーション検証

### TC-033: contracts.amount が null の既存レコードが 0 に設定される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 既存データのマイグレーションが安全に完了する > Scenario: contracts.amount が null の既存レコードが 0 に設定される

---

### TC-034: contracts.start_date が null の既存レコードが created_at に設定される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 既存データのマイグレーションが安全に完了する > Scenario: contracts.start_date が null の既存レコードが created_at に設定される

---

### TC-035: invoices.due_date が null の既存レコードに created_at + 30 日が設定される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 既存データのマイグレーションが安全に完了する > Scenario: invoices.due_date が null の既存レコードにデフォルト値が設定される

---

### TC-036: invoices テーブルに issue_date カラムが追加される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 既存データのマイグレーションが安全に完了する > Scenario: invoices テーブルに issue_date カラムが追加される

---

## Manual: ビルド検証

### TC-037: typecheck && test が exit 0 で完了する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 全タスクの実装が完了している
**WHEN** `bun run typecheck && bun run test` を実行する
**THEN** 型エラーなし・全テスト green で exit 0 が返る

---

## Result

```yaml
result: completed
total: 37
automated: 32
manual: 5
must: 28
should: 9
could: 0
blocked_reasons: []
```
