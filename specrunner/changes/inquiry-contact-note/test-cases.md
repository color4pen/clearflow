# Test Cases: 引合の問い合わせ内容フィールド追加

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

- **Total**: 26 cases
- **Automated** (unit/integration): 15
- **Manual**: 11
- **Priority**: must: 22, should: 4, could: 0

---

## DB / Migration

### TC-001: マイグレーション適用後に contact_note カラムが存在する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: inquiries テーブルに contact_note カラムが存在する > Scenario: マイグレーション適用後にカラムが存在する

---

### TC-002: 既存行にマイグレーションが影響を与えない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: inquiries テーブルに contact_note カラムが存在する > Scenario: 既存行に影響がない

---

## Domain Model

### TC-003: Inquiry 型定義に contactNote が含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Inquiry モデル型に contactNote が含まれる > Scenario: 型定義に contactNote が含まれる

---

## Repository

### TC-004: mapRow が contact_note を contactNote にマッピングする

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03: inquiryRepository の mapRow / create / update を更新する

**GIVEN** inquiries テーブルの行に `contact_note = "メール原文テスト"` が格納されている
**WHEN** `mapRow` 関数でその行を変換する
**THEN** 戻り値の `contactNote` が `"メール原文テスト"` であり、`null` 行では `null` が返る

---

### TC-005: create が contactNote を INSERT に含める

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: inquiryRepository の mapRow / create / update を更新する

**GIVEN** `contactNote: "電話メモ"` を含む引合データを用意する
**WHEN** `inquiryRepository.create(data)` を呼び出す
**THEN** DB の該当行の `contact_note` が `"電話メモ"` で保存される

---

### TC-006: update で contactNote フィールドが更新される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: inquiryRepository の mapRow / create / update を更新する

**GIVEN** `contactNote: null` の既存引合が存在する
**WHEN** `inquiryRepository.update(id, { contactNote: "更新後メモ" })` を呼び出す
**THEN** DB の該当行の `contact_note` が `"更新後メモ"` に更新される

---

## UseCase

### TC-007: createInquiry が contactNote をリポジトリに渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04: createInquiry ユースケースを更新する

**GIVEN** `contactNote: "問い合わせ内容"` を含む入力データを用意する
**WHEN** `createInquiry(data)` を呼び出す
**THEN** `inquiryRepository.create` が `contactNote: "問い合わせ内容"` を含む引数で呼ばれる

---

### TC-008: updateInquiry が contactNote を updatePayload に含める

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05: updateInquiry ユースケースを更新する

**GIVEN** `contactNote: "変更後メモ"` を含む更新データを用意する
**WHEN** `updateInquiry(id, data)` を呼び出す
**THEN** `inquiryRepository.update` が `contactNote: "変更後メモ"` を含む payload で呼ばれる

---

## Server Action

### TC-009: createInquirySchema に contactNote が定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06: createInquiryAction / updateInquiryAction を更新する

**GIVEN** `src/app/actions/inquiries.ts` の `createInquirySchema` を参照する
**WHEN** スキーマのフィールド定義を確認する
**THEN** `contactNote: z.string().optional()` が存在する

---

### TC-010: createInquiryAction が formData の contactNote をユースケースに渡す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06: createInquiryAction / updateInquiryAction を更新する

**GIVEN** `contactNote = "フォーム送信内容"` を含む FormData を作成する
**WHEN** `createInquiryAction(prevState, formData)` を呼び出す
**THEN** `createInquiry` が `contactNote: "フォーム送信内容"` を含む引数で呼ばれ、正常に完了する

---

### TC-011: updateInquiryAction が formData の contactNote をユースケースに渡す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06: createInquiryAction / updateInquiryAction を更新する

**GIVEN** 既存引合 ID と `contactNote = "更新メモ"` を含む FormData を作成する
**WHEN** `updateInquiryAction(prevState, formData)` を呼び出す
**THEN** `updateInquiry` が `contactNote: "更新メモ"` を含む引数で呼ばれ、正常に完了する

---

## UI: 引合登録フォーム

### TC-012: 登録フォームに「問い合わせ内容」テキストエリアがある

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引合登録フォームで contactNote を入力できる > Scenario: 登録フォームに「問い合わせ内容」テキストエリアがある

---

### TC-013: 登録フォームの「内容」ラベルが「概要」に変更されている

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引合登録フォームで contactNote を入力できる > Scenario: 登録フォームの既存「内容」ラベルが「概要」に変更されている

---

### TC-014: contactNote を入力して引合を登録できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引合登録フォームで contactNote を入力できる > Scenario: contactNote を入力して登録できる

---

### TC-015: 登録フォームで「問い合わせ内容」が「概要」の上に配置されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07: 引合登録フォーム（InquiryForm）を更新する

**GIVEN** 引合登録フォームを表示する
**WHEN** フォームのフィールド順序を確認する
**THEN** 「問い合わせ内容」の Textarea が「概要」の Textarea より上に表示されている

---

## UI: 引合詳細表示

### TC-016: 詳細画面に問い合わせ内容が表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引合詳細に問い合わせ内容が表示される > Scenario: 詳細画面に問い合わせ内容が表示される

---

### TC-017: 問い合わせ内容が概要の上に表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引合詳細に問い合わせ内容が表示される > Scenario: 問い合わせ内容が概要の上に表示される

---

### TC-018: contactNote が null の場合はハイフンが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引合詳細に問い合わせ内容が表示される > Scenario: contactNote が null の場合はハイフンが表示される

---

## UI: 引合詳細編集

### TC-019: 編集フォームに contactNote フィールドがある

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引合詳細で問い合わせ内容を編集できる > Scenario: 編集フォームに contactNote フィールドがある

---

### TC-020: contactNote を編集して保存できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引合詳細で問い合わせ内容を編集できる > Scenario: contactNote を編集して保存できる

---

### TC-021: 編集フォームで「問い合わせ内容」が「概要」の上に配置されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09: 引合詳細編集（InquiryInfoSection）を更新する

**GIVEN** 引合詳細で編集モードに切り替える
**WHEN** 編集フォームのフィールド順序を確認する
**THEN** 「問い合わせ内容」の Textarea が「概要」の Textarea より上に表示されている

---

## Integration: 顧客変更時のデータ保持

### TC-022: 顧客変更後に contactNote が保持される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 顧客変更時に contactNote が消えない > Scenario: 顧客変更後に contactNote が保持される

---

### TC-023: InquiryCustomerSection が null の contactNote をスキップする

**Category**: unit
**Priority**: should
**Source**: design.md > D5: InquiryCustomerSection の updateInquiryAction 呼び出しに contactNote を追加する

**GIVEN** `inquiryContactNote = null` の引合で InquiryCustomerSection を描画する
**WHEN** 顧客の保存ボタンを押下する（handleSave が実行される）
**THEN** FormData に `contactNote` キーがセットされず、updateInquiryAction が問題なく完了する

---

## Build

### TC-024: 型チェックが通る

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: typecheck と test が green である > Scenario: 型チェックが通る

---

### TC-025: テストが通る

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: typecheck と test が green である > Scenario: テストが通る

---

### TC-026: ビルドが成功する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-11: 最終検証

**GIVEN** 全ての変更が適用されている
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーなしで exit 0 で完了する

---

## Result

```yaml
result: completed
total: 26
automated: 15
manual: 11
must: 22
should: 4
could: 0
blocked_reasons: []
```
