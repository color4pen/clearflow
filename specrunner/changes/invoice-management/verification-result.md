# Verification Result — invoice-management — iter 1

## Verdict: passed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | build | passed | 13.9s | 0 |
| 2 | typecheck | passed | 3.4s | 0 |
| 3 | test | passed | 0.1s | 0 |
| 4 | lint | passed | 4.6s | 0 |

## Phase: build

```
▲ Next.js 16.2.9 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 8.8s
  Running TypeScript ...
  Finished TypeScript in 3.6s ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/22) ...
  Generating static pages using 7 workers (5/22) 
  Generating static pages using 7 workers (10/22) 
  Generating static pages using 7 workers (16/22) 
✓ Generating static pages using 7 workers (22/22) in 176ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/audit-logs/export
├ ƒ /api/auth/[...nextauth]
├ ƒ /api/cron/expire-requests
├ ƒ /clients
├ ƒ /clients/[id]
├ ƒ /clients/new
├ ƒ /contracts
├ ƒ /contracts/[id]
├ ƒ /contracts/[id]/edit
├ ƒ /deals
├ ƒ /deals/[id]
├ ƒ /deals/[id]/edit
├ ƒ /deals/[id]/meetings/[meetingId]
├ ƒ /deals/[id]/meetings/new
├ ƒ /deals/new
├ ƒ /inquiries
├ ƒ /inquiries/[id]
├ ƒ /inquiries/[id]/edit
├ ƒ /inquiries/[id]/meetings/[meetingId]
├ ƒ /inquiries/[id]/meetings/new
├ ƒ /inquiries/new
├ ○ /login
├ ƒ /requests
├ ƒ /requests/[id]
├ ƒ /requests/new
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
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
 We detected multiple lockfiles and selected the directory of ~/Documents/GitHub/clearflow/bun.lock as the root directory.
 To silence this warning, set `turbopack.root` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
   See https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory for more information.
 Detected additional lockfiles: 
   * bun.lock


```

## Phase: typecheck

```
$ tsc --noEmit

```

## Phase: test

```
bun test v1.3.12 (700fc117)

$ bun test

 533 pass
 0 fail
 1076 expect() calls
Ran 533 tests across 25 files. [115.00ms]

```

## Phase: lint

```

src/app/(dashboard)/deals/[id]/page.tsx
  14:10  warning  'DealEditForm' is defined but never used  @typescript-eslint/no-unused-vars

src/app/(dashboard)/inquiries/[id]/edit/page.tsx
  3:29  warning  'clientRepository' is defined but never used  @typescript-eslint/no-unused-vars

src/app/(dashboard)/requests/BulkApprovalPanel.tsx
  34:10  warning  'formatAmount' is defined but never used  @typescript-eslint/no-unused-vars

src/app/(dashboard)/settings/templates/DeleteButton.tsx
  10:24  warning  '_prev' is defined but never used      @typescript-eslint/no-unused-vars
  10:38  warning  '_formData' is defined but never used  @typescript-eslint/no-unused-vars

src/infrastructure/seed.ts
  504:10  warning  'greenContact1' is assigned a value but never used  @typescript-eslint/no-unused-vars
  554:10  warning  'newInquiry2' is assigned a value but never used    @typescript-eslint/no-unused-vars

✖ 7 problems (0 errors, 7 warnings)


$ eslint

```
