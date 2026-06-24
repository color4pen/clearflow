# Test Cases: approval-policy-logic

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

- **Total**: 38 cases
- **Automated** (unit/integration): 38
- **Manual**: 0
- **Priority**: must: 23, should: 15, could: 0

---

## conditionEvaluator — 演算子ごとの動作確認

### TC-001: eq 演算子で数値が一致する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: conditionEvaluator が全演算子で正しく動作する > Scenario: eq 演算子で数値が一致する

---

### TC-002: neq 演算子で文字列が異なる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: conditionEvaluator が全演算子で正しく動作する > Scenario: neq 演算子で文字列が異なる

---

### TC-003: gt 演算子で数値が超過する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: conditionEvaluator が全演算子で正しく動作する > Scenario: gt 演算子で数値が超過する

---

### TC-004: gt 演算子で数値が等しい場合は false

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: conditionEvaluator が全演算子で正しく動作する > Scenario: gt 演算子で数値が等しい場合は false

---

### TC-005: in 演算子でカンマ区切りリストに含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: conditionEvaluator が全演算子で正しく動作する > Scenario: in 演算子でカンマ区切りリストに含まれる

---

### TC-006: in 演算子でリストに含まれない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: conditionEvaluator が全演算子で正しく動作する > Scenario: in 演算子でリストに含まれない

---

### TC-007: context にフィールドが存在しない場合

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: conditionEvaluator が全演算子で正しく動作する > Scenario: context にフィールドが存在しない場合

---

### TC-008: gte 演算子で数値が等しい場合 true

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** context が `{ budget: 1000000 }` である
**WHEN** `evaluateCondition("budget", "gte", "1000000", context)` を呼び出す
**THEN** `true` が返される

---

### TC-009: lte 演算子で数値が等しい場合 true

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** context が `{ budget: 1000000 }` である
**WHEN** `evaluateCondition("budget", "lte", "1000000", context)` を呼び出す
**THEN** `true` が返される

---

### TC-010: gt/gte/lt/lte 演算子で数値でない値の場合 false

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02 実装仕様（gt: 数値比較のみ。数値でない場合は false）

**GIVEN** context が `{ source: "web" }` である
**WHEN** `evaluateCondition("source", "gt", "100", context)` を呼び出す
**THEN** `false` が返される（文字列値は数値比較不可のため）

---

### TC-011: evaluateCondition で null 値の場合 false

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02 実装仕様（context[field] が undefined または null の場合は false を返す）

**GIVEN** context が `{ budget: null }` である
**WHEN** `evaluateCondition("budget", "eq", "1000", context)` を呼び出す
**THEN** `false` が返される

---

### TC-012: eq 演算子で文字列が一致する場合 true

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02 Acceptance Criteria（eq: 文字列一致）

**GIVEN** context が `{ source: "web" }` である
**WHEN** `evaluateCondition("source", "eq", "web", context)` を呼び出す
**THEN** `true` が返される

---

## ConditionOperator 型拡張

### TC-013: ConditionOperator 型に neq と in が追加されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `src/domain/models/approvalPolicy.ts` の `ConditionOperator` 型
**WHEN** TypeScript の型チェックを実行する
**THEN** `ConditionOperator` が `"gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "in"` の 7 種を含む

---

### TC-014: approvalPolicyRepository の CONDITION_OPERATORS バリデーションが neq, in を受け付ける

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `src/infrastructure/repositories/approvalPolicyRepository.ts` の `CONDITION_OPERATORS` セット
**WHEN** `"neq"` および `"in"` を検証する
**THEN** バリデーションが通過し、エラーが発生しない

---

## evaluatePolicies — ポリシーフィルタリング

### TC-015: 条件合致ポリシーのみが返される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: evaluatePolicies がトリガーアクションと条件に基づいてポリシーをフィルタする > Scenario: 条件合致ポリシーのみが返される

---

### TC-016: 無条件ポリシーは常に合致する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: evaluatePolicies がトリガーアクションと条件に基づいてポリシーをフィルタする > Scenario: 無条件ポリシーは常に合致する

---

### TC-017: アクティブポリシーがない場合は空配列を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: evaluatePolicies がトリガーアクションと条件に基づいてポリシーをフィルタする > Scenario: アクティブポリシーがない場合は空配列を返す

---

### TC-018: findActiveByTriggerAction は created_at ASC で決定的な順序を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03 実装仕様（ORDER BY created_at ASC を追加して決定的な順序を保証する）

**GIVEN** `"inquiry.convert"` に対して複数のアクティブポリシーが登録されている
**WHEN** `approvalPolicyRepository.findActiveByTriggerAction(organizationId, "inquiry.convert")` を呼び出す
**THEN** ポリシーが `created_at` 昇順で返される（先頭が最も古いポリシー）

---

## ApprovalCompleted イベント型

### TC-019: ApprovalCompleted が DomainEvent union に含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ApprovalCompleted イベント型が定義されている > Scenario: ApprovalCompleted が DomainEvent union に含まれる

---

### TC-020: DomainEventType が "approval.completed" を含む

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** `src/domain/events/types.ts` の型定義
**WHEN** TypeScript の型チェックを実行する
**THEN** `DomainEventType` に `"approval.completed"` が含まれる

---

## requestRepository — findByOriginTriggerEntity

### TC-021: findByOriginTriggerEntity で pending system リクエストが存在する場合に返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04b Acceptance Criteria

**GIVEN** `origin_type = "system"`, `origin_trigger_action = "inquiry.convert"`, `origin_trigger_entity_id = <inquiryId>`, `status = "pending"` のリクエストがDBに存在する
**WHEN** `requestRepository.findByOriginTriggerEntity(organizationId, "inquiry.convert", inquiryId)` を呼び出す
**THEN** 該当のリクエストが返される

---

### TC-022: findByOriginTriggerEntity で存在しない場合 null を返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04b Acceptance Criteria

**GIVEN** 指定した引合IDに対応する pending system リクエストが存在しない
**WHEN** `requestRepository.findByOriginTriggerEntity(organizationId, "inquiry.convert", inquiryId)` を呼び出す
**THEN** `null` が返される

---

## updateInquiryStatus — 承認ポリシーゲート

### TC-023: ポリシー非合致時に案件が即時生成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件化時にポリシーが評価される > Scenario: ポリシー非合致時に案件が即時生成される

---

### TC-024: ポリシー合致時に承認リクエストが生成され、案件は生成されない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件化時にポリシーが評価される > Scenario: ポリシー合致時に承認リクエストが生成され、案件は生成されない

---

### TC-025: skipPolicyCheck=true でポリシー評価をスキップする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件化時にポリシーが評価される > Scenario: skipPolicyCheck=true でポリシー評価をスキップする

---

### TC-026: テンプレートが見つからない場合は従来フローにフォールバック

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05 実装仕様（テンプレートが見つからなければ従来フローにフォールバック）

**GIVEN** 引合が存在し、`"inquiry.convert"` に対するアクティブポリシーが合致するが、そのポリシーの `templateId` に対応するテンプレートが存在しない
**WHEN** `updateInquiryStatus({ ..., newStatus: "converted" })` を呼び出す
**THEN** 承認リクエストは生成されず、従来通り Deal が生成され `InquiryConverted` イベントが発行される

---

### TC-027: 同一引合に既存の pending system リクエストがある場合は重複生成しない

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05 実装仕様（重複防止: findByOriginTriggerEntity で既存の pending system リクエストが存在しないことを確認）

**GIVEN** 引合に対して既に `status=pending`, `origin_type=system` の承認リクエストが存在する
**WHEN** `updateInquiryStatus({ ..., newStatus: "converted" })` を再度呼び出す
**THEN** 新たな承認リクエストは生成されず、「承認待ちの申請があります」を示す結果が返される

---

## approveRequest — ApprovalCompleted イベント発行

### TC-028: system origin 全ステップ承認完了時に ApprovalCompleted が発行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 承認完了時に ApprovalCompleted が発行される > Scenario: system origin リクエストの全ステップ承認完了時に ApprovalCompleted が発行される

---

### TC-029: manual origin では ApprovalCompleted が発行されない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 承認完了時に ApprovalCompleted が発行される > Scenario: manual origin リクエストでは ApprovalCompleted が発行されない

---

### TC-030: ステップなし (single-approve) フローでも system origin 時に ApprovalCompleted を発行

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06 実装仕様（ステップなし backward-compatible single-approve フローでも同様のロジックを追加）

**GIVEN** ステップを持たない `origin_type=system` の承認リクエストが存在する
**WHEN** `approveRequest` を呼び出す
**THEN** `ApprovalCompleted` イベントが dispatch される

---

### TC-031: system origin でも既存の request.approved イベントが引き続き発行される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06 Acceptance Criteria（既存の request.approved イベントは引き続き発行される）

**GIVEN** `origin_type=system` の承認リクエストがあり、全ステップが承認完了する
**WHEN** `approveRequest` を呼び出す
**THEN** `request.approved` イベントと `approval.completed` イベントの両方が dispatch される

---

## 承認後アクションハンドラ

### TC-032: inquiry.convert の承認完了で案件が自動生成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 承認後に案件が自動生成される > Scenario: inquiry.convert の承認完了で案件が自動生成される

---

### TC-033: skipPolicyCheck により無限ループしない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 承認後に案件が自動生成される > Scenario: skipPolicyCheck により無限ループしない

---

### TC-034: originTriggerAction が inquiry.convert 以外の場合は何もしない

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07 Acceptance Criteria（originTriggerAction が "inquiry.convert" 以外の場合は何もしない）

**GIVEN** `ApprovalCompleted` イベントの `originTriggerAction` が `"contract.create"` である
**WHEN** `handleApprovalCompleted` ハンドラが実行される
**THEN** `updateInquiryStatus` は呼び出されず、何もせずに正常終了する

---

### TC-035: originTriggerEntityId が null の場合エラーログで安全終了

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07 Acceptance Criteria（originTriggerEntityId が null の場合はエラーログを出力して安全に終了する）

**GIVEN** `ApprovalCompleted` イベントの `originTriggerAction` が `"inquiry.convert"` で `originTriggerEntityId` が `null` である
**WHEN** `handleApprovalCompleted` ハンドラが実行される
**THEN** エラーログが出力され、例外を発生させずに正常終了する。`updateInquiryStatus` は呼び出されない

---

## ハンドラ登録

### TC-036: approval.completed イベントで Webhook ハンドラと handleApprovalCompleted の両方が非同期実行される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-08 Acceptance Criteria

**GIVEN** `src/infrastructure/handlers/index.ts` で `registerHandlers()` が呼び出されている
**WHEN** `dispatcher.dispatch({ type: "approval.completed", payload: { ... } })` を実行し、`flushAsync()` を呼び出す
**THEN** Webhook ハンドラと `handleApprovalCompleted` がそれぞれ非同期で実行される

---

## 手動承認フロー — リグレッション

### TC-037: 手動承認リクエストの承認フローが変わらない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 既存の手動承認フローが引き続き動作する > Scenario: 手動承認リクエストの承認フローが変わらない

---

## Server Action — ユーザーフィードバック

### TC-038: ポリシー合致時に承認待ちメッセージが返される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** 引合が存在し、案件化時にポリシーが合致して承認リクエストが生成される
**WHEN** `updateInquiryStatusAction` を呼び出す
**THEN** `{ success: true, message: "承認リクエストを作成しました。承認後に案件が自動生成されます" }` が返される

---

## Result

```yaml
result: completed
total: 38
automated: 38
manual: 0
must: 23
should: 15
could: 0
blocked_reasons: []
```
