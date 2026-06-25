# Test Cases: 経路ラベル追加とテーブル並び順の修正

## Summary

- **Total**: 20 cases
- **Automated** (unit/integration): 16
- **Manual**: 4
- **Priority**: must: 14, should: 6, could: 0

---

## sourceLabels の網羅性

### TC-001: sourceLabels に email と agent_service が含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: sourceLabels が inquirySourceEnum の全 7 値を網羅する > Scenario: sourceLabels に email と agent_service が含まれる

---

### TC-002: 引合一覧のフィルタドロップダウンに全経路が表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: sourceLabels が inquirySourceEnum の全 7 値を網羅する > Scenario: 引合一覧のフィルタドロップダウンに全経路が表示される

---

### TC-003: 引合詳細の編集フォームに全経路が表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: sourceLabels が inquirySourceEnum の全 7 値を網羅する > Scenario: 引合詳細の編集フォームに全経路が表示される

---

### TC-004: sourceLabels の記述順が enum 定義順に準拠している

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `src/app/(dashboard)/labels.ts` の `sourceLabels` オブジェクトが定義されている
**WHEN** `Object.keys(sourceLabels)` でキーを列挙する
**THEN** 順序が `["web", "phone", "email", "referral", "agent_service", "exhibition", "other"]` である

---

## InquiryForm の sourceOptions の網羅性

### TC-005: 引合新規登録フォームで email を選択できる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: InquiryForm の sourceOptions が inquirySourceEnum の全 7 値を網羅する > Scenario: 引合新規登録フォームで email を選択できる

---

### TC-006: email 経路で引合を登録できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: InquiryForm の sourceOptions が inquirySourceEnum の全 7 値を網羅する > Scenario: email 経路で引合を登録できる

---

### TC-007: sourceOptions が 8 要素かつ正確な順序で定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` の `sourceOptions` 配列が定義されている
**WHEN** `sourceOptions` の各要素の `value` プロパティを列挙する
**THEN** `["", "web", "phone", "email", "referral", "agent_service", "exhibition", "other"]` の 8 要素が定義順で格納されている（先頭はプレースホルダー）

---

### TC-008: agent_service 経路で引合を登録できる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** 引合新規登録フォームで流入経路に「仲介サービス」を選択している
**WHEN** 必須項目を入力してフォームを送信する
**THEN** `source` が `agent_service` の引合がデータベースに登録される

---

## 一覧テーブルの createdAt 降順ソート

### TC-009: 引合一覧が新しい順で表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 一覧テーブルが createdAt 降順でソートされる > Scenario: 引合一覧が新しい順で表示される

---

### TC-010: 案件一覧が新しい順で表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 一覧テーブルが createdAt 降順でソートされる > Scenario: 案件一覧が新しい順で表示される

---

### TC-011: 契約一覧が新しい順で表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 一覧テーブルが createdAt 降順でソートされる > Scenario: 契約一覧が新しい順で表示される

---

### TC-012: 承認一覧が新しい順で表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 一覧テーブルが createdAt 降順でソートされる > Scenario: 承認一覧が新しい順で表示される

---

### TC-013: 顧客一覧が新しい順で表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 一覧テーブルが createdAt 降順でソートされる > Scenario: 顧客一覧が新しい順で表示される

---

### TC-014: requestRepository.findAllByOrganization が desc に変更されている

**Category**: unit
**Priority**: should
**Source**: design.md > D5

**GIVEN** `src/infrastructure/repositories/requestRepository.ts` の `findAllByOrganization` 関数が定義されている
**WHEN** 関数内の `orderBy` 句を確認する
**THEN** `.orderBy(desc(requests.createdAt))` が使用されている（明示的な `desc()` ラッパーあり）

---

### TC-015: dealRepository の不要になった asc インポートが削除されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/dealRepository.ts` の全 orderBy が `desc(deals.createdAt)` に変更されている
**WHEN** ファイルの import 文を確認する
**THEN** `asc` が使用されている箇所が存在しないため、`asc` のインポートが削除されている

---

### TC-016: contractRepository の不要になった asc インポートが削除されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `src/infrastructure/repositories/contractRepository.ts` の全 orderBy が `desc(contracts.createdAt)` に変更されている
**WHEN** ファイルの import 文を確認する
**THEN** `asc` が使用されている箇所が存在しないため、`asc` のインポートが削除されている

---

## approvalSteps の stepOrder ソート維持

### TC-017: 承認ステップが stepOrder 昇順で返される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approvalSteps の stepOrder ソートは変更しない > Scenario: 承認ステップが stepOrder 昇順で返される

---

## スコープ外リポジトリの不変性

### TC-018: approvalPolicies の orderBy が変更されていない

**Category**: unit
**Priority**: should
**Source**: design.md > Non-Goals

**GIVEN** `approvalPolicies` の orderBy がポリシー評価の決定的な順序（昇順）として定義されている
**WHEN** 対象リポジトリ内の `approvalPolicies` に関連する orderBy を確認する
**THEN** `approvalPolicies` の orderBy が変更されていない（昇順のまま維持されている）

---

### TC-019: revenueRepository の orderBy が変更されていない

**Category**: unit
**Priority**: should
**Source**: design.md > Non-Goals

**GIVEN** `src/infrastructure/repositories/revenueRepository.ts` に月次集計・ランキングの orderBy が定義されている
**WHEN** ファイル内の orderBy をすべて確認する
**THEN** revenueRepository のいずれの orderBy も変更されていない

---

## ビルド・型チェック

### TC-020: typecheck && test が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** 全タスク（T-01〜T-07）の実装が完了している
**WHEN** `bun run typecheck && bun test` を実行する
**THEN** 型エラーおよびテスト失敗がなく、すべて green で完了する

---

## Result

```yaml
result: completed
total: 20
automated: 16
manual: 4
must: 14
should: 6
could: 0
blocked_reasons: []
```
