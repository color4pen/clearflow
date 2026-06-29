# ユーザーの無効化・再有効化

## Meta

- **type**: new-feature
- **slug**: user-deactivation
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存パターン（repository・usecase・Server Action・canPerform・recordAudit・差分マイグレーション）に沿ってソフト無効化を1本足すだけで、新しい port/adapter や設計選択は無いため false -->

## 背景

管理者がユーザーを無効化（アカウント停止）する手段が無く、退職者等のアクセスを止められない。ユーザー作成（別リクエストで実装済み）の対になる「無効化／再有効化」を追加する。物理削除は監査ログ（actorId 参照）や履歴整合を壊すため避け、ソフト無効化（`deactivated_at`）とする。

## 現状コードの前提

- src/infrastructure/schema.ts users — 無効/停止を表すカラムが無い（`deactivated_at` 等の追加が必要）
- src/infrastructure/repositories/userRepository.ts:55 `findByEmailForAuth(email)` — email のみで検索し UserWithPassword を返す。無効ユーザーの除外条件は無い
- src/infrastructure/auth.ts:37 authorize は `findByEmailForAuth` ＋ `bcrypt.compare` で認証
- src/application/usecases/updateUserRole.ts — 「組織で最後の admin を降格不可」ガードあり（findByOrganization で他 admin 数を数える）。無効化でも同様のロックアウト懸念
- src/domain/authorization.ts organization — listUsers / createUser / changeRole / updateOrganization 等。`deactivateUser` は未定義
- src/domain/models/auditLog.ts AuditAction — user.create / user.updateRole / user.updatePassword。`user.deactivate` / `user.reactivate` は未定義
- src/app/(dashboard)/settings/users/ — ユーザー一覧＋ロール変更＋作成（既存）

## 要件

1. schema に `users.deactivated_at`（timestamp, nullable, null=有効）を追加し、`bun run db:generate` で差分マイグレーションを生成する（既存行は null=有効。デフォルト backfill 不要・既存データに触れない）。User モデルに `deactivatedAt` を反映する
2. userRepository に無効化/再有効化の更新メソッドを追加する（deactivated_at を now / null に設定。WHERE は (id, organizationId) で絞る）
3. **認証ゲート**: 無効化済みユーザーは認証できないようにする（`findByEmailForAuth` を `deactivated_at IS NULL` で絞る、または auth.authorize で deactivated_at を判定して拒否する）
4. `deactivateUser` usecase: `{ actorId, targetUserId, organizationId }` — 自分自身は不可、組織で最後の admin の無効化は不可（updateUserRole のロックアウトガードと同条件）。deactivated_at=now に設定し、`recordAudit({ action: "user.deactivate", targetType: "user", targetId, actorId, organizationId })`
5. `reactivateUser` usecase: deactivated_at=null に設定し、`recordAudit({ action: "user.reactivate", ... })`
6. `src/domain/models/auditLog.ts` の AuditAction に `"user.deactivate"` / `"user.reactivate"` を追加する
7. `src/domain/authorization.ts` organization に `deactivateUser: ADMIN_ONLY` を追加する（再有効化も同権限で判定）
8. `src/app/actions/users.ts` に `deactivateUserAction` / `reactivateUserAction` を追加する（auth 認証、canPerform 認可、organizationId/actorId は session 由来）
9. settings/users に有効/無効の状態表示と無効化・再有効化の操作を追加する

## スコープ外

- ユーザーの物理削除
- 無効化ユーザーの高度なフィルタ・一括操作
- 既存セッションの即時失効（次回認証から遮断。発行済み JWT の即時 revoke は対象外）

## 受け入れ基準

- [ ] 管理者がユーザーを無効化・再有効化でき、自組織のみに作用することをテストで固定する
- [ ] 無効化済みユーザーが認証（login）できないことをテストで固定する
- [ ] 自分自身・組織で最後の admin は無効化できないことをテストで固定する
- [ ] admin 以外（manager/finance/member）は無効化/再有効化できないことをテストで固定する
- [ ] `user.deactivate` / `user.reactivate` 監査ログが記録されることをテストで固定する
- [ ] 差分マイグレーションが `deactivated_at` 追加のみ（テーブル/他カラム変更を含まない）であり `drizzle-kit check` が通る
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **ソフト無効化（deactivated_at nullable）** — 物理削除は監査ログの actorId 参照や履歴整合を壊すため避ける。nullable timestamp で null=有効とし、既存行は backfill 不要・データ不可侵。timestamp により無効化日時も残る。
2. **認証ゲートは認証経路で強制** — 表示・操作の抑止だけでなく、無効化済みは login 自体を不可にする（findByEmailForAuth の絞り込み or authorize の判定）。
3. **ロックアウト防止を無効化にも適用** — 組織で最後の admin の無効化・自己無効化を防ぐ（updateUserRole と同じ不変条件を共有）。
4. **既存セッションの即時失効は対象外** — JWT セッションの即時 revoke は別途。最小構成として次回認証からの遮断とする。
