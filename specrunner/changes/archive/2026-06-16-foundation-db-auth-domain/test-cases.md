# Test Cases: DB基盤・認証・基本ドメインモデルの導入

## Summary

- **Total**: 59 cases
- **Automated** (unit/integration): 29
- **Manual**: 30
- **Priority**: must: 46, should: 13, could: 0

---

## ドメインロジック / 状態遷移

### TC-001: draft から pending への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 申請の状態遷移は定義済みルールに従わなければならない > Scenario: draft から pending への遷移が許可される

---

### TC-002: pending から approved への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 申請の状態遷移は定義済みルールに従わなければならない > Scenario: pending から approved への遷移が許可される

---

### TC-003: pending から rejected への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 申請の状態遷移は定義済みルールに従わなければならない > Scenario: pending から rejected への遷移が許可される

---

### TC-004: 定義外の遷移 (draft → approved) が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 申請の状態遷移は定義済みルールに従わなければならない > Scenario: 定義外の遷移が拒否される

---

### TC-005: 終端状態 (approved) からの遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 申請の状態遷移は定義済みルールに従わなければならない > Scenario: 終端状態からの遷移が拒否される

---

### TC-006: rejected 状態からの任意の遷移が拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md#T-05

**GIVEN** `VALID_TRANSITIONS` マップに `rejected` の遷移先が定義されていない  
**WHEN** `validateTransition("rejected", "draft")` を呼び出す  
**THEN** `{ ok: false, reason: "..." }` が返される

---

## テナント分離

### TC-007: 申請一覧取得でテナント分離が適用される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: すべてのデータアクセスはテナント分離されなければならない > Scenario: 申請一覧取得でテナント分離が適用される

---

### TC-008: 申請詳細取得でテナント分離が適用される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: すべてのデータアクセスはテナント分離されなければならない > Scenario: 申請詳細取得でテナント分離が適用される

---

### TC-009: 申請作成時に organizationId はセッションから取得される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: すべてのデータアクセスはテナント分離されなければならない > Scenario: 申請作成時に organizationId はセッションから取得される

---

### TC-010: requestRepository の検索・更新クエリに organizationId 条件が付与される

**Category**: integration
**Priority**: must
**Source**: tasks.md#T-06

**GIVEN** 複数組織の申請データが DB に存在する  
**WHEN** `requestRepository.findById(id, organizationId)` および `findAllByOrganization(organizationId)` および `updateStatus(id, organizationId, ...)` を呼び出す  
**THEN** 各クエリの WHERE 句に `organizationId` 条件が含まれ、指定組織以外のデータが返らない

---

## 監査ログ

### TC-011: 申請提出時に監査ログが作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 状態変更時に監査ログが記録されなければならない > Scenario: 申請提出時に監査ログが作成される

---

### TC-012: 申請承認時に監査ログが作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 状態変更時に監査ログが記録されなければならない > Scenario: 申請承認時に監査ログが作成される

---

### TC-013: 申請却下時に監査ログが作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 状態変更時に監査ログが記録されなければならない > Scenario: 申請却下時に監査ログが作成される

---

## 認証・認可

### TC-014: 正しい認証情報でログインが成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Credentials provider でメール/パスワード認証が機能しなければならない > Scenario: 正しい認証情報でログインが成功する

---

### TC-015: ログイン成功後のセッションに必要なフィールドが含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Credentials provider でメール/パスワード認証が機能しなければならない > Scenario: ログイン成功後のセッションに必要なフィールドが含まれる

---

### TC-016: 誤った認証情報でログインが失敗する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Credentials provider でメール/パスワード認証が機能しなければならない > Scenario: 誤った認証情報でログインが失敗する

---

### TC-017: 未認証での申請作成が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Server Actions は入力バリデーションと認証チェックを行わなければならない > Scenario: 未認証での申請作成が拒否される

---

### TC-018: admin が申請を承認できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 申請の承認・却下は admin ロールのみが実行できなければならない > Scenario: admin が申請を承認できる

---

### TC-019: member が申請を承認しようとすると拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 申請の承認・却下は admin ロールのみが実行できなければならない > Scenario: member が申請を承認しようとすると拒否される

---

### TC-020: member が申請を却下しようとすると拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 申請の承認・却下は admin ロールのみが実行できなければならない > Scenario: member が申請を却下しようとすると拒否される

---

### TC-021: 未認証アクセスで /login へリダイレクトされる

**Category**: integration
**Priority**: must
**Source**: tasks.md#T-07

**GIVEN** セッションが存在しない状態で  
**WHEN** 保護ルート（例: `/requests`）に HTTP リクエストを送信する  
**THEN** proxy.ts によって `/login` へリダイレクトレスポンスが返される

---

## 入力バリデーション

### TC-022: 不正な入力 (title 空) での申請作成が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Server Actions は入力バリデーションと認証チェックを行わなければならない > Scenario: 不正な入力での申請作成が拒否される

---

### TC-023: approveRequestAction と rejectRequestAction で role=admin チェックが行われる

**Category**: integration
**Priority**: must
**Source**: tasks.md#T-09

**GIVEN** role が `member` の認証済みセッションが存在する  
**WHEN** `approveRequestAction(requestId)` または `rejectRequestAction(requestId)` が呼び出される  
**THEN** role チェックでエラーが返され、ユースケースは呼び出されない

---

## 申請作成・初期ステータス

### TC-024: 新規申請が draft ステータスで作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 申請作成時の初期ステータスは draft でなければならない > Scenario: 新規申請が draft ステータスで作成される

---

## DB基盤・スキーマ

### TC-025: .env.example に DATABASE_URL と AUTH_SECRET が記載されている

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-01

**GIVEN** プロジェクトルートに `.env.example` が配置されている  
**WHEN** `.env.example` の内容を確認する  
**THEN** `DATABASE_URL=` および `AUTH_SECRET=` のキーが両方含まれている

---

### TC-026: drizzle.config.ts が存在し型チェックが通る

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-01

**GIVEN** プロジェクトルートに `drizzle.config.ts` が配置されている  
**WHEN** `bun run typecheck`（または `tsc --noEmit`）を実行する  
**THEN** `drizzle.config.ts` を含む型チェックがエラーなしで通過する

---

### TC-027: drizzle-kit generate でマイグレーションファイルが生成される

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-02

**GIVEN** `src/infrastructure/schema.ts` にスキーマが定義されている  
**WHEN** `bunx drizzle-kit generate`（または `bun run db:generate`）を実行する  
**THEN** `drizzle/` ディレクトリにマイグレーション SQL ファイルが生成され、コマンドが exit code 0 で完了する

---

### TC-028: Auth.js adapter テーブルが schema.ts に定義されている

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-02

**GIVEN** `src/infrastructure/schema.ts` を確認する  
**WHEN** ファイル内のテーブル定義を参照する  
**THEN** `accounts`, `sessions`, `verificationTokens` テーブルが `@auth/drizzle-adapter` の公式スキーマに従って定義されている

---

### TC-029: db インスタンスが型付きで export されている

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-03

**GIVEN** `src/infrastructure/db.ts` が作成されている  
**WHEN** ファイルの内容を確認する  
**THEN** `drizzle-orm/postgres-js` から生成された Drizzle インスタンスが `db` として export されており、スキーマが `schema` オプションに渡されている

---

### TC-030: import パスが drizzle-orm/postgres-js である

**Category**: manual
**Priority**: should
**Source**: tasks.md#T-03

**GIVEN** `src/infrastructure/db.ts` を確認する  
**WHEN** import 文を参照する  
**THEN** `drizzle-orm/postgres-js` が使用されており、`drizzle-orm/node-postgres` は使用されていない

---

## ドメインモデル・依存方向

### TC-031: domain/models 配下に ORM への依存がない

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-04

**GIVEN** `src/domain/models/` 配下の全ファイルを確認する  
**WHEN** import 文を検索する（`grep -r "drizzle\|@auth\|postgres" src/domain/`）  
**THEN** Drizzle、Auth.js、postgres など ORM/ライブラリへの import が一件も存在しない

---

### TC-032: RequestStatus 型が正しい union 型として定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md#T-04

**GIVEN** `src/domain/models/request.ts` に `RequestStatus` 型が定義されている  
**WHEN** 型定義を参照する  
**THEN** `RequestStatus` は `"draft" | "pending" | "approved" | "rejected"` の union 型である

---

### TC-033: domain/services に infrastructure 層への import がない

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-05

**GIVEN** `src/domain/services/` 配下の全ファイルを確認する  
**WHEN** import 文を検索する（`grep -r "@/infrastructure" src/domain/`）  
**THEN** infrastructure 層への import が一件も存在しない

---

### TC-034: domain 層に infrastructure import がない（静的検証）

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-17

**GIVEN** `src/domain/` 配下の全ファイルが存在する  
**WHEN** `grep -r "from.*@/infrastructure" src/domain/` を実行する  
**THEN** 結果が空（ゼロ件）である

---

### TC-035: Auth.js 型拡張で Session と JWT に userId, organizationId, role が含まれる

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-17

**GIVEN** Auth.js の型拡張ファイル（`next-auth.d.ts` 等）が存在する  
**WHEN** `bun run typecheck` を実行し、`auth()` の戻り値型を確認する  
**THEN** `session.user.userId`, `session.user.organizationId`, `session.user.role` が型レベルで参照でき、型エラーが発生しない

---

### TC-036: usecase 層がアーキテクチャの依存方向に従っている

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-08

**GIVEN** `src/application/usecases/` 配下の全ファイルを確認する  
**WHEN** import 文を検索する  
**THEN** usecase は `@/domain` と `@/infrastructure/repositories` を import するが、`src/domain/` 配下のファイルが `@/infrastructure` を import していない

---

## リポジトリ

### TC-037: repository の create メソッドが挿入後のレコードを返す

**Category**: integration
**Priority**: should
**Source**: tasks.md#T-06

**GIVEN** DB に接続した状態で `requestRepository.create(data)` を呼び出す  
**WHEN** レコードが挿入される  
**THEN** 戻り値として挿入後のレコード（id 含む）が返される

---

### TC-038: userRepository.findByEmail に organizationId フィルタが含まれない

**Category**: integration
**Priority**: should
**Source**: tasks.md#T-06

**GIVEN** 異なる組織に同じメールアドレスを持たないユーザーが存在する（email はグローバル一意）  
**WHEN** `userRepository.findByEmail(email)` を呼び出す  
**THEN** organizationId による絞り込みは行われず、email のみで検索が実行される

---

## ユースケース

### TC-039: approveRequest / rejectRequest が validateTransition を呼び出してから状態更新する

**Category**: unit
**Priority**: must
**Source**: tasks.md#T-08

**GIVEN** `approveRequest` または `rejectRequest` ユースケースが呼び出される  
**WHEN** domain service の `validateTransition` をモックした状態で実行する  
**THEN** `validateTransition` が先に呼び出され、`ok: false` の場合は repository の updateStatus が呼ばれない

---

### TC-040: submitRequest が validateTransition(draft → pending) を呼び出す

**Category**: unit
**Priority**: must
**Source**: tasks.md#T-08

**GIVEN** `submitRequest` ユースケースが draft 状態の申請 ID で呼び出される  
**WHEN** domain service の `validateTransition` をモックした状態で実行する  
**THEN** `validateTransition("draft", "pending")` が呼び出され、成功時に repository の updateStatus が呼ばれる

---

## Server Actions

### TC-041: 全 Server Action に "use server" ディレクティブがある

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-09

**GIVEN** `src/app/actions/` 配下の全ファイルを確認する  
**WHEN** 各ファイルの先頭を参照する  
**THEN** すべての Server Action ファイルの先頭に `"use server"` ディレクティブが記述されている

---

### TC-042: mutation 系 action で auth() による認証チェックが最初に実行される

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-09

**GIVEN** `createRequestAction`, `submitRequestAction`, `approveRequestAction`, `rejectRequestAction` の実装を確認する  
**WHEN** 各 action の処理フローを参照する  
**THEN** `auth()` の呼び出しとセッション存在チェックが、zod バリデーションおよびユースケース呼び出しより先に実行される

---

### TC-043: revalidatePath が状態変更後に呼び出される

**Category**: manual
**Priority**: should
**Source**: tasks.md#T-09

**GIVEN** mutation 系 Server Action の実装を確認する  
**WHEN** ユースケース呼び出しの後続処理を参照する  
**THEN** `revalidatePath` が成功時に呼び出されており、関連パス（`/requests` 等）のキャッシュが再検証される

---

## Auth.js 設定

### TC-044: proxy.ts が src/proxy.ts に配置され関数名が proxy である

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-07

**GIVEN** `src/proxy.ts` ファイルが存在する  
**WHEN** ファイルの export を確認する  
**THEN** exported 関数名が `proxy`（または `export { auth as proxy }` 形式）であり、Next.js 16 の proxy 規約に従っている

---

### TC-045: Auth.js ルートハンドラ (GET, POST) が export されている

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-07

**GIVEN** `src/app/api/auth/[...nextauth]/route.ts` が存在する  
**WHEN** ファイルの export を確認する  
**THEN** `GET` と `POST` が named export されており、`src/infrastructure/auth.ts` の `handlers` から import されている

---

## UI・E2E フロー

### TC-046: /login でログインフォームが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-10

**GIVEN** ブラウザでアプリケーションを開く  
**WHEN** `/login` にアクセスする  
**THEN** メールアドレスとパスワードの入力フィールド、および送信ボタンが表示される

---

### TC-047: ログイン失敗時にエラーメッセージが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md#T-10

**GIVEN** `/login` ページが表示されている  
**WHEN** 誤ったパスワードでフォームを送信する  
**THEN** 認証エラーメッセージがページ上に表示される

---

### TC-048: 未認証ユーザーが /requests にアクセスすると /login へリダイレクトされる

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-11

**GIVEN** セッションが存在しない（ログアウト状態）  
**WHEN** ブラウザで `/requests` にアクセスする  
**THEN** `/login` にリダイレクトされる

---

### TC-049: 申請一覧に「新規申請」ボタンが存在する

**Category**: manual
**Priority**: should
**Source**: tasks.md#T-11

**GIVEN** admin または member としてログインしている  
**WHEN** `/requests` 画面を確認する  
**THEN** `/requests/new` へのリンクを持つ「新規申請」ボタンが表示されている

---

### TC-050: title 空で申請作成するとバリデーションエラーが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-12

**GIVEN** `/requests/new` で申請作成フォームが表示されている  
**WHEN** title を空のまま送信する  
**THEN** zod バリデーションエラーメッセージがフォーム上に表示される

---

### TC-051: 申請作成成功後に申請一覧へリダイレクトされる

**Category**: manual
**Priority**: should
**Source**: tasks.md#T-12

**GIVEN** `/requests/new` で有効な title を入力している  
**WHEN** フォームを送信する  
**THEN** 申請が作成され、`/requests` 一覧ページへリダイレクトされる

---

### TC-052: draft 申請の詳細画面に「提出」ボタンが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md#T-13

**GIVEN** status が `draft` の申請が存在する  
**WHEN** `/requests/[id]` 詳細画面を表示する  
**THEN** 「提出」ボタンが表示され、「承認」「却下」ボタンは表示されない

---

### TC-053: approved または rejected 申請の詳細画面でアクションボタンが非表示になる

**Category**: manual
**Priority**: should
**Source**: tasks.md#T-13

**GIVEN** status が `approved` または `rejected` の申請が存在する  
**WHEN** `/requests/[id]` 詳細画面を表示する  
**THEN** 「提出」「承認」「却下」のいずれのボタンも表示されない

---

### TC-054: 存在しない申請 ID で 404 が表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md#T-13

**GIVEN** DB に存在しない UUID を用意する  
**WHEN** `/requests/[存在しないID]` にアクセスする  
**THEN** 404 ページが表示される

---

### TC-055: / にアクセスすると /requests へリダイレクトされる

**Category**: manual
**Priority**: should
**Source**: tasks.md#T-14

**GIVEN** ログイン済みの状態でブラウザを開く  
**WHEN** ルート URL `/` にアクセスする  
**THEN** `/requests` にリダイレクトされる

---

### TC-056: シードスクリプト実行後に admin@example.com でログインできる

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-15

**GIVEN** `bun run db:seed` を実行する  
**WHEN** `/login` で email: `admin@example.com`, password: `password123` を入力して送信する  
**THEN** ログインが成功し、申請一覧画面へ遷移する

---

### TC-057: シードスクリプトで複数 status の申請が作成される

**Category**: manual
**Priority**: should
**Source**: tasks.md#T-15

**GIVEN** `bun run db:seed` を実行する  
**WHEN** admin@example.com でログインして申請一覧を確認する  
**THEN** draft, pending, approved のいずれかの status を持つ申請が複数件表示される

---

## ビルド・静的検証

### TC-058: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-17

**GIVEN** 全実装ファイルが揃っている  
**WHEN** `bun run build` を実行する  
**THEN** exit code 0 でビルドが完了し、Next.js の本番ビルド成果物が生成される

---

### TC-059: bun run lint がエラーなしで通る

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-17

**GIVEN** 全実装ファイルが揃っている  
**WHEN** `bun run lint` を実行する  
**THEN** exit code 0 で完了し、ESLint エラーが報告されない

---

## Result

```yaml
result: completed
total: 59
automated: 29
manual: 30
must: 46
should: 13
could: 0
blocked_reasons: []
```
