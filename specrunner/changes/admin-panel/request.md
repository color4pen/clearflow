# 管理画面（テンプレートCRUD・ユーザー管理）

## Meta

- **type**: new-feature
- **slug**: admin-panel
- **base-branch**: main
- **adr**: false

## 背景

承認テンプレートとユーザーの管理がシードデータに依存しており、アプリケーション上で変更できない。admin ロールのユーザーが承認テンプレートの作成・編集・削除とユーザーのロール変更を行える管理画面を導入する。

## 現状コードの前提

- `src/infrastructure/repositories/approvalTemplateRepository.ts:18,55` — `findByOrganization` と `findByOrganizationForAmount` のみ。create / update / delete なし
- `src/infrastructure/repositories/userRepository.ts` — `findByEmailForAuth`, `findById` のみ。一覧取得やロール更新なし
- `src/app/(dashboard)/settings/webhooks/` — Webhook 管理画面が既にある。admin ロールチェックのパターンが確立済み
- `src/infrastructure/schema.ts:110-120` — `approval_templates` テーブルに name, organizationId, steps (jsonb), minAmount, maxAmount, createdAt がある
- `src/domain/models/user.ts:1` — `Role = "admin" | "member" | "manager" | "finance"`

## 要件

1. **approvalTemplateRepository の CRUD 拡張**: `create(data, tx?)`, `updateById(id, organizationId, data)`, `deleteById(id, organizationId)` を追加する。削除時は該当テンプレートを使用中の pending 申請がないことを確認する
2. **userRepository の拡張**: `findByOrganization(organizationId)` — 組織のユーザー一覧取得。`updateRole(id, organizationId, role)` — ユーザーのロール変更
3. **テンプレート管理 Server Actions**: `createTemplateAction`, `updateTemplateAction`, `deleteTemplateAction` を `src/app/actions/templates.ts` に追加。admin ロールのみ実行可能。zod バリデーション適用
4. **ユーザー管理 Server Actions**: `listUsersAction`, `updateUserRoleAction` を `src/app/actions/users.ts` に追加。admin ロールのみ実行可能。自分自身のロールは変更できない
5. **テンプレート管理 UI**: `/settings/templates` に一覧・作成・編集ページ。テンプレート名、金額条件（minAmount/maxAmount）、承認ステップ（approverRole + deadlineHours の配列）を設定できるフォーム
6. **ユーザー管理 UI**: `/settings/users` にユーザー一覧ページ。各ユーザーのロールをドロップダウンで変更可能
7. **設定ナビゲーション**: `/settings` レイアウトに Webhook / テンプレート / ユーザー / 監査ログのナビゲーションを追加する
8. **テナント分離**: 全クエリに organizationId 条件を付与する。ユーザー一覧は自組織のみ表示
9. **監査ログ**: テンプレートの作成・編集・削除、ユーザーのロール変更を audit_logs に記録する

## スコープ外

- ユーザーの招待・作成機能
- ユーザーの削除機能
- テンプレートのバージョン管理
- ロールの動的定義（固定4ロール）

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] テンプレートの作成・編集・削除が admin ロールのみ実行可能
- [ ] pending 申請で使用中のテンプレートが削除拒否されることをテストで確認する
- [ ] ユーザーのロール変更が admin ロールのみ実行可能
- [ ] 自分自身のロール変更が拒否されることをテストで確認する
- [ ] テンプレート・ユーザー管理のクエリに organizationId 条件が付与されている
- [ ] テンプレート操作・ロール変更が audit_logs に記録される
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **テンプレート削除前に使用中チェックを採用、論理削除方式を却下** — 論理削除は isDeleted フラグの管理が全クエリに影響する。使用中チェック + 物理削除の方がシンプル
2. **ユーザーのロール変更を直接更新方式で採用、申請ベース方式を却下** — admin が直接ロールを変更できる。承認フローでロール変更を管理するのは過剰
3. **自分自身のロール変更を禁止** — admin が自分のロールを member に変更すると管理者がいなくなるリスクがある
