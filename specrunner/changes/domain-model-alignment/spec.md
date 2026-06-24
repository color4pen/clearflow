# Spec: domain-model-alignment

## Requirements

### Requirement: Inquiry SHALL have budget and timeline fields

The Inquiry model and schema SHALL include `budget` (integer, nullable) and `timeline` (text, nullable) fields. These fields allow recording the prospect's estimated budget and desired timeline at the inquiry stage.

#### Scenario: Creating an inquiry with budget and timeline

**Given** a user with permission to create inquiries
**When** the user creates an inquiry with budget=5000000 and timeline="2026-Q3"
**Then** the inquiry is persisted with budget=5000000 and timeline="2026-Q3"

#### Scenario: Creating an inquiry without budget and timeline

**Given** a user with permission to create inquiries
**When** the user creates an inquiry without specifying budget or timeline
**Then** the inquiry is persisted with budget=null and timeline=null

### Requirement: InquirySource SHALL be a pgEnum with 7 values

The `source` column on the inquiries table SHALL be a PostgreSQL enum type with exactly these values: `web`, `phone`, `email`, `referral`, `agent_service`, `exhibition`, `other`. Existing data with values not in this set SHALL be migrated to `other`.

#### Scenario: Creating an inquiry with the new source value "email"

**Given** the inquirySourceEnum is defined with 7 values
**When** a user creates an inquiry with source="email"
**Then** the inquiry is persisted with source="email"

#### Scenario: Creating an inquiry with the new source value "agent_service"

**Given** the inquirySourceEnum is defined with 7 values
**When** a user creates an inquiry with source="agent_service"
**Then** the inquiry is persisted with source="agent_service"

#### Scenario: Migration fallback for unknown source values

**Given** an existing inquiry record has source="unknown_value" (not in the enum)
**When** the migration runs
**Then** the record's source is updated to "other"

### Requirement: Meeting SHALL support linking to either an inquiry or a deal

The meetings table SHALL have both `deal_id` (nullable) and `inquiry_id` (nullable, FK → inquiries.id). A CHECK constraint SHALL enforce that at least one of `deal_id` or `inquiry_id` is NOT NULL.

#### Scenario: Creating a meeting linked to an inquiry (no deal)

**Given** an inquiry exists and no deal has been created from it
**When** a user creates a meeting with inquiryId=<inquiry-id> and no dealId
**Then** the meeting is persisted with inquiryId=<inquiry-id> and dealId=null

#### Scenario: Creating a meeting linked to a deal

**Given** a deal exists
**When** a user creates a meeting with dealId=<deal-id> and no inquiryId
**Then** the meeting is persisted with dealId=<deal-id> and inquiryId=null

#### Scenario: Rejecting a meeting with neither deal nor inquiry

**Given** a user attempts to create a meeting
**When** neither dealId nor inquiryId is provided
**Then** the system rejects the creation (CHECK constraint violation or application-level validation)

### Requirement: Meeting attendees SHALL use the structured attendee format

The attendees JSONB column SHALL store data in the format `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>`. Existing data SHALL be migrated from the old `{ internal: string[], external: string[] }` format.

#### Scenario: Migration converts internal attendees

**Given** an existing meeting has attendees `{ "internal": ["Tanaka", "Suzuki"], "external": [] }`
**When** the migration runs
**Then** the attendees become `[{ "userId": null, "contactId": null, "name": "Tanaka", "isExternal": false }, { "userId": null, "contactId": null, "name": "Suzuki", "isExternal": false }]`

#### Scenario: Migration converts external attendees

**Given** an existing meeting has attendees `{ "internal": [], "external": ["Client A"] }`
**When** the migration runs
**Then** the attendees become `[{ "userId": null, "contactId": null, "name": "Client A", "isExternal": true }]`

#### Scenario: Migration converts mixed attendees

**Given** an existing meeting has attendees `{ "internal": ["Tanaka"], "external": ["Client A"] }`
**When** the migration runs
**Then** the attendees become `[{ "userId": null, "contactId": null, "name": "Tanaka", "isExternal": false }, { "userId": null, "contactId": null, "name": "Client A", "isExternal": true }]`

### Requirement: Deal SHALL have a description field

The Deal model and schema SHALL include `description` (text, nullable). This field allows capturing a free-text summary of the deal.

#### Scenario: Creating a deal with description

**Given** a user with permission to create deals
**When** the user creates a deal with description="Large-scale system migration project"
**Then** the deal is persisted with description="Large-scale system migration project"

#### Scenario: Creating a deal without description

**Given** a user with permission to create deals
**When** the user creates a deal without specifying description
**Then** the deal is persisted with description=null

### Requirement: isPrimary uniqueness SHALL be validated at the application layer

The system SHALL enforce that at most one ClientContact per client has `isPrimary=true`. The validation SHALL be performed by `validatePrimaryUniqueness` in the domain service layer.

#### Scenario: Setting isPrimary when no existing primary contact

**Given** client C has no contacts with isPrimary=true
**When** a user creates a contact for client C with isPrimary=true
**Then** the contact is created successfully with isPrimary=true

#### Scenario: Setting isPrimary when another primary contact exists

**Given** client C already has contact X with isPrimary=true
**When** a user creates a new contact for client C with isPrimary=true
**Then** the system rejects the operation with an error indicating a primary contact already exists

#### Scenario: Updating isPrimary when another primary contact exists

**Given** client C has contact X with isPrimary=true and contact Y with isPrimary=false
**When** a user updates contact Y to isPrimary=true
**Then** the system rejects the operation with an error indicating a primary contact already exists

#### Scenario: Unsetting isPrimary is always allowed

**Given** client C has contact X with isPrimary=true
**When** a user updates contact X to isPrimary=false
**Then** the contact is updated successfully with isPrimary=false
