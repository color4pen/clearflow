# 管理者によるユーザー作成

## Meta

- **type**: new-feature
- **slug**: user-creation
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存パターン（canPerform 認可・repository・Server Action・settings 画面・recordAudit）に沿ってユーザー作成の書き込み経路を1本足すだけで、新しい port/adapter や設計選択は無いため false -->

## 背景

本システムはマルチテナント SaaS だが、ユーザーを作成する手段が seed スクリプトしかなく、アプリ上で組織にユーザーを追加できない（`userRepository` に create が無い）。管理画面（settings/users）は一覧表示とロール変更のみ。内製ツールとして実運用するには、管理者が自組織にユーザーを追加できる必要がある。本リクエストは「管理者によるユーザー作成」を追加する。メール招待・無効化は対象外。

## 現状コードの前提

- src/infrastructure/repositories/userRepository.ts — メソッドは findByOrganization / updateRole / findByEmailForAuth / findById / updateNotificationsLastSeenAt。**create は無い**
- src/infrastructure/schema.ts users — id / email(UNIQUE, NOT NULL) / email_verified / image / hashed_password(NOT NULL) / name(NOT NULL) / organization_id(FK, NOT NULL) / role(NOT NULL, default member) / notifications_last_seen_at / created_at。作成に必要なカラムは全て既存（スキーマ変更不要）
- src/infrastructure/auth.ts:40 ログインは bcryptjs の `bcrypt.compare(password, user.hashedPassword)`。seed.ts:77 は `bcrypt.hash(pw, 12)`。パスワードは bcryptjs でハッシュする
- src/domain/authorization.ts organization エンティティの操作: listUsers(ADMIN_MANAGER) / viewAuditLog / changeRole(ADMIN_ONLY) / exportAuditLog(ADMIN_ONLY) / manageWebhooks(ADMIN_ONLY)。**createUser は未定義**
- src/app/actions/users.ts — listUsersAction（canPerform organization listUsers）/ updateUserRoleAction（canPerform organization changeRole）。create 系は無い
- src/domain/models/auditLog.ts AuditAction — user 関連は `user.updateRole` のみ。`user.create` は未定義。AuditTargetType に `user` は既存
- src/app/(dashboard)/settings/users/page.tsx ＋ UserRoleSelect.tsx — ユーザー一覧とロール select

## 要件

1. `userRepository.create({ organizationId, email, name, role, hashedPassword })` を追加する。全クエリ・挿入は organizationId を伴う。email の UNIQUE 制約違反は呼び出し側が判別できる形で扱う（重複時はドメイン的なエラーに変換）
2. `createUser` usecase を新設する: `{ organizationId, actorId, email, name, role, password }` を受け取り、(a) 同一 email の既存ユーザーが無いことを確認、(b) password を bcryptjs でハッシュ、(c) userRepository.create で作成、(d) `recordAudit({ action: "user.create", targetType: "user", targetId: 作成ユーザー id, actorId, organizationId })` を同一トランザクションで記録する
3. `src/domain/models/auditLog.ts` の `AuditAction` に `"user.create"` を追加する（AuditTargetType の `user` は既存）
4. `src/domain/authorization.ts` の organization に `createUser: ADMIN_ONLY` を追加する
5. `src/app/actions/users.ts` に `createUserAction` を追加する: `auth()` で認証、`canPerform(role, "organization", "createUser")` で認可、zod で入力検証（email 形式・name 必須・role は許可値・password 最小長）、organizationId/actorId は session 由来。成功時は settings/users を revalidate
6. settings/users 画面に管理者向けのユーザー作成フォーム（email / name / role / 初期パスワード）と作成導線を追加する。作成後は一覧に反映される

## スコープ外

- ユーザーの無効化・削除（users に状態カラムが無く、ソフト削除はスキーマ変更を伴うため別リクエスト・DB バッチで扱う）
- メールによる招待・本人による初回パスワード設定フロー（メール基盤が無い。管理者が初期パスワードを設定し、本人は別途アカウント設定で変更する想定）
- パスワードリセット
- 組織をまたぐユーザー管理（スーパー管理者は別リクエスト）

## 受け入れ基準

- [ ] 管理者が email / name / role / 初期パスワードでユーザーを作成でき、作成されたユーザーが自組織に属することをテストで固定する
- [ ] 同一 email での重複作成が拒否されることをテストで固定する
- [ ] admin 以外（manager/finance/member）は作成できないことをテストで固定する
- [ ] 作成時に `user.create` 監査ログが記録されることをテストで固定する
- [ ] 作成したパスワードで認証（bcrypt.compare）が成立する（ハッシュ方式が一致する）ことをテストで固定する
- [ ] 依存方向 actions/RSC → usecases → domain / infrastructure を遵守する
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **初期パスワードは管理者設定方式** — メール基盤が無いため、招待メール＋本人設定フローは取らず、管理者が初期パスワードを設定する。本人は別リクエスト（アカウント設定）で変更する。最小構成で内製運用に足りる。
2. **email 重複は usecase の事前確認＋DB UNIQUE の二段** — 事前 findByEmailForAuth 相当で利用者向けエラーを返しつつ、DB の UNIQUE 制約を最終防衛線とする（競合時も整合）。
3. **監査アクションは `user.create` を新設** — 既存の型カタログ（auditLog.ts）に追加する。命名は `<対象>.<操作>` 規約（ユビキタス言語辞書）に従い camelCase の操作・既存 targetType `user` を使う。
4. **無効化はスコープ外（DB 変更が必要なため分離）** — ソフト削除には users への状態カラム追加（マイグレーション）が要る。1 リクエスト＝1 収束ループ・無DB に収めるため、無効化は別リクエストに切り出す。
