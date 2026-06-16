# Spec: DB基盤・認証・基本ドメインモデルの導入

## Requirements

### Requirement: 申請の状態遷移は定義済みルールに従わなければならない

申請（Request）の状態遷移 SHALL follow the transition map: `draft → pending`, `pending → approved`, `pending → rejected`. これ以外の遷移（例: `draft → approved`, `approved → pending`, `rejected → draft`）は拒否しなければならない。

#### Scenario: draft から pending への遷移が許可される

**Given** status が `draft` の申請が存在する
**When** 状態遷移バリデーション関数に `draft` → `pending` を渡す
**Then** バリデーションが成功（エラーなし）を返す

#### Scenario: pending から approved への遷移が許可される

**Given** status が `pending` の申請が存在する
**When** 状態遷移バリデーション関数に `pending` → `approved` を渡す
**Then** バリデーションが成功を返す

#### Scenario: pending から rejected への遷移が許可される

**Given** status が `pending` の申請が存在する
**When** 状態遷移バリデーション関数に `pending` → `rejected` を渡す
**Then** バリデーションが成功を返す

#### Scenario: 定義外の遷移が拒否される

**Given** status が `draft` の申請が存在する
**When** 状態遷移バリデーション関数に `draft` → `approved` を渡す
**Then** バリデーションがエラーを返す

#### Scenario: 終端状態からの遷移が拒否される

**Given** status が `approved` の申請が存在する
**When** 状態遷移バリデーション関数に `approved` → `pending` を渡す
**Then** バリデーションがエラーを返す

### Requirement: すべてのデータアクセスはテナント分離されなければならない

リポジトリ層のクエリ MUST include `organizationId` condition to ensure tenant isolation. ユーザーは自身が所属する組織のデータのみ取得・変更できる。書き込み操作における `organizationId` は認証済みセッションから取得しなければならず、リクエストボディから受け入れてはならない。

#### Scenario: 申請一覧取得でテナント分離が適用される

**Given** 組織 A と組織 B がそれぞれ申請を持つ
**When** 組織 A のユーザーが申請一覧を取得する
**Then** 組織 A の申請のみが返され、組織 B の申請は含まれない

#### Scenario: 申請詳細取得でテナント分離が適用される

**Given** 組織 B に属する申請 X が存在する
**When** 組織 A のユーザーが申請 X の詳細を取得しようとする
**Then** 申請が見つからない（null / not found）として扱われる

#### Scenario: 申請作成時に organizationId はセッションから取得される

**Given** セッションに organizationId=A を持つ認証済みユーザーがログインしている
**When** リクエストボディに organizationId=B を含む申請作成リクエストが Server Action に送信される
**Then** 作成された申請の organizationId は A であり、リクエストボディの organizationId は無視される

### Requirement: 状態変更時に監査ログが記録されなければならない

申請の状態変更（提出・承認・却下）MUST create an audit_log record in the same transaction. 監査ログには action, targetType, targetId, actorId, organizationId, metadata を含める。

#### Scenario: 申請提出時に監査ログが作成される

**Given** 認証済みユーザーが draft 状態の申請を持つ
**When** ユーザーが申請を提出する（draft → pending）
**Then** audit_logs テーブルに action=`request.submit`, targetType=`request`, targetId=申請ID, actorId=ユーザーID のレコードが挿入される

#### Scenario: 申請承認時に監査ログが作成される

**Given** 認証済み admin ユーザーが pending 状態の申請を持つ
**When** admin が申請を承認する（pending → approved）
**Then** audit_logs テーブルに action=`request.approve`, targetType=`request`, targetId=申請ID, actorId=adminユーザーID のレコードが挿入される

#### Scenario: 申請却下時に監査ログが作成される

**Given** 認証済み admin ユーザーが pending 状態の申請を持つ
**When** admin が申請を却下する（pending → rejected）
**Then** audit_logs テーブルに action=`request.reject`, targetType=`request`, targetId=申請ID, actorId=adminユーザーID のレコードが挿入される

### Requirement: Server Actions は入力バリデーションと認証チェックを行わなければならない

Server Actions MUST validate input using zod schemas before invoking usecases. 未認証リクエストはユースケース呼び出し前に拒否しなければならない。

#### Scenario: 未認証での申請作成が拒否される

**Given** セッションが存在しない（未ログイン状態）
**When** 申請作成の Server Action が呼び出される
**Then** 認証エラーが返され、ユースケースは呼び出されない

#### Scenario: 不正な入力での申請作成が拒否される

**Given** 認証済みユーザーがログインしている
**When** title が空文字の申請作成リクエストが送信される
**Then** zod バリデーションエラーが返され、ユースケースは呼び出されない

### Requirement: 申請の承認・却下は admin ロールのみが実行できなければならない

`approveRequest` および `rejectRequest` Server Action は、認証済みであることに加えて、セッションの role が `admin` であることを確認しなければならない。`member` ロールのユーザーによる承認・却下は拒否しなければならない。

#### Scenario: admin が申請を承認できる

**Given** role が `admin` の認証済みユーザーがログインしている
**When** pending 状態の申請に対して approveRequestAction が呼び出される
**Then** 申請が承認され、status が `approved` に更新される

#### Scenario: member が申請を承認しようとすると拒否される

**Given** role が `member` の認証済みユーザーがログインしている
**When** pending 状態の申請に対して approveRequestAction が呼び出される
**Then** 認可エラーが返され、申請の status は変更されない

#### Scenario: member が申請を却下しようとすると拒否される

**Given** role が `member` の認証済みユーザーがログインしている
**When** pending 状態の申請に対して rejectRequestAction が呼び出される
**Then** 認可エラーが返され、申請の status は変更されない

### Requirement: 依存方向はレイヤードアーキテクチャの規約に従わなければならない

コードの import 依存 MUST follow the direction: `actions → usecases → domain (services + models) / infrastructure (repositories)`. domain 層は infrastructure 層を import してはならない。この制約はビルド検証タスク（T-17）の受け入れ基準として静的に確認する。

### Requirement: Credentials provider でメール/パスワード認証が機能しなければならない

Auth.js v5 の Credentials provider MUST authenticate users by verifying email and hashed password (bcryptjs). セッションには userId, organizationId, role を含める。

#### Scenario: 正しい認証情報でログインが成功する

**Given** シードデータで作成されたユーザー（email: admin@example.com, password: password123）が存在する
**When** 正しい email と password でログインフォームを送信する
**Then** セッションが作成され、ダッシュボード（申請一覧）にリダイレクトされる

#### Scenario: ログイン成功後のセッションに必要なフィールドが含まれる

**Given** シードデータで作成されたユーザー（email: admin@example.com, password: password123）が存在する
**When** 正しい email と password でログインフォームを送信する
**Then** セッションに userId, organizationId, role がすべて含まれている

#### Scenario: 誤った認証情報でログインが失敗する

**Given** シードデータで作成されたユーザーが存在する
**When** 誤った password でログインフォームを送信する
**Then** 認証エラーが表示され、セッションは作成されない

### Requirement: 申請作成時の初期ステータスは draft でなければならない

新規申請作成 MUST set initial status to `draft`. ユーザーが status を直接指定することはできない。

#### Scenario: 新規申請が draft ステータスで作成される

**Given** 認証済みユーザーがログインしている
**When** title と description を指定して申請を作成する
**Then** 作成された申請の status は `draft` である
