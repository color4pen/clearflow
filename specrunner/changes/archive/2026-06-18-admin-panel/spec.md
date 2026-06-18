# Spec: 管理画面（テンプレートCRUD・ユーザー管理）

## Requirements

### Requirement: テンプレート CRUD は admin ロールのみ実行可能

テンプレートの作成・更新・削除の Server Action は、セッションユーザーのロールが `admin` でない場合にエラーを返さなければならない（SHALL）。

#### Scenario: admin ロールのユーザーがテンプレートを作成する

**Given** ログインユーザーのロールが `admin` である
**When** `createTemplateAction` を実行する
**Then** テンプレートが作成され、成功レスポンスが返る

#### Scenario: member ロールのユーザーがテンプレートを作成しようとする

**Given** ログインユーザーのロールが `member` である
**When** `createTemplateAction` を実行する
**Then** エラーメッセージ「権限がありません」が返り、テンプレートは作成されない

---

### Requirement: テンプレート削除は使用中チェックを実施する

テンプレートの削除時、当該テンプレートで作成された pending 状態のリクエストが存在する場合、削除を拒否しなければならない（MUST）。

#### Scenario: pending リクエストが存在しないテンプレートを削除する

**Given** テンプレート A で作成されたリクエストがすべて approved / rejected / expired である
**When** admin が `deleteTemplateAction(テンプレートA.id)` を実行する
**Then** テンプレート A が物理削除され、`template.delete` の監査ログが記録される

#### Scenario: pending リクエストが存在するテンプレートを削除しようとする

**Given** テンプレート B で作成されたリクエストのうち 1 件が `pending` 状態である
**When** admin が `deleteTemplateAction(テンプレートB.id)` を実行する
**Then** エラーメッセージが返り、テンプレート B は削除されない

---

### Requirement: ユーザーロール変更は admin ロールのみ実行可能

ユーザーのロール変更 Server Action は、セッションユーザーのロールが `admin` でない場合にエラーを返さなければならない（SHALL）。

#### Scenario: admin がユーザーのロールを変更する

**Given** ログインユーザーのロールが `admin` であり、対象ユーザーが同一組織に所属する
**When** `updateUserRoleAction(targetUserId, "manager")` を実行する
**Then** 対象ユーザーのロールが `manager` に更新され、`user.updateRole` の監査ログが記録される

#### Scenario: member がユーザーのロールを変更しようとする

**Given** ログインユーザーのロールが `member` である
**When** `updateUserRoleAction` を実行する
**Then** エラーメッセージ「権限がありません」が返り、ロールは変更されない

---

### Requirement: 自分自身のロール変更を禁止する

admin であっても自分自身のロールは変更できない（MUST NOT）。

#### Scenario: admin が自分自身のロールを変更しようとする

**Given** ログインユーザー（admin）の ID が `user-A` である
**When** `updateUserRoleAction("user-A", "member")` を実行する
**Then** エラーメッセージが返り、ロールは変更されない

---

### Requirement: テナント分離 — 全クエリに organizationId 条件を付与する

新規追加される repository メソッドはすべて organizationId をパラメータに含み、WHERE 条件に organizationId を付与しなければならない（SHALL）。organizationId はセッションから取得し、リクエストボディから受け取ってはならない。

#### Scenario: テンプレート一覧が自組織のみ返る

**Given** 組織 A のテンプレートが 3 件、組織 B のテンプレートが 2 件存在する
**When** 組織 A の admin が `findByOrganization(orgA.id)` を呼び出す
**Then** 組織 A の 3 件のみが返る

#### Scenario: ユーザー一覧が自組織のみ返る

**Given** 組織 A のユーザーが 5 名、組織 B のユーザーが 3 名存在する
**When** 組織 A の admin が `listUsersAction` を実行する
**Then** 組織 A の 5 名のみが返る

---

### Requirement: 監査ログの記録

テンプレートの作成・更新・削除、ユーザーのロール変更は、同一トランザクション内で audit_logs に記録しなければならない（MUST）。

#### Scenario: テンプレート作成時に監査ログが記録される

**Given** admin がテンプレートを作成する
**When** `createTemplate` usecase がトランザクションを完了する
**Then** `action='template.create'`, `targetType='template'`, `targetId=新テンプレートID` の監査ログが同一トランザクション内で記録される

#### Scenario: ユーザーロール変更時に監査ログが記録される

**Given** admin がユーザーのロールを変更する
**When** `updateUserRole` usecase がトランザクションを完了する
**Then** `action='user.updateRole'`, `targetType='user'`, `targetId=対象ユーザーID` の監査ログが記録され、metadata に変更前後のロールが含まれる

---

### Requirement: テンプレートフォームのバリデーション

テンプレートの作成・更新時、以下のバリデーションを zod で適用しなければならない（SHALL）:
- name: 必須、1 文字以上
- steps: 1 つ以上の配列。各ステップは approverRole（必須）と deadlineHours（任意、正の整数）を持つ
- minAmount / maxAmount: 任意、非負整数。minAmount ≤ maxAmount（両方指定時）

#### Scenario: 空のステップ配列でテンプレートを作成しようとする

**Given** admin がテンプレート作成フォームでステップを 0 件にする
**When** フォームを送信する
**Then** バリデーションエラーが返り、テンプレートは作成されない

#### Scenario: minAmount > maxAmount でテンプレートを作成しようとする

**Given** admin が minAmount=100000, maxAmount=50000 を指定する
**When** フォームを送信する
**Then** バリデーションエラーが返り、テンプレートは作成されない
