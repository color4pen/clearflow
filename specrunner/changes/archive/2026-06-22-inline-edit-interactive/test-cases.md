# Test Cases: 詳細画面のインタラクティブ編集

## Summary

- **Total**: 42 cases
- **Automated** (unit/integration): 18
- **Manual**: 24
- **Priority**: must: 33, should: 6, could: 3

---

## 汎用インライン編集コンポーネント

### TC-001: InlineEditText が表示→編集→保存のライフサイクルを持つ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 汎用インライン編集コンポーネントが存在する > Scenario: InlineEditText が表示→編集→保存のライフサイクルを持つ

### TC-002: InlineEditTextarea がブラーでは保存しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 汎用インライン編集コンポーネントが存在する > Scenario: InlineEditTextarea がブラーでは保存しない

### TC-003: InlineEditSelect が値変更で即保存する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 汎用インライン編集コンポーネントが存在する > Scenario: InlineEditSelect が値変更で即保存する

### TC-004: editable=false のとき編集不可

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 汎用インライン編集コンポーネントが存在する > Scenario: editable=false のとき編集不可

### TC-005: InlineEditMoney が金額をカンマ区切り+円マークで表示する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InlineEditMoney が金額をカンマ区切り+円マークで表示する > Scenario: 金額の表示フォーマット

### TC-006: InlineEditMoney の null 値表示

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InlineEditMoney が金額をカンマ区切り+円マークで表示する > Scenario: null 値の表示

### TC-007: InlineEditText — Escape でキャンセルする

**Category**: unit
**Priority**: should

**Source**: tasks.md > T-01

**GIVEN** InlineEditText が編集モードで値が変更されている
**WHEN** Escape キーを押す
**THEN** onSave は呼ばれず、編集前の値に復帰して表示モードに戻る

### TC-008: InlineEditText — onSave 失敗時にエラーメッセージを表示する

**Category**: unit
**Priority**: should

**Source**: tasks.md > T-01

**GIVEN** InlineEditText が編集モードで、onSave が `{ success: false, message: "更新に失敗しました" }` を返す
**WHEN** Enter を押して保存を試みる
**THEN** フィールド下部に赤字でエラーメッセージが表示され、編集モードが維持される

### TC-009: InlineEditText — 空文字の場合に placeholder または `-` を薄色表示する

**Category**: unit
**Priority**: could

**Source**: tasks.md > T-01

**GIVEN** InlineEditText に `value=""` と `placeholder="未入力"` が渡されている
**WHEN** 表示モードでレンダリングする
**THEN** placeholder テキストまたは `-` が薄い色で表示される

### TC-010: InlineEditTextarea — キャンセルボタンで編集前の値に復帰する

**Category**: unit
**Priority**: must

**Source**: tasks.md > T-02

**GIVEN** InlineEditTextarea が編集モードで、テキストが変更されている
**WHEN** キャンセルボタンをクリックする
**THEN** onSave は呼ばれず、編集前の値に復帰して表示モードに戻る

### TC-011: InlineEditTextarea — Escape でキャンセルする

**Category**: unit
**Priority**: should

**Source**: tasks.md > T-02

**GIVEN** InlineEditTextarea が編集モードである
**WHEN** Escape キーを押す
**THEN** onSave は呼ばれず、編集前の値に復帰して表示モードに戻る

### TC-012: InlineEditTextarea — null 値で「未入力」プレースホルダーを表示する

**Category**: unit
**Priority**: could

**Source**: tasks.md > T-02

**GIVEN** InlineEditTextarea に `value=null` が渡されている
**WHEN** 表示モードでレンダリングする
**THEN** `placeholder` または「未入力」が薄い色で表示される

### TC-013: InlineEditSelect — onBeforeSave が false を返すと保存されず元の値に戻る

**Category**: unit
**Priority**: must

**Source**: tasks.md > T-03

**GIVEN** InlineEditSelect に `onBeforeSave` が設定されており、`false` を返すよう mock されている
**WHEN** Select で値を変更する
**THEN** onSave は呼ばれず、表示値が元の値に戻る

### TC-014: InlineEditDate — null 値で `-` が表示される

**Category**: unit
**Priority**: should

**Source**: tasks.md > T-04

**GIVEN** InlineEditDate に `value=null` が渡されている
**WHEN** 表示モードでレンダリングする
**THEN** `-` が表示される

### TC-015: InlineEditMoney — 数値入力後に Enter で onSave が呼ばれる

**Category**: unit
**Priority**: must

**Source**: tasks.md > T-05

**GIVEN** InlineEditMoney が編集モードで、数値が入力されている
**WHEN** Enter キーを押す
**THEN** onSave が数値文字列を引数として呼ばれる

---

## コンポーネント export

### TC-016: コンポーネントが index.ts から named import できる

**Category**: manual
**Priority**: must

**Source**: tasks.md > T-06

**GIVEN** 全変更が適用されている
**WHEN** `import { InlineEditText, InlineEditTextarea, InlineEditSelect, InlineEditDate, InlineEditMoney } from "@/app/components"` をコンパイルする
**THEN** import エラーなく解決される

---

## 引き合い詳細のインライン化

### TC-017: 引き合い詳細 — 件名のインライン編集

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引き合い詳細でフィールドがインライン編集できる > Scenario: 件名のインライン編集

### TC-018: 引き合い詳細 — member ロールで編集不可

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引き合い詳細でフィールドがインライン編集できる > Scenario: member ロールで編集不可

### TC-019: updateInquiryAction が member ロールに権限エラーを返す

**Category**: integration
**Priority**: must

**Source**: tasks.md > T-07

**GIVEN** member ロールのセッションで `updateInquiryAction` を呼び出す
**WHEN** 件名の更新リクエストを送信する
**THEN** `{ message: "権限がありません" }` が返され、データは更新されない

### TC-020: 引き合い詳細 — 流入経路を Select で変更すると即保存される

**Category**: manual
**Priority**: should

**Source**: tasks.md > T-07

**GIVEN** admin ロールで引き合い詳細ページを表示している
**WHEN** 流入経路の InlineEditSelect で値を変更する
**THEN** `updateInquiryAction` が呼ばれ、流入経路が更新される

### TC-021: 引き合い詳細 — 「編集」リンクが残っている

**Category**: manual
**Priority**: could

**Source**: tasks.md > T-07

**GIVEN** 引き合い詳細ページが表示されている
**WHEN** ページを確認する
**THEN** `/inquiries/[id]/edit` への「編集」リンクが存在する

---

## 案件詳細のインライン化

### TC-022: 案件詳細 — フェーズの won 選択時に確認ダイアログ

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細でフィールドがインライン編集できる > Scenario: フェーズの won 選択時に確認ダイアログ

### TC-023: 案件詳細 — フェーズの lost 選択時にも確認ダイアログ

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細でフィールドがインライン編集できる > Scenario: フェーズの lost 選択時にも確認ダイアログ

### TC-024: 案件詳細 — 想定金額のインライン編集

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細でフィールドがインライン編集できる > Scenario: 想定金額のインライン編集

### TC-025: 案件詳細 — フェーズ「交渉中」への変更は確認ダイアログなし

**Category**: manual
**Priority**: should

**Source**: tasks.md > T-08

**GIVEN** admin ロールで案件詳細を表示している
**WHEN** フェーズの InlineEditSelect で「交渉中」（won/lost 以外）を選択する
**THEN** `window.confirm` は表示されず、`updateDealAction` が即座に呼ばれる

---

## アクションアイテム集約セクション

### TC-026: 案件詳細 — アクションアイテムの集約表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細にアクションアイテム集約セクションが表示される > Scenario: アクションアイテムの集約表示

### TC-027: 案件詳細 — アクションアイテムの完了トグル

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細にアクションアイテム集約セクションが表示される > Scenario: アクションアイテムの完了トグル

### TC-028: 案件詳細 — 完了済みアイテムの未完了への切り戻し

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細にアクションアイテム集約セクションが表示される > Scenario: 完了済みアイテムの未完了への切り戻し

### TC-029: 案件詳細 — アクションアイテムが0件のとき

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細にアクションアイテム集約セクションが表示される > Scenario: アクションアイテムが0件のとき

### TC-030: updateMeetingAction が member ロールに権限エラーを返す

**Category**: integration
**Priority**: must

**Source**: tasks.md > T-09

**GIVEN** member ロールのセッションで `updateMeetingAction` を呼び出す
**WHEN** actionItems の更新リクエストを送信する
**THEN** `{ message: "権限がありません" }` が返され、データは更新されない

### TC-031: アクションアイテムトグルで対象 meetingId の全 actionItems を送信する

**Category**: integration
**Priority**: must

**Source**: design.md > D4

**GIVEN** 商談に3件の actionItems があり、index=1 の done を反転させる
**WHEN** DealActionItemsSection または MeetingActionItemsSection でチェックボックスをクリックする
**THEN** `updateMeetingAction` に送信される `actionItems` は3件全て含まれ、index=1 の done のみが反転している

### TC-032: 案件詳細 — member ロールでチェックボックスが disabled

**Category**: manual
**Priority**: must

**Source**: tasks.md > T-09

**GIVEN** member ロールで案件詳細ページを表示している
**WHEN** アクションアイテム集約セクションを確認する
**THEN** 全チェックボックスが `disabled` 属性を持ち、クリックしても状態が変化しない

---

## 契約詳細のインライン化

### TC-033: 契約詳細 — 金額のインライン編集

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 契約詳細でフィールドがインライン編集できる > Scenario: 金額のインライン編集

### TC-034: 契約詳細 — ステータス変更ボタンは既存のまま維持される

**Category**: manual
**Priority**: must

**Source**: tasks.md > T-10

**GIVEN** 契約詳細ページが表示されている
**WHEN** ページを確認する
**THEN** ステータス変更（完了/解約）ボタンが存在し、インライン編集に置き換えられていない

---

## 商談詳細のインライン化

### TC-035: 商談詳細 — 議事録のインライン編集

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 商談詳細で議事録とアクションアイテムが編集できる > Scenario: 議事録のインライン編集

### TC-036: 商談詳細 — アクションアイテムの完了トグル

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 商談詳細で議事録とアクションアイテムが編集できる > Scenario: アクションアイテムの完了トグル

### TC-037: 商談詳細 — member ロールで議事録は表示のみ、チェックボックスは disabled

**Category**: manual
**Priority**: must

**Source**: tasks.md > T-11

**GIVEN** member ロールで商談詳細ページを表示している
**WHEN** ページを確認する
**THEN** 議事録はテキスト表示のみでクリックしても編集モードにならず、アクションアイテムのチェックボックスは `disabled` である

---

## 権限制御

### TC-038: admin ロールでの各詳細ページアクセス

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 権限制御が正しく機能する > Scenario: admin ロールでのアクセス

### TC-039: member ロールでの各詳細ページアクセス

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 権限制御が正しく機能する > Scenario: member ロールでのアクセス

---

## ビルドと型チェック

### TC-040: ビルド成功

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ビルドと型チェックが成功する > Scenario: ビルド成功

### TC-041: 型チェック成功

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ビルドと型チェックが成功する > Scenario: 型チェック成功

### TC-042: bun test 全件 green

**Category**: manual
**Priority**: must

**Source**: tasks.md > T-12

**GIVEN** 全変更が適用されている
**WHEN** `bun test` を実行する
**THEN** 全テストが pass し、exit 0 で完了する

---

## Result

```yaml
result: completed
total: 42
automated: 18
manual: 24
must: 33
should: 6
could: 3
blocked_reasons: []
```
