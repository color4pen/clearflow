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
| 1 | HIGH | correctness | tasks.md (T-01/T-02) | `phaseLabels` の import ステップが欠落している。`deals/[id]/page.tsx` は現在 `contractTypeLabels / meetingTypeLabels / contractStatusLabels` のみ labels.ts からインポートしており、`phaseLabels` は未インポート。T-02 のコード例 `{phaseLabels[deal.phase] ?? deal.phase}` を実装するには `phaseLabels` のインポートが必須だが、T-01・T-02 いずれのチェックリストにも追加ステップが存在しない。このまま実装すると `bun run typecheck` が失敗し、T-01 の AC "typecheck が exit 0" に矛盾する。 | T-01 または T-02 に「`phaseLabels` を `@/app/(dashboard)/labels` からインポートする（既存の `contractTypeLabels` 等と同じ import 文に追加）」チェックリスト項目を追加する。 |
| 2 | LOW | completeness | spec.md | セクション見出し h2 色統一（D4 / T-04）に対応する正式な Requirement/Scenario が spec.md に存在しない。design.md と tasks.md には記述があるが、spec.md の要件として固定されていないため、回帰テスト（T-06）の根拠が spec に遡れない。 | spec.md に「SalesDashboard のセクション h2 は `text-text` で描画される（MUST）」という Requirement を 1 件追加し、T-04 と T-06 の AC に紐付ける。 |
| 3 | LOW | architecture | design.md (D1) | `PHASE_VARIANT` を `deals/[id]/page.tsx` に複製する判断は妥当だが、「コードコメントで同期を担保する」という軽量な保護手段に留まっている。`DealPhase` に新フェーズが追加された際に両ファイルを更新し忘れるリスクが将来にわたって残る。 | 現スコープでは許容範囲。T-05 の静的検証テスト（deals/[id]/page.tsx の PHASE_VARIANT を検証）が実質的なセーフネットになることを確認した上で、将来リクエストで `phaseVariant` の共有化（`labels.ts` への移行等）を計画する。今回は対応不要。 |

## Summary

**高優先 (HIGH)**:

F1 が唯一のブロッカー。`phaseLabels` のインポートステップ欠落は実装者が tasks を逐語的に実行した際に `typecheck` 失敗を引き起こし、T-01 の受け入れ基準と矛盾する。tasks.md の T-01 または T-02 に 1 行追記するだけで解消できる。

**低優先 (LOW)**:

F2 は spec 完全性の軽微なギャップ。h2 色統一はスコープ・実装方針ともに design.md/tasks.md に明示されており、実装上の障害はない。spec.md への追記が望ましいが実装のブロックには至らない。

F3 は既知の trade-off として design.md に文書化済み。追加対応は不要。
