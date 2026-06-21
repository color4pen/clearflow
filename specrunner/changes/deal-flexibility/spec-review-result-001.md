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
| 1 | HIGH | Security (OWASP A01: Broken Access Control) | `tasks.md` T-06 / `spec.md` Req 1 Scenario 1 | `createDeal` パターン (b)（`inquiryId` なし）で `clientId` の組織所属確認が仕様に記載されていない。`deals.clientId` の FK 制約は `clients.id` の存在のみを保証し、テナント所属を保証しない。有効なセッションを持つ攻撃者が別テナントの `clientId` UUID をフォームに指定することで、他テナント顧客への案件紐づけが成立しうる。パターン (a) では `inquiryRepository.findById(inquiryId, organizationId)` が組織スコープを確保しているが、パターン (b) には対称的な所属確認が存在しない。同様に、パターン (a) の `assigneeId` / `technicalLeadId` には `userRepository.findById(id, organizationId)` による所属確認が実装されており（`createDeal.ts:40-52`）、`clientId` でも同等の確認が必要。 | `tasks.md` T-06 パターン (b) に「`clientRepository.findById(data.clientId, data.organizationId)` を呼び出し、null の場合は `{ ok: false, reason: "指定された顧客はこの組織に存在しません" }` を返す」ステップを追記する。`spec.md` Req 1 Scenario 1 の Given 条件を「有効かつ当該組織に所属する `clientId` が指定されており」に修正し、存在しない場合のエラーシナリオを追加する。 |
| 2 | HIGH | Functional failure (scope gap) | `tasks.md` / `src/app/(dashboard)/deals/[id]/DealPhaseActions.tsx` | `DealPhaseActions.tsx` に旧 `VALID_TRANSITIONS` と同等の `nextPhaseOptions` がハードコードされており（`proposal_prep→[proposed,lost]`, `proposed→[negotiation,lost]`, `negotiation→[won,lost]`）、タスクリストにこのコンポーネントの更新が含まれていない。T-03 でドメインサービスを終端チェックのみに変更しても、UI 上のボタンが旧ルールのまま残るため、スキップ遷移（`proposal_prep→negotiation`）および巻き戻し遷移（`proposed→proposal_prep`）がサーバー側では許可されるのに UI から実行不可能になる。受け入れ基準「`proposal_prep` から `negotiation` への直接遷移が許可される（スキップ可）」「`proposed` から `proposal_prep` への遷移が許可される（巻き戻し可）」は UI から達成できない。 | `tasks.md` に T-11b（または T-17 等）として `DealPhaseActions.tsx` の更新タスクを追加する。`nextPhaseOptions` のハードコードを廃止し、「全 `DealPhase` から終端状態（`won`/`lost`）と現在のフェーズ自身を除いたリスト」を動的に生成するロジックへ置き換える。各フェーズのラベルと variant は既存の凡例（`phaseLabels` 等）を参照する。 |
| 3 | LOW | Clarity | `tasks.md` T-15 | T-15 の「dealTransition 関連のテストを終端チェックのみのロジックに合わせて更新する」が変更対象テスト ID を列挙していない。現行 `dealTransition.test.ts` の T-13（`canTransition("proposal_prep", "negotiation")` → `false`）は新ロジックでは `true` となるが、T-15 の記述からは変更の方向性が実装者に不明確。また T-07（`estimate_approval` への遷移が `false`）は新ロジックでは有効フェーズでないため引き続き `false` だが、新ロジックの `to が有効な DealPhase` 判定との整合性が明示されていない。 | T-15 に「`dealTransition.test.ts` の T-13 の期待値を `false` から `true` に変更する」「T-07・T-08（`estimate_approval` 絡み）は `DealPhase` 型に含まれないため引き続き `false`、コメントを新ロジックの文言に合わせて更新する」を明記する。 |

## Summary

コードの現状記述はすべて実コードと一致し、行番号も正確。設計判断 D1〜D5 は論理的に整合しており、スキーマ・ドメイン・リポジトリ・ユースケース・UI の各レイヤーが一貫している。ただし HIGH 2 件（テナント越境の `clientId` 未検証、`DealPhaseActions` の更新漏れ）はいずれも受け入れ基準の達成を阻害し、かつセキュリティ上のリスクを含むため、実装開始前に仕様修正が必要。
