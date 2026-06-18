# Test Cases: 管理画面（テンプレートCRUD・ユーザー管理）

## Summary

- **Total**: 49 cases
- **Automated** (unit/integration): 37
- **Manual**: 12
- **Priority**: must: 16, should: 30, could: 3

---

## A. 認証・認可

### TC-001: admin ロールのユーザーがテンプレートを作成できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: テンプレート CRUD は admin ロールのみ実行可能 > Scenario: admin ロールのユーザーがテンプレートを作成する

---

### TC-002: admin 以外のロールのユーザーがテンプレートを作成できない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: テンプレート CRUD は admin ロールのみ実行可能 > Scenario: member ロールのユーザーがテンプレートを作成しようとする

---

### TC-003: admin がユーザーのロールを変更できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: ユーザーロール変更は admin ロールのみ実行可能 > Scenario: admin がユーザーのロールを変更する

---

### TC-004: admin 以外がユーザーのロールを変更できない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: ユーザーロール変更は admin ロールのみ実行可能 > Scenario: member がユーザーのロールを変更しようとする

---

### TC-005: admin が自分自身のロールを変更できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 自分自身のロール変更を禁止する > Scenario: admin が自分自身のロールを変更しようとする

---

### TC-006: updateTemplateAction のソースに admin ガードが含まれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/templates.ts` のソースコードを読み込む
**WHEN** `updateTemplateAction` 関数のソースを解析する
**THEN** `session.user.role !== "admin"` に相当するガード文が含まれている

---

### TC-007: deleteTemplateAction のソースに admin ガードが含まれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/templates.ts` のソースコードを読み込む
**WHEN** `deleteTemplateAction` 関数のソースを解析する
**THEN** `session.user.role !== "admin"` に相当するガード文が含まれている

---

### TC-008: listUsersAction のソースに admin ガードが含まれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `src/app/actions/users.ts` のソースコードを読み込む
**WHEN** `listUsersAction` 関数のソースを解析する
**THEN** `session.user.role !== "admin"` に相当するガード文が含まれている

---

### TC-009: settings layout が admin 以外のユーザーを /requests にリダイレクトする

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** `src/app/(dashboard)/settings/layout.tsx` が存在し、セッションユーザーのロールが `member` である
**WHEN** `/settings/*` 配下の任意のページにアクセスする
**THEN** `redirect("/requests")` が呼び出され、`/requests` にリダイレクトされる

---

## B. テンプレート削除・使用中チェック

### TC-010: pending リクエストが存在しないテンプレートを削除できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: テンプレート削除は使用中チェックを実施する > Scenario: pending リクエストが存在しないテンプレートを削除する

---

### TC-011: pending リクエストが存在するテンプレートの削除が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: テンプレート削除は使用中チェックを実施する > Scenario: pending リクエストが存在するテンプレートを削除しようとする

---

### TC-012: existsPendingByTemplateId が audit_logs と requests テーブルを JOIN する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/requestRepository.ts` のソースコードを読み込む
**WHEN** `existsPendingByTemplateId` メソッドのソースを解析する
**THEN** `audit_logs` と `requests` の両テーブルへの参照、および `audit_logs.metadata` から `templateId` を参照するクエリが含まれている

---

### TC-013: existsPendingByTemplateId が organizationId 条件を含む

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/requestRepository.ts` のソースコードを読み込む
**WHEN** `existsPendingByTemplateId` メソッドのソースを解析する
**THEN** WHERE 条件に `organizationId` が含まれている

---

### TC-014: deleteTemplate usecase が使用中チェックを deleteById より先に実行する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/application/usecases/deleteTemplate.ts` のソースコードを読み込む
**WHEN** ソース内の `existsPendingByTemplateId` と `deleteById` の呼び出し順序を解析する
**THEN** `existsPendingByTemplateId` の呼び出しが `deleteById` の呼び出しより先に記述されている

---

## C. テンプレート Repository

### TC-015: approvalTemplateRepository.create が organizationId 条件を含む

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/repositories/approvalTemplateRepository.ts` のソースコードを読み込む
**WHEN** `create` メソッドのソースを解析する
**THEN** INSERT 値に `organizationId` が含まれている

---

### TC-016: approvalTemplateRepository.updateById が organizationId 条件を含む

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/repositories/approvalTemplateRepository.ts` のソースコードを読み込む
**WHEN** `updateById` メソッドのソースを解析する
**THEN** WHERE 条件に `organizationId` が含まれている

---

### TC-017: approvalTemplateRepository.deleteById が organizationId 条件を含む

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/repositories/approvalTemplateRepository.ts` のソースコードを読み込む
**WHEN** `deleteById` メソッドのソースを解析する
**THEN** WHERE 条件に `organizationId` が含まれている

---

## D. ユーザー Repository

### TC-018: userRepository.findByOrganization が organizationId 条件付きで User[] を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/repositories/userRepository.ts` のソースコードを読み込む
**WHEN** `findByOrganization` メソッドのソースを解析する
**THEN** WHERE 条件に `organizationId` が含まれており、戻り値の型が `User[]` である

---

### TC-019: userRepository.findByOrganization の返却値に hashedPassword が含まれない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/repositories/userRepository.ts` のソースコードを読み込む
**WHEN** `findByOrganization` メソッドの SELECT 句またはマッピングを解析する
**THEN** `hashedPassword` カラムが SELECT 対象から除外されている

---

### TC-020: userRepository.updateRole が organizationId 条件付きで更新する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/repositories/userRepository.ts` のソースコードを読み込む
**WHEN** `updateRole` メソッドのソースを解析する
**THEN** WHERE 条件に `organizationId` が含まれており、`role` カラムが更新される

---

## E. テナント分離

### TC-021: テンプレート一覧が自組織のみ返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: テナント分離 — 全クエリに organizationId 条件を付与する > Scenario: テンプレート一覧が自組織のみ返る

---

### TC-022: ユーザー一覧が自組織のみ返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: テナント分離 — 全クエリに organizationId 条件を付与する > Scenario: ユーザー一覧が自組織のみ返る

---

### TC-023: createTemplateAction が organizationId をセッションから取得する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/templates.ts` のソースコードを読み込む
**WHEN** `createTemplateAction` のソースを解析する
**THEN** `session.user.organizationId` を参照しており、organizationId を引数・フォームデータから受け取っていない

---

### TC-024: updateUserRoleAction が organizationId をセッションから取得する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `src/app/actions/users.ts` のソースコードを読み込む
**WHEN** `updateUserRoleAction` のソースを解析する
**THEN** `session.user.organizationId` を参照しており、organizationId を引数・フォームデータから受け取っていない

---

## F. 監査ログ

### TC-025: テンプレート作成時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 監査ログの記録 > Scenario: テンプレート作成時に監査ログが記録される

---

### TC-026: ユーザーロール変更時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 監査ログの記録 > Scenario: ユーザーロール変更時に監査ログが記録される

---

### TC-027: updateTemplate usecase がトランザクション内で監査ログを記録する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `src/application/usecases/updateTemplate.ts` のソースコードを読み込む
**WHEN** ソース内のトランザクション処理と `auditLogRepository.create` の呼び出しを解析する
**THEN** `auditLogRepository.create` がトランザクションコールバック内で呼び出されており、`action` に `'template.update'` が含まれている

---

### TC-028: deleteTemplate usecase がトランザクション内で監査ログを記録する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `src/application/usecases/deleteTemplate.ts` のソースコードを読み込む
**WHEN** ソース内のトランザクション処理と `auditLogRepository.create` の呼び出しを解析する
**THEN** `auditLogRepository.create` がトランザクションコールバック内で呼び出されており、`action` に `'template.delete'` が含まれている

---

### TC-029: updateUserRole の監査ログ metadata に oldRole と newRole が含まれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `src/application/usecases/updateUserRole.ts` のソースコードを読み込む
**WHEN** `auditLogRepository.create` 呼び出し箇所の metadata 引数を解析する
**THEN** metadata に `oldRole` と `newRole` の両方が含まれている

---

## G. バリデーション

### TC-030: 空のステップ配列でテンプレートを作成しようとするとバリデーションエラーになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: テンプレートフォームのバリデーション > Scenario: 空のステップ配列でテンプレートを作成しようとする

---

### TC-031: minAmount > maxAmount でテンプレートを作成しようとするとバリデーションエラーになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: テンプレートフォームのバリデーション > Scenario: minAmount > maxAmount でテンプレートを作成しようとする

---

### TC-032: テンプレート名が空文字の場合にバリデーションエラーになる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/templates.ts` の zod スキーマ（templateSchema）が定義されている
**WHEN** `name: ""` を含む入力で createTemplateAction を実行する
**THEN** zod バリデーションエラーが返り、テンプレートは作成されない

---

### TC-033: updateUserRoleAction の role が enum 外の値の場合にエラーを返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `src/app/actions/users.ts` の zod スキーマが定義されている
**WHEN** `role: "superadmin"` など定義外の値で updateUserRoleAction を実行する
**THEN** zod バリデーションエラーが返り、ロールは更新されない

---

### TC-034: updateUserRoleAction の userId が UUID 形式でない場合にエラーを返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `src/app/actions/users.ts` の zod スキーマが定義されている
**WHEN** `userId: "not-a-uuid"` で updateUserRoleAction を実行する
**THEN** zod バリデーションエラーが返り、ロールは更新されない

---

### TC-035: deadlineHours に負の値を指定した場合にバリデーションエラーになる

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/templates.ts` の zod スキーマが定義されている
**WHEN** 承認ステップの `deadlineHours: -1` を含む入力で createTemplateAction を実行する
**THEN** zod バリデーションエラーが返り、テンプレートは作成されない

---

## H. UI・ナビゲーション

### TC-036: settings layout に 4 つのナビゲーションリンクが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** admin ロールのユーザーでログインしている
**WHEN** `/settings/webhooks` など `/settings/*` 配下のページにアクセスする
**THEN** Webhook（`/settings/webhooks`）、テンプレート（`/settings/templates`）、ユーザー（`/settings/users`）、監査ログ（`/settings/audit-logs`）の 4 つのナビゲーションリンクが表示される

---

### TC-037: TemplateForm でステップを動的追加できる

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** `/settings/templates/new` のテンプレート作成フォームが表示されている
**WHEN** 「ステップを追加」ボタンをクリックする
**THEN** 新しいステップ行（approverRole ドロップダウン + deadlineHours 入力）がフォームに追加される

---

### TC-038: TemplateForm でステップを動的削除できる

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** `/settings/templates/new` のフォームにステップが 2 件以上ある
**WHEN** いずれかのステップの「削除」ボタンをクリックする
**THEN** 対象ステップ行がフォームから削除され、残りのステップが表示される

---

### TC-039: テンプレート編集ページが既存の値を表示する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** 名前・金額条件・承認ステップが設定済みのテンプレートが存在する
**WHEN** `/settings/templates/:id/edit` にアクセスする
**THEN** フォームにそのテンプレートの既存値（name, minAmount, maxAmount, steps）が初期値として表示される

---

### TC-040: 存在しないテンプレート ID でアクセスすると 404 が返る

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** 存在しないテンプレート ID（例: `nonexistent-id`）を使用する
**WHEN** `/settings/templates/nonexistent-id/edit` にアクセスする
**THEN** `notFound()` が呼び出され、404 ページが表示される

---

### TC-041: UserRoleSelect が自分自身の行を disabled にする

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** admin ロールのユーザーでログインし、`/settings/users` にアクセスしている
**WHEN** ユーザー一覧テーブルで自分自身の行を確認する
**THEN** 自分自身のロールドロップダウンが disabled になっている、またはロール変更不可の表示がある

---

### TC-042: dashboard header の「設定」リンクが 1 つに統合される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** admin ロールのユーザーでダッシュボードにアクセスしている
**WHEN** ヘッダーナビゲーションを確認する
**THEN** 「設定」リンクが 1 つだけ表示され（`/settings/webhooks` を指す）、「監査ログ」の個別リンクはヘッダーに表示されない

---

### TC-043: テンプレート削除エラー時にエラーメッセージが表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-10

**GIVEN** pending リクエストが存在するテンプレートが `/settings/templates` 一覧に表示されている
**WHEN** そのテンプレートの削除ボタンをクリックする
**THEN** 使用中を示すエラーメッセージがページ上に表示され、テンプレートは削除されない

---

### TC-044: ロール変更エラー時にエラーメッセージが表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-13

**GIVEN** admin が `/settings/users` でユーザーのロールを変更しようとする
**WHEN** 変更処理がサーバー側でエラーを返す（例: 自己変更、ユーザー不在）
**THEN** エラーメッセージがページ上に表示される

---

## I. ユーザー管理 Usecase

### TC-045: updateUserRole usecase が存在しないユーザーに対してエラーを返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `src/application/usecases/updateUserRole.ts` が実装されており、指定した `targetUserId` が DB に存在しない
**WHEN** `updateUserRole({ targetUserId: "nonexistent-id", organizationId, actorId, newRole })` を実行する
**THEN** `{ ok: false, reason: <エラー文言> }` が返り、ロールは更新されない

---

## J. ビルド・品質

### TC-046: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-17

**GIVEN** すべての実装タスクが完了している
**WHEN** `bun run build` を実行する
**THEN** ビルドがエラーなしで成功する

---

### TC-047: bun test が全件 green になる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-17

**GIVEN** すべての実装タスクとテストが完了している
**WHEN** `bun test` を実行する
**THEN** 全テストケースが pass し、失敗が 0 件である

---

### TC-048: typecheck が green になる

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-17

**GIVEN** すべての実装タスクが完了している
**WHEN** `bunx tsc --noEmit` を実行する
**THEN** 型エラーが 0 件である

---

### TC-049: bun run lint がエラーなし

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-17

**GIVEN** すべての実装タスクが完了している
**WHEN** `bun run lint` を実行する
**THEN** lint エラーが 0 件である

---

## Result

```yaml
result: completed
total: 49
automated: 37
manual: 12
must: 16
should: 30
could: 3
blocked_reasons: []
```
