# Tasks: MCP ツール 管理系（組織・ユーザー・Webhook・監査ログ）

## T-01: webhookUrlValidator の抽出

Server Actions（`src/app/actions/webhooks.ts`）内のクロージャ `validateWebhookUrl` と `isPrivateHost`、`PRIVATE_IP_PATTERNS` を共有ユーティリティとして抽出する。MCP ツールと Server Actions の両方から同一ロジックを使用可能にする。

- [x] `src/domain/services/webhookUrlValidator.ts` を作成する
  - `PRIVATE_IP_PATTERNS` 定数を移動する
  - `isPrivateHost(hostname: string): boolean` を export する
  - `validateWebhookUrl(url: string): { ok: true } | { ok: false; message: string }` を export する
  - ロジックは現在の `src/app/actions/webhooks.ts` と完全に同一にする
- [x] `src/app/actions/webhooks.ts` から `PRIVATE_IP_PATTERNS`, `isPrivateHost`, `validateWebhookUrl` を削除し、`src/domain/services/webhookUrlValidator.ts` からの import に置き換える

**Acceptance Criteria**:
- `src/app/actions/webhooks.ts` にバリデーションロジックの重複がない
- `src/domain/services/webhookUrlValidator.ts` が HTTPS 必須・プライベート IP 拒否のロジックを持つ
- `typecheck` green

## T-02: organization ツールハンドラの実装

`src/app/api/mcp/tools/organization.ts` を作成し、get / update の 2 操作を提供する。

- [x] `src/app/api/mcp/tools/organization.ts` を作成する
  - `getAuthInfo` ヘルパー（既存ツールと同一パターン）
  - Zod スキーマ: `getSchema`（operation: "get"）, `updateSchema`（operation: "update", name: string）
  - `organizationInputSchema` = discriminatedUnion("operation", [...])
  - `registerOrganizationTools(server: McpServer): void` を export する
- [x] get 操作:
  - `canPerform(role, "organization", "updateOrganization")` は不要（get は全ロールで可能 — getOrganizationAction の Server Action は認可チェックなし）
  - `organizationRepository.findById(organizationId, organizationId)` を呼ぶ
  - 見つからない場合は `toToolError("組織が見つかりません")`
  - 成功時は `toToolSuccess(organization)`
- [x] update 操作:
  - `canPerform(role, "organization", "updateOrganization")` で認可チェック
  - レート制限: `mcp:updateOrganization:${userId}`, `RATE_LIMITS.createRequest`
  - `updateOrganization({ organizationId, actorId: userId, name: args.name })` を呼ぶ
  - `result.ok === false` の場合は `toToolError(result.reason)`
  - 成功時は `toToolSuccess({ updated: true })`
- [x] エラーハンドリング: 外側の try-catch で `handleToolError(error)` を返す
- [x] import: `organizationRepository` は `@/infrastructure/repositories` のバレルから、`updateOrganization` は `@/application/usecases/updateOrganization` から個別 import する

**Acceptance Criteria**:
- organization ツールが get / update の 2 操作を discriminatedUnion で提供する
- organizationId は authInfo.extra から取得し、ツール引数に含まない
- update は admin ロール限定、get は全ロール許可
- `typecheck` green

## T-03: users ツールハンドラの実装

`src/app/api/mcp/tools/users.ts` を作成し、list / create / update_role / deactivate / reactivate の 5 操作を提供する。

- [x] `src/app/api/mcp/tools/users.ts` を作成する
  - `getAuthInfo` ヘルパー
  - Zod スキーマ（5 操作分）:
    - `listSchema`: operation: "list"
    - `createSchema`: operation: "create", email: string().email(), name: string().min(1), role: enum(["admin", "member", "manager", "finance"]), password: string().min(8)
    - `updateRoleSchema`: operation: "update_role", userId: string().uuid(), role: enum([...])
    - `deactivateSchema`: operation: "deactivate", userId: string().uuid()
    - `reactivateSchema`: operation: "reactivate", userId: string().uuid()
  - `usersInputSchema` = discriminatedUnion("operation", [...])
  - `registerUsersTools(server: McpServer): void` を export する
- [x] list 操作:
  - `canPerform(role, "organization", "listUsers")` で認可チェック（admin / manager のみ）
  - `listOrganizationUsers({ organizationId })` usecase を呼ぶ（`@/application/usecases/listOrganizationUsers` から個別 import）
  - 成功時は `toToolSuccess(users)`
- [x] create 操作:
  - `canPerform(role, "organization", "createUser")` で認可チェック（admin のみ）
  - レート制限: `mcp:createUser:${userId}`, `RATE_LIMITS.createRequest`
  - `createUser({ organizationId, actorId: userId, email, name, role, password })` を呼ぶ（`@/application/usecases/createUser` から個別 import）
  - `result.ok === false` の場合は `toToolError(result.reason)`
  - 成功時は作成されたユーザー情報を返す（パスワードは含まない — User 型にパスワードフィールドはない）
- [x] update_role 操作:
  - `canPerform(role, "organization", "changeRole")` で認可チェック（admin のみ）
  - レート制限: `mcp:updateUserRole:${userId}`, `RATE_LIMITS.createRequest`
  - `updateUserRole({ targetUserId: args.userId, organizationId, actorId: userId, newRole: args.role })` を呼ぶ（`@/application/usecases/updateUserRole` から個別 import）
  - usecase 内部の自己変更ガード・最後の admin 降格ガードがそのまま機能する
- [x] deactivate 操作:
  - `canPerform(role, "organization", "deactivateUser")` で認可チェック（admin のみ）
  - レート制限: `mcp:deactivateUser:${userId}`, `RATE_LIMITS.createRequest`
  - `deactivateUser({ actorId: userId, targetUserId: args.userId, organizationId })` を呼ぶ（`@/application/usecases/deactivateUser` から個別 import）
  - usecase 内部の自己ロックアウト防止・最後の admin 防止がそのまま機能する
- [x] reactivate 操作:
  - `canPerform(role, "organization", "deactivateUser")` で認可チェック（Server Actions と同一: reactivate も deactivateUser 権限を使用）
  - レート制限: `mcp:reactivateUser:${userId}`, `RATE_LIMITS.createRequest`
  - `reactivateUser({ actorId: userId, targetUserId: args.userId, organizationId })` を呼ぶ（`@/application/usecases/reactivateUser` から個別 import）
- [x] 全操作: `result.ok === false` → `toToolError(result.reason)`, 外側 try-catch → `handleToolError(error)`

**Acceptance Criteria**:
- users ツールが 5 操作を discriminatedUnion で提供する
- 認可は canPerform の既存行列に従う（list は admin/manager、それ以外は admin のみ）
- deactivateUser usecase の自己ロックアウト防止ガードが MCP 経由でも機能する
- organizationId は authInfo.extra から取得
- `typecheck` green

## T-04: webhooks ツールハンドラの実装

`src/app/api/mcp/tools/webhooks.ts` を作成し、6 操作を提供する。

- [x] `src/app/api/mcp/tools/webhooks.ts` を作成する
  - `getAuthInfo` ヘルパー
  - Zod スキーマ（6 操作分）:
    - `listSchema`: operation: "list"
    - `createSchema`: operation: "create", url: string().url(), events: array(string()).min(1)
    - `deleteSchema`: operation: "delete", endpointId: string().uuid()
    - `toggleSchema`: operation: "toggle", endpointId: string().uuid(), isActive: boolean()
    - `listDeliveriesSchema`: operation: "list_deliveries", endpointId: string().uuid()
    - `retryDeliverySchema`: operation: "retry_delivery", deliveryId: string().uuid()
  - `webhooksInputSchema` = discriminatedUnion("operation", [...])
  - `registerWebhooksTools(server: McpServer): void` を export する
- [x] 全操作共通: `canPerform(role, "organization", "manageWebhooks")` で認可チェック（admin のみ）
- [x] list 操作:
  - `webhookEndpointRepository.findByOrganization(organizationId)` を呼ぶ
  - レスポンスから `secret` フィールドを除外する（`{ id, organizationId, url, isActive, events, createdAt, updatedAt }` のみ返す）
  - `toToolSuccess(endpoints)` — secret フィールドを除いた配列を返す
- [x] create 操作:
  - レート制限: `mcp:webhookManage:${userId}`, `RATE_LIMITS.webhookManage`
  - T-01 で抽出した `validateWebhookUrl(args.url)` でバリデーション
  - `WEBHOOK_EVENT_TYPES` でイベント種別をフィルタし、有効なイベントが 0 件の場合はエラー
  - `randomBytes(32)` でシークレットを生成（"whsec_" + hex）
  - `webhookEndpointRepository.create({ organizationId, url, secret, events })` を呼ぶ
  - 成功時はフルシークレットを含む `{ ...endpoint, secret }` を返す
- [x] delete 操作:
  - レート制限: `mcp:webhookManage:${userId}`, `RATE_LIMITS.webhookManage`
  - `webhookEndpointRepository.deleteById(args.endpointId, organizationId)` を呼ぶ
- [x] toggle 操作:
  - レート制限: `mcp:webhookManage:${userId}`, `RATE_LIMITS.webhookManage`
  - `webhookEndpointRepository.updateIsActive(args.endpointId, organizationId, args.isActive)` を呼ぶ
- [x] list_deliveries 操作:
  - `webhookDeliveryRepository.findByEndpointId(args.endpointId, organizationId, { limit: 50 })` を呼ぶ
- [x] retry_delivery 操作:
  - レート制限: `mcp:webhookManage:${userId}`, `RATE_LIMITS.webhookManage`
  - `webhookDeliveryRepository.findById(args.deliveryId, organizationId)` で配信を取得
  - 見つからない場合はエラー
  - `webhookEndpointRepository.findById(delivery.endpointId, organizationId)` でエンドポイントを取得
  - `delivery.status !== "failed"` の場合は「failed 状態の配信のみリトライできます」エラー
  - `webhookDeliveryRepository.resetForRetry(deliveryId)` → `deliverSingleAttempt(endpoint, delivery.payload, deliveryId)` を void で呼ぶ
- [x] エラーハンドリング: 外側の try-catch で `handleToolError(error)` を返す

**Acceptance Criteria**:
- webhooks ツールが 6 操作を discriminatedUnion で提供する
- create レスポンスのみフルシークレットを含み、list レスポンスには secret フィールドがない
- URL バリデーション（HTTPS 必須・プライベート IP 拒否）が機能する
- 全操作が admin ロール限定
- organizationId は authInfo.extra から取得
- `typecheck` green

## T-05: audit_logs ツールハンドラの実装

`src/app/api/mcp/tools/auditLogs.ts` を作成し、search 操作（読み取り専用）を提供する。

- [x] `src/app/api/mcp/tools/auditLogs.ts` を作成する
  - `getAuthInfo` ヘルパー
  - Zod スキーマ:
    - `searchSchema`: operation: "search", startDate: string().datetime().optional(), endDate: string().datetime().optional(), action: string().optional(), actorId: string().uuid().optional(), targetType: string().optional(), limit: number().int().min(1).max(1000).optional().default(100), offset: number().int().min(0).optional()
  - `auditLogsInputSchema` = discriminatedUnion("operation", [searchSchema])（将来の拡張性のため discriminatedUnion を維持）
  - `registerAuditLogsTools(server: McpServer): void` を export する
- [x] search 操作:
  - `canPerform(role, "organization", "exportAuditLog")` で認可チェック（admin のみ — exportAuditLog 権限を使用。Server Actions の audit-logs/export/route.ts が `role !== "admin"` で直接チェックしている同等物）
  - レート制限: `mcp:auditLogs:${userId}`, `RATE_LIMITS.search`
  - `startDate` / `endDate` は ISO 文字列 → Date 変換する
  - `listAuditLogs({ organizationId, filters: { startDate, endDate, action, actorId, targetType, limit, offset } })` を呼ぶ（`@/application/usecases/listAuditLogs` から個別 import）
  - 成功時は `toToolSuccess({ logs, count: logs.length })` で結果を返す
- [x] エラーハンドリング: 外側の try-catch で `handleToolError(error)` を返す

**Acceptance Criteria**:
- audit_logs ツールが search 操作のみを提供する（書き込み操作なし）
- admin ロール限定
- フィルタ（startDate, endDate, action, actorId, targetType）とページネーション（limit, offset）が機能する
- organizationId は authInfo.extra から取得（テナント分離）
- `typecheck` green

## T-06: route.ts への 4 ツール登録

`src/app/api/mcp/route.ts` の `createMcpServer` 関数に 4 つの新規ツール登録を追加する。

- [x] route.ts に以下の import を追加:
  - `import { registerOrganizationTools } from "./tools/organization";`
  - `import { registerUsersTools } from "./tools/users";`
  - `import { registerWebhooksTools } from "./tools/webhooks";`
  - `import { registerAuditLogsTools } from "./tools/auditLogs";`
- [x] `createMcpServer` 関数内に以下の呼び出しを追加:
  - `registerOrganizationTools(server);`
  - `registerUsersTools(server);`
  - `registerWebhooksTools(server);`
  - `registerAuditLogsTools(server);`

**Acceptance Criteria**:
- `createMcpServer` が 19 ツールを登録する
- `typecheck` green

## T-07: ツール登録テスト更新（15 → 19）

`src/__tests__/mcp/mcpToolsRegistration.test.ts` を更新し、19 ツールが登録されることを検証する。

- [x] 新規ツールの register 関数を import に追加:
  - `const { registerOrganizationTools } = await import("../../app/api/mcp/tools/organization");`
  - `const { registerUsersTools } = await import("../../app/api/mcp/tools/users");`
  - `const { registerWebhooksTools } = await import("../../app/api/mcp/tools/webhooks");`
  - `const { registerAuditLogsTools } = await import("../../app/api/mcp/tools/auditLogs");`
- [x] `createMcpServer` 相当のセットアップに 4 つの register 関数呼び出しを追加する
- [x] テスト内の期待値を更新:
  - `expect(toolNames).toHaveLength(19);`
  - `expect(toolNames).toContain("organization");`
  - `expect(toolNames).toContain("users");`
  - `expect(toolNames).toContain("webhooks");`
  - `expect(toolNames).toContain("audit_logs");`
- [x] テスト記述（TC-025 のコメント）を「15 + 4 = 19 ツール」に更新する

**Acceptance Criteria**:
- テストが 19 ツールの存在を検証する
- 既存 15 ツールの検証は維持される
- `bun test mcpToolsRegistration` green

## T-08: organization ツールの認可・テナント分離テスト

`src/__tests__/mcp/mcpOrganization.dynamic.test.ts` を作成する。

- [x] テストファイルの基本構造:
  - `mock.module` で依存を差し替え（rateLimit, organizationRepository, updateOrganization usecase, db）
  - `afterAll` で復元
  - `callOrganizationTool` ヘルパー関数（toolName: "organization", args, userId, organizationId, role）
- [x] 認可テスト:
  - admin で update を呼ぶ → usecase に到達する
  - member で update を呼ぶ → isError: true, usecase に到達しない
  - member で get を呼ぶ → 成功する（get は全ロール許可）
- [x] テナント分離テスト:
  - org-1 で get を呼ぶ → organizationRepository.findById に org-1 が渡される
  - org-2 で get を呼ぶ → organizationRepository.findById に org-2 が渡される
- [x] 監査記録テスト:
  - update を呼ぶ → updateOrganization usecase が organizationId と actorId を受け取る

**Acceptance Criteria**:
- admin 以外のロールで update が拒否されることが実行検証で固定
- テナント分離が実行検証で固定
- `bun test mcpOrganization` green

## T-09: users ツールの認可・自己ロックアウト保護テスト

`src/__tests__/mcp/mcpUsers.dynamic.test.ts` を作成する。

- [x] テストファイルの基本構造:
  - `mock.module` で依存を差し替え（rateLimit, db, userRepository, auditRecorder, createUser, updateUserRole, deactivateUser, reactivateUser, listOrganizationUsers）
  - 各 usecase モックの呼び出し引数をキャプチャする state オブジェクト
  - `afterAll` で復元
  - `callUsersTool` ヘルパー関数
- [x] 認可テスト（全操作）:
  - member で list を呼ぶ → isError: true（listUsers は admin/manager のみ）
  - member で create を呼ぶ → isError: true
  - member で update_role を呼ぶ → isError: true
  - member で deactivate を呼ぶ → isError: true
  - member で reactivate を呼ぶ → isError: true
  - admin で list を呼ぶ → 成功
  - admin で create を呼ぶ → usecase に到達
- [x] 自己ロックアウト防止テスト:
  - deactivateUser usecase の実実装をモックでシミュレートし、actorId === targetUserId の場合に拒否レスポンスが返ることを検証する
  - deactivateUser をモックする際、actorId === targetUserId のとき `{ ok: false, reason: "自分自身は無効化できません" }` を返す実装にする
  - admin（userId: "user-A"）で deactivate（userId: "user-A"）を呼ぶ → isError: true, 「自分自身は無効化できません」を含む
- [x] テナント分離テスト:
  - org-1 と org-2 で list を呼ぶ → usecase に渡される organizationId がそれぞれ正しい
- [x] 監査記録テスト:
  - create を呼ぶ → createUser の呼び出し引数に organizationId と actorId が含まれる（usecase 内で recordAudit が呼ばれることは usecase テストで保証済み）

**Acceptance Criteria**:
- admin 以外のロールで全操作が拒否されることが実行検証で固定
- 自己ロックアウト防止が MCP 経由でも機能することが実行検証で固定
- テナント分離が実行検証で固定
- `bun test mcpUsers` green

## T-10: webhooks ツールの認可・シークレット秘匿テスト

`src/__tests__/mcp/mcpWebhooks.dynamic.test.ts` を作成する。

- [x] テストファイルの基本構造:
  - `mock.module` で依存を差し替え（rateLimit, webhookEndpointRepository, webhookDeliveryRepository, deliverSingleAttempt）
  - 各 repository モックの呼び出し引数をキャプチャする state オブジェクト
  - `afterAll` で復元
  - `callWebhooksTool` ヘルパー関数
- [x] 認可テスト:
  - member で list を呼ぶ → isError: true
  - member で create を呼ぶ → isError: true
  - admin で list を呼ぶ → 成功
- [x] シークレット秘匿テスト:
  - admin で list を呼ぶ → レスポンスの各エンドポイントに `secret` フィールドが存在しないことを assert
  - admin で create を呼ぶ → レスポンスに `secret` フィールドが "whsec_" で始まるフル値で含まれることを assert
- [x] テナント分離テスト:
  - org-1 と org-2 で list を呼ぶ → repository に渡される organizationId がそれぞれ正しい
- [x] retry_delivery テスト:
  - failed 状態の配信 → 成功
  - delivered 状態の配信 → isError: true, 「failed 状態の配信のみリトライできます」

**Acceptance Criteria**:
- admin 以外のロールで全操作が拒否されることが実行検証で固定
- list レスポンスに secret フィールドがないことが実行検証で固定
- create レスポンスにフルシークレットが含まれることが実行検証で固定
- テナント分離が実行検証で固定
- `bun test mcpWebhooks` green

## T-11: audit_logs ツールの認可・テナント分離テスト

`src/__tests__/mcp/mcpAuditLogs.dynamic.test.ts` を作成する。

- [x] テストファイルの基本構造:
  - `mock.module` で依存を差し替え（rateLimit, listAuditLogs usecase）
  - listAuditLogs の呼び出し引数をキャプチャする state オブジェクト
  - `afterAll` で復元
  - `callAuditLogsTool` ヘルパー関数
- [x] 認可テスト:
  - member で search を呼ぶ → isError: true
  - manager で search を呼ぶ → isError: true（exportAuditLog は admin のみ）
  - admin で search を呼ぶ → 成功
- [x] テナント分離テスト:
  - org-1 で search を呼ぶ → listAuditLogs に organizationId: "org-1" が渡される
  - org-2 で search を呼ぶ → listAuditLogs に organizationId: "org-2" が渡される
  - 2 回の呼び出しで organizationId が混在しないことを assert
- [x] フィルタテスト:
  - `{ operation: "search", targetType: "user", limit: 10 }` で呼ぶ → listAuditLogs の filters に targetType: "user", limit: 10 が渡される

**Acceptance Criteria**:
- admin 以外のロールで search が拒否されることが実行検証で固定
- 自組織のログのみ返ることがテナント分離テストで固定
- フィルタが usecase に正しく伝播されることが実行検証で固定
- `bun test mcpAuditLogs` green

## T-12: README への MCP 操作一覧追記

README.md に MCP で可能な操作の全体像と除外一覧を記す。

- [x] README.md に MCP セクションを追加する:
  - 19 ツールの一覧（ツール名、操作一覧、対象エンティティ）
  - 各ツールの簡単な説明
  - 除外一覧: login / パスワード変更 / super-admin プロビジョニングの 3 件とその理由

**Acceptance Criteria**:
- README に MCP セクションが追加される
- 19 ツールが網羅される
- 除外 3 件が明記される

## T-13: 最終検証

全体の整合性を確認する。

- [x] `bun run typecheck` green
- [x] `bun test` green（既存テスト無変更で green）
- [x] 新規テスト全件 green

**Acceptance Criteria**:
- `typecheck && test` green
- 既存テストに変更がないこと
