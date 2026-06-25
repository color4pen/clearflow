# Test Cases: 承認画面のデザイン適用

## Summary

- **Total**: 50 cases
- **Automated** (unit/integration): 12
- **Manual**: 38
- **Priority**: must: 32, should: 16, could: 2

---

## TAB — タブ切替（一覧ページ）

### TC-001: デフォルトタブがロールに応じて決定される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧ページにタブ切替を提供する > Scenario: デフォルトタブがロールに応じて決定される

---

### TC-002: 「すべて」タブが admin/manager のみに表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧ページにタブ切替を提供する > Scenario: 「すべて」タブが admin/manager のみに表示される

---

### TC-003: 認可されていないタブへの URL 直打ちがフォールバックする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 一覧ページにタブ切替を提供する > Scenario: 認可されていないタブへの URL 直打ちがフォールバックする

---

### TC-004: 自分の role が承認者の pending リクエストが「要対応」タブに表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 「要対応」タブはユーザーの role に一致する pending ステップを持つリクエストを表示する > Scenario: 自分の role が承認者の pending リクエストが表示される

---

### TC-005: 承認済みリクエストは「要対応」タブに表示されない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 「要対応」タブはユーザーの role に一致する pending ステップを持つリクエストを表示する > Scenario: 承認済みリクエストは「要対応」タブに表示されない

---

### TC-006: 「自分の申請」タブに自分が作成したリクエストのみ表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 「自分の申請」タブは自分が作成したリクエストを表示する > Scenario: 自分が作成したリクエストのみ表示される

---

### TC-007: finance ロールのユーザーに「すべて」タブが表示されない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** finance ロールのユーザーがログインしている
**WHEN** 一覧ページ（`/requests`）を表示する
**THEN** 「要対応」と「自分の申請」タブのみが表示され、「すべて」タブは表示されない

---

### TC-008: 各タブにリクエスト件数バッジが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-02, T-03

**GIVEN** 複数のリクエストが存在する状態で一覧ページを表示する
**WHEN** タブのヘッダーを確認する
**THEN** 各タブにそのタブに含まれるリクエスト件数がバッジとして表示される

---

### TC-009: approvalSteps が空のレガシー申請は「要対応」タブに表示される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** manager ロールのユーザーがログインしており、`approvalSteps` が空（レガシー申請）かつ `status` が `pending` のリクエストが存在する
**WHEN** 「要対応」タブを表示する
**THEN** そのレガシー申請が一覧に表示される

---

### TC-010: `?tab=my-requests` で「自分の申請」タブがアクティブになる

**Category**: manual
**Priority**: should
**Source**: design.md > D1

**GIVEN** manager ロールのユーザーがログインしている
**WHEN** `?tab=my-requests` で `/requests` にアクセスする
**THEN** 「自分の申請」タブが視覚的にアクティブな状態になり、自分が作成したリクエストが表示される

---

## TABLE — テーブルレイアウト（一覧ページ）

### TC-011: 5 カラムのヘッダーが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧テーブルが 5 カラムで表示される > Scenario: 5 カラムのヘッダーが表示される

---

### TC-012: originType が "system" のリクエストに「自動」ラベルが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧テーブルが 5 カラムで表示される > Scenario: 手動/自動ラベルが originType に応じて表示される

---

### TC-013: originType が "manual" のリクエストに「手動」ラベルが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧テーブルが 5 カラムで表示される > Scenario: 手動ラベルが表示される

---

### TC-014: 行クリックで詳細ページに遷移する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 一覧テーブルにリクエストが表示されている
**WHEN** 任意の行をクリックする
**THEN** そのリクエストの詳細ページ（`/requests/{id}`）に遷移する

---

### TC-015: 一括承認チェックボックスが引き続き機能する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04, request.md > スコープ外

**GIVEN** pending 状態のリクエストが複数表示されている
**WHEN** 一括承認チェックボックスを選択して一括承認を実行する
**THEN** 選択したリクエストが承認される（既存の `bulkApproveAction` が動作する）

---

### TC-016: ステータスカラムにステータスバッジが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** 一覧テーブルに `pending` / `approved` / `rejected` のリクエストが混在している
**WHEN** テーブルのステータスカラムを確認する
**THEN** それぞれのステータスに対応するバッジが表示される

---

### TC-017: 申請日カラムに YYYY/MM/DD 形式で日付が表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-04

**GIVEN** 申請日が `2025-01-15` のリクエストがある
**WHEN** 一覧テーブルの申請日カラムを確認する
**THEN** 「2025/01/15」形式で日付が表示される

---

### TC-018: 旧テーブルカラムが表示されない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-04, design.md > Context

**GIVEN** 一覧テーブルが表示されている
**WHEN** カラムヘッダーを確認する
**THEN** No.、金額、承認経路、期限、操作 の各カラムは存在しない

---

## HEADER — 詳細ページヘッダー

### TC-019: ヘッダーにステータスバッジが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細ページにステータスバッジ付きヘッダーを表示する > Scenario: ヘッダーにステータスバッジが表示される

---

### TC-020: ヘッダーに件名・申請者名・申請日時が表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** リクエスト詳細ページを表示する
**WHEN** ヘッダーセクションを確認する
**THEN** 件名（大きめフォント）・申請者名・申請日時がそれぞれ表示される

---

### TC-021: 「申請一覧に戻る」リンクが機能する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** リクエスト詳細ページを表示している
**WHEN** 「← 申請一覧に戻る」リンクをクリックする
**THEN** 承認一覧ページ（`/requests`）に遷移する

---

## BANNER — システム連動バナー

### TC-022: inquiry.convert トリガーのシステム連動バナーが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: system origin のリクエストにシステム連動バナーを表示する > Scenario: inquiry.convert のシステム連動バナーが表示される

---

### TC-023: manual origin ではバナーが表示されない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: system origin のリクエストにシステム連動バナーを表示する > Scenario: manual origin ではバナーが表示されない

---

### TC-024: エンティティが取得できない場合はバナーが非表示になる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: system origin のリクエストにシステム連動バナーを表示する > Scenario: エンティティが取得できない場合はバナーを非表示にする

---

### TC-025: contract.create トリガーのシステム連動バナーが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06, design.md > D5

**GIVEN** `originType: "system"`, `originTriggerAction: "contract.create"`, `originTriggerEntityId` が契約 ID のリクエスト詳細を表示する
**WHEN** ページがレンダリングされる
**THEN** 契約名を含むシステム連動バナーと `/contracts/{id}` へのリンクが表示される

---

### TC-026: contract.cancel トリガーのシステム連動バナーが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06, design.md > D5

**GIVEN** `originType: "system"`, `originTriggerAction: "contract.cancel"`, `originTriggerEntityId` が契約 ID のリクエスト詳細を表示する
**WHEN** ページがレンダリングされる
**THEN** 契約名を含むシステム連動バナーと `/contracts/{id}` へのリンクが表示される

---

## STEPPER — 承認ステッパー UI

### TC-027: 各ステップの状態アイコンが正しく表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 承認ステップを縦ステッパー UI で表示する > Scenario: 各ステップの状態アイコンが正しく表示される

---

### TC-028: 現在のステップがハイライトされる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 承認ステップを縦ステッパー UI で表示する > Scenario: 現在のステップがハイライトされる

---

### TC-029: 却下されたステップが区別して表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 承認ステップを縦ステッパー UI で表示する > Scenario: 却下されたステップが区別して表示される

---

### TC-030: 承認済みステップのコメントと処理日時が表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 承認ステップを縦ステッパー UI で表示する > Scenario: ステップのコメントと日時が表示される

---

### TC-031: ステップが stepOrder 順に縦に並ぶ

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `stepOrder` が 1, 2, 3 の承認ステップを持つリクエストを表示する
**WHEN** ステッパー UI を確認する
**THEN** ステップが `stepOrder` 1 → 2 → 3 の順に上から下に並んでいる

---

### TC-032: ステップ間が縦線で接続される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-05, design.md > D4

**GIVEN** 複数の承認ステップを持つリクエストの詳細を表示する
**WHEN** ステッパー UI を確認する
**THEN** 各ステップの間に縦のコネクタ線が表示される（完了ステップは緑、pending は灰色）

---

### TC-033: pending かつ未到達のステップがグレー丸で表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-05, design.md > D4

**GIVEN** ステップ 1 が `approved`、ステップ 2 が `pending`（現在）、ステップ 3 が `pending`（未到達）のリクエストを表示する
**WHEN** ステップ 3 のアイコンを確認する
**THEN** グレーの丸アイコンが表示される（ハイライトなし）

---

### TC-034: 承認者名が各ステップに表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-05

**GIVEN** 承認済みステップに `approvedByName` が設定されている
**WHEN** ステッパー UI の該当ステップを確認する
**THEN** 承認者名が表示される

---

## ACTION — 承認/却下操作

### TC-035: 承認者に「承認する」「却下する」ボタンが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 承認/却下ボタンは該当ステップの承認者にのみ表示する > Scenario: 承認者に操作ボタンが表示される

---

### TC-036: 承認者でないユーザーには操作ボタンが表示されない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 承認/却下ボタンは該当ステップの承認者にのみ表示する > Scenario: 承認者でないユーザーには操作ボタンが表示されない

---

### TC-037: 承認/却下操作にコメントフィールドが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 承認/却下ボタンは該当ステップの承認者にのみ表示する > Scenario: 承認/却下操作にコメントフィールドが表示される

---

### TC-038: 委任を受けたユーザーに承認ボタンが表示される

**Category**: integration
**Priority**: must
**Source**: design.md > D6, tasks.md > T-08

**GIVEN** `pending` 状態でステップの `approverRole` が `manager` のリクエスト詳細を表示する
**WHEN** `approverRole` と異なる role を持つが、該当ステップへの委任を受けているユーザー（`canApproveWithDelegation` が `allowed: true` を返す）がアクセスする
**THEN** 「承認する」「却下する」ボタンが表示される

---

### TC-039: 却下操作でコメントが rejectRequestAction に送信される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-07, design.md > D7

**GIVEN** 承認者がコメントフィールドに「確認が取れていません」と入力して「却下する」ボタンをクリックする
**WHEN** Server Action が実行される
**THEN** `rejectRequestAction` にコメント「確認が取れていません」が渡され、`targetStatus: "rejected"` で処理される

---

### TC-040: 承認コメントは UI に表示されるがバックエンドへは送信されない

**Category**: integration
**Priority**: should
**Source**: design.md > D7, tasks.md > T-07

**GIVEN** 承認者がコメントフィールドに文字を入力して「承認する」ボタンをクリックする
**WHEN** Server Action が実行される
**THEN** `approveRequestAction` にコメントは送信されない（`approveRequest` ユースケースが comment 未対応のため）

---

### TC-041: draft 状態の申請に既存の提出ボタンが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `status` が `draft` のリクエスト詳細を申請者が表示する
**WHEN** 操作セクションを確認する
**THEN** 申請提出ボタンが表示され、「承認する」「却下する」ボタンは表示されない

---

### TC-042: revision 状態の申請に既存の再提出ボタンが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `status` が `revision` のリクエスト詳細を申請者が表示する
**WHEN** 操作セクションを確認する
**THEN** 再提出ボタンが表示され、「承認する」「却下する」ボタンは表示されない

---

### TC-043: 承認済みリクエストには承認/却下ボタンが表示されない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07, design.md > D6

**GIVEN** `status` が `approved` のリクエスト詳細を表示する
**WHEN** 操作セクションを確認する
**THEN** 「承認する」「却下する」ボタンはいずれも表示されない

---

## ARCH — アーキテクチャ・層分離

### TC-044: システム連動バナーの引合名取得が getInquiry ユースケース経由で行われる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: エンティティ取得はユースケース経由で行う > Scenario: システム連動バナーの引合名取得が usecase 経由で行われる

---

### TC-045: getInquiry が Inquiry | null を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** 有効な `inquiryId` と `organizationId` を引数として与える
**WHEN** `getInquiry({ inquiryId, organizationId })` を呼び出す
**THEN** 存在する ID の場合は `Inquiry` オブジェクトが返され、存在しない ID の場合は `null` が返される

---

### TC-046: getInquiry が usecases/index.ts からエクスポートされている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/application/usecases/index.ts` を確認する
**WHEN** エクスポートリストを確認する
**THEN** `getInquiry` が named export されており、インポートして使用できる

---

## BUILD — 静的解析・ビルド

### TC-047: bun run typecheck が型エラーなしで完了する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09, request.md > 受け入れ基準

**GIVEN** 実装変更後のコードベース
**WHEN** `bun run typecheck` を実行する
**THEN** 型エラーが 0 件で exit 0 になる

---

### TC-048: bun test が全テスト pass する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09, request.md > 受け入れ基準

**GIVEN** 実装変更後のコードベース
**WHEN** `bun test` を実行する
**THEN** すべてのテストが pass し exit 0 になる

---

### TC-049: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** 実装変更後のコードベース
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーが発生せず exit 0 になる

---

### TC-050: requests/new/page.tsx に差分がない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09, request.md > スコープ外

**GIVEN** 実装完了後のコードベース
**WHEN** `src/app/(dashboard)/requests/new/page.tsx` の差分を確認する
**THEN** 変更が存在しない（手動申請フォームはスコープ外）

---

## Result

```yaml
result: completed
total: 50
automated: 12
manual: 38
must: 32
should: 16
could: 2
blocked_reasons: []
```
