# Spec: 案件フェーズ hearing / passed 追加

## Requirements

### Requirement: DealPhase enum SHALL include hearing and passed

`DealPhase` 型と `dealPhaseEnum`（Postgres enum）は 7 値を以下の順序で定義する: `hearing, proposal_prep, proposed, negotiation, won, lost, passed`。

#### Scenario: DealPhase 型が 7 値を持つ

**Given** `src/domain/models/deal.ts` の DealPhase 型定義
**When** 型定義を確認する
**Then** `hearing | proposal_prep | proposed | negotiation | won | lost | passed` の 7 値が union に含まれる

#### Scenario: dealPhaseEnum が正しい順序で 7 値を持つ

**Given** `src/infrastructure/schema.ts` の dealPhaseEnum 定義
**When** enum 値の配列を確認する
**Then** `["hearing", "proposal_prep", "proposed", "negotiation", "won", "lost", "passed"]` の順序で定義されている

---

### Requirement: New deals SHALL start at hearing phase

新規作成および引合転換の案件は `hearing` フェーズで開始する。

#### Scenario: 直接作成の案件が hearing 起点になる

**Given** phase を明示指定せずに案件を作成する
**When** `dealRepository.create()` が DB default を使用する
**Then** 作成された案件の phase は `hearing` である

#### Scenario: 引合転換で作成された案件が hearing 起点になる

**Given** 引合ステータスを `converted` に更新する
**When** `updateInquiryStatus` が案件を自動生成する
**Then** 生成された案件の phase は `hearing` である

---

### Requirement: passed SHALL be a terminal phase

`passed` は won/lost と同じく終端フェーズであり、到達後は遷移不可とする。

#### Scenario: passed からの遷移が拒否される

**Given** phase が `passed` の案件
**When** `canTransition("passed", anyOtherPhase)` を呼び出す
**Then** すべてのフェーズに対して `false` が返る

#### Scenario: hearing から passed への遷移が許可される

**Given** phase が `hearing` の案件
**When** `canTransition("hearing", "passed")` を呼び出す
**Then** `true` が返る

#### Scenario: passed への遷移に closePhase 権限が必要

**Given** newPhase が `passed` のフェーズ更新リクエスト
**When** 権限チェックを行う
**Then** `closePhase`（admin/manager）権限が要求される

---

### Requirement: passed transition SHALL emit deal.passed domain event

`passed` への遷移時に `deal.passed` ドメインイベントを発火する。

#### Scenario: updateDealPhase で passed に遷移するとイベントが発火する

**Given** 非終端フェーズの案件
**When** `updateDealPhase` で newPhase=`passed` を指定する
**Then** `deal.passed` イベントが `{ dealId, fromPhase }` payload で発火される

#### Scenario: Webhook ハンドラが deal.passed を配信する

**Given** `deal.passed` ドメインイベントが発行された
**When** `handleDomainEventWebhook` がイベントを処理する
**Then** 購読エンドポイントに `deal.passed` として配信される

---

### Requirement: Pipeline summary SHALL include all 7 phases

パイプライン集計は 7 フェーズすべてを返し、`activePhases`（売上パイプライン）に `hearing` を含み `passed` を除外する。

#### Scenario: getPipelineSummary が 7 フェーズを集計する

**Given** 各フェーズに案件が存在する
**When** `getPipelineSummary` を呼び出す
**Then** 返却される summary 配列に 7 フェーズすべてのエントリが含まれる

#### Scenario: revenueRepository.activePhases に hearing が含まれ passed が除外される

**Given** revenueRepository のパイプライン集計クエリ
**When** activePhases 定数を確認する
**Then** `hearing, proposal_prep, proposed, negotiation` が含まれ、`won, lost, passed` が除外されている

---

### Requirement: Stale deals filter SHALL exclude passed

停滞案件リストから `passed` フェーズの案件を除外する。`hearing` は停滞対象に残す。

#### Scenario: passed フェーズの案件が停滞リストに含まれない

**Given** 14 日以上更新されていない passed フェーズの案件
**When** ダッシュボードの停滞フィルタを適用する
**Then** その案件は停滞リストに含まれない

#### Scenario: hearing フェーズの案件が停滞リストに含まれる

**Given** 14 日以上更新されていない hearing フェーズの案件
**When** ダッシュボードの停滞フィルタを適用する
**Then** その案件は停滞リストに含まれる

---

### Requirement: MCP deals tool SHALL accept hearing and passed

MCP `deals` ツールの `update_phase` enum に `hearing` / `passed` を追加し、`isTerminalPhase` 判定に `passed` を含め、広告スキーマに反映する。

#### Scenario: update_phase enum に hearing と passed が含まれる

**Given** MCP ツール `deals` の `update_phase` スキーマ
**When** `z.enum` の値を確認する
**Then** `hearing` と `passed` が含まれる

#### Scenario: passed が MCP の isTerminalPhase として扱われる

**Given** MCP `deals` ツールで update_phase を呼び出す
**When** newPhase が `passed` の場合
**Then** `closePhase` 権限チェックが適用される

#### Scenario: 広告スキーマの newPhase enum に両値が反映される

**Given** `tools/list` で deals ツールの inputSchema を取得する
**When** newPhase プロパティの enum を確認する
**Then** `hearing` と `passed` が含まれる

---

### Requirement: UI labels and filters SHALL include hearing and passed

UI のラベル・フィルタ・ステッパーが新フェーズに対応する。

#### Scenario: phaseLabels に hearing と passed が存在する

**Given** `labels.ts` の phaseLabels 定義
**When** 定義を確認する
**Then** `hearing: "ヒアリング"` と `passed: "見送り"` が含まれる

#### Scenario: DealsFilter の allPhases に hearing と passed が含まれる

**Given** DealsFilter コンポーネントの allPhases 定数
**When** 定数を確認する
**Then** `hearing` が先頭に、`passed` が `lost` の後に配置されている

#### Scenario: DealPhaseStepper に見送りボタンが表示される

**Given** 非終端フェーズの案件詳細画面
**When** canChangePhase が true のとき
**Then** 「受注にする」「失注にする」に加えて「見送りにする」ボタンが表示される

#### Scenario: passed のバッジが中立色で表示される

**Given** phase が `passed` の案件
**When** DealPhaseStepper が終端表示をレンダリングする
**Then** バッジは中立色（gray 系）で表示され、失注の赤とは区別される
