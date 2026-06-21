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
| 1 | MEDIUM | Spec completeness (Security) | `spec.md` Req 1 Scenario 1 | 前回 HIGH 指摘（テナント越境 clientId）の対策が `tasks.md` T-06 に追加された（`clientRepository.findById(data.clientId, data.organizationId)` によるテナント所属確認）。ただし `spec.md` の Req 1 Scenario 1 の Given 条件は依然として「有効な `clientId` が指定されており」と曖昧なままで、別組織 `clientId` を渡した場合のエラーシナリオが spec.md に存在しない。また T-06 の Acceptance Criteria にも「別組織の `clientId` を指定した場合はエラーが返る」の検証項目がないため、テストで網羅されることの担保がない。 | spec.md Req 1 に「clientId が別組織のものである場合エラーが返る」シナリオ（Given: `clientId` が別組織のもの / Then: `{ ok: false, reason: "指定された顧客はこの組織に存在しません" }`）を追加する。T-06 の AC に「別組織の `clientId` 指定でエラーが返る」を追加する。T-16 に当該テストケースの追加を明記する。 |
| 2 | MEDIUM | Test coverage | `tasks.md` T-06 AC / T-16 | T-06 の Acceptance Criteria には clientId テナント境界チェックの検証項目がなく、T-16 の「createDeal テストに引き合いなし作成パターン（`clientId` のみ指定）の静的検証を追加する」も型チェックのみを指している。実装タスクでは `clientRepository.findById(data.clientId, data.organizationId)` チェックが明示されているが、テストで担保される保証がないため、実装が不完全なまま AC を満たしてしまうリスクがある。 | T-06 AC に「`clientId` が別組織のものである場合、`{ ok: false, reason: "指定された顧客はこの組織に存在しません" }` が返る」を追加する。T-16 に「`clientId` テナント所属チェックの失敗ケース（別組織 clientId）をテストする」を追加する。 |
| 3 | LOW | Task numbering | `tasks.md` | tasks.md に T-16 が2つ存在する。186行目「既存テストの追従修正」と197行目「ビルド検証」が同じ番号 T-16 を持つ。番号重複はタスク管理・参照の混乱を招く。 | 2つ目の T-16（ビルド検証）を T-17 に改番する。 |
| 4 | LOW | Implementation clarity | `tasks.md` T-11 | T-11 の「`inquiryRepository.findById(deal.inquiryId, organizationId)` を `deal.inquiryId ? inquiryRepository.findById(deal.inquiryId, organizationId) : null` に変更する」は `Promise.all` の配列要素として使用されているため、`: null` では TypeScript の型エラーになる（`Promise.all` は `PromiseLike<T>` の配列を期待する）。実装者が自然に `Promise.resolve(null)` に読み替えるとは思われるが、記述が誤解を招く。 | T-11 の記述を「`: Promise.resolve(null)` に変更する」に修正するか、`Promise.all` を解体して直列取得に変更するよう明記する。 |

## Summary

前回レビュー（spec-review-result-001）で指摘した HIGH 2 件は両方とも対応済み。

- **旧 HIGH #1（テナント越境 clientId 未検証）**: `tasks.md` T-06 に `clientRepository.findById(data.clientId, data.organizationId)` によるテナント所属確認ステップが追加された。`clientRepository.findById` は `(id, organizationId)` を `WHERE clients.id = ? AND clients.organization_id = ?` でスコープしており、実装の正確性は担保される。
- **旧 HIGH #2（DealPhaseActions 更新漏れ）**: `tasks.md` T-15 として `DealPhaseActions.tsx` の `nextPhaseOptions` ハードコード廃止・動的生成化タスクが追加された。受け入れ基準「`proposal_prep` から `negotiation` への直接遷移」「`proposed` から `proposal_prep` への巻き戻し」が UI から達成可能になった。
- **旧 LOW #3（テスト ID 未列挙）**: T-16 に T-13 の期待値変更（`false` → `true`）と T-07・T-08 の扱いが明記された。

残課題は MEDIUM 2 件（spec.md のエラーシナリオ欠落・テスト担保なし）と LOW 2 件（タスク番号重複・Promise.all 記述の曖昧さ）。いずれも実装を阻害するものではなく、`approved` とする。実装フェーズで MEDIUM 2 件を補完することを推奨する。
