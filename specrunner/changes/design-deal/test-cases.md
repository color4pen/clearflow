# Test Cases: design-deal

## Summary

- **Total**: 34 cases
- **Automated** (unit/integration): 2
- **Manual**: 32
- **Priority**: must: 20, should: 13, could: 1

---

### TC-001: パイプラインサマリの表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧ページにパイプラインサマリが表示される > Scenario: パイプラインサマリの表示

---

### TC-002: サマリセルクリックでフィルタ適用

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧ページにパイプラインサマリが表示される > Scenario: サマリセルクリックでフィルタ適用

---

### TC-003: フェーズフィルタ

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧のフィルタが 3 つの select ドロップダウンで構成される > Scenario: フェーズフィルタ

---

### TC-004: 顧客フィルタ

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧のフィルタが 3 つの select ドロップダウンで構成される > Scenario: 顧客フィルタ

---

### TC-005: 複合フィルタ

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 一覧のフィルタが 3 つの select ドロップダウンで構成される > Scenario: 複合フィルタ

---

### TC-006: テーブルカラムの構成

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧テーブルが 5 カラムで表示される > Scenario: テーブルカラムの構成

---

### TC-007: 想定金額のフォーマット

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 一覧テーブルが 5 カラムで表示される > Scenario: 想定金額のフォーマット

---

### TC-008: 2 カラムレイアウト

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細ページのレイアウトが 1.5fr:1fr の 2 カラムである > Scenario: 2 カラムレイアウト

---

### TC-009: 非終端フェーズでのボタン表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細ヘッダーに受注/失注ボタンが表示される > Scenario: 非終端フェーズでのボタン表示

---

### TC-010: 終端フェーズでのボタン非表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細ヘッダーに受注/失注ボタンが表示される > Scenario: 終端フェーズでのボタン非表示

---

### TC-011: 受注ボタンのクリック

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細ヘッダーに受注/失注ボタンが表示される > Scenario: 受注ボタンのクリック

---

### TC-012: 読み取りモードの初期表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 基本情報が読み取り表示で、編集ボタンでフォームに切り替わる > Scenario: 読み取りモードの初期表示

---

### TC-013: 編集モードへの切り替え

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 基本情報が読み取り表示で、編集ボタンでフォームに切り替わる > Scenario: 編集モードへの切り替え

---

### TC-014: 編集のキャンセル

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 基本情報が読み取り表示で、編集ボタンでフォームに切り替わる > Scenario: 編集のキャンセル

---

### TC-015: フェーズボタンの表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: フェーズ変更がボタン群で操作できる > Scenario: フェーズボタンの表示

---

### TC-016: フェーズボタンのクリック

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: フェーズ変更がボタン群で操作できる > Scenario: フェーズボタンのクリック

---

### TC-017: 担当者の表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 担当者セクションが名前+役割の flex レイアウトで表示される > Scenario: 担当者の表示

---

### TC-018: 契約ヘッダーのスタイル

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 契約セクションのヘッダーが緑背景で表示される > Scenario: 契約ヘッダーのスタイル

---

### TC-019: パイプラインサマリ合計セルクリックで全件表示

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** パイプラインサマリが表示されており、フェーズフィルタが適用されている
**WHEN** 「合計」セルをクリックする
**THEN** URL が `/deals`（フィルタパラメータなし）に変わり、全フェーズの案件が表示される

---

### TC-020: フィルタ「すべて」選択でフィルタ解除

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** フェーズフィルタで「交渉中」が選択されている
**WHEN** フェーズ select で「すべて」を選択する
**THEN** `?phase=` パラメータが URL から消え、全フェーズの案件が表示される

---

### TC-021: 顧客・契約形態フィルタ選択肢の生成

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-02 / design.md > D2

**GIVEN** 複数の顧客・複数の契約形態を持つ案件が存在する一覧ページ
**WHEN** 顧客 select または契約形態 select を開く
**THEN** 先頭に「すべて」が表示され、既存 deals から抽出した一意な顧客名・契約形態のみが選択肢として表示される（重複なし）

---

### TC-022: 契約形態が未設定の案件のテーブル表示

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** 契約形態が未設定（null）の案件が存在する
**WHEN** 一覧テーブルに表示される
**THEN** 契約形態カラムに「-」が表示される

---

### TC-023: 詳細ヘッダーのパンくず

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** 案件詳細ページを開く
**WHEN** ページのヘッダーを確認する
**THEN** 「案件一覧」（/deals へのリンク）と案件名がパンくず形式で表示される

---

### TC-024: 失注ボタンのクリック

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 非終端フェーズの案件詳細ページが表示されている
**WHEN** 「失注にする」ボタンをクリックし、確認ダイアログで OK を押す
**THEN** フェーズが「失注」に変更される

---

### TC-025: 編集モードでフェーズ select が非表示

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** 基本情報セクションが読み取りモードで表示されている
**WHEN** 「編集」ボタンをクリックしてフォームモードに切り替える
**THEN** フォームにフェーズ select ドロップダウンが含まれていない

---

### TC-026: 編集保存後に表示モードに戻る

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** 基本情報セクションが編集モードで、案件名を変更している
**WHEN** 「保存」ボタンをクリックする
**THEN** データが更新され、読み取り表示モードに自動的に切り替わる

---

### TC-027: canChangePhase=false でフェーズ変更セクション非表示

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07 / design.md > D4

**GIVEN** フェーズ変更権限のないユーザーが案件詳細ページにアクセスする
**WHEN** ページが表示される
**THEN** フェーズ変更ボタン群のセクションが表示されない

---

### TC-028: 担当者削除ボタンの表示

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** 担当者が 2 名以上登録されている案件の詳細ページ
**WHEN** 担当者セクションが表示される
**THEN** 各担当者行に削除ボタンが表示される

---

### TC-029: 担当者追加フォームの動作

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** 担当者セクションが表示されている
**WHEN** 追加フォームで担当者を選択し「追加」ボタンをクリックする
**THEN** 担当者が一覧に追加され、名前 + 役割ラベルの flex レイアウトで表示される

---

### TC-030: 商談記録が左カラムに配置される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10 / design.md > D5

**GIVEN** 商談記録が存在する案件の詳細ページを開く
**WHEN** ページが表示される
**THEN** 商談記録セクションが左カラム内（フェーズ変更ボタン群の下）に表示される

---

### TC-031: 商談記録の不要カラム非表示

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** 商談記録が存在する案件の詳細ページ
**WHEN** 商談記録セクションを確認する
**THEN** 種別タグ・日時・詳細リンクの 3 カラムが表示され、場所・参加者数・AI件数カラムは表示されない

---

### TC-032: typecheck が green

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** 全実装変更が完了している
**WHEN** `bun run typecheck` を実行する
**THEN** 型エラーが 0 件でコマンドが正常終了する

---

### TC-033: 既存テストが green

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** 全実装変更が完了している
**WHEN** `bun run test` を実行する
**THEN** 全テストが PASS し、コマンドが正常終了する

---

### TC-034: 受注見込みカラムが表示されない

**Category**: manual
**Priority**: should
**Source**: design.md > D6

**GIVEN** 一覧ページを開く
**WHEN** テーブルヘッダーを確認する
**THEN** 受注見込みカラムが存在しない（Deal モデルに expectedCloseDate フィールドがないため省略）

---

## Result

```yaml
result: completed
total: 34
automated: 2
manual: 32
must: 20
should: 13
could: 1
blocked_reasons: []
```
