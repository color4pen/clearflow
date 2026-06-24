# Test Cases: 認可ルールの一元化と設計整合

## Summary

- **Total**: 63 cases
- **Automated** (unit/integration): 59
- **Manual**: 4
- **Priority**: must: 56, should: 7, could: 0

---

## canPerform — 基本動作

### TC-001: admin は全操作を実行できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: canPerform は権限マトリクスに基づいてロールの操作可否を判定する > Scenario: admin は全操作を実行できる

---

### TC-002: 定義されていない操作は拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: canPerform は権限マトリクスに基づいてロールの操作可否を判定する > Scenario: 定義されていない操作は拒否される

---

## 契約 (contract)

### TC-003: finance が契約を作成する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: finance ロールは契約の作成・編集・完了・解除を実行できる > Scenario: finance が契約を作成する

---

### TC-004: finance が契約ステータスを変更する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: finance ロールは契約の作成・編集・完了・解除を実行できる > Scenario: finance が契約ステータスを変更する

---

### TC-005: member は契約を作成できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: finance ロールは契約の作成・編集・完了・解除を実行できる > Scenario: member は契約を作成できない

---

### TC-045: finance が契約を編集できる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** role が "finance" である
**WHEN** `canPerform("finance", "contract", "edit")` を呼び出す
**THEN** `true` を返す

---

## 請求 (invoice)

### TC-006: finance が請求を作成する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 請求操作は admin と finance のみに許可される > Scenario: finance が請求を作成する

---

### TC-007: manager は請求を作成できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 請求操作は admin と finance のみに許可される > Scenario: manager は請求を作成できない

---

### TC-008: manager は請求ステータスを変更できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 請求操作は admin と finance のみに許可される > Scenario: manager は請求ステータスを変更できない

---

### TC-046: finance が請求のステータスを変更できる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** role が "finance" である
**WHEN** `canPerform("finance", "invoice", "changeStatus")` を呼び出す
**THEN** `true` を返す

---

## 案件 (deal)

### TC-009: member が案件を編集する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: member は案件の編集・通常フェーズ変更を実行できる > Scenario: member が案件を編集する

---

### TC-010: member が案件のフェーズを変更する（非終端）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: member は案件の編集・通常フェーズ変更を実行できる > Scenario: member が案件のフェーズを変更する（非終端）

---

### TC-011: member は案件を受注・失注できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: member は案件の編集・通常フェーズ変更を実行できる > Scenario: member は案件を受注・失注できない

---

### TC-012: member は案件を作成できない

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: member は案件の編集・通常フェーズ変更を実行できる > Scenario: member は案件を作成できない

---

### TC-018: admin が案件を削除する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 削除操作は admin のみに許可される > Scenario: admin が案件を削除する

---

### TC-019: manager は案件を削除できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 削除操作は admin のみに許可される > Scenario: manager は案件を削除できない

---

### TC-038: member が updateDealAction でフェーズ変更を含む更新を行う（非終端）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateDealAction でのフェーズ変更は追加の権限検証を行う > Scenario: member が updateDealAction でフェーズ変更を含む更新を行う（非終端）

---

### TC-039: member が updateDealAction で終端フェーズへの変更を含む更新を行う

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateDealAction でのフェーズ変更は追加の権限検証を行う > Scenario: member が updateDealAction で終端フェーズへの変更を含む更新を行う

---

## 引合 (inquiry)

### TC-013: member が引合を編集する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: member は引合の編集を実行できる > Scenario: member が引合を編集する

---

### TC-014: member は引合を案件化できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: member は引合の編集を実行できる > Scenario: member は引合を案件化できない

---

### TC-015: member は引合を見送りにできない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: member は引合の編集を実行できる > Scenario: member は引合を見送りにできない

---

### TC-020: manager は引合を削除できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 削除操作は admin のみに許可される > Scenario: manager は引合を削除できない

---

### TC-040: member が引合を見送りにする（action 層）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引合の見送り (declined) 遷移に認可チェックが追加される > Scenario: member が引合を見送りにする

---

### TC-041: manager が引合を見送りにする（action 層）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引合の見送り (declined) 遷移に認可チェックが追加される > Scenario: manager が引合を見送りにする

---

### TC-047: member が引合を作成できる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** role が "member" である
**WHEN** `canPerform("member", "inquiry", "create")` を呼び出す
**THEN** `true` を返す

---

### TC-048: finance は引合を作成できない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** role が "finance" である
**WHEN** `canPerform("finance", "inquiry", "create")` を呼び出す
**THEN** `false` を返す

---

## 顧客 (client)

### TC-016: member が顧客担当者を追加する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: member は顧客担当者の追加・編集を実行できる > Scenario: member が顧客担当者を追加する

---

### TC-017: member が顧客担当者を編集する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: member は顧客担当者の追加・編集を実行できる > Scenario: member が顧客担当者を編集する

---

### TC-049: member が顧客を作成できる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** role が "member" である
**WHEN** `canPerform("member", "client", "create")` を呼び出す
**THEN** `true` を返す

---

### TC-050: member が顧客を編集できる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** role が "member" である
**WHEN** `canPerform("member", "client", "edit")` を呼び出す
**THEN** `true` を返す

---

### TC-051: finance は顧客を作成できない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** role が "finance" である
**WHEN** `canPerform("finance", "client", "create")` を呼び出す
**THEN** `false` を返す

---

### TC-052: admin と manager が顧客担当者を削除できる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** role が "admin" または "manager" である
**WHEN** `canPerform(role, "client", "deleteContact")` を呼び出す
**THEN** `true` を返す

---

### TC-053: member は顧客担当者を削除できない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** role が "member" である
**WHEN** `canPerform("member", "client", "deleteContact")` を呼び出す
**THEN** `false` を返す

---

### TC-054: finance は顧客担当者を削除できない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** role が "finance" である
**WHEN** `canPerform("finance", "client", "deleteContact")` を呼び出す
**THEN** `false` を返す

---

## 削除操作 (delete)

### TC-021: manager は契約を削除できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 削除操作は admin のみに許可される > Scenario: manager は契約を削除できない

---

## 委任 (delegation / approvalSettings)

### TC-022: manager が委任を作成する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 委任操作は admin / manager / finance に許可される > Scenario: manager が委任を作成する

---

### TC-023: finance が委任を作成する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 委任操作は admin / manager / finance に許可される > Scenario: finance が委任を作成する

---

### TC-024: member は委任を作成できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 委任操作は admin / manager / finance に許可される > Scenario: member は委任を作成できない

---

### TC-025: manager が自身以外の委任を作成しようとする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 委任操作は admin / manager / finance に許可される > Scenario: manager が自身以外の委任を作成しようとする

---

### TC-026: manager が自身の委任を無効化する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 委任操作は admin / manager / finance に許可される > Scenario: manager が自身の委任を無効化する

---

### TC-027: manager が他ユーザーの委任を無効化しようとする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 委任操作は admin / manager / finance に許可される > Scenario: manager が他ユーザーの委任を無効化しようとする

---

### TC-028: finance が自身の委任を無効化する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 委任操作は admin / manager / finance に許可される > Scenario: finance が自身の委任を無効化する

---

### TC-029: admin が他ユーザーの委任を無効化する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 委任操作は admin / manager / finance に許可される > Scenario: admin が他ユーザーの委任を無効化する

---

### TC-030: admin 以外が委任一覧を取得すると自身の委任のみが返される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 委任操作は admin / manager / finance に許可される > Scenario: admin 以外が委任一覧を取得すると自身の委任のみが返される

---

### TC-031: finance が委任一覧を取得すると自身の委任のみが返される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 委任操作は admin / manager / finance に許可される > Scenario: finance が委任一覧を取得すると自身の委任のみが返される

---

### TC-032: admin が委任一覧を取得すると全委任が返される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 委任操作は admin / manager / finance に許可される > Scenario: admin が委任一覧を取得すると全委任が返される

---

## テンプレート・ユーザー一覧 (approvalSettings / organization)

### TC-033: manager がテンプレート一覧を閲覧する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: テンプレート一覧とユーザー一覧は manager にも許可される > Scenario: manager がテンプレート一覧を閲覧する

---

### TC-034: manager がユーザー一覧を閲覧する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: テンプレート一覧とユーザー一覧は manager にも許可される > Scenario: manager がユーザー一覧を閲覧する

---

### TC-035: finance はテンプレート一覧を閲覧できない

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: テンプレート一覧とユーザー一覧は manager にも許可される > Scenario: finance はテンプレート一覧を閲覧できない

---

### TC-055: テンプレートの作成・編集・削除は admin のみ許可される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** role が "admin" である
**WHEN** `canPerform("admin", "approvalSettings", "createTemplate")`, `canPerform("admin", "approvalSettings", "editTemplate")`, `canPerform("admin", "approvalSettings", "deleteTemplate")` を順に呼び出す
**THEN** すべて `true` を返す

---

### TC-056: manager はテンプレートを作成できない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** role が "manager" である
**WHEN** `canPerform("manager", "approvalSettings", "createTemplate")` を呼び出す
**THEN** `false` を返す

---

### TC-057: ロール変更は admin のみ許可される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** role が "admin" である
**WHEN** `canPerform("admin", "organization", "changeRole")` を呼び出す
**THEN** `true` を返す

---

### TC-058: manager はロール変更できない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** role が "manager" である
**WHEN** `canPerform("manager", "organization", "changeRole")` を呼び出す
**THEN** `false` を返す

---

## webhook 操作 (organization)

### TC-059: admin のみ webhook 操作が許可される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** role が "admin" である
**WHEN** `canPerform("admin", "organization", "manageWebhooks")` を呼び出す
**THEN** `true` を返す

---

### TC-060: manager は webhook 操作できない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** role が "manager" である
**WHEN** `canPerform("manager", "organization", "manageWebhooks")` を呼び出す
**THEN** `false` を返す

---

## 商談記録 (meeting)

### TC-042: member が商談記録を作成する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 商談記録の作成は member にも許可される > Scenario: member が商談記録を作成する

---

### TC-043: member が商談記録を編集する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 商談記録の作成は member にも許可される > Scenario: member が商談記録を編集する

---

### TC-044: finance は商談記録を作成できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 商談記録の作成は member にも許可される > Scenario: finance は商談記録を作成できない

---

## 認可チェックの置換・統一

### TC-036: アクションが認可失敗時に統一メッセージを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全アクションのインライン認可チェックが canPerform 呼び出しに置換される > Scenario: アクションが認可失敗時に統一メッセージを返す

---

### TC-037: contracts.ts の認可チェックが canPerform を使用する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 全アクションのインライン認可チェックが canPerform 呼び出しに置換される > Scenario: contracts.ts の認可チェックが canPerform を使用する

---

### TC-061: 全アクションファイルに canPerform import が存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, T-11, T-12

**GIVEN** contracts.ts, invoices.ts, deals.ts, inquiries.ts, clients.ts, delegations.ts, templates.ts, users.ts, meetings.ts, webhooks.ts の各ファイル
**WHEN** ソースコードを確認する
**THEN** 各ファイルが `canPerform` を `@/domain/authorization` から import しており、`session.user.role !== "admin" && session.user.role !== "manager"` および `session.user.role !== "admin"` の単純インライン判定パターンが存在しない

---

## ビルド・テスト整合性

### TC-062: bun test が全件 green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** 全タスク実装が完了した状態
**WHEN** `bun test` を実行する
**THEN** すべてのテストが pass し、`authorization.test.ts` と更新後の `roleCheck.test.ts` を含めて 0 failures

---

### TC-063: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** 全タスク実装が完了した状態
**WHEN** `bun run build` を実行する
**THEN** typecheck を含むビルドがエラーなく完了する

---

## Result

```yaml
result: completed
total: 63
automated: 59
manual: 4
must: 56
should: 7
could: 0
blocked_reasons: []
```
