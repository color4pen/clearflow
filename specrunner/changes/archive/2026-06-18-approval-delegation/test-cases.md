# Test Cases: Approval Delegation

## Summary

- **Total**: 28 cases
- **Automated** (unit/integration): 25
- **Manual**: 3
- **Priority**: must: 17, should: 9, could: 2

---

### TC-001: Delegated user can approve

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Delegated approval via active delegation > Scenario: Delegated user can approve

---

### TC-002: Delegation outside active period is rejected

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Delegated approval via active delegation > Scenario: Delegation outside active period is rejected

---

### TC-003: Inactive delegation is ignored

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Delegated approval via active delegation > Scenario: Inactive delegation is ignored

---

### TC-004: Self-delegation attempt

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Self-delegation SHALL be rejected > Scenario: Self-delegation attempt

---

### TC-005: Cross-org delegation attempt

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Cross-organization delegation SHALL be rejected > Scenario: Cross-org delegation attempt

---

### TC-006: Overlapping period rejected

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Overlapping delegation SHALL be rejected > Scenario: Overlapping period

---

### TC-007: Non-overlapping period succeeds

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Overlapping delegation SHALL be rejected > Scenario: Non-overlapping period succeeds

---

### TC-008: Delegation revoked during approval (TOCTOU)

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Delegation data SHALL be fetched inside transaction > Scenario: Delegation revoked during approval

---

### TC-009: Delegated approval audit log

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Audit log SHALL record delegatedFrom for delegated approvals > Scenario: Delegated approval audit log

---

### TC-010: Normal approval audit log contains no delegatedFrom

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Audit log SHALL record delegatedFrom for delegated approvals > Scenario: Normal approval audit log

---

### TC-011: Delegation creation is logged

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createDelegation SHALL record audit log on success > Scenario: Delegation creation is logged

---

### TC-012: Delegation deactivation is logged

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: deactivateDelegation SHALL record audit log > Scenario: Delegation deactivation is logged

---

### TC-013: Admin creates delegation

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Delegation management SHALL be admin-only > Scenario: Admin creates delegation

---

### TC-014: Non-admin cannot access delegation management

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Delegation management SHALL be admin-only > Scenario: Non-admin cannot access delegation management

---

### TC-015: approval_delegations table exists in schema

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: approval_delegations table schema > Scenario: Table exists in schema

---

### TC-016: canApprove backward compatibility without delegations argument

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** an approval step with `approverRole = "admin"` and an actor with `actorRole = "admin"`
**WHEN** `canApprove(step, "admin")` is called without the optional `delegations` argument
**THEN** returns `true`, preserving the existing behavior unchanged

---

### TC-017: canApproveWithDelegation returns no delegation on direct role match

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** an approval step with `approverRole = "manager"`, actor role `"manager"`, and an empty `delegations` array
**WHEN** `canApproveWithDelegation(step, "manager", [])` is called
**THEN** returns `{ allowed: true, delegation: undefined }`

---

### TC-018: Multiple matching delegations — latest startDate is adopted

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** two active delegations to User B both with `fromUserRole` matching `step.approverRole`; delegation A has `startDate = 2026-06-01`, delegation B has `startDate = 2026-06-10`
**WHEN** `canApproveWithDelegation(step, actorRole, [delegationA, delegationB])` is called
**THEN** returns `{ allowed: true, delegation: delegationB }` (the one with the newer `startDate`)

---

### TC-019: canApproveWithDelegation returns false when no delegation matches

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** an approval step with `approverRole = "manager"`, actor role `"admin"`, and delegations where all `fromUserRole` values are not `"manager"`
**WHEN** `canApproveWithDelegation(step, "admin", delegations)` is called
**THEN** returns `{ allowed: false }`

---

### TC-020: startDate >= endDate is rejected in createDelegation

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** a `createDelegation` input where `startDate` is equal to or after `endDate`
**WHEN** `createDelegation` usecase is executed
**THEN** returns `{ ok: false, reason: <validation message> }` and no delegation record is created

---

### TC-021: deactivateDelegation returns error when delegation not found

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** a `delegationId` that does not exist within the specified `organizationId`
**WHEN** `deactivateDelegation({ delegationId, organizationId })` is called
**THEN** returns `{ ok: false, reason: "Delegation not found." }` and no audit log is written

---

### TC-022: listDelegations returns all delegations for organization

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** an organization that has 3 delegation records (a mix of active and inactive)
**WHEN** `listDelegations({ organizationId })` is called
**THEN** all 3 records are returned, sorted by `createdAt DESC`

---

### TC-023: Zero-step flow is unaffected by delegation check

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** an `approveRequest` call for a request that has zero approval steps
**WHEN** the usecase executes the zero-step path
**THEN** no `findActiveByToUserId` call is made and the existing zero-step behavior is preserved

---

### TC-024: organizationId resolved from session in Server Actions

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `createDelegationAction` is invoked with a client-supplied payload
**WHEN** the action resolves the `organizationId` to use
**THEN** `organizationId` is taken exclusively from the authenticated server-side session, and the `organizationId` field is absent from (or ignored in) the user-provided input

---

### TC-025: bun run build succeeds after full implementation

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-16

**GIVEN** all implementation tasks T-01 through T-15 are complete
**WHEN** `bun run build` is executed
**THEN** the build completes with no TypeScript or compilation errors

---

### TC-026: Domain service does not import repository (dependency direction)

**Category**: manual
**Priority**: should
**Source**: design.md > D3 / tasks.md > T-16

**GIVEN** `src/domain/services/approvalStepService.ts` containing `canApprove` and `canApproveWithDelegation`
**WHEN** the source file is reviewed for imports
**THEN** neither function imports nor calls `approvalDelegationRepository`; delegation data is passed as a function argument, keeping the domain service a pure function

---

### TC-027: ApprovalDelegation type exported from domain/models/index.ts

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-02 / T-14

**GIVEN** `src/domain/models/index.ts` and `src/domain/models/approvalDelegation.ts`
**WHEN** `ApprovalDelegation` is imported from `src/domain/models`
**THEN** the type resolves without TypeScript error and contains all required fields (`id`, `fromUserId`, `toUserId`, `fromUserRole`, `organizationId`, `startDate`, `endDate`, `isActive`, `createdAt`)

---

### TC-028: Seed data creates one delegation record

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-15

**GIVEN** an empty database
**WHEN** `bun run seed` is executed
**THEN** exactly one `approval_delegations` record is created (managerUser → adminUser, `startDate` = seed execution date, `endDate` = seed date + 7 days, `isActive = true`)

---

## Result

```yaml
result: completed
total: 28
automated: 25
manual: 3
must: 17
should: 9
could: 2
blocked_reasons: []
```
