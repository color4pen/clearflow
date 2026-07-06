# Verification Result — mcp-tools-finance — iter 1

## Verdict: passed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | build | passed | 17.2s | 0 |
| 2 | typecheck | passed | 4.2s | 0 |
| 3 | test | passed | 0.7s | 0 |
| 4 | lint | passed | 6.0s | 0 |

## Phase: build

```
▲ Next.js 16.2.9 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 9.0s
  Running TypeScript ...
  Finished TypeScript in 4.4s ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/41) ...
  Generating static pages using 7 workers (10/41) 
  Generating static pages using 7 workers (20/41) 
  Generating static pages using 7 workers (30/41) 
✓ Generating static pages using 7 workers (41/41) in 167ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /.well-known/oauth-authorization-server
├ ƒ /.well-known/oauth-protected-resource
├ ƒ /account
├ ƒ /api/audit-logs/export
├ ƒ /api/auth/[...nextauth]
├ ƒ /api/cron/expire-requests
├ ƒ /api/mcp
├ ƒ /api/oauth/authorize
├ ƒ /api/oauth/register
├ ƒ /api/oauth/token
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
├ ƒ /oauth/consent
├ ƒ /platform
├ ƒ /requests
├ ƒ /requests/[id]
├ ƒ /requests/new
├ ƒ /revenue
├ ƒ /revenue/details
├ ƒ /revenue/forecast
├ ƒ /settings/audit-logs
├ ƒ /settings/delegations
├ ƒ /settings/organization
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


src/__tests__/usecases/provisionOrganization.dynamic.test.ts:
[provisionOrganization] unexpected error: 57 | // userRepository の個別ファイルモック
58 | mock.module("@/infrastructure/repositories/userRepository", () => ({
59 |   existsByEmail: async (_email: string) => state.emailExists,
60 |   create: async (data: Record<string, unknown>, _tx?: unknown) => {
61 |     state.userCreateArgs = data;
62 |     if (state.failAtUserCreate) throw new Error("userRepository.create failed (simulated)");
                                               ^
error: userRepository.create failed (simulated)
      at create (src/__tests__/usecases/provisionOrganization.dynamic.test.ts:62:43)
      at <anonymous> (src/application/usecases/provisionOrganization.ts:37:47)
      at async <anonymous> (src/__tests__/usecases/provisionOrganization.dynamic.test.ts:40:13)
      at async provisionOrganization (src/application/usecases/provisionOrganization.ts:31:14)
      at async <anonymous> (src/__tests__/usecases/provisionOrganization.dynamic.test.ts:228:26)


src/__tests__/usecases/approvalPolicyFlow.test.ts:
[evaluatePolicies] Policy policy-1 has conditionField set but null conditionOperator or conditionValue — skipping
[handleApprovalCompleted] originTriggerEntityId is null for requestId: req-1

 1809 pass
 0 fail
 3884 expect() calls
Ran 1809 tests across 120 files. [720.00ms]

```

## Phase: lint

```
$ eslint

```
