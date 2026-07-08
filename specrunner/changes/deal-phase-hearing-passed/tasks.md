# Tasks: 案件フェーズ hearing / passed 追加

## T-01: DealPhase 型と dealPhaseEnum にフェーズ値を追加

- [x] `src/domain/models/deal.ts`: `DealPhase` union に `hearing` と `passed` を追加。並び: `hearing | proposal_prep | proposed | negotiation | won | lost | passed`
- [x] `src/infrastructure/schema.ts`: `dealPhaseEnum` の値配列を `["hearing", "proposal_prep", "proposed", "negotiation", "won", "lost", "passed"]` に変更
- [x] `src/infrastructure/schema.ts`: `deals` テーブルの `phase` カラムの default を `"hearing"` に変更

**Acceptance Criteria**:
- DealPhase 型が 7 値の union である
- dealPhaseEnum が 7 値を正しい順序で定義している
- phase カラムの default が `hearing` である

---

## T-02: マイグレーション SQL の作成

- [x] `drizzle/0021_deal_phase_hearing_passed.sql` を作成
- [x] 型再作成パターンで `deal_phase` enum を更新:
  1. `deals.phase` の DEFAULT を DROP
  2. `deal_phase_new` enum を `hearing, proposal_prep, proposed, negotiation, won, lost, passed` で作成
  3. 列の型を `deal_phase_new` に USING キャストで移行（既存値はそのまま移行される）
  4. DEFAULT を `hearing` で再設定
  5. 旧 `deal_phase` enum を DROP
  6. `deal_phase_new` を `deal_phase` にリネーム
- [x] 各ステートメント間に `--> statement-breakpoint` を挿入（Drizzle 形式）
- [x] `drizzle/meta/_journal.json` に新エントリを追加

**Acceptance Criteria**:
- `bun run db:migrate` が既存データを破壊せずに成功する
- 既存の `proposal_prep`, `proposed`, `negotiation`, `won`, `lost` の値が保持される
- 新規作成で phase が `hearing` になる

---

## T-03: 状態機械の更新

- [x] `src/domain/services/dealTransition.ts`: `ALL_PHASES` に `hearing` と `passed` を追加（順序: `hearing, proposal_prep, proposed, negotiation, won, lost, passed`）
- [x] `src/domain/services/dealTransition.ts`: `TERMINAL_PHASES` に `passed` を追加（`["won", "lost", "passed"]`）

**Acceptance Criteria**:
- `canTransition("hearing", "proposal_prep")` が `true` を返す
- `canTransition("hearing", "passed")` が `true` を返す
- `canTransition("passed", "hearing")` が `false` を返す
- `canTransition("passed", anyPhase)` がすべて `false` を返す
- 既存の won/lost からの遷移拒否が維持される

---

## T-04: ドメインイベント型の追加（deal.passed）

- [x] `src/domain/events/types.ts`: `DealPassed` 型を追加（`type: "deal.passed"`, `payload: { dealId: string; fromPhase: DealPhase }`）
- [x] `src/domain/events/types.ts`: `DomainEvent` union に `DealPassed` を追加
- [x] `src/domain/models/webhookEvent.ts`: `WEBHOOK_EVENT_TYPES` 配列に `"deal.passed"` を追加
- [x] `src/domain/models/webhookEvent.ts`: `DealPassedWebhookData` 型を追加（`event: "deal.passed"`, `dealId: string`, `fromPhase: string`）
- [x] `src/domain/models/webhookEvent.ts`: `DomainEventWebhookData` union に `DealPassedWebhookData` を追加

**Acceptance Criteria**:
- `DealPassed` が DomainEvent union のメンバーである
- `"deal.passed"` が WEBHOOK_EVENT_TYPES に含まれる
- `DealPassedWebhookData` が DomainEventWebhookData union のメンバーである

---

## T-05: イベント発火とハンドラの更新

- [x] `src/application/usecases/updateDealPhase.ts`: won/lost/else 分岐に `passed` ケースを追加。`deal.passed` イベントを `{ dealId, fromPhase }` で dispatch
- [x] `src/infrastructure/handlers/webhookHandler.ts`: `case "deal.passed":` を追加し `deliverDomainEventToEndpoints` で配信（deal.won/deal.lost と同パターン）
- [x] `src/infrastructure/handlers/index.ts`: `allEventTypes` 配列に `"deal.passed"` を追加

**Acceptance Criteria**:
- passed への遷移で `deal.passed` イベントが発火される
- webhookHandler の exhaustive switch に `deal.passed` case が存在し、コンパイルエラーがない
- allEventTypes に `deal.passed` が含まれる

---

## T-06: 権限判定の更新（isTerminalPhase）

- [x] `src/app/actions/deals.ts` `updateDealPhaseAction`: `isTerminalPhase` 判定に `passed` を追加（`newPhase === "won" || newPhase === "lost" || newPhase === "passed"`）
- [x] `src/app/actions/deals.ts` `updateDealAction`: 同様に `isTerminal` 判定に `passed` を追加
- [x] `src/app/api/mcp/tools/deals.ts` `update_phase` ケース: `isTerminalPhase` 判定に `passed` を追加

**Acceptance Criteria**:
- `passed` への遷移に `closePhase`（admin/manager）権限が要求される
- member ロールで passed への遷移が拒否される

---

## T-07: MCP ツールの更新

- [x] `src/app/api/mcp/tools/deals.ts`: `updatePhaseSchema` の `z.enum` を `["hearing", "proposal_prep", "proposed", "negotiation", "won", "lost", "passed"]` に更新
- [x] `src/app/api/mcp/tools/deals.ts`: `newPhase` の `.describe()` に `hearing=ヒアリング`, `passed=見送り` を追記
- [x] `src/app/api/mcp/tools/deals.ts`: ツールの `description` 文字列にフェーズ範囲を反映（hearing〜won/lost/passed）
- [x] 広告スキーマ（`buildAdvertisementSchema` 経由）が自動的に新 enum 値を反映することを確認（`dealsAdvertisementSchema` は `updatePhaseSchema` を含むため自動反映）

**Acceptance Criteria**:
- `tools/list` で deals ツールの newPhase enum に `hearing` と `passed` が含まれる
- `tools/call` で `update_phase` に `hearing` / `passed` を渡してもバリデーションエラーにならない
- passed が closePhase 権限で終端扱いされる

---

## T-08: 売上/パイプライン集計の更新

- [x] `src/application/usecases/getPipelineSummary.ts`: `ALL_PHASES` を 7 値に更新（`["hearing", "proposal_prep", "proposed", "negotiation", "won", "lost", "passed"]`）
- [x] `src/infrastructure/repositories/revenueRepository.ts`: `activePhases` を `["hearing", "proposal_prep", "proposed", "negotiation"]` に更新（passed は除外）

**Acceptance Criteria**:
- getPipelineSummary が 7 フェーズ分の summary を返す
- revenueRepository.getPipelineSummary が hearing を含み passed を除外する

---

## T-09: 停滞フィルタの更新

- [x] `src/app/(dashboard)/dashboard/page.tsx`: 停滞判定条件に `&& deal.phase !== "passed"` を追加

**Acceptance Criteria**:
- passed フェーズの案件が停滞リストに含まれない
- hearing フェーズの案件は停滞判定の対象として残る

---

## T-10: UI ラベルとフィルタの更新

- [x] `src/app/(dashboard)/labels.ts`: `phaseLabels` に `hearing: "ヒアリング"` と `passed: "見送り"` を追加
- [x] `src/app/(dashboard)/deals/DealsFilter.tsx`: `allPhases` を `["hearing", "proposal_prep", "proposed", "negotiation", "won", "lost", "passed"]` に更新

**Acceptance Criteria**:
- phaseLabels に hearing と passed のラベルが存在する
- DealsFilter のフィルタセレクトに hearing と passed が選択肢として表示される

---

## T-11: パイプライングリッドのレイアウト更新

- [x] `src/app/(dashboard)/deals/page.tsx`: `grid-cols-6` を `grid-cols-8` に変更
- [x] `src/app/(dashboard)/dashboard/SalesDashboard.tsx`: `grid-cols-6` を `grid-cols-8` に変更

**Acceptance Criteria**:
- パイプライングリッドが 8 列（7 フェーズ + 合計）で表示される
- レイアウトが崩れない

---

## T-12: DealPhaseStepper の更新

- [x] `PIPELINE` 配列の先頭に `"hearing"` を追加（`["hearing", "proposal_prep", "proposed", "negotiation"]`）
- [x] `isTerminal` 判定に `passed` を追加（`phase === "won" || phase === "lost" || phase === "passed"`）
- [x] `pendingTerminal` の型を `"won" | "lost" | "passed" | null` に拡張
- [x] 終端ボタン群に「見送りにする」ボタンを追加（中立色: `border-gray-500 text-gray-600 hover:bg-gray-50`）
- [x] `passed` の終端バッジを中立色で表示（`bg-gray-50 text-gray-700 border-gray-300`）
- [x] ConfirmDialog を won/lost/passed の 3 分岐に拡張:
  - won: variant=primary, title="フェーズ変更: 受注"
  - lost: variant=danger, title="フェーズ変更: 失注"
  - passed: variant=default (または primary), title="フェーズ変更: 見送り"

**Acceptance Criteria**:
- PIPELINE に hearing が含まれ進捗バーが正しく表示される
- passed フェーズではパイプライン遷移ボタンが無効化される
- 「見送りにする」ボタンが受注/失注ボタンと並んで表示される
- passed バッジが中立色（gray 系）で「見送り（確定）」と表示される
- ConfirmDialog が passed の場合も正しく表示される

---

## T-13: seed データの更新

- [x] `src/infrastructure/seed.ts`: hearing フェーズのサンプル案件を追加（例: 初期ヒアリング段階の新規案件）
- [x] `src/infrastructure/seed.ts`: passed フェーズのサンプル案件を追加（例: ヒアリング後に見送った案件）
- [x] ログ文言を更新（案件数のカウントと内訳を 7 フェーズに対応）

**Acceptance Criteria**:
- seed 実行後に hearing と passed フェーズの案件が存在する
- seed のログ出力が正しい件数を表示する

---

## T-14: aozu 設計層の更新

- [x] `design/domain/model.md`: `[[ent-deal]]` の phase 値列に `hearing`（初期）と `passed`（終端・見送り）を追加。初期フェーズが hearing であることを明記
- [x] `design/domain/invariants.md`: `[[inv-deal-terminal-irreversible]]` の終端フェーズに `passed` を追加（won/lost/passed が終端・不可逆）
- [x] `design/domain/glossary.md`: `[[term-terminal-state]]` の案件の終端状態に「見送り（passed）」を追記
- [x] `design/domain/model.md`: `[[ent-domain-event]]` の説明に `deal.passed`（見送り）を業務イベントとして明記
- [x] `aozu check` が exit 0 であることを確認（設計と実装の整合）

**Acceptance Criteria**:
- ent-deal の phase 値列が 7 値（hearing 含む、初期フェーズ明記）
- inv-deal-terminal-irreversible に passed が終端として記載
- term-terminal-state に案件の見送り（passed）が追記
- `aozu check` が exit 0
- architecture test が green

---

## T-15: 既存テストの更新と新規テストの追加

- [x] `src/__tests__/domain/dealTransition.test.ts`:
  - hearing → 各フェーズへの遷移テスト追加
  - passed → 各フェーズへの遷移拒否テスト追加
  - 各非終端フェーズ → passed への遷移許可テスト追加
  - hearing → hearing の同一フェーズ遷移拒否テスト追加
- [x] `src/__tests__/mcp/mcpInputSchemaAdvertisement.test.ts`:
  - TC-019 の deals enum に `hearing` と `passed` を追加（期待値の更新）
  - deals の newPhase enum に `hearing` / `passed` が含まれることを検証するテスト追加
- [x] `src/__tests__/mcp/mcpToolDescriptions.test.ts`: deals の description キーワードに hearing/passed 関連を追加（必要に応じて）
- [x] 新規または既存テストで以下を検証:
  - getPipelineSummary が 7 フェーズを返すこと
  - revenueRepository.activePhases に hearing が含まれ passed が除外されること
  - updateDealPhase で passed 遷移時に deal.passed イベントが発火すること
  - isTerminalPhase に passed が含まれること（actions/deals.ts, mcp/tools/deals.ts）
- [x] 全既存テストが green であることを確認（`bun test`）
- [x] `bun run typecheck` / `bun run lint` / `bun run build` が green であることを確認

**Acceptance Criteria**:
- hearing/passed に関する遷移テストが dealTransition.test.ts に存在し green
- MCP の広告スキーマテストが 7 フェーズ enum を検証し green
- パイプライン/売上テストが 7 フェーズを検証し green
- deal.passed イベントテストが存在し green
- 既存テスト全件 green
- typecheck / lint / build green
