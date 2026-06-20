# Verification Result — domain-restructuring — iter 1

## Verdict: failed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | build | failed | 11.9s | 1 |
| 2 | typecheck | skipped | — | — |
| 3 | test | skipped | — | — |
| 4 | lint | skipped | — | — |

## Phase: build

Step 'build' failed

```
▲ Next.js 16.2.9 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 5.9s
  Running TypeScript ...

$ next build
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
 We detected multiple lockfiles and selected the directory of ~/Documents/GitHub/clearflow/bun.lock as the root directory.
 To silence this warning, set `turbopack.root` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
   See https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory for more information.
 Detected additional lockfiles: 
   * bun.lock

Failed to type check.

./src/infrastructure/seed.ts:2:10
Type error: Module '"drizzle-orm/pg-core"' has no exported member 'drizzle'.

  [90m1 |[0m [36mimport[0m bcrypt [36mfrom[0m [32m"bcryptjs"[0m;
[31m[1m>[0m [90m2 |[0m [36mimport[0m { drizzle } [36mfrom[0m [32m"drizzle-orm/pg-core"[0m;
  [90m  |[0m          [31m[1m^[0m
  [90m3 |[0m [36mimport[0m postgres [36mfrom[0m [32m"postgres"[0m;
  [90m4 |[0m [36mimport[0m {
  [90m5 |[0m   organizations,
Next.js build worker exited with code: 1 and signal: null
error: script "build" exited with code 1

```

## Phase: typecheck

_(skipped — previous command failed)_

## Phase: test

_(skipped — previous command failed)_

## Phase: lint

_(skipped — previous command failed)_
