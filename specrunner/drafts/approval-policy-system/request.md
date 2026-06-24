# 承認ポリシーとシステム連動承認

## Meta

- **type**: new-feature
- **slug**: approval-policy-system
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新テーブル追加、既存承認フローの構造変更、ドメインイベント連携パターンの導入 → true -->

## 背景

承認設計書（docs/design/02-approval-design.md）の中核機能であるポリシーとシステム連動承認が未実装。現在の承認は手動申請のみで、ドメインアクション（引合の案件化、契約の作成）に応じた自動承認リクエスト生成の仕組みがない。

ポリシーエンティティを新設し、ドメインイベントをトリガーとして承認リクエストを自動生成する。承認が通るまで元のアクションをブロックし、承認完了後に自動実行する。

本リクエストは R01（ドメインイベント基盤）と R02（ドメインモデル整備）の完了を前提とする。

## 現状コードの前提

- approval_policies テーブルが存在しない
- `src/infrastructure/schema.ts:98-113` — requests テーブルに origin 関連カラムなし（origin_type, origin_policy_id, origin_trigger_action, origin_trigger_entity_id）
- `src/infrastructure/schema.ts:132-148` — approval_steps テーブルに name / approverId カラムなし
- `src/infrastructure/schema.ts:206-232` — approval_delegations テーブルに from_user_role カラムなし
- `src/application/usecases/updateInquiryStatus.ts:40-49` — 案件化時に Deal を直接生成。承認ポリシーのチェックなし
- `src/domain/models/request.ts:3-14` — Request 型に origin フィールドなし
- `src/domain/models/approvalStep.ts:3-16` — ApprovalStep 型に name / approverId なし

## 要件

1. **approval_policies テーブル新設**: id, organizationId, name, description, triggerAction (pgEnum), conditionField (nullable), conditionOperator (pgEnum, nullable), conditionValue (nullable), templateId (FK), isActive (boolean), createdAt。condition の 3 フィールドは全部 null か全部 NOT NULL の CHECK 制約を持つ
2. **TriggerAction 列挙型**: `inquiry.convert | contract.create | contract.cancel` を pgEnum で定義する
3. **ComparisonOperator 列挙型**: `eq | neq | gt | gte | lt | lte | in` を pgEnum で定義する
4. **RequestOriginType 列挙型**: `manual | system` を pgEnum で定義する
5. **requests テーブルに origin フィールド追加**: origin_type (RequestOriginType, NOT NULL, default 'manual'), origin_policy_id (FK → approval_policies, nullable), origin_trigger_action (TriggerAction, nullable), origin_trigger_entity_id (uuid, nullable)。CHECK 制約: manual の場合は policy 関連が全 null、system の場合は全 NOT NULL
6. **approval_steps に name / approverId 追加**: name (text, nullable)、approverId (FK → users, nullable)。既存の approverRole と approverId の少なくとも一方が NOT NULL の CHECK 制約を追加
7. **approval_delegations に from_user_role 追加**: from_user_role (roleEnum, NOT NULL)。マイグレーションで既存行は from_user の現在の role を設定する
8. **ポリシー評価サービス**: `src/domain/services/approvalPolicyService.ts` を新設。`evaluatePolicy(policy, context): boolean` — ポリシーの condition をアクションのコンテキスト（引合の source、契約の amount 等）に対して評価する
9. **ポリシーハンドラの実装**: ドメインイベント InquiryConverted の同期ハンドラとして、該当する TriggerAction のポリシーを評価し、合致するポリシーがあれば承認リクエストを生成する。合致しなければ元のアクション（案件生成）を即時実行する
10. **承認後アクションの実行**: ApprovalCompleted イベントのハンドラで、origin_type が system の場合に origin_trigger_action に応じた処理を実行する。inquiry.convert の場合は引合の案件化を完了する
11. **updateInquiryStatus の改修**: 案件化フローを以下に変更する — (1) InquiryConverted イベントを発行 (2) ポリシーハンドラが評価 (3) 承認不要なら案件を即時生成 (4) 承認必要なら承認リクエストを生成し、引合は new のまま
12. **リポジトリ**: approvalPolicyRepository を新設。findActiveByTriggerAction(organizationId, triggerAction) を実装する

## スコープ外

- contract.create / contract.cancel のポリシー連動（引合→案件化でパターン確立後に横展開）
- 承認ポリシー設定画面（後続リクエスト R08 で実施）
- 同一エンティティ・同一アクションの重複承認リクエスト防止（UI 側で対応）

## 受け入れ基準

- [ ] approval_policies テーブルが存在する
- [ ] requests テーブルに origin 関連カラムが存在する
- [ ] approval_steps テーブルに name / approverId カラムが存在する
- [ ] approval_delegations テーブルに from_user_role カラムが存在する
- [ ] 承認ポリシーの評価サービスが condition に基づいて正しく判定する
- [ ] InquiryConverted イベント発行時にポリシーが評価される
- [ ] ポリシー合致時に承認リクエストが origin_type = system で生成される
- [ ] ポリシー非合致時に案件が即時生成される
- [ ] 承認完了時に承認後アクション（案件生成）が自動実行される
- [ ] 既存の手動承認フローが引き続き動作する（origin_type = manual）
- [ ] 既存データのマイグレーションが正常に完了する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **ポリシー評価をドメインイベントの同期ハンドラに配置** — ユースケースのトランザクション内でポリシーを評価し、承認リクエストの生成もトランザクション内で行う。理由: 「ポリシー評価→承認リクエスト生成」が中途半端な状態にならない。却下案: 非同期ハンドラ — ポリシー評価と元のアクションの整合性が崩れる
2. **引合は new のまま承認待ち** — 承認待ちの間、引合のステータスは変更しない。承認リクエストの origin_trigger_entity_id で引合が特定される。却下案: pending_approval ステータスを追加 — InquiryStatus に承認固有の状態を持ち込むとドメインの関心が混在する
3. **まず inquiry.convert のみ実装** — contract.create / contract.cancel は同じパターンで横展開できるため、まず引合→案件化で設計を検証し、問題なければ横展開する。全トリガーを一度に実装するとスコープが大きすぎる
