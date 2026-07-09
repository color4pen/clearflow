# Regression Gate Result — Iteration 3

- **verdict**: approved

## Findings Verified

### [MEDIUM] internalAttendees / externalAttendees の describe が advertised inputSchema に到達しない

- **File**: src/app/api/mcp/schemaHelpers.ts:66
- **Status**: fixed ✅
- **Verification**:
  `buildAdvertisementSchema` (lines 65–96) now separates type-shape tracking (`mergedFieldTypes`, first-win) from description tracking (`mergedDescriptions`, first non-undefined win across all schemas). After merging, descriptions are re-applied at the top level via `.describe(description)` (line 95). This ensures that even when `createMeetingSchema` is passed before `updateMeetingSchema` and lacks a `describe` on `internalAttendees`/`externalAttendees`, the description defined in `updateMeetingSchema` is still discovered and surfaced in the advertised `inputSchema`.

## Regressions

None.

## Contradictions

None.
