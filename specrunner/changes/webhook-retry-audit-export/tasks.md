# Tasks: Webhook リトライと監査ログ CSV エクスポート

## T-01: スキーマ変更 -- webhook_deliveries に nextRetryAt カラム追加

- [ ] `src/infrastructure/schema.ts` の `webhookDeliveries` テーブル定義に `nextRetryAt: timestamp("next_retry_at")` を追加する。nullable（`.notNull()` なし）。`lastAttemptAt` と `createdAt` の間に配置する
- [ ] `src/domain/models/webhookDelivery.ts` の `WebhookDelivery` 型に `nextRetryAt: Date | null` フィールドを追加する。`lastAttemptAt` と `createdAt` の間に配置する
- [ ] `src/infrastructure/repositories/webhookDeliveryRepository.ts` の `mapRow` 関数に `nextRetryAt: row.nextRetryAt ?? null` を追加する
- [ ] `src/infrastructure/repositories/webhookDeliveryRepository.ts` の `updateStatus` 関数の引数型に `nextRetryAt?: Date | null` を追加する。`.set()` に `nextRetryAt: data.nextRetryAt ?? undefined` を追加する（undefined の場合はカラムを更新しない。明示的に null が渡された場合は null に更新する）
- [ ] Drizzle マイグレーションファイルを生成する: `bunx drizzle-kit generate` を実行し、`drizzle/0002_webhook_retry_audit_export.sql` が生成されることを確認する。内容は `ALTER TABLE "webhook_deliveries" ADD COLUMN "next_retry_at" timestamp;` を含む

**Acceptance Criteria**:
- `schema.ts` の `webhookDeliveries` に `nextRetryAt` カラムが存在する
- `WebhookDelivery` 型に `nextRetryAt: Date | null` が存在する
- `mapRow` が `nextRetryAt` をマッピングする
- `updateStatus` が `nextRetryAt` を受け取り更新できる
- マイグレーション SQL が生成されている
- `typecheck` が green

## T-02: Webhook リトライロジック -- deliverToEndpoint に exponential backoff を追加

- [ ] `src/infrastructure/webhookDelivery.ts` の先頭に定数を追加する: `const MAX_ATTEMPTS = 4;` と `const BASE_DELAY_MS = 1000;`。export する（テスト用）
- [ ] `deliverToEndpoint` 関数を書き換える。現在の try-catch を for ループに変更する:
  ```
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // attempt > 1 の場合、BASE_DELAY_MS * 4^(attempt-2) ミリ秒待機する
    // (attempt 2 → 1000ms, attempt 3 → 4000ms, attempt 4 → 16000ms)
    if (attempt > 1) {
      const delay = BASE_DELAY_MS * Math.pow(4, attempt - 2);
      await Bun.sleep(delay);
    }
    // fetch を試行する
    // 成功 → status: "delivered", nextRetryAt: null で break
    // 失敗 かつ attempt < MAX_ATTEMPTS → status 維持("pending"), nextRetryAt を設定, continue
    // 失敗 かつ attempt === MAX_ATTEMPTS → status: "failed", nextRetryAt: null
  }
  ```
- [ ] 各 attempt で `webhookDeliveryRepository.updateStatus` を呼び出す。引数: `{ status, statusCode, attempts: attempt, lastAttemptAt: new Date(), nextRetryAt }`
  - 成功時: `{ status: "delivered", statusCode: response.status, attempts: attempt, lastAttemptAt: new Date(), nextRetryAt: null }`
  - 失敗 かつリトライ残り: `{ status: "pending", statusCode: response?.status ?? null, attempts: attempt, lastAttemptAt: new Date(), nextRetryAt: new Date(Date.now() + BASE_DELAY_MS * Math.pow(4, attempt - 1)) }`
  - 全試行失敗: `{ status: "failed", statusCode: response?.status ?? null, attempts: attempt, lastAttemptAt: new Date(), nextRetryAt: null }`
- [ ] `delivery` の作成（`webhookDeliveryRepository.create`）は for ループの前に 1 回だけ実行する（現行と同じ）
- [ ] `deliverWebhookEvent` 全体の try-catch は維持する（例外を外に投げない）

**Acceptance Criteria**:
- `MAX_ATTEMPTS` が 4、`BASE_DELAY_MS` が 1000 で定義されている
- 初回含め最大 4 回試行される
- バックオフ間隔が 1s, 4s, 16s（`BASE_DELAY_MS * 4^(attempt-2)`）
- 各試行で `attempts` がインクリメントされ `lastAttemptAt` が更新される
- 成功時にループを抜け `status: "delivered"` になる
- 全失敗後に `status: "failed"`, `attempts: 4`, `nextRetryAt: null` になる
- リトライ中は `status: "pending"` を維持し `nextRetryAt` が設定される
- 既存の `deliverWebhookEvent` の fire-and-forget パターン（`void` 呼び出し）は維持される
- `typecheck` が green

## T-03: 手動リトライ機能 -- リポジトリ拡張

- [ ] `src/infrastructure/repositories/webhookDeliveryRepository.ts` に `findById(id: string): Promise<WebhookDelivery | null>` を追加する。`webhookDeliveries` から `id` で検索し、見つからなければ `null` を返す。`mapRow` で変換する
- [ ] `src/infrastructure/repositories/webhookDeliveryRepository.ts` に `resetForRetry(id: string): Promise<void>` を追加する。`webhookDeliveries` の `id` レコードを `status: "pending"`, `statusCode: null`, `attempts: 0`, `lastAttemptAt: null`, `nextRetryAt: null` にリセットする

**Acceptance Criteria**:
- `findById` が `WebhookDelivery | null` を返す
- `resetForRetry` が status, statusCode, attempts, lastAttemptAt, nextRetryAt をリセットする
- `typecheck` が green

## T-04: 手動リトライ機能 -- Server Action

- [ ] `src/app/actions/webhooks.ts` に `retryWebhookDeliveryAction(deliveryId: string)` を追加する
- [ ] 認証チェック: `const session = await auth()` → `if (!session?.user?.id) return { success: false, message: "認証が必要です" }` → `if (session.user.role !== "admin") return { success: false, message: "権限がありません" }`（既存パターン踏襲）
- [ ] `webhookDeliveryRepository.findById(deliveryId)` で配信レコードを取得する。見つからなければ `{ success: false, message: "配信レコードが見つかりません" }` を返す
- [ ] テナント分離: `webhookEndpointRepository` から `endpointId` でエンドポイントを取得する。取得方法は `webhookEndpointRepository` に `findById(id: string, organizationId: string)` 関数を追加するか、既存の `findByOrganization` + filter で検証する。エンドポイントが見つからない or `organizationId` が不一致の場合は `{ success: false, message: "配信レコードが見つかりません" }` を返す（情報漏洩防止のため具体的なエラーは返さない）
- [ ] `delivery.status !== "failed"` の場合は `{ success: false, message: "failed 状態の配信のみリトライできます" }` を返す
- [ ] `webhookDeliveryRepository.resetForRetry(deliveryId)` で配信レコードをリセットする
- [ ] エンドポイント情報からペイロード、url、secret を取得し、`deliverToEndpoint(endpoint, delivery.payload)` を `void` で呼び出す。`deliverToEndpoint` を export する必要がある（現在は内部関数）。代替案として `deliverToEndpoint` を export せず、同等のロジックを action 内に持つか、`webhookDelivery.ts` に `retryDelivery(deliveryId)` 関数を追加する
- [ ] `revalidatePath` を呼び出す（配信ログページのパス）
- [ ] `return { success: true }` を返す

補足: `deliverToEndpoint` を直接呼ぶために、`src/infrastructure/webhookDelivery.ts` から export する。export 名は `retryDelivery(endpoint: WebhookEndpoint, payload: WebhookPayload, deliveryId: string)` とし、既存 delivery レコードの ID を受け取り、新規 delivery を作成せずにリトライを開始するバリアントを追加する方が適切。

実装案:
- `src/infrastructure/webhookDelivery.ts` に `retryDelivery(endpoint: WebhookEndpoint, payload: WebhookPayload, deliveryId: string)` を追加する。`deliverToEndpoint` のリトライループと同じロジックだが、`webhookDeliveryRepository.create` をスキップし、渡された `deliveryId` に対して `updateStatus` を呼ぶ
- または、`deliverToEndpoint` に `existingDeliveryId?: string` オプション引数を追加する。指定された場合は `create` をスキップし、そのIDに対して `updateStatus` を呼ぶ

後者の方がコード重複が少ない。`deliverToEndpoint` のシグネチャを拡張する:
```typescript
async function deliverToEndpoint(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload,
  existingDeliveryId?: string
): Promise<void>
```
`existingDeliveryId` が指定されている場合は `webhookDeliveryRepository.create` をスキップし、そのIDを使う。

`deliverToEndpoint` を export する（現在は内部関数。テストでも直接テストする必要はなく、action 経由でのみ呼ばれるため、named export で十分）。

**Acceptance Criteria**:
- `retryWebhookDeliveryAction` が `webhooks.ts` に存在する
- admin ロールチェックが実行される
- `failed` 状態以外の配信をリトライしようとするとエラーが返される
- テナント分離: 他組織の配信レコードをリトライできない
- リトライ実行後に exponential backoff が適用される
- `revalidatePath` が呼ばれる
- `typecheck` が green

## T-05: 手動リトライ機能 -- 配信ログ UI にリトライボタン追加

- [ ] `src/app/(dashboard)/settings/webhooks/[id]/deliveries/page.tsx` のテーブル行に、`status === "failed"` の場合のみ「リトライ」ボタンを追加する
- [ ] ボタンは form + Server Action パターンで実装する。`retryWebhookDeliveryAction` を import し、`deliveryId` を渡す
- [ ] ボタンのスタイル: 既存の操作ボタンと統一する（例: `text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded px-2 py-0.5 hover:bg-blue-50`）
- [ ] テーブルヘッダーに「操作」列を追加する（既存の列の右に配置）
- [ ] `nextRetryAt` が null でない場合、テーブルに「次のリトライ予定」列を表示する（または既存の「最終試行日時」列の下に表示する）

**Acceptance Criteria**:
- `failed` 状態の配信行にのみ「リトライ」ボタンが表示される
- `delivered` / `pending` 状態の行にはリトライボタンが表示されない
- ボタンクリックでリトライが実行される
- `bun run build` が成功する

## T-06: 監査ログリポジトリ拡張 -- findByOrganization 追加

- [ ] `src/infrastructure/repositories/auditLogRepository.ts` に `findByOrganization` 関数を追加する:
  ```typescript
  export async function findByOrganization(
    organizationId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      action?: string;
    }
  ): Promise<AuditLog[]>
  ```
- [ ] `organizationId` で `eq(auditLogs.organizationId, organizationId)` フィルタを適用する
- [ ] `createdAt` 降順でソートする: `orderBy(desc(auditLogs.createdAt))`
- [ ] `options.startDate` が指定された場合: `gte(auditLogs.createdAt, options.startDate)` を WHERE 条件に追加する
- [ ] `options.endDate` が指定された場合: `lte(auditLogs.createdAt, options.endDate)` を WHERE 条件に追加する
- [ ] `options.action` が指定された場合: `eq(auditLogs.action, options.action)` を WHERE 条件に追加する
- [ ] 複数条件は `and()` で結合する
- [ ] `options.limit` が指定された場合: `.limit(options.limit)` を適用する
- [ ] `options.offset` が指定された場合: `.offset(options.offset)` を適用する
- [ ] 戻り値は `AuditLog[]` 型。各行を `{ id, action, targetType, targetId, actorId, organizationId, metadata, createdAt }` にマッピングする（`create` 関数と同じマッピングロジック）
- [ ] `drizzle-orm` の import に `eq`, `and`, `desc`, `gte`, `lte` を追加する（不足分のみ）

**Acceptance Criteria**:
- `findByOrganization` が `auditLogRepository.ts` に存在する
- `organizationId` が WHERE 条件に必ず含まれている
- `createdAt` 降順ソートが適用されている
- `startDate`, `endDate`, `action` フィルタが動作する
- `limit`, `offset` ページネーションが動作する
- `typecheck` が green

## T-07: 監査ログ CSV エクスポート -- Route Handler

- [ ] `src/app/api/audit-logs/export/route.ts` を新規作成する
- [ ] GET ハンドラを export する: `export async function GET(request: Request)`
- [ ] 認証チェック: `const session = await auth()` → 未認証なら `new Response("Unauthorized", { status: 401 })` を返す
- [ ] admin ロールチェック: `session.user.role !== "admin"` なら `new Response("Forbidden", { status: 403 })` を返す
- [ ] URL クエリパラメータから `startDate`, `endDate`, `action` を取得する: `new URL(request.url).searchParams`。各パラメータは `Date` に変換する（`startDate`, `endDate`）、`action` はそのまま文字列
- [ ] `auditLogRepository.findByOrganization(session.user.organizationId, { startDate, endDate, action })` で監査ログを取得する（limit なし = 全件）
- [ ] CSV 生成ヘルパー関数 `escapeCsvValue(value: string): string` を実装する。値にカンマ、ダブルクォート、改行が含まれる場合はダブルクォートで囲み、ダブルクォート自体は `""` にエスケープする
- [ ] CSV ヘッダー行: `timestamp,action,targetType,targetId,actorId,metadata`
- [ ] 各行: `createdAt.toISOString()`, `action`, `targetType`, `targetId`, `actorId`, `JSON.stringify(metadata ?? {})` を CSV 形式に変換する。各値は `escapeCsvValue` でエスケープする
- [ ] BOM (`﻿`) を先頭に付与する（Excel 対応）
- [ ] レスポンスを返す:
  ```typescript
  new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
  ```
- [ ] `auth` を `@/infrastructure/auth` から、`auditLogRepository` を `@/infrastructure/repositories` から import する

**Acceptance Criteria**:
- `/api/audit-logs/export` が GET リクエストに `text/csv` レスポンスを返す
- 未認証で 401、admin 以外で 403 が返る
- CSV ヘッダー行が `timestamp,action,targetType,targetId,actorId,metadata`
- `organizationId` でフィルタされた監査ログのみ含まれる
- `startDate`, `endDate`, `action` クエリパラメータでフィルタ可能
- metadata が `JSON.stringify` で 1 カラムに出力される
- カンマやダブルクォートを含む値がエスケープされる
- `Content-Disposition` にファイル名が含まれる
- `typecheck` が green

## T-08: 監査ログ一覧 UI -- ページ作成

- [ ] `src/app/(dashboard)/settings/audit-logs/page.tsx` を新規作成する
- [ ] ページ冒頭で `auth()` を呼び出し、`session.user.role !== "admin"` の場合は `redirect("/requests")` でリダイレクトする
- [ ] `searchParams` から `startDate`, `endDate`, `action`, `page` を取得する（`searchParams` は `Promise<{ [key: string]: string | string[] | undefined }>` 型。`await searchParams` で解決する）
- [ ] `page` のデフォルトは 1。`limit = 50`, `offset = (page - 1) * 50` を計算する
- [ ] `auditLogRepository.findByOrganization(session.user.organizationId, { limit, offset, startDate, endDate, action })` でデータ取得する
- [ ] テーブル形式で表示する。表示項目: 日時（`createdAt` を `ja-JP` ロケールで整形）, アクション, 対象種別, 対象 ID, 実行者 ID, メタデータ（JSON.stringify のトランケート表示）
- [ ] フィルタ UI を追加する:
  - 日付範囲: `<input type="date" name="startDate">`, `<input type="date" name="endDate">`
  - アクション種別: `<select name="action">` に代表的なアクション種別を選択肢として含める（例: `request.create`, `request.submit`, `request.approve`, `request.reject` 等）、または空文字で全件
  - フィルタフォームは `<form method="get">` で URL クエリパラメータを更新する
- [ ] CSV ダウンロードボタン: `<a>` タグで `/api/audit-logs/export` にリンクする。現在のフィルタ条件（`startDate`, `endDate`, `action`）をクエリパラメータに引き継ぐ。`download` 属性を付与する
- [ ] ページネーション: 「前へ」「次へ」リンクを追加する。各リンクは `page` パラメータを増減する。現在のフィルタ条件を引き継ぐ。取得結果が `limit` 件未満の場合は「次へ」を非表示にする。`page === 1` の場合は「前へ」を非表示にする
- [ ] 空の場合のメッセージ: 「監査ログはありません。」

**Acceptance Criteria**:
- `/settings/audit-logs` ページが存在する
- admin 以外はリダイレクトされる
- 監査ログがテーブル形式で表示される
- 日付範囲とアクション種別でフィルタ可能
- CSV ダウンロードボタンが現在のフィルタ条件を引き継ぐ
- ページネーションが動作する
- `bun run build` が成功する

## T-09: ダッシュボードレイアウト更新 -- 監査ログリンク追加

- [ ] `src/app/(dashboard)/layout.tsx` の admin ロール条件付きレンダリングブロック（`session.user.role === "admin"` の箇所）に「監査ログ」リンクを追加する。リンク先は `/settings/audit-logs`
- [ ] 既存の「設定」リンク（`/settings/webhooks`）の隣に配置する。スタイルは既存リンクと統一する

**Acceptance Criteria**:
- admin ユーザーのダッシュボードヘッダーに「監査ログ」リンクが表示される
- member/manager/finance ユーザーには表示されない
- リンクが `/settings/audit-logs` を指している
- `bun run build` が成功する

## T-10: webhookEndpointRepository 拡張 -- findById 追加

- [ ] `src/infrastructure/repositories/webhookEndpointRepository.ts` に `findById(id: string, organizationId: string): Promise<WebhookEndpoint | null>` を追加する
- [ ] `id` AND `organizationId` で検索し、見つからなければ `null` を返す。`mapRow` で変換する

**Acceptance Criteria**:
- `findById` が `WebhookEndpoint | null` を返す
- `organizationId` 条件が付与されている（テナント分離）
- `typecheck` が green

## T-11: テスト追加 -- Webhook リトライと監査ログ CSV エクスポート

- [ ] `src/__tests__/usecases/webhookRetryAuditExport.test.ts` を新規作成する（既存の静的解析テストパターンに準拠）
- [ ] Webhook リトライ関連テスト:
  - `webhookDelivery.ts` に `MAX_ATTEMPTS` 定数が存在し、値が `4` であることを検証する（`MAX_ATTEMPTS` 文字列と `= 4` の存在確認）
  - `webhookDelivery.ts` に `BASE_DELAY_MS` 定数が存在し、値が `1000` であることを検証する
  - `webhookDelivery.ts` に `Bun.sleep` が存在することを検証する
  - `webhookDelivery.ts` に `for` ループ（または `while`）が存在することを検証する（リトライループの存在確認）
  - `webhookDelivery.ts` で `attempts` をインクリメントする処理が存在することを検証する（`attempts:` の複数回出現、または `attempt` 変数の存在）
  - `schema.ts` に `next_retry_at` 文字列が存在することを検証する（nextRetryAt カラム）
  - `domain/models/webhookDelivery.ts` に `nextRetryAt` が存在することを検証する
  - `app/actions/webhooks.ts` に `retryWebhookDeliveryAction` が存在することを検証する
  - `app/actions/webhooks.ts` の `retryWebhookDeliveryAction` 以降に `"failed"` 文字列が存在することを検証する
- [ ] 監査ログ CSV エクスポート関連テスト:
  - `infrastructure/repositories/auditLogRepository.ts` に `findByOrganization` が存在することを検証する
  - `findByOrganization` の定義に `organizationId` パラメータが存在することを検証する
  - `app/api/audit-logs/export/route.ts` が存在することを検証する（`fileExists` 使用）
  - `app/api/audit-logs/export/route.ts` に `text/csv` が含まれることを検証する
  - `app/api/audit-logs/export/route.ts` に `auth()` 呼び出しが含まれることを検証する
  - `app/api/audit-logs/export/route.ts` に `admin` が含まれることを検証する（ロールチェック）
  - `app/api/audit-logs/export/route.ts` に `organizationId` が含まれることを検証する（テナント分離）
  - `app/api/audit-logs/export/route.ts` に `GET` が export されていることを検証する
  - `app/(dashboard)/settings/audit-logs/page.tsx` が存在することを検証する
- [ ] `src/__tests__/static/projectStructure.test.ts` の TC-057 のファイルリストに `"app/api/audit-logs/export/route.ts"` を追加する
- [ ] 既存の `src/__tests__/usecases/webhookWorkflow.test.ts` のテストが引き続き pass することを確認する（`AbortSignal.timeout`, `X-Clearflow-Signature`, `fetch`, `void deliverWebhookEvent` 等の存在確認テストはリトライ追加後も変わらない）

**Acceptance Criteria**:
- `bun test` が全件 green
- Webhook リトライの定数・ロジックがテストで検証されている
- 監査ログ CSV エクスポートの Route Handler がテストで検証されている
- 監査ログ一覧ページの存在がテストで検証されている
- 既存テストが破壊されていない

## T-12: ビルド検証と最終確認

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `typecheck` が green（`bun run build` に含まれるが、明示的に確認する）
- [ ] `deliverToEndpoint` のリトライロジックが正しいことを確認する: MAX_ATTEMPTS=4, BASE_DELAY_MS=1000, バックオフ 1s/4s/16s
- [ ] 全リトライ失敗後に `status: "failed"`, `attempts: 4`, `nextRetryAt: null` になることを確認する
- [ ] `webhook_deliveries` テーブルに `nextRetryAt` カラムが存在することを確認する
- [ ] 手動リトライが admin ロールのみ実行可能であることを確認する
- [ ] `/api/audit-logs/export` が `text/csv` を返すことを確認する
- [ ] CSV エクスポートに `organizationId` フィルタが適用されていることを確認する
- [ ] 監査ログ一覧のクエリに `organizationId` 条件が付与されていることを確認する
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守していることを確認する: `src/domain/` 配下に `@/infrastructure` の import がないことを grep で確認する
