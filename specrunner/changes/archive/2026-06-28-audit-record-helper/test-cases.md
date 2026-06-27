# Test Cases: 監査ログ記録の型付きヘルパへの集約

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

- **Total**: 16 cases
- **Automated** (unit/integration): 13
- **Manual**: 3
- **Priority**: must: 12, should: 4, could: 0

---

## TC-001: recordAudit 経由で監査ログが記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: recordAudit は監査ログ記録の単一エントリポイントである > Scenario: recordAudit 経由で監査ログが記録される

---

## TC-002: tx を省略して recordAudit を呼び出す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: recordAudit は監査ログ記録の単一エントリポイントである > Scenario: tx を省略して recordAudit を呼び出す

---

## TC-003: action_item.toggle の metadata が型強制される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: AuditMetadataMap に既知形がある action は metadata を型で要求する > Scenario: action_item.toggle の metadata が型強制される

---

## TC-004: action_item.toggle に正しい metadata を渡す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: AuditMetadataMap に既知形がある action は metadata を型で要求する > Scenario: action_item.toggle に正しい metadata を渡す

---

## TC-005: 未定義の action は metadata を省略できる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: AuditMetadataMap に既知形がある action は metadata を型で要求する > Scenario: 未定義の action は metadata を省略できる

---

## TC-006: ガードテストが直接呼び出しを検出する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: auditLogRepository.create の直接呼び出しはヘルパ実装以外に存在しない > Scenario: ガードテストが直接呼び出しを検出する

---

## TC-007: ヘルパ実装には auditLogRepository.create が含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: auditLogRepository.create の直接呼び出しはヘルパ実装以外に存在しない > Scenario: ヘルパ実装には auditLogRepository.create が含まれる

---

## TC-008: toggleActionItemDone の監査ログ記録が不変

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 記録される値・挙動は移行前後で不変である > Scenario: toggleActionItemDone の監査ログ記録が不変

---

## TC-009: auditRecorder.ts の配置・エクスポート・委譲構造

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/application/services/auditRecorder.ts` が新規作成されている
**WHEN** ファイルのソースコードを静的に検査する
**THEN** `recordAudit` 関数と `AuditRecordParams` 型がエクスポートされており、内部で `auditLogRepository.create` を呼び出している（委譲のみ・追加ロジックなし）

---

## TC-010: 複数呼び出しファイルの tx 引き回しが維持されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `updateInquiryStatus.ts`（4 呼び出し）・`approveRequest.ts`（3 呼び出し）・`rejectRequest.ts`（2 呼び出し）が `recordAudit` に移行済みである
**WHEN** 各ファイルのソースコードを検査する
**THEN** すべての `recordAudit` 呼び出しで `tx` が第 2 引数として正しく引き渡されている

---

## TC-011: 読み取り専用ファイルは変更されていない

**Category**: unit
**Priority**: should
**Source**: design.md > D5

**GIVEN** `getRecentActivities.ts` / `getDealActivity.ts` / `listAuditLogs.ts` / `audit-logs/export/route.ts` が移行対象外である
**WHEN** 各ファイルのソースコードを検査する
**THEN** `auditLogRepository` の import が維持されており、`recordAudit` の import は含まれず、`auditLogRepository.create` の呼び出しも存在しない

---

## TC-012: 既存静的テスト（recordAudit 参照検査）が green

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** 7 テストファイル（`inquiryManagement.test.ts` / `dealManagement.test.ts` / `meetingManagement.test.ts` / `templateManagement.test.ts` / `userManagement.test.ts` / `invoiceManagement.test.ts` / `projectStructure.test.ts`）が `recordAudit` 参照検査に更新されている
**WHEN** `bun test` を実行する
**THEN** 全 35 アサーションが green であり、テストの意図（監査ログ記録が存在すること）が維持されている

---

## TC-013: indexOf 検査パターンが正しく更新されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `templateManagement.test.ts` および `userManagement.test.ts` が `indexOf("recordAudit")` パターンに更新されている
**WHEN** テストのソースコードを検査する
**THEN** `indexOf("recordAudit")` によるインデックス取得が `db.transaction` のインデックスより後であることを assert しており、トランザクション境界内での記録を保証している

---

## TC-014: typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** 全ソースファイル（ヘルパ新設・44 ファイル移行・テスト更新）が完了した状態
**WHEN** `tsc --noEmit` を実行する
**THEN** 型エラー 0 件で終了する

---

## TC-015: lint が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** 全ソースファイルが移行済みの状態
**WHEN** `bun run lint` を実行する
**THEN** lint エラー 0 件で終了する

---

## TC-016: 全テストが green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** 全移行・テスト更新・ガードテスト新設が完了した状態
**WHEN** `bun test` を実行する
**THEN** 全件 green であり、T-02 のガードテスト（`auditLogRepository.create` がヘルパ実装以外に存在しないこと）も green である

---

## Result

```yaml
result: completed
total: 16
automated: 13
manual: 3
must: 12
should: 4
could: 0
blocked_reasons: []
```
