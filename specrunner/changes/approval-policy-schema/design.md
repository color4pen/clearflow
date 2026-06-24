# Design: 承認ポリシーのスキーマとモデル追加

## Context

Clearflow の承認ワークフローは現在、手動申請（ユーザーがフォームから作成）のみをサポートしている。今後、ドメインアクション（例: 案件フェーズ変更、契約作成）をトリガーとして承認リクエストを自動発行する機能を計画している。その前段として、ポリシー定義の格納先となるテーブルと、リクエストの起動元を記録するカラムが必要になる。

確認済みの現状コード:

- `src/infrastructure/schema.ts` — `approval_policies` テーブルが存在しない
- `src/infrastructure/schema.ts:108-123` — `requests` テーブルに origin 関連カラムが存在しない。手動・自動の区別がつかない
- `src/infrastructure/schema.ts:142-158` — `approval_steps` テーブルに `name` / `approver_id` カラムが存在しない。ステップ名称の表示やポリシーから指定された承認者の記録ができない
- `src/infrastructure/schema.ts:217-242` — `approval_delegations` テーブルに `from_user_role` カラムが存在しない。委譲元のロールを取得するために毎回 `users` テーブルとの JOIN が必要
- `src/domain/models/request.ts:3-14` — `Request` 型に origin フィールドがない
- `src/domain/models/approvalStep.ts:3-16` — `ApprovalStep` 型に `name` / `approverId` がない
- `src/domain/models/approvalDelegation.ts:1-11` — `ApprovalDelegation` 型には `fromUserRole: string` が既にある（ただし DB カラムではなく JOIN で取得）
- `src/infrastructure/repositories/approvalDelegationRepository.ts:27-51` — `findActiveByToUserId` が `users` テーブルと INNER JOIN して `fromUserRole` を取得している。全クエリ関数が同様のパターン

本リクエストのスコープはスキーマ変更・モデル定義・リポジトリ対応のみ。ポリシー評価ロジック、承認後アクション、設定画面は後続リクエストで実装する。

## Goals / Non-Goals

**Goals**:

- `approval_policies` テーブルを新設し、承認ポリシーの定義データを格納する
- `requests` テーブルに origin カラム群を追加し、手動起動と自動起動を区別可能にする
- `approval_steps` テーブルに `name` / `approver_id` カラムを追加し、ステップの表示名とポリシー指定の承認者を記録可能にする
- `approval_delegations` テーブルに `from_user_role` カラムを追加し、JOIN を不要にする
- `ApprovalPolicy` ドメインモデル型を定義する
- `Request`、`ApprovalStep` ドメインモデル型を拡張する
- `approvalPolicyRepository` を新設し、CRUD + `findActiveByTriggerAction` を提供する
- 既存リポジトリのマッピング関数を新カラムに対応させる
- 差分マイグレーションで既存データを維持しつつスキーマを変更する

**Non-Goals**:

- ポリシー評価ロジック（evaluatePolicies）の実装
- updateInquiryStatus の改修
- 承認後アクション（ApprovalCompleted イベント）
- 承認ポリシー設定画面
- ApprovalCompleted イベント型の追加

## Decisions

### D1: approval_policies テーブルの設計

`src/infrastructure/schema.ts` に `approvalPolicies` テーブルを追加する。

**カラム**:
- `id` (uuid PK defaultRandom)
- `organization_id` (uuid FK → organizations, NOT NULL)
- `name` (text NOT NULL) — ポリシーの表示名
- `description` (text nullable) — ポリシーの説明
- `trigger_action` (text NOT NULL) — トリガーとなるドメインアクション（例: `deal.phase_change`, `contract.create`）
- `condition_field` (text nullable) — 条件評価対象のフィールド名
- `condition_operator` (text nullable) — 条件演算子（例: `gt`, `eq`）
- `condition_value` (text nullable) — 条件値（文字列として格納）
- `template_id` (uuid FK → approval_templates, NOT NULL) — 承認フローテンプレートへの参照
- `is_active` (boolean NOT NULL default true) — ポリシーの有効/無効
- `created_at` (timestamptz NOT NULL defaultNow)

**CHECK 制約**: `condition_field`, `condition_operator`, `condition_value` の 3 フィールドは全部 null か全部 NOT NULL。部分的な null は許可しない。

```sql
CHECK (
  (condition_field IS NULL AND condition_operator IS NULL AND condition_value IS NULL)
  OR
  (condition_field IS NOT NULL AND condition_operator IS NOT NULL AND condition_value IS NOT NULL)
)
```

**Rationale**: `trigger_action` と `condition_operator` を text 型にするのは architect の設計判断（要件定義の「architect 評価済みの設計判断」#1）に基づく。pgEnum を使うとアクション追加のたびにマイグレーションが必要になる。TypeScript 側の union 型で値を制約する。

**Alternatives considered**:
- pgEnum での trigger_action / condition_operator 定義 — 値追加のたびに `ALTER TYPE ... ADD VALUE` マイグレーションが必要。柔軟性が低い。却下
- condition を jsonb で格納 — 型安全性が失われ、CHECK 制約で整合性を担保できない。却下

### D2: requests テーブルへの origin カラム追加

`requests` テーブルに以下の 4 カラムを追加する:

- `origin_type` (text NOT NULL default `'manual'`) — `'manual'` | `'system'`
- `origin_policy_id` (uuid nullable FK → approval_policies)
- `origin_trigger_action` (text nullable) — ポリシー起動時のトリガーアクション
- `origin_trigger_entity_id` (uuid nullable) — トリガーエンティティの ID（例: deal ID）。FK 制約なし（エンティティ型が可変のため）

**CHECK 制約**:
```sql
CHECK (
  (origin_type = 'manual' AND origin_policy_id IS NULL AND origin_trigger_action IS NULL AND origin_trigger_entity_id IS NULL)
  OR
  (origin_type = 'system' AND origin_policy_id IS NOT NULL AND origin_trigger_action IS NOT NULL AND origin_trigger_entity_id IS NOT NULL)
)
```

`origin_type` のデフォルト値が `'manual'` なので、既存行は自動的に manual 扱いとなり後方互換性が維持される。

**Rationale**: `origin_type` を text 型にするのは architect の設計判断（#2）に基づく。将来 `'scheduled'` 等の起動タイプを追加する可能性がある。`origin_trigger_entity_id` に FK 制約を付けないのは、トリガー元のテーブルが可変（deals, contracts 等）であるため。

**Alternatives considered**:
- `origin` を jsonb で格納 — CHECK 制約で整合性を担保できない。個別カラムの方がインデックスも効く。却下
- `origin_trigger_entity_id` に polymorphic FK — PostgreSQL は polymorphic FK をネイティブサポートしない。アプリケーション層で整合性を保証する方が適切。却下

### D3: approval_steps テーブルへの name / approver_id 追加

`approval_steps` テーブルに以下の 2 カラムを追加する:

- `name` (text nullable) — ステップの表示名。ポリシーから自動生成された場合にテンプレートのステップ名を記録する。手動作成の場合は null。
- `approver_id` (uuid nullable FK → users) — ポリシーが特定のユーザーを承認者として指定した場合に記録する。ロールベースの承認（既存の `approver_role`）と併用可能。

両カラムとも nullable で、既存行への影響なし。

**既存の `approved_by` との違い**: `approver_id` はステップ作成時にポリシーが「この人に承認させる」と指定する値。`approved_by` は実際に承認操作を行ったユーザーの記録。

**Rationale**: `approver_id` を `approval_steps` に直接持たせることで、ロールベース（`approver_role`）と指名ベース（`approver_id`）の承認を同じテーブルで扱える。別テーブルでの管理は過剰。

**Alternatives considered**:
- `approver_id` を新しい中間テーブルで管理 — 1:1 の関係でしかないため過剰。却下

### D4: approval_delegations テーブルへの from_user_role 追加

`approval_delegations` テーブルに `from_user_role` (text NOT NULL) カラムを追加する。

**マイグレーション戦略**（3 ステップ）:
1. `from_user_role` を nullable で追加
2. `UPDATE approval_delegations SET from_user_role = (SELECT role FROM users WHERE users.id = approval_delegations.from_user_id)` で既存行を更新
3. `ALTER COLUMN from_user_role SET NOT NULL` で NOT NULL 制約を追加

これにより `approvalDelegationRepository` の全クエリ関数で `users` テーブルとの JOIN が不要になり、`fromUserRole` を直接カラムから取得できるようになる。

**Rationale**: 委譲作成時点のロールを不変データとして記録する方が正確。ユーザーのロールが後で変更された場合、JOIN だと委譲作成時のロールが失われる。また、JOIN を排除することでクエリがシンプルになりパフォーマンスも向上する。

**Alternatives considered**:
- JOIN を維持 — ロール変更時にデータ不整合が発生する。クエリも複雑なまま。却下

### D5: ApprovalPolicy ドメインモデル型の定義

`src/domain/models/approvalPolicy.ts` に以下の型を定義する:

```typescript
export type ConditionOperator = "gt" | "gte" | "lt" | "lte" | "eq";

export type OriginType = "manual" | "system";

export type ApprovalPolicy = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  triggerAction: string;
  conditionField: string | null;
  conditionOperator: ConditionOperator | null;
  conditionValue: string | null;
  templateId: string;
  isActive: boolean;
  createdAt: Date;
};
```

`ConditionOperator` は既存の `ApprovalTemplate` の `StepCondition.operator` と同じ値域。将来的に共有型として抽出可能だが、本リクエストではモデルごとに独立定義する。

`OriginType` は `Request` モデルの origin_type フィールドで使用する。`approvalPolicy.ts` に配置することで、承認ポリシーの概念と紐付ける。

`src/domain/models/index.ts` から re-export する。

### D6: Request モデル型の拡張

`src/domain/models/request.ts` の `Request` 型に以下のフィールドを追加する:

- `originType: OriginType` — デフォルト `'manual'`
- `originPolicyId: string | null`
- `originTriggerAction: string | null`
- `originTriggerEntityId: string | null`

`ApprovalStepSummary` 型は変更しない（origin 情報はサマリーに不要）。

### D7: ApprovalStep モデル型の拡張

`src/domain/models/approvalStep.ts` の `ApprovalStep` 型に以下のフィールドを追加する:

- `name: string | null`
- `approverId: string | null`

### D8: ApprovalDelegation モデル型の確認

`src/domain/models/approvalDelegation.ts` の `ApprovalDelegation` 型には既に `fromUserRole: string` が存在する。DB カラム追加後も型定義の変更は不要。スキーマとモデルの整合が取れている。

### D9: approvalPolicyRepository の新設

`src/infrastructure/repositories/approvalPolicyRepository.ts` を新設する。

**関数**:
- `create(data, tx?)` — ポリシーの作成
- `findById(id, organizationId)` — ID + テナント分離で取得
- `findByOrganization(organizationId)` — 組織のポリシー一覧取得
- `findActiveByTriggerAction(organizationId, triggerAction)` — 特定のトリガーアクションに対するアクティブなポリシーを取得。後続のポリシー評価ロジックで使用
- `updateById(id, organizationId, data, tx?)` — ポリシーの更新
- `deleteById(id, organizationId, tx?)` — ポリシーの削除

全関数にテナント分離（`organizationId` 条件）を適用する。`mapRow` 関数で DB 行を `ApprovalPolicy` 型に変換する。既存の `approvalTemplateRepository` のパターンに準拠する。

`src/infrastructure/repositories/index.ts` から re-export する。

### D10: 既存リポジトリの更新

**`requestRepository.ts`**:
- `mapRow` 関数に `originType`, `originPolicyId`, `originTriggerAction`, `originTriggerEntityId` を追加する
- `create` 関数の引数に origin 関連フィールドを追加する（全て optional、デフォルト `'manual'`）
- `findAllWithStepsByOrganization` の `mapRow` 呼び出しに影響なし（`mapRow` 内部で対応）

**`approvalStepRepository.ts`**:
- `mapRow` 関数に `name`, `approverId` を追加する
- `createMany` 関数の引数に `name?`, `approverId?` を追加する

**`approvalDelegationRepository.ts`**:
- `mapRow` 関数の第 2 引数 `fromUserRole: string` を削除し、`row.fromUserRole` を直接参照する
- 全クエリ関数（`findActiveByToUserId`, `findByOrganization`, `findOverlapping`）から `users` テーブルとの JOIN を削除し、`approvalDelegations` テーブルのみでクエリする
- `create` 関数の引数に `fromUserRole: string` を追加し、INSERT 時に直接設定する。create 内の追加 SELECT クエリ（users テーブルからの role 取得）を削除する
- `update` 関数内の追加 SELECT クエリも同様に削除する

### D11: Relations の追加

`src/infrastructure/schema.ts` の relations に以下を追加する:

- `approvalPoliciesRelations` — `organizations` (one), `approvalTemplates` (one) への relation
- `organizationsRelations` — `approvalPolicies` への `many` relation を追加
- `requestsRelations` — `approvalPolicies` (origin_policy_id → one) への relation を追加
- `approvalStepsRelations` — `users` (approver_id → one) への relation を追加（既存の `approvedBy` relation と別名）

### D12: シードデータの更新

`src/infrastructure/seed.ts` を更新する:

- `approvalPolicies` テーブルの truncate 文を追加（`approvalSteps` の後、`approvalTemplates` の前）
- `approvalPolicies` のインポートを追加
- サンプルポリシーを 1 件追加: 「案件フェーズ変更時の承認」（`trigger_action: 'deal.phase_change'`, 条件なし, 経費テンプレート参照）
- `approval_delegations` の既存シードに `fromUserRole` を追加

### D13: マイグレーション戦略

`drizzle-kit generate` で差分マイグレーション SQL を生成する。DB リセットは行わない（既存データ保護ポリシー）。

生成されたマイグレーションに対して、以下のカスタム SQL を手動追加する必要がある:

1. **approval_delegations.from_user_role**: Drizzle が `NOT NULL` カラムを直接追加しようとするとエラーになる（既存行に値がないため）。生成された SQL を以下に修正する:
   - `ALTER TABLE approval_delegations ADD COLUMN from_user_role text;`（nullable で追加）
   - `UPDATE approval_delegations SET from_user_role = (SELECT role FROM users WHERE users.id = approval_delegations.from_user_id);`
   - `ALTER TABLE approval_delegations ALTER COLUMN from_user_role SET NOT NULL;`

2. **requests の origin カラム**: `origin_type` は `DEFAULT 'manual'` が設定されているので、既存行は自動的に `'manual'` が入り NOT NULL 制約を満たす。Drizzle の生成する SQL で対応可能。

3. **approval_steps の name / approver_id**: 両方 nullable なので既存行への影響なし。Drizzle の生成する SQL で対応可能。

4. **CHECK 制約**: Drizzle の `check()` ヘルパーで定義するが、生成された SQL に含まれることを確認する。

## Risks / Trade-offs

[Risk] `approval_delegations.from_user_role` の NOT NULL マイグレーション — 既存行のデータ変換が必要。`users` テーブルに対応する行が存在しない場合に NULL のままになり NOT NULL 制約でエラーになる。
→ Mitigation: `approval_delegations.from_user_id` は `users.id` への FK 制約があるため、対応する users 行は必ず存在する。seed データでも FK 整合性は保証されている。

[Risk] `origin_trigger_entity_id` に FK 制約がない — 参照先テーブルが可変のためアプリケーション層で整合性を保証する必要がある。
→ Mitigation: 本リクエストのスコープでは origin カラムは使用されない（全て manual / null）。ポリシー評価ロジック実装時にバリデーションを追加する。

[Risk] `approvalDelegationRepository` の JOIN 削除によるクエリ変更 — 全ての呼び出し元に影響する。
→ Mitigation: `ApprovalDelegation` の型インターフェースは変更なし。リポジトリ内部の実装変更のみで、usecase / action 層への影響はない。

[Risk] Drizzle の `check()` ヘルパーで複数条件の CHECK 制約を正しく生成できない可能性。
→ Mitigation: 生成されたマイグレーション SQL を目視確認し、必要に応じて手動修正する。

## Open Questions

なし
