# Spec: ダッシュボードの実装

## Requirements

### Requirement: Root redirect targets /dashboard

The system SHALL redirect `/` to `/dashboard` instead of `/requests`.

#### Scenario: Unauthenticated user visits /

**Given** a user is not logged in
**When** the user navigates to `/`
**Then** the user is redirected to `/dashboard`, and subsequently to `/login` by the layout auth guard

#### Scenario: Authenticated user visits /

**Given** a user is logged in
**When** the user navigates to `/`
**Then** the user is redirected to `/dashboard` and sees the dashboard page

### Requirement: Role-based dashboard routing

The dashboard page SHALL render a sales dashboard for users with role `member`, `manager`, or `admin`, and a finance dashboard for users with role `finance`.

#### Scenario: Member user sees sales dashboard

**Given** a user with role `member` is logged in
**When** the user navigates to `/dashboard`
**Then** the sales dashboard is rendered with action items, pipeline summary, and recent activity sections

#### Scenario: Finance user sees finance dashboard

**Given** a user with role `finance` is logged in
**When** the user navigates to `/dashboard`
**Then** the finance dashboard is rendered with overdue invoices, unpaid invoices, monthly revenue summary, and upcoming invoices sections

### Requirement: Sales dashboard action list aggregation

The sales dashboard SHALL display an aggregated action list combining: (a) pending approval requests where `approverRole` matches the current user's role, (b) all undone action items from meetings across all deals, and (c) inquiries with status `new`. Items SHALL be sorted by due date ascending (earliest first), with items lacking a due date placed at the end.

#### Scenario: Aggregated action list with mixed item types

**Given** the organization has 2 pending approval requests matching the user's role (one with deadline tomorrow, one with deadline next week), 1 undone action item with dueDate = today, and 3 new inquiries (no due date)
**When** the user views the sales dashboard
**Then** the action list shows 6 items in order: action item (today), approval request (tomorrow), approval request (next week), then the 3 inquiries at the end

#### Scenario: Empty action list

**Given** the organization has no pending approval requests for the user's role, no undone action items, and no new inquiries
**When** the user views the sales dashboard
**Then** the action list section shows an empty state message

### Requirement: Sales dashboard pipeline summary

The sales dashboard SHALL display a pipeline summary showing each deal phase with its count and total estimated amount. Each phase entry SHALL link to the deals list page filtered by that phase.

#### Scenario: Pipeline summary with deals in multiple phases

**Given** the organization has 3 deals in `proposal_prep` (total ¥3,000,000), 2 deals in `negotiation` (total ¥5,000,000), and 1 deal in `won` (total ¥2,000,000)
**When** the user views the sales dashboard
**Then** the pipeline summary shows all 5 phases with their respective counts and amounts, and clicking `proposal_prep` navigates to `/deals?phase=proposal_prep`

### Requirement: Sales dashboard recent activity

The sales dashboard SHALL display the 20 most recent audit log entries for the organization, ordered by creation date descending. Each entry SHALL include a link to the target entity.

#### Scenario: Recent activity display

**Given** the organization has 30 audit log entries
**When** the user views the sales dashboard
**Then** the recent activity section displays the 20 most recent entries, each with a link to the target entity

### Requirement: Sales dashboard stale deals for managers

The sales dashboard SHALL display a stale deals list only for users with role `manager` or `admin`. A stale deal is defined as a deal where `updatedAt` is 14 or more days before the current time and `phase` is not `won` or `lost`.

#### Scenario: Manager sees stale deals

**Given** the user has role `manager`, and the organization has 2 deals with `updatedAt` 20 days ago in phase `negotiation` and 1 deal with `updatedAt` 10 days ago in phase `proposal_prep`
**When** the user views the sales dashboard
**Then** the stale deals section is visible and shows 2 stale deals

#### Scenario: Member does not see stale deals

**Given** the user has role `member`
**When** the user views the sales dashboard
**Then** the stale deals section is not rendered

#### Scenario: Won/lost deals excluded from stale list

**Given** the user has role `admin`, and the organization has 1 deal with `updatedAt` 30 days ago in phase `won`
**When** the user views the sales dashboard
**Then** the stale deals section does not include the won deal

### Requirement: Organization-level invoice query

The `invoiceRepository` SHALL provide a `findAllByOrganization` method that accepts `organizationId` and optional filters (`status`, `paidAtFrom`, `paidAtTo`, `issueDateFrom`, `issueDateTo`). All queries MUST include `organizationId` in the WHERE clause for tenant isolation. The `listInvoicesByOrganization` usecase SHALL delegate to this repository method.

#### Scenario: Fetch invoices by organization with status filter

**Given** the organization has 5 invoices: 2 with status `overdue`, 2 with status `invoiced`, 1 with status `paid`
**When** `listInvoicesByOrganization` is called with `status = "overdue"`
**Then** 2 invoices are returned, both with status `overdue`

#### Scenario: Fetch invoices with paidAt date range filter

**Given** the organization has 3 paid invoices: paidAt = June 1, June 15, July 5
**When** `listInvoicesByOrganization` is called with `paidAtFrom = June 1 00:00 UTC` and `paidAtTo = July 1 00:00 UTC`
**Then** 2 invoices are returned (June 1 and June 15)

#### Scenario: Tenant isolation in findAllByOrganization

**Given** organization A has 3 invoices and organization B has 2 invoices
**When** `findAllByOrganization` is called with organization A's ID
**Then** only organization A's 3 invoices are returned

### Requirement: Finance dashboard overdue invoices

The finance dashboard SHALL display invoices with status `overdue`, sorted by `dueDate` ascending.

#### Scenario: Overdue invoices displayed

**Given** the organization has 3 overdue invoices with due dates June 1, June 10, June 5
**When** the finance user views the dashboard
**Then** the overdue invoices section shows 3 invoices sorted: June 1, June 5, June 10

### Requirement: Finance dashboard unpaid invoices

The finance dashboard SHALL display invoices with status `invoiced`, sorted by `dueDate` ascending.

#### Scenario: Unpaid invoices displayed

**Given** the organization has 2 invoices with status `invoiced`, due dates July 1 and June 20
**When** the finance user views the dashboard
**Then** the unpaid invoices section shows 2 invoices sorted: June 20, July 1

### Requirement: Finance dashboard monthly revenue summary

The finance dashboard SHALL display the sum of `amount` for invoices with status `paid` and `paidAt` within the current month (from the 1st day 00:00:00 UTC of the current month to the 1st day 00:00:00 UTC of the next month).

#### Scenario: Monthly revenue calculation

**Given** today is June 15, and the organization has paid invoices: ¥100,000 (paidAt June 1), ¥200,000 (paidAt June 10), ¥50,000 (paidAt May 28)
**When** the finance user views the dashboard
**Then** the monthly revenue summary shows ¥300,000

### Requirement: Finance dashboard upcoming invoices

The finance dashboard SHALL display invoices with status `scheduled` and `issueDate` within the range from the 1st day of the current month (00:00:00 UTC) to the last day of the next month (23:59:59 UTC), sorted by `issueDate` ascending.

#### Scenario: Upcoming invoices within two-month window

**Given** today is June 15, and the organization has scheduled invoices: issueDate June 20, July 10, August 5
**When** the finance user views the dashboard
**Then** the upcoming invoices section shows 2 invoices (June 20 and July 10), excluding August 5

### Requirement: Navigation dashboard link

The global navigation in `(dashboard)/layout.tsx` SHALL include a "ダッシュボード" link pointing to `/dashboard`, positioned as the first navigation item.

#### Scenario: Dashboard link visible in navigation

**Given** a logged-in user
**When** the user views any page within the dashboard layout
**Then** "ダッシュボード" appears as the first link in the navigation bar, linking to `/dashboard`

