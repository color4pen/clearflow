# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | MEDIUM | testing | `src/__tests__/static/uiBusinessStyle.test.ts` | test-cases.md で `must unit` に分類された TC-008（DataTable クリック可能行の hover クラス統一）・TC-017（DataTable th が `text-text-secondary`）・TC-018（DataTable.tsx に `hover:bg-primary/10` が存在しない）・TC-019（BulkApprovalPanel の結果アラートがデザイントークンを参照）の 4 件が自動テストとして実装されていない。実装自体は正しく grep ゼロ件も確認済みだが、将来の DataTable / BulkApprovalPanel 変更でリグレッションが生じた場合に検出できない。 | `uiBusinessStyle.test.ts` に `readFile` ベースの静的解析テストを追加する。TC-018: `expect(content).not.toContain('hover:bg-primary/10')`、TC-017: `expect(content).toContain('text-text-secondary')`、TC-008: `expect(content).toContain('hover:bg-bg-surface-alt')` かつ `not.toContain('hover:bg-primary/10')` で実装できる。TC-019 は BulkApprovalPanel.tsx が `bg-bg-success-light`・`bg-status-red-bg`・`bg-bg-row-pending` を含み旧パレットクラスを含まないことをアサートする。 | yes |
| 2 | LOW | testing | `src/__tests__/static/uiBusinessStyle.test.ts` | TC-012（styles.ts の廃止定数 `BTN_PRIMARY_DISABLED` / `BTN_SUCCESS` / `BTN_WARNING` / `BTN_SUBMIT` が export されていない）が明示的な静的テストとして実装されていない。typecheck パスによって間接担保されているが、styles.ts の export 不在を直接アサートするテストがない。 | `expect(content).not.toContain('BTN_SUCCESS')` 等の否定アサーションを uiBusinessStyle.test.ts に追加する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 10 | 0.30 |
| security | 10 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 9.6

## Summary

### 実装の正確性

全タスク（T-01〜T-13）の実装が完了しており、request.md の受け入れ基準をすべて満たしている。

- **styles.ts**: `BTN_PRIMARY`（塗りボタン化）・`BTN_SECONDARY`・`BTN_DANGER` の 3 階層が正しく定義され、廃止定数（`BTN_SUCCESS` / `BTN_WARNING` / `BTN_SUBMIT` / `BTN_PRIMARY_DISABLED`）が削除されている。`INPUT_BASE` / `SELECT_BASE` にトークン参照が補完されている。
- **DataTable.tsx**: `th` が `text-text-secondary` に変更され、クリック可能行・不可行ともに `hover:bg-bg-surface-alt` に統一されている。`hover:bg-primary/10` の残存なし（ソース確認済み）。
- **dueDateClass.ts**: `src/app/(dashboard)/lib/dueDateClass.ts` に実装され、`toDateString()` による暦日比較で past/today/future/null を正しく判定する。`now?` 引数によるテスト注入設計も適切。ユニットテスト 8 ケース（TC-001〜006 + 境界）すべて green。
- **ActionItemRow.tsx**: 両モード（`showSource=true/false`）の期日 span に `dueDateClass(item.dueDate, _testNow)` が適用され、`""` 返却時は `text-text-muted` にフォールバックしている。`_testNow` prop による外部注入設計が静的テスト（ActionItemRow.test.ts）で固定されている。
- **生パレット全廃**: `grep -rE '(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|emerald)-[0-9]+' src/app/(dashboard)` がゼロ件。hex 直書き（`-[#`）もゼロ件。
- **BulkApprovalPanel / InvoiceSection / DealPhaseStepper / 各フォーム**: すべてデザイントークンに置換済み（bg-bg-success-light / bg-status-red-bg / bg-success / bg-primary 等）。

### 検証結果

`bun run build`・`bun run typecheck`・`bun run lint`・`bun test`（2060 tests passed）すべて green（verification-result.md 参照）。

### 挙動不変の確認

変更ファイルは `src/app/(dashboard)` 配下の UI 表示層（クラス・表示専用ロジック）に限定されており、Server Actions・ドメイン・DB・権限・集計に変更なし。スコープ外（レイアウト再配置・ページネーション・フィルタ・行内リンクボタン化・`(auth)/(platform)` 配下）への変更もない。

### リスク残存

spec-review-result-001.md で指摘された「文字列型日付の UTC midnight パース（負オフセット環境での ±1 日ズレ）」は本プロジェクトのアジア圏運用（UTC+8/+9）では実害なし。設計の既知の許容範囲内。

### 総評

実装の正確性・完全性・アーキテクチャ準拠はすべて高い水準にある。上記 MEDIUM/LOW は test-cases.md の must 自動テスト 4 件の欠如であり、実装の正確性には影響しない。現状の 2060 tests green・grep ゼロ件・build 通過をもって request.md の受け入れ基準は充足されているため、`approved` と判定する。
