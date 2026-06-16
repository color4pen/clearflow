# Verification Result — foundation-db-auth-domain — iter 1

## Verdict: failed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | build | passed | 6.9s | 0 |
| 2 | typecheck | skipped | — | — |
| 3 | test | skipped | — | — |
| 4 | lint | passed | 1.5s | 0 |
| 5 | security | skipped | — | — |
| 6 | test-coverage | failed | 0.0s | 1 |

## Phase: build

```
▲ Next.js 16.2.9 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 4.0s
  Running TypeScript ...
  Finished TypeScript in 1716ms ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/7) ...
  Generating static pages using 7 workers (1/7) 
  Generating static pages using 7 workers (3/7) 
  Generating static pages using 7 workers (5/7) 
✓ Generating static pages using 7 workers (7/7) in 105ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/auth/[...nextauth]
├ ○ /login
├ ƒ /requests
├ ƒ /requests/[id]
└ ƒ /requests/new


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
  59:3  warning  '_formData' is defined but never used  @typescript-eslint/no-unused-vars
  76:3  warning  '_formData' is defined but never used  @typescript-eslint/no-unused-vars
  94:3  warning  '_formData' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (0 errors, 3 warnings)


$ eslint

```

## Phase: security

_(skipped — script not found in package.json)_

## Phase: test-coverage

Step 'test-coverage' failed

```
test-coverage: 0/46 must TCs covered
Missing: TC-001, TC-002, TC-003, TC-004, TC-005, TC-007, TC-008, TC-009, TC-010, TC-011, TC-012, TC-013, TC-014, TC-015, TC-016, TC-017, TC-018, TC-019, TC-020, TC-021, TC-022, TC-023, TC-024, TC-025, TC-026, TC-027, TC-028, TC-029, TC-031, TC-032, TC-033, TC-034, TC-035, TC-036, TC-039, TC-040, TC-041, TC-042, TC-044, TC-045, TC-046, TC-048, TC-050, TC-056, TC-058, TC-059
```
