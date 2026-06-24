# 承認ポリシー評価と引合案件化の承認ゲート

## Meta

- **type**: new-feature
- **slug**: approval-policy-logic
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 引合→案件化フローの構造変更、ポリシー評価パターンの導入 → true -->

## 背景

R04a（approval-policy-schema）で承認ポリシーのテーブル・モデル・リポジトリを追加した。本リクエストではポリシー評価ロジックと、引合の案件化時に承認ゲートを挿入するフローを実装する。

引合を案件化する際に、該当するポリシーがあれば承認リクエストを自動生成し、承認が通るまで案件を生成しない。承認完了後に案件を自動生成する。

## 現状コードの前提

- `src/infrastructure/repositories/approvalPolicyRepository.ts` — findActiveByTriggerAction(organizationId, triggerAction) が実装済み
- `src/domain/models/approvalPolicy.ts` — ApprovalPolicy 型が定義済み
- `src/domain/models/request.ts` — originType, originPolicyId, originTriggerAction, originTriggerEntityId フィールドが追加済み
- `src/infrastructure/repositories/requestRepository.ts` — origin フィールドの読み書きに対応済み
- `src/application/usecases/updateInquiryStatus.ts` — 案件化時に Deal を直接生成。ポリシーチェックなし
- `src/domain/events/types.ts` — InquiryConverted イベント定義済み。ApprovalCompleted は未定義
- `src/domain/events/dispatcher.ts` — dispatch(event) で同期ハンドラを実行。runInContext で AsyncLocalStorage バッファを管理

## 要件

1. **条件評価の pure function**: `src/domain/services/conditionEvaluator.ts` に `evaluateCondition(field, operator, value, context): boolean` を実装する。context は `Record<string, unknown>`。operator は eq, neq, gt, gte, lt, lte, in をサポートする。数値比較と文字列比較を型に応じて切り替える
2. **ポリシー評価ユースケース**: `src/application/usecases/evaluatePolicies.ts` に `evaluatePolicies(organizationId, triggerAction, context, tx?)` を実装する。approvalPolicyRepository.findActiveByTriggerAction で取得し、各ポリシーの条件を conditionEvaluator で評価する。合致するポリシーのリストを返す
3. **ApprovalCompleted イベント型の追加**: `src/domain/events/types.ts` に追加する。payload: requestId, originType, originTriggerAction (nullable), originTriggerEntityId (nullable)
4. **updateInquiryStatus の案件化フロー改修**: converted 遷移時にポリシー評価を呼び出す。合致ポリシーなし → 従来通り案件生成 + InquiryConverted 発行。合致ポリシーあり → 承認リクエストを生成（origin_type=system, creatorId=actorId）し、テンプレートの steps からステップを生成し、ステータスを pending に設定する。案件は生成せず引合は new のまま。`options.skipPolicyCheck` が true の場合はポリシー評価をスキップする
5. **ApprovalCompleted イベントの発行**: approveRequest ユースケースで全ステップ承認完了時に ApprovalCompleted イベントを dispatch する
6. **承認後アクションハンドラ**: ApprovalCompleted の非同期ハンドラを実装する。originTriggerAction が inquiry.convert の場合、updateInquiryStatus を skipPolicyCheck=true で呼び出して案件を生成する

## スコープ外

- contract.create / contract.cancel のポリシー連動
- 承認ポリシー設定画面（R08）
- 複数ポリシー合致時の全承認完了待ち（最初の 1 件のみ）

## 受け入れ基準

- [ ] conditionEvaluator が全演算子（eq, neq, gt, gte, lt, lte, in）で正しく動作する
- [ ] evaluatePolicies がトリガーアクションと条件に基づいてポリシーをフィルタする
- [ ] ApprovalCompleted イベント型が定義されている
- [ ] 案件化時にポリシーが評価される
- [ ] ポリシー合致時に承認リクエストが origin_type=system で生成される
- [ ] ポリシー合致時に案件が生成されない（引合は new のまま）
- [ ] ポリシー非合致時に案件が即時生成される
- [ ] 承認完了時に ApprovalCompleted が発行される
- [ ] 承認後に案件が自動生成される
- [ ] skipPolicyCheck で無限ループしない
- [ ] 既存の手動承認フローが引き続き動作する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **ポリシー評価をユースケース内で直接呼び出す** — updateInquiryStatus 内で evaluatePolicies を呼び出す。イベントハンドラからユースケースの振る舞いを制御するパターンは複雑すぎる。却下案: InquiryConverted の同期ハンドラで評価 — 戻り値でフロー分岐が必要で設計が複雑
2. **承認後アクションは非同期ハンドラ** — ApprovalCompleted の非同期ハンドラで案件生成。承認完了と案件生成は別トランザクション。却下案: 同期ハンドラ — 承認の完了が案件生成の成否に依存してしまう
3. **skipPolicyCheck フラグ** — updateInquiryStatus のオプション引数でポリシー評価をスキップ。Server Action からは渡せない内部引数。却下案: 専用の createDealFromApproval — ロジック重複
4. **条件評価をドメインサービスに分離** — pure function として domain 層に配置。リポジトリアクセスは含まない。evaluatePolicies（usecase層）がこれを呼び出す
