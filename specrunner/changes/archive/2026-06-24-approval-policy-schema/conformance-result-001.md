# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ | T-01〜T-16（T-13b 含む）全チェックボックスが [x] 済み |
| design.md | ✅ | D1〜D13 の全設計判断が実装に反映されている |
| spec.md | ✅ | 全 Requirements（SHALL/MUST）とシナリオを実装が充足している |
| request.md | ✅ | 全受け入れ基準（9 項目）が実装により充足されている |

---

## 詳細所見

### tasks.md — T-01〜T-16 完了確認

全タスクが `[x]` 済みであることを目視確認した。

### design.md — 設計判断の実装検証

| 判断 | 設計内容 | 実装確認 | 結果 |
|------|---------|---------|------|
| D1 | approval_policies テーブル（text 型, CHECK 制約, 複合インデックス） | `schema.ts:108-138`：`approvalPolicies` テーブル定義、`approval_policies_condition_check` CHECK 制約、`approval_policies_org_trigger_active_idx` インデックスを確認 | ✅ |
| D2 | requests テーブルへの origin カラム追加（text 型, CHECK 制約, RESTRICT FK） | `schema.ts:156-165`：origin カラム群と `requests_origin_check` CHECK 制約。FK に `onDelete` 未指定（デフォルト RESTRICT）を確認 | ✅ |
| D3 | approval_steps に name / approver_id 追加（nullable） | `schema.ts:200-201`：`name text` と `approver_id uuid` が nullable で追加されている | ✅ |
| D4 | approval_delegations に from_user_role 追加（3 ステップ migration） | `schema.ts:278`：`fromUserRole text notNull`。`drizzle/0005_black_absorbing_man.sql:16-18` で nullable 追加 → UPDATE → NOT NULL の 3 ステップを確認 | ✅ |
| D5 | ApprovalPolicy ドメインモデル型の定義 | `approvalPolicy.ts`：`ConditionOperator`、`OriginType`、`ApprovalPolicy` 型定義。TODO コメント付き。`@/infrastructure` import なし | ✅ |
| D6 | Request モデル型の拡張 | `request.ts:16-19`：`originType: OriginType`、`originPolicyId`、`originTriggerAction`、`originTriggerEntityId` の 4 フィールドを確認 | ✅ |
| D7 | ApprovalStep モデル型の拡張 | `approvalStep.ts:16-17`：`name: string \| null`、`approverId: string \| null` を確認 | ✅ |
| D8 | ApprovalDelegation モデル型の確認 | 既存の `fromUserRole: string` フィールドが維持されており型変更不要。スキーマとの整合を確認 | ✅ |
| D9 | approvalPolicyRepository の新設（6 関数 + テナント分離） | `create`, `findById`, `findByOrganization`, `findActiveByTriggerAction`, `updateById`, `deleteById` の 6 関数実装確認。全関数に `organizationId` 条件。`tx` 省略時は module-level の `db` でクエリ | ✅ |
| D10 | 既存リポジトリの更新 | `requestRepository`、`approvalStepRepository`、`approvalDelegationRepository` の mapRow 更新を確認。JOIN 削除済み | ✅ |
| D11 | Relations の追加 | `approvalPoliciesRelations`、`organizationsRelations.approvalPolicies`、`requestsRelations.originPolicy`、`approvalStepsRelations.assignedApprover` を確認 | ✅ |
| D12 | シードデータの更新 | `seed.ts:56`：`approvalPolicies` truncate（FK 順序 requests → approvalPolicies → approvalTemplates）。サンプルポリシー挿入（L205-211）。`fromUserRole: "manager"` の delegation 挿入（L378）を確認 | ✅ |
| D13 | マイグレーション戦略（差分のみ / DB リセットなし） | `drizzle/0005_black_absorbing_man.sql` に差分 SQL のみ。DROP TABLE / TRUNCATE / DROP SCHEMA なし | ✅ |

### spec.md — Requirements / Scenarios の充足確認

**Requirement: approval_policies テーブルが CHECK 制約付きで存在する**
- `approvalPolicies` テーブルが `schema.ts` に定義されている ✅
- `approval_policies_condition_check`（condition 3 フィールドの all-null / all-NOT-NULL）が schema.ts と migration SQL の両方に含まれる ✅

**Requirement: requests テーブルの origin カラムが CHECK 制約付きで存在する**
- 4 カラムすべてが `schema.ts` に定義されている ✅
- `origin_type` のデフォルト値が `'manual'` ✅
- `requests_origin_check` CHECK 制約が migration SQL に追加されている ✅
- `origin_policy_id` FK は ON DELETE no action（= RESTRICT）、設計判断 D2 に準拠 ✅

**Requirement: 既存データのマイグレーションが正常に完了する**
- `requests.origin_type` は `DEFAULT 'manual' NOT NULL` で追加されるため既存行は自動的に `'manual'` になる ✅
- `approval_delegations.from_user_role` は 3 ステップ migration で対応。FK 制約により `from_user_id` に対応する `users` 行が必ず存在するため UPDATE 後に NULL 残りなし ✅

**Requirement: ApprovalPolicy モデル型が定義されている**
- `src/domain/models/approvalPolicy.ts` に `ApprovalPolicy`、`ConditionOperator`、`OriginType` が export されている ✅
- ファイルに `@/infrastructure` の import が存在しない ✅
- `src/domain/models/index.ts` から 3 型が re-export されている ✅

**Requirement: approvalPolicyRepository が findActiveByTriggerAction を実装している**
- `findActiveByTriggerAction` が `isActive = true` かつ `organizationId` 条件で絞り込みを行っている ✅
- `conditionOperator` の実行時バリデーション（`CONDITION_OPERATORS` セット）が実装されている ✅

**Requirement: 既存の手動承認フローが引き続き動作する**
- `requestRepository.create` で `originType` 未指定時に `"manual"` がデフォルト適用される ✅
- `approvalDelegationRepository` の全クエリ関数から `users` テーブルとの JOIN が削除されている ✅
- `createDelegation.ts` の `approvalDelegationRepository.create()` 呼び出しに `fromUserRole: fromUser.role` が追加されている ✅

**Requirement: approval_steps に name と approver_id が追加される**
- `approval_steps` テーブルに `name text` と `approver_id uuid` が nullable で追加されている ✅
- `approvalStepRepository.mapRow` と `createMany` に両フィールドが追加されている ✅

### request.md — 受け入れ基準の充足確認

| 受け入れ基準 | 確認箇所 | 結果 |
|------------|---------|------|
| approval_policies テーブルが存在する | `schema.ts:108-138` | ✅ |
| requests に origin カラム 4 件が存在する | `schema.ts:156-159` | ✅ |
| approval_steps に name, approver_id が存在する | `schema.ts:200-201` | ✅ |
| approval_delegations に from_user_role が存在する | `schema.ts:278` | ✅ |
| ApprovalPolicy モデル型が定義されている | `domain/models/approvalPolicy.ts` | ✅ |
| approvalPolicyRepository が findActiveByTriggerAction を実装している | `approvalPolicyRepository.ts:103-118` | ✅ |
| 既存の手動承認フローが引き続き動作する | `requestRepository.ts:53`（`originType ?? "manual"`） | ✅ |
| 既存データのマイグレーションが正常に完了する | `drizzle/0005_black_absorbing_man.sql`（3 ステップ + DEFAULT 'manual'） | ✅ |
| `typecheck && test` が green | `tasks.md` T-16 で確認済み | ✅ |

### 追加品質確認

- **依存方向の遵守**: `domain/models/approvalPolicy.ts` に `@/infrastructure` の import なし ✅
- **静的テストの追加**: `projectStructure.test.ts` に T-15 指定の 11 テストが追加されている ✅
- **DB リセット禁止の遵守**: `drizzle/0005_black_absorbing_man.sql` に DROP TABLE / DROP SCHEMA 等なし ✅
- **マイグレーション番号の連続性**: `0005_black_absorbing_man.sql` が新規追加のみで既存マイグレーションへの変更なし ✅
- **テナント分離**: `approvalPolicyRepository` の全関数に `organizationId` 条件 ✅
