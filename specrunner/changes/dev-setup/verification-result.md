# Verification Result — dev-setup — iter 1

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
  "db:push": "bunx drizzle-kit push",
  "db:generate": "bunx drizzle-kit generate",
  "db:seed": "bun src/infrastructure/seed.ts",
  "db:reset": "bun src/infrastructure/reset.ts"
}
```
