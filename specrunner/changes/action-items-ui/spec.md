# Spec: アクションアイテム UI の action_items テーブル切り替え

## Requirements

### Requirement: DealActionItemsSection SHALL display action items from the action_items table

DealActionItemsSection SHALL retrieve action items via `listActionItemsByDeal` and display them using the `ActionItem` model from `@/domain/models/actionItem`. The component SHALL no longer depend on `meetings.actionItems` JSON data.

#### Scenario: Deal detail page shows action items from action_items table

**Given** a deal with id "deal-1" exists and has 2 action items in the action_items table (one done, one undone)
**When** the user navigates to `/deals/deal-1`
**Then** DealActionItemsSection displays both action items with their description, assignee name, due date, and done status

#### Scenario: Toggle completion on deal action item

**Given** a deal action item with id "ai-1" is displayed as undone in DealActionItemsSection
**When** the user clicks the checkbox for "ai-1"
**Then** `toggleActionItemAction({ id: "ai-1" })` is called and the page refreshes to show the updated state

### Requirement: MeetingActionItemsSection SHALL read and write action items via the action_items table

MeetingActionItemsSection SHALL use `createActionItemAction` for adding new action items and `toggleActionItemAction` for toggling completion. It SHALL NOT modify the `meetings.actionItems` JSON array. The component SHALL receive action items fetched via `listActionItemsByMeeting`.

#### Scenario: Meeting detail page shows action items from action_items table

**Given** a meeting with id "mtg-1" linked to deal "deal-1" has 1 action item in the action_items table
**When** the user navigates to `/deals/deal-1/meetings/mtg-1`
**Then** MeetingActionItemsSection displays the action item from the action_items table

#### Scenario: Add action item from meeting detail

**Given** the user is on the meeting detail page for meeting "mtg-1" (dealId "deal-1")
**When** the user fills in description "タスクA", selects an assignee, and clicks the add button
**Then** `createActionItemAction` is called with `{ description: "タスクA", assigneeId, meetingId: "mtg-1", dealId: "deal-1" }` and the page refreshes

#### Scenario: Toggle completion on meeting action item

**Given** a meeting action item with id "ai-2" is displayed as undone in MeetingActionItemsSection
**When** the user clicks the checkbox for "ai-2"
**Then** `toggleActionItemAction({ id: "ai-2" })` is called and the page refreshes

### Requirement: getDashboardActions SHALL retrieve undone action items from the action_items table

getDashboardActions SHALL use `actionItemRepository.findByOrganization(organizationId, { done: false })` to collect undone action items instead of iterating over `meeting.actionItems` JSON. The `DashboardActionItem` type's `action_item` variant SHALL have `dealId: string | null` and `assigneeId: string | null` instead of `dealId: string` and `assignee: string`.

#### Scenario: Dashboard collects undone action items from action_items table

**Given** the action_items table contains 3 undone action items for organization "org-1" (one with dealId null)
**When** `getDashboardActions("org-1", "member")` is called
**Then** all 3 action items appear in the returned list with their respective dealId (including null) and assigneeId values

### Requirement: SalesDashboard SHALL handle nullable dealId and resolve assigneeId to user name

SalesDashboard SHALL display action items with nullable `dealId` — when `dealId` is null, the deal link SHALL NOT be rendered. SalesDashboard SHALL resolve `assigneeId` to a display name using a user map provided via props.

#### Scenario: Action item with null dealId on dashboard

**Given** an undone action item with dealId null and assigneeId "user-1" exists
**When** the dashboard is rendered
**Then** the action item row does not contain a deal link, and displays the assignee's name resolved from the user map

#### Scenario: Action item with valid dealId on dashboard

**Given** an undone action item with dealId "deal-1" and assigneeId "user-2" exists, and deal "deal-1" has title "案件A"
**When** the dashboard is rendered
**Then** the action item row contains a link to `/deals/deal-1` showing "案件A", and displays the assignee's name

### Requirement: DealActionItemsSection SHALL provide an add form for deal-level action items

DealActionItemsSection SHALL include an add form that allows creating action items directly associated with a deal (without a meeting). The form SHALL accept description (required), assigneeId (optional, select from organization users), and dueDate (optional). It SHALL call `createActionItemAction` with the deal's `dealId`.

#### Scenario: Add action item from deal detail without meeting

**Given** the user is on the deal detail page for deal "deal-1"
**When** the user clicks the add button, fills in description "社内準備" with no assignee and no due date, and submits
**Then** `createActionItemAction` is called with `{ description: "社内準備", dealId: "deal-1" }` and the action item appears in the list after refresh
