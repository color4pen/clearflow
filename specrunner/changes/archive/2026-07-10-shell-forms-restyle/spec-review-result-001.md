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
| 1 | LOW | consistency | tasks.md T-07 / request.md §2 | `dark:bg-bg-card` の修正方法に表記揺れがある。request.md は「`dark:` 分岐ごと削除して `bg-bg-surface` のみ使用」と指示しているが、tasks.md T-07 と spec.md は `bg-white dark:bg-bg-surface` を正としている。どちらも動作するが実装担当者が迷う可能性がある。`--bg-surface` は `:root` で `#ffffff`（白）、`[data-theme="dark"]` で `#1e293b` と定義済みのため、`bg-bg-surface` 単独でも両テーマを正しく表示できる。 | 実装は tasks.md T-07 の `bg-white dark:bg-bg-surface` に従うこと（spec.md・AC の表記と一致しており、より明示的で安全）。request.md の記述は誤記として無視して構わない。 |

## Review Notes

### Architecture

- **変更範囲の適切性**: 全変更が `src/app` 配下の UI ファイルと `globals.css` / `styles.ts` に限定されている。ドメイン・application・infrastructure・api レイヤーは変更しない旨が明記されており、レイヤー依存方向は正しい。
- **バッジ件数の取得方式 (D2 / T-06)**: `layout.tsx`（server component）から `listRequests(organizationId)` を呼ぶ設計は、既に `requests/page.tsx` で確立されたパターンと一致する。フィルタロジック `r.status === "pending" && (r.approvalSteps.length === 0 || r.approvalSteps.some(s => s.status === "pending" && s.approverRole === role))` は `requests/page.tsx` の `actionRequiredRequests` フィルタと等価であり一貫性がある。
- **`SidebarNav` の `navSections` 配列 (D1)**: セクション構造を UI 層内部の静的配列として完結させる設計は、外部依存を増やさず適切。`adminOnly` の絞り込み挙動も維持されている。
- **`FormField` と `FORM_LABEL` の一元化 (D3)**: `FormField` が `FORM_LABEL` を参照することで二重管理を解消する方針は正しい。`FORM_LABEL` 定数自体は後方互換のために維持する点も安全。

### Correctness

- **デザイントークン参照の妥当性**: `globals.css` を確認済み。`text-text-sidebar-muted`・`text-text-on-dark-secondary`・`text-text-on-dark-muted`・`text-status-red-text`・`text-status-green-text`・`text-2xs`・`bg-bg-surface` はすべて `:root` と `@theme inline` に定義済み。`bg-bg-toast` は T-01 で新規追加するため実装後に存在する。
- **`invalid` prop のフィルタリング**: T-03 の実装案では `{ invalid, ...props }` で destructure することで HTML `<input>` に未知属性が渡らないよう正しく設計されている。
- **`NotificationPanel` clip オフセット追随**: サイドバー幅 `w-[210px]` → `w-[220px]` 変更に伴い、T-07 で `left-[210px]` → `left-[220px]` へ追随しており、flyout が正しい位置に表示される。design.md の Risks 欄にも明示されている。
- **Toast アニメーション再発火**: T-10 で `key={toast.id}` を使うことで、同一内容のトーストでも再マウントによりアニメーションが毎回発火する設計は正しい。
- **`NewContractForm` の複数成功分岐**: T-11d で `result.contractId` と `deal.id` フォールバックの両分岐に `showToast` 追加を明記しており、漏れなし。
- **T-14 テスト方針（静的ソース検査）**: 挙動不変の refactoring として、DOM テストではなくソース文字列の静的検査でクラス名を固定するアプローチは適切。mock.module 汚染回避の必須事項（T-14 preamble）も要件に沿っている。

### Completeness (task decomposition)

- 要件 1〜7 はすべて T-01〜T-13 にカバーされている。
- 受け入れ基準の各チェック項目は T-14 の各テストサブタスクに対応している。
- `aozu check` / `architecture test` / `typecheck` / `lint` / `build` の維持は実装上の必須事項として明記されており、タスクに分解不要な品質ゲートとして適切に位置づけられている。
