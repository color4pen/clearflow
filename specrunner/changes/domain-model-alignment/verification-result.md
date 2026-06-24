# Verification Result — domain-model-alignment — iter 1

## Verdict: passed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | build | passed | 11.2s | 0 |
| 2 | typecheck | passed | 1.0s | 0 |
| 3 | test | passed | 0.4s | 0 |
| 4 | lint | passed | 4.2s | 0 |

## Phase: build

```
▲ Next.js 16.2.9 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 6.0s
  Running TypeScript ...
  Finished TypeScript in 3.7s ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/28) ...
  Generating static pages using 7 workers (7/28) 
  Generating static pages using 7 workers (14/28) 
  Generating static pages using 7 workers (21/28) 
✓ Generating static pages using 7 workers (28/28) in 138ms
  Finalizing page optimization ...

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
├ ƒ /settings/templates
├ ƒ /settings/templates/[id]/edit
├ ƒ /settings/templates/new
├ ƒ /settings/users
├ ƒ /settings/webhooks
└ ƒ /settings/webhooks/[id]/deliveries


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand


$ next build

```

## Phase: typecheck

```
$ tsc --noEmit

```

## Phase: test

```
bun test v1.3.12 (700fc117)

$ bun test

src/__tests__/domain/domainEvents.test.ts:
[EventDispatcher] Async handler for "inquiry.converted" threw an error: 144 |     await new Promise((r) => setTimeout(r, 20));
145 |     expect(called).toEqual(["async"]);
146 |   });
147 | 
148 |   it("async handler exception does NOT propagate to flushAsync() caller", async () => {
149 |     d.on("inquiry.converted", async () => { throw new Error("async-error"); }, "async");
                                                            ^
error: async-error
      at <anonymous> (src/__tests__/domain/domainEvents.test.ts:149:55)
      at flushAsync (src/domain/events/dispatcher.ts:62:38)
      at <anonymous> (src/__tests__/domain/domainEvents.test.ts:155:11)
      at run (node:async_hooks:62:22)
      at <anonymous> (src/__tests__/domain/domainEvents.test.ts:152:13)


 776 pass
 0 fail
 1731 expect() calls
Ran 776 tests across 39 files. [354.00ms]

```

## Phase: lint

```

src/app/(dashboard)/requests/BulkApprovalPanel.tsx
  34:10  warning  'formatAmount' is defined but never used  @typescript-eslint/no-unused-vars

src/app/(dashboard)/settings/templates/DeleteButton.tsx
  10:24  warning  '_prev' is defined but never used      @typescript-eslint/no-unused-vars
  10:38  warning  '_formData' is defined but never used  @typescript-eslint/no-unused-vars

src/app/components/FormField.tsx
  1:26  warning  'FormEvent' is defined but never used  @typescript-eslint/no-unused-vars

src/app/components/MarkdownTextarea.tsx
  6:10  warning  'Textarea' is defined but never used  @typescript-eslint/no-unused-vars

src/infrastructure/seed.ts
  504:10  warning  'greenContact1' is assigned a value but never used       @typescript-eslint/no-unused-vars
  545:10  warning  'newInquiry1' is assigned a value but never used         @typescript-eslint/no-unused-vars
  554:10  warning  'newInquiry2' is assigned a value but never used         @typescript-eslint/no-unused-vars
  562:10  warning  'inProgressInquiry1' is assigned a value but never used  @typescript-eslint/no-unused-vars
  572:10  warning  'inProgressInquiry2' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 10 problems (0 errors, 10 warnings)


$ eslint

```
