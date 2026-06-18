# Design: シンプルなレート制限

## Context

Server Actions（申請作成、承認/却下/再申請、Webhook 管理）にレート制限がなく、認証済みユーザーが大量リクエストを送信できる状態。DB ベースの最小限レート制限を導入し、ユーザー単位・アクションカテゴリ単位でリクエスト数を制御する。

現状の構造：

- `src/app/actions/requests.ts` — 6 つの Server Action が存在。`createRequestAction` は認証チェック後に即 usecase を実行。`submitRequestAction`, `approveRequestAction`, `rejectRequestAction`, `resubmitRequestAction` は認証チェック → 冪等キーチェック → usecase 実行の順序
- `src/app/actions/webhooks.ts` — 6 つの Webhook 管理 Action が存在。書き込み系（create, delete, toggle, retry）は認証 + ロールチェック後に即実行
- `src/infrastructure/schema.ts` — Drizzle ORM によるスキーマ定義。レート制限関連のテーブルは未定義
- `src/infrastructure/repositories/` — 既存 repository は `db` を import して Drizzle query builder を使用するパターン

影響範囲：

- スキーマ: `rate_limit_records` テーブル新設
- Infrastructure: `src/infrastructure/rateLimit.ts` 新設（`checkRateLimit` 関数 + `RATE_LIMITS` 定数）
- Server Actions: `requests.ts` の 5 action と `webhooks.ts` の 4 action にレート制限チェックを追加

## Goals / Non-Goals

**Goals**:

- 認証済みユーザーの Server Action 呼び出し頻度を制限し、濫用を防止する
- PostgreSQL の原子的 upsert（`INSERT ON CONFLICT DO UPDATE ... RETURNING`）で race condition を防止する
- 冪等キーチェックとの正しい順序を保証する（キャッシュヒット時はレートを消費しない）
- 既存のテスト・ビルドを壊さない
- 依存方向 `actions → usecases → domain / infrastructure` を維持する

**Non-Goals**:

- IP ベースのレート制限
- cron エンドポイントのレート制限
- CSV エクスポートのレート制限
- レート制限レコードのクリーンアップ（TTL / cron）
- Route Handler への 429 レスポンス適用
- カスタマイズ UI

## Decisions

### D1: rate_limit_records テーブル設計

`rate_limit_records` テーブルを新設する。カラム: `id` (uuid PK), `key` (text, UNIQUE), `count` (integer, NOT NULL), `windowStart` (timestamp, NOT NULL), `createdAt` (timestamp, defaultNow)。

`key` カラムに UNIQUE 制約を設け、`INSERT ON CONFLICT (key)` の upsert 対象とする。key の値は `{actionCategory}:{userId}` の形式（例: `createRequest:550e8400-...`）で、ユーザー × アクションカテゴリごとに 1 行を管理する。

- **Rationale**: 1 テーブル・1 行/キーのシンプルな構造で、追加インフラ不要。key に UNIQUE 制約があれば ON CONFLICT で原子的 upsert が可能。
- **Alternatives considered**:
  - Redis ベースのレート制限 — 追加インフラ依存。現時点では過剰。却下。
  - インメモリカウンター — プロセス再起動でリセットされ、マルチインスタンス環境で共有できない。却下。
  - 既存テーブルにカラム追加 — レート制限は横断的関心事であり、既存テーブルの責務と無関係。却下。

### D2: 原子的 upsert による race condition 防止

`checkRateLimit` 関数は単一の `INSERT ... ON CONFLICT (key) DO UPDATE ... RETURNING count` 文で実装する。ウィンドウの有効期限判定とカウントの更新を 1 つの SQL 文で原子的に行い、TOCTOU 脆弱性を排除する。

ロジック：
1. `threshold = NOW() - windowMs` を計算（スライディングウィンドウの有効期限）
2. INSERT: `key=$key, count=1, windowStart=NOW()` で新規行を挿入
3. ON CONFLICT (key):
   - 既存の `windowStart >= threshold` の場合：ウィンドウ有効 → `count = count + 1`、`windowStart` はそのまま
   - 既存の `windowStart < threshold` の場合：ウィンドウ期限切れ → `count = 1`、`windowStart = NOW()`
4. RETURNING count で更新後のカウントを取得
5. `count <= limit` なら `allowed: true`、超過なら `allowed: false`

Drizzle の `db.insert().onConflictDoUpdate().returning()` を使用し、CASE WHEN 部分は `sql` テンプレートタグで表現する。

- **Rationale**: SELECT → UPDATE の 2 ステップ方式では、SELECT と UPDATE の間に別リクエストが割り込む TOCTOU 脆弱性がある。単一 SQL 文の upsert は PostgreSQL が行レベルロックで原子性を保証する。
- **Alternatives considered**:
  - SELECT FOR UPDATE + UPDATE — デッドロックリスクがあり、レート制限のような軽量操作には過剰。却下。
  - SELECT → INSERT/UPDATE の 2 ステップ — TOCTOU 脆弱性。architect 評価で却下済み。

### D3: checkRateLimit を infrastructure 層に配置

`src/infrastructure/rateLimit.ts` に `checkRateLimit` 関数と `RATE_LIMITS` 定数を配置する。Server Actions 層から直接呼び出す。

checkRateLimit は repository ではなく独立したインフラストラクチャモジュールとする。レート制限はビジネスロジック（usecase）ではなく、リクエスト保護の横断的関心事であるため。

- **Rationale**: 冪等キーチェックと同様、レート制限は Server Actions 層で行うインフラ横断的関心事。usecase にレート制限の概念を持ち込まない。依存方向 `actions → infrastructure` を維持できる。
- **Alternatives considered**:
  - Usecase 層で実装 — ビジネスロジックにインフラ的関心事が混入する。却下。
  - Middleware — Next.js Server Actions には middleware フックがない。却下。
  - Repository パターン — CRUD 操作ではなく、upsert + RETURNING の特殊な操作。repository 抽象化のメリットが薄い。却下。

### D4: 冪等キーチェックの後にレート制限を配置

承認/却下/再申請/提出 Actions では、冪等キーチェックの後にレート制限チェックを配置する。冪等キーのキャッシュヒット時は早期リターンし、レート制限カウントを消費しない。

`createRequestAction` は冪等キーチェックが存在しないため、認証チェック直後にレート制限を配置する。

- **Rationale**: 冪等キーによる再試行は正当な操作であり、レートカウントに含めるべきではない。逆順にすると、ネットワークエラー後のリトライが不当にブロックされる。architect 評価済み。
- **Alternatives considered**:
  - レート制限を先に実行 — 正当な再試行がブロックされる。architect 評価で却下済み。

### D5: レート制限カテゴリと適用対象

3 つのレート制限カテゴリを定義し、各カテゴリに該当する Server Action を分類する。

| カテゴリ | limit | windowMs | 対象 Action |
|---|---|---|---|
| `createRequest` | 10 | 60000 | `createRequestAction` |
| `approveReject` | 30 | 60000 | `submitRequestAction`, `approveRequestAction`, `rejectRequestAction`, `resubmitRequestAction` |
| `webhookManage` | 10 | 60000 | `createWebhookEndpointAction`, `deleteWebhookEndpointAction`, `toggleWebhookEndpointAction`, `retryWebhookDeliveryAction` |

Webhook の読み取り系 Action（`listWebhookEndpointsAction`, `listWebhookDeliveriesAction`）はレート制限の対象外とする。読み取り操作はシステムに副作用を与えず、リスクが低い。

- **Rationale**: 書き込み系操作に限定することで、正当な閲覧操作をブロックするリスクを排除しつつ、濫用を防止する。
- **Alternatives considered**:
  - 全 Action に適用 — 読み取り操作のブロックは UX を損なう。却下。

### D6: レート制限超過時のレスポンス形式

既存の `ActionResult` 型 `{ success: false, message: string }` をそのまま使用する。`createRequestAction` は `CreateRequestState` 型の `{ message: string }` を返す。

超過時メッセージ: `"リクエスト数の上限に達しました。しばらく待ってから再試行してください"`

- **Rationale**: 既存のエラーレスポンス形式に統一し、フロントエンドの変更を不要にする。HTTP 429 は Route Handler の別スコープで対応する。
- **Alternatives considered**:
  - 専用のエラー型を新設 — 既存の型で表現可能であり、不要な複雑さ。却下。

## Risks / Trade-offs

[Risk] rate_limit_records テーブルの行数増加（クリーンアップがスコープ外）
→ Mitigation: key はユーザー × カテゴリの組み合わせのため、行数は `ユーザー数 × 3` に収まる。各キーは upsert で上書きされるため行は増えない。将来のクリーンアップ要件は別 request で対応。

[Risk] DB ベースのレート制限は Redis ベースより遅延が大きい
→ Mitigation: 既に全 Server Action が DB アクセスを伴うため、追加の 1 クエリによる影響は軽微。高スループット要件が発生した場合は Redis への移行を検討する。

[Trade-off] ウィンドウの精度 — スライディングウィンドウの粒度
→ ウィンドウは最初のリクエスト時点から windowMs 経過するまで有効。固定ウィンドウ（例: 毎分 0 秒開始）ではないため、ウィンドウ境界でのバースト（2 ウィンドウにまたがる集中リクエスト）は発生しない。

## Open Questions

なし（architect の設計判断が全ての主要論点をカバー済み）。
