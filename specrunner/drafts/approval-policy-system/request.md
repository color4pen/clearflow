# 承認ポリシーとシステム連動承認

## Meta

- **type**: new-feature
- **slug**: approval-policy-system
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新テーブル追加、既存承認フローの構造変更、イベント駆動の承認ゲートパターン → true -->

## 背景

承認設計書の中核機能であるポリシーとシステム連動承認が未実装。現在の承認は手動申請のみで、ドメインアクション（引合の案件化）に応じた自動承認リクエスト生成の仕組みがない。

ポリシーエンティティを新設し、引合の案件化時にポリシーを評価して承認リクエストを自動生成する。承認完了後に案件を自動生成する。

## 現状コードの前提

- approval_policies テーブルが存在しない
- requests テーブルに origin 関連カラムなし（origin_type, origin_policy_id, origin_trigger_action, origin_trigger_entity_id）
- approval_steps テーブルに name / approverId カラムなし
- approval_delegations テーブルに from_user_role カラムなし（クエリ時に users テーブルから動的取得）
- `src/application/usecases/updateInquiryStatus.ts` — 案件化時に Deal を直接生成。承認チェックなし
- `src/domain/events/types.ts` — InquiryConverted イベントは定義済み。ApprovalCompleted イベントは未定義
- `src/domain/events/dispatcher.ts` — `dispatch(event)` で同期ハンドラを実行。`runInContext` で AsyncLocalStorage バッファを管理
- `src/domain/services/approvalStepService.ts` — `canApproveWithDelegation` は fromUserRole をモデルから参照（スキーマに列がないため動的取得）

## 要件

1. **approval_policies テーブル新設**: id, organizationId, name, description, triggerAction (pgEnum), conditionField (nullable), conditionOperator (pgEnum, nullable), conditionValue (nullable), templateId (FK), isActive (boolean), createdAt。condition の 3 フィールドは全部 null か全部 NOT NULL の CHECK 制約
2. **TriggerAction 列挙型**: `inquiry.convert | contract.create | contract.cancel` を pgEnum で定義
3. **ComparisonOperator 列挙型**: `eq | neq | gt | gte | lt | lte | in` を pgEnum で定義
4. **RequestOriginType 列挙型**: `manual | system` を pgEnum で定義
5. **requests テーブルに origin フィールド追加**: origin_type (NOT NULL, default 'manual'), origin_policy_id (FK, nullable), origin_trigger_action (nullable), origin_trigger_entity_id (nullable)。CHECK 制約で manual/system の整合性を保証
6. **approval_steps に name / approverId 追加**: name (text, nullable), approverId (FK → users, nullable)。approverRole が null の場合は approverId が必須（CHECK 制約）
7. **approval_delegations に from_user_role 追加**: from_user_role (roleEnum, NOT NULL)。マイグレーションで既存行に from_user の role を設定。approvalDelegationRepository を from_user_role カラムの直接参照に切り替える
8. **ApprovalCompleted イベント型の追加**: `src/domain/events/types.ts` に ApprovalCompleted イベントを追加。payload: requestId, requestTitle, originType, originTriggerAction, originTriggerEntityId。approveRequest ユースケースの全ステップ承認完了時に dispatch する
9. **ポリシー評価サービス**: `src/domain/services/approvalPolicyService.ts` を新設。`evaluatePolicies(organizationId, triggerAction, context, tx)` — 該当ポリシーを取得し条件を評価。合致するポリシーのリストを返す
10. **updateInquiryStatus の改修**: 案件化フローを以下に変更する。(1) ポリシー評価サービスを呼び出す（同一トランザクション内）。(2) 合致ポリシーなし → 従来通り案件を即時生成。(3) 合致ポリシーあり → 承認リクエストを生成（origin_type=system）し、案件は生成しない。引合は new のまま。InquiryConverted イベントは案件が実際に生成された場合のみ発行する
11. **承認後アクション**: ApprovalCompleted イベントのハンドラ（非同期）で、originTriggerAction が inquiry.convert の場合に updateInquiryStatus を呼び出して案件を生成する。この呼び出しではポリシー評価をスキップする（無限ループ防止のため、skipPolicyCheck フラグを追加）
12. **approvalPolicyRepository 新設**: findActiveByTriggerAction(organizationId, triggerAction) を実装

## スコープ外

- contract.create / contract.cancel のポリシー連動（inquiry.convert でパターン確立後に横展開）
- 承認ポリシー設定画面（後続リクエスト R08 で実施）
- 複数ポリシー合致時の全承認完了待ち（本リクエストでは最初に合致したポリシーの承認リクエスト 1 件のみ生成）
- approverId 指定時の承認可否チェック拡張（approverRole ベースのチェックは既存のまま維持）

## 受け入れ基準

- [ ] approval_policies テーブルが存在する
- [ ] requests テーブルに origin 関連カラムが存在する
- [ ] approval_steps に name / approverId カラムが存在する
- [ ] approval_delegations に from_user_role カラムが存在し、リポジトリが直接参照する
- [ ] ApprovalCompleted イベント型が定義されている
- [ ] ポリシー評価サービスが条件に基づいて正しく判定する
- [ ] 案件化時にポリシーが評価される
- [ ] ポリシー合致時に承認リクエストが origin_type = system で生成され、案件は生成されない
- [ ] ポリシー非合致時に案件が即時生成される
- [ ] 承認完了時に案件が自動生成される
- [ ] 承認後の案件生成でポリシー評価が再実行されない（無限ループしない）
- [ ] 既存の手動承認フローが引き続き動作する
- [ ] 既存データのマイグレーションが正常に完了する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **ポリシー評価をユースケース内で直接呼び出す（イベントハンドラではなく）** — updateInquiryStatus 内でポリシー評価サービスを直接呼び出す。理由: イベントハンドラからユースケースを呼び出す通信パターンが複雑になる（ハンドラが戻り値でユースケースの振る舞いを制御する必要がある）。ユースケース内で直接呼び出す方がフローが明確。却下案: InquiryConverted の同期ハンドラでポリシー評価 — ハンドラの戻り値でユースケースの後続処理を分岐させる仕組みが必要で複雑
2. **InquiryConverted は案件生成時のみ発行** — ポリシー評価後に案件が生成された場合にのみ InquiryConverted を発行する。承認待ちの場合は発行しない。理由: InquiryConverted は「案件化が完了した」ことを意味するイベントであり、承認待ちの時点では完了していない
3. **承認後アクションは非同期ハンドラ** — ApprovalCompleted の非同期ハンドラで案件生成を行う。理由: 承認の完了と案件の生成は別のトランザクション。承認の完了自体は案件生成の成否に依存しない
4. **複数ポリシー合致時は最初の 1 件のみ** — 複雑な全承認完了待ちロジックは本リクエストでは実装しない。1 つのポリシーの承認が通れば案件化が進む。却下案: 全ポリシーの承認完了を待つ — 実装が複雑で、ユースケースとしての需要が未確認
5. **skipPolicyCheck フラグで無限ループ防止** — 承認後の案件生成時に updateInquiryStatus を再利用するが、ポリシー評価をスキップする。却下案: 専用の createDealFromApproval ユースケースを新設 — 案件生成ロジックの重複が発生する
