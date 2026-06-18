# 承認期限と代理承認

## Meta

- **type**: new-feature
- **slug**: deadline-delegation
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 承認フローへの時間制約導入、代理承認の権限モデル拡張 → true -->

## 背景

承認ステップに期限がないため、承認者が不在の場合に申請が無期限に滞留する。また、承認者が休暇中に他のユーザーが代わりに承認する仕組みがない。

本 request で承認期限（deadline）と代理承認（delegation）を導入し、承認フローの運用性を高める。

## 現状コードの前提

- `src/infrastructure/schema.ts:83-107` — `approval_steps` テーブルに deadline / delegation 関連カラムなし
- `src/domain/models/approvalStep.ts:1-14` — `ApprovalStep` 型に deadline / delegatedTo フィールドなし
- `src/domain/services/approvalStepService.ts:33-34` — `canApprove` は `step.approverRole === actorRole` で判定。代理承認の考慮なし
- `src/infrastructure/schema.ts:110-120` — `approval_templates` の steps jsonb に deadline 設定なし
- `src/application/usecases/approveRequest.ts` — 期限チェックなし
- `src/infrastructure/schema.ts:14` — `roleEnum` は `["admin", "member", "manager", "finance"]` の4値
- `src/domain/models/request.ts:1` — `RequestStatus` に `"expired"` なし

## 要件

1. **approval_steps に deadline カラム追加**: `deadline timestamp` (nullable) を追加。承認テンプレートの steps jsonb に `deadlineHours: number` (省略可) を追加し、申請作成時に `createdAt + deadlineHours` で deadline を算出する
2. **RequestStatus に expired 追加**: `"expired"` を終端状態として追加。遷移ルール: `pending → expired`。expired からの遷移は不可
3. **期限チェックロジック**: `approveRequest` と `rejectRequest` の実行時に、現在のステップの deadline を確認する。deadline を過ぎている場合は操作を拒否し `{ ok: false, reason: "この承認ステップの期限が切れています" }` を返す
4. **期限切れ一括処理**: `expireOverdueRequests` usecase を新設する。deadline を過ぎた pending ステップを持つ申請を検索し、ステータスを `expired` に変更する。Route Handler `/api/cron/expire-requests` で呼び出す（外部 cron から定期実行する想定）。認証は API キー（環境変数 `CRON_SECRET`）で行う
5. **代理承認テーブル追加**: `approval_delegations` テーブルを新設する。カラム: id (uuid), fromUserId (FK to users), toUserId (FK to users), organizationId (FK), startDate (timestamp), endDate (timestamp), isActive (boolean, default true), createdAt。ある期間、特定ユーザーの承認権限を別のユーザーに委譲する
6. **canApprove の拡張**: `approvalStepService.canApprove` を拡張する。直接のロール一致に加え、`approval_delegations` を参照し、アクティブな委譲が存在する場合は委譲先ユーザーも承認可能とする。委譲元のロールが step の approverRole と一致することを確認する
7. **代理承認の監査ログ**: 代理承認で操作した場合、audit_logs の metadata に `{ delegatedFrom: userId }` を記録する
8. **代理承認管理 UI**: admin ロールのユーザーが代理承認の設定（委譲元→委譲先、期間）を管理できるページを追加する
9. **申請詳細画面の期限表示**: 承認ステップに deadline がある場合、残り時間を表示する。期限切れの場合は「期限切れ」と表示する
10. **シードデータ更新**: 承認テンプレートの高額テンプレートに deadlineHours: 72（3日）を設定する。代理承認の設定を1件追加する

## スコープ外

- 期限切れ時のメール/Slack通知
- 期限の延長機能
- 自動エスカレーション（期限切れ時に上位承認者へ自動転送）
- 代理承認の承認チェーン（代理の代理）

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `approval_steps` テーブルに `deadline` カラムが存在する
- [ ] `approval_delegations` テーブルが schema.ts に定義されている
- [ ] `RequestStatus` に `"expired"` が含まれる
- [ ] 状態遷移テスト: `pending → expired` が許可される
- [ ] 状態遷移テスト: `expired → pending` が拒否される
- [ ] 期限切れステップへの承認操作が拒否されることをテストで確認する
- [ ] `/api/cron/expire-requests` が `CRON_SECRET` 認証付きで動作する
- [ ] 代理承認: 委譲先ユーザーが委譲元のロールで承認できることをテストで確認する
- [ ] 代理承認: 委譲期間外のユーザーが承認できないことをテストで確認する
- [ ] 代理承認時の audit_logs に `delegatedFrom` が記録されることをテストで確認する
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **deadline を approval_steps カラムで管理を採用、テンプレートの deadlineHours のみ方式を却下** — テンプレートに deadlineHours を持たせるだけだと、申請作成後にステップごとの実際の期限を算出できない。steps テーブルに deadline（具体的な datetime）を保持し、テンプレートの deadlineHours は生成時の計算元として使う
2. **expired を終端状態として追加を採用、pending のまま期限切れフラグ方式を却下** — 終端状態にすることで、期限切れ申請への操作を状態遷移ルールで一律拒否できる。フラグ方式だと各 usecase で個別にチェックが必要
3. **代理承認を専用テーブルで管理を採用、ロールの一時付与方式を却下** — ロールを一時的に変更すると、期間終了時のロールバックが必要で複雑。専用テーブルで委譲関係を管理し、canApprove で参照する方がシンプルで監査可能
4. **cron エンドポイントを Route Handler + API キーで実装を採用** — 外部 cron サービス（GitHub Actions、Vercel Cron 等）から定期呼び出しする。認証は環境変数 CRON_SECRET との一致で行う。Next.js の Route Handler で実装しシンプルに保つ
