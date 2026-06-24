# Spec: approval-policy-logic

## Requirements

### Requirement: conditionEvaluator が全演算子で正しく動作する

`evaluateCondition(field, operator, value, context)` は `context[field]` の値を `value` と比較し、`operator` に応じた真偽値を返す MUST。対応する演算子は `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in` の 7 種。数値として解釈できる場合は数値比較、そうでない場合は文字列比較に切り替える SHALL。`in` 演算子では `value` をカンマ区切りでパースし、`context[field]` が含まれるかを判定する。

#### Scenario: eq 演算子で数値が一致する

**Given** context が `{ amount: 1000 }` である
**When** `evaluateCondition("amount", "eq", "1000", context)` を呼び出す
**Then** `true` が返される

#### Scenario: neq 演算子で文字列が異なる

**Given** context が `{ source: "web" }` である
**When** `evaluateCondition("source", "neq", "phone", context)` を呼び出す
**Then** `true` が返される

#### Scenario: gt 演算子で数値が超過する

**Given** context が `{ budget: 5000000 }` である
**When** `evaluateCondition("budget", "gt", "1000000", context)` を呼び出す
**Then** `true` が返される

#### Scenario: gt 演算子で数値が等しい場合は false

**Given** context が `{ budget: 1000000 }` である
**When** `evaluateCondition("budget", "gt", "1000000", context)` を呼び出す
**Then** `false` が返される

#### Scenario: in 演算子でカンマ区切りリストに含まれる

**Given** context が `{ source: "web" }` である
**When** `evaluateCondition("source", "in", "web,phone,email", context)` を呼び出す
**Then** `true` が返される

#### Scenario: in 演算子でリストに含まれない

**Given** context が `{ source: "referral" }` である
**When** `evaluateCondition("source", "in", "web,phone,email", context)` を呼び出す
**Then** `false` が返される

#### Scenario: context にフィールドが存在しない場合

**Given** context が `{}` である
**When** `evaluateCondition("budget", "gt", "1000000", context)` を呼び出す
**Then** `false` が返される

### Requirement: evaluatePolicies がトリガーアクションと条件に基づいてポリシーをフィルタする

`evaluatePolicies(organizationId, triggerAction, context)` は `approvalPolicyRepository.findActiveByTriggerAction` でアクティブポリシーを取得し、各ポリシーの条件を `evaluateCondition` で評価 SHALL する。条件フィールドが null のポリシー（無条件ポリシー）は常に合致する MUST。合致するポリシーのリストを返す。

#### Scenario: 条件合致ポリシーのみが返される

**Given** triggerAction が `"inquiry.convert"` で、2 件のアクティブポリシーがある（1 件は budget > 1000000、もう 1 件は budget > 10000000）
**When** context `{ budget: 5000000 }` で `evaluatePolicies` を呼び出す
**Then** budget > 1000000 のポリシーのみが返される

#### Scenario: 無条件ポリシーは常に合致する

**Given** triggerAction が `"inquiry.convert"` で、conditionField が null のポリシーがある
**When** `evaluatePolicies` を呼び出す
**Then** そのポリシーが合致リストに含まれる

#### Scenario: アクティブポリシーがない場合は空配列を返す

**Given** triggerAction `"inquiry.convert"` に対応するアクティブポリシーがない
**When** `evaluatePolicies` を呼び出す
**Then** 空配列が返される

### Requirement: ApprovalCompleted イベント型が定義されている

`ApprovalCompleted` イベント型が `src/domain/events/types.ts` に定義され、`DomainEvent` union に含まれる MUST。payload は `requestId`, `originType`, `originTriggerAction` (nullable), `originTriggerEntityId` (nullable) を含む SHALL。

#### Scenario: ApprovalCompleted が DomainEvent union に含まれる

**Given** `src/domain/events/types.ts` の型定義
**When** TypeScript の型チェックを実行する
**Then** `ApprovalCompleted` が `DomainEvent` union の一部として認識される

### Requirement: 案件化時にポリシーが評価される

`updateInquiryStatus` で `newStatus` が `"converted"` の場合、`evaluatePolicies` を呼び出してアクティブポリシーを評価 SHALL する。`options.skipPolicyCheck` が `true` の場合はポリシー評価をスキップする MUST。

#### Scenario: ポリシー非合致時に案件が即時生成される

**Given** 引合が存在し、`"inquiry.convert"` に対するアクティブポリシーが合致しない
**When** `updateInquiryStatus({ ..., newStatus: "converted" })` を呼び出す
**Then** Deal が生成され、引合のステータスが `"converted"` に更新され、`InquiryConverted` イベントが発行される

#### Scenario: ポリシー合致時に承認リクエストが生成され、案件は生成されない

**Given** 引合が存在し、`"inquiry.convert"` に対するアクティブポリシーが合致する（テンプレート付き）
**When** `updateInquiryStatus({ ..., newStatus: "converted" })` を呼び出す
**Then** 承認リクエストが `origin_type=system`, `originTriggerAction="inquiry.convert"`, `originTriggerEntityId=引合ID`, status `"pending"` で生成される。テンプレートの steps から承認ステップが生成される。Deal は生成されない。引合のステータスは `"new"` のまま。

#### Scenario: skipPolicyCheck=true でポリシー評価をスキップする

**Given** 引合が存在し、`"inquiry.convert"` に対するアクティブポリシーが合致する
**When** `updateInquiryStatus({ ..., newStatus: "converted" }, { skipPolicyCheck: true })` を呼び出す
**Then** ポリシー評価はスキップされ、Deal が直接生成される

### Requirement: 承認完了時に ApprovalCompleted が発行される

`approveRequest` で全ステップが承認完了した場合、リクエストの `originType` が `"system"` であれば `ApprovalCompleted` イベントを dispatch する SHALL。`originType` が `"manual"` の場合は発行しない。

#### Scenario: system origin リクエストの全ステップ承認完了時に ApprovalCompleted が発行される

**Given** `origin_type=system`, `originTriggerAction="inquiry.convert"` の承認リクエストがあり、最後の承認ステップを実行する
**When** `approveRequest` を呼び出す
**Then** `ApprovalCompleted` イベントが dispatch される。payload に `requestId`, `originType: "system"`, `originTriggerAction: "inquiry.convert"`, `originTriggerEntityId` が含まれる

#### Scenario: manual origin リクエストでは ApprovalCompleted が発行されない

**Given** `origin_type=manual` の承認リクエストがあり、全ステップが承認完了する
**When** `approveRequest` を呼び出す
**Then** `ApprovalCompleted` イベントは発行されない。`request.approved` のみ発行される

### Requirement: 承認後に案件が自動生成される

`ApprovalCompleted` の非同期ハンドラが `originTriggerAction` を確認し、`"inquiry.convert"` の場合に `updateInquiryStatus` を `skipPolicyCheck=true` で呼び出して案件を生成する SHALL。

#### Scenario: inquiry.convert の承認完了で案件が自動生成される

**Given** `originTriggerAction="inquiry.convert"`, `originTriggerEntityId=<inquiryId>` の `ApprovalCompleted` イベントが発行される
**When** 非同期ハンドラが実行される
**Then** `updateInquiryStatus` が `skipPolicyCheck=true` で呼び出され、Deal が生成される

#### Scenario: skipPolicyCheck により無限ループしない

**Given** 承認後ハンドラが `updateInquiryStatus` を呼び出す
**When** `skipPolicyCheck=true` が渡される
**Then** ポリシー評価がスキップされ、Deal が直接生成される。再度ポリシー評価 → 承認リクエスト生成のループは発生しない

### Requirement: 既存の手動承認フローが引き続き動作する

`origin_type=manual` の承認リクエストに対する `approveRequest`, `rejectRequest`, `submitRequest` の動作は変更しない MUST。

#### Scenario: 手動承認リクエストの承認フローが変わらない

**Given** `origin_type=manual` の承認リクエストが存在する
**When** 既存の承認フロー（submit → approve）を実行する
**Then** `request.approved` イベントが発行され、`ApprovalCompleted` は発行されない。動作は変更前と同一
