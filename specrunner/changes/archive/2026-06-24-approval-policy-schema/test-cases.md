# Test Cases: 承認ポリシーのスキーマとモデル追加

## Summary

- **Total**: 30 cases
- **Automated** (unit/integration): 28
- **Manual**: 2
- **Priority**: must: 26, should: 4, could: 0

---

## Category: approval_policies テーブル CHECK 制約

### TC-001: 条件なしのポリシーを挿入できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approval_policies テーブルが CHECK 制約付きで存在する > Scenario: 条件なしのポリシーを挿入できる

---

### TC-002: 条件付きのポリシーを挿入できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approval_policies テーブルが CHECK 制約付きで存在する > Scenario: 条件付きのポリシーを挿入できる

---

### TC-003: 条件フィールドが部分的に null の場合は拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approval_policies テーブルが CHECK 制約付きで存在する > Scenario: 条件フィールドが部分的に null の場合は拒否される

---

## Category: requests テーブル origin CHECK 制約

### TC-004: 手動起動のリクエスト（既存データ互換）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: requests テーブルの origin カラムが CHECK 制約付きで存在する > Scenario: 手動起動のリクエスト（既存データ互換）

---

### TC-005: システム起動のリクエスト

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: requests テーブルの origin カラムが CHECK 制約付きで存在する > Scenario: システム起動のリクエスト

---

### TC-006: system タイプで policy_id が null の場合は拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: requests テーブルの origin カラムが CHECK 制約付きで存在する > Scenario: system タイプで policy_id が null の場合は拒否される

---

### TC-007: manual タイプで policy_id が設定されている場合は拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: requests テーブルの origin カラムが CHECK 制約付きで存在する > Scenario: manual タイプで policy_id が設定されている場合は拒否される

---

## Category: データマイグレーション

### TC-008: 既存 requests 行が manual タイプになる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 既存データのマイグレーションが正常に完了する > Scenario: 既存 requests 行が manual タイプになる

---

### TC-009: 既存 approval_delegations 行に from_user_role が設定される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 既存データのマイグレーションが正常に完了する > Scenario: 既存 approval_delegations 行に from_user_role が設定される

---

## Category: ApprovalPolicy モデル型

### TC-010: ApprovalPolicy 型が export されている

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ApprovalPolicy モデル型が定義されている > Scenario: ApprovalPolicy 型が export されている

---

## Category: approvalPolicyRepository findActiveByTriggerAction

### TC-011: アクティブなポリシーを取得する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approvalPolicyRepository が findActiveByTriggerAction を実装している > Scenario: アクティブなポリシーを取得する

---

### TC-012: 非アクティブなポリシーは除外される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approvalPolicyRepository が findActiveByTriggerAction を実装している > Scenario: 非アクティブなポリシーは除外される

---

### TC-013: 他テナントのポリシーは除外される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approvalPolicyRepository が findActiveByTriggerAction を実装している > Scenario: 他テナントのポリシーは除外される

---

## Category: 既存フローとの後方互換性

### TC-014: requestRepository.create が origin 未指定で動作する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 既存の手動承認フローが引き続き動作する > Scenario: requestRepository.create が origin 未指定で動作する

---

### TC-015: approvalDelegationRepository が JOIN なしで動作する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 既存の手動承認フローが引き続き動作する > Scenario: approvalDelegationRepository が JOIN なしで動作する

---

## Category: approval_steps カラム追加

### TC-016: 既存の approval_steps 行が影響を受けない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approval_steps に name と approver_id が追加される > Scenario: 既存の approval_steps 行が影響を受けない

---

### TC-017: name と approver_id を指定してステップを作成できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approval_steps に name と approver_id が追加される > Scenario: name と approver_id を指定してステップを作成できる

---

## Category: approvalPolicyRepository 実装詳細

### TC-018: mapRow が未知の conditionOperator でエラーを throw する

**Category**: unit
**Priority**: must
**Source**: design.md > D9: approvalPolicyRepository の新設; tasks.md > T-10

**GIVEN** `conditionOperator = 'unknown_op'` を含む DB 行  
**WHEN** `mapRow` 関数を呼び出す  
**THEN** `Error` が throw される

---

### TC-019: findById が異なる organizationId の場合 undefined を返す

**Category**: integration
**Priority**: must
**Source**: design.md > D9: approvalPolicyRepository の新設; tasks.md > T-10

**GIVEN** `organization_id = 'org-1'` のポリシーが存在する  
**WHEN** `findById(policyId, 'org-2')` を呼び出す  
**THEN** `undefined` が返される（テナント分離）

---

### TC-020: findByOrganization が createdAt 降順で返す

**Category**: integration
**Priority**: should
**Source**: design.md > D9: approvalPolicyRepository の新設; tasks.md > T-10

**GIVEN** `organization_id = 'org-1'` のポリシーが複数存在し、`createdAt` が異なる  
**WHEN** `findByOrganization('org-1')` を呼び出す  
**THEN** `createdAt` 降順で配列が返される

---

## Category: approvalDelegationRepository リファクタリング

### TC-021: approvalDelegationRepository.create が fromUserRole を直接 INSERT する

**Category**: integration
**Priority**: must
**Source**: design.md > D4: approval_delegations テーブルへの from_user_role 追加; tasks.md > T-13

**GIVEN** `from_user_role` カラムが存在する `approval_delegations` テーブル  
**WHEN** `approvalDelegationRepository.create({ ..., fromUserRole: 'manager' })` を呼び出す  
**THEN** `from_user_role = 'manager'` の行が挿入される

---

### TC-022: createDelegation usecase が fromUserRole を repository に渡す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-13b: createDelegation usecase の呼び出し更新

**GIVEN** `fromUser.role = 'manager'` のユーザーによる委譲作成リクエスト  
**WHEN** `createDelegation` usecase を実行する  
**THEN** `approvalDelegationRepository.create` が `fromUserRole: 'manager'` を含む引数で呼び出される

---

## Category: スキーマ定義

### TC-023: schema.ts に複合インデックスが定義されている

**Category**: unit
**Priority**: should
**Source**: design.md > D9: approvalPolicyRepository の新設; tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` が存在する  
**WHEN** ファイルの内容を確認する  
**THEN** `approval_policies_org_trigger_active_idx` が `organizationId`, `triggerAction`, `isActive` を含む複合インデックスとして定義されている

---

## Category: コード構造確認

### TC-024: approvalPolicyRepository が repositories/index.ts から re-export されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10; tasks.md > T-15

**GIVEN** `src/infrastructure/repositories/index.ts` が存在する  
**WHEN** ファイルの内容を確認する  
**THEN** `approvalPolicyRepository` がエクスポートされている

---

### TC-025: domain/models/index.ts が ApprovalPolicy を re-export している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07; tasks.md > T-15

**GIVEN** `src/domain/models/index.ts` が存在する  
**WHEN** ファイルの内容を確認する  
**THEN** `ApprovalPolicy`, `ConditionOperator`, `OriginType` が re-export されている

---

### TC-026: approvalDelegationRepository に users テーブルとの JOIN が含まれない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-13; tasks.md > T-15

**GIVEN** `src/infrastructure/repositories/approvalDelegationRepository.ts` が存在する  
**WHEN** ファイルの内容を確認する  
**THEN** `innerJoin` を使った users テーブルとの JOIN 記述（`innerJoin(fromUsers` 等）が存在しない

---

## Category: マイグレーション検証

### TC-027: from_user_role のマイグレーションが 3 ステップで構成されている

**Category**: manual
**Priority**: must
**Source**: design.md > D4: approval_delegations テーブルへの from_user_role 追加; design.md > D13: マイグレーション戦略; tasks.md > T-06

**GIVEN** `drizzle/` ディレクトリに最新のマイグレーション SQL ファイルが存在する  
**WHEN** ファイルの内容を目視確認する  
**THEN** `approval_delegations.from_user_role` の追加が (1) nullable で `ADD COLUMN from_user_role text` → (2) `UPDATE approval_delegations SET from_user_role = (SELECT role FROM users ...)` → (3) `ALTER COLUMN from_user_role SET NOT NULL` の 3 ステップで構成されている

---

## Category: リポジトリ引数デフォルト値

### TC-028: approvalStepRepository.createMany が name/approverId 省略時に null で作成する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-12: approvalStepRepository のマッピング関数更新

**GIVEN** `approval_steps` テーブルにマイグレーションが適用済み  
**WHEN** `approvalStepRepository.createMany([{ roleLevel, approverRole, order, requestId }])` を呼び出す（`name`/`approverId` 未指定）  
**THEN** `name = null`, `approver_id = null` のレコードが作成される

---

## Category: シードデータ

### TC-029: seed.ts の truncate 順序が FK 制約に適合している

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-14: シードデータの更新; design.md > D12: シードデータの更新

**GIVEN** `src/infrastructure/seed.ts` が存在する  
**WHEN** truncate 処理の記述順序を確認する  
**THEN** `requests` テーブルの truncate が `approvalPolicies` テーブルの truncate より前に記述されている（`requests.origin_policy_id → approval_policies.id` の FK 制約により子テーブルを先に削除する必要がある）

---

## Category: ビルド検証

### TC-030: typecheck && bun test が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-16: ビルド検証と最終確認

**GIVEN** 全ての変更（T-01 〜 T-15）が実装されている  
**WHEN** `typecheck && bun test` を実行する  
**THEN** 型エラーなし・テスト全件 pass で終了する

---

## Result

```yaml
result: completed
total: 30
automated: 28
manual: 2
must: 26
should: 4
could: 0
blocked_reasons: []
```
