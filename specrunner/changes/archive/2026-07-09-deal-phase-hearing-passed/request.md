# 案件フェーズ: ヒアリング（初期）と見送り（終端）の追加

## Meta

- **type**: new-feature
- **slug**: deal-phase-hearing-passed
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: ドメインモデル（案件フェーズ状態機械・終端不変条件・新ドメインイベント）の変更。新しい port/adapter・層構造の選択は無いため false。設計変更は aozu 設計層で記録する。 -->
<!-- 順序制約: このジョブは mcp-tool-descriptions（#未マージ）のマージ後に job start する。両者とも deals.ts を変更するため並列不可。 -->

## 背景

案件（Deal）のフェーズに 2 つの状態を追加する。

1. **ヒアリング（`hearing`）** — 提案準備（proposal_prep）の**前段**の初期フェーズ。案件はまずヒアリングから始まる。
2. **見送り（`passed`）** — 受注（won）/ 失注（lost）に加わる**第3の終端結論**。意味は「ヒアリングはしたが、その商談は追わない＝当社都合でお断りする」こと。競合・先方都合で負ける失注（`lost`）とは区別する。引合ステータスの `declined`（同じく日本語ラベル「見送り」）とも別ライフサイクル・別 enum。

現状フェーズ: `proposal_prep → proposed → negotiation → won / lost`（5 値）。
変更後: `hearing → proposal_prep → proposed → negotiation → won / lost / passed`（7 値）。

## 決定事項（実装はこれに厳密に従う）

1. **`passed` は終端（不可逆）** — won/lost と同じく到達後は遷移不可。権限は closePhase（admin/manager）。パイプライン・停滞リストから除外。UI バッジは**中立色**（失注の赤にしない）。
2. **初期フェーズ = `hearing`** — schema のカラム default を `hearing` に変更する。直接作成・引合転換の両経路とも phase 未指定で DB default を継承するため、default 変更だけで両方が hearing 起点になる（両経路を分岐させない）。
3. **`passed` は独自ドメインイベント `deal.passed` を発火** — won/lost と対等の節目として Webhook・通知に流す。
4. **英語 enum 値**: `hearing`（日本語「ヒアリング」）、`passed`（日本語「見送り」）。
5. **MCP 対応を必ず含める** — `src/app/api/mcp/tools/deals.ts` の `update_phase` スキーマ enum に `hearing`/`passed` を追加し、`isTerminalPhase` 判定に `passed` を含める。広告スキーマ（buildAdvertisementSchema 経由）にも反映されること。

## 現状コードの前提（重要: 型が網羅を守らない）

`DealPhase` は素の string union で、**フェーズ値に対する `never` 網羅 switch がどこにも無い**。フェーズ依存箇所は配列 / `Record` / if-else フォールスルーで書かれ、**新値を足しても typecheck はエラーを出さず静かに漏れる**。よって下記サイトを**手で漏れなく**修正し、テストで担保する。唯一の網羅 guard は Webhook の**イベント型** switch（`webhookHandler.ts` の `never`）で、これは `deal.passed` イベント追加時にハンドラ case を強制する。

主な参照箇所（silent-drop = typecheck で捕まらない・手修正必須）:
- 型/スキーマ: `src/domain/models/deal.ts`（DealPhase union）、`src/infrastructure/schema.ts`（`dealPhaseEnum` 定義＋`phase` カラム default）
- 状態機械: `src/domain/services/dealTransition.ts`（`ALL_PHASES`、`TERMINAL_PHASES`）
- 生成/転換: `src/application/usecases/createDeal.ts`、`src/application/usecases/updateInquiryStatus.ts`（引合転換）、`src/infrastructure/repositories/dealRepository.ts`（create は phase 未指定→default 継承）
- イベント発火: `src/application/usecases/updateDealPhase.ts`（won/lost/else 分岐）
- イベント型/Webhook: `src/domain/events/types.ts`、`src/domain/models/webhookEvent.ts`、`src/infrastructure/handlers/webhookHandler.ts`、`src/infrastructure/handlers/index.ts`（`allEventTypes` 購読配列＝silent-drop）
- 売上/パイプライン: `src/application/usecases/getPipelineSummary.ts`（`ALL_PHASES`）、`src/infrastructure/repositories/revenueRepository.ts`（`activePhases`）
- 停滞フィルタ: `src/app/(dashboard)/dashboard/page.tsx`（`phase !== "won" && phase !== "lost"`）
- 権限判定: `src/app/actions/deals.ts`（`isTerminalPhase` 2 箇所）、`src/domain/authorization.ts`（closePhase/changePhase は既存キーで可）
- MCP: `src/app/api/mcp/tools/deals.ts`（`update_phase` の `z.enum`＝**実行時 reject**、`isTerminalPhase`）
- UI: `src/app/(dashboard)/labels.ts`（`phaseLabels`＝未追加だと生 enum 文字列表示）、`.../deals/DealsFilter.tsx`（`allPhases`）、`.../deals/page.tsx` と `.../dashboard/SalesDashboard.tsx`（パイプライン集計グリッド `grid-cols-6`→フェーズ 7＋合計で `grid-cols-8`）、`.../deals/[id]/DealPhaseStepper.tsx`（後述・最大の影響）
- seed: `src/infrastructure/seed.ts`

## 設計要素引用

[[ent-deal]], [[inv-deal-terminal-irreversible]], [[inv-contract-requires-won-deal]], [[term-terminal-state]], [[ent-domain-event]], [[mod-mcp]], [[mod-usecase]], [[mod-domainservice]]

## aozu 影響判定（起票前判定・必須）: **要対応**

本 request はドメインモデルを変えるため、**設計層の更新を本 request に含める**:
- **[[ent-deal]]**（`design/domain/model.md`）: phase の値列に `hearing`（初期）と `passed`（終端・見送り）を追加。初期フェーズが hearing であることを明記。
- **[[inv-deal-terminal-irreversible]]**（`design/domain/invariants.md`）: 終端フェーズに `passed` を追加（won/lost/passed が終端・不可逆）。
- **[[term-terminal-state]]**（`design/domain/glossary.md`）: 案件の終端状態に「見送り（passed）」を追記。
- **[[ent-domain-event]]** 系: `deal.passed` を業務イベントに追加（won/lost と対等）。
- `aozu check` が exit 0、architecture test が緑であること（設計と実装の整合）。

新モジュール・新層間依存辺は導入しない（既存 mod-usecase/mod-domainservice/mod-mcp 内）。

## 要件

1. **enum 追加**: `DealPhase` と `dealPhaseEnum` に `hearing`・`passed` を追加。enum の並びは `hearing, proposal_prep, proposed, negotiation, won, lost, passed`（Postgres enum の並び順＝パイプライン表示順）。
2. **マイグレーション（差分のみ・リセット禁止）**: 新規 `drizzle/00XX_*.sql` を生成。既存データを保持したまま `deal_phase` に値を追加する。決定的な並び順が要るため、リポジトリ前例（`0018_interaction_kind_channel.sql`）の**型再作成パターン**（default 退避→新 enum 作成→列を USING キャストで移行→default 再設定→旧 enum drop→rename）を用いてよい。`ALTER TYPE ADD VALUE` 方式を採る場合は、値追加と同一トランザクション内でその値を参照しない制約に注意。**column default を `hearing` に変更**する。
3. **状態機械**: `dealTransition.ts` の `ALL_PHASES` に両値を追加、`TERMINAL_PHASES` に `passed` を追加。
4. **初期フェーズ**: schema default 変更により新規作成・引合転換の両方が `hearing` 起点になることを確認（コード分岐は追加しない）。
5. **イベント**: `passed` 遷移時に `deal.passed` を発火。`events/types.ts`（`DealPassed` 型＋union）、`webhookEvent.ts`（`WEBHOOK_EVENT_TYPES`＋`DealPassedWebhookData`＋union）、`webhookHandler.ts`（`deal.passed` case）、`handlers/index.ts`（`allEventTypes` に追加）、`updateDealPhase.ts`（分岐追加）を整備。
6. **売上/パイプライン**: `getPipelineSummary.ts` の `ALL_PHASES` に両値追加。`revenueRepository.ts` の `activePhases` に `hearing` を追加（早期パイプラインとして計上）し、`passed` は除外（won/lost と同様に死んだ案件）。
7. **停滞フィルタ**: `dashboard/page.tsx` の停滞判定から `passed` を除外（`hearing` は能動フェーズとして停滞対象に残す）。
8. **権限**: `actions/deals.ts` と `mcp/tools/deals.ts` の `isTerminalPhase` に `passed` を含め、closePhase（admin/manager）判定に載せる。
9. **MCP**（決定事項 5）: `mcp/tools/deals.ts` の `update_phase` enum に両値追加、`isTerminalPhase` に `passed`、広告スキーマ反映。
10. **UI**:
    - `labels.ts`: `phaseLabels` に `hearing: "ヒアリング"`、`passed: "見送り"`。
    - `DealsFilter.tsx`: `allPhases` に両値追加（`hearing` 先頭、`passed` は lost の後）。
    - `deals/page.tsx` / `SalesDashboard.tsx`: パイプライン集計グリッドを `grid-cols-8`（フェーズ 7＋合計）に。
    - `DealPhaseStepper.tsx`: `PIPELINE` に `hearing` を先頭追加、`isTerminal` 判定に `passed` を追加（進捗バー破綻・クローズ済みへの遷移ボタン再表示を防ぐ）、**「見送りにする」ボタンを追加**（passed への到達手段）、`passed` のバッジは**中立色**、ConfirmDialog を won/lost/passed の 3 分岐に。
11. **seed**: `hearing`・`passed` のサンプル案件を追加し、ログ文言を更新。

## スコープ外

- 見送り理由（reason）の入力・保持（本 request では状態のみ。理由項目は別途）。
- 既存案件データの一括再分類。
- inquiry の `declined` ラベル/enum の変更（別ライフサイクル・非対象）。

## 受け入れ基準

- [ ] `hearing`・`passed` が DealPhase / dealPhaseEnum に存在し、enum 並びが `hearing … passed` であることを固定。
- [ ] 新規作成・引合転換の案件が `hearing` 起点になることをテストで固定。
- [ ] `passed` が終端（`canTransition` で from=passed が常に false、closePhase 権限）であることをテストで固定。
- [ ] `passed` 遷移で `deal.passed` ドメインイベント/Webhook が発火することをテストで固定（won/lost と対等）。
- [ ] パイプライン集計が 7 フェーズを返し、`activePhases` に hearing を含み passed を除外することをテストで固定。停滞リストが passed を除外することを固定。
- [ ] **MCP `deals` ツールの `update_phase` が hearing/passed を受理し、passed が closePhase 権限で終端扱いされること、広告スキーマの operation/enum が更新されることをテストで固定**（#165 の広告テスト方式で）。
- [ ] UI: phaseLabels に両値・フィルタに両値・ステッパーに見送りボタンと正しい終端判定・グリッドが崩れないこと（silent-miss 箇所の回帰）を可能な範囲でテスト/検証。
- [ ] 既存の全テストが更新後 green（"全5フェーズ" 等の前提を持つテストは 7 フェーズへ更新）。`typecheck`/`lint`/`build` green。
- [ ] `aozu check` exit 0・architecture test green（設計層＝ent-deal/inv/glossary/event を更新済み）。

## 実装上の必須事項

1. **silent-drop を全滅させる**。上記「現状コードの前提」の全サイトを手修正し、受け入れ基準のテストで網羅を担保する（typecheck は守ってくれない）。特に **MCP** と **DealPhaseStepper の isTerminal/見送りボタン** は漏らさない。
2. **マイグレーションは差分のみ**。DB リセット・既存データ破壊をしない。default 変更を含める。
3. **テストは実行検証（behavioral）**。MCP は登録ツールを tools/list/call で実際に叩いて検証。
4. **成果物は単体で読めること**。設計書・コード・コメントに会話の文脈を含めない。
