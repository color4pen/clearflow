# Verification Result — template-form-definition — iter 1

## Verdict: failed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | build | passed | 12.1s | 0 |
| 2 | typecheck | passed | 2.2s | 0 |
| 3 | test | passed | 0.1s | 0 |
| 4 | lint | failed | 4.0s | 1 |

## Phase: build

```
▲ Next.js 16.2.9 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 5.9s
  Running TypeScript ...
  Finished TypeScript in 2.3s ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/15) ...
  Generating static pages using 7 workers (3/15) 
  Generating static pages using 7 workers (7/15) 
  Generating static pages using 7 workers (11/15) 
✓ Generating static pages using 7 workers (15/15) in 141ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/audit-logs/export
├ ƒ /api/auth/[...nextauth]
├ ƒ /api/cron/expire-requests
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

 410 pass
 0 fail
 830 expect() calls
Ran 410 tests across 19 files. [93.00ms]

```

## Phase: lint

Step 'lint' failed

```

src/app/(dashboard)/ThemeToggle.tsx
  15:7  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

src/app/(dashboard)/ThemeToggle.tsx:15:7
  13 |
  14 |     if (prefersDark) {
> 15 |       setDark(true);
     |       ^^^^^^^ Avoid calling setState() directly within an effect
  16 |       document.documentElement.dataset.theme = "dark";
  17 |     }
  18 |   }, []);  react-hooks/set-state-in-effect

src/app/(dashboard)/requests/BulkApprovalPanel.tsx
  34:10  warning  'formatAmount' is defined but never used  @typescript-eslint/no-unused-vars

src/app/(dashboard)/requests/new/page.tsx
  46:7  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

src/app/(dashboard)/requests/new/page.tsx:46:7
  44 |     if (selectedTemplateId) {
  45 |       const tmpl = templates.find((t) => t.id === selectedTemplateId) ?? null;
> 46 |       setSelectedTemplate(tmpl);
     |       ^^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  47 |     } else {
  48 |       setSelectedTemplate(null);
  49 |     }  react-hooks/set-state-in-effect

src/app/(dashboard)/settings/templates/DeleteButton.tsx
  10:24  warning  '_prev' is defined but never used      @typescript-eslint/no-unused-vars
  10:38  warning  '_formData' is defined but never used  @typescript-eslint/no-unused-vars

✖ 5 problems (2 errors, 3 warnings)


$ eslint
error: script "lint" exited with code 1

```
