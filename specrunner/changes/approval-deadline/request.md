# 承認期限

## Meta

- **type**: new-feature
- **slug**: approval-deadline
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 承認フローへの時間制約導入、expired 終端状態追加 → true -->

## 背景

承認ステップに期限がないため、承認者が不在の場合に申請が無期限に滞留する。承認期限（deadline）を導入し、期限切れ申請を自動で expired 状態に遷移させる。

## 現状コードの前提

- `src/infrastructure/schema.ts:83-107` — `approval_steps` テーブルに deadline カラムなし
- `src/domain/models/approvalStep.ts:1-14` — `ApprovalStep` 型に deadline フィールドなし
- `src/infrastructure/schema.ts:110-120` — `approval_templates` の steps jsonb に deadline 設定なし
- `src/domain/models/approvalTemplate.ts:1-5` — `ApprovalTemplateStep` に `deadlineHours` なし
- `src/domain/models/request.ts:1` — `RequestStatus` に `"expired"` なし
- `src/application/usecases/approveRequest.ts` — 期限チェックなし
- `src/application/usecases/rejectRequest.ts` — 期限チェックなし

## 要件

1. **RequestStatus に expired 追加**: `"expired"` を終端状態として追加。遷移ルール: `pending → expired`。expired からの遷移は不可
2. **approval_steps に deadline カラム追加**: `deadline timestamp` (nullable)。承認テンプレートの steps jsonb に `deadlineHours: number` (省略可) を追加し、申請作成時に `createdAt + deadlineHours` で deadline を算出する
3. **期限チェックロジック**: `approveRequest` と `rejectRequest`（revision/rejected 両パス）の実行時に、現在のステップの deadline を確認する。deadline を過ぎている場合は操作を拒否し `{ ok: false, reason: "この承認ステップの期限が切れています" }` を返す。トランザクション内でも TOCTOU 防止のため再チェックする
4. **期限切れ一括処理**: `expireOverdueRequests` usecase を新設する。deadline を過ぎた pending ステップを持つ申請を `expired` に変更する。audit_logs の actorId にはシードで作成する system user の ID（環境変数 `SYSTEM_USER_ID`）を使用する。`SYSTEM_USER_ID` 未設定時は処理を中断してエラーを返す
5. **cron エンドポイント**: `/api/cron/expire-requests` Route Handler を追加する。認証は `Authorization: Bearer <CRON_SECRET>` で行う。比較には `crypto.timingSafeEqual` を使用する。トークン長不一致時は `timingSafeEqual` の前に長さチェックで 401 を返す
6. **ApprovalTemplateStep 更新**: `deadlineHours?: number` を追加
7. **createRequest の deadline 算出**: テンプレートステップに `deadlineHours` がある場合、`createdAt + deadlineHours` で deadline を算出して approval_steps に設定する
8. **UI更新**: 承認ステップに deadline がある場合、残り時間を表示する。期限切れは「期限切れ」と表示する
9. **シードデータ更新**: 高額テンプレートの各ステップに `deadlineHours: 72` を設定する。system user を1件追加する（固定 UUID、name: "System"、email: "system@clearflow.internal"、デフォルト組織所属）。`.env.example` に `SYSTEM_USER_ID` と `CRON_SECRET` を追記する

## スコープ外

- 代理承認（次の request で対応）
- 期限切れ時のメール/Slack通知
- 期限の延長機能
- 自動エスカレーション

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `approval_steps` テーブルに `deadline` カラムが存在する
- [ ] `RequestStatus` に `"expired"` が含まれる
- [ ] 状態遷移テスト: `pending → expired` が許可される
- [ ] 状態遷移テスト: `expired → pending` が拒否される
- [ ] 期限切れステップへの承認操作が拒否されることをテストで確認する
- [ ] 期限切れステップへの却下操作（revision / rejected 両パス）が拒否されることをテストで確認する
- [ ] `/api/cron/expire-requests` が `CRON_SECRET` 認証付きで動作する
- [ ] `CRON_SECRET` のトークン長不一致時に 401 が返される
- [ ] `.env.example` に `SYSTEM_USER_ID` と `CRON_SECRET` が記載されている
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **expired を終端状態として追加を採用、pending のまま期限切れフラグ方式を却下** — 終端状態にすることで、期限切れ申請への操作を状態遷移ルールで一律拒否できる
2. **deadline を approval_steps カラムで管理を採用** — テンプレートの deadlineHours は生成時の計算元。steps テーブルに具体的な datetime を保持する
3. **cron エンドポイントを Route Handler + API キーで実装** — 外部 cron サービスから定期呼び出し。`crypto.timingSafeEqual` でタイミング攻撃を防止。長さ不一致は `timingSafeEqual` の前にチェックして `RangeError` を回避する
4. **system user をシードで作成を採用、nullable actorId を却下** — audit_logs の actorId は NOT NULL FK。system user を作成して cron 操作の実行者とする
