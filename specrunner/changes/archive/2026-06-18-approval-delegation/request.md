# 代理承認

## Meta

- **type**: new-feature
- **slug**: approval-delegation
- **base-branch**: main
- **adr**: true

## 背景

承認者が休暇中や不在の場合に、他のユーザーが代わりに承認する仕組みがない。代理承認（delegation）を導入し、一定期間の承認権限の委譲を可能にする。

## 現状コードの前提

- `src/domain/services/approvalStepService.ts:33-34` — `canApprove` は `step.approverRole === actorRole` で単純比較。代理承認の考慮なし
- `src/domain/models/user.ts:1` — `Role = "admin" | "member" | "manager" | "finance"` の4値
- `src/infrastructure/schema.ts` — `approval_delegations` テーブルは存在しない
- `src/application/usecases/approveRequest.ts` — `canApprove(currentStep, data.actorRole)` で判定。委譲データの参照なし

## 要件

1. **approval_delegations テーブル追加**: カラム: id (uuid), fromUserId (FK to users), toUserId (FK to users), organizationId (FK), startDate (timestamp), endDate (timestamp), isActive (boolean, default true), createdAt。`fromUserId` と `toUserId` は同一 organizationId に属さなければならない（クロスオーグ委譲の禁止）
2. **ApprovalDelegation ドメインモデル追加**: `src/domain/models/approvalDelegation.ts` に型定義。フィールド: id, fromUserId, toUserId, fromUserRole (string — repository が users テーブルと JOIN して取得), organizationId, startDate, endDate, isActive, createdAt
3. **approvalDelegationRepository 追加**: `findActiveByToUserId(toUserId, organizationId, now, tx?)` — users テーブルと JOIN して `fromUserRole` を含む `ApprovalDelegation[]` を返す。`findByOrganization(organizationId)` — 管理画面用。`findOverlapping(fromUserId, toUserId, organizationId, startDate, endDate)` — 重複委譲チェック。`create(data, tx?)` / `update(id, organizationId, data)`
4. **canApprove の拡張**: `approvalStepService.canApprove` を拡張する。引数に `delegations: ApprovalDelegation[]` を追加する。直接のロール一致に加え、アクティブな委譲の中で委譲元のロールが step の approverRole と一致する場合は承認可能とする。複数委譲がマッチする場合は startDate が最も新しいものを採用する
5. **usecase の統合**: `approveRequest` でトランザクション内で `approvalDelegationRepository.findActiveByToUserId` を呼び出し、最新の委譲データで `canApprove` を判定する（TOCTOU 防止）。`rejectRequest` には canApprove チェックを追加しない（却下は現在ロールチェックなしで動作しているため、スコープを維持する）
6. **createDelegation usecase 新設**: 入力: fromUserId, toUserId, organizationId, startDate, endDate。バリデーション（自己委譲禁止、クロスオーグ禁止、期間重複チェック）は usecase 層で実行する。成功時に audit_logs に記録する
7. **deactivateDelegation usecase 新設**: 入力: delegationId, organizationId。isActive を false に更新する。audit_logs に記録する
8. **代理承認の監査ログ**: 代理承認で操作した場合、audit_logs の metadata に `{ delegatedFrom: userId }` を記録する。通常承認では記録しない。「最新を採用する」は監査ログに記録する委譲を1件特定するため（最新 startDate の委譲を使用する）
9. **重複委譲の禁止**: 同一 fromUser→toUser に対して期間が重複するアクティブな委譲を作成できない
10. **自己委譲の禁止**: `fromUserId === toUserId` の委譲を拒否する
11. **代理承認管理 UI**: admin ロールのユーザーが委譲の設定（委譲元→委譲先、期間）を管理できるページ。追加・無効化が可能。`/settings/delegations` に配置。Server Actions: `createDelegationAction`, `deactivateDelegationAction`, `listDelegationsAction`
12. **インデックス追加**: `approval_delegations` テーブルに `(to_user_id, organization_id, is_active)` の複合インデックスを追加
13. **シードデータ**: manager ユーザーから admin ユーザーへの委譲を1件追加（startDate: 本日、endDate: 7日後）。seed.ts のテーブル削除順に `approval_delegations` を `users` より先に追加する

## スコープ外

- 代理承認の承認チェーン（代理の代理）
- 委譲の自動期限切れ処理（endDate 過ぎたら isActive=false）
- 委譲通知

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `approval_delegations` テーブルが schema.ts に定義されている
- [ ] 代理承認: 委譲先ユーザーが委譲元のロールで承認できることをテストで確認する
- [ ] 代理承認: 委譲期間外のユーザーが承認できないことをテストで確認する
- [ ] 代理承認: クロスオーグ委譲が拒否されることをテストで確認する
- [ ] 代理承認: 自己委譲が拒否されることをテストで確認する
- [ ] 代理承認: 期間重複する委譲の作成が拒否されることをテストで確認する
- [ ] 代理承認時の audit_logs に `delegatedFrom` が記録されることをテストで確認する
- [ ] usecase 内で委譲データをトランザクション内で取得していること（TOCTOU 防止）
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **代理承認を専用テーブルで管理を採用、ロールの一時付与方式を却下** — ロールを一時変更すると期間終了時のロールバックが必要で複雑。専用テーブルで委譲関係を管理し canApprove で参照する
2. **トランザクション内で委譲データを取得を採用、pre-TX スナップショット方式を却下** — 承認操作中に委譲が無効化された場合の一貫性を保証するため、TX 内で最新データを参照する
3. **canApprove に delegations 引数を追加する方式を採用** — canApprove を純粋関数として維持し、delegations の取得は usecase が責任を持つ。domain service が repository を呼ばない原則を維持する
