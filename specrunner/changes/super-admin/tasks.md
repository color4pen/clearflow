# Tasks: スーパー管理者による組織プロビジョニング

## T-01: isSuperAdmin 判定関数の追加

- [x] `src/domain/services/superAdmin.ts` を新規作成
- [x] `isSuperAdmin(email: string | null | undefined): boolean` を実装する。`process.env.SUPER_ADMIN_EMAILS` をカンマで split し、trim 後に小文字比較する
- [x] 未設定・空文字列の場合は空配列として扱い `false` を返す
- [x] null/undefined 入力に対して `false` を返す

**Acceptance Criteria**:
- `isSuperAdmin` が登録済みメールに `true`、未登録メールに `false` を返す
- 大文字小文字を区別しない
- env 未設定時は全メールに `false`
- null/undefined 入力に `false`

---

## T-02: AuditAction に "organization.create" を追加

- [x] `src/domain/models/auditLog.ts` の `AuditAction` 型に `"organization.create"` を追加する

**Acceptance Criteria**:
- `AuditAction` 型が `"organization.create"` を含む
- 既存の型・値に影響しない
- `bun run typecheck` が通る

---

## T-03: organizationRepository に create と findAll を追加

- [x] `src/infrastructure/repositories/organizationRepository.ts` に `create(data: { name: string }, tx?: Transaction): Promise<Organization>` を追加する。`organizations` テーブルに INSERT し `.returning()` で返す
- [x] 同ファイルに `findAll(): Promise<Organization[]>` を追加する。全組織の `id / name / createdAt` を返す。`createdAt` の降順でソートする

**Acceptance Criteria**:
- `create` が `{ name }` を受け取り、DB が生成した id を含む Organization を返す
- `create` がトランザクション（`tx`）に対応する
- `findAll` が全組織を返し、業務データ（users 等）を JOIN しない
- `findAll` は `createdAt` 降順

---

## T-04: provisionOrganization usecase の実装

- [x] `src/application/usecases/provisionOrganization.ts` を新規作成
- [x] 入力: `{ actorId: string; organizationName: string; adminEmail: string; adminName: string; adminPassword: string }`
- [x] 戻り値: `{ ok: true; organization: Organization; adminUser: User } | { ok: false; reason: string }`
- [x] email 重複チェック: `userRepository.existsByEmail(adminEmail)` → 重複時 `{ ok: false, reason: "..." }`
- [x] `db.transaction` 内で以下を順に実行:
  1. `organizationRepository.create({ name: organizationName }, tx)`
  2. `bcrypt.hash(adminPassword, 12)` でパスワードハッシュ
  3. `userRepository.create({ organizationId: 新組織.id, email, name, role: "admin", hashedPassword }, tx)`
  4. `recordAudit({ action: "organization.create", targetType: "organization", targetId: 新組織.id, actorId, organizationId: 新組織.id }, tx)`
- [x] DB unique 制約違反（23505）を catch してエラーメッセージを返す
- [x] `src/application/usecases/index.ts` に export を追加する

**Acceptance Criteria**:
- 正常時: 組織と admin ユーザーが同一トランザクションで作成される
- 正常時: admin ユーザーは新組織の organizationId を持ち、role="admin"
- 正常時: 監査ログが同一トランザクション内で記録される
- email 重複時: 組織もユーザーも作成されない
- トランザクション内の任意ステップで失敗した場合: 全てロールバック

---

## T-05: listAllOrganizations usecase の実装

- [x] `src/application/usecases/listAllOrganizations.ts` を新規作成
- [x] `organizationRepository.findAll()` を呼び出し、`Organization[]` を返す
- [x] `src/application/usecases/index.ts` に export を追加する

**Acceptance Criteria**:
- 全組織のメタ情報（id, name, createdAt）のみ返す
- 業務データは含まない

---

## T-06: .env.example に SUPER_ADMIN_EMAILS を追記

- [x] `.env.example` に以下を追記:
  ```
  # Comma-separated list of super admin email addresses.
  # These users can access the /platform route to provision new organizations.
  # Leave empty or unset to disable super admin access.
  SUPER_ADMIN_EMAILS=
  ```

**Acceptance Criteria**:
- `.env.example` に `SUPER_ADMIN_EMAILS` の項目と説明コメントが存在する

---

## T-07: Server Action (platform.ts) の実装

- [x] `src/app/actions/platform.ts` を新規作成（`"use server"` 宣言）
- [x] `provisionOrganizationAction`:
  - `auth()` でセッション取得。未認証時はエラー
  - `isSuperAdmin(session.user.email)` チェック。非スーパー管理者はエラー
  - zod スキーマで入力検証: `organizationName`（string, min 1, max 100）、`adminEmail`（email）、`adminName`（string, min 1）、`adminPassword`（string, min 8）
  - `provisionOrganization` usecase を呼び出す。`actorId` は `session.user.id`
  - 成功時 `revalidatePath("/platform")` して `{ success: true }` を返す
- [x] `listAllOrganizationsAction`:
  - `auth()` + `isSuperAdmin` チェック
  - `listAllOrganizations` usecase を呼び出す
  - `{ success: true, organizations }` を返す

**Acceptance Criteria**:
- 認証＋スーパー管理者チェックが全 Action で実施される
- zod 検証の失敗時にエラーメッセージが返る
- `canPerform` は使わない（組織内 RBAC とは別レイヤー）
- `organizationId` は入力から受け取らない（usecase / DB 生成）

---

## T-08: /platform ルートの UI 実装

- [x] `src/app/(platform)/layout.tsx` を新規作成
  - `auth()` でセッション取得。未認証時は `/login` にリダイレクト
  - `isSuperAdmin(session.user.email)` チェック。非スーパー管理者はリダイレクトまたは 403 相当表示
  - スーパー管理者向けの最小レイアウト（ヘッダーにタイトル＋ログアウト）
- [x] `src/app/(platform)/platform/page.tsx` を新規作成
  - `listAllOrganizationsAction` で組織一覧を取得し表示（テーブル: id, name, createdAt）
  - 組織作成フォーム: 組織名、初期 admin の email / name / password を入力
  - `provisionOrganizationAction` を `useActionState` で呼び出す
  - 成功・エラーのフィードバック表示

**Acceptance Criteria**:
- `/platform` にスーパー管理者でアクセスすると組織一覧と作成フォームが表示される
- 非スーパー管理者はアクセス拒否される
- 組織作成が成功するとフォームがリセットされ一覧が更新される
- 既存の `(dashboard)` レイアウトとは独立

---

## T-09: isSuperAdmin の単体テスト

- [x] `src/__tests__/domain/superAdmin.test.ts` を新規作成
- [x] 以下のケースをテスト:
  - 登録済みメールに `true`
  - 大文字小文字混在で `true`
  - 未登録メールに `false`
  - env 未設定で `false`
  - env 空文字列で `false`
  - null 入力で `false`
  - undefined 入力で `false`
  - 複数メール登録（カンマ区切り）で各メールに `true`
  - 前後のスペースを trim して判定

**Acceptance Criteria**:
- 上記全ケースで期待通りの結果が得られる
- `bun test` で green

---

## T-10: provisionOrganization の dynamic テスト

- [x] `src/__tests__/usecases/provisionOrganization.dynamic.test.ts` を新規作成
- [x] モジュールモック（`bun:test` の `mock.module`）を使用して repository をモック（個別ファイルモックでバレル汚染を防ぐ）
- [x] 以下のケースをテスト:
  - 正常系: 組織＋admin 作成成功、戻り値に organization と adminUser が含まれる
  - 正常系: 監査ログが `organization.create` で記録される
  - email 重複: existsByEmail が true を返すとき `{ ok: false }` が返り、create は呼ばれない
  - DB unique 制約違反（23505）: `{ ok: false }` が返る

**Acceptance Criteria**:
- モジュールモックで usecase のビジネスロジックを検証する
- `bun test` で green

---

## T-11: listAllOrganizations の dynamic テスト

- [x] `src/__tests__/usecases/listAllOrganizations.dynamic.test.ts` を新規作成
- [x] モジュールモックで `organizationRepository.findAll` をモック（個別ファイルモック）
- [x] findAll が返す組織一覧がそのまま返されることを検証

**Acceptance Criteria**:
- usecase がリポジトリの結果をそのまま返すことを確認
- `bun test` で green

---

## T-12: platform action のアクセス制御テスト

- [x] `src/__tests__/actions/platformActions.test.ts` を新規作成
- [x] `auth()` をモック・`isSuperAdmin` は env 変数で制御し、以下を検証:
  - 未認証時にエラーが返る
  - 認証済みだが非スーパー管理者の場合にエラーが返る
  - スーパー管理者でかつ正しい入力の場合に成功する
  - zod 検証失敗時にエラーメッセージが返る

**Acceptance Criteria**:
- アクセス制御が正しく機能することをテストで固定
- `bun test` で green

---

## T-13: 最終検証

- [x] `bun run typecheck` が通ることを確認
- [x] `bun run build` が成功することを確認
- [x] `bun test` で既存テスト含め全 green であることを確認
- [x] 既存テストが無変更であることを確認（新規テストファイルの追加のみ）

**Acceptance Criteria**:
- typecheck / build / test 全て green
- 既存テストファイルに変更なし
