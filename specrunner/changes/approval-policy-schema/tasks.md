# Tasks: 承認ポリシーのスキーマとモデル追加

## T-01: approval_policies テーブルの Drizzle スキーマ定義

- [x] `src/infrastructure/schema.ts` に `approvalPolicies` テーブルを追加する。`approvalTemplates` の定義の後に配置する。カラム: `id` (uuid PK defaultRandom), `organizationId` (uuid FK → organizations, notNull), `name` (text, notNull), `description` (text, nullable), `triggerAction` (text `"trigger_action"`, notNull), `conditionField` (text `"condition_field"`, nullable), `conditionOperator` (text `"condition_operator"`, nullable), `conditionValue` (text `"condition_value"`, nullable), `templateId` (uuid FK → approvalTemplates, notNull), `isActive` (boolean, notNull, default true), `createdAt` (timestamp `"created_at"`, defaultNow, notNull)
- [x] CHECK 制約を追加する: `check("approval_policies_condition_check", sql\`...\`)` で condition_field, condition_operator, condition_value の 3 フィールドが全部 null か全部 NOT NULL であることを保証する
- [x] `approvalPoliciesRelations` を追加する: `organization` (one → organizations), `template` (one → approvalTemplates) への relation
- [x] 複合インデックスを追加する: `index("approval_policies_org_trigger_active_idx").on(approvalPolicies.organizationId, approvalPolicies.triggerAction, approvalPolicies.isActive)` — `findActiveByTriggerAction` のクエリパフォーマンスのため

**Acceptance Criteria**:
- `approvalPolicies` テーブルが `src/infrastructure/schema.ts` に定義されている
- CHECK 制約 `approval_policies_condition_check` が定義されている
- 複合インデックス `approval_policies_org_trigger_active_idx` が定義されている
- relations が正しく定義されている
- `typecheck` が green

## T-02: requests テーブルへの origin カラム追加（スキーマ定義）

- [x] `src/infrastructure/schema.ts` の `requests` テーブルに以下のカラムを追加する: `originType` (text `"origin_type"`, notNull, default `'manual'`), `originPolicyId` (uuid `"origin_policy_id"`, nullable, FK → approvalPolicies、onDelete 指定なし＝デフォルト RESTRICT), `originTriggerAction` (text `"origin_trigger_action"`, nullable), `originTriggerEntityId` (uuid `"origin_trigger_entity_id"`, nullable)。`originPolicyId` の FK には `onDelete` を指定しない（デフォルト RESTRICT）。SET NULL にすると `origin_type = 'system'` のリクエストが存在する状態でポリシーを削除した際に `requests_origin_check` CHECK 制約（origin_policy_id IS NOT NULL）に違反するため
- [x] CHECK 制約を追加する: `check("requests_origin_check", sql\`...\`)` で origin_type = 'manual' なら policy 関連が全 null、origin_type = 'system' なら全 NOT NULL であることを保証する
- [x] `requestsRelations` に `originPolicy` (one → approvalPolicies, fields: [requests.originPolicyId]) への relation を追加する

**Acceptance Criteria**:
- `requests` テーブルに origin_type, origin_policy_id, origin_trigger_action, origin_trigger_entity_id カラムが定義されている
- origin_type のデフォルト値が `'manual'` である
- CHECK 制約 `requests_origin_check` が定義されている
- `originPolicy` relation が `requestsRelations` に追加されている
- `typecheck` が green

## T-03: approval_steps テーブルへの name / approver_id 追加（スキーマ定義）

- [x] `src/infrastructure/schema.ts` の `approvalSteps` テーブルに以下のカラムを追加する: `name` (text, nullable), `approverId` (uuid `"approver_id"`, nullable, FK → users)
- [x] `approvalStepsRelations` に `assignedApprover` (one → users, fields: [approvalSteps.approverId], 既存の `approver` relation と区別するため別名を使用) への relation を追加する

**Acceptance Criteria**:
- `approvalSteps` テーブルに name, approver_id カラムが定義されている
- 両カラムが nullable である
- `assignedApprover` relation が追加されている
- `typecheck` が green

## T-04: approval_delegations テーブルへの from_user_role 追加（スキーマ定義）

- [x] `src/infrastructure/schema.ts` の `approvalDelegations` テーブルに `fromUserRole` (text `"from_user_role"`, notNull) カラムを追加する

**Acceptance Criteria**:
- `approvalDelegations` テーブルに from_user_role カラムが定義されている
- カラムが notNull である
- `typecheck` が green

## T-05: organizations relations の更新

- [x] `src/infrastructure/schema.ts` の `organizationsRelations` に `approvalPolicies: many(approvalPolicies)` を追加する

**Acceptance Criteria**:
- `organizationsRelations` に `approvalPolicies` が含まれている
- `typecheck` が green

## T-06: マイグレーション SQL の生成と手動修正

- [x] `bunx drizzle-kit generate` を実行してマイグレーション SQL を生成する
- [x] 生成されたマイグレーションファイルの `approval_delegations.from_user_role` の部分を手動修正する: (a) `ADD COLUMN from_user_role text` で nullable として追加 → (b) `UPDATE approval_delegations SET from_user_role = (SELECT role FROM users WHERE users.id = approval_delegations.from_user_id)` で既存行を更新 → (c) `ALTER TABLE approval_delegations ALTER COLUMN from_user_role SET NOT NULL` で NOT NULL 制約を追加
- [x] `requests.origin_type` のデフォルト値が `'manual'` でマイグレーション SQL に含まれていることを確認する（既存行はデフォルト値で自動的に `'manual'` が入る）
- [x] CHECK 制約（`approval_policies_condition_check`, `requests_origin_check`）が SQL に含まれていることを確認する
- [x] `bunx drizzle-kit migrate` を実行してマイグレーションを適用する（ローカル DB がある場合）

**Acceptance Criteria**:
- `drizzle/` ディレクトリに新しいマイグレーション SQL ファイルが生成されている
- `approval_delegations.from_user_role` のマイグレーションが 3 ステップ（nullable 追加 → UPDATE → NOT NULL 設定）で構成されている
- 既存のマイグレーションファイルが変更・削除されていない
- DB リセット（DROP SCHEMA, db:reset）を実行していない

## T-07: ApprovalPolicy ドメインモデル型の定義

- [x] `src/domain/models/approvalPolicy.ts` を新規作成する
- [x] `ConditionOperator = "gt" | "gte" | "lt" | "lte" | "eq"` 型を export する。ファイル内に以下のコメントを添える: `// TODO: ConditionOperator は approvalTemplate.ts の StepCondition.operator と同一の値域。演算子追加時の片方更新漏れリスクを避けるため、将来 src/domain/models/shared.ts へ共有型として抽出することを検討する`
- [x] `OriginType = "manual" | "system"` 型を export する
- [x] `ApprovalPolicy` 型を export する。フィールド: id (string), organizationId (string), name (string), description (string | null), triggerAction (string), conditionField (string | null), conditionOperator (ConditionOperator | null), conditionValue (string | null), templateId (string), isActive (boolean), createdAt (Date)
- [x] `src/domain/models/index.ts` に `ApprovalPolicy`, `ConditionOperator`, `OriginType` の re-export を追加する

**Acceptance Criteria**:
- `src/domain/models/approvalPolicy.ts` が存在し、`ApprovalPolicy`, `ConditionOperator`, `OriginType` 型が export されている
- ファイルに `@/infrastructure` や `drizzle` の import がない
- `src/domain/models/index.ts` から re-export されている
- `typecheck` が green

## T-08: Request モデル型の拡張

- [x] `src/domain/models/request.ts` に `OriginType` を `@/domain/models/approvalPolicy` から import する
- [x] `Request` 型に以下のフィールドを追加する: `originType: OriginType`, `originPolicyId: string | null`, `originTriggerAction: string | null`, `originTriggerEntityId: string | null`

**Acceptance Criteria**:
- `Request` 型に originType, originPolicyId, originTriggerAction, originTriggerEntityId が含まれている
- `originType` の型が `OriginType` である
- `typecheck` が green

## T-09: ApprovalStep モデル型の拡張

- [x] `src/domain/models/approvalStep.ts` の `ApprovalStep` 型に以下のフィールドを追加する: `name: string | null`, `approverId: string | null`

**Acceptance Criteria**:
- `ApprovalStep` 型に name, approverId が含まれている
- 両フィールドが `string | null` 型である
- `typecheck` が green

## T-10: approvalPolicyRepository の新設

- [x] `src/infrastructure/repositories/approvalPolicyRepository.ts` を新規作成する
- [x] `mapRow` 関数を実装する: DB 行を `ApprovalPolicy` 型に変換。`conditionOperator` はガード関数でバリデーションする: `const CONDITION_OPERATORS: ReadonlySet<ConditionOperator> = new Set(["gt", "gte", "lt", "lte", "eq"])` を定義し、`row.conditionOperator !== null && !CONDITION_OPERATORS.has(row.conditionOperator as ConditionOperator)` の場合は `Error` を throw する。バリデーション通過後に `as ConditionOperator` でキャストする
- [x] `create(data, tx?)` を実装する: `approvalPolicies` テーブルに INSERT + returning + mapRow
- [x] `findById(id, organizationId)` を実装する: id + organizationId で絞り込み、mapRow で変換
- [x] `findByOrganization(organizationId)` を実装する: organizationId で絞り込み、createdAt 降順
- [x] `findActiveByTriggerAction(organizationId, triggerAction)` を実装する: organizationId + triggerAction + isActive = true で絞り込み
- [x] `updateById(id, organizationId, data, tx?)` を実装する: 指定カラムの更新 + returning + mapRow
- [x] `deleteById(id, organizationId, tx?)` を実装する: id + organizationId で削除
- [x] `src/infrastructure/repositories/index.ts` に `approvalPolicyRepository` の re-export を追加する

**Acceptance Criteria**:
- `approvalPolicyRepository` の 6 関数（`create`, `findById`, `findByOrganization`, `findActiveByTriggerAction`, `updateById`, `deleteById`）が export されている
- 全関数にテナント分離（organizationId 条件）が適用されている
- `findActiveByTriggerAction` が `isActive = true` を条件に含んでいる
- `tx` 引数省略時は module-level の `db` でクエリが実行される
- `src/infrastructure/repositories/index.ts` に re-export が追加されている
- `typecheck` が green

## T-11: requestRepository のマッピング関数更新

- [x] `src/infrastructure/repositories/requestRepository.ts` の `mapRow` 関数に以下を追加する: `originType: row.originType as OriginType`, `originPolicyId: row.originPolicyId ?? null`, `originTriggerAction: row.originTriggerAction ?? null`, `originTriggerEntityId: row.originTriggerEntityId ?? null`
- [x] `OriginType` を `@/domain/models/approvalPolicy` から import する
- [x] `create` 関数の引数の `data` 型に `originType?`, `originPolicyId?`, `originTriggerAction?`, `originTriggerEntityId?` を追加する
- [x] `create` 関数の `.values()` に origin 関連フィールドを追加する（デフォルト値: `originType ?? 'manual'`, その他は `?? null`）

**Acceptance Criteria**:
- `mapRow` が originType, originPolicyId, originTriggerAction, originTriggerEntityId を返す
- `create` 関数で origin 関連フィールドを省略した場合に originType = 'manual', その他 = null で作成される
- `typecheck` が green

## T-12: approvalStepRepository のマッピング関数更新

- [x] `src/infrastructure/repositories/approvalStepRepository.ts` の `mapRow` 関数に以下を追加する: `name: row.name ?? null`, `approverId: row.approverId ?? null`
- [x] `createMany` 関数の引数の各要素に `name?: string | null`, `approverId?: string | null` を追加する
- [x] `createMany` 関数の `.values()` に name, approverId を追加する（デフォルト値: `?? null`）

**Acceptance Criteria**:
- `mapRow` が name, approverId を返す
- `createMany` 関数で name, approverId を省略した場合に null で作成される
- `typecheck` が green

## T-13: approvalDelegationRepository の JOIN 削除と直接カラム参照への切り替え

- [x] `src/infrastructure/repositories/approvalDelegationRepository.ts` の `mapRow` 関数を変更する: 第 2 引数 `fromUserRole: string` を削除し、`row.fromUserRole` を直接参照する。`mapRow(row: DelegationRow): ApprovalDelegation` のシグネチャにする
- [x] `findActiveByToUserId` から `users` テーブルの JOIN を削除する: `.select()` から `fromUserRole` フィールドを削除し、`.innerJoin(fromUsers, ...)` を削除する。mapRow 呼び出しを `mapRow(row)` に変更する（第 2 引数を削除）
- [x] `findByOrganization` から同様に JOIN を削除する
- [x] `findOverlapping` から同様に JOIN を削除する
- [x] `create` 関数を更新する: (a) 引数に `fromUserRole: string` を追加 (b) `.values()` に `fromUserRole: data.fromUserRole` を追加 (c) INSERT 後の追加 SELECT クエリ（users テーブルからの role 取得）を削除 (d) `mapRow(row)` に変更
- [x] `update` 関数を更新する: INSERT 後の追加 SELECT クエリを削除し、`mapRow(row)` に変更
- [x] `users` の import が不要になった場合は削除する（他に users を参照する箇所がないか確認）

**Acceptance Criteria**:
- `mapRow` 関数が第 2 引数を取らない
- `findActiveByToUserId`, `findByOrganization`, `findOverlapping` が `users` テーブルとの JOIN を含まない
- `create` 関数が `fromUserRole` を引数で受け取り、INSERT 時に直接設定する
- `create`, `update` 関数が追加の SELECT クエリを含まない
- `typecheck` が green

## T-13b: createDelegation usecase の呼び出し更新

- [x] `src/application/usecases/createDelegation.ts` の `approvalDelegationRepository.create()` 呼び出し（トランザクション内）を更新する: `fromUserRole: fromUser.role` を data オブジェクトに追加する。`fromUser` は既にステップ 3 のクロスオーグチェックで取得済みのため、追加の DB クエリは不要

**Acceptance Criteria**:
- `approvalDelegationRepository.create()` の呼び出し引数に `fromUserRole: fromUser.role` が含まれている
- `typecheck` が green

## T-14: シードデータの更新

- [x] `src/infrastructure/seed.ts` に `approvalPolicies` テーブルの import を追加する
- [x] truncate 処理に `approvalPolicies` の削除を追加する。`requests` テーブルの後に配置する（requests.origin_policy_id → approval_policies.id の FK 制約により、子テーブルである requests を先に削除する必要がある）。`approvalTemplates` の削除の前に配置する
- [x] サンプルポリシーを 1 件追加する: name = '案件フェーズ変更時の承認', trigger_action = 'deal.phase_change', condition なし, template_id = expenseTemplate.id, is_active = true
- [x] 既存の `approval_delegations` の INSERT に `fromUserRole` フィールドを追加する: `fromUserRole: "manager"`（managerUser → adminUser の委譲のため）

**Acceptance Criteria**:
- `approvalPolicies` のインポートが追加されている
- truncate 処理の順序が FK 制約に適合している
- サンプルポリシーが 1 件作成される
- `approval_delegations` の INSERT に `fromUserRole` が含まれている
- `typecheck` が green

## T-15: 静的解析テストの更新

- [x] `src/__tests__/static/projectStructure.test.ts` に以下のテストを追加する:
  - `approvalPolicy domain model file exists` — `src/domain/models/approvalPolicy.ts` の存在確認
  - `approvalPolicy domain model exports ApprovalPolicy type` — ファイル内容に `ApprovalPolicy`, `ConditionOperator`, `OriginType` が含まれることを確認
  - `approvalPolicy domain model has no infrastructure imports` — ファイルに `@/infrastructure` が含まれないことを確認
  - `approvalPolicyRepository.ts exists` — `src/infrastructure/repositories/approvalPolicyRepository.ts` の存在確認
  - `repositories/index.ts exports approvalPolicyRepository` — index.ts に `approvalPolicyRepository` が含まれることを確認
  - `domain/models/index.ts exports ApprovalPolicy` — index.ts に `ApprovalPolicy` が含まれることを確認
  - `schema.ts contains approval_policies table definition` — schema.ts に `approval_policies`, `trigger_action`, `condition_field`, `condition_operator`, `condition_value`, `template_id`, `is_active` が含まれることを確認
  - `schema.ts contains from_user_role column in approval_delegations` — schema.ts に `from_user_role` が含まれることを確認
  - `schema.ts contains origin columns in requests` — schema.ts に `origin_type`, `origin_policy_id`, `origin_trigger_action`, `origin_trigger_entity_id` が含まれることを確認
  - `schema.ts contains name and approver_id in approval_steps` — schema.ts の approval_steps 定義に `approver_id` が含まれることを確認
  - `approvalDelegationRepository does not JOIN users for fromUserRole` — `approvalDelegationRepository.ts` に `innerJoin(fromUsers` が含まれないことを確認

**Acceptance Criteria**:
- 上記の全テストが追加されている
- `bun test` が green

## T-16: ビルド検証と最終確認

- [x] `typecheck` が green であることを確認する
- [x] `bun test` が全件 green であることを確認する
- [x] `bun run build` が成功することを確認する
- [x] 以下のチェックリストを目視確認する:
  - approval_policies テーブルが schema.ts に定義されている
  - requests テーブルに origin_type, origin_policy_id, origin_trigger_action, origin_trigger_entity_id が定義されている
  - approval_steps テーブルに name, approver_id が定義されている
  - approval_delegations テーブルに from_user_role が定義されている
  - ApprovalPolicy モデル型が `src/domain/models/approvalPolicy.ts` に定義されている
  - approvalPolicyRepository が `findActiveByTriggerAction` を export している
  - requestRepository.create が origin 未指定で動作する（デフォルト 'manual'）
  - approvalDelegationRepository が users テーブルとの JOIN を含まない
  - `drizzle/` ディレクトリにマイグレーション SQL が存在する
  - DB リセットを実行していない
  - 依存方向 `domain → (nothing external)` が遵守されている: `src/domain/` 配下に `@/infrastructure` の import がないことを確認する
