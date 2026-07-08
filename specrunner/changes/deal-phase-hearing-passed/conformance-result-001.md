# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ | T-01〜T-15 全チェックボックスが [x] |
| design.md | ✅ | D1〜D7 全決定事項が実装に反映されている |
| spec.md | ✅ | 全 8 Requirement / 18 Scenario が実装済み |
| request.md | ✅ | 全受け入れ基準を満たし、build/typecheck/lint/test 全 green |

---

## Detailed Findings

### tasks.md — J-1: 全タスク完了確認

T-01〜T-15 の全チェックボックスが `[x]` で完了。未完了項目なし。

---

### design.md — J-2: 設計決定事項との整合

| 決定 | 実装箇所 | 判定 |
|---|---|---|
| D1: enum 再作成パターン（型再作成 6 ステップ） | `drizzle/0021_silky_shinko_yamashiro.sql` | ✅ DROP DEFAULT → CREATE deal_phase_new → USING キャスト → SET DEFAULT → DROP deal_phase → RENAME |
| D2: column default を `hearing` に変更 | `schema.ts` L429: `.default("hearing")`、migration ステップ (d) | ✅ |
| D3: `deal.passed` を独立イベント型として追加 | `types.ts`（DealPassed 型 + DomainEvent union）、`updateDealPhase.ts`（else-if 分岐） | ✅ |
| D4: 停滞フィルタから passed 除外、hearing は停滞対象 | `dashboard/page.tsx` L84–86 | ✅ `phase !== "won" && phase !== "lost" && phase !== "passed"` |
| D5: DealPhaseStepper — 見送りボタン・中立色バッジ・3 分岐 ConfirmDialog | `DealPhaseStepper.tsx` L157–186 | ✅ ボタン・`bg-gray-50 text-gray-700 border-gray-300`・3 分岐 |
| D6: activePhases に hearing 追加、passed 除外 | `revenueRepository.ts` | ✅ `["hearing", "proposal_prep", "proposed", "negotiation"]` |
| D7: grid-cols-8 | `deals/page.tsx` L55、`SalesDashboard.tsx` L128 | ✅ |

---

### spec.md — J-3: Requirements / Scenarios の充足

#### Requirement: DealPhase enum SHALL include hearing and passed

- `deal.ts` — `DealPhase` union: `hearing | proposal_prep | proposed | negotiation | won | lost | passed`（7 値） ✅
- `schema.ts` — `dealPhaseEnum` に同順序 7 値 ✅

#### Requirement: New deals SHALL start at hearing phase

- `schema.ts` L429: `.default("hearing")` ✅
- migration ステップ (d): `ALTER TABLE "deals" ALTER COLUMN "phase" SET DEFAULT 'hearing'` ✅
- 直接作成・引合転換の両経路とも phase 未指定で DB default を継承する設計（コード分岐なし）✅

#### Requirement: passed SHALL be a terminal phase

- `dealTransition.ts`: `TERMINAL_PHASES = ["won", "lost", "passed"]` ✅
- `canTransition("passed", anyPhase)` → `TERMINAL_PHASES.includes(from)` で早期 false ✅
- `canTransition("hearing", "passed")` → hearing は TERMINAL_PHASES 外・passed は ALL_PHASES 内・from !== to → true ✅
- `actions/deals.ts` L178: `newPhase === "won" || newPhase === "lost" || newPhase === "passed"` → closePhase 権限 ✅

#### Requirement: passed transition SHALL emit deal.passed domain event

- `updateDealPhase.ts` L79–89: `else if (data.newPhase === "passed")` → `dispatcher.dispatch({ type: "deal.passed", ... })` ✅
- `webhookHandler.ts` L200–206: `case "deal.passed":` — `deliverDomainEventToEndpoints` 呼び出し ✅
- `handlers/index.ts`: `allEventTypes` に `"deal.passed"` 追加 ✅
- `webhookEvent.ts`: `WEBHOOK_EVENT_TYPES`・`DealPassedWebhookData`・`DomainEventWebhookData` union 追加 ✅

#### Requirement: Pipeline summary SHALL include all 7 phases

- `getPipelineSummary.ts`: `ALL_PHASES = ["hearing", ..., "passed"]`（7 値） ✅
- `revenueRepository.ts`: `activePhases = ["hearing", "proposal_prep", "proposed", "negotiation"]`（passed 除外）✅

#### Requirement: Stale deals filter SHALL exclude passed

- `dashboard/page.tsx` L86: `deal.phase !== "passed"` 追加済み ✅
- hearing は除外条件に含まれないため停滞対象として残る ✅

#### Requirement: MCP deals tool SHALL accept hearing and passed

- `mcp/tools/deals.ts` L80: `z.enum(["hearing", ..., "passed"])` ✅
- L248: `isTerminalPhase = newPhase === "won" || newPhase === "lost" || newPhase === "passed"` ✅
- `dealsAdvertisementSchema` は `updatePhaseSchema` を含むため広告スキーマに自動反映 ✅
- tool description 文字列: `hearing〜won/lost/passed` 記載 ✅

#### Requirement: UI labels and filters SHALL include hearing and passed

- `labels.ts`: `hearing: "ヒアリング"`, `passed: "見送り"` ✅
- `DealsFilter.tsx`: `allPhases` に hearing（先頭）と passed（lost の後）✅
- `DealPhaseStepper.tsx`: `PIPELINE` に hearing 先頭追加、isTerminal に passed、「見送りにする」ボタン、passed バッジは gray 系 ✅

---

### request.md — J-4: 受け入れ基準の充足

| 受け入れ基準 | 結果 | 証拠 |
|---|---|---|
| hearing/passed が DealPhase/dealPhaseEnum に存在し enum 並び固定 | ✅ | `deal.ts` + `schema.ts` + migration SQL |
| 新規作成・引合転換が hearing 起点（テストで固定） | ✅ | schema default + `dealTransition.test.ts` 静的検証 |
| passed が終端（canTransition false / closePhase 権限、テストで固定） | ✅ | `dealTransition.test.ts` T-00f〜T-00j |
| passed 遷移で deal.passed イベント発火（テストで固定） | ✅ | `webhookWorkflow.test.ts` — `updateDealPhase dispatches "deal.passed"` |
| パイプライン集計が 7 フェーズ / activePhases 正確（テストで固定） | ✅ | `pipelineSummary.test.ts` TC-105 / TC-011 |
| MCP update_phase が hearing/passed を受理 / passed が closePhase 権限 | ✅ | `mcpInputSchemaAdvertisement.test.ts` TC-019-deals / `mcpAuthorization.test.ts` TC-015 |
| UI: phaseLabels・フィルタ・ステッパー見送りボタン・中立色バッジ | ✅ | `labels.ts`, `DealsFilter.tsx`, `DealPhaseStepper.tsx` |
| 既存テスト全件 green | ✅ | 1942 pass / 0 fail（verification-result.md） |
| typecheck / lint / build green | ✅ | 全 phase exit 0（verification-result.md） |
| aozu check exit 0 / 設計層更新済み | ✅ | `design/domain/model.md`（ent-deal・deal.passed イベント）/ `invariants.md`（inv-deal-terminal-irreversible に passed 追記）/ `glossary.md`（term-terminal-state に passed 追記） |

---

## Observations

1. **ConfirmDialog variant**: 見送りは `variant="primary"` を使用。設計 D5 は `variant=default (または primary)` と両値を許容しており範囲内。

2. **テスト方式**: canTransition テスト（純粋関数実行）と MCP 広告スキーマテスト（McpServer 実インスタンス）は実行ベース。DB 依存シナリオは静的解析で代替。request.md の「behavioral」要件はこの制約下で許容範囲と判断。

3. **silent-drop 網羅**: request.md 列挙の全 20+ サイト（型/スキーマ/状態機械/イベント/Webhook/売上/停滞フィルタ/権限/MCP/UI/seed）の変更を確認。webhookHandler.ts の exhaustive switch（`never` ガード）も `deal.passed` case 追加で維持。
