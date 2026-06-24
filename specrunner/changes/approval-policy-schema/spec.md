# Spec: 承認ポリシーのスキーマとモデル追加

## Requirements

### Requirement: approval_policies テーブルが CHECK 制約付きで存在する

approval_policies テーブルは condition_field, condition_operator, condition_value の 3 フィールドが全て null か全て NOT NULL であることを CHECK 制約で保証 SHALL する。

#### Scenario: 条件なしのポリシーを挿入できる

**Given** approval_policies テーブルが存在する
**When** condition_field = NULL, condition_operator = NULL, condition_value = NULL で INSERT する
**Then** 行が正常に挿入される

#### Scenario: 条件付きのポリシーを挿入できる

**Given** approval_policies テーブルが存在する
**When** condition_field = 'amount', condition_operator = 'gt', condition_value = '100000' で INSERT する
**Then** 行が正常に挿入される

#### Scenario: 条件フィールドが部分的に null の場合は拒否される

**Given** approval_policies テーブルが存在する
**When** condition_field = 'amount', condition_operator = NULL, condition_value = '100000' で INSERT する
**Then** CHECK 制約違反で INSERT が拒否される

### Requirement: requests テーブルの origin カラムが CHECK 制約付きで存在する

requests テーブルは origin_type の値に応じて origin_policy_id, origin_trigger_action, origin_trigger_entity_id の null/not-null を CHECK 制約で保証 SHALL する。

#### Scenario: 手動起動のリクエスト（既存データ互換）

**Given** requests テーブルに origin カラムが存在する
**When** origin_type = 'manual', origin_policy_id = NULL, origin_trigger_action = NULL, origin_trigger_entity_id = NULL で INSERT する
**Then** 行が正常に挿入される

#### Scenario: システム起動のリクエスト

**Given** requests テーブルに origin カラムが存在する
**When** origin_type = 'system', origin_policy_id = (valid UUID), origin_trigger_action = 'deal.phase_change', origin_trigger_entity_id = (valid UUID) で INSERT する
**Then** 行が正常に挿入される

#### Scenario: system タイプで policy_id が null の場合は拒否される

**Given** requests テーブルに origin カラムが存在する
**When** origin_type = 'system', origin_policy_id = NULL, origin_trigger_action = 'deal.phase_change', origin_trigger_entity_id = (valid UUID) で INSERT する
**Then** CHECK 制約違反で INSERT が拒否される

#### Scenario: manual タイプで policy_id が設定されている場合は拒否される

**Given** requests テーブルに origin カラムが存在する
**When** origin_type = 'manual', origin_policy_id = (valid UUID), origin_trigger_action = NULL, origin_trigger_entity_id = NULL で INSERT する
**Then** CHECK 制約違反で INSERT が拒否される

### Requirement: 既存データのマイグレーションが正常に完了する

既存の requests 行は origin_type = 'manual' のデフォルト値が適用され、origin 関連フィールドは全て null MUST である。既存の approval_delegations 行は from_user_role に users テーブルの role 値が設定される MUST。

#### Scenario: 既存 requests 行が manual タイプになる

**Given** requests テーブルに origin カラムがない既存行が存在する
**When** マイグレーションを適用する
**Then** 全ての既存行の origin_type が 'manual' になり、origin_policy_id, origin_trigger_action, origin_trigger_entity_id が NULL になる

#### Scenario: 既存 approval_delegations 行に from_user_role が設定される

**Given** approval_delegations テーブルに from_user_role カラムがない既存行が存在する
**When** マイグレーションを適用する
**Then** 全ての既存行の from_user_role に対応する users.role の値が設定される

### Requirement: ApprovalPolicy モデル型が定義されている

`src/domain/models/approvalPolicy.ts` に ApprovalPolicy 型が定義され、`src/domain/models/index.ts` から re-export される MUST。domain 層のファイルは `@/infrastructure` を import してはならない (MUST NOT)。

#### Scenario: ApprovalPolicy 型が export されている

**Given** `src/domain/models/approvalPolicy.ts` が存在する
**When** ファイルの内容を確認する
**Then** `ApprovalPolicy` 型が export されている
**Then** `ConditionOperator` 型が export されている
**Then** `OriginType` 型が export されている
**Then** ファイルに `@/infrastructure` の import が含まれない

### Requirement: approvalPolicyRepository が findActiveByTriggerAction を実装している

approvalPolicyRepository は organizationId と triggerAction を条件として、is_active = true のポリシーを返す findActiveByTriggerAction 関数を提供 SHALL する。テナント分離が適用される MUST。

#### Scenario: アクティブなポリシーを取得する

**Given** organization_id = 'org-1' のアクティブなポリシーが trigger_action = 'deal.phase_change' で存在する
**When** findActiveByTriggerAction('org-1', 'deal.phase_change') を呼び出す
**Then** 該当ポリシーが返される

#### Scenario: 非アクティブなポリシーは除外される

**Given** organization_id = 'org-1' の非アクティブなポリシー (is_active = false) が trigger_action = 'deal.phase_change' で存在する
**When** findActiveByTriggerAction('org-1', 'deal.phase_change') を呼び出す
**Then** 空の配列が返される

#### Scenario: 他テナントのポリシーは除外される

**Given** organization_id = 'org-2' のアクティブなポリシーが trigger_action = 'deal.phase_change' で存在する
**When** findActiveByTriggerAction('org-1', 'deal.phase_change') を呼び出す
**Then** 空の配列が返される

### Requirement: 既存の手動承認フローが引き続き動作する

origin カラム追加後も、origin_type = 'manual' がデフォルトとして機能し、既存の requestRepository.create, approvalStepRepository.createMany, approvalDelegationRepository の全関数が従来通り動作 SHALL する。

#### Scenario: requestRepository.create が origin 未指定で動作する

**Given** origin 関連フィールドを指定しない
**When** requestRepository.create({ title, formData, organizationId, creatorId }) を呼び出す
**Then** originType = 'manual', originPolicyId = null, originTriggerAction = null, originTriggerEntityId = null のレコードが作成される

#### Scenario: approvalDelegationRepository が JOIN なしで動作する

**Given** from_user_role カラムに値が設定された approval_delegations 行が存在する
**When** approvalDelegationRepository.findActiveByToUserId を呼び出す
**Then** fromUserRole が直接カラムから取得され、結果が返される

### Requirement: approval_steps に name と approver_id が追加される

approval_steps テーブルに name (text nullable) と approver_id (uuid nullable FK → users) カラムが存在 MUST する。既存行は name = NULL, approver_id = NULL のまま維持される MUST。

#### Scenario: 既存の approval_steps 行が影響を受けない

**Given** approval_steps テーブルに既存行が存在する
**When** マイグレーションを適用する
**Then** 既存行の name は NULL、approver_id は NULL のまま維持される

#### Scenario: name と approver_id を指定してステップを作成できる

**Given** approval_steps テーブルにマイグレーションが適用済み
**When** name = '上長承認', approver_id = (valid user UUID) で INSERT する
**Then** 行が正常に挿入される
