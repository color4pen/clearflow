# 承認ポリシーのスキーマとモデル追加

## Meta

- **type**: new-feature
- **slug**: approval-policy-schema
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: テーブル・カラム追加のみ。ビジネスロジック変更なし → false -->

## 背景

承認ポリシー（どのドメインアクションで承認を要求するかの定義）を格納するテーブルと、承認リクエストの起動元を記録するカラムが存在しない。本リクエストではスキーマ変更とモデル定義のみを行い、ポリシー評価ロジックは後続リクエストで実装する。

## 現状コードの前提

- approval_policies テーブルが存在しない
- `src/infrastructure/schema.ts` — requests テーブルに origin 関連カラムなし
- `src/infrastructure/schema.ts` — approval_steps テーブルに name / approverId カラムなし
- `src/infrastructure/schema.ts` — approval_delegations テーブルに from_user_role カラムなし
- `src/domain/models/request.ts` — Request 型に origin フィールドなし
- `src/domain/models/approvalStep.ts` — ApprovalStep 型に name / approverId なし

## 要件

1. **approval_policies テーブル新設**: id (uuid PK), organization_id (FK), name (text NOT NULL), description (text nullable), trigger_action (text NOT NULL), condition_field (text nullable), condition_operator (text nullable), condition_value (text nullable), template_id (FK → approval_templates), is_active (boolean NOT NULL default true), created_at (timestamptz NOT NULL)。CHECK 制約: condition の 3 フィールドは全部 null か全部 NOT NULL
2. **requests テーブルに origin カラム追加**: origin_type (text NOT NULL default 'manual'), origin_policy_id (uuid nullable FK → approval_policies), origin_trigger_action (text nullable), origin_trigger_entity_id (uuid nullable)。CHECK 制約: origin_type = 'manual' なら policy 関連が全 null、origin_type = 'system' なら全 NOT NULL
3. **approval_steps に name / approverId 追加**: name (text nullable), approver_id (uuid nullable FK → users)
4. **approval_delegations に from_user_role 追加**: from_user_role (text NOT NULL)。マイグレーションで既存行に from_user の現在の role を設定する
5. **ApprovalPolicy モデル型の定義**: `src/domain/models/approvalPolicy.ts` に型を定義する
6. **Request モデル型の拡張**: originType, originPolicyId, originTriggerAction, originTriggerEntityId を追加する
7. **ApprovalStep モデル型の拡張**: name, approverId を追加する
8. **ApprovalDelegation モデル型の確認**: fromUserRole が既に型定義にある場合はスキーマとの整合を確認する
9. **approvalPolicyRepository の新設**: CRUD 操作と findActiveByTriggerAction(organizationId, triggerAction) を実装する
10. **既存リポジトリの更新**: requestRepository, approvalStepRepository, approvalDelegationRepository のマッピング関数を新カラムに対応させる。approvalDelegationRepository の fromUserRole を JOIN ではなく直接カラム参照に切り替える

## スコープ外

- ポリシー評価ロジック（evaluatePolicies）
- updateInquiryStatus の改修
- 承認後アクション（ApprovalCompleted イベント）
- 承認ポリシー設定画面
- ApprovalCompleted イベント型の追加

## 受け入れ基準

- [ ] approval_policies テーブルが存在する
- [ ] requests テーブルに origin_type, origin_policy_id, origin_trigger_action, origin_trigger_entity_id カラムが存在する
- [ ] approval_steps テーブルに name, approver_id カラムが存在する
- [ ] approval_delegations テーブルに from_user_role カラムが存在する
- [ ] ApprovalPolicy モデル型が定義されている
- [ ] approvalPolicyRepository が findActiveByTriggerAction を実装している
- [ ] 既存の手動承認フローが引き続き動作する（origin_type = 'manual' がデフォルト）
- [ ] 既存データのマイグレーションが正常に完了する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **trigger_action / condition_operator を text 型にする** — pgEnum ではなく text 型で格納する。理由: 将来トリガーアクションを追加する際にマイグレーションが不要。アプリケーション層の TypeScript 型で値を制約する。却下案: pgEnum — 値の追加ごとにマイグレーションが必要
2. **origin_type も text 型** — 同様の理由。TypeScript の union 型で制約する
