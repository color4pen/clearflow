# Test Cases: approval-deadline

## Summary

- **Total**: 32 cases
- **Automated** (unit/integration): 26
- **Manual**: 6
- **Priority**: must: 19, should: 13, could: 0

---

## 状態遷移ルール (expired)

### TC-001: pending から expired への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: expired 状態遷移ルール > Scenario: pending から expired への遷移が許可される

### TC-002: expired から pending への遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: expired 状態遷移ルール > Scenario: expired から pending への遷移が拒否される

### TC-003: expired から approved への遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: expired 状態遷移ルール > Scenario: expired から approved への遷移が拒否される

### TC-004: expired から rejected への遷移が拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** 申請のステータスが `expired` である
**WHEN** `validateTransition("expired", "rejected")` を呼び出す
**THEN** `{ ok: false }` が返される

---

## isStepExpired ドメインサービス

### TC-005: deadline が null のステップは期限切れと判定されない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `ApprovalStep` の `deadline` が `null` である
**WHEN** `isStepExpired(step)` を呼び出す
**THEN** `false` が返される

### TC-006: deadline が未来のステップは期限切れと判定されない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `ApprovalStep` の `deadline` が現在時刻より1時間後に設定されている
**WHEN** `isStepExpired(step)` を呼び出す
**THEN** `false` が返される

### TC-007: deadline が過去のステップは期限切れと判定される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `ApprovalStep` の `deadline` が現在時刻より1時間前に設定されている
**WHEN** `isStepExpired(step)` を呼び出す
**THEN** `true` が返される

---

## approveRequest 期限チェック

### TC-008: 期限切れステップへの承認が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 期限切れステップへの承認操作を拒否する > Scenario: 期限切れステップへの承認が拒否される

### TC-009: 期限内のステップへの承認は通常通り処理される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 期限切れステップへの承認操作を拒否する > Scenario: 期限内のステップへの承認は通常通り処理される

### TC-010: deadline が null のステップへの承認は通常通り処理される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 期限切れステップへの承認操作を拒否する > Scenario: deadline が null のステップへの承認は通常通り処理される

### TC-011: approveRequest はトランザクション内でも期限を再チェックする

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** 承認ステップの deadline が TX 開始前は有効だったが、TX 内での再チェック時点では過去に変化している（モック）
**WHEN** `approveRequest` を実行する
**THEN** TX 内の再チェックで期限切れが検出され、操作が中断される（TOCTOU 防止）

---

## rejectRequest 期限チェック

### TC-012: 期限切れステップへの revision 却下が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 期限切れステップへの却下操作を拒否する > Scenario: 期限切れステップへの revision 却下が拒否される

### TC-013: 期限切れステップへの rejected 却下が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 期限切れステップへの却下操作を拒否する > Scenario: 期限切れステップへの rejected 却下が拒否される

### TC-014: rejectRequest はトランザクション内でも期限を再チェックする

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** 承認ステップの deadline が TX 開始前は有効だったが、TX 内での再チェック時点では過去に変化している（モック）
**WHEN** `rejectRequest` を `targetStatus: "revision"` または `"rejected"` で実行する
**THEN** TX 内の再チェックで期限切れが検出され、操作が中断される（TOCTOU 防止）

---

## expireOverdueRequests ユースケース

### TC-015: 期限切れの申請が expired に遷移する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 期限切れ一括処理 > Scenario: 期限切れの申請が expired に遷移する

### TC-016: SYSTEM_USER_ID 未設定時にエラーを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 期限切れ一括処理 > Scenario: SYSTEM_USER_ID 未設定時にエラーを返す

### TC-017: 1 申請の失敗が他の申請の処理をブロックしない

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 期限切れ一括処理 > Scenario: 1 申請の失敗が他の申請の処理をブロックしない

### TC-018: expireOverdueRequests の結果に expired / failed 件数が含まれる

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** 期限切れ対象の pending 申請が 3 件あり、うち 1 件が処理中に失敗する
**WHEN** `expireOverdueRequests()` を実行する
**THEN** 返り値が `{ expired: 2, failed: 1, errors: [{ requestId: string; reason: string }] }` の形式である

---

## findOverdueRequestIds リポジトリメソッド

### TC-019: findOverdueRequestIds は pending かつ deadline 超過の申請のみ返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** DB に以下のレコードが存在する:
- 申請 A: status=pending, deadline=過去 → 対象
- 申請 B: status=pending, deadline=未来 → 対象外
- 申請 C: status=pending, deadline=null → 対象外
- 申請 D: status=approved, deadline=過去 → 対象外
**WHEN** `findOverdueRequestIds()` を呼び出す
**THEN** 申請 A の requestId のみが返され、重複なし

---

## cron エンドポイント認証

### TC-020: 正しい CRON_SECRET で認証成功

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: cron エンドポイント認証 > Scenario: 正しい CRON_SECRET で認証成功

### TC-021: 不正なトークン（長さ一致）で 401 が返される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: cron エンドポイント認証 > Scenario: 不正なトークンで 401 が返される

### TC-022: トークン長不一致で 401 が返される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: cron エンドポイント認証 > Scenario: トークン長不一致で 401 が返される

### TC-023: CRON_SECRET 未設定で 401 が返される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: cron エンドポイント認証 > Scenario: CRON_SECRET 未設定で 401 が返される

### TC-024: Authorization ヘッダーなしで 401 が返される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** 環境変数 `CRON_SECRET` が設定されている
**WHEN** `Authorization` ヘッダーなしで `/api/cron/expire-requests` に POST リクエストを送信する
**THEN** 401 Unauthorized が返される

---

## createRequest での deadline 算出

### TC-025: deadlineHours 付きテンプレートから申請を作成すると deadline が算出される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createRequest での deadline 算出 > Scenario: deadlineHours 付きテンプレートから申請を作成する

### TC-026: deadlineHours なしのテンプレートから申請を作成すると deadline が null になる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: createRequest での deadline 算出 > Scenario: deadlineHours なしのテンプレートから申請を作成する

---

## UI 表示

### TC-027: 期限内のステップに残り時間が表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 承認ステップの残り時間表示 > Scenario: 期限内のステップに残り時間を表示する

### TC-028: 期限切れのステップに「期限切れ」が表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 承認ステップの残り時間表示 > Scenario: 期限切れのステップに「期限切れ」を表示する

### TC-029: deadline が null のステップに期限表示がない

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 承認ステップの残り時間表示 > Scenario: deadline が null のステップには期限表示なし

### TC-030: expired ステータスのラベルとスタイルが正しく表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** 申請のステータスが `expired` である
**WHEN** 申請詳細画面を表示する
**THEN** ステータスラベルが「期限切れ」と表示され、スタイルが `bg-gray-100 text-gray-500` で適用される

---

## シードデータ・環境変数

### TC-031: .env.example に SYSTEM_USER_ID と CRON_SECRET が記載されている

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** リポジトリのルートに `.env.example` が存在する
**WHEN** ファイルの内容を確認する
**THEN** `SYSTEM_USER_ID` と `CRON_SECRET` のキーが記載されている

---

## ビルド・型チェック

### TC-032: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** 全変更がコミットされた状態のコードベース
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーなく成功し、`typecheck` も green になる

---

## Result

```yaml
result: completed
total: 32
automated: 26
manual: 6
must: 19
should: 13
could: 0
blocked_reasons: []
```
