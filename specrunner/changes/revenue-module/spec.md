# Spec: 売上モジュールの実装

## Requirements

### Requirement: Monthly revenue aggregation SHALL sum paid invoice amounts by paidAt month

The system SHALL aggregate revenue by month using `paidAt` as the attribution date. Only invoices with `status = "paid"` and `paidAt IS NOT NULL` SHALL be included. The result SHALL contain the year-month, total amount, and invoice count for each month in the requested period.

#### Scenario: Monthly revenue for the past 12 months

**Given** invoices exist with `status = "paid"` and `paidAt` within the last 12 months
**When** `getMonthlyRevenue` is called with the organization ID and a 12-month date range
**Then** the result contains one entry per month with the sum of `amount` and count of invoices for that month

#### Scenario: Month with no paid invoices

**Given** no invoices with `status = "paid"` exist for a specific month within the requested range
**When** monthly revenue is aggregated
**Then** that month is either absent from the result or present with amount = 0 and count = 0

### Requirement: Customer revenue aggregation SHALL group paid invoices by client

The system SHALL aggregate revenue by customer by joining invoices → contracts → clients, filtering on `status = "paid"` and `paidAt` within the specified period. The result SHALL include client ID, client name, total amount, and invoice count.

#### Scenario: Top 10 customers by revenue

**Given** multiple clients have paid invoices within the specified period
**When** customer revenue aggregation is called with a period and limit of 10
**Then** the result contains at most 10 entries, sorted by total amount descending

### Requirement: Deal revenue aggregation SHALL group paid invoices by deal

The system SHALL aggregate revenue by deal by joining invoices → contracts → deals, filtering on `status = "paid"` and `paidAt` within the specified period. The result SHALL include deal ID, deal title, total amount, and invoice count.

#### Scenario: Deal-based aggregation within a period

**Given** invoices linked through contracts to different deals have `status = "paid"` within the period
**When** deal revenue aggregation is called
**Then** the result contains one entry per deal with the sum of amounts and count of invoices

### Requirement: Pipeline aggregation SHALL sum estimatedAmount for non-terminal deal phases

The system SHALL aggregate deals by phase, counting deals and summing `estimatedAmount` (with `COALESCE(estimated_amount, 0)` for NULL values). Only non-terminal phases (`proposal_prep`, `proposed`, `negotiation`) SHALL be included. Terminal phases (`won`, `lost`) SHALL be excluded.

#### Scenario: Pipeline summary excludes won and lost deals

**Given** deals exist in phases `proposal_prep`, `proposed`, `negotiation`, `won`, and `lost`
**When** pipeline aggregation is called
**Then** the result contains entries for `proposal_prep`, `proposed`, and `negotiation` only

#### Scenario: Deal with null estimatedAmount is counted but contributes 0 to sum

**Given** a deal in `proposed` phase has `estimatedAmount = null`
**When** pipeline aggregation is called
**Then** the deal is included in the count for `proposed`, and its contribution to the amount sum is 0

### Requirement: Revenue dashboard page SHALL display current month total, monthly trend, pipeline forecast, and top customers

The `/revenue` page SHALL display:
1. Current month's total paid amount
2. Monthly revenue data for the past 12 months
3. Pipeline forecast total (sum of `estimatedAmount` for non-terminal phase deals)
4. Top 10 customers by revenue

All data SHALL be scoped to the authenticated user's organization.

#### Scenario: Authenticated user views revenue dashboard

**Given** the user is authenticated and belongs to an organization with paid invoices
**When** the user navigates to `/revenue`
**Then** the page displays the current month total, 12-month trend data, pipeline forecast, and top 10 customer ranking

### Requirement: Revenue details page SHALL support period filtering and aggregation axis switching

The `/revenue/details` page SHALL allow the user to specify a start date and end date, and choose an aggregation axis (monthly, by customer, or by deal). The page SHALL display a table with the aggregated data matching the selected axis.

#### Scenario: Filter by period and monthly axis

**Given** the user is on `/revenue/details`
**When** the user sets start date to 2026-01-01, end date to 2026-06-30, and selects "monthly" axis
**Then** the table displays monthly aggregated revenue data for January through June 2026

#### Scenario: Switch to customer axis

**Given** the user is on `/revenue/details` with a period set
**When** the user selects "by customer" axis
**Then** the table displays customer-level aggregated revenue data for the selected period

### Requirement: CSV export endpoint SHALL return revenue details as a downloadable CSV file

The system SHALL provide a GET endpoint at `/api/revenue/export` that returns revenue data as a CSV file. The endpoint SHALL:
- Accept query parameters: `startDate`, `endDate`, `axis` (monthly / customer / deal)
- Apply BOM prefix for Excel compatibility
- Apply CSV injection countermeasures (prefix `=`, `+`, `-`, `@` with `'`)
- Return `Content-Type: text/csv; charset=utf-8` with `Content-Disposition: attachment`
- Require authentication and authorization (`revenue.export` permission)

#### Scenario: Export monthly revenue as CSV

**Given** the user is authenticated with a role that has `revenue.export` permission
**When** the user requests GET `/api/revenue/export?startDate=2026-01-01&endDate=2026-06-30&axis=monthly`
**Then** a CSV file is returned with columns including period, amount, and count

#### Scenario: Unauthenticated request is rejected

**Given** no valid session exists
**When** a GET request is made to `/api/revenue/export`
**Then** a 401 response is returned

### Requirement: Forecast page SHALL allow setting target amounts and display progress

The `/revenue/forecast` page SHALL allow admin/manager users to set a target amount for a period (defined by start date and end date). The page SHALL display:
- The target amount for the selected period
- The actual paid amount for that period
- The progress rate (actual / target as percentage)
- The landing forecast (actual + pipeline estimatedAmount sum)

#### Scenario: Admin sets a monthly target

**Given** the user has role `admin` and is on `/revenue/forecast`
**When** the user sets a target of 10,000,000 for July 2026
**Then** the target is saved and the progress display shows actual vs target for July 2026

#### Scenario: Member user cannot set targets

**Given** the user has role `member` and is on `/revenue/forecast`
**When** the page loads
**Then** the target setting form is not displayed (read-only view of existing targets and progress)

### Requirement: revenue_targets table SHALL store period-based target amounts per organization

The `revenue_targets` table SHALL have columns: `id` (UUID PK), `organizationId` (FK to organizations), `periodStart` (timestamp, NOT NULL), `periodEnd` (timestamp, NOT NULL), `targetAmount` (integer, NOT NULL), `createdAt` (timestamp), `updatedAt` (timestamp). The system SHALL prevent overlapping periods within the same organization.

#### Scenario: Create a revenue target

**Given** no existing target overlaps the period 2026-07-01 to 2026-07-31 for the organization
**When** a target with amount 10,000,000 is created for that period
**Then** the target is persisted with the specified period and amount

#### Scenario: Reject overlapping target period

**Given** a target exists for 2026-07-01 to 2026-07-31
**When** a new target is created for 2026-07-15 to 2026-08-15 in the same organization
**Then** the creation is rejected with an error indicating period overlap

### Requirement: Navigation SHALL include a "revenue" link

The global navigation in the dashboard layout SHALL include a link labeled "売上" pointing to `/revenue`. The link SHALL be visible to all authenticated roles.

#### Scenario: Revenue link appears in navigation

**Given** the user is authenticated
**When** any dashboard page is rendered
**Then** the navigation bar contains a "売上" link that navigates to `/revenue`

### Requirement: Revenue target operations SHALL enforce role-based access control

The system SHALL enforce that only users with `admin` or `manager` role can create or update revenue targets (`revenue.setTarget`). All authenticated users SHALL be able to view revenue data and targets (`revenue.view`). CSV export SHALL require `revenue.export` permission, granted to `admin`, `manager`, and `finance` roles.

#### Scenario: Finance user can view but not set targets

**Given** the user has role `finance`
**When** the user attempts to set a revenue target via Server Action
**Then** the action returns an authorization error

#### Scenario: Finance user can export CSV

**Given** the user has role `finance`
**When** the user requests GET `/api/revenue/export`
**Then** the CSV file is returned successfully
