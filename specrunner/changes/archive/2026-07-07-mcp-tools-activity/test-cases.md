# Test Cases: MCP ツール — 活動系（顧客接点・タスク・ウォッチ・通知）

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

- **Total**: 28 cases
- **Automated** (unit/integration): 25
- **Manual**: 3
- **Priority**: must: 27, should: 1, could: 0

---

## interactions ツール

### TC-001: 商談記録が案件タイムラインに現れる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: interactions ツールは商談の記録・編集と調整記録をサポートする > Scenario: 商談記録が案件タイムラインに現れる

---

### TC-002: 関連先なしの商談記録が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: interactions ツールは商談の記録・編集と調整記録をサポートする > Scenario: 関連先なしの商談記録が拒否される

---

### TC-003: 契約調整の記録

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: interactions ツールは商談の記録・編集と調整記録をサポートする > Scenario: 契約調整の記録

---

### TC-004: 請求調整の記録

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: interactions ツールは商談の記録・編集と調整記録をサポートする > Scenario: 請求調整の記録

---

### TC-005: update_meeting で summary のみ更新する（部分更新）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: interactions ツールの update_meeting は部分更新をサポートする > Scenario: summary のみ更新する

---

### TC-006: update_meeting で null 指定によりフィールドがクリアされる

**Category**: integration
**Priority**: must
**Source**: design.md > D6: update 系ツールの undefined / null 区別

**GIVEN** 既存の商談が存在し、location が設定されている
**WHEN** interactions ツールで `operation: "update_meeting"`, `id`, `location: null` を指定する
**THEN** `updateMeeting` usecase に `location: null` が渡され、フィールドがクリアされる（undefined による変更なしと区別される）

---

## tasks ツール

### TC-007: タスクの作成

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: tasks ツールは CRUD・ステータス遷移・検索をサポートする > Scenario: タスクの作成

---

### TC-008: タスクのステータス遷移

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: tasks ツールは CRUD・ステータス遷移・検索をサポートする > Scenario: タスクのステータス遷移

---

### TC-009: タスクの認可判定が Server Action と同一（member が delete を拒否される）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: tasks ツールは CRUD・ステータス遷移・検索をサポートする > Scenario: タスクの認可判定が Server Action と同一

---

### TC-010: リンク先候補検索

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: tasks ツールは CRUD・ステータス遷移・検索をサポートする > Scenario: リンク先候補検索

---

### TC-011: admin ロールで delete を実行すると usecase に到達する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08: admin ロールで delete を呼び、usecase に到達することを assert する

**GIVEN** admin ロールのトークンで MCP ツールを呼び出す
**WHEN** tasks ツールに `operation: "delete"`, `id` を指定して呼び出す
**THEN** `deleteActionItem` usecase が呼ばれ、`isError: true` で拒否されない

---

### TC-012: tasks update で null 指定によりフィールドがクリアされる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02: update operation: id は必須。他フィールドは .nullable().optional() で undefined/null を区別する

**GIVEN** 既存のタスクが存在し、dueDate が設定されている
**WHEN** tasks ツールで `operation: "update"`, `id`, `dueDate: null` を指定する
**THEN** `updateActionItem` usecase に `dueDate: null` が渡され、dueDate がクリアされる（undefined による変更なしと区別される）

---

## watches ツール

### TC-013: ウォッチの登録

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: watches ツールは案件のウォッチ・解除をサポートする > Scenario: ウォッチの登録

---

### TC-014: ウォッチの重複が一意性制約どおり扱われる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: watches ツールは案件のウォッチ・解除をサポートする > Scenario: ウォッチの重複が既存の一意性制約どおり扱われる

---

### TC-015: ウォッチの解除

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: watches ツールは案件のウォッチ・解除をサポートする > Scenario: ウォッチの解除

---

## notifications ツール

### TC-016: 通知一覧がトークンのユーザー本人の通知のみ返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: notifications ツールは未読通知の一覧と既読化をサポートする > Scenario: 通知一覧がトークンのユーザー本人の通知のみ返す

---

### TC-017: 既読化

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: notifications ツールは未読通知の一覧と既読化をサポートする > Scenario: 既読化

---

### TC-018: notifications list で userRepository.findById が notificationsLastSeenAt 取得に使われる

**Category**: integration
**Priority**: must
**Source**: design.md > D8: notifications の一覧取得でユーザーの notificationsLastSeenAt を取得する方法

**GIVEN** authInfo の userId が "user-A" であり、userRepository.findById が notificationsLastSeenAt を含むユーザーレコードを返す
**WHEN** notifications ツールに `operation: "list"` を指定する
**THEN** `userRepository.findById` が "user-A" で呼ばれ、取得した `notificationsLastSeenAt` が `getNotifications` usecase の引数として渡される

---

## 監査ログ

### TC-019: タスク作成の監査記録

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全ツールの書き込みが監査ログに記録される > Scenario: タスク作成の監査記録

---

## テナント分離

### TC-020: organizationId がツール引数に含まれない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 全ツールがテナント分離を保証する > Scenario: organizationId がツール引数に含まれない

---

### TC-021: 異なる organizationId を持つ authInfo でテナント分離が保証される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-11: 2 つの異なる organizationId を持つ authInfo で同一操作を呼び、usecase に渡される organizationId がそれぞれ正しいことを assert する

**GIVEN** 2 つの異なる organizationId（"org-1"、"org-2"）を持つ authInfo が存在する
**WHEN** それぞれの authInfo で interactions `create_meeting`、tasks `create`、watches `watch` を呼ぶ
**THEN** usecase に渡される organizationId がそれぞれ "org-1"、"org-2" と一致し、混在しない

---

## 認可

### TC-022: member ロールが actionItem.delete を拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 権限外ロールでのツール実行が拒否される > Scenario: member ロールが actionItem.delete を拒否される

---

### TC-023: member ロールが interaction.recordInvoiceInteraction を拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 権限外ロールでのツール実行が拒否される > Scenario: member ロールが interaction.recordInvoiceInteraction を拒否される

---

## エラー変換

### TC-024: usecase 例外がマスクされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: エラー変換で内部詳細を漏らさない > Scenario: usecase 例外がマスクされる

---

## ツール登録・構造

### TC-025: createMcpServer が既存 3 + 新規 4 = 7 ツールを登録する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 Acceptance Criteria: createMcpServer() が 7 ツール（既存 3 + 新規 4）を登録する

**GIVEN** `createMcpServer()` を呼び出す
**WHEN** 登録されたツール一覧を確認する
**THEN** inquiries / deals / clients / interactions / tasks / watches / notifications の 7 ツールが登録されている

---

## ビルド・静的解析

### TC-026: typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12 Acceptance Criteria: bun run typecheck が green

**GIVEN** 実装が完了している
**WHEN** `bun run typecheck` を実行する
**THEN** 型エラーなしで完了する

---

### TC-027: 既存テストが無変更で green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12 Acceptance Criteria: 既存テスト無変更で green

**GIVEN** 新規ファイルを追加した状態
**WHEN** `bun test` を実行する
**THEN** 既存テストが全て pass し、新規テストも全て pass する

---

### TC-028: aozu check が exit 0

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準: aozu check exit 0

**GIVEN** 実装が完了している
**WHEN** `aozu check` を実行する
**THEN** exit 0 で終了する（アーキテクチャ依存関係の違反なし）

---

## Result

```yaml
result: completed
total: 28
automated: 25
manual: 3
must: 27
should: 1
could: 0
blocked_reasons: []
```
