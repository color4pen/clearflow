# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ | 全タスク (T-01〜T-13) のチェックボックスが [x] |
| design.md | ✅ | D1〜D11 全決定が実装に反映されている |
| spec.md | ✅ | 全 Requirements (SHALL/MUST) および全 Scenarios が実装で満たされている |
| request.md | ✅ | 全受け入れ基準が実装・テストで確認できる |

---

## 詳細所見

### tasks.md

T-01〜T-13 の全チェックボックスが完了済み (`[x]`)。

### design.md

| 決定 | 内容 | 適合 |
|---|---|---|
| D1 | `webhook_endpoints` / `webhook_deliveries` テーブル新設 | ✅ |
| D2 | 8種類イベント（過去形命名）をドメインモデルで定義 | ✅ |
| D3 | HMAC-SHA256 署名を `computeSignature` で実装 | ✅ |
| D4 | `WebhookPayload` 共通構造 | ✅ |
| D5 | トランザクション外 fire-and-forget・内部 try-catch で例外を握りつぶす | ✅ |
| D6 | usecase ごとのイベントマッピング通りに実装 | ✅ |
| D7 | `webhookEvent.ts`, `webhookEndpoint.ts`, `webhookDelivery.ts` の3ドメインモデル | ✅ |
| D8 | `webhookEndpointRepository` (5関数) + `webhookDeliveryRepository` (3関数) | ✅ |
| D9 | `/settings/webhooks` + `/settings/webhooks/[id]/deliveries` ページ | ✅ |
| D10 | `seed.ts` にデフォルト組織の Webhook エンドポイント追加 | ✅ |
| D11 | 静的解析テスト + HMAC ユニットテスト | ✅ |

### spec.md

**R: Webhook 配信はトランザクション外で fire-and-forget**
- 5 usecases 全てで `void deliverWebhookEvent` が `db.transaction()` ブロックの外に配置されている。
- `deliverWebhookEvent` 全体が try-catch で保護され、例外を外に投げない。

**R: 8種類のイベント定義**
- `webhookEvent.ts` に `WEBHOOK_EVENT_TYPES` (8要素) と `WebhookEventType` 型が export されている。

**R: HMAC-SHA256 署名**
- `computeSignature` が `createHmac("sha256", secret).update(payload).digest("hex")` を使用。
- `X-Clearflow-Signature: sha256=<hex>` ヘッダーが fetch 呼び出しに付与されている。
- `webhookSignature.test.ts` にて既知入力での期待値一致を検証済み。

**R: URL 安全性**
- `parsed.protocol !== "https:"` で HTTP スキームを拒否。
- `PRIVATE_IP_PATTERNS` 配列にて RFC 1918・ループバック・リンクローカルを拒否。

**R: 各 usecase の正しいイベント発火**
- createRequest → `request.created` ✅
- submitRequest → `request.submitted` ✅
- approveRequest (ステップなし) → `request.approved` ✅
- approveRequest (マルチステップ) → `step.approved` + 全完了時 `request.approved` ✅
- rejectRequest (revision) → `request.revised` + `step.rejected` ✅
- rejectRequest (rejected) → `request.rejected` ✅
- resubmitRequest → `request.resubmitted` ✅

**R: 共通ペイロード構造**
- `WebhookPayload` 型に `{ event, timestamp, organizationId, data }` が定義されている。
- `step.approved` / `step.rejected` イベントで `data.metadata` に `{ stepId, stepOrder, approverRole }` が含まれる。

**R: テナント分離**
- `webhookEndpointRepository` の全関数に `organizationId` 条件が付与されている。
- `webhookDeliveryRepository.findByEndpointId` は `organizationId` で endpoint の所有権を事前確認してから deliveries を取得する。

**R: Webhook 管理は admin 専用**
- 全 Server Action で `session.user.role !== "admin"` の場合に `{ success: false, message: "権限がありません" }` を返す。
- ページコンポーネントでも admin 以外を `/requests` にリダイレクト。

**R: スキーマ定義**
- `webhookEndpoints`, `webhookDeliveries`, `webhookDeliveryStatusEnum` が `schema.ts` に正しく定義されている。

**R: 配信失敗時の status 更新**
- HTTP 非 OK → `status: "failed"`, `statusCode: response.status`, `attempts: 1`。
- ネットワークエラー・タイムアウト → `status: "failed"`, `statusCode: null`, `attempts: 1`。
- `AbortSignal.timeout(5000)` による5秒タイムアウトが設定されている。

**R: イベント購読フィルタリング**
- DB で `isActive === true` + `organizationId` を絞り込み後、JS 側で `ep.events.includes(event)` によりフィルタ。

**R: 依存方向**
- `src/domain/models/` 配下の Webhook 関連3ファイルに `@/infrastructure`, `drizzle`, `postgres` の import が存在しない。

### request.md

| 受け入れ基準 | 適合 |
|---|---|
| `bun run build` が成功する | ✅ (T-13 完了) |
| `bun test` が全件 green | ✅ (T-13 完了) |
| `webhook_endpoints` / `webhook_deliveries` テーブルが schema.ts に定義 | ✅ |
| 8つのイベント種別が `webhookEvent.ts` に定義 | ✅ |
| HMAC-SHA256 署名の生成ロジックとテスト | ✅ |
| Webhook 配信がトランザクション外で実行 | ✅ |
| Webhook 配信失敗がユーザーレスポンスに影響しないことをテストで確認 | ✅ |
| Webhook エンドポイントのクエリに organizationId 条件 | ✅ |
| Webhook 管理ページが admin ロールのみアクセス可能 | ✅ |
| 依存方向 `actions → usecases → domain / infrastructure` を遵守 | ✅ |
| `typecheck` が green | ✅ (T-13 完了) |

---

## アーキテクチャ整合性

- **ドメイン層の純粋性**: `src/domain/models/` 配下の Webhook 関連ファイルに ORM・infrastructure への import が存在しない。
- **依存方向の単方向性**: actions → usecases → (domain / infrastructure) の方向が維持されている。
- **テナント分離の網羅性**: リポジトリの全公開関数に `organizationId` によるスコープ制限が適用されている。
- **fire-and-forget の完全性**: `void` + 外部 try-catch の組み合わせにより、Webhook 基盤の障害が承認操作の結果に伝播しない。
- **SSRF 対策**: HTTPS 限定 + 私有IP帯ブロックが Server Action レイヤーで適切に実施されている。

不適合事項なし。
