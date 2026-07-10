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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | correctness | design.md D2 / tasks.md T-04 / spec.md | `contracts/page.tsx` への新規作成導線に関して、request.md 要件2 が「**新設しない**（ドメインフローに反するため）」と明記しているにもかかわらず、design.md D2 が「contracts/page.tsx にリンクを追加する（既知制約として 404 と注記）」と述べ、T-04 と spec.md の "Requirement: 新規作成導線 **7** 箇所" もこれに従っている。request.md の受け入れ基準は「6 箇所（置換）＋ tasks 移設」と明記しており、T-04 を実装すると request.md との矛盾が生じる。request-review-result-002 の Iteration 1 HIGH Finding（contracts 新設が 404 になる）はまさにこの点を指摘して解消済みのはずだが、design/tasks/spec で復活している。 | request.md の決定（新設しない）を優先するか、design の意図（404 許容で追加する）を採用するかをいずれか一方に統一する。採用する場合は request.md の要件2・受け入れ基準も "7 箇所" に更新し、不採用の場合は design.md D2 から contracts 追加の記述を削除し T-04 を削除、spec.md の "7 箇所 Requirement" と contracts シナリオを削除する。 |
| 2 | MEDIUM | correctness | tasks.md T-14 / design.md D6 | ログインページの内側ラッパー div（現在 `max-w-md w-full space-y-4 px-4`）の変更指示が欠落している。T-14 は「SectionCard に `max-w-[380px]` を付与（`max-w-md` を置き換え）」と述べるが、実コードの `max-w-md` は SectionCard ではなく内側 div にある。実装者が T-14 のみを読むと SectionCard だけに `max-w-[380px]` を追加し、内側 div の `max-w-md w-full px-4` が残る形になり、ロゴ部とカードの幅制約が揃わない。 | T-14 に「内側 div から `max-w-md w-full px-4` を除去し、`max-w-[380px] w-full mx-auto` 等に変更する」サブタスクを追加する。または design.md D6 で outer div の構造を明示する。 |
| 3 | MEDIUM | completeness | tasks.md T-07 | 詳細サブセクション 0 件への EmptyState 適用対象が「deals/[id]・clients/[id] 等」と "等" で不特定。実装者がファイルを独自判断で選ぶと適用漏れや過剰適用が起きる。 | 対象ファイル一覧を exhaustive に列挙する（例: `deals/[id]/page.tsx` の商談記録・契約の 0 件箇所、`clients/[id]/page.tsx` の各 SectionCard 0 件箇所を行番号レベルで列挙）か、「deals/[id] と clients/[id] のみ」など明示的なスコープを設ける。 |
| 4 | LOW | consistency | request.md / tasks.md T-05 / design.md D2 | tasks 用抽出コンポーネント名が request.md では「`NewTaskButton`（例）」と記述されているが、design.md D2 と T-05 では「`CreateTaskButton`」と確定されている。低リスクだが名称の二重記述が混乱を招く可能性がある。 | request.md の「例: `NewTaskButton`」を「`CreateTaskButton`」に揃えるか、D2/T-05 の名称を正とする旨をコメントする。 |
