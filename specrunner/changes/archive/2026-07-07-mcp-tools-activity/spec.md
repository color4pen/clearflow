# Spec: MCP ツール — 活動系（顧客接点・タスク・ウォッチ・通知）

## Requirements

### Requirement: interactions ツールは商談の記録・編集と調整記録をサポートする

interactions ツール SHALL `create_meeting` / `update_meeting` / `record_contract_adjustment` / `record_invoice_adjustment` の 4 operation を提供する。各 operation は対応する既存 usecase を呼び出す。

#### Scenario: 商談記録が案件タイムラインに現れる

**Given** 有効なトークン（admin ロール）で MCP ツールを呼び出す
**When** interactions ツールに `operation: "create_meeting"`, `dealId`, `type: "hearing"`, `date` を指定して呼び出す
**Then** `createMeeting` usecase が呼ばれ、`recordAudit` で `interaction.create` アクションが記録される

#### Scenario: 関連先なしの商談記録が拒否される

**Given** 有効なトークンで MCP ツールを呼び出す
**When** interactions ツールに `operation: "create_meeting"` で `dealId` も `inquiryId` も指定しない
**Then** usecase が `{ ok: false }` を返し、ツール結果が `isError: true` になる

#### Scenario: 契約調整の記録

**Given** 有効なトークン（recordContractInteraction 権限あり）で MCP ツールを呼び出す
**When** interactions ツールに `operation: "record_contract_adjustment"`, `contractId`, `summary` を指定して呼び出す
**Then** `createContractAdjustment` usecase が呼ばれ、成功結果が返る

#### Scenario: 請求調整の記録

**Given** 有効なトークン（recordInvoiceInteraction 権限あり）で MCP ツールを呼び出す
**When** interactions ツールに `operation: "record_invoice_adjustment"`, `invoiceId`, `summary` を指定して呼び出す
**Then** `createInvoiceAdjustment` usecase が呼ばれ、成功結果が返る

### Requirement: interactions ツールの update_meeting は部分更新をサポートする

update_meeting SHALL 省略フィールドを「変更なし」として扱い、既存値を破壊しない。`null` は「クリア」を意味する。

#### Scenario: summary のみ更新する

**Given** 既存の商談が存在する
**When** `operation: "update_meeting"` で `summary` のみ指定する
**Then** summary だけが更新され、他のフィールド（meetingType, date, location 等）は変更されない

### Requirement: tasks ツールは CRUD・ステータス遷移・検索をサポートする

tasks ツール SHALL `list` / `create` / `update` / `update_status` / `toggle` / `delete` / `search_link_targets` の 7 operation を提供する。

#### Scenario: タスクの作成

**Given** 有効なトークン（actionItem.create 権限あり）で MCP ツールを呼び出す
**When** tasks ツールに `operation: "create"`, `description` を指定して呼び出す
**Then** `createActionItem` usecase が呼ばれ、新しいアクションアイテムが返る

#### Scenario: タスクのステータス遷移

**Given** 有効なトークン（actionItem.edit 権限あり）で MCP ツールを呼び出す
**When** tasks ツールに `operation: "update_status"`, `id`, `status: "in_progress"` を指定して呼び出す
**Then** `updateActionItemStatus` usecase が呼ばれ、ステータスが更新される

#### Scenario: タスクの認可判定が Server Action と同一

**Given** member ロールのトークンで MCP ツールを呼び出す
**When** tasks ツールに `operation: "delete"` を指定する
**Then** `canPerform(role, "actionItem", "delete")` が false（delete は admin/manager のみ）のため、isError で拒否され usecase に到達しない

#### Scenario: リンク先候補検索

**Given** 有効なトークンで MCP ツールを呼び出す
**When** tasks ツールに `operation: "search_link_targets"`, `type: "deal"`, `query: "テスト"` を指定する
**Then** `searchDeals` usecase が呼ばれ、検索結果が返る

### Requirement: watches ツールは案件のウォッチ・解除をサポートする

watches ツール SHALL `watch` / `unwatch` の 2 operation を提供する。

#### Scenario: ウォッチの登録

**Given** 有効なトークンで MCP ツールを呼び出す
**When** watches ツールに `operation: "watch"`, `dealId` を指定する
**Then** `watchDeal` usecase が呼ばれ、Watch レコードが返る

#### Scenario: ウォッチの重複が既存の一意性制約どおり扱われる

**Given** ユーザーが既に対象案件をウォッチ済み
**When** 同じ `dealId` で再度 `watch` を呼ぶ
**Then** usecase が一意性制約違反を返し、ツール結果が `isError: true` になる

#### Scenario: ウォッチの解除

**Given** 有効なトークンでウォッチ中の案件がある
**When** watches ツールに `operation: "unwatch"`, `dealId` を指定する
**Then** `unwatchDeal` usecase が呼ばれ、成功結果が返る

### Requirement: notifications ツールは未読通知の一覧と既読化をサポートする

notifications ツール SHALL `list` / `mark_as_read` の 2 operation を提供する。

#### Scenario: 通知一覧がトークンのユーザー本人の通知のみ返す

**Given** authInfo の userId が "user-A" である
**When** notifications ツールに `operation: "list"` を指定する
**Then** `getNotifications` が userId="user-A" で呼ばれ、user-A のウォッチ対象の通知のみが返る

#### Scenario: 既読化

**Given** 有効なトークンで MCP ツールを呼び出す
**When** notifications ツールに `operation: "mark_as_read"` を指定する
**Then** `markNotificationsAsRead` が呼ばれ、成功結果が返る

### Requirement: 全ツールの書き込みが監査ログに記録される

書き込み操作（create_meeting / update_meeting / record_*_adjustment / create / update / update_status / toggle / delete）は既存 usecase 内の `recordAudit` を通じて監査ログに記録される MUST。MCP ツールレイヤーに監査ロジックを追加しない。

#### Scenario: タスク作成の監査記録

**Given** MCP ツール経由でタスクを作成する
**When** `createActionItem` usecase が成功する
**Then** `recordAudit` が `action_item.create` アクションで呼ばれる

### Requirement: 全ツールがテナント分離を保証する

organizationId は authInfo.extra からのみ取得し、ツール引数から受け取らない MUST。全 usecase 呼び出しにこの organizationId を渡す。

#### Scenario: organizationId がツール引数に含まれない

**Given** ツールの Zod スキーマを確認する
**When** 入力スキーマを検査する
**Then** organizationId フィールドが存在しない

### Requirement: 権限外ロールでのツール実行が拒否される

canPerform による認可判定 SHALL ハンドラ経路で実行され、権限外ロールは usecase に到達せず isError で拒否される。

#### Scenario: member ロールが actionItem.delete を拒否される

**Given** member ロールのトークン
**When** tasks ツールで `operation: "delete"` を呼ぶ
**Then** `isError: true` で拒否され、deleteActionItem usecase は呼ばれない

#### Scenario: member ロールが interaction.recordInvoiceInteraction を拒否される

**Given** member ロールのトークン
**When** interactions ツールで `operation: "record_invoice_adjustment"` を呼ぶ
**Then** `isError: true` で拒否され、createInvoiceAdjustment usecase は呼ばれない

### Requirement: エラー変換で内部詳細を漏らさない

usecase が返す例外メッセージ（DB エラー文等）はクライアントに素通ししない MUST。`handleToolError` で固定文言に変換する。

#### Scenario: usecase 例外がマスクされる

**Given** usecase が DB 例外をスローする
**When** ツールハンドラがそれを catch する
**Then** クライアントには「内部エラーが発生しました」が返り、DB エラー詳細は含まれない
