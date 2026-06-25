# Spec: 引合の問い合わせ内容フィールド追加

## Requirements

### Requirement: inquiries テーブルに contact_note カラムが存在する

マイグレーションにより inquiries テーブルに `contact_note text` カラムが追加されている MUST。nullable であり、既存行は NULL のままである。

#### Scenario: マイグレーション適用後にカラムが存在する

**Given** マイグレーションが適用されている
**When** inquiries テーブルの構造を確認する
**Then** `contact_note` カラムが text 型・nullable で存在する

#### Scenario: 既存行に影響がない

**Given** inquiries テーブルに既存のデータが存在する
**When** マイグレーションを適用する
**Then** 既存行の contact_note は NULL であり、他のカラムの値は変更されない

### Requirement: Inquiry モデル型に contactNote が含まれる

`Inquiry` 型に `contactNote: string | null` プロパティが存在する MUST。

#### Scenario: 型定義に contactNote が含まれる

**Given** `src/domain/models/inquiry.ts` の `Inquiry` 型を参照する
**When** 型のプロパティを確認する
**Then** `contactNote: string | null` が定義されている

### Requirement: 引合登録フォームで contactNote を入力できる

InquiryForm に「問い合わせ内容」テキストエリアが表示される SHALL。既存の「内容」ラベルは「概要」に変更される SHALL。

#### Scenario: 登録フォームに「問い合わせ内容」テキストエリアがある

**Given** 引合登録フォームを表示する
**When** フォームのフィールドを確認する
**Then** 「問い合わせ内容」ラベルの Textarea が存在し、placeholder は「メール原文、電話メモなど」である

#### Scenario: 登録フォームの既存「内容」ラベルが「概要」に変更されている

**Given** 引合登録フォームを表示する
**When** description フィールドのラベルを確認する
**Then** ラベルが「概要」である

#### Scenario: contactNote を入力して登録できる

**Given** 引合登録フォームに全必須項目と contactNote を入力する
**When** 「登録する」ボタンを押下する
**Then** 引合が作成され、contactNote が保存される

### Requirement: 引合詳細に問い合わせ内容が表示される

InquiryInfoDisplay に contactNote が表示される SHALL。表示順序は「問い合わせ内容」が「概要」の上である MUST。

#### Scenario: 詳細画面に問い合わせ内容が表示される

**Given** contactNote が設定された引合が存在する
**When** 引合詳細画面を表示する
**Then** 「問い合わせ内容」ラベルで contactNote の値が表示される

#### Scenario: 問い合わせ内容が概要の上に表示される

**Given** contactNote と description が設定された引合が存在する
**When** 引合詳細画面を表示する
**Then** 「問い合わせ内容」行が「概要」行より上に表示される

#### Scenario: contactNote が null の場合はハイフンが表示される

**Given** contactNote が null の引合が存在する
**When** 引合詳細画面を表示する
**Then** 「問い合わせ内容」の値に「-」が表示される

### Requirement: 引合詳細で問い合わせ内容を編集できる

InquiryInfoSection の編集フォームに contactNote フィールドが含まれる SHALL。

#### Scenario: 編集フォームに contactNote フィールドがある

**Given** 引合詳細で編集モードに切り替える
**When** 編集フォームのフィールドを確認する
**Then** 「問い合わせ内容」ラベルの Textarea が表示される

#### Scenario: contactNote を編集して保存できる

**Given** 編集モードで contactNote を変更する
**When** 「保存」ボタンを押下する
**Then** contactNote の変更が保存され、詳細画面に反映される

### Requirement: 顧客変更時に contactNote が消えない

InquiryCustomerSection が updateInquiryAction を呼び出す際、既存の contactNote を formData に含める MUST。

#### Scenario: 顧客変更後に contactNote が保持される

**Given** contactNote が設定された引合で顧客を変更する
**When** 顧客の保存ボタンを押下する
**Then** contactNote が変更前の値のまま保持される

### Requirement: typecheck と test が green である

全変更を適用後、`bun run typecheck` と `bun test` が成功する MUST。

#### Scenario: 型チェックが通る

**Given** 全ての変更が適用されている
**When** `bun run typecheck` を実行する
**Then** 型エラーなしで完了する

#### Scenario: テストが通る

**Given** 全ての変更が適用されている
**When** `bun test` を実行する
**Then** テストが全て pass する
