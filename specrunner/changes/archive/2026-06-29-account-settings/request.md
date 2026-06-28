# アカウント設定（プロフィール編集・パスワード変更）

## Meta

- **type**: new-feature
- **slug**: account-settings
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存パターン（repository・usecase・Server Action・recordAudit・bcryptjs）に沿って本人向けの更新経路を足すだけで、新しい port/adapter や設計選択は無いため false -->

## 背景

ログインユーザーが自分の表示名を変更したりパスワードを変更する手段が無い（認証は login のみ）。本人向けの設定は全ロールが対象であり、管理者向けの settings（admin/manager 領域）とは別系統で提供する必要がある。本リクエストは「アカウント設定（自分のプロフィール編集・パスワード変更）」を追加する。

## 現状コードの前提

- src/infrastructure/schema.ts users — name(NOT NULL) / email(UNIQUE) / hashed_password(NOT NULL)。編集対象は name と hashed_password（スキーマ変更不要）
- src/infrastructure/repositories/userRepository.ts `findById` — 安全な projection で hashedPassword を返さない（select に hashedPassword が無い）
- src/infrastructure/repositories/userRepository.ts `findByEmailForAuth` — email で hashedPassword を含むユーザーを返す（認証用）
- src/infrastructure/auth.ts:40 — `bcrypt.compare(password, user.hashedPassword)` で照合。ハッシュは `bcrypt.hash(pw, 12)`（bcryptjs）
- userRepository に updateProfile / updatePassword は無い（updateRole / updateNotificationsLastSeenAt はある）
- src/app/(dashboard)/settings 配下は管理者向け領域（admin/manager のみ到達）。本人向けアカウント設定は全ロールが到達できる必要がある
- src/domain/models/auditLog.ts AuditAction — user.create / user.updateRole はあるが `user.updatePassword` は無い

## 要件

1. userRepository に `updateProfile(userId, organizationId, { name })` と `updatePassword(userId, organizationId, hashedPassword)` を追加する。WHERE は (id, organizationId) で絞る（自テナント・本人のみ）
2. 本人の現在パスワードを照合するため、id から hashedPassword を取得する手段を用意する（`findByEmailForAuth` の流用、または hashedPassword を返す id ベースの専用メソッド追加）。`findById` の安全 projection（hashedPassword 非返却）は変更しない
3. `updateOwnProfile` usecase: `{ userId, organizationId, name }` を受け取り本人の name を更新する
4. `changeOwnPassword` usecase: `{ userId, organizationId, currentPassword, newPassword }` を受け取り、現在パスワードを bcrypt.compare で照合（不一致なら拒否）、一致すれば newPassword を bcrypt.hash して保存し、`recordAudit({ action: "user.updatePassword", targetType: "user", targetId: userId, actorId: userId, organizationId })` を同一トランザクションで記録する
5. `src/domain/models/auditLog.ts` の AuditAction に `"user.updatePassword"` を追加する
6. `src/app/actions/account.ts`（新規）に `updateOwnProfileAction` と `changeOwnPasswordAction` を追加する: `auth()` 認証のみ（ロールゲート無し＝全ロール）、対象は常に session.user.id 本人（入力から userId を受けない＝他人を更新できない）、zod 検証（name 必須／newPassword 最小長／currentPassword 必須）、organizationId/userId は session 由来
7. アカウント設定画面を**全ロールが到達できる場所**に追加する（管理者限定の /settings 配下に置かない。例: /account）。本人が辿れる導線を用意する

## スコープ外

- email の変更（認証 identity に影響するため別途）
- パスワードリセット（メール基盤が無い）
- 他人のアカウント編集（管理者によるユーザー管理は別領域）
- 2要素認証・セッション管理

## 受け入れ基準

- [ ] 本人が自分の表示名を変更でき、対象が常に session 本人で他ユーザーに影響しないことをテストで固定する
- [ ] 現在パスワードが正しいときのみパスワード変更が成功し、誤りなら拒否されることをテストで固定する
- [ ] 変更後の新パスワードで認証（bcrypt.compare）が成立することをテストで固定する
- [ ] パスワード変更時に `user.updatePassword` 監査ログが記録されることをテストで固定する
- [ ] アカウント設定が全ロール（member 含む）から到達・操作できることをテストで固定する
- [ ] `findById` の安全 projection（hashedPassword 非返却）が維持されることをテストで固定する
- [ ] 依存方向 actions/RSC → usecases → domain / infrastructure を遵守する
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **本人スコープ固定** — アカウント設定は常に session.user.id を対象とし、入力から userId を受けない（他人編集の経路を作らない）。ロールゲートは不要（全ロールが自分の設定を操作できる）。
2. **パスワード照合は専用取得経路** — `findById` の安全 projection（hashedPassword を一般に漏らさない）は変更せず、照合時のみ hashedPassword を取得する経路（`findByEmailForAuth` 流用または専用メソッド）を用いる。
3. **配置は管理者領域の外** — 管理者向け /settings は admin/manager 限定のため、本人向けアカウント設定は全ロール到達可能な別ルート（/account 等）に置く。
4. **監査はパスワード変更のみ** — セキュリティ上重要なパスワード変更を `user.updatePassword` で監査する。表示名変更は本人の低リスク操作のため監査対象外とし、カタログ肥大を避ける。
