# Spec: 組織設定（組織名の編集）

## Requirements

### Requirement: Admin SHALL be able to update the organization name

The system SHALL allow a user with the `admin` role to update the `name` field of their own organization. The update MUST be scoped to the actor's organization (multi-tenant isolation).

#### Scenario: Admin successfully updates organization name

**Given** a user with role `admin` is authenticated and belongs to organization "旧社名"
**When** the user submits the organization settings form with name "新社名"
**Then** the organization name is updated to "新社名" in the database
**And** the settings page reflects the new name

#### Scenario: Update is scoped to own organization only

**Given** two organizations exist: org-A ("A社") and org-B ("B社")
**And** an admin user belongs to org-A
**When** the admin updates the organization name to "A社改"
**Then** org-A's name becomes "A社改"
**And** org-B's name remains "B社"

### Requirement: Non-admin roles SHALL be denied organization update

The system SHALL deny `updateOrganization` for users with role `manager`, `finance`, or `member`. The authorization check MUST use `canPerform(role, "organization", "updateOrganization")`.

#### Scenario: Manager is denied organization update

**Given** a user with role `manager` is authenticated
**When** the user attempts to call `updateOrganizationAction`
**Then** the system returns an authorization error "この操作を実行する権限がありません"

#### Scenario: Member is denied organization update

**Given** a user with role `member` is authenticated
**When** the user attempts to call `updateOrganizationAction`
**Then** the system returns an authorization error "この操作を実行する権限がありません"

#### Scenario: Finance is denied organization update

**Given** a user with role `finance` is authenticated
**When** the user attempts to call `updateOrganizationAction`
**Then** the system returns an authorization error "この操作を実行する権限がありません"

### Requirement: Organization update SHALL record an audit log

The system SHALL record an audit log entry with `action: "organization.update"` and `targetType: "organization"` within the same database transaction as the name update. The metadata MUST include the new `name`.

#### Scenario: Audit log is recorded on successful update

**Given** an admin user updates the organization name to "新社名"
**When** the update transaction completes successfully
**Then** an audit log entry exists with:
  - `action`: `"organization.update"`
  - `targetType`: `"organization"`
  - `targetId`: the organization's id
  - `actorId`: the admin user's id
  - `organizationId`: the organization's id
  - `metadata`: `{ name: "新社名" }`

#### Scenario: Audit log is atomically recorded with update

**Given** an admin user submits an organization name update
**When** the `recordAudit` call fails
**Then** the organization name update is also rolled back (transactional atomicity)

### Requirement: Organization name input SHALL be validated

The Server Action SHALL validate the `name` field using zod: it MUST be a non-empty string with a maximum length of 100 characters.

#### Scenario: Empty name is rejected

**Given** an admin user submits the organization settings form with an empty name
**When** the Server Action validates the input
**Then** the system returns a validation error

#### Scenario: Name exceeding 100 characters is rejected

**Given** an admin user submits a name with 101 characters
**When** the Server Action validates the input
**Then** the system returns a validation error

### Requirement: Organization settings tab SHALL appear in SettingsNav

The SettingsNav component SHALL include an "組織" tab linking to `/settings/organization`. This tab SHALL appear as the first item in the navigation.

#### Scenario: Organization tab is visible in settings navigation

**Given** an admin user navigates to any settings page
**When** the SettingsNav component renders
**Then** "組織" tab is visible as the first navigation item
**And** it links to `/settings/organization`

### Requirement: organizationId and actorId SHALL be derived from session

The Server Action SHALL derive `organizationId` and `actorId` from the authenticated session, not from client-submitted form data. This MUST prevent a client from specifying another organization's id.

#### Scenario: organizationId comes from session

**Given** an admin user submits the organization settings form
**When** the Server Action processes the request
**Then** `organizationId` is taken from `session.user.organizationId`
**And** `actorId` is taken from `session.user.id`
**And** `formData` does not contain `organizationId` or `actorId`
