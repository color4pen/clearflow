# Test Cases: 設定画面のデザイン適用

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

- **Total**: 29 cases
- **Automated** (unit/integration): 8
- **Manual**: 21
- **Priority**: must: 22, should: 7, could: 0

---

## SettingsNav

### TC-001: タブが正しい順序で表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: SettingsNav のタブ順序 > Scenario: タブが正しい順序で表示される

### TC-002: アクティブタブのハイライトが維持される

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** ユーザーが設定画面の「テンプレート」ページにアクセスしている  
**WHEN** SettingsNav が描画される  
**THEN** 「テンプレート」タブがアクティブスタイルで強調表示される  
**AND** その他のタブはアクティブスタイルが適用されない

---

## ポリシー一覧

### TC-003: ポリシー一覧が正しいカラムで表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: ポリシー一覧のカラム構成 > Scenario: ポリシー一覧が正しいカラムで表示される

### TC-004: 「有効/無効」ヘッダーテキストが正しい

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** ポリシーが 1 件以上登録されている  
**WHEN** ポリシー一覧ページが表示される  
**THEN** 5 列目のヘッダーテキストが「有効/無効」である（旧「状態」ではない）

### TC-005: admin 操作カラムが維持されている

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** admin ユーザーがポリシー一覧ページを表示している  
**WHEN** テーブルが描画される  
**THEN** 各行に編集リンクと有効化/無効化ボタンを含む操作カラムが表示される

---

## テンプレート一覧

### TC-006: テンプレート一覧が正しいカラムで表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: テンプレート一覧のカラム構成 > Scenario: テンプレート一覧が正しいカラムで表示される

### TC-007: 「作成日」ヘッダーテキストが正しい

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** テンプレートが 1 件以上登録されている  
**WHEN** テンプレート一覧ページが表示される  
**THEN** 3 列目のヘッダーテキストが「作成日」である（旧「作成日時」ではない）

### TC-008: テンプレート一覧の操作カラムが維持されている

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** admin ユーザーがテンプレート一覧ページを表示している  
**WHEN** テーブルが描画される  
**THEN** 各行に編集リンクと削除ボタンを含む操作カラムが表示される

---

## ユーザー一覧

### TC-009: ユーザー一覧が正しいカラムで表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: ユーザー一覧のカラム構成 > Scenario: ユーザー一覧が正しいカラムで表示される

### TC-010: ロール select の動作が維持される

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** admin ユーザーがユーザー一覧ページを表示している  
**WHEN** あるユーザーの「ロール」セルのセレクトボックスで値を変更する  
**THEN** ロール変更がサーバーに送信され正常終了する

---

## 委任一覧

### TC-011: 委任ページが 2 セクションで表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 委任ページの 2 セクション構成 > Scenario: 委任ページが 2 セクションで表示される

### TC-012: 自分の委任がない場合に空状態が表示される

**Category**: manual  
**Priority**: should  
**Source**: spec.md > Requirement: 委任ページの 2 セクション構成 > Scenario: 自分の委任がない場合

### TC-013: 委任追加フォームが維持されている

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** admin ユーザーが委任設定ページにアクセスしている  
**WHEN** ページが描画される  
**THEN** 委任追加フォームが表示されており、操作可能である

---

## Webhook 一覧

### TC-014: Webhook 一覧が正しいカラムで表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: Webhook 一覧のカラム構成 > Scenario: Webhook 一覧が正しいカラムで表示される

### TC-015: 直近配信状態が正しく表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: Webhook 一覧のカラム構成 > Scenario: 直近配信状態の表示

### TC-016: 配信履歴がない場合に「配信なし」が表示される

**Category**: manual  
**Priority**: should  
**Source**: spec.md > Requirement: Webhook 一覧のカラム構成 > Scenario: 配信履歴がない場合

### TC-017: 直近配信状態のステータス色が正しい

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-06 Acceptance Criteria

**GIVEN** Webhook エンドポイントに各種ステータスの配信履歴が存在する  
**WHEN** Webhook 一覧が表示される  
**THEN** 成功ステータスの配信は `text-success` 色で表示される  
**AND** 失敗ステータスの配信は `text-danger` 色で表示される  
**AND** 処理中ステータスの配信は `text-warning` 色で表示される

### TC-018: findLatestByEndpointIds がバッチ取得する

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-07 Acceptance Criteria

**GIVEN** 複数の Webhook エンドポイント ID と organizationId が与えられる  
**WHEN** `webhookDeliveryRepository.findLatestByEndpointIds(endpointIds, organizationId)` を呼び出す  
**THEN** 各エンドポイント ID をキー、`{ status, lastAttemptAt }` を値とする Map が返される  
**AND** 単一クエリで全エンドポイント分の最新 delivery を取得する（N+1 なし）

### TC-019: listWebhookEndpointsAction が lastDeliveryStatus を返す

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-07 Acceptance Criteria

**GIVEN** Webhook エンドポイントが存在し、各エンドポイントに配信履歴がある  
**WHEN** `listWebhookEndpointsAction` を呼び出す  
**THEN** 各エンドポイントの返却値に `lastDeliveryStatus` フィールドが含まれる

---

## 監査ログ

### TC-020: 操作者でフィルタできる

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: 監査ログのフィルタ拡張 > Scenario: 操作者でフィルタする

### TC-021: 対象種別でフィルタできる

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: 監査ログのフィルタ拡張 > Scenario: 対象種別でフィルタする

### TC-022: CSV エクスポートにフィルタが反映される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 監査ログのフィルタ拡張 > Scenario: CSV エクスポートにフィルタが反映される

### TC-023: 監査ログが正しいカラムで表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 監査ログのテーブルカラム構成 > Scenario: 監査ログが正しいカラムで表示される

### TC-024: 監査ログのカラムヘッダー名が正しい

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** 監査ログが 1 件以上存在する  
**WHEN** 監査ログページが表示される  
**THEN** カラム順が「日時」「操作者」「操作内容」「対象種別」「対象名」である  
**AND** 旧ヘッダー名（「アクション」「実行者」「対象 ID」「メタデータ」）が表示されない

### TC-025: auditLogRepository が actorId/targetType フィルタをサポートする

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-08 Acceptance Criteria

**GIVEN** 監査ログが複数件存在し、異なる `actorId`・`targetType` を持つ  
**WHEN** `findByOrganization` を `{ actorId: "<id>" }` オプションつきで呼び出す  
**THEN** 指定した `actorId` に一致するログのみが返される  
**WHEN** `findByOrganization` を `{ targetType: "request" }` オプションつきで呼び出す  
**THEN** 指定した `targetType` に一致するログのみが返される

### TC-026: CSV エクスポート API が actorId/targetType フィルタをサポートする

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-08 Acceptance Criteria

**GIVEN** 監査ログが複数件存在し、異なる `actorId`・`targetType` を持つ  
**WHEN** `/api/audit-logs/export?actorId=<id>&targetType=request` にリクエストする  
**THEN** 指定した `actorId` および `targetType` に一致する監査ログのみを含む CSV が返される

---

## テーブルスタイル統一

### TC-027: 全テーブルが統一スタイルで表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: テーブルスタイルの統一 > Scenario: 全テーブルが統一スタイルで表示される

---

## ビルド品質

### TC-028: typecheck が通る

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-10 Acceptance Criteria

**GIVEN** 本変更のコードが実装されている  
**WHEN** `bun run typecheck` を実行する  
**THEN** 型エラーが 0 件で正常終了する

### TC-029: 既存テストが green である

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-10 Acceptance Criteria

**GIVEN** 本変更のコードが実装されている  
**WHEN** `bun run test` を実行する  
**THEN** 全テストが pass する（失敗 0 件）

---

## Result

```yaml
result: completed
total: 29
automated: 8
manual: 21
must: 22
should: 7
could: 0
blocked_reasons: []
```
