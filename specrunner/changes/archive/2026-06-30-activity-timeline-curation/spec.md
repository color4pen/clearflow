# Spec: 案件アクティビティの厳選表示（タイムライン）

## Requirements

### Requirement: タイムラインは顧客接点と業務イベントのみを表示する

`getDealActivity` SHALL return only audit logs classified as "顧客接点" (`meeting.create`) or "業務イベント" (`deal.create` / `deal.updatePhase` / `contract.create` / `contract.updateStatus` / `invoice.create` / `invoice.update_status`). All other actions SHALL be excluded from the timeline.

#### Scenario: 業務イベントがタイムラインに表示される

**Given** 案件配下に `deal.create`, `deal.updatePhase`, `contract.create`, `contract.updateStatus`, `invoice.create`, `invoice.update_status` の監査ログが存在する
**When** `getDealActivity` を実行する
**Then** 上記 6 アクションのログがすべて結果に含まれる

#### Scenario: 顧客接点がタイムラインに表示される

**Given** 案件配下に `meeting.create` の監査ログが存在する
**When** `getDealActivity` を実行する
**Then** `meeting.create` のログが結果に含まれる

#### Scenario: 細かなフィールド更新が除外される

**Given** 案件配下に `deal.update`, `contract.update`, `invoice.update`, `meeting.update` の監査ログが存在する
**When** `getDealActivity` を実行する
**Then** 上記 4 アクションのログが結果に含まれない

#### Scenario: タスク関連アクションが除外される

**Given** 案件配下に `action_item.create`, `action_item.update`, `action_item.delete`, `action_item.toggle`, `action_item.updateStatus` の監査ログが存在する
**When** `getDealActivity` を実行する
**Then** 上記すべての `action_item.*` アクションのログが結果に含まれない

#### Scenario: 案件担当者アクションが除外される

**Given** 案件配下に `deal_contact.create`, `deal_contact.delete` の監査ログが存在する
**When** `getDealActivity` を実行する
**Then** 上記 `deal_contact.*` アクションのログが結果に含まれない

### Requirement: getDealActivity は action_item / deal_contact を取得対象に含めない

`getDealActivity` SHALL NOT include `action_item` or `deal_contact` targets in the query to `auditLogRepository.findByTargets`. The corresponding repository calls (`actionItemRepository.findByDeal` / `dealContactRepository.findByDeal`) SHALL be removed.

#### Scenario: action_item / deal_contact のリポジトリ呼び出しが行われない

**Given** 案件に action_item と deal_contact が存在する
**When** `getDealActivity` を実行する
**Then** `actionItemRepository.findByDeal` と `dealContactRepository.findByDeal` は呼び出されず、`findByTargets` の targets 配列に `action_item` / `deal_contact` の targetType が含まれない

### Requirement: 連続する同一操作が件数つき 1 件に集約される

The aggregation logic SHALL merge consecutive entries with the same `(actorId, action, targetId)` into a single `TimelineEntry` with `count` reflecting the number of merged entries. The `createdAt` of the merged entry SHALL be the most recent one.

#### Scenario: 同一操作者が同一対象に 3 回連続で同じ操作を行った場合

**Given** actor-A が deal-1 に対して `deal.updatePhase` を 3 回連続で実行した監査ログが新しい順に並んでいる
**When** 集約ロジックを適用する
**Then** 1 件の `TimelineEntry` に集約され、`count` は 3 となる

#### Scenario: 異なる操作者の操作は集約されない

**Given** actor-A と actor-B がそれぞれ deal-1 に `deal.updatePhase` を 1 回ずつ連続で実行した
**When** 集約ロジックを適用する
**Then** 2 件の `TimelineEntry` がそれぞれ `count: 1` で返される

### Requirement: 連続する状態遷移が正味の遷移に集約される

For state transition actions (`deal.updatePhase` / `contract.updateStatus` / `invoice.update_status`), when consecutive entries by the same actor for the same target exist, the aggregation logic SHALL produce a single `TimelineEntry` with `transition` reflecting the net transition from the first entry's "from" to the last entry's "to".

#### Scenario: フェーズ変更が 3 回連続した場合の正味遷移

**Given** actor-A が deal-1 のフェーズを「提案準備→提案済」「提案済→交渉中」「交渉中→受注」と 3 回連続変更した監査ログが存在する（各ログに `{ fromPhase, toPhase }` metadata あり）
**When** 集約ロジックを適用する
**Then** 1 件の `TimelineEntry` に集約され、`transition` は `{ from: "proposal_prep", to: "won" }`、`count` は 3 となる

#### Scenario: 遷移情報のない既存ログは遷移を表示しない

**Given** `invoice.update_status` の監査ログに metadata がない（遷移情報未記録の既存ログ）
**When** 集約ロジックを適用する
**Then** `TimelineEntry` の `transition` は `null` となる

### Requirement: 件数上限は厳選・集約後に適用される

`getDealActivity` SHALL apply `ACTIVITY_TIMELINE_LIMIT` after filtering and aggregation, not at the DB query level. The DB query SHALL NOT include a `limit` parameter.

#### Scenario: 集約により上限以下になる

**Given** 表示対象の監査ログが 40 件あり、集約後に 25 件になる（`ACTIVITY_TIMELINE_LIMIT` = 30）
**When** `getDealActivity` を実行する
**Then** 25 件すべてが返される（上限で切られない）

#### Scenario: 集約後も上限を超える場合は切り捨てられる

**Given** 表示対象の監査ログが 100 件あり、集約後に 35 件になる
**When** `getDealActivity` を実行する
**Then** 新しい順に 30 件のみ返される

### Requirement: 状態遷移アクションは「変更前 → 変更後」を表示する

For `deal.updatePhase`, `contract.updateStatus`, and `invoice.update_status`, when the log has transition metadata, the UI SHALL display the transition as "変更前 → 変更後" using the corresponding Japanese labels (`phaseLabels` / `contractStatusLabels` / `invoiceStatusLabels`).

#### Scenario: フェーズ変更の遷移表示

**Given** `deal.updatePhase` のログに `metadata: { fromPhase: "proposal_prep", toPhase: "negotiation" }` がある
**When** UI にラベルを表示する
**Then** 「フェーズを変更：提案準備 → 交渉中」と表示される

#### Scenario: 契約ステータス変更の遷移表示

**Given** `contract.updateStatus` のログに `metadata: { fromStatus: "active", toStatus: "completed" }` がある
**When** UI にラベルを表示する
**Then** 「契約ステータスを変更：契約中 → 完了」と表示される

### Requirement: invoice.update_status の metadata に fromStatus / toStatus を記録する

`updateInvoiceStatus` usecase SHALL record `{ fromStatus, toStatus }` in the `recordAudit` call's metadata. `AuditMetadataMap` SHALL include entries for `deal.updatePhase`, `contract.updateStatus`, and `invoice.update_status`.

#### Scenario: 請求ステータス変更時に遷移情報が記録される

**Given** 請求のステータスが `scheduled` である
**When** `updateInvoiceStatus` で `invoiced` に変更する
**Then** 監査ログの metadata に `{ fromStatus: "scheduled", toStatus: "invoiced" }` が記録される

### Requirement: 表示対象アクションに生のアクションキーが UI へ漏れない

All actions that appear in the timeline SHALL have Japanese labels defined. The `getActionLabel` function (or equivalent) SHALL return a human-readable label for every timeline-visible action, never falling back to the raw action key.

#### Scenario: タイムライン対象の全アクションにラベルが存在する

**Given** タイムライン表示対象の 7 アクション（`meeting.create`, `deal.create`, `deal.updatePhase`, `contract.create`, `contract.updateStatus`, `invoice.create`, `invoice.update_status`）
**When** 各アクションのラベルを取得する
**Then** すべてのアクションに対して日本語ラベルが返され、生のアクションキーは返されない
