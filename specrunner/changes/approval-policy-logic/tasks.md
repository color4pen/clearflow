# Tasks: approval-policy-logic

## T-01: ConditionOperator 型の拡張（neq, in の追加）

- [ ] `src/domain/models/approvalPolicy.ts` — `ConditionOperator` 型に `"neq"` と `"in"` を追加する。結果: `"gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "in"`
- [ ] `src/infrastructure/repositories/approvalPolicyRepository.ts` — `CONDITION_OPERATORS` セットに `"neq"` と `"in"` を追加する

**Acceptance Criteria**:
- `ConditionOperator` が 7 種の演算子を含む
- `approvalPolicyRepository` の `CONDITION_OPERATORS` バリデーションが `neq`, `in` を受け付ける
- `typecheck` が green

## T-02: conditionEvaluator ドメインサービスの実装

- [ ] `src/domain/services/conditionEvaluator.ts` を新規作成
- [ ] `evaluateCondition(field: string, operator: ConditionOperator, value: string, context: Record<string, unknown>): boolean` を実装
  - `context[field]` が `undefined` または `null` の場合は `false` を返す
  - 両辺が数値として解釈可能（`isFinite(Number(x))`）な場合は数値比較、それ以外は文字列比較を行う
  - `eq`: `contextValue === value`（数値 or 文字列）
  - `neq`: `contextValue !== value`（数値 or 文字列）
  - `gt`: 数値比較のみ。数値でない場合は `false`
  - `gte`: 数値比較のみ。数値でない場合は `false`
  - `lt`: 数値比較のみ。数値でない場合は `false`
  - `lte`: 数値比較のみ。数値でない場合は `false`
  - `in`: `value` をカンマ `,` で分割し、`context[field]` の文字列表現が含まれるかを判定
- [ ] `src/domain/services/index.ts` に `evaluateCondition` のエクスポートを追加

**Acceptance Criteria**:
- 全 7 演算子（eq, neq, gt, gte, lt, lte, in）が正しく動作する
- 数値比較と文字列比較が型に応じて切り替わる
- context にフィールドがない場合は `false` を返す
- `in` 演算子でカンマ区切りリストの包含判定ができる
- pure function でリポジトリアクセスを含まない
- `typecheck` が green

## T-03: evaluatePolicies ユースケースの実装

- [ ] `src/application/usecases/evaluatePolicies.ts` を新規作成
- [ ] `evaluatePolicies(organizationId: string, triggerAction: string, context: Record<string, unknown>): Promise<ApprovalPolicy[]>` を実装
  - `approvalPolicyRepository.findActiveByTriggerAction(organizationId, triggerAction)` でアクティブポリシーを取得。既存の repository メソッドに ORDER BY created_at ASC を追加して決定的な順序を保証する（修正は `src/infrastructure/repositories/approvalPolicyRepository.ts` の既存メソッド内で行う）
  - 各ポリシーに対して: `conditionField` が null → 無条件合致（リストに含める）
  - `conditionField` が非 null → `evaluateCondition(conditionField, conditionOperator!, conditionValue!, context)` で評価し、`true` のみリストに含める
  - 合致するポリシーのリストを返す
- [ ] `src/application/usecases/index.ts` に `evaluatePolicies` のエクスポートを追加

**Acceptance Criteria**:
- triggerAction に合致するアクティブポリシーのみが評価対象になる
- 条件フィールドが null のポリシーは無条件で合致する
- 条件が不一致のポリシーはフィルタされる
- 合致ポリシーのリストが返される
- `typecheck` が green

## T-04: ApprovalCompleted イベント型の追加

- [ ] `src/domain/events/types.ts` に `ApprovalCompleted` 型を追加:
  ```
  type: "approval.completed"
  payload: {
    requestId: string;
    originType: OriginType;
    originTriggerAction: string | null;
    originTriggerEntityId: string | null;
  }
  ```
- [ ] `DomainEvent` union に `ApprovalCompleted` を追加
- [ ] `OriginType` の import を追加（`@/domain/models/approvalPolicy` から）

**Acceptance Criteria**:
- `ApprovalCompleted` 型が定義されている
- `DomainEvent` union に含まれている
- `DomainEventType` が `"approval.completed"` を含む
- `typecheck` が green

## T-04b: requestRepository.findByOriginTriggerEntity の追加

- [ ] `src/infrastructure/repositories/requestRepository.ts` に `findByOriginTriggerEntity(organizationId, triggerAction, triggerEntityId)` メソッドを追加する
- [ ] origin_type = 'system' かつ origin_trigger_action = triggerAction かつ origin_trigger_entity_id = triggerEntityId かつ status IN ('draft', 'pending') で検索する
- [ ] 該当するリクエストが存在すれば返す（重複チェック用）

**Acceptance Criteria**:
- 同一引合に対する pending system リクエストが検出できる
- 存在しない場合は null を返す
- `typecheck` が green

## T-05: updateInquiryStatus の案件化フロー改修

- [ ] `updateInquiryStatus` の引数に第 2 引数 `options?: { skipPolicyCheck?: boolean }` を追加
- [ ] `UpdateInquiryStatusResult` の `ok: true` バリアントに `pendingApproval?: { requestId: string }` を追加
- [ ] `converted` 遷移時、`options?.skipPolicyCheck` が `true` でない場合:
  - `evaluatePolicies(organizationId, "inquiry.convert", context)` を呼び出す。context は `{ budget: inquiry.budget, source: inquiry.source, title: inquiry.title, clientId: inquiry.clientId }` など引合のフィールドから構築
  - 合致ポリシーがなければ従来フロー（Deal 生成 + InquiryConverted 発行）
  - 合致ポリシーがあれば（先頭の 1 件を使用）:
    - `approvalTemplateRepository.findById(policy.templateId, organizationId)` でテンプレートを取得
    - テンプレートが見つからなければ従来フローにフォールバック
    - `requestRepository.create` で承認リクエストを生成: `{ title: "承認: " + inquiry.title, formData: {}, templateId: template.id, organizationId, creatorId: actorId, status: "pending", originType: "system", originPolicyId: policy.id, originTriggerAction: "inquiry.convert", originTriggerEntityId: inquiryId }`
    - `approvalStepRepository.createMany` でテンプレートの全 steps から承認ステップを生成（deadlineHours 対応含む）
    - `auditLogRepository.create` でシステム生成リクエストの監査ログを記録（action: "request.create", targetType: "request", metadata: { originType: "system", policyId: policy.id }）。existsPendingByTemplateId がテンプレート利用中を検出するために必要
    - `dispatcher.dispatch` で `request.submitted` イベントを発行（Webhook 連携用）
    - Deal は生成せず、引合のステータスは変更しない
    - **重複防止**: ポリシー評価前に `requestRepository.findByOriginTriggerEntity(organizationId, "inquiry.convert", inquiryId)` で既存の pending system リクエストが存在しないことを確認する。存在する場合は「承認待ちの申請があります」を返す
    - `{ ok: true, inquiry: <元の inquiry>, pendingApproval: { requestId } }` を返す
- [ ] import を追加: `evaluatePolicies`, `approvalTemplateRepository`, `approvalStepRepository`, `requestRepository`（必要に応じて）

**Acceptance Criteria**:
- ポリシー非合致時に従来通り Deal が生成され、InquiryConverted が発行される
- ポリシー合致時に承認リクエスト（origin_type=system, status=pending）が生成される
- ポリシー合致時にテンプレートのステップから承認ステップが生成される
- ポリシー合致時に Deal が生成されない
- ポリシー合致時に引合のステータスが `new` のまま
- `skipPolicyCheck=true` でポリシー評価がスキップされる
- テンプレートが見つからない場合は従来フローにフォールバック
- `typecheck` が green

## T-06: approveRequest に ApprovalCompleted イベント発行を追加

- [ ] `src/application/usecases/approveRequest.ts` — `isAllApproved(updatedSteps)` が `true` の場合、追加で以下を実行:
  - `result.originType === "system"` を確認
  - `true` の場合、`dispatcher.dispatch` で `ApprovalCompleted` イベントを発行:
    ```
    type: "approval.completed"
    payload: {
      requestId: result.id,
      originType: result.originType,
      originTriggerAction: result.originTriggerAction,
      originTriggerEntityId: result.originTriggerEntityId,
    }
    ```
- [ ] `originType === "manual"` の場合は `ApprovalCompleted` を発行しない（既存の `request.approved` のみ）
- [ ] ステップなし（backward-compatible single-approve）フローでも同様のロジックを追加
- [ ] `ApprovalCompleted` 型の import を追加

**Acceptance Criteria**:
- system origin リクエストの全ステップ承認完了時に `ApprovalCompleted` が dispatch される
- manual origin リクエストでは `ApprovalCompleted` が dispatch されない
- 既存の `request.approved` イベントは引き続き発行される
- single-approve フロー（ステップなし）でも origin チェックが動作する
- `typecheck` が green

## T-07: ApprovalCompleted 非同期ハンドラの実装

- [ ] `src/infrastructure/handlers/approvalCompletedHandler.ts` を新規作成
- [ ] `handleApprovalCompleted(event: ApprovalCompleted): Promise<void>` を実装:
  - `event.payload.originTriggerAction` が `"inquiry.convert"` でない場合は何もしない（将来の拡張ポイント）
  - `event.payload.originTriggerEntityId` が null の場合はエラーログを出して return
  - `updateInquiryStatus({ inquiryId: originTriggerEntityId, organizationId: event.organizationId, actorId: event.actorId, newStatus: "converted" }, { skipPolicyCheck: true })` を呼び出す
  - 結果が `ok: false` の場合はエラーログを出力

**Acceptance Criteria**:
- `originTriggerAction` が `"inquiry.convert"` の場合に `updateInquiryStatus` が `skipPolicyCheck=true` で呼び出される
- Deal が生成される（`updateInquiryStatus` の従来フローが実行される）
- `originTriggerAction` が `"inquiry.convert"` 以外の場合は何もしない
- `originTriggerEntityId` が null の場合はエラーログを出力して安全に終了する
- `updateInquiryStatus` が失敗した場合はエラーログを出力して安全に終了する

## T-08: ハンドラの登録

- [ ] `src/infrastructure/handlers/index.ts` — `allEventTypes` 配列に `"approval.completed"` を追加
- [ ] `handleApprovalCompleted` を import し、`registerHandlers` 内で `dispatcher.on("approval.completed", handleApprovalCompleted, "async")` を追加
  - Webhook ハンドラの登録とは別に、専用ハンドラとして追加登録する

**Acceptance Criteria**:
- `approval.completed` イベントで Webhook ハンドラと `handleApprovalCompleted` の両方が非同期実行される
- 既存のイベントハンドラ登録に影響がない
- `typecheck` が green

## T-09: Server Action の更新

- [ ] `src/app/actions/inquiries.ts` — `updateInquiryStatusAction` の結果ハンドリングを更新:
  - `result.ok === true && result.pendingApproval` の場合、`{ success: true, message: "承認リクエストを作成しました。承認後に案件が自動生成されます" }` を返す
  - `ActionResult` 型の `message` は既存で optional のため、型変更は不要

**Acceptance Criteria**:
- ポリシー合致時にユーザーに承認待ちである旨のメッセージが表示される
- ポリシー非合致時の従来動作に影響がない

## T-10: conditionEvaluator のテスト

- [ ] `src/__tests__/domain/conditionEvaluator.test.ts` を新規作成
- [ ] テストケース:
  - eq: 数値一致、数値不一致、文字列一致、文字列不一致
  - neq: 数値不一致で true、数値一致で false、文字列不一致で true
  - gt: 超過で true、等しいで false、未満で false
  - gte: 超過で true、等しいで true、未満で false
  - lt: 未満で true、等しいで false、超過で false
  - lte: 未満で true、等しいで true、超過で false
  - in: リスト内で true、リスト外で false、空文字列値で false
  - フィールド未存在で false
  - null 値で false

**Acceptance Criteria**:
- 全演算子のテストが pass する
- エッジケース（未存在フィールド、null、型不一致）がカバーされている

## T-11: ポリシー評価フロー統合テスト

- [ ] `src/__tests__/usecases/approvalPolicyFlow.test.ts` を新規作成
- [ ] テストケース:
  - evaluatePolicies: 条件合致ポリシーのフィルタリング、無条件ポリシーの合致、アクティブポリシーなしで空配列
  - updateInquiryStatus + ポリシーゲート: ポリシー合致時に承認リクエストが生成され Deal が未生成、ポリシー非合致時に従来通り Deal 生成
  - skipPolicyCheck: true でポリシー評価スキップ
  - 承認完了 → ApprovalCompleted 発行 → 非同期ハンドラ → Deal 生成のフロー
  - 既存の手動承認フローが影響を受けない

**Acceptance Criteria**:
- ポリシーゲートの全パターン（合致、非合致、スキップ）がテストされている
- 承認後の案件自動生成フローがテストされている
- 既存テストが引き続き pass する
- `typecheck && test` が green
