# Test Cases: ユーザーの無効化・再有効化

## Summary

- **Total**: 39 cases
- **Automated** (unit/integration): 34
- **Manual**: 5
- **Priority**: must: 30, should: 8, could: 1

---

### TC-001: admin が member を無効化する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 管理者は自組織のユーザーを無効化できる > Scenario: admin が member を無効化する

---

### TC-002: manager が member を無効化しようとする

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 管理者は自組織のユーザーを無効化できる > Scenario: manager が member を無効化しようとする

---

### TC-003: finance が member を無効化しようとする

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 管理者は自組織のユーザーを無効化できる > Scenario: finance が member を無効化しようとする

---

### TC-004: member が member を無効化しようとする

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 管理者は自組織のユーザーを無効化できる > Scenario: member が member を無効化しようとする

---

### TC-005: admin が無効化済みユーザーを再有効化する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 管理者は自組織の無効化済みユーザーを再有効化できる > Scenario: admin が無効化済みユーザーを再有効化する

---

### TC-006: admin がすでに有効なユーザーを再有効化しようとする

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 管理者は自組織の無効化済みユーザーを再有効化できる > Scenario: admin がすでに有効なユーザーを再有効化しようとする

---

### TC-007: admin が自分自身を無効化しようとする

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 自分自身は無効化できない > Scenario: admin が自分自身を無効化しようとする

---

### TC-008: 組織の唯一の admin を無効化しようとする

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 組織で最後の admin は無効化できない > Scenario: 組織の唯一の admin を無効化しようとする

---

### TC-009: 複数 admin がいる場合に一人を無効化する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 組織で最後の admin は無効化できない > Scenario: 複数 admin がいる場合に一人を無効化する

---

### TC-010: 無効化済みユーザーが正しいパスワードでログインしようとする

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 無効化済みユーザーは認証できない > Scenario: 無効化済みユーザーが正しいパスワードでログインしようとする

---

### TC-011: 無効化時の監査ログが正しく記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 無効化・再有効化は監査ログに記録される > Scenario: 無効化時の監査ログ

---

### TC-012: 再有効化時の監査ログが正しく記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 無効化・再有効化は監査ログに記録される > Scenario: 再有効化時の監査ログ

---

### TC-013: 異なる組織のユーザーを無効化しようとする

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 操作は自組織のユーザーにのみ作用する > Scenario: 異なる組織のユーザーを無効化しようとする

---

### TC-014: マイグレーション SQL が deactivated_at 追加のみを含む

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 差分マイグレーションは deactivated_at 追加のみ > Scenario: マイグレーションの内容

---

### TC-015: User モデルに deactivatedAt: Date | null フィールドが追加される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/user.ts` の `User` 型定義
**WHEN** `deactivatedAt` フィールドを参照する
**THEN** `Date | null` 型として定義されており、`bun run typecheck` が通る

---

### TC-016: userRepository の全 select 句が deactivatedAt を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/repositories/userRepository.ts` の各クエリメソッド（`findByOrganization`、`updateRole`、`findById`、`create`、`updateProfile`、`findByEmailForAuth`、`findByIdForAuth`）
**WHEN** 各メソッドの select 句を確認する
**THEN** 全ての select 句に `deactivatedAt: users.deactivatedAt` が含まれる

---

### TC-017: findByEmailForAuth の WHERE 条件に isNull(deactivatedAt) が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/userRepository.ts` の `findByEmailForAuth` 実装
**WHEN** WHERE 条件を確認する
**THEN** `isNull(users.deactivatedAt)` が `and(...)` 条件の一部として含まれており、無効化済みユーザーは null を返す

---

### TC-018: findByIdForAuth の WHERE 条件に isNull(deactivatedAt) が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/userRepository.ts` の `findByIdForAuth` 実装
**WHEN** WHERE 条件を確認する
**THEN** `isNull(users.deactivatedAt)` が条件に含まれており、無効化済みユーザーはパスワード変更等の認証経路でも遮断される

---

### TC-019: userRepository.deactivate が deactivated_at を now に設定し User を returning で返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `userRepository.deactivate(id, organizationId)` の実装
**WHEN** メソッドのソースコードを確認する
**THEN** `deactivated_at = new Date()` を SET し、`WHERE (id, organizationId)` で絞り、更新後の User を `returning` で返す

---

### TC-020: userRepository.reactivate が deactivated_at を null に設定し User を returning で返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `userRepository.reactivate(id, organizationId)` の実装
**WHEN** メソッドのソースコードを確認する
**THEN** `deactivated_at = null` を SET し、`WHERE (id, organizationId)` で絞り、更新後の User を `returning` で返す

---

### TC-021: deactivate / reactivate が該当行なしの場合に null を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** 存在しない (id, organizationId) の組み合わせで `userRepository.deactivate` または `userRepository.reactivate` を呼び出す
**WHEN** メソッドを実行する（returning が空配列になる場合のロジック）
**THEN** null が返る

---

### TC-022: AuditAction 型に "user.deactivate" と "user.reactivate" が追加される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/domain/models/auditLog.ts` の `AuditAction` union 型定義
**WHEN** `"user.deactivate"` および `"user.reactivate"` を AuditAction として参照する
**THEN** 型チェックエラーが発生せず、`bun run typecheck` が通る

---

### TC-023: admin のみが canPerform("organization", "deactivateUser") で true を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/domain/authorization.ts` の organization 権限マトリクスに `deactivateUser: ADMIN_ONLY` が追加されている
**WHEN** 各ロールで `canPerform(role, "organization", "deactivateUser")` を呼び出す
**THEN** `admin` は true、`manager` / `finance` / `member` は false を返す

---

### TC-024: deactivateUser usecase でユーザーが見つからない場合にエラーを返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `findById(targetUserId, organizationId)` が null を返す（存在しない、または他組織の userId）
**WHEN** `deactivateUser` usecase を実行する
**THEN** `{ ok: false, reason: "ユーザーが見つかりません" }` が返り、DB 更新も監査ログ記録も行われない

---

### TC-025: deactivateUser usecase がトランザクション内で deactivate と recordAudit を実行する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/deactivateUser.ts` の実装
**WHEN** ソースコードを確認する
**THEN** `db.transaction` の呼び出しがあり、`userRepository.deactivate` と `recordAudit({ action: "user.deactivate", ... })` が同一トランザクション内で実行される

---

### TC-026: updateUserRole の otherAdmins フィルターが deactivatedAt === null の admin のみカウントする

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07b

**GIVEN** `src/application/usecases/updateUserRole.ts` の `otherAdmins` フィルター実装
**WHEN** ソースコードを確認する
**THEN** `u.role === "admin" && u.id !== data.targetUserId && u.deactivatedAt === null` 条件が含まれており、無効化済み admin はカウント対象から除外される

---

### TC-027: deactivated admin のみが残る組織での active admin 降格が拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07b

**GIVEN** 組織に active admin A（有効な JWT 保持）と deactivated admin B がいる
**WHEN** admin A が active admin C（唯一の有効 admin）を降格しようとする（otherAdmins フィルターが deactivated admin B を除外するシナリオ）
**THEN** deactivated admin B はカウントされず、「組織に最低1人の管理者が必要です」エラーが返り、降格が拒否される

---

### TC-028: reactivateUser usecase でユーザーが見つからない場合にエラーを返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** `findById(targetUserId, organizationId)` が null を返す
**WHEN** `reactivateUser` usecase を実行する
**THEN** `{ ok: false, reason: "ユーザーが見つかりません" }` が返り、DB 更新も監査ログ記録も行われない

---

### TC-029: reactivateUser usecase がトランザクション内で reactivate と recordAudit を実行する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/application/usecases/reactivateUser.ts` の実装
**WHEN** ソースコードを確認する
**THEN** `db.transaction` の呼び出しがあり、`userRepository.reactivate` と `recordAudit({ action: "user.reactivate", ... })` が同一トランザクション内で実行される

---

### TC-030: deactivateUserAction / reactivateUserAction が未認証ユーザーを拒否する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `auth()` が null を返す（未認証状態）
**WHEN** `deactivateUserAction` または `reactivateUserAction` を呼び出す
**THEN** `{ success: false, message: "認証が必要です" }` が返り、usecase は呼び出されない

---

### TC-031: deactivateUserAction / reactivateUserAction が canPerform で "deactivateUser" 権限をチェックする

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/app/actions/users.ts` の `deactivateUserAction` および `reactivateUserAction` 実装
**WHEN** ソースコードを確認する
**THEN** `canPerform(session.user.role, "organization", "deactivateUser")` が呼ばれており、false の場合は権限エラーを返す

---

### TC-032: deactivateUserAction / reactivateUserAction が organizationId と actorId を session から取得する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/app/actions/users.ts` の `deactivateUserAction` および `reactivateUserAction` 実装
**WHEN** ソースコードを確認する
**THEN** `organizationId` は `session.user.organizationId` 由来、`actorId` は `session.user.id` 由来であり、formData から取得していない（権限昇格不可）

---

### TC-033: deactivateUserAction / reactivateUserAction が userId を z.string().uuid() でバリデーションする

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** `src/app/actions/users.ts` の `deactivateUserAction` および `reactivateUserAction` 実装
**WHEN** FormData から `userId` を取得する箇所のソースコードを確認する
**THEN** `z.string().uuid()` でバリデーションされており、不正な形式の userId は usecase 呼び出し前に拒否される

---

### TC-034: deactivateUserAction / reactivateUserAction が成功時に /settings/users を revalidate する

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-09

**GIVEN** `src/app/actions/users.ts` の `deactivateUserAction` および `reactivateUserAction` 実装
**WHEN** ソースコードを確認する
**THEN** 成功時に `revalidatePath("/settings/users")` が呼ばれており、一覧の即時更新が保証される

---

### TC-035: findByOrganization が無効化済みユーザーを含む全ユーザーを返す

**Category**: unit
**Priority**: should
**Source**: design.md > D4: User モデルに deactivatedAt を追加

**GIVEN** `userRepository.findByOrganization(organizationId)` の実装
**WHEN** ソースコードの WHERE 条件を確認する
**THEN** `deactivated_at IS NULL` 等の絞り込みがなく、有効・無効を問わず全ユーザーが返される（管理画面から再有効化できるようにするため）

---

### TC-036: ユーザー一覧に有効/無効の状態列が表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `/settings/users` ページを管理者として開く
**WHEN** ユーザー一覧テーブルを確認する
**THEN** 「状態」列が存在し、有効ユーザーは「有効」、無効化済みユーザーは「無効」と表示される。無効化済みユーザーの行はグレーアウト等の視覚的区別がある

---

### TC-037: 自分自身には無効化ボタンが表示されない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `/settings/users` ページを管理者として開く
**WHEN** 自分自身の行を確認する
**THEN** 無効化ボタンが表示されない（他ユーザーの行には無効化または有効化ボタンが表示される）

---

### TC-038: 無効化済みユーザーのロール変更 select が disabled になる

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** `/settings/users` ページを管理者として開く
**WHEN** 無効化済みユーザーのロール変更 select を確認する
**THEN** select が disabled 状態であり、ロール変更を操作できない

---

### TC-039: 既存テストに変更なく CI チェックが全て green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 本機能の実装が完了した状態
**WHEN** `bun test`、`bun run typecheck`、`bun run lint`、`bun run build` を実行する
**THEN** 既存テストが変更なしで全て green、typecheck・lint エラーなし、build 成功

---

## Result

```yaml
result: completed
total: 39
automated: 34
manual: 5
must: 30
should: 8
could: 1
blocked_reasons: []
```
