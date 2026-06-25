# Test Cases: 契約・請求画面のデザイン適用

## Summary

- **Total**: 20 cases
- **Automated** (unit/integration): 15
- **Manual**: 5
- **Priority**: must: 11, should: 8, could: 1

---

## 契約一覧 — 7 カラム化

### TC-001: 契約一覧に案件名と期間が表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 契約一覧は 7 カラムで表示する > Scenario: 契約一覧に案件名と期間が表示される

---

### TC-002: 期間カラムに開始日と終了日が表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 契約一覧は 7 カラムで表示する > Scenario: 期間カラムに開始日と終了日が表示される

---

### TC-003: 終了日が未設定の場合に期間カラムが開始日のみ表示される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 契約一覧は 7 カラムで表示する > Scenario: 終了日が未設定の場合

---

### TC-004: dealTitle が ContractWithClient 型に含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `contractRepository.findAllByOrganization` が deals テーブルを JOIN するよう実装されている
**WHEN** 契約一覧を取得する
**THEN** 戻り値の各要素に `dealTitle: string` フィールドが含まれ、型チェックが通る

---

## 契約一覧 — 終了日ハイライト

### TC-005: 終了日が今日から 15 日後の active 契約行がハイライトされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 終了日が 30 日以内の active 契約行をハイライトする > Scenario: 終了日が今日から 15 日後の active 契約

---

### TC-006: 終了日が今日から 45 日後の active 契約行はハイライトされない

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 終了日が 30 日以内の active 契約行をハイライトする > Scenario: 終了日が今日から 45 日後の active 契約

---

### TC-007: 終了日が 30 日以内だが completed の契約行はハイライトされない

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 終了日が 30 日以内の active 契約行をハイライトする > Scenario: 終了日が 30 日以内だが completed の契約

---

### TC-008: 終了日が過去日の active 契約行がハイライトされる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** 契約の `endDate` が今日より前の日付で、`status` が `"active"` である
**WHEN** `rowClass` 関数を評価する
**THEN** ハイライトクラス（`bg-amber-50` 相当）が返る

---

### TC-009: ハイライト非該当行では rowClass が undefined を返しストライプが維持される

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-03

**GIVEN** 契約の `endDate` が今日から 31 日以上先、または `status` が `"active"` でない
**WHEN** `rowClass` 関数を評価する
**THEN** `undefined` が返り、DataTable の既定ストライプが適用される

---

## 契約詳細 — 2 カラムレイアウト

### TC-010: 左カラムに基本情報・ステータス操作・案件顧客リンクが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 契約詳細は左右 2 カラムレイアウトで表示する > Scenario: 左カラムの構成

---

### TC-011: 右カラムに請求一覧・請求サマリ・請求作成ボタンが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 契約詳細は左右 2 カラムレイアウトで表示する > Scenario: 右カラムの構成

---

## 契約詳細 — 請求サマリ プログレスバー

### TC-012: 単発契約でプログレスバーが表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 単発契約の請求サマリにプログレスバー風表示を行う > Scenario: 単発契約でプログレスバーが表示される

---

### TC-013: 定期契約ではプログレスバーが表示されない

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 単発契約の請求サマリにプログレスバー風表示を行う > Scenario: 定期契約ではプログレスバーが表示されない

---

### TC-014: 請求合計が契約金額を超過した場合にバーが 100% でキャップされる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 単発契約の請求サマリにプログレスバー風表示を行う > Scenario: 請求合計が契約金額を超過した場合

---

### TC-015: 請求合計が契約金額を超過したとき残り金額が 0 になる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `renewalType` が `"one_time"` で `contractAmount` が 500,000 円
**WHEN** `paidTotal + invoicedTotal + scheduledTotal` が 600,000 円（契約金額を超過）
**THEN** 残り金額が 0 として表示され、負の値にならない

---

## 契約詳細 — 承認待ちバナー

### TC-016: 承認待ちリクエストが存在する場合にバナーが表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 承認待ちバナーは該当時のみ表示する > Scenario: 承認待ちリクエストが存在する場合

---

### TC-017: 承認待ちリクエストが存在しない場合にバナーが表示されない

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 承認待ちバナーは該当時のみ表示する > Scenario: 承認待ちリクエストが存在しない場合

---

## 請求詳細 — 狭幅レイアウト

### TC-018: 請求詳細が max-width 560px の狭幅レイアウトで表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 請求詳細は max-width 560px の狭幅レイアウトで表示する > Scenario: 狭幅レイアウトで表示される

---

### TC-019: パンくずに契約名が表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求詳細は max-width 560px の狭幅レイアウトで表示する > Scenario: パンくずに契約名が表示される

---

## ビルド・型チェック

### TC-020: typecheck && test が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** 全タスクの実装が完了している
**WHEN** `bun run build` および `bun run test` を実行する
**THEN** 型エラーなし、テスト全件 pass

---

## Result

```yaml
result: completed
total: 20
automated: 15
manual: 5
must: 11
should: 8
could: 1
blocked_reasons: []
```
