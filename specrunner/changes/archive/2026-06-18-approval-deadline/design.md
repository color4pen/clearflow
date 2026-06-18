# Design: approval-deadline

## Context

承認ステップに期限がないため、承認者が不在の場合に申請が無期限に滞留する。現在の `RequestStatus` は `draft | pending | approved | rejected | revision` の5状態で、`pending` から抜け出すには人間の操作（承認・却下）が必須である。

承認テンプレート (`approval_templates.steps` jsonb) はステップごとの `stepOrder` と `approverRole` のみを保持し、時間制約の概念がない。`approval_steps` テーブルにも期限カラムは存在しない。

`audit_logs.actorId` は `users.id` への NOT NULL FK であり、システム起因の操作を記録するには実在するユーザー行が必要である。

## Goals / Non-Goals

**Goals**:

- `RequestStatus` に `expired` 終端状態を追加し、期限切れ申請への操作を状態遷移ルールで一律拒否する
- `approval_steps` に `deadline` カラムを追加し、ステップ単位の期限を管理する
- `approveRequest` / `rejectRequest` 実行時に期限チェックを行い、期限切れステップへの操作を拒否する
- 外部 cron から呼び出し可能な `/api/cron/expire-requests` Route Handler を提供し、期限切れ申請の一括 expired 遷移を行う
- 申請詳細画面に承認ステップの残り時間を表示する

**Non-Goals**:

- 代理承認
- 期限切れ時のメール / Slack 通知
- 期限の延長機能
- 自動エスカレーション

## Decisions

### D1: `expired` を `RequestStatus` の終端状態として追加

**選択**: `RequestStatus` に `"expired"` を追加し、`pending → expired` の遷移を許可。`expired` からの遷移は不可（終端状態）。

**理由**: 終端状態にすることで、期限切れ申請への承認・却下操作を `validateTransition` の既存メカニズムで一律拒否できる。usecase ごとに期限切れフラグを個別チェックする必要がない。

**却下した代替案**: `pending` のまま `isExpired` フラグを付与する方式 — 各 usecase でフラグチェックが必要になり、漏れのリスクがある。状態遷移図が複雑化する。

### D2: `deadline` を `approval_steps` テーブルのカラムとして管理

**選択**: `approval_steps` に `deadline timestamp` (nullable) カラムを追加。テンプレートの `deadlineHours` は申請作成時の算出元として使い、具体的な datetime を steps テーブルに保持する。

**理由**: バッチ処理で `WHERE deadline < NOW() AND status = 'pending'` のような単純なクエリで期限切れステップを取得できる。計算不要でインデックスも効く。

**却下した代替案**: `deadlineHours` のみを保持し毎回計算する方式 — 申請の `createdAt` とのジョインが必要で、クエリが複雑化する。

### D3: 期限チェックを `approveRequest` / `rejectRequest` に組み込む

**選択**: 各 usecase で現在のステップの `deadline` を確認し、期限超過時は `{ ok: false, reason: "この承認ステップの期限が切れています" }` を返す。トランザクション内でも再チェックする（TOCTOU 防止）。

**理由**: ユーザー操作の即時フィードバックとして、cron 実行を待たずに期限切れを検知する。既存の pre-check / TX 内 re-check パターンと一貫性がある。

**代替案なし**: 要件で明示されている。

### D4: cron エンドポイントを Route Handler + Bearer トークンで実装

**選択**: `/api/cron/expire-requests` POST Route Handler。認証は `Authorization: Bearer <CRON_SECRET>` ヘッダーで行う。トークン比較に `crypto.timingSafeEqual` を使用。トークン長不一致時は `timingSafeEqual` の前に長さチェックで 401 を返す（`RangeError` 回避）。

**理由**: 外部 cron サービス（Vercel Cron, Railway Cron 等）からの定期呼び出しに対応。`timingSafeEqual` でタイミング攻撃を防止する。

**却下した代替案**: 内部 cron ライブラリ — サーバレス環境では動作しない。

### D5: system user をシードで作成し、cron 操作の actorId に使用

**選択**: シードスクリプトで固定 UUID の system user を作成する（name: "System", email: "system@clearflow.internal", デフォルト組織所属）。環境変数 `SYSTEM_USER_ID` にその UUID を設定し、`expireOverdueRequests` が `actorId` として使用する。

**理由**: `audit_logs.actorId` が NOT NULL FK であるため、実在するユーザー行が必要。nullable にすると既存の不変条件を破壊する。

**却下した代替案**: `actorId` を nullable にする — 既存の監査ログ不変条件を破壊し、全クエリに null チェックが必要になる。

### D6: `expireOverdueRequests` のトランザクション戦略は 1 申請 = 1 トランザクション

**選択**: 期限切れ対象の各申請を個別のトランザクションで処理する。失敗した申請はスキップし、成功・失敗の件数を結果として返す。

**理由**: 1 申請の失敗が他の申請の期限切れ処理をブロックしない。各申請は独立しているため、部分的な処理完了で問題ない。

**却下した代替案**: 全申請を 1 トランザクション — 1 件の失敗で全件ロールバックされ、次回 cron まで残りの申請が滞留する。

## Risks / Trade-offs

- **[Risk] cron 実行間隔のギャップ** → 期限切れから次の cron 実行までの間に、ユーザーが期限切れステップに操作を試みる可能性がある。usecase 内の deadline チェックで即時に拒否するため、実害はない。
- **[Risk] `SYSTEM_USER_ID` / `CRON_SECRET` 未設定** → `expireOverdueRequests` は `SYSTEM_USER_ID` 未設定時にエラーを返す。cron Route Handler は `CRON_SECRET` 未設定時に 401 を返す。起動時クラッシュではなく、呼び出し時のエラーとして処理する。
- **[Trade-off] deadline nullable** → `deadlineHours` が未設定のテンプレートステップから作成された承認ステップは deadline が null になる。null の場合は期限なし（従来動作）として扱う。

## Open Questions

なし（architect 評価済みの設計判断で全主要論点が解決済み）。
