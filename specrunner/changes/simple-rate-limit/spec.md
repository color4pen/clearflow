# Spec: シンプルなレート制限

## Requirements

### Requirement: rate_limit_records テーブルが schema.ts に定義されている

`rate_limit_records` テーブルが `src/infrastructure/schema.ts` に定義されなければならない (MUST)。カラム: `id` (uuid PK), `key` (text, UNIQUE), `count` (integer, NOT NULL), `windowStart` (timestamp, NOT NULL), `createdAt` (timestamp, defaultNow)。

#### Scenario: rate_limit_records テーブルのスキーマ定義

**Given** `src/infrastructure/schema.ts` を確認する
**When** `rateLimitRecords` テーブル定義を検索する
**Then** 上記カラムが全て定義されており、`key` カラムに UNIQUE 制約がある

---

### Requirement: checkRateLimit 関数が INSERT ON CONFLICT による原子的 upsert で実装されている

`src/infrastructure/rateLimit.ts` に `checkRateLimit` 関数が実装されなければならない (MUST)。引数は `{ key: string; limit: number; windowMs: number }` で、返り値は `{ allowed: boolean; remaining: number }` とする。内部では `INSERT ... ON CONFLICT (key) DO UPDATE ... RETURNING count` による原子的 upsert を使用しなければならない (MUST)。

#### Scenario: 初回リクエストが許可される

**Given** key `"createRequest:user-1"` のレコードが存在しない
**When** `checkRateLimit({ key: "createRequest:user-1", limit: 10, windowMs: 60000 })` を呼び出す
**Then** `{ allowed: true, remaining: 9 }` が返される

#### Scenario: limit 以内のリクエストが許可される

**Given** key `"createRequest:user-1"` のカウントが 5（ウィンドウ内）
**When** `checkRateLimit({ key: "createRequest:user-1", limit: 10, windowMs: 60000 })` を呼び出す
**Then** `{ allowed: true, remaining: 4 }` が返される（カウントは 6 に更新）

#### Scenario: limit 超過のリクエストが拒否される

**Given** key `"createRequest:user-1"` のカウントが 10（ウィンドウ内、上限到達済み）
**When** `checkRateLimit({ key: "createRequest:user-1", limit: 10, windowMs: 60000 })` を呼び出す
**Then** `{ allowed: false, remaining: 0 }` が返される

#### Scenario: ウィンドウ期限切れ後にカウントがリセットされる

**Given** key `"createRequest:user-1"` のカウントが 10 で、windowStart が 61 秒前
**When** `checkRateLimit({ key: "createRequest:user-1", limit: 10, windowMs: 60000 })` を呼び出す
**Then** カウントが 1 にリセットされ、`{ allowed: true, remaining: 9 }` が返される

---

### Requirement: RATE_LIMITS 定数が定義されている

`src/infrastructure/rateLimit.ts` に `RATE_LIMITS` 定数が定義されなければならない (MUST)。以下の 3 カテゴリを含む: `createRequest: { limit: 10, windowMs: 60000 }`, `approveReject: { limit: 30, windowMs: 60000 }`, `webhookManage: { limit: 10, windowMs: 60000 }`。

#### Scenario: RATE_LIMITS 定数の値

**Given** `src/infrastructure/rateLimit.ts` を確認する
**When** `RATE_LIMITS` 定数を検索する
**Then** `createRequest`, `approveReject`, `webhookManage` の 3 カテゴリが定義されており、各カテゴリに `limit` と `windowMs` が設定されている

---

### Requirement: createRequestAction にレート制限が認証チェック直後に適用されている

`createRequestAction` は認証チェック（`auth()` 呼び出し + session 検証）の直後、バリデーション・usecase 実行の前に `checkRateLimit` を呼び出さなければならない (MUST)。レート制限超過時は `{ message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" }` を返す。

#### Scenario: createRequestAction でレート制限超過

**Given** ユーザー A が直近 60 秒間に 10 回の申請作成を実行済み
**When** ユーザー A が 11 回目の `createRequestAction` を実行する
**Then** usecase は実行されず、`{ message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" }` が返される

#### Scenario: createRequestAction でレート制限内

**Given** ユーザー A が直近 60 秒間に 5 回の申請作成を実行済み
**When** ユーザー A が 6 回目の `createRequestAction` を実行する
**Then** レート制限チェックを通過し、usecase が正常に実行される

---

### Requirement: 承認/却下/提出/再申請 Action にレート制限が冪等キーチェックの後に適用されている

`submitRequestAction`, `approveRequestAction`, `rejectRequestAction`, `resubmitRequestAction` は冪等キーチェック（キャッシュヒットで早期リターン）の後、usecase 実行の前に `checkRateLimit` を呼び出さなければならない (MUST)。冪等キーのキャッシュヒット時はレート制限カウントを消費しない。

#### Scenario: 冪等キーのキャッシュヒット時はレートを消費しない

**Given** 冪等キー "abc-123" で承認操作が既に成功し、結果が保存されている
**When** 同じ冪等キー "abc-123" で再度 `approveRequestAction` が呼ばれる
**Then** 冪等キーチェックで早期リターンし、`checkRateLimit` は呼ばれず、レートカウントは増加しない

#### Scenario: 承認操作でレート制限超過

**Given** ユーザー A が直近 60 秒間に 30 回の承認/却下/提出/再申請操作を実行済み（全て異なる冪等キー）
**When** ユーザー A が 31 回目の `approveRequestAction` を実行する（新しい冪等キー）
**Then** usecase は実行されず、`{ success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" }` が返される

---

### Requirement: Webhook 管理 Action にレート制限が認証チェック直後に適用されている

`createWebhookEndpointAction`, `deleteWebhookEndpointAction`, `toggleWebhookEndpointAction`, `retryWebhookDeliveryAction` は認証 + ロールチェックの直後、処理の前に `checkRateLimit` を呼び出さなければならない (MUST)。読み取り系（`listWebhookEndpointsAction`, `listWebhookDeliveriesAction`）にはレート制限を適用しない。

#### Scenario: Webhook 作成でレート制限超過

**Given** admin ユーザー A が直近 60 秒間に 10 回の Webhook 管理操作を実行済み
**When** ユーザー A が 11 回目の `createWebhookEndpointAction` を実行する
**Then** Webhook は作成されず、`{ success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" }` が返される

#### Scenario: Webhook 一覧取得はレート制限対象外

**Given** admin ユーザー A が直近 60 秒間に 100 回の `listWebhookEndpointsAction` を実行済み
**When** ユーザー A が 101 回目の `listWebhookEndpointsAction` を実行する
**Then** レート制限なく正常に結果が返される

---

### Requirement: 依存方向の維持

全ての変更は `actions → usecases → domain / infrastructure` の依存方向を遵守しなければならない (MUST)。usecase 層に `checkRateLimit` やレート制限の概念を持ち込まない。

#### Scenario: usecase 層が rateLimit モジュールを参照しない

**Given** `src/application/usecases/` 配下の全ファイル
**When** import 文を確認する
**Then** `rateLimit` への参照が存在しない

---

### Requirement: レート制限超過時のレスポンス形式が統一されている

レート制限超過時のメッセージは全 Action で `"リクエスト数の上限に達しました。しばらく待ってから再試行してください"` とする (MUST)。レスポンス形式は各 Action の既存の返り値型に準拠する。

#### Scenario: createRequestAction のレート制限超過レスポンス

**Given** `createRequestAction` でレート制限超過が発生する
**When** レスポンスを確認する
**Then** `{ message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" }` が返される（`CreateRequestState` 型準拠）

#### Scenario: approveRequestAction のレート制限超過レスポンス

**Given** `approveRequestAction` でレート制限超過が発生する
**When** レスポンスを確認する
**Then** `{ success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" }` が返される（`ActionResult` 型準拠）
