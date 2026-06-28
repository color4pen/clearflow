# Tasks: 組織設定（組織名の編集）

## T-01: 監査カタログに organization を追加

- [x] `src/domain/models/auditLog.ts` の `AuditAction` 型に `"organization.update"` を追加する
- [x] `src/domain/models/auditLog.ts` の `AuditTargetType` 型に `"organization"` を追加する

**Acceptance Criteria**:
- `AuditAction` に `"organization.update"` が含まれる
- `AuditTargetType` に `"organization"` が含まれる
- `bun run typecheck` が通る

## T-02: 認可マトリクスに `updateOrganization` を追加

- [x] `src/domain/authorization.ts` の `PERMISSION_MATRIX.organization` に `updateOrganization: ADMIN_ONLY` を追加する

**Acceptance Criteria**:
- `canPerform("admin", "organization", "updateOrganization")` が `true` を返す
- `canPerform("manager", "organization", "updateOrganization")` が `false` を返す
- `canPerform("finance", "organization", "updateOrganization")` が `false` を返す
- `canPerform("member", "organization", "updateOrganization")` が `false` を返す

## T-03: `organizationRepository.update` を追加

- [x] `src/infrastructure/repositories/organizationRepository.ts` に `update(id, organizationId, data: { name: string }, tx?: Transaction)` 関数を追加する
- [x] WHERE 条件は `eq(organizations.id, id)` AND `eq(organizations.id, organizationId)` で自組織のみ更新可能にする（`findById` の既存パターンに合わせる）
- [x] `.set({ name: data.name })` で name のみ更新する
- [x] `.returning()` で更新後の `Organization` を返す。更新対象がなければ `null` を返す
- [x] `tx ?? db` パターンでトランザクション対応する（`userRepository.updateRole` と同パターン）

**Acceptance Criteria**:
- `update` 関数が export されている
- `Transaction` 型の optional 引数を受け取る
- WHERE 条件に `organizationId` が含まれる（テナント分離）
- `bun run typecheck` が通る

## T-04: `updateOrganization` usecase を新設

- [x] `src/application/usecases/updateOrganization.ts` を新規作成する
- [x] 引数型: `{ organizationId: string; actorId: string; name: string }`
- [x] 戻り値型: `{ ok: true } | { ok: false; reason: string }`（`UpdateOrganizationResult`）
- [x] `db.transaction` 内で以下を順に実行する:
  1. `organizationRepository.update(organizationId, organizationId, { name }, tx)` を呼ぶ
  2. 更新結果が null なら `throw new Error("組織が見つかりません")`
  3. `recordAudit({ action: "organization.update", targetType: "organization", targetId: organizationId, actorId, organizationId, metadata: { name } }, tx)` を呼ぶ
- [x] try-catch で `{ ok: false, reason }` を返す
- [x] `src/application/usecases/index.ts` に `export { updateOrganization } from "./updateOrganization"` を追加する

**Acceptance Criteria**:
- usecase ファイルが存在し、`updateOrganization` 関数が export されている
- `db.transaction` 内で `organizationRepository.update` と `recordAudit` が呼ばれる
- `recordAudit` が `"organization.update"` action、`"organization"` targetType を使用する
- `index.ts` に re-export されている
- `bun run typecheck` が通る

## T-05: `updateOrganizationAction` Server Action を追加

- [x] `src/app/actions/organization.ts` を新規作成する
- [x] `"use server"` ディレクティブを先頭に記述する
- [x] `updateOrganizationSchema` を zod で定義: `name: z.string().min(1, "組織名は必須です").max(100, "組織名は100文字以内で入力してください")`
- [x] `UpdateOrganizationState` 型を export: `null | { success: false; message: string } | { success: true }`
- [x] `updateOrganizationAction(prevState, formData)` 関数を実装:
  1. `auth()` で session を取得。未認証なら `{ success: false, message: "認証が必要です" }` を返す
  2. `canPerform(session.user.role, "organization", "updateOrganization")` で認可。失敗なら `{ success: false, message: "この操作を実行する権限がありません" }` を返す
  3. `formData.get("name")` を取得して zod で検証
  4. `updateOrganization({ organizationId: session.user.organizationId, actorId: session.user.id, name })` を呼ぶ
  5. 成功時は `revalidatePath("/settings/organization")` してから `{ success: true }` を返す
- [x] `getOrganizationAction` 関数を追加: `auth()` → `organizationRepository.findById(organizationId, organizationId)` → 組織データを返す

**Acceptance Criteria**:
- `"use server"` ディレクティブが含まれる
- `canPerform` で `"updateOrganization"` 権限チェックを行う
- `organizationId` / `actorId` が `session` 由来で、`formData` から取得しない
- zod で `name` を検証（必須・最大100文字）
- 成功時に `/settings/organization` を revalidate する
- `bun run typecheck` が通る

## T-06: 組織設定画面を追加

- [x] `src/app/(dashboard)/settings/organization/page.tsx` を新規作成する（Server Component）
  - `auth()` でセッション取得、admin 以外は `/requests` にリダイレクト
  - `getOrganizationAction()` で組織データを取得
  - `PageToolbar` に title "組織設定" を設定
  - `SectionCard` 内に `OrganizationForm` を配置し、組織データを props で渡す
- [x] `src/app/(dashboard)/settings/organization/OrganizationForm.tsx` を新規作成する（Client Component）
  - `"use client"` ディレクティブ
  - `useActionState` で `updateOrganizationAction` を呼ぶ
  - `FormField` / `Input` / `SubmitButton` コンポーネントを使用（既存の共通コンポーネント）
  - 成功/エラーメッセージの表示（既存の WebhookCreateForm パターンを参照）
  - `name` フィールドの初期値に現在の組織名を設定

**Acceptance Criteria**:
- `/settings/organization` にアクセスすると組織名の表示・編集フォームが表示される
- フォーム送信で組織名が更新される
- 成功/エラーメッセージが表示される
- 既存の共通コンポーネント（`FormField`, `Input`, `SubmitButton`, `PageToolbar`, `SectionCard`）を使用している

## T-07: SettingsNav に「組織」タブを追加

- [x] `src/app/(dashboard)/settings/SettingsNav.tsx` の `NAV_ITEMS` 配列の先頭に `{ href: "/settings/organization", label: "組織" }` を追加する

**Acceptance Criteria**:
- SettingsNav に「組織」タブが表示される
- タブは先頭（最初の項目）に配置される
- `/settings/organization` へのリンクである

## T-08: テストを追加

- [x] `src/__tests__/usecases/organizationManagement.test.ts` を新規作成する（静的コード解析テスト）
  - `updateOrganization` usecase が `db.transaction` を使用していること
  - `recordAudit` がトランザクション内で呼ばれること（`db.transaction` の後に `recordAudit` が出現）
  - `action` が `"organization.update"` であること
  - `targetType` が `"organization"` であること
  - metadata に `name` が含まれること
  - 組織が見つからない場合のエラーメッセージ "組織が見つかりません" が含まれること
- [x] `src/__tests__/settings/organizationSettingsActions.test.ts` を新規作成する（静的コード解析テスト）
  - `updateOrganizationAction` が存在すること
  - `"use server"` ディレクティブが含まれること
  - `canPerform` で `"updateOrganization"` 権限チェックを行うこと
  - `organizationId` / `actorId` が session 由来であること（`formData.get("organizationId")` / `formData.get("actorId")` が含まれないこと）
  - zod で `name` を検証すること（`.string()`, `.min(1`, `.max(100`）
  - 成功後に `/settings/organization` を revalidatePath すること
- [x] `src/__tests__/domain/authorization.test.ts` に `updateOrganization` の権限テストを追加する（既存ファイルに追記）
  - `canPerform("admin", "organization", "updateOrganization")` が `true`
  - `canPerform("manager", "organization", "updateOrganization")` が `false`
  - `canPerform("finance", "organization", "updateOrganization")` が `false`
  - `canPerform("member", "organization", "updateOrganization")` が `false`

**Acceptance Criteria**:
- 管理者が組織名を編集でき、変更が自組織のみに適用されることがテストで固定されている
- admin 以外（manager/finance/member）は更新できないことがテストで固定されている
- 更新時に `organization.update` 監査ログが記録されることがテストで固定されている
- 既存テスト無変更で `bun test` green
- `bun run typecheck` green
- `bun run build` 成功
