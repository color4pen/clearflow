# Regression Gate Result — audit-log-automation — iter 001

- **verdict**: needs-fix
- **iteration**: 001

## Verification Summary

Both findings from the ledger are **still present**. The `code-fixer` commit (83246e3) made no source code changes — only `events.jsonl`, `state.json`, and `usage.json` were updated. Neither finding was fixed.

## Findings

### [HIGH] unawaited dispatch() calls — brittle timing dependency (REGRESSION)

- **File**: src/__tests__/domain/domainEvents.test.ts
- **Severity**: high
- **Resolution**: fixable
- **Status**: NOT fixed — regression confirmed

Lines 128, 139, 153, 176, 190, 204, 242, 255, 301, 305, 320 still call `d.dispatch()` without `await`. The implementer commit (57d14b0) added `await` to 4 other call sites (lines 86, 105, 284, 333 in current file), but none of those correspond to the 10 locations identified in the review finding. The unawaited calls are brittle because `dispatch()` is now `async` and internally `await`s sync handlers; any future change adding a leading `await` inside dispatch could break these tests silently.

Unawaited calls remaining:
- Line 128: "async handler is NOT called during dispatch()"
- Line 139: "async handler IS called after flushAsync()"
- Line 153: "async handler exception does NOT propagate to flushAsync() caller"
- Line 176: "runInContext creates an isolated buffer"
- Line 190: "buffer is auto-discarded when callback returns null-like value"
- Line 204: "buffer is auto-discarded when callback throws"
- Line 242: concurrent scope ctx1
- Line 255: concurrent scope ctx2
- Line 301, 305: "handlers for different event types do not interfere"
- Line 320: "reset() clears all registered handlers"

**Required fix**: Add `await` to each of the above call sites. Line 75 is intentional and should be left as-is (with a comment confirming the intent).

### [HIGH] TC-002: options propagation to sync handlers — no dedicated unit test (REGRESSION)

- **File**: src/__tests__/domain/domainEvents.test.ts
- **Severity**: high
- **Resolution**: fixable
- **Status**: NOT fixed — regression confirmed

No test asserting that `dispatch(event, { tx: mockTx })` delivers `mockTx` to the sync handler's `options` argument exists anywhere in the file. The grep for `received_options`, `mock.*tx`, `tx.*mock`, and `TC-002` all returned no matches.

**Required fix**: Add a test that:
1. Registers a sync handler via `d.on(...)` that captures its `options` argument
2. Calls `await d.dispatch(event, { tx: "mock-tx" })`
3. Asserts `expect(receivedOptions?.tx).toBe("mock-tx")`
