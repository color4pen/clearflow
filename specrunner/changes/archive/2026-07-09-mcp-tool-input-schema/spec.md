# Spec: MCP ツールの inputSchema をクライアントに正しく広告する

## Requirements

### Requirement: 全ツールの広告 inputSchema が operation enum を含む

Each of the 19 registered MCP tools SHALL advertise a non-empty `inputSchema` via `tools/list`. The `inputSchema.properties` MUST include an `operation` property whose `enum` array enumerates all valid operation values for that tool. The `inputSchema.type` MUST be `"object"`.

#### Scenario: 全 19 ツールの inputSchema.properties が空でない

**Given** MCP サーバーに全 19 ツールが登録されている
**When** `tools/list` リクエストを送信する
**Then** 返却された全ツールの `inputSchema.properties` は空オブジェクト `{}` ではなく、少なくとも `operation` キーを含む

#### Scenario: operation プロパティが enum を持つ

**Given** MCP サーバーに全 19 ツールが登録されている
**When** `tools/list` リクエストで各ツールの `inputSchema` を取得する
**Then** 各ツールの `inputSchema.properties.operation` は `enum` 配列を持ち、そのツールの全 operation 値を含む

### Requirement: inquiries ツールの budget が integer 型として広告される

The `inquiries` tool's advertised `inputSchema` SHALL expose the `budget` field as JSON Schema type `"integer"`. The `source` field MUST include an `enum` array listing all valid source values.

#### Scenario: budget が integer 型で広告される

**Given** MCP サーバーに `inquiries` ツールが登録されている
**When** `tools/list` で `inquiries` の `inputSchema` を取得する
**Then** `inputSchema.properties.budget` の `type` は `"integer"` である

#### Scenario: source が enum で広告される

**Given** MCP サーバーに `inquiries` ツールが登録されている
**When** `tools/list` で `inquiries` の `inputSchema` を取得する
**Then** `inputSchema.properties.source` は `enum` 配列を持ち、`["web", "phone", "email", "referral", "agent_service", "exhibition", "other"]` を含む

### Requirement: 不正引数が従来どおり拒否される

The handler SHALL validate incoming arguments against the per-operation schema via explicit `safeParse` before dispatching to a usecase. Invalid arguments (missing required fields, type mismatches) MUST be rejected with a field-level error message and MUST NOT reach the usecase layer.

#### Scenario: create で title 欠落時にエラーを返す

**Given** MCP サーバーに `inquiries` ツールが登録されている
**When** `operation: "create"` で `title` を省略した引数でツールを呼び出す
**Then** ツール結果は `isError: true` であり、usecase（`createInquiry`）は呼び出されない

#### Scenario: budget に文字列を渡した場合にエラーを返す

**Given** MCP サーバーに `inquiries` ツールが登録されている
**When** `operation: "create"` で `budget: "高い"` を含む引数でツールを呼び出す
**Then** ツール結果は `isError: true` であり、usecase（`createInquiry`）は呼び出されない

### Requirement: 既存の振る舞いが不変である

Authorization (`canPerform`), rate limiting (`checkRateLimit`), audit recording, usecase delegation, return value format, and error messages SHALL remain identical to the pre-change behavior. A valid tool call MUST produce the same result as before the change.

#### Scenario: 正常な create 呼び出しが従来と同じ結果を返す

**Given** MCP サーバーに `inquiries` ツールが登録されている
**When** `operation: "create"` で全必須フィールドを含む正しい引数でツールを呼び出す
**Then** usecase（`createInquiry`）が正しい引数で呼び出され、ツール結果は `isError: false` である
