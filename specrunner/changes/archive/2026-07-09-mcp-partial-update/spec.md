# Spec: MCP update 系ツールの部分更新是正

## Requirements

### Requirement: 全多フィールド update は未指定フィールドを保持する

各 MCP update ツールの handler と対応 usecase は、省略されたフィールド（undefined）について既存値を保持し、既定値（false / null / 空配列）で上書きしてはならない（SHALL NOT）。全多フィールド update 対象: `deals.update` / `clients.update` / `clients.update_contact` / `inquiries.update` / `contracts.update` / `invoices.update` / `tasks.update` / `revenueTargets.update` / `approval_templates.update` / `approval_policies.update` / `interactions.update_meeting`。

#### Scenario: deals.update で title のみ更新すると他フィールドが保持される

**Given** 案件が description="既存説明", estimatedAmount=1000000 で存在する
**When** MCP `deals` ツールで `{ operation: "update", dealId: "<id>", title: "新しい名前" }` を呼ぶ
**Then** usecase に渡される description は undefined（変更なし）、estimatedAmount は undefined（変更なし）

#### Scenario: approval_policies.update で name のみ更新するとき他フィールドが保持される

**Given** 承認ポリシーが name="旧名", triggerAction="inquiry.convert", templateId="<tid>", description="旧説明" で存在する
**When** MCP `approval_policies` ツールで `{ operation: "update", policyId: "<id>", name: "新名" }` を呼ぶ
**Then** usecase に渡される triggerAction / templateId / description は undefined（変更なし）

#### Scenario: inquiries.update で title のみ更新すると description が保持される

**Given** 引合が title="旧件名", description="旧説明" で存在する
**When** MCP `inquiries` ツールで `{ operation: "update", inquiryId: "<id>", title: "新件名" }` を呼ぶ
**Then** usecase に渡される description は undefined（変更なし）

### Requirement: null 指定と undefined 省略を区別する

クリアが有効なフィールドでは、null を指定したときにそのフィールドをクリアし（SHALL）、省略（undefined）したときには既存値を保持しなければならない（SHALL）。

#### Scenario: deals.update で description: null を指定するとクリアされる

**Given** 案件が description="既存説明" で存在する
**When** MCP `deals` ツールで `{ operation: "update", dealId: "<id>", description: null }` を呼ぶ
**Then** usecase に渡される description は null（クリア）

#### Scenario: inquiries.update で description: null を指定するとクリアされる

**Given** 引合が description="既存説明" で存在する
**When** MCP `inquiries` ツールで `{ operation: "update", inquiryId: "<id>", description: null }` を呼ぶ
**Then** usecase に渡される description は null（クリア）

#### Scenario: approval_policies.update で description: null を指定するとクリアされる

**Given** ポリシーが description="旧説明" で存在する
**When** MCP `approval_policies` ツールで `{ operation: "update", policyId: "<id>", description: null }` を呼ぶ
**Then** usecase に渡される description は null（クリア）

### Requirement: interactions update_meeting の attendees は内部/外部を独立に部分更新する

`update_meeting` は `internalAttendees` と `externalAttendees` を独立した部分更新フィールドとして扱わなければならない（SHALL）。片方のみ指定したとき、指定しなかった側の既存参加者を保持する。両方指定したときは両方差し替える。両方省略したときは attendees を変更しない。

#### Scenario: internalAttendees のみ指定すると外部参加者が保持される

**Given** 商談に attendees=[{name:"内部A", isExternal:false}, {name:"外部B", isExternal:true}] が存在する
**When** MCP `interactions` ツールで `{ operation: "update_meeting", meetingId: "<id>", internalAttendees: ["内部C"] }` を呼ぶ
**Then** usecase に渡される internalAttendees は [{name:"内部C", isExternal:false, ...}]
**And** usecase に渡される externalAttendees は undefined（変更なし）
**And** usecase は既存の外部参加者 [{name:"外部B", isExternal:true}] を保持して attendees を構築する

#### Scenario: externalAttendees のみ指定すると内部参加者が保持される

**Given** 商談に attendees=[{name:"内部A", isExternal:false}, {name:"外部B", isExternal:true}] が存在する
**When** MCP `interactions` ツールで `{ operation: "update_meeting", meetingId: "<id>", externalAttendees: ["外部C"] }` を呼ぶ
**Then** usecase に渡される externalAttendees は [{name:"外部C", isExternal:true, ...}]
**And** usecase に渡される internalAttendees は undefined（変更なし）
**And** usecase は既存の内部参加者 [{name:"内部A", isExternal:false}] を保持して attendees を構築する

#### Scenario: 両方省略すると attendees は変更されない

**Given** 商談に attendees が存在する
**When** MCP `interactions` ツールで `{ operation: "update_meeting", meetingId: "<id>", summary: "新サマリ" }` を呼ぶ（attendees 関連フィールド省略）
**Then** usecase に渡される internalAttendees は undefined
**And** usecase に渡される externalAttendees は undefined
**And** attendees は変更されない

#### Scenario: internalAttendees: null を指定すると内部参加者がクリアされる

**Given** 商談に attendees=[{name:"内部A", isExternal:false}, {name:"外部B", isExternal:true}] が存在する
**When** MCP `interactions` ツールで `{ operation: "update_meeting", meetingId: "<id>", internalAttendees: null }` を呼ぶ
**Then** usecase は内部参加者を空にし、外部参加者 [{name:"外部B", isExternal:true}] を保持する

### Requirement: attendees フィールドの describe がセマンティクスを明記する

`update_meeting` の `internalAttendees` / `externalAttendees` フィールドの describe は、片方のみ指定時に反対側が保持されるセマンティクスを明記しなければならない（SHALL）。

#### Scenario: updateMeetingSchema の internalAttendees describe にセマンティクスが記載されている

**Given** `updateMeetingSchema` が定義されている
**When** `internalAttendees` フィールドの describe を確認する
**Then** 片方のみ指定時に反対側が保持される旨が記載されている

### Requirement: 既存テストと品質ゲートが green を維持する

本変更はデータ破壊の是正以外の挙動を変更してはならない（SHALL NOT）。既存の全テスト、`typecheck` / `lint` / `build` が green を維持し、`aozu check` exit 0 でアーキテクチャテストが green であること（SHALL）。

#### Scenario: 全品質ゲートが green

**Given** 本変更のすべてのコード修正が適用されている
**When** `bun test` / `bun run typecheck` / `bun run lint` / `bun run build` を実行する
**Then** すべて成功する
