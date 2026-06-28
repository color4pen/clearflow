# Domain Invariants Review: deal-watch-notifications

- **reviewer**: domain-invariants
- **iteration**: 1
- **date**: 2026-06-28
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## 検証スコープ

```
drizzle/0012_graceful_metal_master.sql
src/infrastructure/schema.ts
src/infrastructure/repositories/watchRepository.ts
src/infrastructure/repositories/userRepository.ts
src/infrastructure/repositories/auditLogRepository.ts
src/application/usecases/watchDeal.ts
src/application/usecases/unwatchDeal.ts
src/application/usecases/getWatchStatus.ts
src/application/usecases/getNotifications.ts
src/application/usecases/markNotificationsAsRead.ts
src/application/usecases/createDeal.ts       (変更)
src/application/usecases/updateDeal.ts       (変更)
src/app/actions/watches.ts
src/app/actions/notifications.ts
src/app/(dashboard)/NotificationBell.tsx
src/domain/models/watch.ts
src/domain/models/notification.ts
src/domain/models/user.ts
```

---

## 検証結果

### 1. テナント分離（tenant isolation）

#### 1-1. watches テーブルスキーマ

- `organizationId uuid NOT NULL REFERENCES organizations(id)` ✅
- FK により無効な組織IDの挿入は DB レベルで拒絶される ✅
- ユニーク制約: `UNIQUE("user_id", "deal_id")` — `organization_id` を含まない

  > **観察**: 現システムではユーザーは1組織にのみ所属（`users.organization_id` が単一 NOT NULL FK）のため、同一 `userId` が複数組織に存在しない。したがってユニーク制約は実質的にテナントをまたいだ重複も防ぐ。設計判断として許容できるが、将来ユーザーが複数組織に所属できる拡張を行う場合は `(user_id, deal_id, organization_id)` に変更が必要となる点を記録しておく。

- `watches_org_user_idx` インデックスに `(organization_id, user_id)` あり ✅

#### 1-2. watchRepository の全操作

| 関数 | organizationId 条件 |
|------|---------------------|
| `create` | `values(organizationId)` + ON CONFLICT DO NOTHING（冪等） ✅ |
| `findByUserAndDeal` | `eq(watches.organizationId, organizationId)` ✅ |
| `findByUser` | `eq(watches.organizationId, organizationId)` ✅ |
| `deleteByUserAndDeal` | `eq(watches.organizationId, organizationId)` ✅ |

全操作でテナント条件が付与されている。

#### 1-3. watchDeal usecase

```ts
const deal = await dealRepository.findById(data.dealId, data.organizationId);
if (!deal) return { ok: false, reason: "指定された案件が見つかりません" };
```

案件所有権を `organizationId` 付きで事前検証してから watch を作成する ✅。他テナントの `dealId` を指定してもエラーとなり、watch レコードは作成されない。

#### 1-4. unwatchDeal usecase

`dealRepository.findById` による事前所有権検証は行っていないが、`watchRepository.deleteByUserAndDeal` に `organizationId` 条件が含まれるため、他テナントの watch レコードを削除することはできない ✅。delete 操作において where 条件で絞り込む方式は安全。

#### 1-5. getNotifications usecase のデータフロー

各ステップにおけるテナント分離の確認:

1. `watchRepository.findByUser(userId, organizationId)` — `organizationId` スコープで watch 取得 ✅
2. `dealRepository.findById(watch.dealId, organizationId)` — 案件存在確認に `organizationId` 付き ✅
3. 配下エンティティ取得:
   - `meetingRepository.findAllByDeal(watch.dealId, organizationId)` ✅
   - `contractRepository.findAllByDealId(watch.dealId, organizationId)` ✅
   - `actionItemRepository.findByDeal(watch.dealId, organizationId)` ✅
   - `dealContactRepository.findByDeal(watch.dealId, organizationId)` ✅
   - `invoiceRepository.findAllByContract(c.id, organizationId)` ✅
4. `auditLogRepository.findByTargets(organizationId, allTargets, {...})` — `organizationId` が第1引数で全体フィルタとして機能 ✅
5. `targetToDealInfo` マップによる per-watch `created_at` フィルタ — アプリ側の二重チェック ✅

複数 watch の targets をマージして一括取得する際も `organizationId` がクエリの最上位条件に適用されており、クロステナントのログが混入する経路はない。

#### 1-6. markNotificationsAsRead

```ts
.where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
```

`organizationId` 条件で自テナントのユーザーのみ更新 ✅。

#### 1-7. Server Actions でのテナント条件の取得元

`watches.ts`, `notifications.ts` ともに `session.user.organizationId` を使用しており、クライアントリクエストボディから `organizationId` を受け取っていない ✅。攻撃者が任意の `organizationId` を送り込めるパスが存在しない。

#### 1-8. NotificationBell

```ts
const users = await listOrganizationUsers({ organizationId });
const currentUser = users.find((u) => u.id === userId);
```

`organizationId` スコープでユーザーリストを取得し、その中から自分の `notificationsLastSeenAt` を取得 ✅。`actorNames` も同組織内ユーザーのみ含まれる。

---

### 2. 監査ログの完全性

- 本変更は `auditRecorder.ts`（`recordAudit`）を**変更していない** ✅
- `createDeal.ts` と `updateDeal.ts` の変更は watch 作成の追加のみであり、`recordAudit` 呼び出しには一切手を加えていない ✅
- `auditLogRepository.findByTargets` に追加されたオプション（`afterDate`, `excludeActorId`, `includeActions`）は全て optional であり、既存の `getDealActivity` 呼び出しに影響しない ✅

監査ログの記録フローは保全されており、完全性は損なわれていない。

---

### 3. 承認ワークフロー不変条件

- `createDeal.ts` の変更: watch 作成をトランザクションに追加したのみ。引合確認・重複チェック・ロール検証・監査ログ記録の順序・ロジックに変更なし ✅
- `updateDeal.ts` の変更: 担当者の自動 watch をトランザクションに追加したのみ。フェーズ遷移・承認ステップ・監査ログ記録のロジックに変更なし ✅
- 承認フロー関連ファイル（`approvalSteps`, `requests`, `approvalPolicies`, `approvalDelegations`）への変更なし ✅

承認ワークフローの不変条件（フェーズ終端チェック、楽観ロック、承認ステップ状態遷移）は本変更によって一切影響を受けていない。

---

### 4. トランザクション境界の整合性

- `createDeal`: `dealRepository.create` → `recordAudit` → `watchRepository.create` をすべて同一 `tx` 内で実行 ✅
- `updateDeal`: `dealRepository.update` → `recordAudit` → `watchRepository.create`（`assigneeId` 指定時）をすべて同一 `tx` 内で実行 ✅
- 失敗時は watch レコードも含めてロールバックされる ✅

---

### 5. 境界値・エッジケースの検証

#### 5-1. watch 開始時刻フィルタのロジック

```ts
return log.createdAt >= info.watchCreatedAt;
```

`>=` で watch 開始と同時刻のログも含む。spec のシナリオ「watch 開始前のログは含まれない」に合致 ✅。テストでも境界値（同時刻）が explicit に検証されている ✅。

#### 5-2. 未読判定の境界

```ts
const isUnread = notificationsLastSeenAt === null
  ? true
  : log.createdAt > notificationsLastSeenAt;
```

`null` の場合は全件未読（初回アクセス）、それ以外は `>` で判定（`>=` ではないため `last_seen_at` の瞬間のログは既読扱い）。spec の「既読にすると未読が 0 になる」に合致 ✅。

#### 5-3. ON CONFLICT DO NOTHING による冪等性

重複 watch 操作で DB エラーが発生しない ✅。既存レコードを fetch して返却するフォールバックあり ✅。

---

## 所見サマリー

| # | 深刻度 | 場所 | 内容 |
|---|--------|------|------|
| I-1 | INFO | `schema.ts` | `watches` ユニーク制約が `(userId, dealId)` のみ。現システムでは問題ないが、ユーザーがマルチテナント所属可能になる拡張時に要見直し |
| I-2 | INFO | `unwatchDeal.ts` | 削除前の案件所有権事前検証なし。`deleteByUserAndDeal` に `organizationId` 条件があるため実質的に安全 |

deep-link 攻撃や越境クエリの経路は発見されなかった。テストは静的検証（ソースコード解析）と動的検証（モックベース）の両層で主要な不変条件をカバーしている。

---

## 判定

- **verdict**: approved
