# Test Cases: MCP update 系ツールの部分更新是正

## Summary

- **Total**: 40 cases
- **Automated** (unit/integration): 39
- **Manual**: 1
- **Priority**: must: 23, should: 17, could: 0

---

## 多フィールド update の未指定フィールド保持

### TC-001: deals.update で title のみ更新すると他フィールドが保持される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全多フィールド update は未指定フィールドを保持する > Scenario: deals.update で title のみ更新すると他フィールドが保持される

---

### TC-002: approval_policies.update で name のみ更新するとき他フィールドが保持される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全多フィールド update は未指定フィールドを保持する > Scenario: approval_policies.update で name のみ更新するとき他フィールドが保持される

---

### TC-003: inquiries.update で title のみ更新すると description が保持される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全多フィールド update は未指定フィールドを保持する > Scenario: inquiries.update で title のみ更新すると description が保持される

---

### TC-004: deals.update で description: null を指定するとクリアされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: null 指定と undefined 省略を区別する > Scenario: deals.update で description: null を指定するとクリアされる

---

### TC-005: inquiries.update で description: null を指定するとクリアされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: null 指定と undefined 省略を区別する > Scenario: inquiries.update で description: null を指定するとクリアされる

---

### TC-006: approval_policies.update で description: null を指定するとクリアされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: null 指定と undefined 省略を区別する > Scenario: approval_policies.update で description: null を指定するとクリアされる

---

### TC-007: internalAttendees のみ指定すると外部参加者が保持される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: interactions update_meeting の attendees は内部/外部を独立に部分更新する > Scenario: internalAttendees のみ指定すると外部参加者が保持される

---

### TC-008: externalAttendees のみ指定すると内部参加者が保持される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: interactions update_meeting の attendees は内部/外部を独立に部分更新する > Scenario: externalAttendees のみ指定すると内部参加者が保持される

---

### TC-009: 両方省略すると attendees は変更されない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: interactions update_meeting の attendees は内部/外部を独立に部分更新する > Scenario: 両方省略すると attendees は変更されない

---

### TC-010: internalAttendees: null を指定すると内部参加者がクリアされる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: interactions update_meeting の attendees は内部/外部を独立に部分更新する > Scenario: internalAttendees: null を指定すると内部参加者がクリアされる

---

### TC-011: updateMeetingSchema の internalAttendees describe にセマンティクスが記載されている

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: attendees フィールドの describe がセマンティクスを明記する > Scenario: updateMeetingSchema の internalAttendees describe にセマンティクスが記載されている

---

### TC-012: 全品質ゲートが green

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 既存テストと品質ゲートが green を維持する > Scenario: 全品質ゲートが green

---

## 全多フィールド update 操作の横断 behavioral テスト（T-04）

### TC-013: clients.update で name のみ指定すると他フィールドが undefined で渡る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: handler → usecase 境界の部分更新 behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateClient` usecase が mock されている
**WHEN** MCP `clients` ツールで `{ operation: "update", clientId: "<id>", name: "新名" }` を呼ぶ
**THEN** usecase に渡される industry / size / segment / description / assigneeId 等が undefined

---

### TC-014: clients.update_contact で name のみ指定すると他フィールドが undefined で渡る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: handler → usecase 境界の部分更新 behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateContact` usecase が mock されている
**WHEN** MCP `clients` ツールで `{ operation: "update_contact", contactId: "<id>", name: "新名" }` を呼ぶ
**THEN** usecase に渡される department / position / email / phone / isPrimary が undefined

---

### TC-015: contracts.update で title のみ指定すると他フィールドが undefined で渡る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: handler → usecase 境界の部分更新 behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateContract` usecase が mock されている
**WHEN** MCP `contracts` ツールで `{ operation: "update", contractId: "<id>", title: "新タイトル" }` を呼ぶ
**THEN** usecase に渡される contractType / amount / startDate / endDate / notes が undefined

---

### TC-016: invoices.update で title のみ指定すると他フィールドが undefined で渡る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: handler → usecase 境界の部分更新 behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateInvoice` usecase が mock されている
**WHEN** MCP `invoices` ツールで `{ operation: "update", invoiceId: "<id>", title: "新タイトル" }` を呼ぶ
**THEN** usecase に渡される amount / issueDate / dueDate / notes が undefined

---

### TC-017: tasks.update で description のみ指定すると他フィールドが undefined で渡る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: handler → usecase 境界の部分更新 behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateTask` usecase が mock されている
**WHEN** MCP `tasks` ツールで `{ operation: "update", taskId: "<id>", description: "新説明" }` を呼ぶ
**THEN** usecase に渡される assigneeId / dueDate / interactionId / status 等が undefined

---

### TC-018: revenueTargets.update で targetAmount のみ指定すると他フィールドが undefined で渡る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: handler → usecase 境界の部分更新 behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateRevenueTarget` usecase が mock されている
**WHEN** MCP `revenueTargets` ツールで `{ operation: "update", targetId: "<id>", targetAmount: 5000000 }` を呼ぶ
**THEN** usecase に渡される periodStart / periodEnd が undefined

---

### TC-019: approval_templates.update で name のみ指定すると他フィールドが undefined で渡る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: handler → usecase 境界の部分更新 behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateTemplate` usecase が mock されている
**WHEN** MCP `approval_templates` ツールで `{ operation: "update", templateId: "<id>", name: "新名" }` を呼ぶ
**THEN** usecase に渡される steps / fields が undefined

---

## null クリアの横断 behavioral テスト（T-05）

### TC-020: clients.update で industry: null を指定すると null が usecase に渡る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05: null クリアの behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateClient` usecase が mock されている
**WHEN** MCP `clients` ツールで `{ operation: "update", clientId: "<id>", industry: null }` を呼ぶ
**THEN** usecase に渡される industry は null（undefined ではない）

---

### TC-021: clients.update_contact で department: null を指定すると null が usecase に渡る

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05: null クリアの behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateContact` usecase が mock されている
**WHEN** MCP `clients` ツールで `{ operation: "update_contact", contactId: "<id>", department: null }` を呼ぶ
**THEN** usecase に渡される department は null（undefined ではない）

---

### TC-022: contracts.update で endDate: null を指定すると null が usecase に渡る

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05: null クリアの behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateContract` usecase が mock されている
**WHEN** MCP `contracts` ツールで `{ operation: "update", contractId: "<id>", endDate: null }` を呼ぶ
**THEN** usecase に渡される endDate は null（undefined ではない）

---

### TC-023: invoices.update で issueDate: null を指定すると null が usecase に渡る

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05: null クリアの behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateInvoice` usecase が mock されている
**WHEN** MCP `invoices` ツールで `{ operation: "update", invoiceId: "<id>", issueDate: null }` を呼ぶ
**THEN** usecase に渡される issueDate は null（undefined ではない）

---

### TC-024: tasks.update で assigneeId: null を指定すると null が usecase に渡る

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05: null クリアの behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateTask` usecase が mock されている
**WHEN** MCP `tasks` ツールで `{ operation: "update", taskId: "<id>", assigneeId: null }` を呼ぶ
**THEN** usecase に渡される assigneeId は null（undefined ではない）

---

### TC-025: interactions.update_meeting で location: null を指定すると null が usecase に渡る

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05: null クリアの behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateMeeting` usecase が mock されている
**WHEN** MCP `interactions` ツールで `{ operation: "update_meeting", meetingId: "<id>", location: null }` を呼ぶ
**THEN** usecase に渡される location は null（undefined ではない）

---

## interactions attendees 部分更新の追加ケース（T-06）

### TC-026: internalAttendees と externalAttendees の両方を指定すると両方が差し替えられる

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06: interactions attendees 部分更新の behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateMeeting` usecase が mock されている
**WHEN** MCP `interactions` ツールで `{ operation: "update_meeting", meetingId: "<id>", internalAttendees: ["内部C"], externalAttendees: ["外部D"] }` を呼ぶ
**THEN** usecase に渡される internalAttendees に「内部C」を含む配列が渡る
**AND** usecase に渡される externalAttendees に「外部D」を含む配列が渡る

---

### TC-027: externalAttendees: null を指定すると外部参加者がクリアされ内部が保持される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06: interactions attendees 部分更新の behavioral テスト

**GIVEN** 実 MCP transport が起動し `updateMeeting` usecase が mock されている
**WHEN** MCP `interactions` ツールで `{ operation: "update_meeting", meetingId: "<id>", externalAttendees: null }` を呼ぶ
**THEN** usecase に渡される externalAttendees は [] (空配列 / クリア扱い)
**AND** usecase に渡される internalAttendees は undefined（内部側は保持）

---

### TC-028: usecase が internalAttendees のみ受け取ったとき既存外部 + 新規内部で attendees を構築する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06: interactions attendees 部分更新の behavioral テスト

**GIVEN** repository の `findById` が attendees=[{name:"内部A", isExternal:false}, {name:"外部B", isExternal:true}] を返す
**WHEN** `updateMeeting` usecase に `{ meetingId, internalAttendees: [{name:"内部C", isExternal:false}] }` を渡す
**THEN** repository の `update` に渡される attendees が [{name:"内部C", isExternal:false}, {name:"外部B", isExternal:true}] （既存外部 + 新規内部）

---

### TC-029: usecase が externalAttendees のみ受け取ったとき既存内部 + 新規外部で attendees を構築する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06: interactions attendees 部分更新の behavioral テスト

**GIVEN** repository の `findById` が attendees=[{name:"内部A", isExternal:false}, {name:"外部B", isExternal:true}] を返す
**WHEN** `updateMeeting` usecase に `{ meetingId, externalAttendees: [{name:"外部C", isExternal:true}] }` を渡す
**THEN** repository の `update` に渡される attendees が [{name:"内部A", isExternal:false}, {name:"外部C", isExternal:true}] （既存内部 + 新規外部）

---

### TC-030: usecase が internalAttendees と externalAttendees の両方を受け取ったとき全差し替えする

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06: interactions attendees 部分更新の behavioral テスト

**GIVEN** repository の `findById` が attendees=[{name:"内部A", isExternal:false}, {name:"外部B", isExternal:true}] を返す
**WHEN** `updateMeeting` usecase に `{ meetingId, internalAttendees: [{name:"内部C", isExternal:false}], externalAttendees: [{name:"外部D", isExternal:true}] }` を渡す
**THEN** repository の `update` に渡される attendees が [{name:"内部C", isExternal:false}, {name:"外部D", isExternal:true}] （旧参加者は含まれない）

---

### TC-031: usecase が internalAttendees: [] を受け取ったとき内部側をクリアし外部を保持する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06: interactions attendees 部分更新の behavioral テスト

**GIVEN** repository の `findById` が attendees=[{name:"内部A", isExternal:false}, {name:"外部B", isExternal:true}] を返す
**WHEN** `updateMeeting` usecase に `{ meetingId, internalAttendees: [] }` を渡す
**THEN** repository の `update` に渡される attendees が [{name:"外部B", isExternal:true}] のみ（内部側がクリア）

---

## approvalPolicies PATCH 化の usecase 単体テスト（T-07）

### TC-032: updatePolicy usecase で name のみ指定すると repository に name のみ渡される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07: approvalPolicies PATCH 化の usecase 単体テスト

**GIVEN** repository の `findById` が既存ポリシーを返し `updateById` が mock されている
**WHEN** `updatePolicy` usecase に `{ policyId: "<id>", name: "新名" }` を渡す（他フィールド省略）
**THEN** repository の `updateById` に渡されるオブジェクトに `{ name: "新名" }` が含まれ、triggerAction / templateId / description 等のキーが含まれない

---

### TC-033: updatePolicy usecase で description: null を指定すると repository に description: null が渡される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07: approvalPolicies PATCH 化の usecase 単体テスト

**GIVEN** repository の `findById` が既存ポリシーを返し `updateById` が mock されている
**WHEN** `updatePolicy` usecase に `{ policyId: "<id>", description: null }` を渡す
**THEN** repository の `updateById` に渡されるオブジェクトに `{ description: null }` が含まれる

---

### TC-034: updatePolicy usecase で description を省略すると repository に description キーが含まれない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07: approvalPolicies PATCH 化の usecase 単体テスト

**GIVEN** repository の `findById` が既存ポリシーを返し `updateById` が mock されている
**WHEN** `updatePolicy` usecase に `{ policyId: "<id>", name: "新名" }` を渡す（description 省略）
**THEN** repository の `updateById` に渡されるオブジェクトに `description` キーが存在しない（undefined もキーとして含まれない）

---

### TC-035: updatePolicy usecase で templateId を指定したときテンプレート存在確認が実行される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07: approvalPolicies PATCH 化の usecase 単体テスト

**GIVEN** repository の `findById` が既存ポリシーを返し、`templateRepository.findById` が mock されている
**WHEN** `updatePolicy` usecase に `{ policyId: "<id>", templateId: "<tid>" }` を渡す
**THEN** `templateRepository.findById` が `"<tid>"` で呼ばれる

---

### TC-036: updatePolicy usecase で templateId を省略したときテンプレート存在確認がスキップされる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07: approvalPolicies PATCH 化の usecase 単体テスト

**GIVEN** repository の `findById` が既存ポリシーを返し、`templateRepository.findById` が mock されている
**WHEN** `updatePolicy` usecase に `{ policyId: "<id>", name: "新名" }` を渡す（templateId 省略）
**THEN** `templateRepository.findById` は呼ばれない

---

## design.md 由来の追加ケース

### TC-037: attendees と internalAttendees/externalAttendees を同時指定した場合、後者を優先する

**Category**: integration
**Priority**: should
**Source**: design.md > D1: attendees は内部/外部を独立した部分更新フィールドとして usecase に渡す

**GIVEN** 実 MCP transport が起動し `updateMeeting` usecase が mock されている
**WHEN** MCP `interactions` ツールで `{ operation: "update_meeting", meetingId: "<id>", internalAttendees: ["内部C"], attendees: [{ name: "全置換A", isExternal: false }] }` を呼ぶ
**THEN** usecase に渡されるのは internalAttendees フィールド（attendees 全置換ではない）

---

### TC-038: approval_policies.update で conditionField を省略したとき conditionOperator/conditionValue は不要

**Category**: integration
**Priority**: should
**Source**: design.md > D2: approvalPolicies update を PATCH セマンティクスに変換する

**GIVEN** 実 MCP transport が起動している
**WHEN** MCP `approval_policies` ツールで `{ operation: "update", policyId: "<id>", name: "新名" }` を呼ぶ（conditionField / conditionOperator / conditionValue すべて省略）
**THEN** バリデーションエラーが発生せず正常に usecase が呼ばれる

---

### TC-039: approval_policies.update で conditionField を明示指定したとき conditionOperator/conditionValue が必須

**Category**: integration
**Priority**: should
**Source**: design.md > D2: approvalPolicies update を PATCH セマンティクスに変換する

**GIVEN** 実 MCP transport が起動している
**WHEN** MCP `approval_policies` ツールで `{ operation: "update", policyId: "<id>", conditionField: "amount" }` を呼ぶ（conditionField のみ指定、conditionOperator / conditionValue を省略）
**THEN** バリデーションエラーが発生する（conditionOperator または conditionValue が必須）

---

### TC-040: Server Action から attendees を全置換指定した場合に引き続き動作する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-01: interactions update_meeting attendees の部分更新修正

**GIVEN** `updateMeeting` usecase が `attendees` フィールドを受け付ける
**WHEN** Server Action から `{ meetingId: "<id>", attendees: [{ name: "全置換A", isExternal: false }] }` を渡す（internalAttendees / externalAttendees は指定しない）
**THEN** repository の `update` に渡される attendees が [{ name: "全置換A", isExternal: false }] となる（全置換が正常に動作する）

---

## Result

```yaml
result: completed
total: 40
automated: 39
manual: 1
must: 23
should: 17
could: 0
blocked_reasons: []
```
