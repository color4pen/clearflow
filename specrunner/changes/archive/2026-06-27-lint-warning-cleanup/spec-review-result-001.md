# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Spec completeness | spec.md | `argsIgnorePattern` 追加に対応するシナリオがない。`_` プレフィックス引数が警告されなくなることの検証が Requirement: 挙動の不変性 に含まれていない | 影響は軽微（T-02 の AC で補完可能）。次回以降の spec テンプレートで lint 設定変更を伴う場合は設定検証シナリオを追加すること |
| 2 | LOW | Efficiency | tasks.md § T-03 | 束縛を外した後も `.returning()` チェーンを残すよう指示しているため、DBが行を返す処理を実行し続ける。ただし Non-Goals「最小変更」に沿った判断 | 実害なし。将来的に seed のパフォーマンスが問題になる場合は別 issue で `.returning()` を除去すること |

## Review Notes

### コード検証

**design.md の主張とソースコードの整合性を確認した**

| 対象 | 設計の主張 | コード確認結果 |
|------|-----------|--------------|
| `InquiryInfoSection.tsx:6` | `Textarea` が import されているが JSX で未参照 | ✅ `import { Input, Select, Textarea, MarkdownTextarea, preventEnterSubmit }` に `Textarea` が含まれているが、コンポーネント本体では `MarkdownTextarea` のみ使用 |
| `FormField.tsx:1` | `FormEvent` が import type されているが未参照 | ✅ `import type { ReactNode, FormEvent, KeyboardEvent as ReactKeyboardEvent }` に含まれているが、Props 定義・関数本体に `FormEvent` の使用箇所なし |
| `MarkdownTextarea.tsx:6` | `Textarea` を import しているが HTML `<textarea>` を直接使用 | ✅ `import { Textarea } from "./FormField"` が存在し、コンポーネント全体 (155行) を通じて `Textarea` コンポーネントの参照は皆無。ネイティブ `<textarea>` タグを直接使用 |
| `DeleteButton.tsx:10` | `_prev` / `_formData` は `useActionState` シグネチャ上必須 | ✅ `boundAction = (_prev: State, _formData: FormData) => deleteTemplateAction(templateId)` — シグネチャ上必要で削除不可。現在の `eslint.config.mjs` に `argsIgnorePattern` 設定なしを確認 |
| `seed.ts` 5 件の未使用 const | 宣言後に一切参照されていない（FK 漏れなし） | ✅ grep 確認: `greenContact1`/`newInquiry1`/`newInquiry2`/`inProgressInquiry1`/`inProgressInquiry2` は宣言行のみ。一方 `financeContact1`/`financeContact2`/`sakuraContact2` は dealContacts への FK 挿入 (L901–904) で参照されており今回の対象外 |

### セキュリティレビュー

本変更は未使用シンボルの除去と ESLint 設定の追加のみ。

- 認証・認可ロジックへの変更なし
- 入力バリデーションへの変更なし
- OWASP Top 10 に関連する変更なし
- `argsIgnorePattern: "^_"` は既存の ESLint ルール (`@typescript-eslint/no-unused-vars`) の引数検査を `_` プレフィックス引数のみ緩和するものであり、セキュリティ上の影響はない

### 仕様の一貫性

- request.md → design.md → tasks.md → spec.md の記述が一致している
- 警告件数（3 + 2 + 5 = 10 件）が全ドキュメントで整合
- D3 の「FK 参照漏れ確認済み」という主張はソースコード検索で裏付けられた
- 受け入れ基準はすべて機械的に検証可能（`bun run lint`/`bun run build`/`bun test`）

### 総評

設計判断・タスク・仕様がすべて整合しており、対象コードとの乖離もない。挙動変更を伴わない純粋なクリーンアップとして実装可能。blocking 事由なし。
