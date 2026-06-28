# Spec: 案件の watch とアクティビティ通知（監査ログから派生）

## Requirements

### Requirement: ユーザーは案件を watch/unwatch できる

ユーザーは案件詳細ページのヘッダーから watch トグルで案件を watch/unwatch できる。watch レコードは `watches` テーブルに保存され、同一ユーザー・同一案件の重複は `(user_id, deal_id)` ユニーク制約で防止される。全クエリに `organizationId` 条件が付与される（テナント分離）。watch の追加は MUST `organizationId` を検証すること。

#### Scenario: 未 watch の案件を watch する

**Given** ユーザー A が案件 X を watch していない
**When** ユーザー A が案件 X の watch トグルをクリックする
**Then** `watches` テーブルにユーザー A・案件 X のレコードが作成され、トグルが watch 状態を示す

#### Scenario: watch 中の案件を unwatch する

**Given** ユーザー A が案件 X を watch している
**When** ユーザー A が案件 X の watch トグルをクリックする
**Then** `watches` テーブルからユーザー A・案件 X のレコードが削除され、トグルが未 watch 状態を示す

#### Scenario: 他テナントの watch は見えない

**Given** 組織 Org1 のユーザー A が案件 X を watch している
**When** 組織 Org2 のユーザー B が案件を watch しようとする
**Then** Org2 のクエリに Org1 の watch レコードは含まれない

### Requirement: 案件の作成者は自動的に watch される

案件が作成された時、作成者（actorId）は同一トランザクション内で自動的にその案件の watcher として登録される。自動 watch は明示的な watch レコードとして `watches` テーブルに挿入する。createDeal usecase のトランザクション内で実行する。本処理は MUST 案件作成と同一トランザクション内で行うこと。

#### Scenario: 案件作成時に作成者が自動 watch される

**Given** ユーザー A が案件 X を作成する
**When** createDeal が成功する
**Then** `watches` テーブルにユーザー A・案件 X のレコードが存在する

### Requirement: 案件の担当者変更時に担当者が自動 watch される

案件の担当者（assigneeId）が設定または変更された場合、その担当者は自動的にその案件の watcher として登録される。既に watch 済みの場合は何もしない（冪等）。updateDeal usecase のトランザクション内で実行する。本処理は MUST 案件更新と同一トランザクション内で行うこと。

#### Scenario: 担当者が設定された案件で担当者が自動 watch される

**Given** 案件 X に担当者が未設定
**When** ユーザー B が案件 X の担当者としてユーザー C を設定する
**Then** `watches` テーブルにユーザー C・案件 X のレコードが存在する

#### Scenario: 既に watch 済みの担当者は重複挿入されない

**Given** ユーザー C が案件 X を既に watch している
**When** ユーザー B が案件 X の担当者としてユーザー C を再設定する
**Then** `watches` テーブルにユーザー C・案件 X のレコードは1件のまま

### Requirement: getNotifications は watch 中案件の活動を監査ログから導出する

`getNotifications` usecase は、ログインユーザーが watch 中の案件について通知を導出する。通知レコードは保存しない（都度導出）。対象アクションは `deal.update`, `deal.updatePhase`, `meeting.create`, `action_item.create`, `contract.create` に限定する。本人（actorId = ログインユーザー）の操作は除外する。watch 開始（`watches.created_at`）以降のログに限定する。結果は新しい順。本処理は MUST 通知テーブルを使わず都度導出すること。

#### Scenario: watch 中案件の他者による変更が通知に含まれる

**Given** ユーザー A が案件 X を watch している
**When** ユーザー B が案件 X を更新する（`deal.update`）
**Then** ユーザー A の getNotifications 結果に該当ログが含まれる

#### Scenario: 本人の操作は通知から除外される

**Given** ユーザー A が案件 X を watch している
**When** ユーザー A 自身が案件 X を更新する
**Then** ユーザー A の getNotifications 結果に該当ログは含まれない

#### Scenario: watch 開始前のログは通知に含まれない

**Given** 案件 X で `deal.update` が時刻 T1 に発生した
**When** ユーザー A が時刻 T2（T2 > T1）に案件 X を watch する
**Then** ユーザー A の getNotifications 結果に T1 のログは含まれない

#### Scenario: 通知対象外のアクションは含まれない

**Given** ユーザー A が案件 X を watch している
**When** ユーザー B が案件 X 配下の商談を更新する（`meeting.update`）
**Then** ユーザー A の getNotifications 結果に該当ログは含まれない

#### Scenario: 通知に targetInfoMap が含まれる

**Given** ユーザー A が案件 X を watch している
**When** ユーザー B が案件 X 配下に商談を作成する（`meeting.create`）
**Then** ユーザー A の getNotifications 結果に該当ログと、対応する targetInfoMap（ラベル・リンク）が含まれる

### Requirement: 未読数は notifications_last_seen_at 以降の件数で導出される

未読通知の件数は、ユーザーの `notifications_last_seen_at` 以降に発生した通知（getNotifications の結果）の件数として導出される。`notifications_last_seen_at` が null の場合、watch 開始以降の全ログが未読となる。本処理は MUST `notifications_last_seen_at` を基準として未読を判定すること。

#### Scenario: 初回アクセスで全通知が未読

**Given** ユーザー A の `notifications_last_seen_at` が null
**When** 未読数を取得する
**Then** watch 開始以降の全通知が未読としてカウントされる

#### Scenario: 既読後の新しい通知のみ未読

**Given** ユーザー A が時刻 T1 に「既読にする」を実行済み
**When** 時刻 T2（T2 > T1）にユーザー B が案件 X を更新する
**Then** ユーザー A の未読数は 1 になる

### Requirement: 「既読にする」で notifications_last_seen_at が更新され未読が 0 になる

ユーザーが通知センターの「既読にする」を実行すると、`users.notifications_last_seen_at` が現在時刻に更新される。更新後、未読数は 0 になる。本処理は MUST `notifications_last_seen_at` を現在時刻に更新すること。

#### Scenario: 既読にすると未読が 0 になる

**Given** ユーザー A に未読通知が 3 件ある
**When** ユーザー A が「既読にする」を実行する
**Then** `users.notifications_last_seen_at` が現在時刻に更新され、未読数は 0 になる

### Requirement: 通知は監査ログの env フラグと独立に動作する

通知機能は `ACTIVITY_FEED_ENABLED` 環境変数とは独立に動作する。`ACTIVITY_FEED_ENABLED=false` でも通知は正常に導出される。通知機能は MUST 既存の env フラグに依存しないこと。

#### Scenario: アクティビティフィード無効でも通知は動作する

**Given** `ACTIVITY_FEED_ENABLED=false` が設定されている
**When** ユーザー A の通知を取得する
**Then** watch 中案件の通知が正常に導出される

### Requirement: watch と notification の全クエリにテナント分離条件がある

`watches` テーブルへの全てのクエリ（作成・読み取り・削除）、および `getNotifications` から呼び出される全ての監査ログクエリに `organizationId` 条件が含まれる。テナント分離は MUST 全クエリに適用すること。

#### Scenario: watchRepository の全操作にテナント条件がある

**Given** watchRepository の関数（create, findByUserAndDeal, findByUser, delete）
**When** 各関数が呼び出される
**Then** 全ての SQL クエリに `organization_id` 条件が含まれる
