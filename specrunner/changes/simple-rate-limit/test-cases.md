# Test Cases: シンプルなレート制限

## Summary

- **Total**: 28 cases
- **Automated** (unit/integration): 25
- **Manual**: 3
- **Priority**: must: 26, should: 2, could: 0

---

## スキーマ定義

### TC-001: rate_limit_records テーブルのスキーマ定義

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: rate_limit_records テーブルが schema.ts に定義されている > Scenario: rate_limit_records テーブルのスキーマ定義

---

## checkRateLimit 関数の動作

### TC-002: 初回リクエストが許可される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: checkRateLimit 関数が INSERT ON CONFLICT による原子的 upsert で実装されている > Scenario: 初回リクエストが許可される

---

### TC-003: limit 以内のリクエストが許可される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: checkRateLimit 関数が INSERT ON CONFLICT による原子的 upsert で実装されている > Scenario: limit 以内のリクエストが許可される

---

### TC-004: limit 超過のリクエストが拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: checkRateLimit 関数が INSERT ON CONFLICT による原子的 upsert で実装されている > Scenario: limit 超過のリクエストが拒否される

---

### TC-005: ウィンドウ期限切れ後にカウントがリセットされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: checkRateLimit 関数が INSERT ON CONFLICT による原子的 upsert で実装されている > Scenario: ウィンドウ期限切れ後にカウントがリセットされる

---

### TC-006: checkRateLimit 実装に INSERT ON CONFLICT パターンが使われている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02: RATE_LIMITS 定数と checkRateLimit 関数を実装

**GIVEN** `src/infrastructure/rateLimit.ts` のソースコードを確認する
**WHEN** DB アクセスの実装パターンを検索する
**THEN** `onConflictDoUpdate` または `ON CONFLICT` のパターンが存在する（SELECT → UPDATE の 2 ステップ方式は使われていない）

---

## RATE_LIMITS 定数

### TC-007: RATE_LIMITS 定数の値

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: RATE_LIMITS 定数が定義されている > Scenario: RATE_LIMITS 定数の値

---

## createRequestAction

### TC-008: createRequestAction でレート制限超過

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createRequestAction にレート制限が認証チェック直後に適用されている > Scenario: createRequestAction でレート制限超過

---

### TC-009: createRequestAction でレート制限内

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createRequestAction にレート制限が認証チェック直後に適用されている > Scenario: createRequestAction でレート制限内

---

### TC-010: createRequestAction のレート制限超過レスポンス

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: レート制限超過時のレスポンス形式が統一されている > Scenario: createRequestAction のレート制限超過レスポンス

---

## 承認/却下/提出/再申請 Actions

### TC-011: 冪等キーのキャッシュヒット時はレートを消費しない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 承認/却下/提出/再申請 Action にレート制限が冪等キーチェックの後に適用されている > Scenario: 冪等キーのキャッシュヒット時はレートを消費しない

---

### TC-012: 承認操作でレート制限超過

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 承認/却下/提出/再申請 Action にレート制限が冪等キーチェックの後に適用されている > Scenario: 承認操作でレート制限超過

---

### TC-013: approveRequestAction のレート制限超過レスポンス

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: レート制限超過時のレスポンス形式が統一されている > Scenario: approveRequestAction のレート制限超過レスポンス

---

### TC-014: submitRequestAction にレート制限チェックが冪等キーチェック後に適用されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04: 承認/却下/提出/再申請 Actions にレート制限を追加

**GIVEN** `src/app/actions/requests.ts` のソースコードを確認する
**WHEN** `submitRequestAction` 関数内の `checkRateLimit` 呼び出しと `findByKey` 呼び出しの位置を比較する
**THEN** `checkRateLimit` は存在し、かつ `findByKey`（冪等キーチェック）より後に出現する

---

### TC-015: rejectRequestAction にレート制限チェックが冪等キーチェック後に適用されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04: 承認/却下/提出/再申請 Actions にレート制限を追加

**GIVEN** `src/app/actions/requests.ts` のソースコードを確認する
**WHEN** `rejectRequestAction` 関数内の `checkRateLimit` 呼び出しと `findByKey` 呼び出しの位置を比較する
**THEN** `checkRateLimit` は存在し、かつ `findByKey`（冪等キーチェック）より後に出現する

---

### TC-016: resubmitRequestAction にレート制限チェックが冪等キーチェック後に適用されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04: 承認/却下/提出/再申請 Actions にレート制限を追加

**GIVEN** `src/app/actions/requests.ts` のソースコードを確認する
**WHEN** `resubmitRequestAction` 関数内の `checkRateLimit` 呼び出しと `findByKey` 呼び出しの位置を比較する
**THEN** `checkRateLimit` は存在し、かつ `findByKey`（冪等キーチェック）より後に出現する

---

## Webhook 管理 Actions

### TC-017: Webhook 作成でレート制限超過

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Webhook 管理 Action にレート制限が認証チェック直後に適用されている > Scenario: Webhook 作成でレート制限超過

---

### TC-018: Webhook 一覧取得はレート制限対象外

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Webhook 管理 Action にレート制限が認証チェック直後に適用されている > Scenario: Webhook 一覧取得はレート制限対象外

---

### TC-019: deleteWebhookEndpointAction にレート制限チェックが適用されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05: Webhook 管理 Actions にレート制限を追加

**GIVEN** `src/app/actions/webhooks.ts` のソースコードを確認する
**WHEN** `deleteWebhookEndpointAction` 関数内を確認する
**THEN** `checkRateLimit` 呼び出しが存在し、認証 + ロールチェックの後に配置されている

---

### TC-020: toggleWebhookEndpointAction にレート制限チェックが適用されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05: Webhook 管理 Actions にレート制限を追加

**GIVEN** `src/app/actions/webhooks.ts` のソースコードを確認する
**WHEN** `toggleWebhookEndpointAction` 関数内を確認する
**THEN** `checkRateLimit` 呼び出しが存在し、認証 + ロールチェックの後に配置されている

---

### TC-021: retryWebhookDeliveryAction にレート制限チェックが適用されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05: Webhook 管理 Actions にレート制限を追加

**GIVEN** `src/app/actions/webhooks.ts` のソースコードを確認する
**WHEN** `retryWebhookDeliveryAction` 関数内を確認する
**THEN** `checkRateLimit` 呼び出しが存在し、認証 + ロールチェックの後に配置されている

---

### TC-022: listWebhookDeliveriesAction にレート制限が適用されていない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05: Webhook 管理 Actions にレート制限を追加

**GIVEN** `src/app/actions/webhooks.ts` のソースコードを確認する
**WHEN** `listWebhookDeliveriesAction` 関数内を確認する
**THEN** `checkRateLimit` 呼び出しが存在しない

---

## 依存方向

### TC-023: usecase 層が rateLimit モジュールを参照しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 依存方向の維持 > Scenario: usecase 層が rateLimit モジュールを参照しない

---

## レート制限キー形式

### TC-024: checkRateLimit の key が {category}:{userId} 形式になっている

**Category**: unit
**Priority**: should
**Source**: design.md > D1: rate_limit_records テーブル設計

**GIVEN** `src/app/actions/requests.ts` および `src/app/actions/webhooks.ts` の各 Action で `checkRateLimit` に渡される `key` パラメータを確認する
**WHEN** key の値を検索する
**THEN** `createRequest:${session.user.id}`, `approveReject:${session.user.id}`, `webhookManage:${session.user.id}` の形式でそれぞれ正しいカテゴリ名が使われている

---

## 全 Action の超過メッセージ統一

### TC-025: 全 Action のレート制限超過メッセージが統一されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06: レート制限のテストを追加

**GIVEN** `src/app/actions/requests.ts` および `src/app/actions/webhooks.ts` のソースコードを確認する
**WHEN** レート制限超過時のメッセージ文字列を全 Action で検索する
**THEN** 全て `"リクエスト数の上限に達しました。しばらく待ってから再試行してください"` であり、表記揺れがない

---

## ビルド・品質ゲート

### TC-026: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** 全タスクの実装が完了している
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーなく成功する

---

### TC-027: typecheck が green

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** 全タスクの実装が完了している
**WHEN** TypeScript 型チェック（`tsc --noEmit` 相当）を実行する
**THEN** 型エラーが 0 件である

---

### TC-028: bun test が全件 green

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** 全タスクの実装が完了している
**WHEN** `bun test` を実行する
**THEN** 全テストケースが成功し、失敗・スキップが 0 件である

---

## Result

```yaml
result: completed
total: 28
automated: 25
manual: 3
must: 26
should: 2
could: 0
blocked_reasons: []
```
