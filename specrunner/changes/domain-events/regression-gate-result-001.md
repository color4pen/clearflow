# Regression Gate Result — Iteration 1

- **verdict**: approved

## Summary

All 5 findings from the ledger (3 distinct issues, 2 duplicates) are confirmed fixed.

## Finding Verification

### [HIGH] Edge Runtime: crypto static import (src/instrumentation.ts:1)

**Status: FIXED**

`instrumentation.ts` contains no static imports. The `register()` function guards the handler registration behind `process.env.NEXT_RUNTIME === "nodejs"` and uses a dynamic `import()`:

```ts
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerHandlers } = await import("@/infrastructure/handlers");
    registerHandlers();
  }
}
```

No Edge Runtime crash risk remains.

### [LOW] TC-027/TC-028: missing auto-tests (src/__tests__/usecases/webhookWorkflow.test.ts)

**Status: FIXED** (findings #2 and #4 are duplicates — both resolved)

Two dedicated describe blocks are present:

- **`TC-027: new domain events route through deliverToEndpoint`** (lines 309–363): verifies that each of the 10 new domain event types (`inquiry.converted`, `deal.won`, etc.) routes through `deliverDomainEventToEndpoints` → `deliverToEndpoint`, and does **not** call `deliverWebhookEvent` or `deliverSingleAttempt`.
- **`TC-028: approval events route through deliverWebhookEvent (resolves actorName)`** (lines 365–406): verifies that each of the 8 approval events routes through `deliverWebhookEvent`, and that `deliverWebhookEvent` resolves `actorName` via `userRepository`.

### [LOW] Misleading test name (src/__tests__/domain/domainEvents.test.ts:96)

**Status: FIXED** (findings #3 and #5 are duplicates — both resolved)

Line 96 now reads:

```ts
it("sync handler exception prevents buffering — async handler does not run", async () => {
```

This correctly describes the actual behaviour: when a sync handler throws, the event is not buffered and the async handler is never invoked.
