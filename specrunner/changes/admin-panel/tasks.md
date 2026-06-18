# Tasks: 管理画面（テンプレートCRUD・ユーザー管理）

## T-01: approvalTemplateRepository に create / update / delete を追加

- [ ] `src/infrastructure/repositories/approvalTemplateRepository.ts` に `create(data, tx?)` を追加する。`data` は `{ name, organizationId, steps, minAmount?, maxAmount? }`。`tx` はオプションのトランザクション引数（既存の `requestRepository.create` と同じパターン）。`.returning()` でマッピング済み `ApprovalTemplate` を返す
- [ ] 同ファイルに `updateById(id, organizationId, data, tx?)` を追加する。`data` は `{ name?, steps?, minAmount?, maxAmount? }` の部分更新。`eq(id) AND eq(organizationId)` で WHERE 条件を付与。`.returning()` で更新後の `ApprovalTemplate | null` を返す
- [ ] 同ファイルに `deleteById(id, organizationId, tx?)` を追加する。`eq(id) AND eq(organizationId)` で WHERE 条件を付与。戻り値は `void`

**Acceptance Criteria**:
- 3 メソッド（create, updateById, deleteById）が export されている
- 全メソッドに organizationId 条件が含まれている
- create と updateById はオプション引数 `tx?: Transaction` を受け取る
- deleteById はオプション引数 `tx?: Transaction` を受け取る
- `bun run build` が通る

---

## T-02: userRepository に findByOrganization / updateRole を追加

- [ ] `src/infrastructure/repositories/userRepository.ts` に `findByOrganization(organizationId)` を追加する。`eq(users.organizationId, organizationId)` で絞り込み、`User[]` を返す（hashedPassword は含めない）
- [ ] 同ファイルに `updateRole(id, organizationId, role, tx?)` を追加する。`eq(id) AND eq(organizationId)` で WHERE 条件。`role` カラムを更新し、`.returning()` で更新後の `User | null` を返す。`Role` 型を import する

**Acceptance Criteria**:
- findByOrganization が organizationId 条件付きで User[] を返す
- findByOrganization の返却値に hashedPassword が含まれない
- updateRole が organizationId 条件付きで更新し、User | null を返す
- `bun run build` が通る

---

## T-03: requestRepository に existsPendingByTemplateId を追加

- [ ] `src/infrastructure/repositories/requestRepository.ts` に `existsPendingByTemplateId(templateId, organizationId)` を追加する
- [ ] 実装: `audit_logs` テーブルと `requests` テーブルを JOIN し、`audit_logs.action = 'request.create'` AND `audit_logs.metadata->>'templateId' = templateId` AND `audit_logs.organizationId = organizationId` AND `requests.id = audit_logs.targetId` AND `requests.status = 'pending'` で検索。`boolean` を返す（EXISTS 相当）
- [ ] `auditLogs` と `requests` の両テーブルを schema から import する
- [ ] メソッドに JSDoc コメントを追加し、audit_logs の metadata 構造への依存を明示する

**Acceptance Criteria**:
- `existsPendingByTemplateId(templateId, organizationId): Promise<boolean>` が export されている
- クエリに organizationId 条件が含まれている
- audit_logs.metadata の templateId フィールドを参照して pending リクエストの存在をチェックする
- `bun run build` が通る

---

## T-04: テンプレート管理 usecase を追加（createTemplate, updateTemplate, deleteTemplate）

- [ ] `src/application/usecases/createTemplate.ts` を作成する。引数: `{ name, steps, minAmount?, maxAmount?, organizationId, actorId }`。トランザクション内で `approvalTemplateRepository.create` + `auditLogRepository.create`（action: `template.create`, targetType: `template`）を実行する。戻り値: `{ ok: true, template } | { ok: false, reason: string }`
- [ ] `src/application/usecases/updateTemplate.ts` を作成する。引数: `{ id, name?, steps?, minAmount?, maxAmount?, organizationId, actorId }`。トランザクション内で `approvalTemplateRepository.updateById` + `auditLogRepository.create`（action: `template.update`）を実行する。テンプレートが見つからない場合は `{ ok: false, reason }` を返す
- [ ] `src/application/usecases/deleteTemplate.ts` を作成する。引数: `{ id, organizationId, actorId }`。まず `requestRepository.existsPendingByTemplateId` で使用中チェック。使用中なら `{ ok: false, reason: "このテンプレートを使用中の承認待ちリクエストがあるため削除できません" }` を返す。未使用ならトランザクション内で `approvalTemplateRepository.deleteById` + `auditLogRepository.create`（action: `template.delete`）を実行する
- [ ] `src/application/usecases/index.ts` に 3 つの usecase を re-export する

**Acceptance Criteria**:
- 3 ファイルが作成されている
- createTemplate と updateTemplate はトランザクション内で監査ログを記録する
- deleteTemplate は使用中チェックを先に実行し、チェック通過後にトランザクション内で削除 + 監査ログを記録する
- 依存: `usecases → repositories`（domain/services は不要）
- index.ts に re-export がある
- `bun run build` が通る

---

## T-05: ユーザーロール変更 usecase を追加（updateUserRole）

- [ ] `src/application/usecases/updateUserRole.ts` を作成する。引数: `{ targetUserId, organizationId, actorId, newRole }`
- [ ] 自分自身のロール変更ガード: `actorId === targetUserId` の場合 `{ ok: false, reason: "自分自身のロールは変更できません" }` を返す
- [ ] トランザクション内で `userRepository.updateRole(targetUserId, organizationId, newRole, tx)` + `auditLogRepository.create`（action: `user.updateRole`, targetType: `user`, metadata: `{ oldRole, newRole }`）を実行する。oldRole 取得のため、更新前に `userRepository.findById` で現在のロールを取得する
- [ ] ユーザーが見つからない場合は `{ ok: false, reason }` を返す
- [ ] `src/application/usecases/index.ts` に re-export する

**Acceptance Criteria**:
- `actorId === targetUserId` で拒否される
- トランザクション内でロール更新と監査ログ記録が行われる
- 監査ログの metadata に oldRole と newRole が含まれる
- 存在しないユーザーの場合エラーを返す
- index.ts に re-export がある
- `bun run build` が通る

---

## T-06: テンプレート管理 Server Actions を追加

- [ ] `src/app/actions/templates.ts` を新規作成する。`"use server"` ディレクティブを先頭に記述
- [ ] `listTemplatesAction` を追加: セッション取得 → admin ガード → `approvalTemplateRepository.findByOrganization(session.user.organizationId)` を呼び出し、テンプレート一覧を返す
- [ ] `createTemplateAction` を追加: セッション取得 → admin ガード → zod バリデーション（templateSchema: name は必須 1 文字以上、steps は 1 要素以上の配列で各要素に approverRole 必須 + deadlineHours 任意正整数、minAmount/maxAmount は任意非負整数、minAmount ≤ maxAmount の refine） → `createTemplate` usecase 呼び出し → `revalidatePath("/settings/templates")`
- [ ] `updateTemplateAction` を追加: セッション取得 → admin ガード → zod バリデーション → `updateTemplate` usecase 呼び出し → `revalidatePath("/settings/templates")`
- [ ] `deleteTemplateAction` を追加: セッション取得 → admin ガード → `deleteTemplate` usecase 呼び出し → `revalidatePath("/settings/templates")`

**Acceptance Criteria**:
- 4 アクション（list, create, update, delete）が export されている
- 全アクションに `session.user.role !== "admin"` ガードがある
- create / update に zod バリデーションが適用されている
- zod スキーマに minAmount ≤ maxAmount の refine がある
- organizationId はセッションから取得している（引数やフォームデータから受け取らない）
- `bun run build` が通る

---

## T-07: ユーザー管理 Server Actions を追加

- [ ] `src/app/actions/users.ts` を新規作成する。`"use server"` ディレクティブを先頭に記述
- [ ] `listUsersAction` を追加: セッション取得 → admin ガード → `userRepository.findByOrganization(session.user.organizationId)` を呼び出し、ユーザー一覧を返す
- [ ] `updateUserRoleAction` を追加: セッション取得 → admin ガード → zod バリデーション（userId: UUID 文字列必須、role: `"admin" | "member" | "manager" | "finance"` の enum） → `updateUserRole` usecase 呼び出し → `revalidatePath("/settings/users")`

**Acceptance Criteria**:
- 2 アクション（listUsers, updateUserRole）が export されている
- 全アクションに admin ガードがある
- updateUserRoleAction に zod バリデーションが適用されている
- organizationId はセッションから取得している
- `bun run build` が通る

---

## T-08: settings レイアウトにサブナビゲーションを追加

- [ ] `src/app/(dashboard)/settings/layout.tsx` を新規作成する
- [ ] `auth()` でセッションを取得し、`session.user.role !== "admin"` の場合は `redirect("/requests")` する
- [ ] サブナビゲーションとして以下の 4 リンクを表示する: Webhook（`/settings/webhooks`）、テンプレート（`/settings/templates`）、ユーザー（`/settings/users`）、監査ログ（`/settings/audit-logs`）
- [ ] 現在のパスに一致するリンクにアクティブスタイル（例: `text-blue-600 font-semibold`）を適用する。`usePathname()` は使えないため、レイアウトでは CSS のみ、または各ページでアクティブ判定を渡す方式を検討する。Server Component のため、レイアウトにナビを配置しつつ各リンクにシンプルなスタイルを適用する
- [ ] `children` を受け取りレンダリングする

**Acceptance Criteria**:
- `/settings` 配下のページにサブナビゲーションが表示される
- admin 以外のユーザーが `/settings/*` にアクセスすると `/requests` にリダイレクトされる
- 4 つのナビゲーションリンクが正しい href を持つ
- `bun run build` が通る

---

## T-09: ダッシュボードヘッダーのナビゲーションを整理

- [ ] `src/app/(dashboard)/layout.tsx` のヘッダーで、admin ユーザー向けの「設定」と「監査ログ」の 2 リンクを「設定」1 リンク（`/settings/webhooks`）に統合する
- [ ] 統合後のリンクテキストは「設定」とする

**Acceptance Criteria**:
- admin ユーザーのヘッダーに「設定」リンクが 1 つだけ表示される
- 「設定」リンクは `/settings/webhooks` を指す
- 「監査ログ」の個別リンクはヘッダーから削除されている（settings サブナビで辿れる）
- `bun run build` が通る

---

## T-10: テンプレート管理 UI — 一覧ページ

- [ ] `src/app/(dashboard)/settings/templates/page.tsx` を作成する（Server Component）
- [ ] admin ガード: `session.user.role !== "admin"` で `redirect("/requests")`
- [ ] `listTemplatesAction` でテンプレート一覧を取得して表示する
- [ ] テーブル列: テンプレート名、金額条件（minAmount〜maxAmount）、ステップ数、作成日時、操作（編集・削除）
- [ ] 「テンプレートを追加」リンクまたはボタンで `/settings/templates/new` へ遷移する
- [ ] 削除ボタンは `deleteTemplateAction` を呼び出す form の submit で実装する（Webhook 削除と同パターン）
- [ ] 削除エラー時（使用中テンプレート）のメッセージ表示を考慮する

**Acceptance Criteria**:
- `/settings/templates` にアクセスするとテンプレート一覧が表示される
- 各テンプレートに編集リンクと削除ボタンがある
- 「テンプレートを追加」のリンクがある
- `bun run build` が通る

---

## T-11: テンプレート管理 UI — 作成ページ

- [ ] `src/app/(dashboard)/settings/templates/new/page.tsx` を作成する（Server Component、admin ガード）
- [ ] テンプレート作成フォームコンポーネント（Client Component）を配置する
- [ ] `src/app/(dashboard)/settings/templates/TemplateForm.tsx` を作成する（`"use client"`）
- [ ] フォームフィールド: name（テキスト）、minAmount（数値、任意）、maxAmount（数値、任意）
- [ ] 承認ステップセクション: ステップの動的追加・削除 UI。各ステップに approverRole（ドロップダウン: admin / member / manager / finance）と deadlineHours（数値、任意）
- [ ] 「ステップを追加」ボタンで空のステップ行を追加する
- [ ] 各ステップに「削除」ボタンを配置する（ステップが 1 つの場合は削除不可）
- [ ] フォーム送信時に `createTemplateAction` を呼び出す。`useActionState` で状態管理する
- [ ] 成功時に `/settings/templates` へ遷移する（`useRouter` の `push`、または成功レスポンス後のリダイレクト）

**Acceptance Criteria**:
- `/settings/templates/new` にテンプレート作成フォームが表示される
- ステップの動的追加・削除ができる
- フォーム送信で `createTemplateAction` が呼ばれる
- バリデーションエラー時にエラーメッセージが表示される
- `bun run build` が通る

---

## T-12: テンプレート管理 UI — 編集ページ

- [ ] `src/app/(dashboard)/settings/templates/[id]/edit/page.tsx` を作成する（Server Component、admin ガード）
- [ ] URL パラメータ `id` で `approvalTemplateRepository.findById(id, session.user.organizationId)` を呼び出し、テンプレートを取得する。見つからない場合は `notFound()` を返す
- [ ] T-11 で作成した `TemplateForm` を再利用し、既存値をデフォルト値として渡す。フォーム送信時は `updateTemplateAction` を呼び出す
- [ ] `TemplateForm` に `mode: "create" | "edit"` と `templateId?: string` の prop を追加し、送信先アクションを切り替える

**Acceptance Criteria**:
- `/settings/templates/:id/edit` に既存テンプレートの値が入ったフォームが表示される
- 存在しないテンプレート ID の場合 404 が表示される
- フォーム送信で `updateTemplateAction` が呼ばれる
- `bun run build` が通る

---

## T-13: ユーザー管理 UI — 一覧・ロール変更ページ

- [ ] `src/app/(dashboard)/settings/users/page.tsx` を作成する（Server Component、admin ガード）
- [ ] `listUsersAction` でユーザー一覧を取得して表示する
- [ ] テーブル列: 名前、メールアドレス、ロール（ドロップダウン）、作成日時
- [ ] ロール変更: 各ユーザーのロール列にドロップダウン（admin / member / manager / finance）を配置する。値変更時に `updateUserRoleAction` を呼び出す
- [ ] ロール変更用の Client Component（`UserRoleSelect.tsx`）を作成する。ドロップダウンの `onChange` で Server Action を呼び出す
- [ ] 自分自身の行はドロップダウンを disabled にする、またはロール変更不可の表示をする
- [ ] エラー時のメッセージ表示を考慮する

**Acceptance Criteria**:
- `/settings/users` にアクセスするとユーザー一覧が表示される
- 各ユーザーのロールをドロップダウンで変更できる
- 自分自身のロールは変更できない（UI 上で制御）
- ロール変更後にページが更新される
- `bun run build` が通る

---

## T-14: テスト — テンプレート CRUD の権限・使用中チェック

- [ ] `src/__tests__/usecases/templateManagement.test.ts` を作成する
- [ ] テスト: `createTemplate` usecase がトランザクション内で audit_logs.create を呼び出していることを静的解析で確認する（既存テストパターンに倣う）
- [ ] テスト: `deleteTemplate` usecase が `existsPendingByTemplateId` を呼び出してから削除していることを静的解析で確認する
- [ ] テスト: `deleteTemplate` のソースに `existsPendingByTemplateId` の呼び出しが `deleteById` より前にあることを確認する
- [ ] テスト: Server Action `createTemplateAction` / `updateTemplateAction` / `deleteTemplateAction` のソースに `role !== "admin"` ガードが含まれることを静的解析で確認する

**Acceptance Criteria**:
- テンプレート CRUD の usecase が監査ログを記録していることがテストで検証される
- 削除前の使用中チェックがテストで検証される
- admin ガードの存在がテストで検証される
- `bun test` が全件 green

---

## T-15: テスト — ユーザーロール変更の権限・自己変更禁止

- [ ] `src/__tests__/usecases/userManagement.test.ts` を作成する
- [ ] テスト: `updateUserRole` usecase のソースに `actorId === targetUserId` の自己変更ガードが含まれることを静的解析で確認する
- [ ] テスト: `updateUserRole` usecase がトランザクション内で audit_logs.create を呼び出していることを静的解析で確認する
- [ ] テスト: `updateUserRole` usecase の audit_logs metadata に `oldRole` と `newRole` が含まれることをソース静的解析で確認する
- [ ] テスト: Server Action `updateUserRoleAction` のソースに `role !== "admin"` ガードが含まれることを静的解析で確認する

**Acceptance Criteria**:
- 自己変更禁止ガードの存在がテストで検証される
- 監査ログ記録がテストで検証される
- admin ガードの存在がテストで検証される
- `bun test` が全件 green

---

## T-16: テスト — テナント分離の検証

- [ ] `src/__tests__/static/projectStructure.test.ts` に以下のテストを追加する
- [ ] テスト: `approvalTemplateRepository.ts` の `create` / `updateById` / `deleteById` メソッドのソースに `organizationId` が含まれることを確認する
- [ ] テスト: `userRepository.ts` の `findByOrganization` / `updateRole` メソッドのソースに `organizationId` が含まれることを確認する
- [ ] テスト: `src/app/actions/templates.ts` が `session.user.organizationId` を使用していることを確認する
- [ ] テスト: `src/app/actions/users.ts` が `session.user.organizationId` を使用していることを確認する

**Acceptance Criteria**:
- 新規 repository メソッドの organizationId 条件がテストで検証される
- Server Actions が organizationId をセッションから取得していることがテストで検証される
- `bun test` が全件 green

---

## T-17: 最終確認 — ビルド・型チェック・テスト

- [ ] `bun run build` を実行し、ビルドが成功することを確認する
- [ ] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [ ] `bun test` を実行し、全テストが green であることを確認する
- [ ] `bun run lint` を実行し、lint エラーがないことを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `typecheck` green
- `bun test` 全件 green
- `bun run lint` エラーなし
