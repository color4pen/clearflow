# Test Cases: アカウント設定（プロフィール編集・パスワード変更）

<!-- FORMAT REQUIREMENTS:
Test Case heading format: `### TC-{NNN}: {Name}` (3-digit zero-padded, e.g. TC-001)

Required fields per test case:
  **Category**: unit | integration | manual
  **Priority**: must | should | could
  **Source**: reference to spec Scenario (spec.md > Requirement: <name> > Scenario: <name>) or design.md / tasks.md section

GIVEN/WHEN/THEN structure (mixed format — depends on TC type):
  Scenario 由来 TC (Source = spec.md > Requirement: <name> > Scenario: <name>):
    GWT は記述しない。Source 参照のみ。behavior の正典は spec の Scenario。
  非 Scenario 由来 TC (Source = design.md or tasks.md section):
    GWT は必須:
    **GIVEN** <preconditions>
    **WHEN** <action>
    **THEN** <expected result>

Category determination:
  unit        — pure logic, validation, helper functions (automated)
  integration — DB operations, API endpoints, multi-module interaction (automated)
  manual      — UI/UX confirmation, visual verification, build artifact check (not automated)

Priority determination:
  must   — core functionality; if broken, the feature does not work
  should — important but core still works; edge cases, error handling
  could  — nice to have; performance, UX details

Summary section MUST appear immediately after the title with ALL 4 items:
  ## Summary
  - **Total**: {count} cases
  - **Automated** (unit/integration): {count}
  - **Manual**: {count}
  - **Priority**: must: {count}, should: {count}, could: {count}

Result section MUST appear at the very end as a YAML code block:
  ## Result
  ```yaml
  result: completed | partial | failed
  total: {count}
  automated: {count}
  manual: {count}
  must: {count}
  should: {count}
  could: {count}
  blocked_reasons: []
  ```

  result determination:
    completed — all testable behaviors are documented
    partial   — some cases could not be derived due to design ambiguity
    failed    — spec is absent AND design.md / tasks.md are also missing
-->

## Summary

- **Total**: 28 cases
- **Automated** (unit/integration): 27
- **Manual**: 1
- **Priority**: must: 24, should: 4, could: 0

---

## プロフィール編集

### TC-001: member ロールが表示名を変更する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 本人が自分の表示名を変更できる > Scenario: member ロールのユーザーが表示名を変更する

---

### TC-002: 他ユーザーの表示名に影響しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 本人が自分の表示名を変更できる > Scenario: 他ユーザーの表示名には影響しない

---

## パスワード変更

### TC-003: 正しい現在パスワードでパスワード変更が成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: パスワード変更は現在パスワード照合に成功した場合のみ実行される > Scenario: 正しい現在パスワードでパスワード変更が成功する

---

### TC-004: 誤った現在パスワードでパスワード変更が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: パスワード変更は現在パスワード照合に成功した場合のみ実行される > Scenario: 誤った現在パスワードでパスワード変更が拒否される

---

### TC-005: パスワード変更成功時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: パスワード変更時に user.updatePassword 監査ログが記録される > Scenario: パスワード変更成功時に監査ログが記録される

---

### TC-006: changeOwnPassword が bcrypt.hash(newPassword, 12) でハッシュする

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/application/usecases/changeOwnPassword.ts` のソースコード
**WHEN** ハッシュ処理のコードを検査する
**THEN** `bcrypt.hash(newPassword, 12)` が呼ばれており、salt round が 12 であることが確認できる

---

### TC-007: changeOwnPassword が db.transaction 内で updatePassword と recordAudit を実行する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/application/usecases/changeOwnPassword.ts` のソースコード
**WHEN** トランザクション処理のコードを検査する
**THEN** `db.transaction` のコールバック内に `updatePassword` と `recordAudit` の両方の呼び出しが存在する

---

### TC-008: changeOwnPassword の recordAudit actorId と targetId が共に userId である

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/application/usecases/changeOwnPassword.ts` の `recordAudit` 呼び出し箇所
**WHEN** 引数オブジェクトを検査する
**THEN** `action === "user.updatePassword"`、`actorId === userId`、`targetId === userId` となっている

---

## 安全 Projection 維持

### TC-009: findById が hashedPassword を含まない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: findById の安全 projection が維持される > Scenario: findById が hashedPassword を含まない

---

### TC-010: findByIdForAuth が hashedPassword を含むレコードを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/repositories/userRepository.ts` の `findByIdForAuth` 関数
**WHEN** select オブジェクトおよび返却型を検査する
**THEN** `hashedPassword` フィールドを含む `UserWithPassword` 型が返される

---

### TC-011: findByIdForAuth の WHERE が (id, organizationId) で絞られている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/repositories/userRepository.ts` の `findByIdForAuth` 関数
**WHEN** WHERE 条件を検査する
**THEN** `id` と `organizationId` の両方が `and(eq(...), eq(...))` で絞られている

---

## Domain Model

### TC-012: AuditAction に "user.updatePassword" が追加される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/domain/models/auditLog.ts` の `AuditAction` 型定義
**WHEN** union を検査する
**THEN** `"user.updatePassword"` が含まれており、既存の `"user.create"` / `"user.updateRole"` が維持されている

---

## Repository Layer

### TC-013: updateProfile の WHERE に id と organizationId が両方含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/userRepository.ts` の `updateProfile` 関数
**WHEN** WHERE 条件を検査する
**THEN** `id` と `organizationId` の両方が `and(eq(...), eq(...))` で絞られている

---

### TC-014: updateProfile の returning が hashedPassword を含まない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/userRepository.ts` の `updateProfile` 関数
**WHEN** `.returning()` の projection を検査する
**THEN** `hashedPassword` フィールドが `returning` に含まれていない（安全 projection を踏襲）

---

### TC-015: updatePassword の WHERE に id と organizationId が両方含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/userRepository.ts` の `updatePassword` 関数
**WHEN** WHERE 条件を検査する
**THEN** `id` と `organizationId` の両方が `and(eq(...), eq(...))` で絞られている

---

### TC-016: updatePassword が returning で更新有無を判定し boolean を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/userRepository.ts` の `updatePassword` 関数
**WHEN** 戻り値の生成ロジックを検査する
**THEN** `.returning({ id: users.id })` の結果長（`result.length > 0`）で `boolean` を返している

---

## Usecase Layer

### TC-017: updateOwnProfile usecase が recordAudit を呼び出さない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `src/application/usecases/updateOwnProfile.ts` のソースコード
**WHEN** インポートおよび関数呼び出しを検査する
**THEN** `recordAudit` の呼び出しが存在しない

---

### TC-018: usecase index.ts に updateOwnProfile / changeOwnPassword が export される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05, T-06

**GIVEN** `src/application/usecases/index.ts` のソースコード
**WHEN** export 文を検査する
**THEN** `updateOwnProfile` と `changeOwnPassword` がそれぞれ named export されている

---

## Server Action Layer

### TC-019: account.ts が usecase 経由で処理する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Server Action は依存方向を遵守する > Scenario: account.ts が usecase 経由で処理する

---

### TC-020: account.ts に "use server" ディレクティブがある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/app/actions/account.ts` のソースコード
**WHEN** ファイル先頭を検査する
**THEN** `"use server"` ディレクティブが記述されている

---

### TC-021: Server Action が canPerform を使用しない（全ロール許可）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/app/actions/account.ts` のソースコード
**WHEN** 認可ロジックを検査する
**THEN** `canPerform` の呼び出しが存在しない

---

### TC-022: Server Action が session.user.id を使用し、入力から userId を受け取らない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07 (design.md > D1)

**GIVEN** `src/app/actions/account.ts` のソースコード
**WHEN** userId の取得ロジックを検査する
**THEN** `userId` は `session.user.id` から取得され、`FormData` や関数引数から `userId` を直接受け取るコードが存在しない

---

### TC-023: zod バリデーション — name は min(1) が設定されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/app/actions/account.ts` の `updateOwnProfileAction` zod スキーマ定義
**WHEN** スキーマを検査する
**THEN** `name` フィールドに `z.string().min(1)` が設定されている

---

### TC-024: zod バリデーション — newPassword は min(8) が設定されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/app/actions/account.ts` の `changeOwnPasswordAction` zod スキーマ定義
**WHEN** スキーマを検査する
**THEN** `newPassword` フィールドに `z.string().min(8)` が設定されている

---

## UI / Route Layer

### TC-025: member ロールが /account にアクセスできる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: アカウント設定は全ロールから到達・操作できる > Scenario: member ロールが /account にアクセスできる

---

### TC-026: /account ページに role ガードによるリダイレクトがない（全ロール到達可能）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/app/(dashboard)/account/page.tsx` のソースコード
**WHEN** 認証・認可ロジックを検査する
**THEN** `role !== "admin"` 等のロール条件によるリダイレクト処理が存在しない

---

### TC-027: SidebarNav に /account が adminOnly 無しで含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/app/(dashboard)/SidebarNav.tsx` の `navItems` 配列
**WHEN** `/account` エントリを検査する
**THEN** `{ href: "/account", label: "アカウント" }` が存在し、`adminOnly` プロパティが設定されていない

---

## Build / Regression

### TC-028: ビルド・全テスト green（既存テスト無変更）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** 全タスク（T-01〜T-10）の実装完了後
**WHEN** `bun run typecheck`、`bun run lint`、`bun test`、`bun run build` を順に実行する
**THEN** 全コマンドがエラーなしで完了し、既存テストが変更されていない

---

## Result

```yaml
result: completed
total: 28
automated: 27
manual: 1
must: 24
should: 4
could: 0
blocked_reasons: []
```
