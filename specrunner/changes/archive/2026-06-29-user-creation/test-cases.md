# Test Cases: 管理者によるユーザー作成

## Summary

- **Total**: 23 cases
- **Automated** (unit/integration): 19
- **Manual**: 4
- **Priority**: must: 16, should: 7, could: 0

---

## userRepository.create

### TC-001: ユーザーが正常に作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: userRepository.create がユーザーをテナントに紐づけて永続化する > Scenario: ユーザーが正常に作成される

---

### TC-002: email が既存ユーザーと重複する場合

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: userRepository.create がユーザーをテナントに紐づけて永続化する > Scenario: email が既存ユーザーと重複する場合

---

### TC-016: userRepository.create が tx パラメータを受け入れトランザクション内で実行する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/userRepository.ts` の `create` 関数の実装コード
**WHEN** 関数シグネチャと内部の実行コンテキストを確認する
**THEN** `tx?: Transaction` 引数が定義されており、`tx ?? db` パターンでクエリが実行される

---

## createUser usecase

### TC-003: 正常にユーザーが作成される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createUser usecase がユーザー作成のオーケストレーションを行う > Scenario: 正常にユーザーが作成される

---

### TC-004: email が重複する場合

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createUser usecase がユーザー作成のオーケストレーションを行う > Scenario: email が重複する場合

---

### TC-005: パスワードが bcryptjs でハッシュされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createUser usecase がユーザー作成のオーケストレーションを行う > Scenario: パスワードが bcryptjs でハッシュされる

---

### TC-006: 監査ログがトランザクション内で記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createUser usecase がユーザー作成のオーケストレーションを行う > Scenario: 監査ログがトランザクション内で記録される

---

### TC-017: createUser usecase が DB UNIQUE 制約エラー 23505 を email 重複メッセージに変換する

**Category**: unit
**Priority**: should
**Source**: design.md > D2 / tasks.md > T-04

**GIVEN** `src/application/usecases/createUser.ts` の実装コード
**WHEN** PostgreSQL UNIQUE 制約違反（エラーコード `23505`）が発生するパスのエラーハンドリングを確認する
**THEN** エラーコード `23505` を捕捉して email 重複を示すドメインエラーメッセージ（`{ ok: false, reason: "..." }`）に変換するコードが存在する

---

## ドメインモデル・認可

### TC-007: user.create が AuditAction 型に存在する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: AuditAction 型に "user.create" が含まれる > Scenario: user.create が AuditAction 型に存在する

---

### TC-022: AuditTargetType が変更されない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `src/domain/models/auditLog.ts` のソースコード
**WHEN** `AuditTargetType` 型定義を確認する
**THEN** `"user.create"` 追加前から存在する `"user"` が引き続き含まれており、既存メンバーに変更がない

---

### TC-008: admin のみ createUser が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: organization エンティティに createUser 認可が定義される > Scenario: admin のみ createUser が許可される

---

### TC-009: admin 以外は createUser が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: organization エンティティに createUser 認可が定義される > Scenario: admin 以外は createUser が拒否される

---

## createUserAction Server Action

### TC-010: 認証されていないユーザーからの呼び出し

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createUserAction が認証・認可・入力検証を行う > Scenario: 認証されていないユーザーからの呼び出し

---

### TC-011: admin 以外のロールからの呼び出し

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createUserAction が認証・認可・入力検証を行う > Scenario: admin 以外のロールからの呼び出し

---

### TC-012: 入力バリデーション失敗（email 形式不正）

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: createUserAction が認証・認可・入力検証を行う > Scenario: 入力バリデーション失敗

---

### TC-013: 正常に作成される（createUserAction）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createUserAction が認証・認可・入力検証を行う > Scenario: 正常に作成される

---

### TC-018: createUserAction が organizationId と actorId をセッションから取得する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/app/actions/users.ts` の `createUserAction` 実装コード
**WHEN** `organizationId` と `actorId` の取得元を確認する
**THEN** `formData` からではなく、`auth()` から取得したセッションオブジェクトから `organizationId` と `actorId` を参照している

---

### TC-019: createUserAction の zod スキーマが name・role・password を検証する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `src/app/actions/users.ts` に定義された `createUserSchema`
**WHEN** `name`・`role`・`password` のバリデーションルールを確認する
**THEN** `name` が `z.string().min(1, ...)` として、`role` が `z.enum([...])` として、`password` が `z.string().min(8, ...)` として定義されている

---

## CreateUserForm クライアントコンポーネント

### TC-020: CreateUserForm が useActionState で createUserAction を呼び出す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/app/(dashboard)/settings/users/CreateUserForm.tsx` の実装コード
**WHEN** `useActionState` の使用箇所を確認する
**THEN** `useActionState` の第一引数に `createUserAction` が渡されており、`"use client"` ディレクティブが先頭に存在する

---

## UI・統合

### TC-014: 管理者がユーザー作成フォームを使用する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: settings/users 画面にユーザー作成フォームが表示される > Scenario: 管理者がユーザー作成フォームを使用する

---

### TC-015: 作成時にエラーが発生した場合

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: settings/users 画面にユーザー作成フォームが表示される > Scenario: 作成時にエラーが発生した場合

---

### TC-021: settings/users ページの既存機能が CreateUserForm 追加後も正常動作する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** admin ロールのユーザーが settings/users ページにアクセスしている
**WHEN** ユーザー一覧の表示と各ユーザーのロール変更操作を行う
**THEN** 既存のユーザー一覧が正常に表示され、UserRoleSelect によるロール変更が `CreateUserForm` 追加前と同様に動作する

---

## ビルド・型チェック

### TC-023: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01 〜 T-08（全タスク共通受け入れ基準）

**GIVEN** 全変更（T-01〜T-07）が実装済みである
**WHEN** `bun run build` を実行する
**THEN** TypeScript コンパイルエラーおよびビルドエラーがなく正常終了する

---

## Result

```yaml
result: completed
total: 23
automated: 19
manual: 4
must: 16
should: 7
could: 0
blocked_reasons: []
```
