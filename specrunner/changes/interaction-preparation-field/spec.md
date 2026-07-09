# Spec: 商談（interaction）に汎用「事前準備」フィールドを追加

## Requirements

### Requirement: create_meeting SHALL persist the preparation field

The system SHALL accept an optional `preparation` parameter (string or null) when creating a meeting via `createMeeting` usecase, and persist it to the `interactions` table. When `preparation` is not provided, the stored value SHALL be null.

#### Scenario: create_meeting with preparation specified

**Given** a valid deal exists
**When** `create_meeting` is called with `preparation: "顧客の課題を整理する"`
**Then** the created interaction record has `preparation = "顧客の課題を整理する"`

#### Scenario: create_meeting without preparation

**Given** a valid deal exists
**When** `create_meeting` is called without the `preparation` parameter
**Then** the created interaction record has `preparation = null`

### Requirement: update_meeting SHALL support partial update semantics for preparation

The system SHALL distinguish between `undefined` (field omitted — no change) and `null` (explicit clear) for the `preparation` field in `updateMeeting`. When `preparation` is omitted, the existing value SHALL be preserved. When `preparation` is set to `null`, the stored value SHALL be cleared to null.

#### Scenario: update_meeting omitting preparation preserves existing value

**Given** an interaction exists with `preparation = "事前に資料を準備"`
**When** `update_meeting` is called with only `summary: "議事録更新"` (preparation is not included)
**Then** the interaction's `preparation` remains `"事前に資料を準備"`

#### Scenario: update_meeting with preparation=null clears the value

**Given** an interaction exists with `preparation = "事前に資料を準備"`
**When** `update_meeting` is called with `preparation: null`
**Then** the interaction's `preparation` is cleared to `null`

#### Scenario: update_meeting with new preparation value replaces existing

**Given** an interaction exists with `preparation = "旧メモ"`
**When** `update_meeting` is called with `preparation: "新メモ"`
**Then** the interaction's `preparation` is updated to `"新メモ"`

### Requirement: MCP create_meeting and update_meeting SHALL advertise preparation in inputSchema

The MCP `interactions` tool SHALL include `preparation` in the advertised `inputSchema` for both `create_meeting` and `update_meeting` operations. The `preparation` field's description SHALL contain both「事前準備」and「Markdown」to communicate its purpose and supported format.

#### Scenario: tools/list includes preparation in create_meeting schema

**Given** the MCP server is running
**When** `tools/list` is called
**Then** the `interactions` tool's `inputSchema` includes a `preparation` property whose description contains「事前準備」and「Markdown」

#### Scenario: MCP create_meeting passes preparation to usecase

**Given** an authenticated MCP session
**When** `tools/call` is invoked with `operation: "create_meeting"` and `preparation: "準備メモ"`
**Then** the `createMeeting` usecase receives `preparation: "準備メモ"` (not undefined, not null)

#### Scenario: MCP update_meeting distinguishes undefined from null for preparation

**Given** an authenticated MCP session
**When** `tools/call` is invoked with `operation: "update_meeting"` and `preparation` is omitted
**Then** the `updateMeeting` usecase receives `preparation: undefined`

**Given** an authenticated MCP session
**When** `tools/call` is invoked with `operation: "update_meeting"` and `preparation: null`
**Then** the `updateMeeting` usecase receives `preparation: null`

### Requirement: Existing fields and invariants SHALL remain unchanged

The addition of `preparation` SHALL NOT alter the behavior of existing fields (`summary`, `details`, `attendees`, etc.), the `createMeeting` invariant (deal or inquiry required), authorization rules, audit logging, or interaction kind/entity structure.

#### Scenario: existing create_meeting without preparation behaves identically

**Given** a valid deal exists
**When** `create_meeting` is called with the same parameters as before (no `preparation`)
**Then** the result is identical to the pre-change behavior; `summary`, `details`, `attendees`, `actionItems` are persisted as before

#### Scenario: existing update_meeting partial update for other fields is unaffected

**Given** an interaction exists
**When** `update_meeting` is called with only `summary: "new summary"`
**Then** all other fields (location, attendees, details, preparation) retain their existing values
