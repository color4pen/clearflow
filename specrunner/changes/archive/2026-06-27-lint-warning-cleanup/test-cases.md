# Test Cases: lint-warning-cleanup

<!-- FORMAT REQUIREMENTS:
Test Case heading format: `### TC-{NNN}: {Name}` (3-digit zero-padded, e.g. TC-001)

Required fields per test case:
  **Category**: unit | integration | manual
  **Priority**: must | should | could
  **Source**: reference to spec Scenario (spec.md > Requirement: <name> > Scenario: <name>) or design.md / tasks.md section

GIVEN/WHEN/THEN structure (mixed format — depends on TC type):
  Scenario 由来 TC (Source = spec.md > Requirement: <name> > Scenario: <name>):
    GWT は記述しない。Source 参照のみ。behavior の正典は spec の Scenario。
  非 Scenario 由来 TC (Source = design.md or tasks.md section):
    GWT は必須:
    **GIVEN** <preconditions>
    **WHEN** <action>
    **THEN** <expected result>

Category determination:
  unit        — pure logic, validation, helper functions (automated)
  integration — DB operations, API endpoints, multi-module interaction (automated)
  manual      — UI/UX confirmation, visual verification, build artifact check (not automated)

Priority determination:
  must   — core functionality; if broken, the feature does not work
  should — important but core still works; edge cases, error handling
  could  — nice to have; performance, UX details

Summary section MUST appear immediately after the title with ALL 4 items:
  ## Summary
  - **Total**: {count} cases
  - **Automated** (unit/integration): {count}
  - **Manual**: {count}
  - **Priority**: must: {count}, should: {count}, could: {count}

Result section MUST appear at the very end as a YAML code block:
  ## Result
  ```yaml
  result: completed | partial | failed
  total: {count}
  automated: {count}
  manual: {count}
  must: {count}
  should: {count}
  could: {count}
  blocked_reasons: []
  ```

  result determination:
    completed — all testable behaviors are documented
    partial   — some cases could not be derived due to design ambiguity
    failed    — spec is absent AND design.md / tasks.md are also missing
-->

## Summary

- **Total**: 16 cases
- **Automated** (unit/integration): 4
- **Manual**: 12
- **Priority**: must: 13, should: 3, could: 0

---

## Category: Lint クリーン

### TC-001: 全 lint warning が解消されている

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: lint warning ゼロの維持 > Scenario: 全 lint warning が解消されている

---

## Category: 挙動の不変性

### TC-002: ビルドと型チェックが成功する

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 挙動の不変性 > Scenario: ビルドと型チェックが成功する

---

### TC-003: seed のデータ投入件数が不変である

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 挙動の不変性 > Scenario: seed のデータ投入件数が不変である

---

## Category: 未使用 import 除去

### TC-004: InquiryInfoSection.tsx から Textarea import が除去されている

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md T-01 AC

**GIVEN** `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx` の import 文を確認する  
**WHEN** ファイルの内容を静的検査する  
**THEN** `Textarea` が named import リストに含まれておらず、`Input`・`Select`・`MarkdownTextarea`・`preventEnterSubmit` は残っている

---

### TC-005: FormField.tsx から FormEvent import が除去されている

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md T-01 AC

**GIVEN** `src/app/components/FormField.tsx` の `import type` 文を確認する  
**WHEN** ファイルの内容を静的検査する  
**THEN** `FormEvent` が import リストに含まれておらず、`ReactNode` および `KeyboardEvent as ReactKeyboardEvent` は残っている

---

### TC-006: MarkdownTextarea.tsx から Textarea import 行が全削除されている

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md T-01 AC

**GIVEN** `src/app/components/MarkdownTextarea.tsx` のソースを確認する  
**WHEN** ファイルの内容を静的検査する  
**THEN** `import { Textarea } from "./FormField"` の行が存在しない

---

### TC-007: 未使用 import 除去後も残りの import は変更されていない

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md T-01 AC

**GIVEN** T-01 対象 3 ファイル（InquiryInfoSection.tsx・FormField.tsx・MarkdownTextarea.tsx）の変更差分を確認する  
**WHEN** 変更前後の import 文を比較する  
**THEN** 除去対象シンボル以外の import が追加・削除・変更されていない

---

### TC-008: 対象ファイルに eslint-disable コメントが追加されていない

- **Category**: manual
- **Priority**: must
- **Source**: design.md D1 / request.md スコープ外

**GIVEN** T-01 の対象 3 ファイルの差分を確認する  
**WHEN** `eslint-disable` を含む行を検索する  
**THEN** 本変更で追加された `eslint-disable` コメントが 0 件である

---

## Category: ESLint 設定

### TC-009: eslint.config.mjs に argsIgnorePattern が追加されている

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md T-02 AC

**GIVEN** `eslint.config.mjs` の内容を確認する  
**WHEN** ルール設定を静的検査する  
**THEN** `@typescript-eslint/no-unused-vars` に `argsIgnorePattern: "^_"` が設定されており、severity は `"warn"` である

---

### TC-010: DeleteButton.tsx のソースコードが変更されていない

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md T-02 AC

**GIVEN** `src/app/(dashboard)/settings/templates/DeleteButton.tsx` の差分を確認する  
**WHEN** 変更前後を比較する  
**THEN** ファイルに一切の差分がなく、`_prev`・`_formData` 引数がそのまま残っている

---

### TC-011: _プレフィックスなし未使用引数は引き続き警告される

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md T-02 AC

**GIVEN** `argsIgnorePattern: "^_"` が追加された `eslint.config.mjs` を使用する環境  
**WHEN** `_` プレフィックスのない未使用引数（例: `unusedArg`）を含むコードを lint する  
**THEN** その引数に対して `@typescript-eslint/no-unused-vars` の warning が出力される

---

## Category: Seed 整合性

### TC-012: seed.ts の 5 件の const 束縛が除去されている

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md T-03 AC

**GIVEN** `src/infrastructure/seed.ts` の変更差分を確認する  
**WHEN** L517・L558・L567・L575・L585 付近を検査する  
**THEN** `const [greenContact1]`・`const [newInquiry1]`・`const [newInquiry2]`・`const [inProgressInquiry1]`・`const [inProgressInquiry2]` の束縛宣言が存在せず、`await db.insert(...).values({...}).returning()` 式のみが残っている

---

### TC-013: seed.ts の insert チェーン（values / returning）が変更されていない

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md T-03 AC

**GIVEN** seed.ts の 5 件の変更箇所を確認する  
**WHEN** `.insert(...).values({...}).returning()` チェーンを変更前後で比較する  
**THEN** `values({...})` の内容と `.returning()` チェーンがすべて変更前と同一である

---

## Category: 品質ゲート

### TC-014: bun test が green である

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md T-04 AC

**GIVEN** 全変更（T-01〜T-03）が適用されたコードベース  
**WHEN** `bun test` を実行する  
**THEN** 全テストが pass し、exit code が 0 である

---

### TC-015: typecheck が green である

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md T-04 AC / request.md 受け入れ基準

**GIVEN** 全変更が適用されたコードベース  
**WHEN** `bun run typecheck`（または相当の `tsc --noEmit`）を実行する  
**THEN** 型エラーが 0 件であり、exit code が 0 である

---

### TC-016: 全対象ファイルに eslint-disable コメントが追加されていない

- **Category**: manual
- **Priority**: must
- **Source**: request.md スコープ外 / design.md Goals

**GIVEN** 本変更で修正されたすべてのファイルの差分を確認する  
**WHEN** `eslint-disable` を含む行を全ファイルで検索する  
**THEN** 本変更で新たに追加された `eslint-disable` コメントが 0 件である

---

### TC-017: lint warning を 0 にするための変更が eslint 設定変更と未使用シンボル除去のみである

- **Category**: manual
- **Priority**: should
- **Source**: design.md Goals / request.md スコープ外

**GIVEN** 本変更の全差分（git diff）を確認する  
**WHEN** 変更されたファイルと変更内容を一覧する  
**THEN** 変更対象が InquiryInfoSection.tsx・FormField.tsx・MarkdownTextarea.tsx（import 除去）、eslint.config.mjs（ルール追加）、seed.ts（const 束縛除去）の 5 ファイルのみであり、それ以外のファイルに差分がない

---

## Result

```yaml
result: completed
total: 16
automated: 4
manual: 12
must: 13
should: 3
could: 0
blocked_reasons: []
```
