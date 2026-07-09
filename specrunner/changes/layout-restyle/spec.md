# Spec: layout-restyle

## Requirements

### Requirement: 案件詳細のヒーロー行にフェーズバッジを表示する

案件詳細ページのヒーロー行は、タイトルの直後にフェーズ `StatusBadge` を表示しなければならない（SHALL）。バッジのラベルは `phaseLabels[deal.phase]`、バリアントは `PHASE_VARIANT` マッピング（hearing=gray / proposal_prep・proposed・negotiation=blue / won=green / lost=red / passed=gray）に従わなければならない（SHALL）。

#### Scenario: 受注フェーズの案件を表示する

**Given** `deal.phase` が `"won"` である案件詳細ページ
**When** ページが描画される
**Then** タイトル直後に `variant="green"` の `StatusBadge` が表示される

#### Scenario: ヒアリングフェーズの案件を表示する

**Given** `deal.phase` が `"hearing"` である案件詳細ページ
**When** ページが描画される
**Then** タイトル直後に `variant="gray"` の `StatusBadge` が表示される

---

### Requirement: WatchToggle がヒーロー行の右端に配置される

`WatchToggle` はフェーズステッパーのカード内ではなく、ヒーロー行の右端グループ（`ml-auto` 配置）に配置されなければならない（SHALL）。コンポーネントの props・挙動・aria 属性に変更はない（MUST NOT）。

#### Scenario: 案件詳細ページを表示する

**Given** 任意のフェーズの案件詳細ページ
**When** ページが描画される
**Then** `WatchToggle` はタイトル行と同じ flex コンテナ内の右端に表示され、ステッパーカード内には存在しない

---

### Requirement: 見積承認リンクが estimateRequestId 存在時のみヒーロー行に表示される

見積承認リンクは `deal.estimateRequestId` が存在する場合のみヒーロー行右端グループに表示されなければならない（SHALL）。リンク先は `/requests/{estimateRequestId}`、文言は「見積承認を表示」でなければならない（SHALL）。

#### Scenario: estimateRequestId が存在する案件

**Given** `deal.estimateRequestId` が non-null の案件詳細ページ
**When** ページが描画される
**Then** ヒーロー行右端に「見積承認を表示」リンクが表示され、href が `/requests/{estimateRequestId}` である

#### Scenario: estimateRequestId が存在しない案件

**Given** `deal.estimateRequestId` が `null` の案件詳細ページ
**When** ページが描画される
**Then** ヒーロー行右端に見積承認リンクが表示されない

---

### Requirement: ダッシュボードの KPI が指標ごとの独立カードで描画される

ダッシュボードのパイプラインサマリは、フェーズ別指標および合計列が個別の `SectionCard` としてグリッドに配置されなければならない（SHALL）。ラベル文字列・値・並び順は変更してはならない（MUST NOT）。

#### Scenario: パイプラインサマリに複数フェーズが存在する

**Given** `pipelineSummary` に複数フェーズのデータが含まれるダッシュボード
**When** SalesDashboard が描画される
**Then** 各フェーズのラベル（`phaseLabels` 参照）と件数・金額が個別の `SectionCard` 内に表示される
**Then** 合計列も独立した `SectionCard` として同一グリッドに存在する

---

### Requirement: src/app/(dashboard) 配下に生パレット・hex を持ち込まない

変更後のソースファイルは `src/app/(dashboard)` 配下において、`text-[#`・`bg-[#`・`border-[#` 形式のハードコード hex クラスを含んではならない（MUST NOT）。デザイントークン変数のみを参照する（SHALL）。

#### Scenario: 変更後のファイルを静的検査する

**Given** T-01〜T-04 の変更が適用されたソースファイル
**When** `text-[#` パターンをファイル内で検索する
**Then** マッチが 0 件である
