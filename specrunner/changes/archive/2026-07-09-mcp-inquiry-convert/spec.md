# Spec: MCP 引合「案件化」専用オペレーション

## Requirements

### Requirement: usecase は即時案件化時に生成された Deal を Result に含める

`updateInquiryStatus` の成功 Result SHALL include a `deal` field of type `Deal` when a Deal is immediately created (no approval policy matched). When an approval policy matches and a pending approval request is created, the `deal` field SHALL be undefined.

#### Scenario: ポリシー非該当で即時案件化した場合に Deal が返る

**Given** 引合が `new` ステータスで `clientId` が設定されている
**When** `updateInquiryStatus` を `newStatus: "converted"` で呼び出し、承認ポリシーに合致しない
**Then** Result は `{ ok: true, inquiry: <converted>, deal: <created Deal> }` を返す

#### Scenario: ポリシー該当で承認ゲートが発動した場合に Deal は返らない

**Given** 引合が `new` ステータスで `clientId` が設定されており、合致する承認ポリシーが存在する
**When** `updateInquiryStatus` を `newStatus: "converted"` で呼び出す
**Then** Result は `{ ok: true, inquiry: <original>, pendingApproval: { requestId } }` を返し、`deal` は undefined

### Requirement: MCP inquiries ツールに convert オペレーションが存在する

The inquiries MCP tool SHALL expose a `convert` operation that accepts `{ operation: "convert", inquiryId: string }` as input. The `convert` operation SHALL invoke the existing `updateInquiryStatus` usecase with `newStatus: "converted"`.

#### Scenario: convert オペレーションで即時案件化し Deal を含む結果を返す

**Given** 認証済みの admin ユーザーが MCP 経由で接続している
**When** `inquiries` ツールを `{ operation: "convert", inquiryId: "<valid UUID>" }` で呼び出し、usecase が Deal を即時生成する
**Then** ツール結果に `inquiry`, `deal` (id 等を含む), `message` (案件生成を示す文言) が含まれる

#### Scenario: convert オペレーションで承認ゲートが発動した場合

**Given** 認証済みの admin ユーザーが MCP 経由で接続している
**When** `inquiries` ツールを `{ operation: "convert", inquiryId: "<valid UUID>" }` で呼び出し、usecase が承認リクエストを生成する
**Then** ツール結果に `inquiry`, `pendingApproval`, `message` (承認待ちを示す文言) が含まれ、`deal` は含まれない

### Requirement: convert は clientId 未設定の引合を拒否する

The `convert` operation SHALL reject an inquiry whose `clientId` is null, consistent with the `inv-inquiry-convert-requires-client` invariant. The error MUST NOT expose internal details.

#### Scenario: clientId 未設定の引合に対する convert の拒否

**Given** 引合の `clientId` が null である
**When** `inquiries` ツールを `{ operation: "convert", inquiryId: "<id>" }` で呼び出す
**Then** ツール結果は `isError: true` で「顧客の登録が必要」を示すメッセージを返す

### Requirement: convert の認可は inquiry:convert と同一である

The `convert` operation SHALL check `canPerform(role, "inquiry", "convert")` before invoking the usecase. Only `admin` and `manager` roles are permitted.

#### Scenario: member ロールによる convert の拒否

**Given** 認証済みの member ロールのユーザーが MCP 経由で接続している
**When** `inquiries` ツールを `{ operation: "convert", inquiryId: "<id>" }` で呼び出す
**Then** ツール結果は `isError: true` で「権限がありません」を返す

#### Scenario: admin ロールによる convert の許可

**Given** 認証済みの admin ロールのユーザーが MCP 経由で接続している
**When** `inquiries` ツールを `{ operation: "convert", inquiryId: "<id>" }` で呼び出す
**Then** 認可チェックを通過し usecase が呼び出される

### Requirement: convert にレート制限が適用される

The `convert` operation SHALL apply rate limiting with the same key prefix (`mcp:updateInquiryStatus:`) and limits as `update_status: converted`, so that the two operations share a single rate-limit bucket.

#### Scenario: レート制限超過時の拒否

**Given** レート制限のバケットが上限に達している
**When** `inquiries` ツールを `{ operation: "convert" }` で呼び出す
**Then** ツール結果は `isError: true` で「レート制限超過」を返す

### Requirement: update_status converted は後方互換で動作する

The `update_status` operation with `newStatus: "converted"` SHALL continue to function identically to the existing behavior. Additionally, when the usecase Result includes a `deal` field, the `update_status` response SHALL include it.

#### Scenario: update_status converted が従来どおり動作する

**Given** 認証済みの admin ユーザーが MCP 経由で接続している
**When** `inquiries` ツールを `{ operation: "update_status", inquiryId: "<id>", newStatus: "converted" }` で呼び出す
**Then** usecase が呼び出され、結果が返される（従来の動作を維持）

#### Scenario: update_status converted のレスポンスに Deal が含まれる

**Given** usecase が即時案件化で Deal を生成した
**When** `update_status: converted` の結果を MCP が整形する
**Then** レスポンスに `deal` フィールドが含まれる

### Requirement: convert オペレーションが tools/list のスキーマ広告に含まれる

The `convert` operation SHALL appear in the `operation` enum of the advertised inputSchema when `tools/list` is called, alongside existing operations. The `inquiryId` field SHALL have a type and description visible in the advertised schema.

#### Scenario: tools/list で convert が広告される

**Given** MCP サーバーが起動している
**When** `tools/list` リクエストを送信する
**Then** `inquiries` ツールの inputSchema の `operation` enum に `"convert"` が含まれる

### Requirement: description は convert の挙動を明記し update_status に推奨注記を含む

The tool-level description SHALL list `convert` in the operation enumeration. The `convert` operation's `newStatus` description or the `convert` schema description SHALL explain that it converts an inquiry to a deal and that an approval policy may defer deal creation. The `update_status` schema's `newStatus` description SHALL note that `converted` also performs conversion but `convert` is recommended.

#### Scenario: convert の description に案件化と承認ポリシーの説明が含まれる

**Given** MCP サーバーが起動している
**When** `tools/list` で `inquiries` ツールの情報を取得する
**Then** ツール description に `convert` が含まれ、operation 一覧として認識可能である

### Requirement: 監査ログは usecase 内で記録される（MCP ハンドラ追加不要）

The `convert` operation SHALL NOT add separate audit recording in the MCP handler. Audit logging is performed within the `updateInquiryStatus` usecase, ensuring parity with Server Action and `update_status` operation.

#### Scenario: convert 経由の案件化で監査ログが記録される

**Given** `convert` オペレーションが usecase を呼び出す
**When** 即時案件化が成功する
**Then** usecase 内で `inquiry.updateStatus` の監査ログが `dealId` を metadata に含めて記録される（MCP ハンドラ側では監査ログを記録しない）
