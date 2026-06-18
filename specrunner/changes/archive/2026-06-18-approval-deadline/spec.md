# Spec: approval-deadline

## Requirements

### Requirement: expired 状態遷移ルール

`RequestStatus` に `"expired"` を終端状態として追加し、状態遷移ルールで期限切れ申請への操作を制御する。`pending → expired` の遷移 SHALL be permitted。`expired` からの遷移 SHALL NOT be permitted（終端状態）。

#### Scenario: pending から expired への遷移が許可される

**Given** 申請のステータスが `pending` である
**When** `validateTransition("pending", "expired")` を呼び出す
**Then** `{ ok: true }` が返される

#### Scenario: expired から pending への遷移が拒否される

**Given** 申請のステータスが `expired` である
**When** `validateTransition("expired", "pending")` を呼び出す
**Then** `{ ok: false }` が返され、`reason` に遷移不可を示すメッセージが含まれる

#### Scenario: expired から approved への遷移が拒否される

**Given** 申請のステータスが `expired` である
**When** `validateTransition("expired", "approved")` を呼び出す
**Then** `{ ok: false }` が返される

### Requirement: 期限切れステップへの承認操作を拒否する

`approveRequest` は、現在のステップに deadline が設定されており、かつ現在時刻が deadline を超過している場合、操作を拒否 SHALL する。拒否時のレスポンスは `{ ok: false, reason: "この承認ステップの期限が切れています" }` とする。

#### Scenario: 期限切れステップへの承認が拒否される

**Given** 承認ステップの deadline が現在時刻より過去に設定されている
**When** `approveRequest` を実行する
**Then** `{ ok: false, reason: "この承認ステップの期限が切れています" }` が返される

#### Scenario: 期限内のステップへの承認は通常通り処理される

**Given** 承認ステップの deadline が現在時刻より未来に設定されている
**When** `approveRequest` を実行する
**Then** 承認が正常に処理される

#### Scenario: deadline が null のステップへの承認は通常通り処理される

**Given** 承認ステップの deadline が null である
**When** `approveRequest` を実行する
**Then** 承認が正常に処理される（期限なし = 従来動作）

### Requirement: 期限切れステップへの却下操作を拒否する

`rejectRequest` は、revision パスと rejected パスの両方で、現在のステップに deadline が設定されており、かつ現在時刻が deadline を超過している場合、操作を拒否 SHALL する。

#### Scenario: 期限切れステップへの revision 却下が拒否される

**Given** 承認ステップの deadline が現在時刻より過去に設定されている
**When** `rejectRequest` を `targetStatus: "revision"` で実行する
**Then** `{ ok: false, reason: "この承認ステップの期限が切れています" }` が返される

#### Scenario: 期限切れステップへの rejected 却下が拒否される

**Given** 承認ステップの deadline が現在時刻より過去に設定されている
**When** `rejectRequest` を `targetStatus: "rejected"` で実行する
**Then** `{ ok: false, reason: "この承認ステップの期限が切れています" }` が返される

### Requirement: 期限切れ一括処理

`expireOverdueRequests` usecase SHALL exist。deadline を過ぎた pending ステップを持つ申請を `expired` に遷移させる。各申請は個別のトランザクションで処理 MUST する。audit_logs の actorId には環境変数 `SYSTEM_USER_ID` で指定されたユーザー ID を使用する。`SYSTEM_USER_ID` が未設定の場合、処理を中断してエラーを返す MUST。

#### Scenario: 期限切れの申請が expired に遷移する

**Given** `approval_steps` に deadline が過去のレコードが存在し、対応する申請のステータスが `pending` である
**When** `expireOverdueRequests` を実行する
**Then** 対応する申請のステータスが `expired` に更新され、audit_logs に `request.expire` アクションが記録される

#### Scenario: SYSTEM_USER_ID 未設定時にエラーを返す

**Given** 環境変数 `SYSTEM_USER_ID` が未設定である
**When** `expireOverdueRequests` を実行する
**Then** エラーが返され、期限切れ処理は実行されない

#### Scenario: 1 申請の失敗が他の申請の処理をブロックしない

**Given** 期限切れ対象の申請が複数存在し、うち 1 件は楽観ロックで失敗する
**When** `expireOverdueRequests` を実行する
**Then** 失敗した 1 件をスキップし、他の申請は正常に expired に遷移する

### Requirement: cron エンドポイント認証

`/api/cron/expire-requests` Route Handler SHALL authenticate requests using `Authorization: Bearer <CRON_SECRET>` header。トークン比較に `crypto.timingSafeEqual` を使用 MUST する。トークン長不一致時は `timingSafeEqual` の前に長さチェックで 401 を返す MUST。

#### Scenario: 正しい CRON_SECRET で認証成功

**Given** 環境変数 `CRON_SECRET` が設定されている
**When** `Authorization: Bearer <正しいトークン>` ヘッダー付きでリクエストを送信する
**Then** `expireOverdueRequests` が実行され、結果がレスポンスとして返される

#### Scenario: 不正なトークンで 401 が返される

**Given** 環境変数 `CRON_SECRET` が設定されている
**When** `Authorization: Bearer <不正なトークン>` ヘッダー付きでリクエストを送信する（長さは一致）
**Then** 401 Unauthorized が返される

#### Scenario: トークン長不一致で 401 が返される

**Given** 環境変数 `CRON_SECRET` が設定されている
**When** `Authorization: Bearer <長さの異なるトークン>` ヘッダー付きでリクエストを送信する
**Then** `timingSafeEqual` を呼び出さずに 401 Unauthorized が返される

#### Scenario: CRON_SECRET 未設定で 401 が返される

**Given** 環境変数 `CRON_SECRET` が未設定である
**When** リクエストを送信する
**Then** 401 Unauthorized が返される

### Requirement: createRequest での deadline 算出

申請作成時、テンプレートステップに `deadlineHours` が設定されている場合、`createdAt + deadlineHours` で deadline を算出し `approval_steps` に設定 SHALL する。`deadlineHours` が未設定の場合、deadline は null とする。

#### Scenario: deadlineHours 付きテンプレートから申請を作成する

**Given** 承認テンプレートのステップに `deadlineHours: 72` が設定されている
**When** `createRequest` を実行する
**Then** 作成された `approval_steps` の `deadline` が申請作成時刻 + 72 時間に設定される

#### Scenario: deadlineHours なしのテンプレートから申請を作成する

**Given** 承認テンプレートのステップに `deadlineHours` が設定されていない
**When** `createRequest` を実行する
**Then** 作成された `approval_steps` の `deadline` は null である

### Requirement: 承認ステップの残り時間表示

申請詳細画面の承認ステップセクションにおいて、deadline が設定されているステップ SHALL display remaining time。期限切れの場合は「期限切れ」と表示する。

#### Scenario: 期限内のステップに残り時間を表示する

**Given** 承認ステップの deadline が現在時刻より未来に設定されている
**When** 申請詳細画面を表示する
**Then** 承認ステップに残り時間が表示される

#### Scenario: 期限切れのステップに「期限切れ」を表示する

**Given** 承認ステップの deadline が現在時刻より過去に設定されている
**When** 申請詳細画面を表示する
**Then** 承認ステップに「期限切れ」と表示される

#### Scenario: deadline が null のステップには期限表示なし

**Given** 承認ステップの deadline が null である
**When** 申請詳細画面を表示する
**Then** 承認ステップに期限に関する表示はない
