# Spec: 削除機能とフォーム整備

## Requirements

### Requirement: The system shall prevent deletion of an inquiry that has a linked deal

The system SHALL check for the existence of a deal linked to the inquiry before deletion. If a deal exists, the system MUST return an error and not delete the inquiry.

#### Scenario: Inquiry with a linked deal cannot be deleted

**Given** an inquiry with id "I-1" exists and a deal with inquiryId "I-1" exists
**When** the user calls deleteInquiry with id "I-1"
**Then** the system returns `{ ok: false, reason: "案件が紐づいている引き合いは削除できません" }` and the inquiry is not deleted

#### Scenario: Inquiry without a linked deal is deleted

**Given** an inquiry with id "I-2" exists and no deal has inquiryId "I-2"
**When** the user calls deleteInquiry with id "I-2"
**Then** the inquiry is deleted and an audit log with action "inquiry.delete" is recorded

---

### Requirement: The system shall prevent deletion of a deal that has linked meetings or contracts

The system SHALL check for the existence of meetings and contracts linked to the deal. If either exists, the system MUST return an error and not delete the deal.

#### Scenario: Deal with meetings cannot be deleted

**Given** a deal with id "D-1" exists and at least one meeting is linked to "D-1"
**When** the user calls deleteDeal with id "D-1"
**Then** the system returns `{ ok: false, reason: "商談が紐づいている案件は削除できません" }`

#### Scenario: Deal with contracts cannot be deleted

**Given** a deal with id "D-2" exists, no meetings are linked, but a contract is linked to "D-2"
**When** the user calls deleteDeal with id "D-2"
**Then** the system returns `{ ok: false, reason: "契約が紐づいている案件は削除できません" }`

#### Scenario: Deal without meetings or contracts is deleted

**Given** a deal with id "D-3" exists with no meetings and no contracts
**When** the user calls deleteDeal with id "D-3"
**Then** the deal and its deal_contacts are deleted, and an audit log with action "deal.delete" is recorded

---

### Requirement: The system shall auto-delete deal_contacts when a deal is deleted

When a deal is deleted, the system SHALL delete all associated deal_contacts within the same transaction. Deal contacts are subordinate data that has no meaning without the deal.

#### Scenario: Deal contacts are removed on deal deletion

**Given** a deal "D-3" has 2 deal_contacts
**When** the user calls deleteDeal with id "D-3" (no meetings, no contracts)
**Then** both deal_contacts are deleted before the deal is deleted, all within a single transaction

---

### Requirement: The system shall revert the inquiry status to "new" when a deal created from that inquiry is deleted

When a deal that was created via an inquiry (has inquiryId) is deleted, the system SHALL update the inquiry's status from "converted" back to "new" within the same transaction.

#### Scenario: Inquiry status reverts to new after deal deletion

**Given** an inquiry "I-3" has status "converted" and deal "D-4" has inquiryId "I-3"
**When** the user calls deleteDeal with id "D-4" (no meetings, no contracts)
**Then** inquiry "I-3" has status "new" and deal "D-4" is deleted

---

### Requirement: The system shall prevent deletion of a contract that has linked invoices

The system SHALL check for the existence of invoices linked to the contract before deletion. If invoices exist, the system MUST return an error.

#### Scenario: Contract with invoices cannot be deleted

**Given** a contract "C-1" exists and at least one invoice is linked to "C-1"
**When** the user calls deleteContract with id "C-1"
**Then** the system returns `{ ok: false, reason: "請求が紐づいている契約は削除できません" }`

#### Scenario: Contract without invoices is deleted

**Given** a contract "C-2" exists and no invoices are linked
**When** the user calls deleteContract with id "C-2"
**Then** the contract is deleted and an audit log with action "contract.delete" is recorded

---

### Requirement: Delete operations SHALL be restricted to admin and manager roles

All delete Server Actions (deleteInquiryAction, deleteDealAction, deleteContractAction) MUST check the session user's role. Only users with role "admin" or "manager" SHALL be permitted to execute deletions.

#### Scenario: Non-admin/non-manager user attempts deletion

**Given** a user with role "member" is authenticated
**When** the user calls any delete Server Action
**Then** the action returns `{ success: false, message: "権限がありません" }`

---

### Requirement: Delete operations SHALL record audit logs

Every successful delete operation MUST create an audit log entry within the same transaction as the deletion. The audit log SHALL include action, targetType, targetId, actorId, and organizationId.

#### Scenario: Audit log is recorded on successful deletion

**Given** a user with id "U-1" deletes inquiry "I-5"
**When** the deletion succeeds
**Then** an audit log with action "inquiry.delete", targetType "inquiry", targetId "I-5", actorId "U-1" is created

---

### Requirement: Delete buttons SHALL only appear when no dependent entities exist

The delete button on detail pages MUST be conditionally rendered: it appears only when the entity has no dependents (inquiry: no deals; deal: no meetings and no contracts; contract: no invoices) and the current user has admin or manager role.

#### Scenario: Delete button shown for inquiry without deals

**Given** an admin views the detail page of inquiry "I-6" which has no linked deals
**When** the page renders
**Then** a delete button is visible

#### Scenario: Delete button hidden for inquiry with deals

**Given** an admin views the detail page of inquiry "I-7" which has a linked deal
**When** the page renders
**Then** no delete button is visible

---

### Requirement: Deal create and edit forms SHALL include assigneeId and technicalLeadId fields

The deal creation and editing forms MUST provide dropdown selects for assigneeId (sales lead) and technicalLeadId (technical lead). The options SHALL be populated from the organization's user list.

#### Scenario: Assignee fields appear on deal creation form

**Given** an admin navigates to the new deal page
**When** the form renders
**Then** dropdowns for "営業担当" and "技術担当" are present with the organization's users as options

#### Scenario: Assignee fields appear on deal edit form with current values

**Given** a deal has assigneeId "U-A" and technicalLeadId "U-B"
**When** the edit form renders
**Then** the "営業担当" dropdown has "U-A" selected and "技術担当" has "U-B" selected

---

### Requirement: Meeting creation form SHALL show hearing data fields when type is "hearing"

When the meeting type is set to "hearing", the form MUST display additional fields for challenge, budget, decisionMaker, timeline, competitors, and notes. These fields SHALL be hidden for other meeting types.

#### Scenario: Hearing fields shown for hearing type

**Given** a user is creating a new meeting
**When** the user selects type "hearing"
**Then** hearing data fields (challenge, budget, decisionMaker, timeline, competitors, notes) are displayed

#### Scenario: Hearing fields hidden for non-hearing type

**Given** a user is creating a new meeting
**When** the user selects type "proposal"
**Then** hearing data fields are not displayed

---

### Requirement: The system SHALL provide a meeting edit page

A meeting edit page at `/deals/[id]/meetings/[meetingId]/edit` MUST allow editing of type, date, location, summary, attendees, action items, and hearing data (when type is hearing). The meeting detail page MUST include a link to this edit page.

#### Scenario: Meeting edit page loads with existing data

**Given** a meeting with type "hearing", summary "test", and 2 action items exists
**When** the user navigates to the edit page
**Then** all existing values are pre-populated in the form

#### Scenario: Meeting detail page shows edit link

**Given** a meeting exists at `/deals/D-1/meetings/M-1`
**When** the detail page renders
**Then** an edit link pointing to `/deals/D-1/meetings/M-1/edit` is visible

---

### Requirement: All repository deleteById methods SHALL enforce tenant isolation

Every `deleteById` method MUST include `organizationId` in the WHERE clause to ensure tenant isolation. No deletion SHALL affect data belonging to another organization.

#### Scenario: Delete with wrong organizationId has no effect

**Given** inquiry "I-10" belongs to organization "O-A"
**When** deleteById is called with id "I-10" and organizationId "O-B"
**Then** the inquiry is not deleted
