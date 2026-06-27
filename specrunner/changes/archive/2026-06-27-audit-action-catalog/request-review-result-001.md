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
| 1 | MEDIUM | Scope ambiguity | `request.md` > 現状コードの前提 | 「targetType は 14 種」と列挙しているが、実コードには `approvalPolicy` が 15 番目の targetType として存在する（`createPolicy.ts`・`updatePolicy.ts`・`togglePolicy.ts` の `targetType: "approvalPolicy"`）。要件本文には「実コードから網羅的に収集し、漏れが無いこと」と明示されており実装上は補足されるが、背景の列挙が不正確なため実装者が混乱するリスクがある。なお AC5 の typecheck で漏れは検出される。 | 背景セクションの列挙に `approvalPolicy` を追加し「15 種」に修正する。実装者が背景リストを参照リストとして使うケースを防ぐ。 |
| 2 | LOW | Clarity | `request.md` > 受け入れ基準 AC4 / `src/__tests__/lib/activityLabels.test.ts` | AC4「既存テストが無変更で green であることを確認する」と、`activityLabels.test.ts` にある `action: "unknown.action"` フォールバックテストが矛盾する可能性がある。`getActionLabel` のパラメータ型が `Pick<AuditLog, "action" \| "metadata">` のまま `AuditLog.action` を `AuditAction` に制約すると、`"unknown.action"` は `AuditAction` に含まれないためコンパイルエラーになり、このテストは「無変更では green にならない」。 | AC4 の意図（記録される文字列値・挙動の不変）を明示したうえで、activityLabels のフォールバックテストはスコープ外として「更新可」と注記するか、`getActionLabel` の引数型は `string` のままにする実装方針を記載する。 |
| 3 | LOW | Clarity | `request.md` > 要件 3 | `activityLabels.ts` の `ACTION_LABELS` を `AuditAction` 型で制約する際、全 46 種のうちラベルを持つのは 17 種（`action_item.toggle` は別処理）であり、残りは未定義で構わない。`Record<AuditAction, string>` では全キー必須になるため `Partial<Record<AuditAction, string>>` が自然だが、要件には言及がない。 | 「`Partial<Record<AuditAction, string>>` を使い、ラベルが無い action は `undefined` フォールバックで `log.action` をそのまま返す既存挙動を維持する」旨を一文追記すると実装者が迷わない。 |

## 検証サマリー

コードを実際に走査して確認した事項を記録する。

### 語彙カウント検証

**action（46 種、正確）**

| プレフィックス | action 一覧 |
|---|---|
| deal.* | create / update / updatePhase / delete |
| contract.* | create / update / updateStatus / delete |
| invoice.* | create / update / update_status |
| meeting.* | create / update |
| action_item.* | create / update / delete / toggle |
| inquiry.* | create / update / updateStatus / conversionPending / delete |
| request.* | create / approve / reject / resubmit / expire / submit（handler） |
| approval_step.* | approve / reject |
| delegation.* | create / deactivate |
| policy.* | create / update / activate / deactivate |
| template.* | create / update / delete |
| revenue_target.* | create / update / delete |
| client* | client.create / client_contact.create / client_contact.delete |
| user.* | updateRole |

合計 46 種。request.md の主張と一致。

**targetType（実際は 15 種、request.md の背景は 14 種と誤記）**

実在する 15 種: action_item / client / client_contact / contract / deal / deal_contact / delegation / inquiry / invoice / meeting / request / revenue_target / template / user / **approvalPolicy**

`approvalPolicy` の出現箇所: `createPolicy.ts:52`、`updatePolicy.ts:56`、`togglePolicy.ts:41`。

### 要件・AC の妥当性確認

| 要件 | 判定 | 備考 |
|---|---|---|
| R1 語彙カタログ型定義 | ✅ 実装可能 | 要件が「網羅的に収集」と明示している。AC5 typecheck で漏れを検出できる |
| R2 モデル・リポジトリ型付け | ✅ 実装可能 | `AuditLog` 型と `auditLogRepository.create` パラメータを変更するだけで全記録サイトがコンパイル時にチェックされる |
| R3 activityLabels 制約 | ✅ 実装可能 | ただし `Partial<Record<AuditAction, string>>` が必要（Finding #3） |
| R4 metadata 型化 | ✅ 実装可能 | `toggleActionItemDone.ts` の `metadata: { done: !existing.done }` が確認済み |
| R5 挙動不変 | ✅ 実装可能 | 文字列値を変更しないため既存挙動は保たれる |

### スコープ外確認

`getDealActivity.ts` が `findByTargets` に渡す `targets` 配列内の `targetType: "deal"` 等の string リテラル（クエリフィルタ側）は要件対象外であることを確認。要件 2 は `auditLogRepository.create` パラメータのみを対象としており、`findByTargets` / `findByOrganization` のフィルタパラメータは未対象。適切なスコープ限定と評価する。
