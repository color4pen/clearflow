# Tasks: 案件アクティビティ・タイムライン

## T-01: audit_logs テーブルにインデックスを追加（スキーマ＋マイグレーション）

- [x] `src/infrastructure/schema.ts` の `auditLogs` テーブル定義に第 2 引数のコールバックを追加し、2 つのインデックスを定義する:
  - `index("audit_logs_org_created_at_idx").on(table.organizationId, table.createdAt)`
  - `index("audit_logs_target_type_id_idx").on(table.targetType, table.targetId)`
- [x] `bunx drizzle-kit generate` を実行し、差分マイグレーション SQL を生成する。生成された SQL が `CREATE INDEX` 文のみを含み、既存カラムの変更やデータ操作を含まないことを確認する
- [x] `drizzle/meta/_journal.json` に新エントリが追加されていることを確認する

**Acceptance Criteria**:
- `audit_logs` テーブルに `(organization_id, created_at)` と `(target_type, target_id)` のインデックスがスキーマに定義されている
- 差分マイグレーション SQL が `CREATE INDEX` 文のみを含む
- 既存テーブルのデータやカラムに影響を与えない
- `bun run build` が通る

---

## T-02: auditLogRepository に findByTargets メソッドを追加

- [x] `src/infrastructure/repositories/auditLogRepository.ts` に `findByTargets` メソッドを追加する。シグネチャ:
  ```ts
  export async function findByTargets(
    organizationId: string,
    targets: Array<{ targetType: string; targetId: string }>,
    options?: {
      limit?: number;
      excludeActions?: string[];
    }
  ): Promise<AuditLog[]>
  ```
- [x] `targets` が空配列の場合は空配列を即座に返す（クエリ不要）
- [x] Drizzle の `or()` で各 target を `and(eq(auditLogs.targetType, t.targetType), eq(auditLogs.targetId, t.targetId))` として結合する
- [x] `organizationId` 条件を `and()` で必ず付与する（テナント分離）
- [x] `options.excludeActions` が指定された場合、`notInArray(auditLogs.action, excludeActions)` を WHERE 条件に追加する。`notInArray` を `drizzle-orm` から import する
- [x] `orderBy(desc(auditLogs.createdAt))` で降順ソート
- [x] `options.limit` が指定された場合、`.limit(options.limit)` を付与する
- [x] 結果を既存の `findByOrganization` と同じ形式で `AuditLog` 型にマッピングして返す

**Acceptance Criteria**:
- `findByTargets` が export されている
- 全クエリに `organizationId` 条件が含まれている（テナント分離）
- `targets` が空のとき空配列を返す
- `excludeActions` 指定時に該当 action が除外される
- `createdAt desc` でソートされる
- `limit` が適用される
- `bun run build` が通る

---

## T-03: アクティビティ設定の定数＋env 解決ユーティリティ

- [x] `src/lib/activityConfig.ts` を新規作成する
- [x] 定数 `ACTIVITY_TIMELINE_LIMIT = 30` を export する
- [x] 定数 `DEFAULT_HIDDEN_ACTIONS: string[] = []` を export する（既定の除外リスト、空）
- [x] 関数 `getHiddenActions(): string[]` を export する。`process.env.ACTIVITY_HIDDEN_ACTIONS` が設定されていればカンマ区切りで分割して返す。未設定なら `DEFAULT_HIDDEN_ACTIONS` を返す。各要素は `.trim()` で空白を除去する
- [x] 関数 `isActivityFeedEnabled(): boolean` を export する。`process.env.ACTIVITY_FEED_ENABLED === "true"` を返す

**Acceptance Criteria**:
- `ACTIVITY_TIMELINE_LIMIT` が 30 である
- `getHiddenActions()` が env 未設定時に空配列を返す
- `getHiddenActions()` が env 設定時にカンマ区切りの配列を返す
- `isActivityFeedEnabled()` が `"true"` のとき true、それ以外で false を返す
- `bun run build` が通る

---

## T-04: アクションラベル整形ユーティリティ

- [x] `src/lib/activityLabels.ts` を新規作成する
- [x] `getActionLabel(action: string): string` を export する。主要な action 名から日本語ラベルへのマッピング Record を内部に定義する。マッピング例:
  - `"deal.create"` → `"案件を作成"`
  - `"deal.update"` → `"案件を更新"`
  - `"deal.updatePhase"` → `"フェーズを変更"`
  - `"deal.delete"` → `"案件を削除"`
  - `"contract.create"` → `"契約を作成"`
  - `"contract.update"` → `"契約を更新"`
  - `"contract.cancel"` → `"契約を解除"`
  - `"meeting.create"` → `"商談を記録"`
  - `"meeting.update"` → `"商談を更新"`
  - `"action_item.create"` → `"アクションアイテムを追加"`
  - `"action_item.update"` → `"アクションアイテムを更新"`
  - `"action_item.toggleDone"` → `"アクションアイテムの完了状態を変更"`
  - `"action_item.delete"` → `"アクションアイテムを削除"`
  - `"deal_contact.add"` → `"担当者を追加"`
  - `"deal_contact.remove"` → `"担当者を削除"`
  - `"invoice.create"` → `"請求を作成"`
  - `"invoice.update"` → `"請求を更新"`
  - マッピングに存在しない action はそのまま返す（フォールバック）
- [x] `getTargetTypeLabel(targetType: string): string` を export する。targetType から日本語ラベルへのマッピング:
  - `"deal"` → `"案件"`
  - `"contract"` → `"契約"`
  - `"meeting"` → `"商談"`
  - `"action_item"` → `"アクションアイテム"`
  - `"deal_contact"` → `"担当者"`
  - `"invoice"` → `"請求"`
  - [x] マッピングに存在しない targetType はそのまま返す

**Acceptance Criteria**:
- `getActionLabel` と `getTargetTypeLabel` が export されている
- 定義済み action は日本語ラベルを返す
- 未定義の action はそのまま返す（フォールバック）
- `bun run build` が通る

---

## T-05: getDealActivity usecase を新設

- [x] `src/application/usecases/getDealActivity.ts` を新規作成する
- [x] シグネチャ: `getDealActivity(params: { dealId: string; organizationId: string }): Promise<AuditLog[]>`
- [x] 既存リポジトリを使って案件配下の子エンティティ id を取得する:
  - `meetingRepository.findAllByDeal(dealId, organizationId)` → 各 meeting の id
  - `contractRepository.findAllByDealId(dealId, organizationId)` → 各 contract の id
  - `actionItemRepository.findByDeal(dealId, organizationId)` → 各 actionItem の id
  - `dealContactRepository.findByDeal(dealId, organizationId)` → 各 dealContact の id
  - 4 つの取得を `Promise.all` で並列実行する
- [x] targets 配列を構築する:
  - `{ targetType: "deal", targetId: dealId }` を先頭に追加
  - 各子エンティティから `{ targetType: "meeting", targetId: m.id }` 等を追加
- [x] `getHiddenActions()` で除外アクションリストを取得する
- [x] `auditLogRepository.findByTargets(organizationId, targets, { limit: ACTIVITY_TIMELINE_LIMIT, excludeActions })` を呼び出す。`excludeActions` は空配列でなければ渡す
- [x] 結果の `AuditLog[]` を返す
- [x] `src/application/usecases/index.ts` に `export { getDealActivity } from "./getDealActivity"` を追加する

**Acceptance Criteria**:
- `getDealActivity` が export されている
- 案件自身＋配下（商談/契約/アクションアイテム/案件連絡先）の監査ログを取得する
- 子エンティティ取得は `Promise.all` で並列化されている
- `ACTIVITY_TIMELINE_LIMIT` 件数制限が適用される
- 除外アクションが `getHiddenActions()` で解決される
- 依存: `usecases → repositories / lib`（domain 層の呼び出しなし）
- `bun run build` が通る

---

## T-06: 案件詳細ページにアクティビティ SectionCard を追加

- [x] `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx` を新規作成する（Server Component）
- [x] Props: `activities: AuditLog[]`, `userMap: Record<string, string>`
- [x] 各アクティビティ行に以下を表示する:
  - 相対時間（`formatRelativeTime` を `dashboardUtils.ts` から import）
  - actor 名（`userMap[log.actorId]` で解決、未解決時は actorId の先頭 8 文字）
  - アクションラベル（`getActionLabel(log.action)` を `@/lib/activityLabels` から import）
  - 対象種別ラベル（`getTargetTypeLabel(log.targetType)` を使用）
- [x] 表示形式: 時系列の縦リスト。各行は `border-b border-border-light` で区切る。アクティビティが 0 件の場合は「アクティビティはありません」テキストを表示する
- [x] `src/app/(dashboard)/deals/[id]/page.tsx` を編集する:
  - `isActivityFeedEnabled` を `@/lib/activityConfig` から import する
  - `isActivityFeedEnabled()` が true のとき:
    - `getDealActivity` を import して `getDealActivity({ dealId: deal.id, organizationId })` を呼び出す（既存の `Promise.all` に追加するか、フラグ確認後に個別呼び出し）
    - `listOrganizationUsers` は既に呼ばれているので、`users` から `userMap` を構築する
    - 右カラムの「アクションアイテム」セクションの下（`</div>` 閉じタグの直前）に `DealActivitySection` を配置する。`SectionCard` で囲み、見出し「アクティビティ」を表示する
  - `isActivityFeedEnabled()` が false のとき: アクティビティ関連のコードは一切実行しない

**Acceptance Criteria**:
- `ACTIVITY_FEED_ENABLED=true` のとき案件詳細にアクティビティ SectionCard が表示される
- 各行に相対時間・actor 名・アクションラベル・対象種別が表示される
- `ACTIVITY_FEED_ENABLED` が未設定/false のときセクションが表示されない
- 0 件のとき空状態メッセージが表示される
- `bun run build` が通る

---

## T-07: テスト — getDealActivity usecase の静的検証

- [x] `src/__tests__/usecases/dealActivity.test.ts` を新規作成する
- [x] テスト: `getDealActivity.ts` のソースに `meetingRepository.findAllByDeal` の呼び出しが含まれることを静的解析で確認する
- [x] テスト: `getDealActivity.ts` のソースに `contractRepository.findAllByDealId` の呼び出しが含まれることを静的解析で確認する
- [x] テスト: `getDealActivity.ts` のソースに `actionItemRepository.findByDeal` の呼び出しが含まれることを静的解析で確認する
- [x] テスト: `getDealActivity.ts` のソースに `dealContactRepository.findByDeal` の呼び出しが含まれることを静的解析で確認する
- [x] テスト: `getDealActivity.ts` のソースに `auditLogRepository.findByTargets` の呼び出しが含まれることを静的解析で確認する
- [x] テスト: `getDealActivity.ts` のソースに `ACTIVITY_TIMELINE_LIMIT` の参照が含まれることを確認する
- [x] テスト: `getDealActivity.ts` のソースに `getHiddenActions` の呼び出しが含まれることを確認する
- [x] テスト: `getDealActivity.ts` のソースに `Promise.all` が含まれることを確認する（並列取得）

**Acceptance Criteria**:
- getDealActivity が案件＋配下 4 種の子エンティティ取得を行っていることがテストで検証される
- 件数制限と除外フィルタの使用がテストで検証される
- `bun test` が全件 green

---

## T-08: テスト — auditLogRepository.findByTargets のテナント分離

- [x] `src/__tests__/static/projectStructure.test.ts` に以下のテストを追加する
- [x] テスト: `auditLogRepository.ts` の `findByTargets` メソッドのソースに `organizationId` が含まれることを確認する
- [x] テスト: `auditLogRepository.ts` の `findByTargets` メソッドのソースに `or(` が含まれることを確認する（複数ターゲットの OR 結合）
- [x] テスト: `auditLogRepository.ts` の `findByTargets` メソッドのソースに `desc(auditLogs.createdAt)` が含まれることを確認する

**Acceptance Criteria**:
- findByTargets のテナント分離がテストで検証される
- 複数ターゲットの OR 結合がテストで検証される
- 降順ソートがテストで検証される
- `bun test` が全件 green

---

## T-09: テスト — フィーチャーフラグと除外フィルタ

- [x] `src/__tests__/static/projectStructure.test.ts` に以下のテストを追加する
- [x] テスト: `src/app/(dashboard)/deals/[id]/page.tsx` のソースに `isActivityFeedEnabled` の呼び出しが含まれることを確認する
- [x] テスト: `src/lib/activityConfig.ts` のソースに `ACTIVITY_FEED_ENABLED` の参照が含まれることを確認する
- [x] テスト: `src/lib/activityConfig.ts` のソースに `ACTIVITY_HIDDEN_ACTIONS` の参照が含まれることを確認する
- [x] テスト: `src/infrastructure/schema.ts` の `auditLogs` テーブル定義に `audit_logs_org_created_at_idx` と `audit_logs_target_type_id_idx` のインデックス名が含まれることを確認する

**Acceptance Criteria**:
- フィーチャーフラグの使用がテストで検証される
- 除外フィルタの env 参照がテストで検証される
- インデックスのスキーマ定義がテストで検証される
- `bun test` が全件 green

---

## T-10: テスト — アクションラベルユーティリティ

- [x] `src/__tests__/lib/activityLabels.test.ts` を新規作成する
- [x] テスト: `getActionLabel("deal.create")` が `"案件を作成"` を返すことをユニットテストで確認する
- [x] テスト: `getActionLabel("unknown.action")` がそのまま `"unknown.action"` を返すことを確認する（フォールバック）
- [x] テスト: `getTargetTypeLabel("deal")` が `"案件"` を返すことを確認する
- [x] テスト: `getTargetTypeLabel("unknown")` がそのまま `"unknown"` を返すことを確認する（フォールバック）

**Acceptance Criteria**:
- 定義済みラベルの変換が正しいことがテストで検証される
- 未定義 action/targetType のフォールバックがテストで検証される
- `bun test` が全件 green

---

## T-11: テスト — activityConfig ユーティリティ

- [x] `src/__tests__/lib/activityConfig.test.ts` を新規作成する
- [x] テスト: `ACTIVITY_TIMELINE_LIMIT` が `30` であることを確認する
- [x] テスト: `getHiddenActions()` の戻り値が配列であることを確認する
- [x] テスト: `isActivityFeedEnabled()` の戻り値が boolean であることを確認する

**Acceptance Criteria**:
- 定数値と関数の型がテストで検証される
- `bun test` が全件 green

---

## T-12: 最終確認 — ビルド・型チェック・テスト

- [x] `bun run build` を実行し、ビルドが成功することを確認する
- [x] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [x] `bun test` を実行し、全テストが green であることを確認する（既存テスト無変更）
- [x] `bun run lint` を実行し、lint エラーがないことを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `typecheck` green
- `bun test` 全件 green（既存テスト無変更）
- `bun run lint` エラーなし
