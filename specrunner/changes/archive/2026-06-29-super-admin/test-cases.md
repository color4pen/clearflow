# Test Cases: スーパー管理者による組織プロビジョニング

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

- **Total**: 37 cases
- **Automated** (unit/integration): 29
- **Manual**: 8
- **Priority**: must: 32, should: 5, could: 0

---

## Group 1: isSuperAdmin 判定

### TC-001: 登録済みメールアドレスで isSuperAdmin が true を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isSuperAdmin 判定 > Scenario: 登録済みメールアドレスで判定

---

### TC-002: 大文字小文字を無視して isSuperAdmin が true を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isSuperAdmin 判定 > Scenario: 大文字小文字を無視して判定

---

### TC-003: 未登録メールアドレスで isSuperAdmin が false を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isSuperAdmin 判定 > Scenario: 未登録メールアドレスで判定

---

### TC-004: 環境変数が未設定のとき isSuperAdmin が false を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isSuperAdmin 判定 > Scenario: 環境変数が未設定の場合

---

### TC-005: null/undefined 入力で isSuperAdmin が false を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isSuperAdmin 判定 > Scenario: null/undefined 入力

---

### TC-006: SUPER_ADMIN_EMAILS が空文字列のとき全メールに false を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** `SUPER_ADMIN_EMAILS` が `""` （空文字列）に設定されている
**WHEN** `isSuperAdmin("anyone@example.com")` を呼び出す
**THEN** `false` が返る

---

### TC-007: カンマ区切りで複数メール登録した場合それぞれに true を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** `SUPER_ADMIN_EMAILS` が `"a@example.com,b@example.com"` に設定されている
**WHEN** `isSuperAdmin("a@example.com")` および `isSuperAdmin("b@example.com")` を各々呼び出す
**THEN** どちらも `true` が返る

---

### TC-008: メールアドレスの前後スペースを trim して判定する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** `SUPER_ADMIN_EMAILS` が `" admin@example.com , ops@example.com "` に設定されている
**WHEN** `isSuperAdmin("admin@example.com")` を呼び出す
**THEN** `true` が返る（trim 後に一致）

---

## Group 2: AuditAction ドメインモデル

### TC-009: AuditAction 型に "organization.create" が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/auditLog.ts` の `AuditAction` 型定義
**WHEN** `"organization.create"` を `AuditAction` 型として使用する
**THEN** 型エラーが発生せず、既存の `AuditAction` 値に影響しない

---

## Group 3: organizationRepository

### TC-010: create が組織を作成して DB 生成 id を含む Organization を返す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** DB に接続済みで `{ name: "TestOrg" }` を用意する
**WHEN** `organizationRepository.create({ name: "TestOrg" })` を呼び出す
**THEN** DB に organizations レコードが挿入され、戻り値に DB が生成した `id`・`name`・`createdAt` が含まれる

---

### TC-011: create がトランザクション引数に対応する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `db.transaction` コールバック内で `tx` オブジェクトが存在する
**WHEN** `organizationRepository.create({ name: "TxOrg" }, tx)` を呼び出した後にトランザクションをロールバックする
**THEN** organizations テーブルに該当レコードが存在しない（トランザクションに参加できている）

---

### TC-012: findAll が全組織のメタ情報を返す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** DB に組織 A・組織 B が存在する
**WHEN** `organizationRepository.findAll()` を呼び出す
**THEN** 組織 A・組織 B の `{ id, name, createdAt }` を含む配列が返り、業務テーブル（users 等）は JOIN されない

---

### TC-013: findAll が createdAt 降順で組織を返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** DB に異なる `created_at` を持つ組織 X（古）・組織 Y（新）が存在する
**WHEN** `organizationRepository.findAll()` を呼び出す
**THEN** 組織 Y が配列先頭、組織 X が後になる（降順）

---

### TC-014: findAll が業務データテーブルを JOIN しない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** DB に組織と複数の users レコードが存在する
**WHEN** `organizationRepository.findAll()` を呼び出す
**THEN** 戻り値の各要素は `{ id, name, createdAt }` のみで、users 件数・deal 件数等は含まれない

---

## Group 4: provisionOrganization ユースケース

### TC-015: 正常な組織プロビジョニングで組織と初期 admin が作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 組織プロビジョニング > Scenario: 正常な組織プロビジョニング

---

### TC-016: 既存メールアドレスとの重複時にトランザクション全体がロールバックされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 組織プロビジョニング > Scenario: 既存メールアドレスとの重複

---

### TC-017: 非スーパー管理者が provisionOrganization Server Action を直接呼び出すと権限エラーが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 組織プロビジョニング > Scenario: 非スーパー管理者が provisionOrganization Server Action を呼び出す

---

### TC-018: 組織作成時に organization.create 監査ログが同一トランザクション内で記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 組織プロビジョニングの監査ログ > Scenario: 監査ログの記録

---

### TC-019: トランザクション内の任意ステップで失敗した場合に全てロールバックされる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `provisionOrganization` usecase 内の `userRepository.create` がエラーをスローするようモックされている
**WHEN** `provisionOrganization` を呼び出す
**THEN** organizations テーブルにも audit_logs テーブルにもレコードが残らない

---

### TC-020: DB unique 制約違反（23505）をキャッチして ok:false を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `userRepository.create` が PostgreSQL error code `23505` の例外をスローするようモックされている
**WHEN** `provisionOrganization` を呼び出す
**THEN** `{ ok: false, reason: <エラーメッセージ文字列> }` が返り、例外が呼び出し元に伝播しない

---

## Group 5: listAllOrganizations ユースケース

### TC-021: 全組織一覧を取得するとメタ情報のみが返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全組織一覧 > Scenario: 全組織一覧の取得

---

### TC-022: 非スーパー管理者が listAllOrganizations Server Action を直接呼び出すと権限エラーが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 全組織一覧 > Scenario: 非スーパー管理者が一覧取得を試みる

---

## Group 6: platform Server Action

### TC-023: provisionOrganizationAction は未認証時にエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** `auth()` が `null`（未認証セッション）を返すようモックされている
**WHEN** `provisionOrganizationAction` を任意の入力で呼び出す
**THEN** 認証エラーが返り、usecase は呼ばれない

---

### TC-024: provisionOrganizationAction は非スーパー管理者にエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** `auth()` が認証済みセッションを返し、`isSuperAdmin` が `false` を返すようモックされている
**WHEN** `provisionOrganizationAction` を呼び出す
**THEN** 権限エラーが返り、usecase は呼ばれない

---

### TC-025: provisionOrganizationAction は zod 検証失敗時にバリデーションエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** スーパー管理者として認証済みで、`adminPassword` が 7 文字（最小 8 文字未満）の入力を用意する
**WHEN** `provisionOrganizationAction` を呼び出す
**THEN** zod バリデーションエラーを含むエラーレスポンスが返り、usecase は呼ばれない

---

### TC-026: provisionOrganizationAction は organizationId を入力から受け取らない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `provisionOrganizationAction` の zod スキーマ定義
**WHEN** スキーマの入力フィールド一覧を確認する
**THEN** `organizationId` フィールドが入力スキーマに存在せず、usecase 呼び出し時に DB 生成値または `session.user.id` を使用している

---

### TC-027: listAllOrganizationsAction は未認証時にエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** `auth()` が `null`（未認証セッション）を返すようモックされている
**WHEN** `listAllOrganizationsAction` を呼び出す
**THEN** 認証エラーが返り、usecase は呼ばれない

---

### TC-028: listAllOrganizationsAction は非スーパー管理者にエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** `auth()` が認証済みセッションを返し、`isSuperAdmin` が `false` を返すようモックされている
**WHEN** `listAllOrganizationsAction` を呼び出す
**THEN** 権限エラーが返り、usecase は呼ばれない

---

### TC-029: platform.ts の Server Action は canPerform を使用しない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `src/app/actions/platform.ts` の実装
**WHEN** 権限チェックの実装を確認する
**THEN** `canPerform` の呼び出しが存在せず、`isSuperAdmin` のみでゲートされている

---

## Group 7: /platform ルートアクセス制御

### TC-030: スーパー管理者が /platform にアクセスするとプラットフォーム管理画面が表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: プラットフォームルートのアクセス制御 > Scenario: スーパー管理者がアクセス

---

### TC-031: 一般 admin が /platform にアクセスするとアクセス拒否される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: プラットフォームルートのアクセス制御 > Scenario: 一般 admin がアクセス

---

### TC-032: 未認証ユーザーが /platform にアクセスするとログインページにリダイレクトされる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: プラットフォームルートのアクセス制御 > Scenario: 未認証ユーザーがアクセス

---

## Group 8: テナント分離の維持

### TC-033: 新規追加コードにテナント横断の業務データアクセスがない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: テナント分離の維持 > Scenario: 新規追加コードにテナント横断の業務データアクセスがない

---

## Group 9: 最終検証

### TC-034: bun run typecheck が通る

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** 本変更の全コードが実装済み
**WHEN** `bun run typecheck` を実行する
**THEN** 型エラーがゼロで終了する

---

### TC-035: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** 本変更の全コードが実装済み
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーがなく正常終了する

---

### TC-036: bun test で既存テスト含め全 green になる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** 本変更の全コードと新規テストファイルが実装済み
**WHEN** `bun test` を実行する
**THEN** 全テストが pass し、既存テストの失敗がゼロである

---

### TC-037: 既存テストファイルが無変更である

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** 本変更のコミット差分
**WHEN** 変更ファイル一覧を確認する
**THEN** `src/__tests__/` 配下の既存ファイルは変更されておらず、新規追加ファイルのみが存在する

---

## Result

```yaml
result: completed
total: 37
automated: 29
manual: 8
must: 32
should: 5
could: 0
blocked_reasons: []
```
