# Test Cases: Webhook リトライと監査ログ CSV エクスポート

## Summary

- **Total**: 43 cases
- **Automated** (unit/integration): 36
- **Manual**: 7
- **Priority**: must: 37, should: 6, could: 0

---

## Webhook リトライロジック

### TC-001: 一時的障害からリトライで回復する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 配信失敗時に exponential backoff で最大 3 回リトライされる > Scenario: 外部サービスの一時的ダウンからリトライで回復する

---

### TC-002: 全リトライ失敗後に status:failed, attempts:4 で確定する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 配信失敗時に exponential backoff で最大 3 回リトライされる > Scenario: 全リトライ失敗後に status が failed で確定する

---

### TC-003: バックオフ定数 MAX_ATTEMPTS=4, BASE_DELAY_MS=1000 が正しい値で定義されている

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: バックオフ間隔が 1s, 4s, 16s である > Scenario: バックオフ間隔を確認する

---

### TC-004: 各試行で attempts がインクリメントされ lastAttemptAt が更新される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 各試行で attempts をインクリメントし lastAttemptAt を更新する > Scenario: リトライ中に attempts がインクリメントされる

---

### TC-005: リトライ中は status が "pending" を維持し nextRetryAt が設定される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** `src/infrastructure/webhookDelivery.ts` のソースコードを検査する
**WHEN** リトライループ内の失敗かつリトライ残りありの処理分岐を確認する
**THEN** `status: "pending"` への更新と、`nextRetryAt` に次リトライ予定時刻 (`Date.now() + BASE_DELAY_MS * Math.pow(4, attempt - 1)`) を設定する処理が存在する

---

### TC-006: deliverSingleAttempt が export され exponential backoff を持たない単発試行関数である

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 補足, T-11

**GIVEN** `src/infrastructure/webhookDelivery.ts` のソースコードを検査する
**WHEN** `deliverSingleAttempt` 関数の実装を確認する
**THEN** `export` されており、関数内にループ構造 (`for` / `while`) および `Bun.sleep` が存在しない（単発試行であることの確認）

---

## nextRetryAt カラム追加

### TC-007: schema.ts の webhookDeliveries に nextRetryAt カラムが定義されている

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: webhook_deliveries テーブルに nextRetryAt カラムが存在する > Scenario: スキーマに nextRetryAt カラムが存在する

---

### TC-008: WebhookDelivery 型に nextRetryAt: Date | null フィールドが存在する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: webhook_deliveries テーブルに nextRetryAt カラムが存在する > Scenario: WebhookDelivery 型に nextRetryAt が存在する

---

### TC-009: Drizzle マイグレーション SQL に next_retry_at ADD COLUMN が含まれる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `bunx drizzle-kit generate` を実行した
**WHEN** 生成された `drizzle/0002_webhook_retry_audit_export.sql` の内容を確認する
**THEN** `ALTER TABLE "webhook_deliveries" ADD COLUMN "next_retry_at" timestamp;` が含まれる

---

### TC-010: updateStatus が nextRetryAt パラメータを受け取り更新できる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/repositories/webhookDeliveryRepository.ts` のソースコードを検査する
**WHEN** `updateStatus` 関数のシグネチャと `.set()` の実装を確認する
**THEN** 引数型に `nextRetryAt?: Date | null` が含まれ、`.set()` 内で `nextRetryAt` を更新する処理が存在する

---

### TC-011: mapRow が nextRetryAt フィールドをマッピングする

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/repositories/webhookDeliveryRepository.ts` のソースコードを検査する
**WHEN** `mapRow` 関数の実装を確認する
**THEN** `nextRetryAt: row.nextRetryAt ?? null` のマッピングが存在する

---

## 手動リトライ

### TC-012: admin ロールが failed 配信を手動リトライできる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 手動リトライが admin ロールのみ実行可能 > Scenario: admin ロールが failed 配信を手動リトライする

---

### TC-013: member ロールが手動リトライを試みると権限エラーが返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 手動リトライが admin ロールのみ実行可能 > Scenario: member ロールが手動リトライを試みる

---

### TC-014: delivered 状態の配信は手動リトライできない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 手動リトライが admin ロールのみ実行可能 > Scenario: delivered 状態の配信をリトライしようとする

---

### TC-015: 手動リトライは 1 回のみ試行され attempts が既存値 +1 される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 手動リトライは1回のみの単発試行であり exponential backoff は適用しない > Scenario: 手動リトライが1回のみ試行される

---

### TC-016: 手動リトライ後は成功・失敗いずれの場合も nextRetryAt が null になる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 手動リトライは1回のみの単発試行であり exponential backoff は適用しない > Scenario: 手動リトライ後の nextRetryAt が null である

---

### TC-017: 他組織の配信レコードは手動リトライできない（テナント分離）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 手動リトライのテナント分離 > Scenario: 他組織の配信レコードをリトライしようとする

---

### TC-018: resetForRetry が status と nextRetryAt のみ更新し attempts をリセットしない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/webhookDeliveryRepository.ts` のソースコードを検査する
**WHEN** `resetForRetry` 関数の実装を確認する
**THEN** `status: "pending"` と `nextRetryAt: null` を更新し、`attempts` および `lastAttemptAt` の更新処理が存在しない

---

### TC-019: webhookEndpointRepository.findById が organizationId 条件付きで検索する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `src/infrastructure/repositories/webhookEndpointRepository.ts` のソースコードを検査する
**WHEN** `findById(id, organizationId)` 関数の実装を確認する
**THEN** `id` AND `organizationId` の両方を WHERE 条件に含む検索が実装されており、`WebhookEndpoint | null` を返す

---

### TC-020: 配信ログ画面で failed 行のみリトライボタンが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/app/(dashboard)/settings/webhooks/[id]/deliveries/page.tsx` のソースコードを検査する
**WHEN** テーブル行のリトライボタン表示条件を確認する
**THEN** `status === "failed"` の条件でのみリトライボタンが表示され、`delivered` / `pending` 状態の行には表示されない

---

## 監査ログリポジトリ

### TC-021: findByOrganization が organizationId でフィルタし createdAt 降順で取得する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 監査ログ一覧のクエリに organizationId 条件が付与される > Scenario: findByOrganization が organizationId でフィルタする

---

### TC-022: findByOrganization が startDate/endDate の日付範囲フィルタを適用する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/infrastructure/repositories/auditLogRepository.ts` のソースコードを検査する
**WHEN** `findByOrganization` の `startDate` / `endDate` フィルタ実装を確認する
**THEN** `gte(auditLogs.createdAt, startDate)` と `lte(auditLogs.createdAt, endDate)` が `and()` で結合されており、各条件は指定時のみ追加される

---

### TC-023: findByOrganization が action フィルタを適用する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/infrastructure/repositories/auditLogRepository.ts` のソースコードを検査する
**WHEN** `findByOrganization` の `action` フィルタ実装を確認する
**THEN** `options.action` 指定時に `eq(auditLogs.action, options.action)` が WHERE 条件に追加されている

---

### TC-024: findByOrganization が limit/offset によるページネーションをサポートする

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/infrastructure/repositories/auditLogRepository.ts` のソースコードを検査する
**WHEN** `findByOrganization` の `limit` / `offset` 実装を確認する
**THEN** `options.limit` 指定時に `.limit()` が、`options.offset` 指定時に `.offset()` が適用されている

---

## CSV エクスポート

### TC-025: admin ユーザーが CSV エクスポートを実行し text/csv レスポンスとヘッダー行 + データ行を受け取る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: /api/audit-logs/export が CSV を返す > Scenario: admin ユーザーが CSV エクスポートを実行する

---

### TC-026: CSV エクスポートの startDate/endDate 日付範囲フィルタが適用される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: /api/audit-logs/export が CSV を返す > Scenario: 日付範囲フィルタが適用される

---

### TC-027: metadata が JSON.stringify で 1 カラムに出力され RFC 4180 に従いエスケープされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: /api/audit-logs/export が CSV を返す > Scenario: metadata が JSON.stringify で 1 カラムに出力される

---

### TC-028: CSV エクスポートの organizationId フィルタで他組織のログが含まれない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: CSV エクスポートに organizationId フィルタが適用される > Scenario: セッションの organizationId でフィルタされる

---

### TC-029: 未認証の CSV エクスポートリクエストに HTTP 401 が返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: CSV エクスポートの認証・認可 > Scenario: 未認証で CSV エクスポートを試みる

---

### TC-030: member ロールの CSV エクスポートリクエストに HTTP 403 が返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: CSV エクスポートの認証・認可 > Scenario: member ロールで CSV エクスポートを試みる

---

### TC-031: CSV 先頭に BOM が付与される（Excel 対応）

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `src/app/api/audit-logs/export/route.ts` のソースコードを検査する
**WHEN** CSV 生成ロジックの先頭を確認する
**THEN** UTF-8 BOM (`﻿`) が `csvContent` の先頭に付与されている

---

### TC-032: CSV Formula Injection 対策で =,+,-,@ 始まりの値に先頭シングルクォートが付与される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/app/api/audit-logs/export/route.ts` の `escapeCsvValue` 実装を検査する
**WHEN** `=`, `+`, `-`, `@` のいずれかで始まる値に対するエスケープ処理を確認する
**THEN** 先頭にシングルクォート `'` が付与され、Excel/スプレッドシートで数式として評価されない（CWE-1236 対策）

---

### TC-033: 無効な日付クエリパラメータは無視されエラーにならない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `src/app/api/audit-logs/export/route.ts` のソースコードを検査する
**WHEN** `startDate` / `endDate` クエリパラメータのバリデーション処理を確認する
**THEN** `isNaN(date.getTime())` 判定があり、無効な値の場合はパラメータが `undefined` として扱われフィルタに含まれない

---

### TC-034: Content-Disposition ヘッダーに attachment とファイル名が含まれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `src/app/api/audit-logs/export/route.ts` のソースコードを検査する
**WHEN** レスポンスヘッダーの `Content-Disposition` を確認する
**THEN** `attachment; filename="audit-logs-YYYY-MM-DD.csv"` 形式のヘッダーが含まれる

---

## 監査ログ一覧 UI

### TC-035: member ロールが監査ログ一覧にアクセスすると /requests にリダイレクトされる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 監査ログ一覧ページは admin ロールのみアクセス可能 > Scenario: member ロールが監査ログ一覧にアクセスする

---

### TC-036: CSV ダウンロードボタンが現在のフィルタ条件を /api/audit-logs/export に引き継ぐ

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/app/(dashboard)/settings/audit-logs/page.tsx` のソースコードを検査する
**WHEN** CSV ダウンロードボタンのリンク生成ロジックを確認する
**THEN** `<a>` タグが `/api/audit-logs/export` を href とし、現在の `startDate`, `endDate`, `action` クエリパラメータを引き継いでいる

---

### TC-037: ページネーションの前へ/次へリンクが正しく動作する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** `src/app/(dashboard)/settings/audit-logs/page.tsx` のソースコードを検査する
**WHEN** ページネーション実装を確認する
**THEN** `page` パラメータの増減リンクが存在し、取得結果が `limit` 件未満の場合に「次へ」が非表示、`page === 1` の場合に「前へ」が非表示になるロジックがある

---

### TC-038: ダッシュボードレイアウトに監査ログリンクが admin ロールのみに表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/app/(dashboard)/layout.tsx` のソースコードを検査する
**WHEN** admin 条件付きレンダリングブロック内のリンクを確認する
**THEN** `/settings/audit-logs` へのリンクが `session.user.role === "admin"` の条件ブロック内に存在する

---

## アーキテクチャ

### TC-039: domain 層のファイルに infrastructure への import がない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 依存方向 actions -> usecases -> domain / infrastructure を遵守する > Scenario: WebhookDelivery 型の変更が domain 層の規約に違反しない

---

## 静的解析・ビルド

### TC-040: projectStructure テストに audit-logs export route が追加されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `src/__tests__/static/projectStructure.test.ts` のソースコードを検査する
**WHEN** TC-057 のファイルリストを確認する
**THEN** `"app/api/audit-logs/export/route.ts"` がリストに含まれている

---

### TC-041: bun test が全件 green である

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 実装が完了した状態
**WHEN** `bun test` を実行する
**THEN** 全テストが pass し、失敗件数が 0 である

---

### TC-042: bun run build および typecheck が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 実装が完了した状態
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーなく完了し、TypeScript 型チェックも green である

---

### TC-043: 既存の webhookWorkflow テストが引き続き pass する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `src/__tests__/usecases/webhookWorkflow.test.ts` が存在する
**WHEN** `bun test` を実行する
**THEN** `webhookWorkflow.test.ts` の全テスト (`AbortSignal.timeout`, `X-Clearflow-Signature`, `fetch`, `void deliverWebhookEvent` 等の検証) が pass する

---

## Result

```yaml
result: completed
total: 43
automated: 36
manual: 7
must: 37
should: 6
could: 0
blocked_reasons: []
```
