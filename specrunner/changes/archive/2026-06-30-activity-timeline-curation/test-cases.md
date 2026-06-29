# Test Cases: 案件アクティビティの厳選表示（タイムライン）

## Summary

- **Total**: 28 cases
- **Automated** (unit/integration): 23
- **Manual**: 5
- **Priority**: must: 21, should: 7, could: 0

---

## 分類・除外

### TC-001: 業務イベントがタイムラインに表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: タイムラインは顧客接点と業務イベントのみを表示する > Scenario: 業務イベントがタイムラインに表示される

---

### TC-002: 顧客接点がタイムラインに表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: タイムラインは顧客接点と業務イベントのみを表示する > Scenario: 顧客接点がタイムラインに表示される

---

### TC-003: 細かなフィールド更新が除外される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: タイムラインは顧客接点と業務イベントのみを表示する > Scenario: 細かなフィールド更新が除外される

---

### TC-004: タスク関連アクションが除外される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: タイムラインは顧客接点と業務イベントのみを表示する > Scenario: タスク関連アクションが除外される

---

### TC-005: 案件担当者アクションが除外される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: タイムラインは顧客接点と業務イベントのみを表示する > Scenario: 案件担当者アクションが除外される

---

## 取得対象の絞り込み

### TC-006: action_item / deal_contact のリポジトリ呼び出しが行われない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: getDealActivity は action_item / deal_contact を取得対象に含めない > Scenario: action_item / deal_contact のリポジトリ呼び出しが行われない

---

### TC-018: findByTargets に limit が渡されない

**Category**: integration
**Priority**: must
**Source**: design.md > D3 / tasks.md > T-05

**GIVEN** getDealActivity を実行する準備ができている（監査ログが複数件存在する）
**WHEN** getDealActivity を実行する
**THEN** `auditLogRepository.findByTargets` の呼び出し引数に `limit` プロパティが含まれない（全件取得）

---

### TC-019: findByTargets の includeActions に TIMELINE_ACTIONS が渡される

**Category**: integration
**Priority**: must
**Source**: design.md > D1 / tasks.md > T-05

**GIVEN** getDealActivity を実行する準備ができている
**WHEN** getDealActivity を実行する
**THEN** `auditLogRepository.findByTargets` の呼び出し引数の `includeActions` が `TIMELINE_ACTIONS`（7アクション）と一致する

---

## 集約ロジック

### TC-007: 同一操作者が同一対象に 3 回連続で同じ操作を行った場合

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 連続する同一操作が件数つき 1 件に集約される > Scenario: 同一操作者が同一対象に 3 回連続で同じ操作を行った場合

---

### TC-008: 異なる操作者の操作は集約されない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 連続する同一操作が件数つき 1 件に集約される > Scenario: 異なる操作者の操作は集約されない

---

### TC-021: aggregateTimeline が非連続操作を集約しない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** actor-A が deal-1 に `deal.create` を 1 件、続けて actor-A が invoice-1 に `invoice.create` を 1 件実行した監査ログ（アクションが異なる）
**WHEN** `aggregateTimeline` を適用する
**THEN** 2 件の `TimelineEntry` が返され、それぞれ `count: 1` である

---

### TC-009: フェーズ変更が 3 回連続した場合の正味遷移

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 連続する状態遷移が正味の遷移に集約される > Scenario: フェーズ変更が 3 回連続した場合の正味遷移

---

### TC-010: 遷移情報のない既存ログは transition: null になる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 連続する状態遷移が正味の遷移に集約される > Scenario: 遷移情報のない既存ログは遷移を表示しない

---

### TC-023: invoice.update_status の連続遷移が正味遷移に集約される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** actor-A が invoice-1 の `invoice.update_status` を「scheduled→invoiced」「invoiced→overdue」と 2 回連続実行した監査ログが存在する（各ログに `{ fromStatus, toStatus }` metadata あり）
**WHEN** `aggregateTimeline` を適用する
**THEN** 1 件の `TimelineEntry` に集約され、`transition` は `{ from: "scheduled", to: "overdue" }`、`count` は 2 である

---

### TC-024: contract.updateStatus の連続遷移が正味遷移に集約される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** actor-A が contract-1 の `contract.updateStatus` を「draft→active」「active→completed」と 2 回連続実行した監査ログが存在する（各ログに `{ fromStatus, toStatus }` metadata あり）
**WHEN** `aggregateTimeline` を適用する
**THEN** 1 件の `TimelineEntry` に集約され、`transition` は `{ from: "draft", to: "completed" }`、`count` は 2 である

---

## 件数上限

### TC-011: 集約により上限以下になる場合は全件返される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 件数上限は厳選・集約後に適用される > Scenario: 集約により上限以下になる

---

### TC-012: 集約後も上限を超える場合は上限件数で切り捨てられる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 件数上限は厳選・集約後に適用される > Scenario: 集約後も上限を超える場合は切り捨てられる

---

## 状態遷移の表示

### TC-013: フェーズ変更の「変更前 → 変更後」ラベル表示

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 状態遷移アクションは「変更前 → 変更後」を表示する > Scenario: フェーズ変更の遷移表示

---

### TC-014: 契約ステータス変更の「変更前 → 変更後」ラベル表示

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 状態遷移アクションは「変更前 → 変更後」を表示する > Scenario: 契約ステータス変更の遷移表示

---

## invoice.update_status metadata 記録

### TC-015: 請求ステータス変更時に遷移情報が記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: invoice.update_status の metadata に fromStatus / toStatus を記録する > Scenario: 請求ステータス変更時に遷移情報が記録される

---

## ラベル整備

### TC-016: タイムライン対象 7 アクションに全てラベルが存在する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 表示対象アクションに生のアクションキーが UI へ漏れない > Scenario: タイムライン対象の全アクションにラベルが存在する

---

## 定数・型定義

### TC-017: TIMELINE_ACTIONS に 7 アクション・TRANSITION_ACTIONS に 3 アクションが定義される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/lib/activityConfig.ts` の `TIMELINE_ACTIONS` と `TRANSITION_ACTIONS` 定数
**WHEN** 各配列の内容を検査する
**THEN** `TIMELINE_ACTIONS` が `AuditAction[]` 型で `meeting.create` / `deal.create` / `deal.updatePhase` / `contract.create` / `contract.updateStatus` / `invoice.create` / `invoice.update_status` の 7 アクションを含み、`TRANSITION_ACTIONS` が `deal.updatePhase` / `contract.updateStatus` / `invoice.update_status` の 3 アクションを含む

---

### TC-020: AuditMetadataMap 追加により recordAudit の metadata 型制約が課される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `AuditMetadataMap` に `deal.updatePhase` / `contract.updateStatus` / `invoice.update_status` の 3 エントリが追加されている
**WHEN** `bun run typecheck` を実行する
**THEN** TypeScript がコンパイルエラーなく通過し（既存の `updateDealPhase.ts` / `updateContractStatus.ts` / `updateInvoiceStatus.ts` が正しい metadata を渡しているため）、`AuditRecordParams` の条件型制約により metadata が必須フィールドとして扱われることが確認できる

---

## 環境変数による追加除外

### TC-022: ACTIVITY_HIDDEN_ACTIONS が集約前に適用される

**Category**: integration
**Priority**: should
**Source**: design.md > D4 / tasks.md > T-05

**GIVEN** 環境変数 `ACTIVITY_HIDDEN_ACTIONS` に `"deal.create"` が設定されており、案件配下に `deal.create` の監査ログが存在する
**WHEN** `getDealActivity` を実行する
**THEN** `deal.create` のログが結果に含まれない（`ACTIVITY_HIDDEN_ACTIONS` による除外が有効に機能している）

---

## UI 表示

### TC-025: count > 1 の TimelineEntry に「(N件)」が表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** 同一操作が 3 件集約された `TimelineEntry`（`count: 3`）を `DealActivitySection` に渡す
**WHEN** 案件詳細のアクティビティセクションを表示する
**THEN** 該当エントリに「(3件)」が付加されて表示される

---

### TC-026: 請求ステータス変更の遷移が UI に表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06 / T-07

**GIVEN** `invoice.update_status` の `TimelineEntry` に `transition: { from: "scheduled", to: "invoiced" }` が設定されている
**WHEN** 案件詳細のアクティビティセクションを表示する
**THEN** 「請求ステータスを変更：未請求 → 請求済」のような遷移ラベルが表示される（`invoiceStatusLabels` による日本語化）

---

## 最終検証

### TC-027: typecheck / build / test / lint がすべて成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 実装が完了した状態のコードベース
**WHEN** `bun run typecheck` / `bun run build` / `bun test` / `bun run lint` を順に実行する
**THEN** すべてのコマンドが exit 0 で終了する（エラーなし）

---

### TC-028: activityAggregator.ts が domain / infrastructure を参照しない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10 / design.md > D2

**GIVEN** `src/lib/activityAggregator.ts` の実装
**WHEN** import パスを確認する
**THEN** `domain/` または `infrastructure/` への直接 import が存在せず、依存方向（actions/RSC → usecases → domain / infrastructure）が遵守されている

---

## Result

```yaml
result: completed
total: 28
automated: 23
manual: 5
must: 21
should: 7
could: 0
blocked_reasons: []
```
