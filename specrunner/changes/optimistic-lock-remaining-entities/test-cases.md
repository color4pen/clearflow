# Test Cases: 残りの更新系エンティティの楽観的ロック（会議・アクションアイテム・売上目標）

## Summary

- **Total**: 25 cases
- **Automated** (unit/integration): 21
- **Manual**: 4
- **Priority**: must: 22, should: 3, could: 0

---

## Meeting の楽観的ロック

### TC-001: version 一致で Meeting 更新が成功し version がインクリメントされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Meeting の楽観的ロック > Scenario: version 一致で Meeting 更新が成功し version がインクリメントされる

---

### TC-002: version 不一致で Meeting 更新が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Meeting の楽観的ロック > Scenario: version 不一致で Meeting 更新が拒否される

---

## ActionItem の楽観的ロック（updateActionItem）

### TC-003: version 一致で ActionItem 更新が成功し version がインクリメントされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ActionItem の楽観的ロック（updateActionItem）> Scenario: version 一致で ActionItem 更新が成功し version がインクリメントされる

---

### TC-004: version 不一致で ActionItem 更新が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ActionItem の楽観的ロック（updateActionItem）> Scenario: version 不一致で ActionItem 更新が拒否される

---

## ActionItem の楽観的ロック（toggleActionItemDone）

### TC-005: version 一致で toggleActionItemDone が成功し version がインクリメントされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ActionItem の楽観的ロック（toggleActionItemDone）> Scenario: version 一致で toggleActionItemDone が成功し version がインクリメントされる

---

### TC-006: version 不一致で toggleActionItemDone が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ActionItem の楽観的ロック（toggleActionItemDone）> Scenario: version 不一致で toggleActionItemDone が拒否される

---

## RevenueTarget の楽観的ロック

### TC-007: version 一致で RevenueTarget 更新が成功し version がインクリメントされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: RevenueTarget の楽観的ロック > Scenario: version 一致で RevenueTarget 更新が成功し version がインクリメントされる

---

### TC-008: version 不一致で RevenueTarget 更新が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: RevenueTarget の楽観的ロック > Scenario: version 不一致で RevenueTarget 更新が拒否される

---

## 差分マイグレーション

### TC-009: 差分マイグレーション適用後に既存行の version が 1 になる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: version カラムの差分マイグレーション > Scenario: 既存行に version = 1 が付与される

---

## リポジトリ mapRow

### TC-010: meetingRepository の findById が version を含む Meeting を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: リポジトリの mapRow に version を含める > Scenario: リポジトリの findById が version を含む Meeting を返す

---

### TC-011: マイグレーション SQL が 3 テーブル分の ALTER TABLE 文を含む

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `drizzle/0010_remaining_entity_version.sql` が存在する
**WHEN** SQL ファイルの内容を確認する
**THEN** `meetings` / `action_items` / `revenue_targets` それぞれに対して `ALTER TABLE "<table>" ADD COLUMN "version" integer DEFAULT 1 NOT NULL` 文が存在し、statement-breakpoint で区切られている

---

### TC-012: _journal.json に 0010_remaining_entity_version エントリが追加されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `drizzle/meta/_journal.json` が存在する
**WHEN** entries 配列を確認する
**THEN** `idx: 9`, `tag: "0010_remaining_entity_version"` のエントリが存在する

---

### TC-013: schema.ts の 3 テーブル定義に version カラムが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の meetings / actionItems / revenueTargets テーブル定義
**WHEN** 各テーブルの columns を確認する
**THEN** 全 3 テーブルに `integer("version").notNull().default(1)` が存在する

---

### TC-014: 3 ドメインモデル型に version: number フィールドが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/meeting.ts` / `actionItem.ts` / `revenueTarget.ts`
**WHEN** 各モデル型定義を確認する
**THEN** `Meeting` / `ActionItem` / `RevenueTarget` 型すべてに `version: number` フィールドが存在する

---

### TC-015: actionItemRepository と revenueTargetRepository の mapRow に version が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/actionItemRepository.ts` および `revenueTargetRepository.ts` の `mapRow` 関数
**WHEN** 返却オブジェクトを確認する
**THEN** 両ファイルの mapRow に `version: row.version` が含まれる

---

### TC-016: 3 リポジトリの update シグネチャに expectedVersion パラメータが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `meetingRepository.ts` / `actionItemRepository.ts` / `revenueTargetRepository.ts` の `update` 関数
**WHEN** 関数シグネチャを確認する
**THEN** 全 3 リポジトリに `expectedVersion: number` パラメータが `data` の後に存在する

---

### TC-017: 3 リポジトリの update WHERE 条件に version 一致チェックが含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 3 リポジトリの update メソッド
**WHEN** WHERE 句を確認する
**THEN** `eq(meetings.version, expectedVersion)` / `eq(actionItems.version, expectedVersion)` / `eq(revenueTargets.version, expectedVersion)` がそれぞれ存在する

---

### TC-018: 3 リポジトリの update SET 句で version がインクリメントされる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 3 リポジトリの update メソッドの `.set()` 呼び出し
**WHEN** SET 句の内容を確認する
**THEN** 全 3 リポジトリに `` version: sql`version + 1` `` が含まれる

---

### TC-019: updateMeeting が existing.version を meetingRepository.update に渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/application/usecases/updateMeeting.ts`
**WHEN** `meetingRepository.update` 呼び出し箇所を確認する
**THEN** `existing.version` が `expectedVersion` として渡されている

---

### TC-020: updateActionItem が existing.version を actionItemRepository.update に渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/application/usecases/updateActionItem.ts`
**WHEN** `actionItemRepository.update` 呼び出し箇所を確認する
**THEN** `existing.version` が渡されている

---

### TC-021: toggleActionItemDone が existing.version を actionItemRepository.update に渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/toggleActionItemDone.ts`
**WHEN** `actionItemRepository.update` 呼び出し箇所を確認する
**THEN** `existing.version` が渡されている

---

### TC-022: updateRevenueTarget が existing.version を revenueTargetRepository.update に渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/application/usecases/updateRevenueTarget.ts`
**WHEN** `revenueTargetRepository.update` 呼び出し箇所を確認する
**THEN** `existing.version` が渡されている

---

### TC-023: 4 usecase がエンティティ固有のロック失敗メッセージを含む

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `updateMeeting.ts` / `updateActionItem.ts` / `toggleActionItemDone.ts` / `updateRevenueTarget.ts`
**WHEN** ロック失敗時の reason 文字列を確認する
**THEN** 以下のメッセージがそれぞれのファイルに存在する:
- `updateMeeting.ts`: `"この商談は他のユーザーによって更新されました。画面を更新してください"`
- `updateActionItem.ts`: `"このアクションアイテムは他のユーザーによって更新されました。画面を更新してください"`
- `toggleActionItemDone.ts`: `"このアクションアイテムは他のユーザーによって更新されました。画面を更新してください"`
- `updateRevenueTarget.ts`: `"この売上目標は他のユーザーによって更新されました。画面を更新してください"`

---

### TC-024: updateRevenueTarget でロック失敗時に auditLog が作成されない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-08, design.md > D3

**GIVEN** `src/application/usecases/updateRevenueTarget.ts` の update 呼び出し後
**WHEN** `revenueTargetRepository.update` が null を返した場合の制御フローを確認する
**THEN** `auditLogRepository.create` より前に null を return するコードが存在し、ロック失敗時に監査ログが記録されない

---

### TC-025: ビルド・型チェック・全テストが green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 全変更（T-01〜T-09）が適用された状態
**WHEN** `bun run build` / `bun run typecheck` / `bun test` を実行する
**THEN** 全コマンドがエラーなく成功し、既存テストに変更がない

---

## Result

```yaml
result: completed
total: 25
automated: 21
manual: 4
must: 22
should: 3
could: 0
blocked_reasons: []
```
