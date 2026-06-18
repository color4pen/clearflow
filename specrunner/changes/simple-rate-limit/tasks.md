# Tasks: シンプルなレート制限

## T-01: rate_limit_records テーブルをスキーマに追加

- [ ] `src/infrastructure/schema.ts` — `rateLimitRecords` テーブルを定義する。カラム:
  - `id`: `uuid("id").primaryKey().defaultRandom()`
  - `key`: `text("key").notNull().unique()`
  - `count`: `integer("count").notNull()`
  - `windowStart`: `timestamp("window_start").notNull()`
  - `createdAt`: `timestamp("created_at").defaultNow().notNull()`
- [ ] `src/infrastructure/schema.ts` — `rateLimitRecords` は他テーブルへの FK を持たない（key 文字列にユーザー ID を含めるだけで、FK リレーションは不要）。relations 定義も不要

**Acceptance Criteria**:
- `rateLimitRecords` テーブルが schema.ts に定義されている
- `key` カラムに `.unique()` 制約がある
- `count` は integer, NOT NULL
- `windowStart` は timestamp, NOT NULL
- `bun run build` が成功する

---

## T-02: RATE_LIMITS 定数と checkRateLimit 関数を実装

- [ ] `src/infrastructure/rateLimit.ts` を新規作成
- [ ] `RATE_LIMITS` 定数を export する:
  ```typescript
  export const RATE_LIMITS = {
    createRequest: { limit: 10, windowMs: 60_000 },
    approveReject: { limit: 30, windowMs: 60_000 },
    webhookManage: { limit: 10, windowMs: 60_000 },
  } as const;
  ```
- [ ] `checkRateLimit` 関数を export する。シグネチャ:
  ```typescript
  export async function checkRateLimit(params: {
    key: string;
    limit: number;
    windowMs: number;
  }): Promise<{ allowed: boolean; remaining: number }>
  ```
- [ ] 実装の詳細:
  1. `threshold = new Date(Date.now() - params.windowMs)` を計算
  2. Drizzle の `db.insert(rateLimitRecords).values({ key, count: 1, windowStart: sql\`NOW()\` }).onConflictDoUpdate({ target: rateLimitRecords.key, set: { ... } }).returning({ count: rateLimitRecords.count })` を使用
  3. `onConflictDoUpdate` の `set` で `sql` テンプレートタグを使い CASE WHEN 式を記述:
     - `count`: `CASE WHEN window_start >= ${threshold} THEN count + 1 ELSE 1 END`
     - `windowStart`: `CASE WHEN window_start >= ${threshold} THEN window_start ELSE NOW() END`
  4. RETURNING で取得した `count` と `params.limit` を比較し `{ allowed: count <= limit, remaining: Math.max(0, limit - count) }` を返す
- [ ] import: `sql` を `drizzle-orm` から、`db` を `./db` から、`rateLimitRecords` を `./schema` から import

**Acceptance Criteria**:
- `src/infrastructure/rateLimit.ts` が存在する
- `RATE_LIMITS` 定数に `createRequest`, `approveReject`, `webhookManage` の 3 カテゴリが定義されている
- `checkRateLimit` が `INSERT ON CONFLICT DO UPDATE ... RETURNING` パターンで実装されている
- `allowed` は `count <= limit` で判定されている
- `remaining` は `Math.max(0, limit - count)` で計算されている
- `typecheck` が green

---

## T-03: createRequestAction にレート制限を追加

- [ ] `src/app/actions/requests.ts` — `checkRateLimit` と `RATE_LIMITS` を `@/infrastructure/rateLimit` から import
- [ ] `createRequestAction` — `auth()` による認証チェック（`if (!session?.user?.id)` の早期リターン）の直後、`createRequestSchema.safeParse` の前に以下を追加:
  ```typescript
  const rateCheck = await checkRateLimit({
    key: `createRequest:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }
  ```
- [ ] `createRequestAction` の返り値型 `CreateRequestState` は `{ message?: string }` を含むため、既存の型をそのまま利用する

**Acceptance Criteria**:
- `createRequestAction` に `checkRateLimit` 呼び出しが存在する
- レート制限チェックは認証チェックの直後、バリデーションの前に配置されている
- 超過時のレスポンスが `{ message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" }` である
- `typecheck` が green

---

## T-04: 承認/却下/提出/再申請 Actions にレート制限を追加

- [ ] `src/app/actions/requests.ts` — `submitRequestAction` に以下を追加: 冪等キーチェック（`if (cached) { return cached.result as ActionResult; }` の早期リターン）の後、`submitRequest` usecase 呼び出しの前:
  ```typescript
  const rateCheck = await checkRateLimit({
    key: `approveReject:${session.user.id}`,
    limit: RATE_LIMITS.approveReject.limit,
    windowMs: RATE_LIMITS.approveReject.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }
  ```
- [ ] `approveRequestAction` — 同様に冪等キーチェックの後、`approveRequest` usecase 呼び出しの前に追加（key は `approveReject:${session.user.id}`）
- [ ] `rejectRequestAction` — 同様に冪等キーチェックの後、`rejectRequest` usecase 呼び出しの前に追加（key は `approveReject:${session.user.id}`）
- [ ] `resubmitRequestAction` — 同様に冪等キーチェックの後、`resubmitRequest` usecase 呼び出しの前に追加（key は `approveReject:${session.user.id}`）
- [ ] 4 つの Action 全てで、冪等キーのキャッシュヒット時は `checkRateLimit` が呼ばれない（早期リターンで到達しない）ことを確認

**Acceptance Criteria**:
- 4 つの Action 全てに `checkRateLimit` 呼び出しが存在する
- レート制限チェックは冪等キーチェック（キャッシュヒット早期リターン）の後に配置されている
- レート制限チェックは usecase 呼び出しの前に配置されている
- 超過時のレスポンスが `{ success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" }` である
- 冪等キーのキャッシュヒット時はレート制限カウントを消費しない
- `typecheck` が green

---

## T-05: Webhook 管理 Actions にレート制限を追加

- [ ] `src/app/actions/webhooks.ts` — `checkRateLimit` と `RATE_LIMITS` を `@/infrastructure/rateLimit` から import
- [ ] `createWebhookEndpointAction` — 認証 + ロールチェック（`if (session.user.role !== "admin")` の早期リターン）の直後、URL バリデーションの前に追加:
  ```typescript
  const rateCheck = await checkRateLimit({
    key: `webhookManage:${session.user.id}`,
    limit: RATE_LIMITS.webhookManage.limit,
    windowMs: RATE_LIMITS.webhookManage.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }
  ```
- [ ] `deleteWebhookEndpointAction` — 同様に認証 + ロールチェックの直後に追加
- [ ] `toggleWebhookEndpointAction` — 同様に認証 + ロールチェックの直後に追加
- [ ] `retryWebhookDeliveryAction` — 同様に認証 + ロールチェックの直後に追加
- [ ] `listWebhookEndpointsAction` と `listWebhookDeliveriesAction` にはレート制限を追加しない（読み取り専用）

**Acceptance Criteria**:
- 4 つの書き込み系 Action 全てに `checkRateLimit` 呼び出しが存在する
- レート制限チェックは認証 + ロールチェックの直後に配置されている
- 超過時のレスポンスが `{ success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" }` である
- 読み取り系 Action にはレート制限が追加されていない
- `typecheck` が green

---

## T-06: レート制限のテストを追加

- [ ] `src/__tests__/infrastructure/rateLimit.test.ts` を新規作成
- [ ] テスト: `rate_limit_records` テーブルが schema.ts に定義されていることを確認（ソースコード解析）
- [ ] テスト: `rate_limit_records` テーブルの `key` カラムに `.unique()` 制約があることを確認
- [ ] テスト: `rate_limit_records` テーブルに `count` (integer), `windowStart` (timestamp) カラムが存在することを確認
- [ ] テスト: `RATE_LIMITS` 定数に `createRequest` (limit: 10, windowMs: 60000), `approveReject` (limit: 30, windowMs: 60000), `webhookManage` (limit: 10, windowMs: 60000) が定義されていることを確認（ソースコード解析）
- [ ] テスト: `checkRateLimit` 関数が export されていることを確認（ソースコード解析）
- [ ] テスト: `checkRateLimit` の実装に `onConflictDoUpdate` または `ON CONFLICT` パターンが含まれていることを確認（ソースコード解析）
- [ ] テスト: `createRequestAction` が `checkRateLimit` を呼び出していることを確認（ソースコード解析）
- [ ] テスト: `submitRequestAction`, `approveRequestAction`, `rejectRequestAction`, `resubmitRequestAction` が `checkRateLimit` を呼び出していることを確認（ソースコード解析）
- [ ] テスト: 上記 4 Action で `checkRateLimit` が冪等キーチェック（`findByKey` / キャッシュヒット早期リターン）の後に呼ばれていることを確認（ソースコード解析：`findByKey` の出現位置 < `checkRateLimit` の出現位置）
- [ ] テスト: Webhook 書き込み系 Action（`createWebhookEndpointAction`, `deleteWebhookEndpointAction`, `toggleWebhookEndpointAction`, `retryWebhookDeliveryAction`）が `checkRateLimit` を呼び出していることを確認（ソースコード解析）
- [ ] テスト: Webhook 読み取り系 Action（`listWebhookEndpointsAction`, `listWebhookDeliveriesAction`）が `checkRateLimit` を呼び出していないことを確認（ソースコード解析）
- [ ] テスト: usecase 層（`src/application/usecases/` 配下）が `rateLimit` を import していないことを確認（依存方向の遵守）
- [ ] テスト: 全 Action のレート制限超過メッセージが `"リクエスト数の上限に達しました。しばらく待ってから再試行してください"` であることを確認（ソースコード解析）

**Acceptance Criteria**:
- 全テストが green
- スキーマ定義、関数実装、Action 統合、配置順序、依存方向がテストでカバーされている
- 既存テストが壊れていない
- `bun test` が全件 green
- `bun run build` が成功する
