# Spec: interaction-contract-invoice

## Requirements

### Requirement: Contract adjustment interactions SHALL be created with kind=contract_adjustment and contractId

The system SHALL create an Interaction record with `kind=contract_adjustment` and the specified `contractId` when a user records a contract adjustment. The system SHALL record an audit log with `action=interaction.create` and `metadata.kind=contract_adjustment`.

#### Scenario: Recording a contract adjustment creates an Interaction

**Given** a valid contract exists for the organization
**When** the user records a contract adjustment with summary "条件変更の交渉" and contractId
**Then** an Interaction is created with `kind=contract_adjustment`, the given `contractId`, a non-null `summary`, and a `date`
**And** an audit log entry is recorded with `action=interaction.create`, `targetType=interaction`, and `metadata={ kind: "contract_adjustment" }`

#### Scenario: Contract adjustment requires contractId

**Given** no contractId is provided
**When** the user attempts to record a contract adjustment
**Then** the operation fails with an error indicating that a contract is required

#### Scenario: Contract adjustment requires an existing contract

**Given** a contractId that does not correspond to any contract in the organization
**When** the user attempts to record a contract adjustment
**Then** the operation fails with an error indicating that the contract was not found

### Requirement: Invoice adjustment interactions SHALL be created with kind=invoice_adjustment and invoiceId

The system SHALL create an Interaction record with `kind=invoice_adjustment` and the specified `invoiceId` when a user records an invoice adjustment. The system SHALL record an audit log with `action=interaction.create` and `metadata.kind=invoice_adjustment`.

#### Scenario: Recording an invoice adjustment creates an Interaction

**Given** a valid invoice exists for the organization
**When** the user records an invoice adjustment with summary "請求金額の調整" and invoiceId
**Then** an Interaction is created with `kind=invoice_adjustment`, the given `invoiceId`, a non-null `summary`, and a `date`
**And** an audit log entry is recorded with `action=interaction.create`, `targetType=interaction`, and `metadata={ kind: "invoice_adjustment" }`

#### Scenario: Invoice adjustment requires invoiceId

**Given** no invoiceId is provided
**When** the user attempts to record an invoice adjustment
**Then** the operation fails with an error indicating that an invoice is required

#### Scenario: Invoice adjustment requires an existing invoice

**Given** an invoiceId that does not correspond to any invoice in the organization
**When** the user attempts to record an invoice adjustment
**Then** the operation fails with an error indicating that the invoice was not found

### Requirement: Interaction listing by contract and invoice SHALL return associated interactions

The system SHALL provide `findAllByContract(contractId, organizationId)` and `findAllByInvoice(invoiceId, organizationId)` repository functions that return all interactions associated with the given contract or invoice, ordered by date descending (newest first).

#### Scenario: Listing interactions by contract

**Given** 3 interactions exist with `contractId=C-001` in the organization
**When** `findAllByContract("C-001", orgId)` is called
**Then** all 3 interactions are returned, ordered by date descending

#### Scenario: Listing interactions by invoice

**Given** 2 interactions exist with `invoiceId=I-001` in the organization
**When** `findAllByInvoice("I-001", orgId)` is called
**Then** both interactions are returned, ordered by date descending

#### Scenario: No interactions for contract returns empty array

**Given** no interactions exist for contract C-999
**When** `findAllByContract("C-999", orgId)` is called
**Then** an empty array is returned

### Requirement: Authorization for contract adjustment SHALL allow admin/manager/member

The system MUST enforce that only users with role `admin`, `manager`, or `member` can record a `contract_adjustment` interaction. Users with role `finance` MUST be denied.

#### Scenario: Admin records contract adjustment

**Given** a user with role `admin`
**When** the user attempts to record a contract adjustment
**Then** the operation is permitted

#### Scenario: Finance user denied contract adjustment

**Given** a user with role `finance`
**When** the user attempts to record a contract adjustment
**Then** the operation is denied with a permission error

### Requirement: Authorization for invoice adjustment SHALL allow admin/manager/finance

The system MUST enforce that only users with role `admin`, `manager`, or `finance` can record an `invoice_adjustment` interaction. Users with role `member` MUST be denied.

#### Scenario: Finance user records invoice adjustment

**Given** a user with role `finance`
**When** the user attempts to record an invoice adjustment
**Then** the operation is permitted

#### Scenario: Member user denied invoice adjustment

**Given** a user with role `member`
**When** the user attempts to record an invoice adjustment
**Then** the operation is denied with a permission error

### Requirement: Deal activity timeline SHALL include contract and invoice interactions

The `getDealActivity` usecase SHALL include interactions associated with the deal's contracts and invoices in the timeline. These interactions MUST appear alongside existing deal-level interactions.

#### Scenario: Contract adjustment appears in deal timeline

**Given** a deal with contract C-001
**And** a contract_adjustment interaction exists for C-001
**When** `getDealActivity` is called for the deal
**Then** the `targets` array passed to `findByTargets` includes `{ targetType: "interaction", targetId: <interactionId> }`
**And** `targetInfoMap` includes an entry for the interaction

#### Scenario: Invoice adjustment appears in deal timeline

**Given** a deal with contract C-001 and invoice I-001 under C-001
**And** an invoice_adjustment interaction exists for I-001
**When** `getDealActivity` is called for the deal
**Then** the `targets` array passed to `findByTargets` includes `{ targetType: "interaction", targetId: <interactionId> }`

### Requirement: Contract detail page SHALL display contract adjustment section

The contract detail page SHALL display a "契約調整（やり取り）" section showing contract_adjustment interactions for the contract in newest-first order, with a form to record new adjustments.

#### Scenario: Contract detail shows interaction list and form

**Given** a contract with 2 contract_adjustment interactions
**When** the user navigates to the contract detail page
**Then** the page displays both interactions with date and summary
**And** a form is available to record a new contract adjustment

### Requirement: Invoice detail page SHALL display invoice adjustment section

The invoice detail page SHALL display a "請求調整（やり取り）" section showing invoice_adjustment interactions for the invoice in newest-first order, with a form to record new adjustments.

#### Scenario: Invoice detail shows interaction list and form

**Given** an invoice with 1 invoice_adjustment interaction
**When** the user navigates to the invoice detail page
**Then** the page displays the interaction with date and summary
**And** a form is available to record a new invoice adjustment
