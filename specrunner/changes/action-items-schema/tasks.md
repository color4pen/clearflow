# Tasks: アクションアイテムのテーブル・モデル・リポジトリ・ユースケース新設

## T-01: Drizzle スキーマに action_items テーブルを追加

- [ ] `src/infrastructure/schema.ts` に `actionItems` テーブルを追加:
  - `id`: uuid, primaryKey, defaultRandom
  - `organizationId`: uuid, notNull, FK → organizations.id
  - `description`: text, notNull
  - `assigneeId`: uuid, nullable, FK → users.id, `onDelete: "set null"`
  - `dueDate`: timestamp (timestamptz), nullable
  - `done`: boolean, notNull, default false
  - `meetingId`: uuid, nullable, FK → meetings.id, `onDelete: "set null"`
  - `dealId`: uuid, nullable, FK → deals.id, `onDelete: "set null"`
  - `inquiryId`: uuid, nullable, FK → inquiries.id, `onDelete: "set null"`
  - `createdById`: uuid, notNull, FK → users.id
  - `createdAt`: timestamp, notNull, defaultNow
  - `updatedAt`: timestamp, notNull, defaultNow
- [ ] テーブル定義の第 2 引数でインデックスを追加:
  - `index("action_items_org_done_idx").on(table.organizationId, table.done)` — 組織内一覧（done フィルタ付き）
  - `index("action_items_meeting_id_idx").on(table.meetingId)` — 商談別取得
  - `index("action_items_deal_id_idx").on(table.dealId)` — 案件別取得
- [ ] `actionItemsRelations` を追加: organization, assignee, meeting, deal, inquiry, createdBy への one リレーション
- [ ] `organizationsRelations` に `actionItems: many(actionItems)` を追加
- [ ] `usersRelations` に `actionItemsAsAssignee: many(actionItems, { relationName: "actionItemsAsAssignee" })` と `actionItemsAsCreator: many(actionItems, { relationName: "actionItemsAsCreator" })` を追加
- [ ] `meetingsRelations` に `actionItemsRef: many(actionItems)` を追加
- [ ] `dealsRelations` に `actionItems: many(actionItems)` を追加
- [ ] `inquiriesRelations` に `actionItems: many(actionItems)` を追加

**Acceptance Criteria**:
- `bunx drizzle-kit generate` でマイグレーション SQL が生成される
- テーブル定義に 6 つの FK 制約（organizations, users×2, meetings, deals, inquiries）がある
- 3 つのインデックスが定義されている
- `bun run build` が型エラーなしで成功する

## T-02: ActionItem ドメインモデル型の定義

- [ ] `src/domain/models/actionItem.ts` を新設し以下の型を定義:
  ```
  export type ActionItem = {
    id: string;
    organizationId: string;
    description: string;
    assigneeId: string | null;
    dueDate: Date | null;
    done: boolean;
    meetingId: string | null;
    dealId: string | null;
    inquiryId: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  };
  ```
- [ ] `src/domain/models/index.ts` に `actionItem.ts` の re-export を追加
- [ ] ファイル内に Drizzle やインフラ層への import がないことを確認

**Acceptance Criteria**:
- `src/domain/models/actionItem.ts` が存在し、`ActionItem` 型が export されている
- `src/domain/models/actionItem.ts` に `@/infrastructure` への import がない
- `src/domain/models/index.ts` から `ActionItem` が re-export されている

## T-03: authorization に actionItem エンティティを追加

- [ ] `src/domain/authorization.ts` の `Entity` union 型に `"actionItem"` を追加
- [ ] `PERMISSION_MATRIX` に `actionItem` エントリを追加:
  - `list`: ALL_ROLES
  - `view`: ALL_ROLES
  - `create`: ADMIN_MANAGER_MEMBER (admin, manager, member)
  - `edit`: ADMIN_MANAGER_MEMBER
  - `toggle`: ADMIN_MANAGER_MEMBER
  - `delete`: ADMIN_MANAGER (admin, manager)

**Acceptance Criteria**:
- `canPerform("member", "actionItem", "create")` が `true` を返す
- `canPerform("member", "actionItem", "delete")` が `false` を返す
- `canPerform("finance", "actionItem", "create")` が `false` を返す
- `canPerform("admin", "actionItem", "delete")` が `true` を返す

## T-04: actionItemRepository の実装

- [ ] `src/infrastructure/repositories/actionItemRepository.ts` を新設
- [ ] `mapRow` ヘルパー関数を実装: DB 行 → `ActionItem` ドメインモデルへの変換
- [ ] `create(data, tx?)` を実装: 必須フィールド + nullable FK を受け取り、INSERT → returning で `ActionItem` を返す
- [ ] `findById(id, organizationId, tx?)` を実装: `id` AND `organizationId` で検索、見つからなければ null
- [ ] `findByOrganization(organizationId, filters?)` を実装:
  - filters: `{ done?: boolean, assigneeId?: string, dealId?: string, meetingId?: string, inquiryId?: string }`
  - 各フィルタが指定されている場合のみ AND 条件に追加
  - `createdAt` の降順でソート
- [ ] `update(id, organizationId, data, tx?)` を実装: Partial な更新データを受け取り、`updatedAt` を現在時刻に設定。返り値は `ActionItem | null`
- [ ] `delete(id, organizationId, tx?)` を実装: `id` AND `organizationId` で削除。削除成功なら true、対象なしなら false
- [ ] `findByDeal(dealId, organizationId)` を実装: 案件に紐づくアクションアイテム一覧を `createdAt` 降順で返す
- [ ] `findByMeeting(meetingId, organizationId)` を実装: 商談に紐づくアクションアイテム一覧を `createdAt` 降順で返す
- [ ] `src/infrastructure/repositories/index.ts` に `export * as actionItemRepository from "./actionItemRepository"` を追加

**Acceptance Criteria**:
- すべてのクエリ（create 含む）に `organizationId` の条件またはカラムが含まれている
- `findByOrganization` がフィルタなしで全件、フィルタ付きで条件に合致する件のみ返す
- `update` が `updatedAt` を自動更新する
- リポジトリがバレルファイルから export されている

## T-05: ユースケースの実装

- [ ] `src/application/usecases/createActionItem.ts` を新設:
  - 引数: `organizationId`, `actorId`, `description`, `assigneeId?`, `dueDate?`, `meetingId?`, `dealId?`, `inquiryId?`
  - 紐づけ先エンティティが指定されている場合、各リポジトリで存在確認 + organizationId 一致検証
  - `actionItemRepository.create` で作成
  - `auditLogRepository.create` で `action_item.create` を記録
  - db.transaction 内で実行
  - 戻り値: `{ ok: true, actionItem } | { ok: false, reason: string }`

- [ ] `src/application/usecases/toggleActionItemDone.ts` を新設:
  - 引数: `id`, `organizationId`, `actorId`
  - `actionItemRepository.findById` で取得 → 存在 + org 一致チェック
  - `done` フラグを反転して `actionItemRepository.update`
  - `auditLogRepository.create` で `action_item.toggle` を記録
  - db.transaction 内で実行

- [ ] `src/application/usecases/updateActionItem.ts` を新設:
  - 引数: `id`, `organizationId`, `actorId`, `description?`, `assigneeId?`, `dueDate?`, `meetingId?`, `dealId?`, `inquiryId?`
  - 存在確認 + org 一致チェック
  - 紐づけ先エンティティが変更される場合、新しい紐づけ先の存在確認 + organizationId 一致検証
  - `actionItemRepository.update` で更新
  - `auditLogRepository.create` で `action_item.update` を記録
  - db.transaction 内で実行

- [ ] `src/application/usecases/deleteActionItem.ts` を新設:
  - 引数: `id`, `organizationId`, `actorId`
  - 存在確認 + org 一致チェック
  - `actionItemRepository.delete` で削除
  - `auditLogRepository.create` で `action_item.delete` を記録
  - db.transaction 内で実行

- [ ] `src/application/usecases/listActionItemsByDeal.ts` を新設:
  - 引数: `dealId`, `organizationId`
  - `dealRepository.findById` で案件の存在確認 + org 一致チェック
  - `actionItemRepository.findByDeal` で一覧取得

- [ ] `src/application/usecases/listActionItemsByMeeting.ts` を新設:
  - 引数: `meetingId`, `organizationId`
  - `meetingRepository.findById` で商談の存在確認 + org 一致チェック
  - `actionItemRepository.findByMeeting` で一覧取得

- [ ] `src/application/usecases/index.ts` に全ユースケースの export を追加

**Acceptance Criteria**:
- 各ユースケースが `organizationId` を検証している
- 紐づけ先エンティティの存在確認と organizationId 一致検証が `create` と `update` で行われている
- 状態変更を伴うすべてのユースケースで audit_log が挿入される
- すべてのユースケースが `{ ok, ... } | { ok: false, reason }` 形式の戻り値を持つ
- バレルファイルから全ユースケースが export されている

## T-06: サーバーアクションの実装

- [ ] `src/app/actions/actionItems.ts` を新設、`"use server"` ディレクティブ付き
- [ ] `createActionItemAction` を実装:
  - `auth()` で認証チェック
  - `canPerform(role, "actionItem", "create")` で認可チェック
  - `checkRateLimit({ key: \`createActionItem:${session.user.id}\`, limit: RATE_LIMITS.createRequest.limit, windowMs: RATE_LIMITS.createRequest.windowMs })` でレート制限チェック（allowed が false なら早期リターン）
  - zod スキーマでバリデーション: description (string, min 1), assigneeId (uuid, optional), dueDate (string ISO, optional), meetingId (uuid, optional), dealId (uuid, optional), inquiryId (uuid, optional)
  - `createActionItem` ユースケースを呼び出す
  - revalidatePath: `/dashboard` を常に含め、dealId があれば `/deals/[dealId]`、meetingId がある場合は meeting を取得して dealId を確認し `/deals/[dealId]/meetings/[meetingId]` も再検証

- [ ] `toggleActionItemAction` を実装:
  - `auth()` → `canPerform(role, "actionItem", "toggle")` → zod で id をバリデーション
  - `toggleActionItemDone` ユースケースを呼び出す
  - revalidatePath: 成功後にアクションアイテムの紐づけ先に応じたパスを再検証（アクションアイテムを取得して dealId/meetingId を確認）

- [ ] `updateActionItemAction` を実装:
  - `auth()` → `canPerform(role, "actionItem", "edit")` → zod でバリデーション
  - `updateActionItem` ユースケースを呼び出す
  - revalidatePath: 更新後のアクションアイテムの紐づけ先に応じたパスを再検証

- [ ] `deleteActionItemAction` を実装:
  - `auth()` → `canPerform(role, "actionItem", "delete")` → zod で id をバリデーション
  - 削除前にアクションアイテムを取得して紐づけ先を記録
  - `deleteActionItem` ユースケースを呼び出す
  - revalidatePath: 記録した紐づけ先に応じたパスを再検証

**Acceptance Criteria**:
- すべてのアクションに `"use server"` ディレクティブがある
- すべてのアクションで `auth()` による認証チェックが最初に行われている
- すべてのアクションで `canPerform` による認可チェックが行われている
- zod スキーマで入力がバリデーションされている
- revalidatePath が `/dashboard` を常に含んでいる
- dealId 付きアクションアイテムで `/deals/[dealId]` が revalidate される

## T-07: Drizzle マイグレーション生成

- [ ] `bunx drizzle-kit generate` を実行し、action_items テーブルの DDL マイグレーションファイルを生成する（`drizzle/0007_*.sql` として生成される）
- [ ] 生成された SQL に CREATE TABLE, FK 制約, インデックスが含まれていることを確認する

**Acceptance Criteria**:
- `drizzle/` 配下に新しいマイグレーション SQL ファイルが生成されている
- CREATE TABLE 文に全カラム・FK 制約・インデックスが含まれている

## T-08: 既存データのマイグレーション SQL 作成

- [ ] `drizzle/0008_migrate_action_items_data.sql` を手動作成（ファイル名は生成された DDL の次番号に合わせる）
- [ ] マイグレーション SQL の内容:
  ```sql
  INSERT INTO action_items (
    id, organization_id, description, assignee_id, due_date, done,
    meeting_id, deal_id, inquiry_id, created_by_id, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    m.organization_id,
    CASE
      WHEN (item->>'assignee') IS NOT NULL AND (item->>'assignee') <> ''
      THEN '[担当: ' || (item->>'assignee') || '] ' || (item->>'description')
      ELSE (item->>'description')
    END,
    NULL,  -- assignee_id: 名前文字列からは解決できない
    CASE
      WHEN (item->>'dueDate') IS NOT NULL AND (item->>'dueDate') <> ''
      THEN (item->>'dueDate')::timestamptz
      ELSE NULL
    END,
    COALESCE((item->>'done')::boolean, false),
    m.id,
    m.deal_id,
    m.inquiry_id,
    m.created_by_id,
    m.created_at,
    m.created_at
  FROM meetings m,
       jsonb_array_elements(m.action_items) AS item
  WHERE jsonb_typeof(m.action_items) = 'array'
    AND jsonb_array_length(m.action_items) > 0
    AND m.created_by_id IS NOT NULL;
  ```
- [ ] `meetings.action_items` カラムを削除しないことを確認（SQL に DROP COLUMN が含まれていない）

**Acceptance Criteria**:
- マイグレーション SQL ファイルが存在する
- meetings.action_items の各 JSON 要素が action_items テーブルの行に変換される
- assignee が空でない場合、description に `[担当: {assignee}]` が付記される
- assignee_id は null で挿入される
- meetings.action_items カラムが残っている

## T-09: ビルド検証と型チェック

- [ ] `bun run build` が成功することを確認
- [ ] `bun run lint` がエラーなしで通ることを確認
- [ ] `src/domain/` 配下のファイルで `@/infrastructure` への import がないことを確認
- [ ] authorization.ts の Entity 型に `"actionItem"` が含まれていることを確認
- [ ] リポジトリ・ユースケース・サーバーアクションの各バレルファイルに新規ファイルの export が含まれていることを確認

**Acceptance Criteria**:
- `bun run build` が exit code 0 で完了
- `bun run lint` が exit code 0 で完了
- domain 層から infrastructure 層への import がない
- `typecheck && test` (該当する場合) が green
