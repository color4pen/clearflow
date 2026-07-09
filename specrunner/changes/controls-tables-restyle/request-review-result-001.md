# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | MEDIUM | Scope | `src/__tests__/static/uiBusinessStyle.test.ts` — TC-003, TC-004 | 既存の静的テストが実装後に壊れる。TC-003 は `BTN_DANGER` に `underline` が含まれることをアサート（新定義では `bg-danger text-white` の塗りボタンとなり `underline` がない）。TC-004 は `BTN_SUBMIT` が定義されていることをアサート（request は `BTN_PRIMARY` に統合して廃止）。受け入れ基準は「クラス名固定テストの期待値追随は可」と明示しているため実装で更新可能だが、対象テストケースを実装者が見落とすリスクがある。 | 実装者は styles.ts 変更と同時に TC-003 の `underline` アサーションを削除し `bg-danger` / `rounded` のアサーションに置換すること。TC-004 は BTN_SUBMIT の廃止に合わせて BTN_PRIMARY をアサートする形に書き換えること。 |
| 2 | MEDIUM | Scope | `src/app/(dashboard)/` — 4 ファイル以外の多数のファイル | 受け入れ基準の「grep がゼロ件になること」は `(dashboard)` 配下の全ファイルを対象とするが、request の Section 2 で明示的に言及されているのは 4 ファイルのみ。実際の grep では約 25 ファイル・40 件超の追加箇所が存在する（`bg-green-600` が多数の inline action button、`bg-red-500` が NotificationPanel バッジ、`bg-amber-50 border-amber-300 text-amber-800` が contracts の期限警告バナー、settings/account 配下の success/error アラート多数など）。token への対応付けは文脈から推論可能だが、`bg-red-500`（#ef4444）→ `bg-danger`（#dc2626 = red-600）のように厳密には別シェードへの置換が生じる箇所がある。 | 実装者は `grep -rE '(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|emerald)-[0-9]+' src/app/\(dashboard\)` を先頭に実行して全件を把握してから作業に着手すること。red-500 → `text-danger`/`bg-danger` はセマンティクス上の正当な置換であり許容範囲。 |
| 3 | MEDIUM | Scope | `src/app/components/LinkButton.tsx` — `SubmitButton` | request は「BTN_SUBMIT は BTN_PRIMARY に統合」と宣言しているが、既存の `SubmitButton` コンポーネント（全フォームで使用）は `px-3.5`・`hover` なし の独自クラスを持ち、新しい `BTN_PRIMARY`（`px-4 hover:opacity-90`）と padding / hover の定義が食い違う。フォーム送信ボタンを「PRIMARY / SECONDARY に統一」するためには `SubmitButton` コンポーネントのクラスも新 BTN_PRIMARY に揃える必要があるが、request はこれに言及していない。 | 実装者は `SubmitButton` のクラスを新 `BTN_PRIMARY` の定義（`px-4 py-1.5 hover:opacity-90`）に揃えること。SubmitButton 利用箇所は全フォーム画面であり視覚変化が生じるが、これは request の button 統一意図と合致する。 |
| 4 | LOW | Clarity | request.md §5 — `dueDateClass` 配置 | 「UI 層（`src/app/(dashboard)/` 配下の共有位置）に新設」と記載されているが、具体的なファイル名が指定されていない。`styles.ts` に追加する / 新規 `utils.ts` を作成する / `components/` 配下に置くなど複数の解釈がある。 | 新規ファイル `src/app/(dashboard)/dueDateUtils.ts`（またはスタイル定数と同居させる場合は `styles.ts`）のいずれかを選択し、テストファイル側のインポートパスを一致させること。どちらを選んでも要件を満たす。 |
| 5 | LOW | Clarity | `src/app/(dashboard)/styles.ts` — `INPUT_BASE` | `INPUT_BASE` は styles.ts に定義されているが、`(dashboard)` 配下のいかなるファイルにも import されていない（`SELECT_BASE` は UserRoleSelect.tsx 1 箇所のみ）。一方、共有コンポーネント `FormField.tsx` の `Input` / `Select` はすでに `bg-bg-surface text-text placeholder:text-text-placeholder` を含む適切なトークン参照クラスを実装済み。request の「INPUT_BASE / SELECT_BASE を正とし揃える」指示は styles.ts の定数を FormField.tsx の実装に合わせて更新することを意味するが、INPUT_BASE を更新しても import がないため表示には影響しない。 | 実装者は INPUT_BASE を FormField.tsx の Input クラスと同内容に更新することで定数の一貫性を保つこと（表示変化なし）。SELECT_BASE は UserRoleSelect.tsx の 1 箇所に影響するため `text-text bg-bg-surface` を追加して token 参照を完結させること。 |
