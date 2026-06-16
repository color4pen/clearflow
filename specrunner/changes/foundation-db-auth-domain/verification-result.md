# Verification Result — foundation-db-auth-domain — iter 1

## Verdict: failed

errorCode: PACKAGE_JSON_SCRIPTS_TAMPERED

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | package-json-integrity | failed | 0.0s | — |

## Phase: package-json-integrity

Step 'package-json-integrity' failed

```
Baseline scripts:
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}

Current scripts:
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "bun test",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:seed": "bun run src/infrastructure/seed.ts"
}
```
