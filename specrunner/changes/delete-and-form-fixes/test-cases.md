# Test Cases: 削除機能とフォーム整備

## Summary

- **Total**: 38 cases
- **Automated** (unit/integration): 20
- **Manual**: 18
- **Priority**: must: 30, should: 8, could: 0

---

## A. 削除機能 — usecase ロジック（Scenario 由来）

### TC-001: 案件が紐づいている引き合いは削除できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: The system shall prevent deletion of an inquiry that has a linked deal > Scenario: Inquiry with a linked deal cannot be deleted

---

### TC-002: 案件が紐づいていない引き合いを削除できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: The system shall prevent deletion of an inquiry that has a linked deal > Scenario: Inquiry without a linked deal is deleted

---

### TC-003: 商談が紐づいている案件は削除できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: The system shall prevent deletion of a deal that has linked meetings or contracts > Scenario: Deal with meetings cannot be deleted

---

### TC-004: 契約が紐づいている案件は削除できない（商談なし）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: The system shall prevent deletion of a deal that has linked meetings or contracts > Scenario: Deal with contracts cannot be deleted

---

### TC-005: 商談・契約が紐づいていない案件を削除できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: The system shall prevent deletion of a deal that has linked meetings or contracts > Scenario: Deal without meetings or contracts is deleted

---

### TC-006: 案件削除時に deal_contacts が全件削除される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: The system shall auto-delete deal_contacts when a deal is deleted > Scenario: Deal contacts are removed on deal deletion

---

### TC-007: 引き合い経由の案件削除後に引き合いステータスが new に戻る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: The system shall revert the inquiry status to "new" when a deal created from that inquiry is deleted > Scenario: Inquiry status reverts to new after deal deletion

---

### TC-008: 請求が紐づいている契約は削除できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: The system shall prevent deletion of a contract that has linked invoices > Scenario: Contract with invoices cannot be deleted

---

### TC-009: 請求が紐づいていない契約を削除できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: The system shall prevent deletion of a contract that has linked invoices > Scenario: Contract without invoices is deleted

---

### TC-010: admin / manager 以外のユーザーが削除 Server Action を呼ぶと権限エラーが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Delete operations SHALL be restricted to admin and manager roles > Scenario: Non-admin/non-manager user attempts deletion

---

### TC-011: 削除成功時に監査ログが記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Delete operations SHALL record audit logs > Scenario: Audit log is recorded on successful deletion

---

### TC-020: organizationId が異なる場合は削除されない（テナント分離）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: All repository deleteById methods SHALL enforce tenant isolation > Scenario: Delete with wrong organizationId has no effect

---

## B. 削除ボタン表示制御（Scenario 由来 — UI）

### TC-012: 案件が紐づいていない引き合い詳細ページに削除ボタンが表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: Delete buttons SHALL only appear when no dependent entities exist > Scenario: Delete button shown for inquiry without deals

---

### TC-013: 案件が紐づいている引き合い詳細ページに削除ボタンが表示されない

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: Delete buttons SHALL only appear when no dependent entities exist > Scenario: Delete button hidden for inquiry with deals

---

## C. 案件フォーム担当者フィールド（Scenario 由来 — UI）

### TC-014: 案件作成フォームに営業担当・技術担当のプルダウンが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Deal create and edit forms SHALL include assigneeId and technicalLeadId fields > Scenario: Assignee fields appear on deal creation form

---

### TC-015: 案件編集フォームに営業担当・技術担当の既存値がデフォルト選択されている

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Deal create and edit forms SHALL include assigneeId and technicalLeadId fields > Scenario: Assignee fields appear on deal edit form with current values

---

## D. 商談作成フォーム ヒアリングデータ（Scenario 由来 — UI）

### TC-016: 種別が hearing の場合にヒアリング入力フィールドが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Meeting creation form SHALL show hearing data fields when type is "hearing" > Scenario: Hearing fields shown for hearing type

---

### TC-017: 種別が hearing 以外の場合にヒアリング入力フィールドが表示されない

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: Meeting creation form SHALL show hearing data fields when type is "hearing" > Scenario: Hearing fields hidden for non-hearing type

---

## E. 商談編集ページ（Scenario 由来 — UI）

### TC-018: 商談編集ページに既存の値が初期表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: The system SHALL provide a meeting edit page > Scenario: Meeting edit page loads with existing data

---

### TC-019: 商談詳細ページに編集リンクが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: The system SHALL provide a meeting edit page > Scenario: Meeting detail page shows edit link

---

## F. リポジトリ層（非 Scenario 由来）

### TC-021: deleteAllByDeal — 対象が 0 件の場合に何もしない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** 案件 "D-X" に deal_contacts が存在しない状態で `deleteAllByDeal("D-X", organizationId)` を呼び出す
**WHEN** メソッドが実行される
**THEN** エラーなく正常終了し、DB に副作用がない

---

## G. deleteDeal usecase — トランザクション内実行順序（非 Scenario 由来）

### TC-022: deleteDeal — deal_contacts → 引き合いステータス復帰 → 案件削除 → 監査ログの順で実行される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** 引き合い経由の案件 "D-4" に deal_contacts が 1 件あり、商談・契約はない
**WHEN** `deleteDeal({ id: "D-4", organizationId, actorId })` が呼び出される
**THEN** 1) dealContacts 削除、2) 引き合いステータスを "new" に更新、3) deal 削除、4) 監査ログ記録 の順序で同一トランザクション内に実行される

---

### TC-023: 引き合い経由でない案件を削除した場合、引き合いステータス復帰処理をスキップする

**Category**: unit
**Priority**: should
**Source**: design.md > D3 / tasks.md > T-04

**GIVEN** `inquiryId` を持たない案件 "D-5" が存在し、商談・契約はない
**WHEN** `deleteDeal({ id: "D-5", organizationId, actorId })` が呼び出される
**THEN** 案件と deal_contacts が削除され、`inquiryRepository.updateStatus` は呼ばれない

---

## H. 削除ボタン表示制御（非 Scenario 由来 — UI）

### TC-024: 商談・契約が 0 件の案件詳細ページに削除ボタンが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** admin ユーザーが商談・契約を持たない案件の詳細ページを表示する
**WHEN** ページがレンダリングされる
**THEN** 削除ボタンが表示される

---

### TC-025: 商談が存在する案件詳細ページに削除ボタンが表示されない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** admin ユーザーが 1 件以上の商談を持つ案件の詳細ページを表示する
**WHEN** ページがレンダリングされる
**THEN** 削除ボタンが表示されない

---

### TC-026: 契約が存在する案件詳細ページに削除ボタンが表示されない（商談なし）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** admin ユーザーが商談 0 件・契約 1 件の案件の詳細ページを表示する
**WHEN** ページがレンダリングされる
**THEN** 削除ボタンが表示されない

---

### TC-027: 請求が 0 件の契約詳細ページに削除ボタンが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** admin ユーザーが請求を持たない契約の詳細ページを表示する
**WHEN** ページがレンダリングされる
**THEN** 削除ボタンが表示される

---

### TC-028: 請求が存在する契約詳細ページに削除ボタンが表示されない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** admin ユーザーが 1 件以上の請求を持つ契約の詳細ページを表示する
**WHEN** ページがレンダリングされる
**THEN** 削除ボタンが表示されない

---

## I. 削除後リダイレクト（非 Scenario 由来 — UI）

### TC-029: 削除成功後に一覧ページへリダイレクトされる

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06, T-07, T-08, T-09

**GIVEN** admin ユーザーが各エンティティの詳細ページで削除ボタンを押し確認ダイアログを承認する
**WHEN** 削除 Server Action が成功する
**THEN** 引き合いは `/inquiries`、案件は `/deals`、契約は `/contracts` にそれぞれリダイレクトされる

---

## J. ヒアリングデータ送信（非 Scenario 由来）

### TC-030: 種別 hearing で作成した商談のヒアリングデータがサーバーに送信される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** 種別「ヒアリング」を選択し、challenge / budget / decisionMaker / timeline / competitors / notes を入力してフォームを送信する
**WHEN** `createMeetingAction` が呼ばれる
**THEN** `hearingData` フィールドに JSON シリアライズされたヒアリング情報が含まれてサーバーに届く

---

## K. 商談編集ページ（非 Scenario 由来）

### TC-031: 商談編集ページで route の dealId と meeting.dealId が不一致の場合 notFound が返る

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** URL パラメータの `dealId` が "D-A" で、`meetingId` に対応する meeting の `dealId` が "D-B" である
**WHEN** `/deals/D-A/meetings/M-1/edit` にアクセスする
**THEN** `notFound()` が返り 404 レスポンスとなる

---

### TC-032: 商談編集フォームでアクションアイテムを追加・削除・内容変更・完了トグルできる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 既存のアクションアイテムを持つ商談の編集ページを表示する
**WHEN** アイテムの追加・削除・テキスト変更・完了チェックボックスのトグルを行い保存する
**THEN** `updateMeetingAction` に変更後の actionItems が渡り、商談詳細ページに更新内容が反映される

---

## L. 静的テスト（非 Scenario 由来 — T-13）

### TC-033: 静的テスト — 各 deleteById メソッドに organizationId 条件が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** `inquiryRepository.ts` / `dealRepository.ts` / `contractRepository.ts` のソースファイル
**WHEN** `projectStructure.test.ts` の静的テストが実行される
**THEN** 各 `deleteById` のソース文字列に `organizationId` が含まれることが検証される

---

### TC-034: 静的テスト — 削除 usecase の依存チェックが deleteById より前に記述されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** `deleteInquiry.ts` / `deleteDeal.ts` / `deleteContract.ts` のソースファイル
**WHEN** `projectStructure.test.ts` の静的テストが実行される
**THEN** 各依存チェックメソッド（`findByInquiryId` / `findAllByDeal` / `findAllByDealId` / `findAllByContract`）がソース内で `deleteById` より前の位置に出現することが検証される

---

### TC-035: 静的テスト — 削除 Server Action に admin / manager ロールガードが含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** `inquiries.ts` / `deals.ts` / `contracts.ts` の Server Action ファイル
**WHEN** `projectStructure.test.ts` の静的テストが実行される
**THEN** 各削除 Action のソースにロールチェック（`role !== "admin"` と `"manager"` に関する条件分岐）が含まれることが検証される

---

### TC-036: 静的テスト — 削除 usecase に auditLogRepository.create が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** `deleteInquiry.ts` / `deleteDeal.ts` / `deleteContract.ts` のソースファイル
**WHEN** `projectStructure.test.ts` の静的テストが実行される
**THEN** 各 usecase のソースに `auditLogRepository.create` が含まれることが検証される

---

## M. ビルド・型チェック（非 Scenario 由来）

### TC-037: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** 全タスクの実装が完了した状態
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーなく完了する

---

### TC-038: typecheck が green になる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** 全タスクの実装が完了した状態
**WHEN** `bunx tsc --noEmit` を実行する
**THEN** 型エラーが 0 件となる

---

## Result

```yaml
result: completed
total: 38
automated: 20
manual: 18
must: 30
should: 8
could: 0
blocked_reasons: []
```
