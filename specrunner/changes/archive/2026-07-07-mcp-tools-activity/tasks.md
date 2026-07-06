# Tasks: MCP ツール — 活動系（顧客接点・タスク・ウォッチ・通知）

## T-01: interactions ツールの実装

`src/app/api/mcp/tools/interactions.ts` を新規作成する。

- [x] `registerInteractionsTools(server: McpServer)` 関数をエクスポートする
- [x] `getAuthInfo` ヘルパーを定義する（deals.ts / clients.ts と同一パターン）
- [x] `z.discriminatedUnion("operation", [...])` で 4 operation のスキーマを定義する
- [x] **create_meeting** operation:
  - canPerform(role, "meeting", "create") で認可判定
  - checkRateLimit でレート制限
  - dealId / inquiryId のいずれかが必須（両方なしは Zod レベルでは許可し、usecase に委ねる）
  - `createMeeting` usecase を呼び出す（`@/application/usecases/createMeeting` から個別 import）
  - kind は `"meeting"` 固定
  - attendees は `internalAttendees: string[]` + `externalAttendees: string[]` を MeetingAttendee[] に変換する（Server Action と同一ロジック）
  - hearingData は optional（hearing 以外は usecase 側で null に強制される）
  - actionItems は `LegacyMeetingActionItem[]` 形式で受け取る
- [x] **update_meeting** operation:
  - canPerform(role, "meeting", "edit") で認可判定
  - checkRateLimit でレート制限
  - `updateMeeting` usecase を呼び出す（`@/application/usecases/updateMeeting` から個別 import）
  - optional フィールドは undefined（変更なし）と null（クリア）を区別する（.nullable().optional()）
  - attendees は internalAttendees / externalAttendees のいずれかが指定された場合のみ変換する（Server Action と同一）
- [x] **record_contract_adjustment** operation:
  - canPerform(role, "interaction", "recordContractInteraction") で認可判定
  - `createContractAdjustment` usecase を呼び出す（`@/application/usecases/createContractAdjustment` から個別 import）
  - contractId, summary は必須。date, details は optional
- [x] **record_invoice_adjustment** operation:
  - canPerform(role, "interaction", "recordInvoiceInteraction") で認可判定
  - `createInvoiceAdjustment` usecase を呼び出す（`@/application/usecases/createInvoiceAdjustment` から個別 import）
  - invoiceId, summary は必須。date, details は optional
- [x] 全 operation の catch で `handleToolError(error)` を使用する
- [x] usecase の Result が `{ ok: false }` の場合は `toToolError(result.reason)` を返す
- [x] エラー変換で内部詳細を漏らさない: usecase の reason をそのまま返す（usecase 側でメッセージは制御されている）。予期しない例外は handleToolError で固定文言に

**Acceptance Criteria**:
- interactions ツールが 4 operation を持つ discriminated union スキーマを持つ
- 各 operation が対応する usecase を呼び出す
- organizationId は authInfo.extra からのみ取得される

## T-02: tasks ツールの実装

`src/app/api/mcp/tools/tasks.ts` を新規作成する。

- [x] `registerTasksTools(server: McpServer)` 関数をエクスポートする
- [x] `getAuthInfo` ヘルパーを定義する
- [x] `z.discriminatedUnion("operation", [...])` で 7 operation のスキーマを定義する
- [x] **list** operation:
  - canPerform(role, "actionItem", "list") で認可判定
  - `listActionItems` usecase を呼び出す（`@/application/usecases/listActionItems` から個別 import）
  - optional フィルタ: `done: boolean`, `assigneeId: string`
- [x] **create** operation:
  - canPerform(role, "actionItem", "create") で認可判定
  - checkRateLimit でレート制限
  - `createActionItem` usecase を呼び出す（`@/application/usecases/createActionItem` から個別 import）
  - description は必須。assigneeId, dueDate, interactionId, dealId, inquiryId は optional
- [x] **update** operation:
  - canPerform(role, "actionItem", "edit") で認可判定
  - checkRateLimit でレート制限
  - `updateActionItem` usecase を呼び出す（`@/application/usecases/updateActionItem` から個別 import）
  - id は必須。他フィールドは .nullable().optional() で undefined/null を区別する
  - dueDate は string → Date 変換が必要（undefined は変更なし、null はクリア）
- [x] **update_status** operation:
  - canPerform(role, "actionItem", "edit") で認可判定
  - checkRateLimit でレート制限
  - `updateActionItemStatus` usecase を呼び出す（`@/application/usecases/updateActionItemStatus` から個別 import）
  - id, status（"todo" | "in_progress" | "done"）は必須
- [x] **toggle** operation:
  - canPerform(role, "actionItem", "toggle") で認可判定
  - `toggleActionItemDone` usecase を呼び出す（`@/application/usecases/toggleActionItemDone` から個別 import）
  - id は必須
- [x] **delete** operation:
  - canPerform(role, "actionItem", "delete") で認可判定
  - checkRateLimit でレート制限
  - `deleteActionItem` usecase を呼び出す（`@/application/usecases/deleteActionItem` から個別 import）
  - id は必須
- [x] **search_link_targets** operation:
  - canPerform(role, "actionItem", "create") で認可判定（Server Action と同一）
  - checkRateLimit でレート制限（search 用リミット）
  - type（"deal" | "inquiry" | "meeting"）と query で分岐し、`searchDeals` / `searchInquiries` / `searchMeetings` を呼び出す
- [x] 全 operation の catch で `handleToolError(error)` を使用する

**Acceptance Criteria**:
- tasks ツールが 7 operation を持つ
- 各 operation が対応する usecase を呼び出す
- update operation で undefined と null が区別される

## T-03: watches ツールの実装

`src/app/api/mcp/tools/watches.ts` を新規作成する。

- [x] `registerWatchesTools(server: McpServer)` 関数をエクスポートする
- [x] `getAuthInfo` ヘルパーを定義する
- [x] `z.discriminatedUnion("operation", [...])` で 2 operation のスキーマを定義する
- [x] **watch** operation:
  - 認可チェックなし（Server Action と同一。全ロールが暗黙的に可能。テナント所有権は usecase 内で検証）
  - `watchDeal` usecase を呼び出す（`@/application/usecases/watchDeal` から個別 import）
  - dealId は必須
  - usecase に userId（authInfo.extra.userId）、dealId、organizationId を渡す
- [x] **unwatch** operation:
  - 認可チェックなし（同上）
  - `unwatchDeal` usecase を呼び出す（`@/application/usecases/unwatchDeal` から個別 import）
  - dealId は必須
- [x] 全 operation の catch で `handleToolError(error)` を使用する

**Acceptance Criteria**:
- watches ツールが 2 operation を持つ
- watch の重複時に usecase が返すエラーがそのままツール結果に反映される
- organizationId は authInfo.extra から取得される

## T-04: notifications ツールの実装

`src/app/api/mcp/tools/notifications.ts` を新規作成する。

- [x] `registerNotificationsTools(server: McpServer)` 関数をエクスポートする
- [x] `getAuthInfo` ヘルパーを定義する
- [x] `z.discriminatedUnion("operation", [...])` で 2 operation のスキーマを定義する
- [x] **list** operation:
  - 認可チェックなし（通知は全ロールが閲覧可能。自分の通知のみが返る設計）
  - `userRepository.findById` で authInfo の userId からユーザーレコードを取得し、`notificationsLastSeenAt` を得る（`@/infrastructure/repositories` の個別 import）
  - `getNotifications` usecase を呼び出す（`@/application/usecases/getNotifications` から個別 import）
  - userId, organizationId, notificationsLastSeenAt を渡す
  - 結果（notifications + unreadCount）をそのまま返す
- [x] **mark_as_read** operation:
  - 認可チェックなし（自分の既読状態のみ更新）
  - `markNotificationsAsRead` usecase を呼び出す（`@/application/usecases/markNotificationsAsRead` から個別 import）
  - userId, organizationId を渡す
- [x] 全 operation の catch で `handleToolError(error)` を使用する

**Acceptance Criteria**:
- notifications ツールが 2 operation を持つ
- list が authInfo の userId で `getNotifications` を呼ぶ（他ユーザーの通知は返らない）
- mark_as_read が成功結果を返す

## T-05: route.ts にツール登録を追加

`src/app/api/mcp/route.ts` の `createMcpServer()` 内に新ツールの登録を追加する。

- [x] `import { registerInteractionsTools } from "./tools/interactions"` を追加
- [x] `import { registerTasksTools } from "./tools/tasks"` を追加
- [x] `import { registerWatchesTools } from "./tools/watches"` を追加
- [x] `import { registerNotificationsTools } from "./tools/notifications"` を追加
- [x] `createMcpServer()` 内で 4 つの register 関数を呼び出す

**Acceptance Criteria**:
- `createMcpServer()` が 7 ツール（既存 3 + 新規 4）を登録する
- typecheck が通る

## T-06: 商談記録がタイムラインに現れることの実行検証テスト

`src/__tests__/mcp/mcpInteractions.dynamic.test.ts` を新規作成する。

- [x] `createMeeting` usecase を `mock.module` で個別ファイルモックする
- [x] `@/infrastructure/rateLimit` をモックする
- [x] interactions ツールの `create_meeting` operation を実際に実行する
- [x] `createMeeting` が呼ばれ、引数に `organizationId`, `actorId`, `kind: "meeting"`, `dealId` が含まれることを assert する
- [x] `createMeeting` のモックが `{ ok: true, meeting: ... }` を返すとき、recordAudit が `interaction.create` アクションで呼ばれることを usecase 実装から推論（usecase 内で recordAudit されるため、usecase が呼ばれること = 監査記録されること）
- [x] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「商談記録 → 案件タイムラインに現れることをテストで固定する」を満たす
- behavioral test（実行検証）である

## T-07: 関連先なしの接点記録が拒否されることの実行検証テスト

同ファイル `src/__tests__/mcp/mcpInteractions.dynamic.test.ts` に追加。

- [x] `createMeeting` のモックが `{ ok: false, reason: "案件または引合のいずれかの指定が必要です" }` を返すよう設定する
- [x] interactions ツールの `create_meeting` で dealId も inquiryId も指定せずに呼び出す
- [x] ツール結果が `isError: true` であることを assert する
- [x] `createMeeting` が呼ばれ、引数の dealId / inquiryId が両方 null/undefined であることを assert する

**Acceptance Criteria**:
- 受け入れ基準「関連先なしの接点記録が拒否されることをテストで固定する」を満たす

## T-08: タスクの CRUD・ステータス遷移の認可判定テスト

`src/__tests__/mcp/mcpTasks.dynamic.test.ts` を新規作成する。

- [x] `deleteActionItem` usecase を `mock.module` で個別ファイルモックする
- [x] `@/infrastructure/rateLimit` をモックする
- [x] **member ロールで delete を呼び、isError で拒否され usecase に到達しないことを assert する**（canPerform(member, actionItem, delete) = false）
- [x] **admin ロールで delete を呼び、usecase に到達することを assert する**
- [x] `createActionItem` usecase をモックし、**member ロールで create を呼び、usecase に到達することを assert する**（canPerform(member, actionItem, create) = true）
- [x] `updateActionItemStatus` usecase をモックし、status 遷移が usecase に到達することを assert する
- [x] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「タスクの CRUD・ステータス遷移が Server Action と同一の認可判定になることをテストで固定する」を満たす
- 権限外ロールの拒否と権限内ロールの到達の両方を検証する

## T-09: ウォッチ重複テスト

`src/__tests__/mcp/mcpWatches.dynamic.test.ts` を新規作成する。

- [x] `watchDeal` usecase を `mock.module` で個別ファイルモックする
- [x] 初回呼び出しで `{ ok: true, watch: ... }` を返す
- [x] 2 回目の呼び出しで `{ ok: false, reason: "..." }` を返すよう設定する（一意性制約違反をシミュレート）
- [x] ツール結果が `isError: true` であることを assert する
- [x] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「ウォッチ重複が既存の一意性どおり扱われることをテストで固定する」を満たす

## T-10: 通知一覧がトークンのユーザー本人の通知のみ返すことのテスト

`src/__tests__/mcp/mcpNotifications.dynamic.test.ts` を新規作成する。

- [x] `getNotifications` usecase を `mock.module` で個別ファイルモックする
- [x] `userRepository` から `findById` をモックし、notificationsLastSeenAt を含むユーザーレコードを返す
- [x] notifications ツールの `list` operation を authInfo.userId = "user-A" で実行する
- [x] `getNotifications` が呼ばれた際の引数 `userId` が "user-A" であることを assert する
- [x] `getNotifications` が呼ばれた際の引数 `organizationId` が authInfo の organizationId と一致することを assert する
- [x] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「通知一覧がトークンのユーザー本人の通知のみ返すことをテストで固定する」を満たす

## T-11: 書き込みの監査ログ記録とテナント分離のテスト

`src/__tests__/mcp/mcpActivityAuditTenant.dynamic.test.ts` を新規作成する。

- [x] **監査記録の実行検証**: tasks ツールの `create` operation を実行し、`createActionItem` usecase が `organizationId` と `actorId` を受け取って呼ばれることを assert する（usecase 内で recordAudit が呼ばれる = 監査記録される）
- [x] **テナント分離の実行検証**: 2 つの異なる organizationId を持つ authInfo で同一操作を呼び、usecase に渡される organizationId がそれぞれ正しいことを assert する
- [x] interactions の `create_meeting` でも同様に organizationId 伝播を検証する
- [x] watches の `watch` でも organizationId 伝播を検証する
- [x] `afterAll` でモックを復元する

**Acceptance Criteria**:
- 受け入れ基準「書き込みが監査ログに記録され、他テナントに触れられないことをテストで固定する」を満たす
- 全 4 ツールについてテナント分離が実行検証される

## T-12: typecheck・test green の確認

- [x] `bun run typecheck` が green であることを確認する
- [x] `bun test` が green であることを確認する（既存テスト無変更で green）
- [x] 新規テストファイルが全て pass することを確認する

**Acceptance Criteria**:
- 受け入れ基準「`typecheck && test` green」を満たす
