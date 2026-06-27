# Domain-Invariants Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    invariants are maintained; change is safe to merge
  - needs-fix:   one or more invariants are broken; must be resolved before merge
  - escalation:  unresolvable conflicts or ambiguity; requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: data leakage across tenants, audit gap on terminal operations, unreachable terminal state
  - HIGH:     verifiable invariant violation with realistic exploit path or spec non-compliance
  - MEDIUM:   defense-in-depth gap, policy violation with low practical risk
  - LOW:      informational, pre-existing issue, by-design known limitation
-->

- **verdict**: approved

## Scope

テナント分離（organizationId によるデータ境界保護）、監査ログの完全性（全更新操作の audit_logs 記録）、楽観的ロック不変条件（version 一致・インクリメント・失敗時の Result 返却・トランザクション境界）を検証した。承認ワークフローは本変更のスコープ外（approval_steps / requests は非変更）。

対象ファイル（新規・変更）:
- `drizzle/0010_remaining_entity_version.sql` — 差分マイグレーション
- `src/infrastructure/schema.ts` — meetings / action_items / revenue_targets テーブル定義
- `src/domain/models/meeting.ts` / `actionItem.ts` / `revenueTarget.ts` — ドメインモデル
- `src/infrastructure/repositories/meetingRepository.ts` — mapRow + update 変更
- `src/infrastructure/repositories/actionItemRepository.ts` — mapRow + update 変更
- `src/infrastructure/repositories/revenueTargetRepository.ts` — mapRow + update 変更
- `src/application/usecases/updateMeeting.ts` — 楽観的ロック統合
- `src/application/usecases/updateActionItem.ts` — 楽観的ロック統合
- `src/application/usecases/toggleActionItemDone.ts` — 楽観的ロック統合
- `src/application/usecases/updateRevenueTarget.ts` — 楽観的ロック統合
- `src/__tests__/usecases/optimisticLock.test.ts` — テスト追加

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Audit log completeness | `src/application/usecases/updateRevenueTarget.ts` (L49-87) | `findOverlapping` チェック（L37-46）がトランザクション外で実行される。2人のユーザーが異なる revenue_target を同時に期間変更する場合、両者が同時に `findOverlapping` を通過し、その後のトランザクション内でそれぞれ別レコードを更新すると重複期間が成立し得る。ただし本変更以前から存在する pre-existing 設計であり、楽観的ロックが対象としているのは「同一レコードの並行更新」であって「異なるレコード間の制約違反」は別の問題。また revenue_target の重複はビジネス上の即時被害が小さく、既存テスト・レビューで许容済みの既知制約である。 | スコープ外のため対応任意。将来の改善として `findOverlapping` + `update` を同一トランザクション内で実行する SELECT FOR UPDATE パターンへの変更を推奨するが、本 PR での対応は不要。 |

## Invariant Checklist

### テナント分離

| 対象 | 確認内容 | 結果 |
|------|----------|------|
| `meetingRepository.findById` | `and(eq(meetings.id, id), eq(meetings.organizationId, organizationId))` | ✅ PASS |
| `meetingRepository.update` | `and(eq(meetings.id, id), eq(meetings.organizationId, organizationId), eq(meetings.version, expectedVersion))` | ✅ PASS |
| `actionItemRepository.findById` | `and(eq(actionItems.id, id), eq(actionItems.organizationId, organizationId))` | ✅ PASS |
| `actionItemRepository.update` | `and(eq(actionItems.id, id), eq(actionItems.organizationId, organizationId), eq(actionItems.version, expectedVersion))` | ✅ PASS |
| `revenueTargetRepository.findById` | `and(eq(revenueTargets.id, id), eq(revenueTargets.organizationId, organizationId))` | ✅ PASS |
| `revenueTargetRepository.update` | `and(eq(revenueTargets.id, id), eq(revenueTargets.organizationId, organizationId), eq(revenueTargets.version, expectedVersion))` | ✅ PASS |
| `updateMeetingAction` の organizationId 取得元 | `session.user.organizationId`（URL クエリ・フォームデータ不使用）| ✅ PASS |
| `updateActionItemAction` / `toggleActionItemAction` の organizationId 取得元 | `session.user.organizationId` | ✅ PASS |
| `updateRevenueTargetAction` の organizationId 取得元 | `session.user.organizationId` | ✅ PASS |

### 監査ログ完全性

| 操作 | audit_logs アクション | トランザクション内 | ロック失敗時にスキップ | 結果 |
|------|----------------------|-------------------|----------------------|------|
| 商談更新 | `meeting.update` | ✅ tx 内 | ✅ null 時に return null → audit 未記録 | ✅ PASS |
| アクションアイテム更新 | `action_item.update`（metadata: updateData） | ✅ tx 内 | ✅ null 時に return null → audit 未記録 | ✅ PASS |
| アクションアイテム完了トグル | `action_item.toggle`（metadata: { done }） | ✅ tx 内 | ✅ null 時に return null → audit 未記録 | ✅ PASS |
| 売上目標更新 | `revenue_target.update`（metadata: before/after） | ✅ tx 内 | ✅ result が null 時に auditLog より前に return null | ✅ PASS |

### 楽観的ロック不変条件

| 不変条件 | 実装箇所 | 結果 |
|----------|----------|------|
| version カラム存在（3 テーブル） | `drizzle/0010_remaining_entity_version.sql`、`schema.ts` | ✅ PASS |
| WHERE に version 一致条件（3 リポジトリ） | `eq(<table>.version, expectedVersion)` が全 update に存在 | ✅ PASS |
| SET で version インクリメント（3 リポジトリ） | `version: sql\`version + 1\`` が全 update に存在 | ✅ PASS |
| mapRow に version 含む（3 リポジトリ） | `version: row.version` が全 mapRow に存在 | ✅ PASS |
| usecase が findById 時の version を渡す（4 usecase） | `existing.version` を update 第 4 引数に渡す | ✅ PASS |
| ロック失敗時の Result 返却（4 usecase） | `{ ok: false, reason: "この<対象>は他のユーザーによって更新されました。画面を更新してください" }` | ✅ PASS |
| ロック失敗時に audit log を記録しない（4 usecase） | update 返却 null 確認後に `return null` → outer で `{ ok: false }` | ✅ PASS |
| 全ミューテーション操作のトランザクション境界 | 4 usecase すべてが `db.transaction()` 内で update + audit を実行 | ✅ PASS |
| actionItemRepository.update 1 メソッドで 2 usecase をカバー | `updateActionItem` / `toggleActionItemDone` が同一メソッドを経由 | ✅ PASS |

### 承認ワークフロー不変条件

| 不変条件 | 確認内容 | 結果 |
|----------|----------|------|
| approval_steps / requests への非干渉 | 本変更のファイル差分に承認ワークフロー関連ファイルなし | ✅ PASS（スコープ外） |
| 依存方向 actions → usecases → domain / infrastructure | 4 usecase は domain/authorization を直接参照せず、infrastructure と domain のみ依存 | ✅ PASS |

## Summary

ADR-005 で確立された楽観的ロックパターンを meetings / action_items / revenue_targets の 3 エンティティへ正確に横展開できている。

**テナント分離**: 3 リポジトリの `findById` および `update` すべてに `organizationId` 条件が含まれており、テナント境界は DB レイヤーで保護されている。Server Actions（`updateMeetingAction` / `updateActionItemAction` / `toggleActionItemAction` / `updateRevenueTargetAction`）は全て `session.user.organizationId` からのみ organizationId を取得しており、ユーザー入力による organizationId 偽装は不可能。

**監査ログ完全性**: 全 4 usecase にて `auditLogRepository.create` は `db.transaction()` 内に配置されており、data 変更と audit 記録が原子的に実行される。楽観的ロック失敗時（update が null を返す場合）は `return null` によって audit 記録をスキップし、存在しない更新の ghost audit entry は生成されない。

**楽観的ロック不変条件**: version 不一致での更新拒否・成功時のインクリメント・Result 型でのエラー返却がすべて正しく実装されている。HIGH/CRITICAL 件数ゼロ。

残存 findings は LOW 1件のみ（pre-existing / スコープ外）。verdict は `approved`。
