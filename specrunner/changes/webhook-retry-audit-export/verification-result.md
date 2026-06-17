# Verification Result — webhook-retry-audit-export — iter 1

## Verdict: failed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | build | passed | 7.7s | 0 |
| 2 | typecheck | skipped | — | — |
| 3 | test | skipped | — | — |
| 4 | lint | passed | 2.4s | 0 |
| 5 | security | skipped | — | — |
| 6 | test-coverage | failed | 0.0s | 1 |

## Phase: build

```
▲ Next.js 16.2.9 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 4.4s
  Running TypeScript ...
  Finished TypeScript in 2.1s ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/10) ...
  Generating static pages using 7 workers (2/10) 
  Generating static pages using 7 workers (4/10) 
  Generating static pages using 7 workers (7/10) 
✓ Generating static pages using 7 workers (10/10) in 172ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/audit-logs/export
├ ƒ /api/auth/[...nextauth]
├ ○ /login
├ ƒ /requests
├ ƒ /requests/[id]
├ ƒ /requests/new
├ ƒ /settings/audit-logs
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

_(skipped — script not found in package.json)_

## Phase: test

_(skipped — script not found in package.json)_

## Phase: lint

```

src/app/actions/requests.ts
   73:3  warning  '_formData' is defined but never used  @typescript-eslint/no-unused-vars
   97:3  warning  '_formData' is defined but never used  @typescript-eslint/no-unused-vars
  159:3  warning  '_formData' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (0 errors, 3 warnings)


$ eslint

```

## Phase: security

_(skipped — script not found in package.json)_

## Phase: test-coverage

Step 'test-coverage' failed

```
test-coverage: 36/37 must TCs covered
Missing: TC-043
```
