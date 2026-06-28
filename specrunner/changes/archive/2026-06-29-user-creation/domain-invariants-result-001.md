# Domain-Invariants Review Result — user-creation — iter 1

## Reviewer
domain-invariants

## Purpose
テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

## Verdict

- **verdict**: approved

---

## Review Summary

変更は既存パターンに沿ったユーザー作成の書き込み経路1本の追加であり、ドメイン不変条件の違反は検出されなかった。以下に各不変条件の検証結果を示す。

---

## Findings

### [PASS] テナント分離の保証

**検証対象**: 作成されたユーザーが操作者と同一の組織に属することの強制

- `createUserAction` (`src/app/actions/users.ts:47-54`) で `organizationId` は `session.user.organizationId` から取得される。フォームの `FormData` からは受け取らない。テナント偽装を構造的に排除している。
- `userRepository.create` はすべての INSERT に `organizationId` を必須パラメータとして受け取り、`NOT NULL` FK 制約のある `organization_id` カラムに書き込む。
- `email` の重複チェック (`findByEmailForAuth`) はグローバル検索だが、`users.email` スキーマが `UNIQUE` でテナント非限定の一意性制約を持つため、これは意図的かつ整合した設計。

**判定**: 不変条件を満たしている。

---

### [PASS] 監査ログの完全性

**検証対象**: ユーザー作成操作が監査ログに漏れなく記録されること

- `AuditAction` 型ユニオンに `"user.create"` が追加されている (`src/domain/models/auditLog.ts:49`)。型カタログが更新済み。
- `createUser` usecase (`src/application/usecases/createUser.ts:43-52`) で `recordAudit` が `db.transaction` のコールバック内で呼び出される。
  - `action: "user.create"` ✅
  - `targetType: "user"` ✅（既存 AuditTargetType を使用）
  - `targetId: createdUser.id`（作成されたユーザーのIDが記録される）✅
  - `organizationId: data.organizationId`（セッション由来のテナントIDが記録される）✅
  - `actorId: data.actorId`（操作者のIDが記録される）✅
- `userRepository.create` と `recordAudit` が同一トランザクションで実行される。ユーザー作成失敗時は監査ログも記録されない（原子性が保証されている）。

**判定**: 不変条件を満たしている。

---

### [PASS] 承認ワークフローの不変条件への影響なし

**検証対象**: 既存の承認フローが破壊されていないこと

- 変更は `users` テーブルへの INSERT 追加のみ。既存の `approval`、`approvalSettings`、`request`、`approvalSteps` テーブルへの変更は一切ない。
- `role` 型として渡せる値は zod schema (`z.enum(["admin", "member", "manager", "finance"])`) で制約されており、新しいロール値は導入されていない。既存の承認ポリシー・委任のロール判定ロジックへの影響はない。
- 依存方向 `actions → usecases → domain / infrastructure` を遵守しており、domain layer が永続化を知らないアーキテクチャ不変条件も維持されている。

**判定**: 承認ワークフローの不変条件は侵害されていない。

---

### [PASS] 認可不変条件（ADMIN_ONLY の強制）

**検証対象**: admin 以外はユーザーを作成できないこと

- `authorization.ts` の `PERMISSION_MATRIX.organization.createUser` が `ADMIN_ONLY` として定義されている。
- `createUserAction` で `canPerform(session.user.role, "organization", "createUser")` による認可チェックが実施される（ページレベルの admin ガードとの二重防御）。
- authorization.test.ts に manager / finance / member が `false` を返すことの回帰テストが存在する。
- フォームの role select に `admin` 選択肢が含まれるが、Server Action レベルの認可ガードにより非 admin ユーザーはそもそも createUserAction を実行できない。

**判定**: 不変条件を満たしている。

---

### [PASS] email 一意性の二段防御

**検証対象**: 重複 email によるデータ整合性の破壊がないこと

- 事前チェック: `userRepository.findByEmailForAuth(data.email)` で既存ユーザーを確認し、重複時は早期リターン。
- 最終防衛線: DB の UNIQUE 制約 (`users.email`) が TOCTOU 競合に対して機能する。
- 競合時の PostgreSQL エラーコード `23505` を捕捉し、ユーザー向けエラーメッセージに変換している。データ整合性とユーザー体験の両方が守られている。

**判定**: 不変条件を満たしている。

---

### [PASS] パスワードハッシュの一貫性

**検証対象**: 作成したパスワードで認証フローが成立すること

- `bcrypt.hash(data.password, 12)` — salt round 12 を使用。既存の `seed.ts` および `auth.ts` の認証フロー（`bcrypt.compare`）と同一ライブラリ・同一パラメータ。認証互換性が保証されている。

**判定**: 不変条件を満たしている。

---

## 観察事項（改善不要）

1. **静的コード解析ベースのテスト**: テストはソースコードを文字列解析する方式で、実際の DB 動作を確認しない。これは既存プロジェクトのテストパターンと一致しており、受け入れ基準の範囲内。
2. **管理者によるユーザー作成ロール選択**: admin が admin ロールのユーザーを作成できるが、これは設計判断 D4 で明示的に承認済みの動作。

---

## Scope
- `src/domain/models/auditLog.ts` — AuditAction 追加
- `src/domain/authorization.ts` — createUser 認可追加
- `src/application/usecases/createUser.ts` — usecase 新設
- `src/infrastructure/repositories/userRepository.ts` — create メソッド追加
- `src/app/actions/users.ts` — createUserAction 追加
- `src/app/(dashboard)/settings/users/CreateUserForm.tsx` — UI 追加
- `src/__tests__/` — テスト追加
