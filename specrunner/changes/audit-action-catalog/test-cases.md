# Test Cases: audit-action-catalog

## Summary

- **Total**: 21 cases
- **Automated** (unit/integration): 19
- **Manual**: 2
- **Priority**: must: 17, should: 4, could: 0

---

### TC-001: カタログに存在する action キーでラベルを取得できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: activityLabels のラベル表キーは AuditAction 型に制約される > Scenario: カタログに存在する action キーでラベルを取得できる

---

### TC-002: ラベル未定義の action はフォールバックで action 文字列をそのまま返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: activityLabels のラベル表キーは AuditAction 型に制約される > Scenario: ラベル未定義の action はフォールバックで action 文字列をそのまま返す

---

### TC-003: action_item.toggle は metadata.done に応じたラベルを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: activityLabels のラベル表キーは AuditAction 型に制約される > Scenario: action_item.toggle は metadata.done に応じたラベルを返す

---

### TC-004: カタログ外の action 文字列を渡してもコンパイルエラーにならない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: getActionLabel は string 型の action を受け付ける > Scenario: カタログ外の action 文字列を渡してもコンパイルエラーにならない

---

### TC-005: AuditMetadataMap が action_item.toggle の metadata 形を `{ done: boolean }` として定義している

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: action_item.toggle の metadata 型が AuditMetadataMap で定義される > Scenario: AuditMetadataMap が action_item.toggle の metadata 形を { done: boolean } として定義している

---

### TC-006: 型制約追加後も audit_logs に記録される文字列値が変化しない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 記録される文字列値と記録挙動は不変 > Scenario: 型制約追加後も audit_logs に記録される文字列値が変化しない

---

### TC-007: AuditAction 型が 48 種の文字列リテラルユニオンとして定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 > Acceptance Criteria

**GIVEN** `src/domain/models/auditLog.ts` に `AuditAction` 型が定義されている
**WHEN** ソースコードを静的テストで読み取り、export されている `AuditAction` の内容を検査する
**THEN** `deal.create` / `deal.update` / `deal.updatePhase` / `deal.delete` / `deal_contact.create` / `deal_contact.delete` / `contract.create` / `contract.update` / `contract.updateStatus` / `contract.delete` / `invoice.create` / `invoice.update` / `invoice.update_status` / `meeting.create` / `meeting.update` / `action_item.create` / `action_item.update` / `action_item.delete` / `action_item.toggle` / `inquiry.create` / `inquiry.update` / `inquiry.updateStatus` / `inquiry.conversionPending` / `inquiry.delete` / `request.create` / `request.approve` / `request.reject` / `request.resubmit` / `request.expire` / `request.submit` / `approval_step.approve` / `approval_step.reject` / `delegation.create` / `delegation.deactivate` / `policy.create` / `policy.update` / `policy.activate` / `policy.deactivate` / `template.create` / `template.update` / `template.delete` / `revenue_target.create` / `revenue_target.update` / `revenue_target.delete` / `client.create` / `client_contact.create` / `client_contact.delete` / `user.updateRole` の 48 種が全て含まれている

---

### TC-008: AuditTargetType 型が 15 種の文字列リテラルユニオンとして定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 > Acceptance Criteria

**GIVEN** `src/domain/models/auditLog.ts` に `AuditTargetType` 型が定義されている
**WHEN** ソースコードを静的テストで読み取り、export されている `AuditTargetType` の内容を検査する
**THEN** `action_item` / `approvalPolicy` / `client` / `client_contact` / `contract` / `deal` / `deal_contact` / `delegation` / `inquiry` / `invoice` / `meeting` / `request` / `revenue_target` / `template` / `user` の 15 種が全て含まれている

---

### TC-009: AuditAction / AuditTargetType / AuditMetadataMap が auditLog.ts から export されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 > Acceptance Criteria / T-05 > テスト 1, 2, 7

**GIVEN** `src/domain/models/auditLog.ts` が存在する
**WHEN** ソースコードを静的テストで読み取る
**THEN** `export type AuditAction`・`export type AuditTargetType`・`export type AuditMetadataMap` の各宣言が全て含まれている

---

### TC-010: AuditLog の action が AuditAction 型、targetType が AuditTargetType 型で定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02 > Acceptance Criteria / T-05 > テスト 3, 4

**GIVEN** `src/domain/models/auditLog.ts` に `AuditLog` 型が定義されている
**WHEN** ソースコードを静的テストで検査する
**THEN** `action: AuditAction` および `targetType: AuditTargetType` の記述が含まれている

---

### TC-011: AuditLog.metadata の型が変更されていない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02 > Acceptance Criteria

**GIVEN** `src/domain/models/auditLog.ts` の `AuditLog` 型定義が存在する
**WHEN** ソースコードで `metadata` フィールドの型を検査する
**THEN** `metadata` の型が `Record<string, unknown> | null` のままであり、変更されていない

---

### TC-012: auditLogRepository.create の action / targetType パラメータがカタログ型を使用している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 > Acceptance Criteria / T-05 > テスト 5

**GIVEN** `auditLogRepository` の実装ファイルが存在する
**WHEN** ソースコードを静的テストで検査する
**THEN** `create` 関数のパラメータ型定義に `action: AuditAction` および `targetType: AuditTargetType` が含まれている

---

### TC-013: auditLogRepository のクエリフィルタパラメータが string 型のまま維持されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03 > Acceptance Criteria / design.md > Goals > Non-Goals

**GIVEN** `auditLogRepository` に `findByOrganization` / `findByTargets` が定義されている
**WHEN** ソースコードでフィルタパラメータの型を検査する
**THEN** `options.action`・`options.targetType`・`targets[].targetType` の型が `string` のまま維持されており、`AuditAction` / `AuditTargetType` に狭められていない

---

### TC-014: ACTION_LABELS が `Partial<Record<AuditAction, string>>` 型で定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 > Acceptance Criteria / T-05 > テスト 6

**GIVEN** `src/lib/activityLabels.ts` に `ACTION_LABELS` が定義されている
**WHEN** ソースコードを静的テストで読み取る
**THEN** `Partial<Record<AuditAction, string>>` の型アノテーションが `ACTION_LABELS` の定義に含まれている

---

### TC-015: ACTION_LABELS に AuditAction 外のキーを追加するとコンパイルエラーになる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 > Acceptance Criteria / design.md > D4

**GIVEN** `ACTION_LABELS` が `Partial<Record<AuditAction, string>>` として型付けされている
**WHEN** カタログに存在しないキー（例: `"unknown.typo"` や `"deal.typo"`）をオブジェクトリテラルに追加する
**THEN** TypeScript コンパイラがエラーを報告し、コンパイルが失敗する

---

### TC-016: DB マッピングで row.action / row.targetType に型アサーションが追加されている

**Category**: unit
**Priority**: should
**Source**: design.md > D6 / tasks.md > T-03

**GIVEN** `auditLogRepository` の DB → ドメインモデルマッピングロジックが存在する
**WHEN** ソースコードを検査する
**THEN** `findByOrganization`・`findByTargets`・`create` の返り値マッピングに `row.action as AuditAction` および `row.targetType as AuditTargetType` の型アサーションが含まれている

---

### TC-017: action_item.toggle の metadata.done が false のときのラベル確認

**Category**: unit
**Priority**: should
**Source**: design.md > D5 / tasks.md > T-01

**GIVEN** `getActionLabel` が `action_item.toggle` を `metadata.done` の値に応じて特別処理する
**WHEN** `getActionLabel({ action: "action_item.toggle", metadata: { done: false } })` を呼び出す
**THEN** 既存の未完了ラベル（変更前と同一の文字列）が返される

---

### TC-018: 静的検証テスト 8 件が全て green である

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 > Acceptance Criteria

**GIVEN** `src/__tests__/static/projectStructure.test.ts` に監査カタログ関連の 8 件の静的検証テストが追記されている（T-05 記載のテスト 1〜8）
**WHEN** `bun test` を実行する
**THEN** 追加した 8 テストが全て pass する

---

### TC-019: bun run build で typecheck が通る（全記録サイト適合確認）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06 > Acceptance Criteria / T-03 > Acceptance Criteria

**GIVEN** `application/usecases/` 配下 43 箇所 + `infrastructure/handlers/auditLogHandler.ts` 1 箇所の全記録サイトが `auditLogRepository.create` の型付きパラメータに適合するよう更新されている
**WHEN** `bun run build` を実行する
**THEN** TypeScript typecheck が 0 エラーで通過する

---

### TC-020: 既存テストスイートが全て green（テスト変更なし）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06 > Acceptance Criteria

**GIVEN** 本変更はランタイム挙動に影響しない型レベルのリファクタリングであり、既存テストファイルは無変更である
**WHEN** 既存のテストスイートを `bun test` で実行する
**THEN** 新規追加分（T-05 静的検証テスト）を含む全テストが pass し、失敗が 0 件である

---

### TC-021: 既存の activityLabels.test.ts が無変更で green になる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 > Acceptance Criteria

**GIVEN** `getActionLabel` の引数型が `{ action: string; metadata: Record<string, unknown> | null }` に緩和されており、`activityLabels.test.ts` のテストコードは変更されていない
**WHEN** `bun test src/__tests__/activityLabels.test.ts`（またはテストスイート全体）を実行する
**THEN** `"unknown.action"` フォールバックテストを含む全テストケースが pass する

---

## Result

```yaml
result: completed
total: 21
automated: 19
manual: 2
must: 17
should: 4
could: 0
blocked_reasons: []
```
