# Verification Result — audit-record-helper — iter 1

## Verdict: failed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | build | passed | 17.4s | 0 |
| 2 | typecheck | passed | 3.6s | 0 |
| 3 | test | failed | 0.4s | 1 |
| 4 | lint | skipped | — | — |

## Phase: build

```
▲ Next.js 16.2.9 (webpack)

  Creating an optimized production build ...
✓ Compiled successfully in 7.5s
  Running TypeScript ...
  Finished TypeScript in 3.8s ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/31) ...
  Generating static pages using 7 workers (7/31) 
  Generating static pages using 7 workers (15/31) 
  Generating static pages using 7 workers (23/31) 
✓ Generating static pages using 7 workers (31/31) in 138ms
  Finalizing page optimization ...
  Collecting build traces ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/audit-logs/export
├ ƒ /api/auth/[...nextauth]
├ ƒ /api/cron/expire-requests
├ ƒ /api/revenue/export
├ ƒ /clients
├ ƒ /clients/[id]
├ ƒ /clients/new
├ ƒ /contracts
├ ƒ /contracts/[id]
├ ƒ /contracts/[id]/invoices/[invoiceId]
├ ƒ /contracts/[id]/invoices/new
├ ƒ /contracts/new
├ ƒ /dashboard
├ ƒ /deals
├ ƒ /deals/[id]
├ ƒ /deals/[id]/meetings/[meetingId]
├ ƒ /deals/[id]/meetings/new
├ ƒ /deals/new
├ ƒ /inquiries
├ ƒ /inquiries/[id]
├ ƒ /inquiries/new
├ ○ /login
├ ƒ /requests
├ ƒ /requests/[id]
├ ƒ /requests/new
├ ƒ /revenue
├ ƒ /revenue/details
├ ƒ /revenue/forecast
├ ƒ /settings/audit-logs
├ ƒ /settings/delegations
├ ƒ /settings/policies
├ ƒ /settings/policies/[id]/edit
├ ƒ /settings/policies/new
├ ƒ /settings/templates
├ ƒ /settings/templates/[id]/edit
├ ƒ /settings/templates/new
├ ƒ /settings/users
├ ƒ /settings/webhooks
├ ƒ /settings/webhooks/[id]/deliveries
└ ƒ /tasks


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand


$ next build --webpack

```

## Phase: typecheck

```
$ tsc --noEmit

```

## Phase: test

Step 'test' failed

```
bun test v1.3.12 (700fc117)

$ bun test

src/__tests__/static/projectStructure.test.ts:
731 |    */
732 |   it("TC-058: build script is configured in package.json", async () => {
733 |     const content = await readRoot("package.json");
734 |     const pkg = JSON.parse(content);
735 |     expect(pkg.scripts).toBeDefined();
736 |     expect(pkg.scripts.build).toBe("next build");
                                    ^
error: expect(received).toBe(expected)

Expected: "next build"
Received: "next build --webpack"

      at <anonymous> (src/__tests__/static/projectStructure.test.ts:736:31)
(fail) Build and lint > TC-058: build script is configured in package.json [2.58ms]

src/__tests__/domain/domainEvents.test.ts:
[EventDispatcher] Async handler for "inquiry.converted" threw an error: 158 |     await new Promise((r) => setTimeout(r, 20));
159 |     expect(called).toEqual(["async"]);
160 |   });
161 | 
162 |   it("async handler exception does NOT propagate to flushAsync() caller", async () => {
163 |     d.on("inquiry.converted", async () => { throw new Error("async-error"); }, "async");
                                                            ^
error: async-error
      at <anonymous> (src/__tests__/domain/domainEvents.test.ts:163:55)
      at flushAsync (src/domain/events/dispatcher.ts:65:38)
      at <anonymous> (src/__tests__/domain/domainEvents.test.ts:169:11)
      at async <anonymous> (src/__tests__/domain/domainEvents.test.ts:166:13)


src/__tests__/usecases/approvalPolicyFlow.test.ts:
[evaluatePolicies] Policy policy-1 has conditionField set but null conditionOperator or conditionValue — skipping
[handleApprovalCompleted] originTriggerEntityId is null for requestId: req-1

 1128 pass
 1 fail
 2359 expect() calls
Ran 1129 tests across 56 files. [414.00ms]
error: script "test" exited with code 1

```

## Phase: lint

_(skipped — previous command failed)_
