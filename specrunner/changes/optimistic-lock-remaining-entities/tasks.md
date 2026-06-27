# Tasks: 残りの更新系エンティティの楽観的ロック

## T-01: 差分マイグレーション — meetings / action_items / revenue_targets に version カラム追加

- [ ] `drizzle/0010_remaining_entity_version.sql` を作成する
  - `ALTER TABLE "meetings" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint`
  - `ALTER TABLE "action_items" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint`
  - `ALTER TABLE "revenue_targets" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;`
- [ ] `drizzle/meta/_journal.json` に idx=9, tag=`0010_remaining_entity_version` のエントリを追加する
- [ ] `drizzle/meta/0009_snapshot.json` を作成する（`drizzle/meta/0008_snapshot.json` をベースに、meetings / action_items / revenue_targets 各テーブル定義の columns に version カラムエントリを追加した内容にする）
- [ ] `src/infrastructure/schema.ts` の `meetings` テーブル定義に `version: integer("version").notNull().default(1)` を追加する（`updatedAt` の後）
- [ ] `src/infrastructure/schema.ts` の `actionItems` テーブル定義に `version: integer("version").notNull().default(1)` を追加する（`updatedAt` の後）
- [ ] `src/infrastructure/schema.ts` の `revenueTargets` テーブル定義に `version: integer("version").notNull().default(1)` を追加する（`updatedAt` の後）

**Acceptance Criteria**:
- マイグレーション SQL が 3 つの ALTER TABLE 文を含む
- schema.ts の meetings / action_items / revenue_targets 各テーブル定義に `integer("version").notNull().default(1)` が存在する
- _journal.json に新エントリが追加されている
- `bun run build` が成功する

## T-02: ドメインモデル — Meeting / ActionItem / RevenueTarget 型に version フィールド追加

- [ ] `src/domain/models/meeting.ts` の `Meeting` 型に `version: number` フィールドを追加する（`updatedAt: Date` の後）
- [ ] `src/domain/models/actionItem.ts` の `ActionItem` 型に `version: number` フィールドを追加する（`updatedAt: Date` の後）
- [ ] `src/domain/models/revenueTarget.ts` の `RevenueTarget` 型に `version: number` フィールドを追加する（`updatedAt: Date` の後）

**Acceptance Criteria**:
- 3 つのドメインモデル型すべてに `version: number` が存在する
- `typecheck` が green

## T-03: リポジトリ mapRow — version マッピング追加

- [ ] `src/infrastructure/repositories/meetingRepository.ts` の `mapRow` 関数の返却オブジェクトに `version: row.version` を追加する
- [ ] `src/infrastructure/repositories/actionItemRepository.ts` の `mapRow` 関数の返却オブジェクトに `version: row.version` を追加する
- [ ] `src/infrastructure/repositories/revenueTargetRepository.ts` の `mapRow` 関数の返却オブジェクトに `version: row.version` を追加する

**Acceptance Criteria**:
- 3 つのリポジトリの mapRow すべてに `version: row.version` が存在する
- `typecheck` が green

## T-04: リポジトリ update — 楽観的ロック WHERE 条件追加

- [ ] `src/infrastructure/repositories/meetingRepository.ts` の `update` 関数:
  - シグネチャに `expectedVersion: number` パラメータを追加する（`data` の後、`tx` の前）
  - `drizzle-orm` から `sql` をインポートする（既存の import 行に追加）
  - `.set()` 内に `version: sql\`version + 1\`` を追加する
  - `.where()` 条件に `eq(meetings.version, expectedVersion)` を追加する
- [ ] `src/infrastructure/repositories/actionItemRepository.ts` の `update` 関数:
  - シグネチャに `expectedVersion: number` パラメータを追加する（`data` の後、`tx` の前）
  - `drizzle-orm` から `sql` をインポートする（既存の import 行に追加）
  - `.set()` 内に `version: sql\`version + 1\`` を追加する
  - `.where()` 条件に `eq(actionItems.version, expectedVersion)` を追加する
- [ ] `src/infrastructure/repositories/revenueTargetRepository.ts` の `update` 関数:
  - シグネチャに `expectedVersion: number` パラメータを追加する（`data` の後、`tx` の前）
  - `drizzle-orm` から `sql` をインポートする（既存の import 行に追加）
  - `.set()` 内に `version: sql\`version + 1\`` を追加する
  - `.where()` 条件に `eq(revenueTargets.version, expectedVersion)` を追加する

**Acceptance Criteria**:
- 3 つのリポジトリの update 関数すべてが `expectedVersion` パラメータを持つ
- WHERE 条件に version 一致チェックが含まれる
- SET に `version: sql\`version + 1\`` が含まれる
- `typecheck` が green

## T-05: usecase — updateMeeting に楽観的ロック統合

- [ ] `src/application/usecases/updateMeeting.ts` を修正:
  - `meetingRepository.update` 呼び出しに `existing.version` を `expectedVersion` として渡す（`data` の後、`tx` の前）
  - トランザクション内で `updated` が null の場合、throw ではなく null を返す
  - トランザクション結果が null の場合に `{ ok: false, reason: "この商談は他のユーザーによって更新されました。画面を更新してください" }` を返す（updateContract のパターンに倣う）

**Acceptance Criteria**:
- `existing.version` が `meetingRepository.update` に渡されている
- ロック失敗時に統一メッセージの `{ ok: false }` が返る
- `typecheck` が green

## T-06: usecase — updateActionItem に楽観的ロック統合

- [ ] `src/application/usecases/updateActionItem.ts` を修正:
  - `actionItemRepository.update` 呼び出しに `existing.version` を `expectedVersion` として渡す（`updateData` の後、`tx` の前）
  - トランザクション内で `updated` が null の場合、throw ではなく null を返す
  - トランザクション結果が null の場合に `{ ok: false, reason: "このアクションアイテムは他のユーザーによって更新されました。画面を更新してください" }` を返す

**Acceptance Criteria**:
- `existing.version` が `actionItemRepository.update` に渡されている
- ロック失敗時に統一メッセージの `{ ok: false }` が返る
- `typecheck` が green

## T-07: usecase — toggleActionItemDone に楽観的ロック統合

- [ ] `src/application/usecases/toggleActionItemDone.ts` を修正:
  - `actionItemRepository.update` 呼び出しに `existing.version` を `expectedVersion` として渡す（`{ done: !existing.done }` の後、`tx` の前）
  - トランザクション内で `updated` が null の場合、throw ではなく null を返す
  - トランザクション結果が null の場合に `{ ok: false, reason: "このアクションアイテムは他のユーザーによって更新されました。画面を更新してください" }` を返す

**Acceptance Criteria**:
- `existing.version` が `actionItemRepository.update` に渡されている
- ロック失敗時に統一メッセージの `{ ok: false }` が返る
- `typecheck` が green

## T-08: usecase — updateRevenueTarget に楽観的ロック統合

- [ ] `src/application/usecases/updateRevenueTarget.ts` を修正:
  - `revenueTargetRepository.update` 呼び出しに `existing.version` を `expectedVersion` として渡す（`{ periodStart, periodEnd, targetAmount }` の後、`tx` の前）
  - トランザクション内で `result` が null の場合（version 不一致）、`auditLogRepository.create` を実行する前に null を return する（参照実装 `updateContract.ts` の `if (!updatedContract) { return null; }` パターンに倣い、`update` 直後・`auditLogRepository.create` より前に配置する）
  - トランザクション結果が null の場合に `{ ok: false, reason: "この売上目標は他のユーザーによって更新されました。画面を更新してください" }` を返す（既存の null チェックロジックを楽観的ロック失敗メッセージに変更）

**Acceptance Criteria**:
- `existing.version` が `revenueTargetRepository.update` に渡されている
- ロック失敗時に統一メッセージの `{ ok: false }` が返る
- `typecheck` が green

## T-09: テスト — 楽観的ロック静的コード解析テスト追加

既存の `src/__tests__/usecases/optimisticLock.test.ts` に以下のテストセクションを追加する。テスト手法は既存のパターンに従い、ソースコードの静的解析で楽観的ロックの正しい実装を検証する。

- [ ] **Schema: version columns** セクションに meetings / action_items / revenue_targets の version カラム存在テストを追加する
  - `meetings` テーブルに `integer("version")`, `.notNull()`, `.default(1)` が存在する
  - `action_items` テーブルに同上
  - `revenue_targets` テーブルに同上
- [ ] **Domain model: version field** セクションに Meeting / ActionItem / RevenueTarget の version フィールド存在テストを追加する
  - `domain/models/meeting.ts` に `version: number` が存在する
  - `domain/models/actionItem.ts` に `version: number` が存在する
  - `domain/models/revenueTarget.ts` に `version: number` が存在する
- [ ] **Repository: optimistic lock WHERE clause** セクションに 3 リポジトリのテストを追加する
  - `meetingRepository.ts` に `eq(meetings.version, expectedVersion)` が存在する
  - `actionItemRepository.ts` に `eq(actionItems.version, expectedVersion)` が存在する
  - `revenueTargetRepository.ts` に `eq(revenueTargets.version, expectedVersion)` が存在する
  - 3 リポジトリすべてに `version: sql\`version + 1\`` が存在する
  - 3 リポジトリの mapRow すべてに `version: row.version` が存在する
- [ ] **Usecase: version passed to repository** セクションに 4 usecase のテストを追加する
  - `updateMeeting.ts` に `existing.version` と `meetingRepository.update` が存在する
  - `updateActionItem.ts` に `existing.version` と `actionItemRepository.update` が存在する
  - `toggleActionItemDone.ts` に `existing.version` と `actionItemRepository.update` が存在する
  - `updateRevenueTarget.ts` に `existing.version` と `revenueTargetRepository.update` が存在する
- [ ] **Usecase: optimistic lock failure message** セクションに 4 usecase のテストを追加する
  - `updateMeeting.ts` に「この商談は他のユーザーによって更新されました」が存在する
  - `updateActionItem.ts` に「このアクションアイテムは他のユーザーによって更新されました」が存在する
  - `toggleActionItemDone.ts` に「このアクションアイテムは他のユーザーによって更新されました」が存在する
  - `updateRevenueTarget.ts` に「この売上目標は他のユーザーによって更新されました」が存在する

**Acceptance Criteria**:
- 全新規テストが `bun test src/__tests__/usecases/optimisticLock.test.ts` で green
- 既存テストが壊れていない（`bun test` が全体 green）

## T-10: 最終検証

- [ ] `bun run build` が成功する
- [ ] `typecheck` が green
- [ ] `bun test` が全体 green（既存テスト無変更で通ること）

**Acceptance Criteria**:
- ビルド・型チェック・全テストが green
- 既存テストに変更がないこと
