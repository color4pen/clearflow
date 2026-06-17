# ADR-004: Webhook通知とイベント配信基盤の設計判断

- **Status**: accepted
- **Date**: 2026-06-18
- **Change**: webhook-notification
- **Deciders**: architect

---

## Context

Clearflow の承認ワークフローでは ADR-003 時点まで、申請の状態変更は `audit_logs` テーブルへの記録のみで外部システムへのリアルタイム通知手段がなかった。Slack 連携・社内ポータルとの接続を可能にするため、組織ごとに Webhook エンドポイントを登録し、状態変更イベントを HTTP POST で配信する基盤を導入した。

本変更の主要な設計課題:

- **新しい port/adapter の追加**: 承認ワークフロードメインに外部 HTTP 配信（Outbound Webhook）という新しい統合点が追加され、アーキテクチャの境界が拡張された
- **トランザクション整合性の問題**: 外部 HTTP 通信を DB トランザクション内で実行すると、ネットワーク障害でトランザクション全体がロールバックし、業務操作が失敗するリスクがある
- **イベント配信の疎結合度**: usecase 内からの直接配信 vs. イベントバス経由の疎結合配信のトレードオフ
- **受信側の真正性検証**: 配信ペイロードの改竄検知のためのセキュリティ機構
- **配信ログの保持**: 将来のリトライ基盤としての配信履歴管理

---

## Decisions

### D1: 独立した `webhook_endpoints` / `webhook_deliveries` テーブルを新設

**Decision**: `src/infrastructure/schema.ts` に `webhookEndpoints` テーブルと `webhookDeliveries` テーブルを独立して追加する。`webhookEndpoints` は `organizationId` (FK)、`url`、`secret`（HMAC 署名用）、`isActive`、`events`（購読イベント種別、text[]）、タイムスタンプを持つ。`webhookDeliveries` は `endpointId` (FK)、`event`、`payload`（jsonb）、`status`（`pending | delivered | failed` enum）、`statusCode`、`attempts`、`lastAttemptAt`、`createdAt` を持つ。

**Rationale**:
- 独立テーブルにより、1組織に対する複数エンドポイント、エンドポイントごとのイベントフィルタリング（`events` カラム）、個別の有効/無効制御が可能になる
- `webhook_deliveries` テーブルを配信ログとして保持することで、将来の exponential backoff リトライ実装時に `status: "pending"` レコードを利用できる

#### Alternative 1: `organizations` テーブルに webhookUrl / webhookSecret カラムを追加

| | |
|---|---|
| **Pros** | スキーマ変更が最小限。既存テーブルにカラムを追加するだけで済む |
| **Cons** | 1組織1エンドポイントに固定される。イベント種別フィルタリング不可。複数の宛先への配信が不可能 |
| **Why not** | 将来の複数エンドポイント対応やイベントフィルタリング要件に応答できないため |

---

### D2: 8種類の Webhook イベント種別を `domain/models/webhookEvent.ts` に独立定義

**Decision**: `WebhookEventType` を `"request.created" | "request.submitted" | "request.approved" | "request.rejected" | "request.revised" | "request.resubmitted" | "step.approved" | "step.rejected"` の文字列リテラルユニオン型として `src/domain/models/webhookEvent.ts` に定義する。定数配列 `WEBHOOK_EVENT_TYPES` も export する。命名は過去形（created, submitted 等）とし、audit_logs の `action` 名（動詞形: request.create 等）とは独立した概念として管理する。

**Rationale**:
- GitHub / Stripe の Webhook 命名規則（過去形）に合わせることで、外部システム連携における一般的な慣例に従う
- audit_logs の `action` と 1:1 対応させないことで、将来 audit_logs の内部命名を変更しても Webhook の外部 API 互換性が保たれる
- domain 層での定義により ORM や infrastructure への依存を持たない型として管理できる

#### Alternative 1: audit_logs の `action` 名をそのまま Webhook イベント種別に使用

| | |
|---|---|
| **Pros** | 内部イベントと外部 Webhook の命名が統一され、マッピングが不要 |
| **Cons** | 内部向けの命名と外部 API の命名が混在する。audit_logs 側の action 名変更時に Webhook の外部 API 互換性が壊れる |
| **Why not** | 内部実装の変更が外部 API 破壊的変更につながるリスクがあるため |

---

### D3: HMAC-SHA256 署名を `X-Clearflow-Signature` ヘッダーに付与

**Decision**: エンドポイントの `secret` とリクエストボディ（JSON 文字列）から HMAC-SHA256 署名を生成し、`X-Clearflow-Signature: sha256=<hex>` 形式でヘッダーに付与する。署名生成ロジックは `src/infrastructure/webhookDelivery.ts` 内の `computeSignature(secret: string, payload: string): string` ヘルパー関数として実装する。secret はエンドポイント作成時に `crypto.randomBytes(32).toString("hex")` で自動生成する。

**Rationale**:
- Stripe の `Stripe-Signature` や GitHub の `X-Hub-Signature-256` と同じ方式。業界標準のため受信側に既存の検証実装がある場合が多い
- エンドポイントごとに異なる secret を保持することで、一つの secret が漏洩しても他エンドポイントへの影響を局所化できる
- `crypto.timingSafeEqual` を用いた定数時間比較で受信側がタイミング攻撃を防御できる

---

### D4: トランザクション外での fire-and-forget 配信

**Decision**: 各 usecase のトランザクション完了後（`db.transaction()` ブロックの外）に `void deliverWebhookEvent(...)` で配信をトリガーする。`deliverWebhookEvent` 関数は内部で try-catch して例外を外に投げない（console.error でログ記録のみ）。fetch タイムアウトは `AbortSignal.timeout(5000)` で固定5秒とする。

**Rationale**:
- Webhook 配信はネットワーク I/O を伴うため、トランザクション内で実行するとタイムアウト・外部障害でトランザクション全体がロールバックし、承認操作自体が失敗するリスクがある
- `void` で非同期実行することで、Webhook 基盤の障害がユーザーレスポンスに一切影響しない
- `webhook_deliveries` テーブルに `status: "pending"` レコードを残すことで、配信漏れを追跡可能にし、将来のリトライ実装の基盤とする

#### Alternative 1: トランザクション内での同期配信

| | |
|---|---|
| **Pros** | 配信成功とトランザクション成功が原子的に確保できる。配信漏れが発生しない |
| **Cons** | 外部 HTTP 通信の障害・タイムアウトがトランザクション全体のロールバックを引き起こし、承認操作自体が失敗する |
| **Why not** | 外部システムの障害が業務フローを停止させることは許容できないため |

---

### D5: usecase 内からの直接配信（イベントバス方式を却下）

**Decision**: 各 usecase のトランザクション完了後に、`deliverWebhookEvent` 関数を直接呼び出す。EventEmitter / pub-sub 等のイベントバスは導入しない。

**Rationale**:
- デモ規模のアプリケーションではイベントバスの疎結合メリットが過剰な抽象化コストを正当化しない
- usecase から直接呼び出すことで、イベントのトリガー箇所と配信ロジックの関係がコードを読むだけで明確になる
- 現時点でのイベント数（8種別）・Webhook ユーザー数では直接配信で十分なスループットを確保できる

#### Alternative 1: EventEmitter / pub-sub によるイベントバス

| | |
|---|---|
| **Pros** | usecase と Webhook 配信ロジックが疎結合になる。将来の通知チャネル追加（メール・Slack 等）が容易 |
| **Cons** | イベントバスのセットアップ・型定義・デバッグが複雑化する。デモ規模では過剰な抽象化 |
| **Why not** | 直接呼び出しで満たせる要件に対してイベントバスを導入するとコードの見通しが悪化するため。通知チャネルが複数に増えた段階で移行を検討する |

---

## Consequences

### Positive

- 外部システム（Slack・社内ポータル等）がリアルタイムで申請状態変更を受信できるようになる
- HMAC-SHA256 署名により受信側が改竄検知を行える（業界標準方式）
- Webhook 配信の火-and-forget 実装により、外部システムの障害が Clearflow の業務フローを停止させない
- `webhook_deliveries` テーブルが将来の exponential backoff リトライ実装の基盤となる
- テナント分離（`organizationId` 条件）が全クエリに適用され、組織間のエンドポイント・配信ログの混在を防ぐ

### Negative / Trade-offs

- サーバープロセスが Webhook 配信途中で終了した場合、`status: "pending"` のレコードが残るが実際の配信は失われる（リトライ機能がスコープ外のため）
- `deliverWebhookEvent` 内でユーザー名取得のために `userRepository.findById` を呼び出すため、Webhook 配信ごとにクエリが1件追加される（トランザクション外・非同期のため業務フローへの影響なし）
- secret はプレーンテキストで `webhook_endpoints` テーブルに保存される（署名検証のために平文が必要）。管理 UI では secret の一部をマスク表示する
- `fetch` API の固定5秒タイムアウトにより、応答が遅い外部サービスへの配信が強制的に失敗として記録される

### Constraints for future changes

- **リトライ実装時**: `webhook_deliveries` テーブルの `status: "pending"` レコードをスキャンしてリトライするバックグラウンドジョブを実装できる。exponential backoff のパラメータ（最大試行回数・待機時間）を追加カラムとして `webhook_deliveries` に追加すること
- **イベントバス移行時**: 通知チャネルが複数（メール・Slack 等）に増えた段階で、usecase からの直接呼び出しをイベントバスに切り替える。その際、現行の `deliverWebhookEvent` の呼び出し箇所（5 usecases）を一括で移行すること（D5 参照）
- **新規イベント種別追加時**: `src/domain/models/webhookEvent.ts` の `WebhookEventType` ユニオン型と `WEBHOOK_EVENT_TYPES` 定数配列を更新し、対応する usecase のイベントマッピング（D6 相当）を追加すること
- **タイムアウトカスタマイズ時**: `AbortSignal.timeout(5000)` は現在固定値。エンドポイントごとのカスタマイズを導入する場合は `webhook_endpoints` テーブルに `timeoutMs` カラムを追加すること
- **secret のローテーション**: 現在 secret のローテーション UI が存在しない。セキュリティ要件が高まった場合、`updateSecret` アクションと管理 UI を追加すること

---

## References

- `specrunner/changes/webhook-notification/design.md` — 詳細設計（D1〜D11）
- `specrunner/changes/webhook-notification/spec.md` — ビヘイビア仕様
- `specrunner/changes/webhook-notification/request.md` — 要件定義
- `src/infrastructure/schema.ts` — `webhookEndpoints` / `webhookDeliveries` テーブル定義、`webhookDeliveryStatusEnum`
- `src/domain/models/webhookEvent.ts` — `WebhookEventType`、`WEBHOOK_EVENT_TYPES`、`WebhookPayload` 型定義
- `src/infrastructure/webhookDelivery.ts` — `deliverWebhookEvent`、`computeSignature` 実装
- `src/infrastructure/repositories/webhookEndpointRepository.ts` — エンドポイント CRUD・テナント分離クエリ
- `src/infrastructure/repositories/webhookDeliveryRepository.ts` — 配信ログ管理
- `src/app/actions/webhooks.ts` — Webhook 管理 Server Actions（admin ロールガード）
- `src/app/(dashboard)/settings/webhooks/` — Webhook 管理 UI
