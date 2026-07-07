# Tasks: MCP ツール — 承認系（申請・承認・委任・テンプレート・ポリシー）

## T-01: approval_requests ツールの実装

`src/app/api/mcp/tools/approvalRequests.ts` を新規作成する。

- [ ] `registerApprovalRequestsTools(server: McpServer)` 関数をエクスポートする
- [ ] `getAuthInfo` ヘルパーを定義する（deals.ts と同一パターン）
- [ ] `z.discriminatedUnion("operation", [...])` で 8 operation のスキーマを定義する
- [ ] **list** operation:
  - canPerform(role, "approval", "listRequests") で認可判定
  - `listRequests` usecase を呼び出す（`@/application/usecases/listRequests` から個別 import）
  - organizationId は authInfo.extra から取得
  - `filter` 引数（optional, enum: "action_required" / "my_requests" / "all"）:
    - `"action_required"`: status=pending かつ `approvalSteps` に status=pending, approverRole=role のステップがあるもの（ステップなしの legacy リクエストも含む）
    - `"my_requests"`: creatorId=userId のもの
    - `"all"`: 全件。admin/manager 以外の場合は空配列を返す
    - 未指定の場合は全件を返す
  - `statusFilter` 引数（optional, enum: "draft" / "pending" / "approved" / "rejected" / "revision" / "expired"）で追加絞り込み
- [ ] **get** operation:
  - canPerform(role, "approval", "viewRequest") で認可判定
  - `getRequest` usecase を呼び出す（`@/application/usecases/getRequest` から個別 import）で Request を取得
  - `getApprovalSteps` usecase を呼び出す（`@/application/usecases/getApprovalSteps` から個別 import）でステップを取得
  - requestId（UUID）は必須引数
  - 結果が null の場合は toToolError("承認リクエストが見つかりません")
  - 結果に Request の全フィールド（originType, originTriggerAction, originTriggerEntityId 含む）+ approvalSteps 配列を含める
- [ ] **create** operation:
  - canPerform(role, "approval", "listRequests") での認可判定（Server Action では認証のみ。全ロールが作成可能）
  - checkRateLimit でレート制限（key: `mcp:createRequest:${userId}`, createRequest リミット使用）
  - テンプレートを `approvalTemplateRepository.findById` で取得（`@/infrastructure/repositories` から個別 import）
  - テンプレートが見つからない場合は toToolError("テンプレートが見つかりません")
  - テンプレートの fields 定義に基づいて formData を検証する:
    - required フィールドの空チェック
    - number 型の数値チェック
    - select 型の options チェック
  - 検証通過後、`{ value, label }` 構造に変換して `createRequest` usecase に渡す（`@/application/usecases/createRequest` から個別 import）
  - 必須引数: title（文字列, min 1）, templateId（UUID）
  - optional 引数: formData（Record<string, unknown>）
- [ ] **submit** operation:
  - canPerform(role, "approval", "submit") で認可判定
  - checkRateLimit でレート制限（key: `mcp:submitRequest:${userId}`, approveReject リミット使用）
  - `submitRequest` usecase を呼び出す（`@/application/usecases/submitRequest` から個別 import）
  - requestId（UUID）は必須引数
- [ ] **approve** operation:
  - canPerform(role, "approval", "approve") で認可判定
  - checkRateLimit でレート制限（key: `mcp:approveRequest:${userId}`, approveReject リミット使用）
  - `approveRequest` usecase を呼び出す（`@/application/usecases/approveRequest` から個別 import）
  - requestId（UUID）は必須引数
  - actorRole は authInfo.extra.role から取得して usecase に渡す
- [ ] **reject** operation:
  - canPerform(role, "approval", "reject") で認可判定
  - checkRateLimit でレート制限（key: `mcp:rejectRequest:${userId}`, approveReject リミット使用）
  - `rejectRequest` usecase を呼び出す（`@/application/usecases/rejectRequest` から個別 import）
  - requestId（UUID）は必須引数
  - targetStatus 引数（optional, enum: "rejected" / "revision"。デフォルト "rejected"）
  - comment 引数（optional, 文字列）
- [ ] **bulk_approve** operation:
  - canPerform(role, "approval", "approve") で認可判定
  - requestIds 配列（UUID の配列, min 1, max 20）は必須引数
  - checkRateLimit でレート制限（key: `mcp:bulkApprove:${userId}`, approveReject リミット使用）
  - `bulkApprove` usecase を呼び出す（`@/application/usecases/bulkApprove` から個別 import）
  - actorRole は authInfo.extra.role から取得
- [ ] **resubmit** operation:
  - canPerform(role, "approval", "submit") で認可判定
  - checkRateLimit でレート制限（key: `mcp:resubmitRequest:${userId}`, approveReject リミット使用）
  - `resubmitRequest` usecase を呼び出す（`@/application/usecases/resubmitRequest` から個別 import）
  - requestId（UUID）は必須引数
- [ ] 全 operation の catch で `handleToolError(error)` を使用する
- [ ] usecase の Result が `{ ok: false }` の場合は `toToolError(result.reason)` を返す

**Acceptance Criteria**:
- approval_requests ツールが 8 operation を持つ discriminated union スキーマを持つ
- 各 operation が対応する usecase を呼び出す
- organizationId は authInfo.extra からのみ取得される
- list の filter が UI の action-required / my-requests と同一ロジックでフィルタリングする
- get の結果に originType, originTriggerAction, originTriggerEntityId, approvalSteps が含まれる
- create で formData のテンプレートフィールド検証が行われる

## T-02: delegations ツールの実装

`src/app/api/mcp/tools/delegations.ts` を新規作成する。

- [ ] `registerDelegationsTools(server: McpServer)` 関数をエクスポートする
- [ ] `getAuthInfo` ヘルパーを定義する
- [ ] `z.discriminatedUnion("operation", [...])` で 3 operation のスキーマを定義する
- [ ] **list** operation:
  - canPerform(role, "approvalSettings", "listDelegations") で認可判定
  - `listDelegations` usecase を呼び出す（`@/application/usecases/listDelegations` から個別 import）
  - admin 以外は自身の委任（fromUserId=userId）のみにフィルタする（Server Action と同一）
- [ ] **create** operation:
  - canPerform(role, "approvalSettings", "createDelegation") で認可判定
  - checkRateLimit でレート制限（key: `mcp:createDelegation:${userId}`, createRequest リミット使用）
  - admin 以外は fromUserId が自分自身でなければ拒否する（`toToolError("この操作を実行する権限がありません")`）
  - `createDelegation` usecase を呼び出す（`@/application/usecases/createDelegation` から個別 import）
  - 必須引数: fromUserId（UUID）, toUserId（UUID）, startDate（文字列 → Date）, endDate（文字列 → Date）
- [ ] **deactivate** operation:
  - canPerform(role, "approvalSettings", "deactivateDelegation") で認可判定
  - admin 以外は自身の委任のみ無効化可能: `approvalDelegationRepository.findByOrganization` で全委任を取得し、delegationId に該当する委任の fromUserId が自分自身でなければ拒否する（Server Action と同一ロジック）
  - `deactivateDelegation` usecase を呼び出す（`@/application/usecases/deactivateDelegation` から個別 import）
  - delegationId（UUID）は必須引数
- [ ] 全 operation の catch で `handleToolError(error)` を使用する

**Acceptance Criteria**:
- delegations ツールが 3 operation を持つ
- admin 以外の create で fromUserId が自分以外だと拒否される
- admin 以外の deactivate で他人の委任が拒否される
- list で admin 以外は自身の委任のみ返される
- organizationId は authInfo.extra からのみ取得される

## T-03: approval_templates ツールの実装

`src/app/api/mcp/tools/approvalTemplates.ts` を新規作成する。

- [ ] `registerApprovalTemplatesTools(server: McpServer)` 関数をエクスポートする
- [ ] `getAuthInfo` ヘルパーを定義する
- [ ] `z.discriminatedUnion("operation", [...])` で 4 operation のスキーマを定義する
- [ ] **list** operation:
  - canPerform(role, "approvalSettings", "listTemplates") で認可判定
  - `approvalTemplateRepository.findByOrganization` を呼び出す（`@/infrastructure/repositories` から個別 import）
  - Server Action の listTemplatesAction と同一パターン
- [ ] **create** operation:
  - canPerform(role, "approvalSettings", "createTemplate") で認可判定
  - checkRateLimit でレート制限（key: `mcp:createTemplate:${userId}`, createRequest リミット使用）
  - `createTemplate` usecase を呼び出す（`@/application/usecases/createTemplate` から個別 import）
  - 必須引数: name（文字列, min 1）, steps（配列, min 1。各要素に approverRole: enum, optional deadlineHours: 正の整数, optional condition）
  - optional 引数: fields（配列。各要素に name, label, type: enum, required: boolean, optional options）
  - steps の各要素に stepOrder を自動付与する（index + 1）
- [ ] **update** operation:
  - canPerform(role, "approvalSettings", "editTemplate") で認可判定
  - checkRateLimit でレート制限
  - `updateTemplate` usecase を呼び出す（`@/application/usecases/updateTemplate` から個別 import）
  - templateId（UUID）は必須引数
  - optional 引数: name, steps, fields（undefined は「変更なし」）
  - steps 指定時は stepOrder を自動付与する
- [ ] **delete** operation:
  - canPerform(role, "approvalSettings", "deleteTemplate") で認可判定
  - checkRateLimit でレート制限
  - `deleteTemplate` usecase を呼び出す（`@/application/usecases/deleteTemplate` から個別 import）
  - templateId（UUID）は必須引数
  - 成功時は `{ deleted: true, templateId }` を返す
- [ ] 全 operation の catch で `handleToolError(error)` を使用する

**Acceptance Criteria**:
- approval_templates ツールが 4 operation を持つ
- create / update / delete は admin のみ、list は admin/manager
- steps の stepOrder が自動付与される
- update で undefined（変更なし）が正しく usecase に渡される

## T-04: approval_policies ツールの実装

`src/app/api/mcp/tools/approvalPolicies.ts` を新規作成する。

- [ ] `registerApprovalPoliciesTools(server: McpServer)` 関数をエクスポートする
- [ ] `getAuthInfo` ヘルパーを定義する
- [ ] `z.discriminatedUnion("operation", [...])` で 4 operation のスキーマを定義する
- [ ] **list** operation:
  - canPerform(role, "approvalSettings", "listPolicies") で認可判定
  - `approvalPolicyRepository.findByOrganization` を呼び出す（`@/infrastructure/repositories` から個別 import）
- [ ] **create** operation:
  - canPerform(role, "approvalSettings", "createPolicy") で認可判定
  - checkRateLimit でレート制限（key: `mcp:createPolicy:${userId}`, createRequest リミット使用）
  - `createPolicy` usecase を呼び出す（`@/application/usecases/createPolicy` から個別 import）
  - 必須引数: name（文字列, min 1）, triggerAction（enum: "inquiry.convert" / "contract.create" / "contract.cancel"）, templateId（UUID）
  - optional 引数: description（文字列）, conditionField（文字列）, conditionOperator（enum: "gt"/"gte"/"lt"/"lte"/"eq"/"neq"/"in"）, conditionValue（文字列）
  - conditionField が指定された場合、conditionOperator と conditionValue も必須（Server Action と同一の superRefine ロジック）
- [ ] **update** operation:
  - canPerform(role, "approvalSettings", "editPolicy") で認可判定
  - checkRateLimit でレート制限
  - `updatePolicy` usecase を呼び出す（`@/application/usecases/updatePolicy` から個別 import）
  - policyId（UUID）は必須引数
  - 必須引数: name, triggerAction, templateId（Server Action と同一。全フィールド必須の全置換更新）
  - optional 引数: description, conditionField, conditionOperator, conditionValue
  - conditionField が指定された場合、conditionOperator と conditionValue も必須
- [ ] **toggle** operation:
  - canPerform(role, "approvalSettings", "editPolicy") で認可判定
  - checkRateLimit でレート制限
  - `togglePolicy` usecase を呼び出す（`@/application/usecases/togglePolicy` から個別 import）
  - policyId（UUID）は必須引数
- [ ] 全 operation の catch で `handleToolError(error)` を使用する

**Acceptance Criteria**:
- approval_policies ツールが 4 operation を持つ
- create / update / toggle は admin のみ、list は admin/manager
- create / update で conditionField がある場合 conditionOperator と conditionValue が必須
- toggle が usecase の togglePolicy を呼ぶ

## T-05: route.ts にツール登録を追加

`src/app/api/mcp/route.ts` の `createMcpServer()` 内に新ツールの登録を追加する。

- [ ] `import { registerApprovalRequestsTools } from "./tools/approvalRequests"` を追加
- [ ] `import { registerDelegationsTools } from "./tools/delegations"` を追加
- [ ] `import { registerApprovalTemplatesTools } from "./tools/approvalTemplates"` を追加
- [ ] `import { registerApprovalPoliciesTools } from "./tools/approvalPolicies"` を追加
- [ ] `createMcpServer()` 内で 4 つの register 関数を呼び出す

**Acceptance Criteria**:
- `createMcpServer()` が 15 ツール（既存 11 + 新規 4）を登録する
- typecheck が通る

## T-06: 承認者資格フィルタの実行検証テスト

`src/__tests__/mcp/mcpApprovalRequestsList.dynamic.test.ts` を新規作成する。

- [ ] `listRequests` usecase を `mock.module` で個別ファイルモックする
- [ ] `@/infrastructure/rateLimit` をモックする
- [ ] モックが返す RequestWithSteps[] に以下のデータを含める:
  - req-1: status=pending, approvalSteps=[{ approverRole: "manager", status: "pending" }]
  - req-2: status=pending, approvalSteps=[{ approverRole: "finance", status: "pending" }]
  - req-3: status=approved, approvalSteps=[]
  - req-4: status=pending, approvalSteps=[] (legacy, ステップなし)
- [ ] **manager ロール**で `filter: "action_required"` を呼び、req-1 と req-4 のみ返されることを assert する
- [ ] **finance ロール**で `filter: "action_required"` を呼び、req-2 と req-4 のみ返されることを assert する
- [ ] **member ロール**で `filter: "action_required"` を呼び、req-4 のみ返されることを assert する（member ステップはないが、legacy はステップなしなので含まれる）
- [ ] `filter: "my_requests"` を userId=creatorId のもので呼び、creatorId 一致のみ返されることを assert する
- [ ] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「自分が承認すべき申請の一覧が承認者資格どおりに絞られることをテストで固定する」を満たす
- behavioral test（実行検証）である

## T-07: 順序外ステップ承認の拒否テスト

`src/__tests__/mcp/mcpApprovalRequestsApprove.dynamic.test.ts` を新規作成する。

- [ ] `approveRequest` usecase を `mock.module` で個別ファイルモックする
- [ ] `@/infrastructure/rateLimit` をモックする
- [ ] approval_requests ツールの `approve` operation を実際に実行する
- [ ] `approveRequest` のモックが `{ ok: false, reason: "All approval steps are already completed." }` を返すよう設定する
- [ ] ツール結果が `isError: true` であることを assert する
- [ ] ツール結果のテキストに拒否メッセージが含まれることを assert する
- [ ] `approveRequest` が正しい引数（requestId, organizationId, actorId, actorRole）で呼ばれることを assert する
- [ ] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「順序外のステップ承認が拒否されること」をテストで固定する
- behavioral test（実行検証）である
- usecase の順序制約ロジック自体は usecase のテストで固定済みだが、MCP ツール経路で usecase に正しく到達することを検証する

## T-08: 権限外ユーザーの承認・却下拒否テスト

`src/__tests__/mcp/mcpApprovalAuthz.dynamic.test.ts` を新規作成する。

- [ ] `approveRequest`, `rejectRequest` usecase を `mock.module` で個別ファイルモックする
- [ ] `@/infrastructure/rateLimit` をモックする
- [ ] **member ロール**で approve を呼び、isError=true で拒否され approveRequest usecase に到達しないことを assert する
- [ ] **admin ロール**で approve を呼び、approveRequest usecase に到達することを assert する
- [ ] **member ロール**で reject を呼び、isError=true で拒否され rejectRequest usecase に到達しないことを assert する
- [ ] **finance ロール**で reject を呼び、rejectRequest usecase に到達することを assert する
- [ ] **member ロール**で bulk_approve を呼び、isError=true で拒否されることを assert する
- [ ] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「資格のないユーザーの承認・却下が拒否されることをテストで固定する」を満たす
- 権限外ロールの拒否と権限内ロールの到達の両方を検証する

## T-09: システム連動承認の後続アクション実行テスト

`src/__tests__/mcp/mcpApprovalRequestsApprove.dynamic.test.ts` に追加。

- [ ] `approveRequest` usecase のモックが `{ ok: true, request: { ... originType: "system", originTriggerAction: "inquiry.convert" } }` を返すよう設定する
- [ ] approval_requests ツールの `approve` operation を admin ロールで実行する
- [ ] `approveRequest` が呼ばれ、引数に organizationId と actorRole が含まれることを assert する
- [ ] ツール結果が `isError` でない（成功）ことを assert する
- [ ] 結果に originType="system" が含まれることを assert する（usecase 共有 = 既存挙動維持の証明）

**Acceptance Criteria**:
- 受け入れ基準「システム連動申請の承認で後続アクションが実行されること（既存挙動の維持）をテストで固定する」を満たす
- MCP ツール経路が usecase をそのまま呼ぶことで既存挙動が維持されることを検証する

## T-10: bulk_approve が個別承認と同一判定になることのテスト

`src/__tests__/mcp/mcpApprovalRequestsApprove.dynamic.test.ts` に追加。

- [ ] `bulkApprove` usecase を `mock.module` で個別ファイルモックする
- [ ] bulk_approve operation で requestIds=["req-uuid-1", "req-uuid-2"] を実行する
- [ ] `bulkApprove` usecase が organizationId, actorId, actorRole を受け取って呼ばれることを assert する
- [ ] モックが `{ results: [{ requestId: "req-uuid-1", success: true }, { requestId: "req-uuid-2", success: false, reason: "..." }] }` を返すよう設定する
- [ ] ツール結果に個別の success/failure が含まれることを assert する
- [ ] requestIds が 21 件の場合、上限エラーが返されることを assert する（MCP ツールレイヤーで上限チェック）

**Acceptance Criteria**:
- 受け入れ基準「bulk_approve が個別承認と同一の判定・記録になることをテストで固定する」を満たす
- usecase 共有であることを実行検証で固定する

## T-11: 監査ログ記録とテナント分離のテスト

`src/__tests__/mcp/mcpApprovalAuditTenant.dynamic.test.ts` を新規作成する。

- [ ] **監査記録の実行検証**: approval_requests の create を実行し、createRequest usecase が organizationId と creatorId を受け取って呼ばれることを assert する
- [ ] **テナント分離の実行検証**: organizationId="org-A" と "org-B" の 2 つの authInfo で approval_requests の submit を呼び、usecase に渡される organizationId がそれぞれ正しいことを assert する
- [ ] delegations の create でも organizationId 伝播を検証する
- [ ] approval_templates の create でも organizationId 伝播を検証する
- [ ] approval_policies の create でも organizationId 伝播を検証する
- [ ] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「書き込みが監査ログに記録され、他テナントに触れられないことをテストで固定する」を満たす
- 全 4 ツールについてテナント分離が実行検証される

## T-12: delegations の create の fromUserId 制限テスト

`src/__tests__/mcp/mcpApprovalAuthz.dynamic.test.ts` に追加。

- [ ] `createDelegation` usecase を `mock.module` で個別ファイルモックする
- [ ] **manager ロール**（userId="user-mgr-1"）で fromUserId="user-other" を指定して create を呼び、isError=true で拒否され usecase に到達しないことを assert する
- [ ] **manager ロール**で fromUserId="user-mgr-1"（自分自身）を指定して create を呼び、usecase に到達することを assert する
- [ ] **admin ロール**で fromUserId="user-other"（他人）を指定して create を呼び、usecase に到達することを assert する

**Acceptance Criteria**:
- admin 以外の fromUserId 制限が MCP ツール経路で機能することを検証する
- Server Action と同一の制約が適用される

## T-13: get でシステム連動情報が返されるテスト

`src/__tests__/mcp/mcpApprovalRequestsList.dynamic.test.ts` に追加。

- [ ] `getRequest` usecase を `mock.module` で個別ファイルモックする
- [ ] `getApprovalSteps` usecase を `mock.module` で個別ファイルモックする
- [ ] モックが originType="system", originTriggerAction="inquiry.convert", originTriggerEntityId="inq-uuid-1" のリクエストを返すよう設定する
- [ ] モックが承認ステップ配列を返すよう設定する
- [ ] get operation を実行し、結果に originType, originTriggerAction, originTriggerEntityId, approvalSteps が含まれることを assert する

**Acceptance Criteria**:
- エージェントがシステム連動承認の影響を説明するための情報がツール結果に含まれることを検証する

## T-14: typecheck・test green の確認

- [ ] `bun run typecheck` が green であることを確認する
- [ ] `bun test` が green であることを確認する（既存テスト無変更で green）
- [ ] 新規テストファイルが全て pass することを確認する
- [ ] `aozu check` が exit 0 であることを確認する

**Acceptance Criteria**:
- 受け入れ基準「`typecheck && test` green・`aozu check` exit 0」を満たす
