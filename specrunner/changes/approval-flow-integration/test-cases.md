# Test Cases: approval-flow-integration

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

- **Total**: 18 cases
- **Automated** (unit/integration): 17
- **Manual**: 1
- **Priority**: must: 15, should: 2, could: 1

---

## requestRepository.create パラメータ拡張

### TC-001: status パラメータ未指定時のデフォルト

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: requestRepository.create SHALL accept an optional status parameter > Scenario: status パラメータ未指定時のデフォルト

---

### TC-002: status パラメータ指定時

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: requestRepository.create SHALL accept an optional status parameter > Scenario: status パラメータ指定時

---

### TC-003: sourceType/sourceId 未指定時のデフォルト

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: requestRepository.create SHALL accept optional sourceType and sourceId parameters > Scenario: sourceType/sourceId 未指定時のデフォルト

---

### TC-004: sourceType/sourceId 指定時

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: requestRepository.create SHALL accept optional sourceType and sourceId parameters > Scenario: sourceType/sourceId 指定時

---

### TC-005: mapRow が sourceType/sourceId を正しくマッピングする

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02: Request ドメインモデルに sourceType/sourceId を追加

**GIVEN** DB の requests テーブルの `source_type` カラムに `"inquiry"`、`source_id` カラムに任意の UUID 値が格納されたレコードが存在する
**WHEN** `requestRepository.findById` などでそのレコードを取得する
**THEN** 返される `Request` オブジェクトの `sourceType` が `"inquiry"`、`sourceId` が DB の UUID 値と一致する

---

## updateInquiryStatus converted 遷移

### TC-006: converted 遷移時の Request 作成

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateInquiryStatus SHALL create Request with status pending and source metadata on converted transition > Scenario: converted 遷移時の Request 作成

---

## updateDealPhase estimate_approval 遷移

### TC-007: estimate_approval 遷移時の Request 作成

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateDealPhase SHALL create Request with status pending and source metadata on estimate_approval transition > Scenario: estimate_approval 遷移時の Request 作成

---

## createRequest UC 後方互換

### TC-008: createRequest UC の後方互換

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createRequest UC SHALL continue creating Request with status draft > Scenario: createRequest UC の後方互換

---

## approveRequest 連動処理（案件化承認）

### TC-009: 案件化承認完了時の Deal 自動作成

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approveRequest SHALL create Deal when sourceType is inquiry on full approval > Scenario: 案件化承認完了時の Deal 自動作成

---

### TC-010: Deal 作成失敗時も承認は成功

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approveRequest SHALL create Deal when sourceType is inquiry on full approval > Scenario: Deal 作成失敗時も承認は成功

---

### TC-011: no-steps フローでも案件化承認連動処理が動作する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06: approveRequest に承認完了後の連動処理を追加 (Acceptance Criteria: no-steps フローでも連動処理が動作する)

**GIVEN** `steps.length === 0` の承認リクエストで `sourceType` が `"inquiry"`、`sourceId` が有効な引き合い ID である
**WHEN** `approveRequest` が呼ばれ、no-steps フローで即時承認が完了する
**THEN** `dealRepository.create` が呼ばれ Deal が作成され、`approveRequest` は `ok: true` を返す

---

## approveRequest 連動処理（見積承認）

### TC-012: 見積承認完了時の Deal フェーズ自動進行

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approveRequest SHALL advance Deal phase to won when sourceType is deal on full approval > Scenario: 見積承認完了時の Deal フェーズ自動進行

---

### TC-013: フェーズ進行失敗時も承認は成功

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approveRequest SHALL advance Deal phase to won when sourceType is deal on full approval > Scenario: フェーズ進行失敗時も承認は成功

---

## approveRequest 連動処理（エッジケース）

### TC-014: sourceType が null の場合に連動処理が実行されない

**Category**: integration
**Priority**: should
**Source**: design.md > D3: 連動処理をトランザクション外で実行し、失敗時も承認を成功させる

**GIVEN** 全承認ステップが完了し、Request の `sourceType` が `null` である（通常の `createRequest` UC 経由で作成された Request）
**WHEN** `approveRequest` で最後のステップが承認される
**THEN** `dealRepository.create` も `dealRepository.updatePhase` も呼ばれず、`approveRequest` は `ok: true` を返す

---

### TC-015: 連動処理失敗時に approval.linkage_failed アクションで audit log が記録される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06: approveRequest に承認完了後の連動処理を追加

**GIVEN** 全承認ステップが完了し、Request の `sourceType` が `"inquiry"` であるが `dealRepository.create` が例外を throw する
**WHEN** `approveRequest` が最後のステップの承認を処理する
**THEN** `auditLogRepository.create` が `action: "approval.linkage_failed"` と `metadata.sourceType: "inquiry"` および `metadata.error` を含む形で呼ばれる

---

### TC-016: 不明な sourceType の場合に連動処理が実行されない

**Category**: integration
**Priority**: could
**Source**: design.md > D3: 連動処理をトランザクション外で実行し、失敗時も承認を成功させる

**GIVEN** 全承認ステップが完了し、Request の `sourceType` が `"inquiry"` でも `"deal"` でもない値（例: `"unknown"`）である
**WHEN** `approveRequest` で最後のステップが承認される
**THEN** `dealRepository.create` も `dealRepository.updatePhase` も呼ばれず、`approveRequest` は `ok: true` を返す

---

## スキーマ・ドメインモデル

### TC-017: マイグレーション適用後のカラム存在

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: requests table SHALL have sourceType and sourceId columns > Scenario: マイグレーション適用後のカラム存在

---

### TC-018: Request ドメインモデルに sourceType/sourceId フィールドが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02: Request ドメインモデルに sourceType/sourceId を追加

**GIVEN** `src/domain/models/request.ts` の `Request` 型定義がある
**WHEN** 型定義を参照する
**THEN** `sourceType: string | null` と `sourceId: string | null` の両フィールドが存在し、`typecheck` が green である

---

## Result

```yaml
result: completed
total: 18
automated: 17
manual: 1
must: 15
should: 2
could: 1
blocked_reasons: []
```
