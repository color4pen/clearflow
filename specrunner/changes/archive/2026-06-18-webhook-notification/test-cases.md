# Test Cases: Webhook 通知とイベント配信基盤

## Summary

- **Total**: 46 cases
- **Automated** (unit/integration): 37 (unit: 34, integration: 3)
- **Manual**: 9
- **Priority**: must: 35, should: 8, could: 3

---

## イベント種別定義

### TC-001: イベント種別の定義を確認する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 8 種類の Webhook イベントが定義される > Scenario: イベント種別の定義を確認する

---

## スキーマ定義

### TC-002: スキーマ定義を確認する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: webhook_endpoints テーブルと webhook_deliveries テーブルが schema.ts に定義される > Scenario: スキーマ定義を確認する

---

## ドメインモデル

### TC-003: domain/models 配下の Webhook 関連ファイルに ORM import がない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 依存方向 actions -> usecases -> domain / infrastructure を遵守する > Scenario: domain/models 配下の Webhook 関連ファイルに ORM import がない

### TC-004: ドメインモデルが domain/models/index.ts から re-export されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/domain/models/index.ts` が存在する
**WHEN** ファイルの内容を検査する
**THEN** `WebhookEventType`, `WEBHOOK_EVENT_TYPES`, `WebhookPayload`, `WebhookEventData`, `WebhookEndpoint`, `WebhookDeliveryStatus`, `WebhookDelivery` が全て re-export されている

---

## HMAC 署名

### TC-005: 既知の入力に対して正しい署名が生成される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: HMAC-SHA256 署名が X-Clearflow-Signature ヘッダーに付与される > Scenario: 既知の入力に対して正しい署名が生成される

### TC-006: 配信リクエストに署名ヘッダーが含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: HMAC-SHA256 署名が X-Clearflow-Signature ヘッダーに付与される > Scenario: 配信リクエストに署名ヘッダーが含まれる

---

## ペイロード構造

### TC-007: ペイロードに必須フィールドが含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Webhook ペイロードが共通構造を持つ > Scenario: ペイロードに必須フィールドが含まれる

### TC-008: step イベントのペイロードにステップ情報が含まれる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Webhook ペイロードが共通構造を持つ > Scenario: step イベントのペイロードにステップ情報が含まれる

---

## usecase 統合・イベント発火

### TC-009: approveRequest でトランザクション完了後に Webhook が配信される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Webhook 配信はトランザクション外で fire-and-forget で実行される > Scenario: approveRequest でトランザクション完了後に Webhook が配信される

### TC-010: Webhook 配信が失敗してもユーザーレスポンスは成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Webhook 配信はトランザクション外で fire-and-forget で実行される > Scenario: Webhook 配信が失敗してもユーザーレスポンスは成功する

### TC-011: createRequest が request.created を発火する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 各 usecase が正しいイベントを発火する > Scenario: createRequest が request.created を発火する

### TC-012: submitRequest が request.submitted を発火する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 各 usecase が正しいイベントを発火する > Scenario: submitRequest が request.submitted を発火する

### TC-013: approveRequest がステップ承認と全ステップ完了の両方を発火する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 各 usecase が正しいイベントを発火する > Scenario: approveRequest がステップ承認と全ステップ完了の両方を発火する

### TC-014: rejectRequest (revision) が request.revised と step.rejected を発火する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 各 usecase が正しいイベントを発火する > Scenario: rejectRequest (revision) が request.revised と step.rejected を発火する

### TC-015: rejectRequest (rejected) が request.rejected を発火する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 各 usecase が正しいイベントを発火する > Scenario: rejectRequest (rejected) が request.rejected を発火する

### TC-016: resubmitRequest が request.resubmitted を発火する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 各 usecase が正しいイベントを発火する > Scenario: resubmitRequest が request.resubmitted を発火する

---

## 配信サービス

### TC-017: HTTP 500 レスポンスで配信失敗が記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 配信失敗時に webhook_deliveries の status が failed に更新される > Scenario: HTTP 500 レスポンスで配信失敗が記録される

### TC-018: タイムアウトで配信失敗が記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 配信失敗時に webhook_deliveries の status が failed に更新される > Scenario: タイムアウトで配信失敗が記録される

### TC-019: deliverWebhookEvent が try-catch で保護され例外を外に投げない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/webhookDelivery.ts` が存在する
**WHEN** `deliverWebhookEvent` 関数のソースコードを検査する
**THEN** 関数本体全体が try-catch で囲まれており、catch ブロックで例外を再スロー（throw）していない（`console.error` でのみログを記録する）

### TC-020: AbortSignal.timeout(5000) がタイムアウト設定に使われている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/webhookDelivery.ts` が存在する
**WHEN** fetch 呼び出しの引数を検査する
**THEN** `AbortSignal.timeout(5000)` が signal オプションとして渡されている

### TC-021: 複数エンドポイントへの配信が Promise.allSettled で並列実行される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/webhookDelivery.ts` が存在する
**WHEN** `deliverWebhookEvent` のエンドポイント反復処理を検査する
**THEN** `Promise.allSettled` を使って各エンドポイントへの配信を並列実行している

---

## イベントフィルタリング

### TC-022: request.approved のみ購読しているエンドポイントに request.submitted は配信されない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: イベント購読フィルタリングが適用される > Scenario: request.approved のみ購読しているエンドポイントに request.submitted は配信されない

### TC-023: 全イベント購読しているエンドポイントに全イベントが配信される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: イベント購読フィルタリングが適用される > Scenario: 全イベント購読しているエンドポイントに全イベントが配信される

---

## テナント分離

### TC-024: エンドポイント一覧取得で organizationId フィルタが適用される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Webhook エンドポイントのクエリにテナント分離が適用される > Scenario: エンドポイント一覧取得で organizationId フィルタが適用される

### TC-025: エンドポイント削除で organizationId 条件が付与される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Webhook エンドポイントのクエリにテナント分離が適用される > Scenario: エンドポイント削除で organizationId 条件が付与される

### TC-026: findByEndpointId が organizationId でテナント分離している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/webhookDeliveryRepository.ts` が存在する
**WHEN** `findByEndpointId` 関数の実装を検査する
**THEN** `organizationId` を使ったエンドポイント所有権確認（JOIN または事前チェック）が存在し、他組織の配信ログを取得できない

---

## URL バリデーション / SSRF 対策

### TC-027: https URL のみ許可する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Webhook エンドポイントの URL は安全であること > Scenario: https URL のみ許可する

### TC-028: 私有 IP アドレスを拒否する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Webhook エンドポイントの URL は安全であること > Scenario: 私有 IP アドレスを拒否する

### TC-029: リンクローカルアドレスを拒否する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Webhook エンドポイントの URL は安全であること > Scenario: リンクローカルアドレスを拒否する

---

## アクセス制御

### TC-030: member ロールがエンドポイント作成を試みる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Webhook 管理ページは admin ロールのみアクセス可能 > Scenario: member ロールがエンドポイント作成を試みる

### TC-031: admin ロールがエンドポイント作成に成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Webhook 管理ページは admin ロールのみアクセス可能 > Scenario: admin ロールがエンドポイント作成に成功する

### TC-032: organizationId はセッションから取得している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/webhooks.ts` が存在する
**WHEN** 各 Server Action の実装を検査する
**THEN** `organizationId` が `session.user.organizationId` から取得されており、`formData` または URL パラメータから取得していない

### TC-033: webhooks.ts に "use server" ディレクティブが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/webhooks.ts` が存在する
**WHEN** ファイルの先頭を検査する
**THEN** `"use server"` ディレクティブがファイルの冒頭（import より前または直後）に存在する

---

## Server Actions

### TC-034: mutation 系 action で revalidatePath が呼ばれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/webhooks.ts` が存在する
**WHEN** `createWebhookEndpointAction`, `deleteWebhookEndpointAction`, `toggleWebhookEndpointAction` の実装を検査する
**THEN** それぞれの action 内で `revalidatePath("/settings/webhooks")` が呼ばれている

### TC-035: secret 自動生成に whsec_ プレフィックスと crypto.randomBytes(32) が使われている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/webhooks.ts` が存在する
**WHEN** `createWebhookEndpointAction` の実装を検査する
**THEN** `crypto.randomBytes(32).toString("hex")` と `"whsec_"` プレフィックスを使った secret 生成ロジックが存在する

---

## Webhook 管理 UI

### TC-036: /settings/webhooks に admin 以外がアクセスした場合リダイレクトされる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** member ロールのユーザーがログインしている
**WHEN** `/settings/webhooks` にブラウザでアクセスする
**THEN** `/requests` にリダイレクトされ、Webhook 管理ページは表示されない

### TC-037: エンドポイント追加フォームが URL 入力とイベント種別チェックボックスを持つ

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** admin ユーザーが `/settings/webhooks` を開いている
**WHEN** ページが表示される
**THEN** URL 入力フィールドと、8 種類のイベント種別に対応するチェックボックス群が表示されている

### TC-038: /settings/webhooks/[id]/deliveries に admin 以外がアクセスした場合リダイレクトされる

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** member ロールのユーザーがログインしている
**WHEN** `/settings/webhooks/{endpointId}/deliveries` にブラウザでアクセスする
**THEN** `/requests` にリダイレクトされ、配信ログページは表示されない

### TC-039: 配信ログのステータスに応じた色分けがされている

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-08

**GIVEN** admin ユーザーが配信ログ一覧ページ `/settings/webhooks/[id]/deliveries` を開いている
**WHEN** 各ステータスの配信ログが表示される
**THEN** `delivered` が緑系、`failed` が赤系、`pending` がグレー系の色で表示されている

---

## ダッシュボード統合

### TC-040: admin ユーザーのダッシュボードヘッダーに「設定」リンクが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** admin ロールのユーザーがログインしている
**WHEN** ダッシュボード内のいずれかのページを開く
**THEN** ヘッダーに `/settings/webhooks` を指す「設定」リンクが表示されている

### TC-041: admin 以外のロールには「設定」リンクが表示されない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** member / manager / finance ロールのユーザーがログインしている
**WHEN** ダッシュボード内のいずれかのページを開く
**THEN** ヘッダーに「設定」リンクが表示されない

---

## シードデータ

### TC-042: seed.ts でデフォルト組織に全イベント購読エンドポイントが作成される

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-10

**GIVEN** `src/infrastructure/seed.ts` が存在する
**WHEN** ファイルの内容を検査する
**THEN** `webhookEndpoints` テーブルへの insert で `url: "https://example.com/webhook"`, `isActive: true`, `events` に 8 種類全てのイベント種別が含まれるレコードが作成される定義がある

### TC-043: truncate の順序が FK 制約に違反しない

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-10

**GIVEN** `src/infrastructure/seed.ts` が存在する
**WHEN** ファイルの削除処理の順序を検査する
**THEN** `webhookDeliveries` の delete が `webhookEndpoints` の delete より前に実行されている（FK の参照先より参照元を先に削除する）

---

## ビルド・テスト検証

### TC-044: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** 全タスクの実装が完了している
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーが発生せず正常終了する

### TC-045: bun test が全件 green

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** 全タスクの実装が完了している
**WHEN** `bun test` を実行する
**THEN** 全テストケースが green（pass）になる

### TC-046: typecheck が green

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** 全タスクの実装が完了している
**WHEN** `typecheck`（tsc --noEmit 相当）を実行する
**THEN** 型エラーが発生しない

---

## Result

```yaml
result: completed
total: 46
automated: 37
manual: 9
must: 35
should: 8
could: 3
blocked_reasons: []
```
