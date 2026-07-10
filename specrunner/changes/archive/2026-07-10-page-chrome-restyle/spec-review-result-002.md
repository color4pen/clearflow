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
| 1 | HIGH | correctness | tasks.md T-15 | `newCreateLinks.test.ts` の対象が `contracts/page.tsx` を含む **7 ファイル**であり、「`BTN_PRIMARY` を含む新規作成 Link が**存在すること**を確認するテストを書く」と指示している。しかし T-04 は "contracts への新規作成導線は新設しない" と欠番化し、design.md D2 も同様に明記し、spec.md は「`contracts/page.tsx には新規作成導線を追加しない SHALL NOT`」と規定したうえで「`/contracts/new` へのリンクが存在しない」シナリオを持つ。T-15 の Acceptance Criteria も "7 ファイル × 2 項目 = 14 テスト以上" を要求しており、contracts に BTN_PRIMARY リンクが存在することを前提とするテストの作成を強制している。実装者は「T-15 に従いテストを書く → contracts にリンクを追加しなければテストが通らない → T-04 違反」か「T-04 に従い contracts にリンクを追加しない → T-15 のテストが必ず失敗する」という矛盾に直面する。 | T-15 の `newCreateLinks.test.ts` 対象を **6 ファイル**（deals / inquiries / clients / requests / settings/policies / settings/templates）に変更し contracts を除外する。contracts/page.tsx については spec.md のシナリオ（「`/contracts/new` へのリンクが存在しない」）に対応したテスト 1 件を `detailHeroPages.test.ts` 等に追加するか、`newCreateLinks.test.ts` 内で明示的に「存在しないことを確認するテスト」として別記する。Acceptance Criteria を「6 ファイル × 2 項目 = 12 テスト以上 + contracts 非存在テスト 1 件以上」に修正する。 |
| 2 | LOW | consistency | design.md D3 | 詳細サブセクション 0 件への EmptyState 適用対象が「deals/[id]・clients/[id] 等」と "等" を含み不特定に見える。request.md 要件3 と T-07 が「この 2 ファイルのみ」と明示しているため実装上のリスクは小さいが、design.md の記述が他の文書と不整合のまま残っている。 | design.md D3 の「deals/[id]・clients/[id] 等」を「deals/[id] と clients/[id] の 2 ファイルのみ」に修正し、「他の詳細画面には適用しない」旨を明記する。 |

## Previous Findings Resolution

| v001 # | Severity | 内容 | 解消状況 |
|--------|----------|------|----------|
| 1 | HIGH | contracts 導線矛盾（design.md D2・T-04・spec.md が 7 箇所と記述し request.md の「新設しない」と相反） | ⚠️ 部分解消。design.md D2・T-04・spec.md の本文は正しく修正されたが、T-15 の `newCreateLinks.test.ts` が contracts を含む 7 ファイル対象のまま残っており矛盾が持続。Finding #1（本レビュー）として継続 |
| 2 | MEDIUM | ログインページ内側ラッパー div の変更指示欠落 | ✅ T-14 に「内側ラッパー div のクラスを `max-w-md w-full space-y-4 px-4` から `max-w-[380px] w-full space-y-4` に変更する」サブタスクが追加されて解消 |
| 3 | MEDIUM | EmptyState 詳細サブセクション適用対象が "等" で不特定 | ✅ request.md 要件3 に「`deals/[id]` と `clients/[id]` の 2 ファイルのみ」と明記、T-07 も「この 2 ファイルのみ」と列挙して解消 |
| 4 | LOW | コンポーネント名の二重記述（request.md では `NewTaskButton`、design.md D2・T-05 では `CreateTaskButton`） | ✅ request.md 要件2 が `CreateTaskButton` に統一されて解消 |
