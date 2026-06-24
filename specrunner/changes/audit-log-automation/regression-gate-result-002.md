# Regression Gate Result — Iteration 2

- **verdict**: approved

## Summary

Both findings from the Findings Ledger are confirmed fixed. No regressions detected.

## Finding Verification

### [LOW] unawaited dispatch() calls — brittle timing dependency
- **File**: src/__tests__/domain/domainEvents.test.ts
- **Status**: FIXED

All previously unawaited `d.dispatch()` calls are now properly awaited. The only remaining non-awaited call is line 76, which carries an explicit comment `// intentional: not awaited — verifies sync handler runs synchronously before any await resolves`. This is the intentional exception identified in the original rationale ("line 75 は 'sync handler runs immediately' を検証する intentional な非 await であり問題なし"). All other dispatch() calls (lines 87, 106, 127, 142, 153, 167, 190, 204, 218, 256, 269, 298, 315, 319, 334, 347) are awaited.

### [LOW] TC-002: options propagation to sync handlers lacks dedicated unit test
- **File**: src/__tests__/domain/domainEvents.test.ts
- **Status**: FIXED

A dedicated unit test exists at lines 120–131:

```typescript
it("TC-002: options (tx) are propagated to sync handlers", async () => {
  let receivedOptions: { tx?: unknown } | undefined;
  d.on("inquiry.converted", (_event, options) => {
    receivedOptions = options;
  }, "sync");

  await d.runInContext(async () => {
    await d.dispatch(makeEvent("inquiry.converted"), { tx: "mock-tx" });
  });

  expect(receivedOptions?.tx).toBe("mock-tx");
});
```

This directly asserts that `mockTx` passed via `dispatch(event, { tx: "mock-tx" })` is received by the sync handler — no indirect static analysis, full runtime verification.

## Contradictions

None. The two fixes are independent and do not reintroduce each other.
