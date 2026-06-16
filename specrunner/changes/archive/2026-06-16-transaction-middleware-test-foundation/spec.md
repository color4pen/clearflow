# Spec: トランザクション導入・認証プロキシ修正・テナント分離強化

## Requirements

### Requirement: Usecase のステータス更新と監査ログ記録はトランザクションで原子的に実行される

approve, reject, submit の各 usecase は `db.transaction()` を使用して `requestRepository.updateStatus` と `auditLogRepository.create` を単一トランザクション内で実行 SHALL する。トランザクション内でいずれかの操作が失敗した場合、両方の操作がロールバックされる MUST。

#### Scenario: 監査ログ挿入失敗時にステータス更新もロールバックされる

**Given** status が `pending` の申請が存在する
**When** `approveRequest` usecase が実行され、`requestRepository.updateStatus` は成功するが `auditLogRepository.create` が失敗する
**Then** 申請のステータスは `pending` のまま変更されない（トランザクションがロールバックされる）

#### Scenario: 正常系でステータス更新と監査ログが両方コミットされる

**Given** status が `pending` の申請が存在する
**When** `approveRequest` usecase が正常に実行される
**Then** 申請のステータスが `approved` に更新され、`request.approve` の監査ログが作成される

#### Scenario: トランザクション内でリポジトリ関数に tx が渡される

**Given** usecase が `db.transaction(async (tx) => { ... })` を呼び出す
**When** トランザクションブロック内で `requestRepository.updateStatus` と `auditLogRepository.create` が呼ばれる
**Then** 両関数に `tx` 引数が渡され、同一トランザクション内でクエリが実行される

### Requirement: リポジトリ関数は省略可能なトランザクション引数を受け付ける

`requestRepository.updateStatus` と `auditLogRepository.create` は末尾に省略可能な `tx` 引数を持つ SHALL。`tx` が渡された場合はトランザクション内でクエリを実行し、省略時は module-level の `db` を使用する MUST。

#### Scenario: tx 省略時は db でクエリ実行される

**Given** `requestRepository.updateStatus` が `tx` 引数なしで呼ばれる
**When** クエリが実行される
**Then** module-level の `db` インスタンスを使ってクエリが実行される

#### Scenario: tx 指定時は tx でクエリ実行される

**Given** `requestRepository.updateStatus` が `tx` 引数付きで呼ばれる
**When** クエリが実行される
**Then** 渡された `tx` インスタンスを使ってクエリが実行される

### Requirement: findByEmail は findByEmailForAuth にリネームされる

`userRepository.findByEmail` は `findByEmailForAuth` にリネームされ SHALL、Auth.js の authorize コールバック専用であることを命名で明示する MUST。

#### Scenario: auth.ts が findByEmailForAuth を使用する

**Given** `src/infrastructure/auth.ts` の Credentials provider の authorize コールバック
**When** ユーザーのメールアドレスで検索する
**Then** `findByEmailForAuth` 関数が呼ばれる

#### Scenario: findByEmail 関数が存在しない

**Given** `src/infrastructure/repositories/userRepository.ts`
**When** export された関数名を確認する
**Then** `findByEmail` は存在せず、`findByEmailForAuth` が export されている

### Requirement: approve/reject/submit Server Actions は構造化エラーレスポンスを返す

`approveRequestAction`, `rejectRequestAction`, `submitRequestAction` は認証失敗時に `{ success: false, message: "認証が必要です" }` 形式のレスポンスを返す SHALL。成功時は `{ success: true }` を返す MUST。

#### Scenario: 未認証ユーザーが承認アクションを実行する

**Given** セッションが存在しない（未認証）
**When** `approveRequestAction` が呼ばれる
**Then** `{ success: false, message: "認証が必要です" }` が返される

#### Scenario: member ロールのユーザーが承認アクションを実行する

**Given** role が `member` のセッションが存在する
**When** `approveRequestAction` が呼ばれる
**Then** `{ success: false, message: "権限がありません" }` が返される

#### Scenario: 正常な承認アクション

**Given** role が `admin` の認証済みセッションが存在し、対象の申請が存在する
**When** `approveRequestAction` が正常に実行される
**Then** `{ success: true }` が返される

### Requirement: DATABASE_URL 未設定時に明示的なエラーメッセージで throw する

`src/infrastructure/db.ts` は `DATABASE_URL` 環境変数が未設定の場合、`"DATABASE_URL environment variable is not set"` メッセージを含む Error を throw SHALL する。

#### Scenario: DATABASE_URL が未設定の場合

**Given** `DATABASE_URL` 環境変数が設定されていない
**When** `db.ts` モジュールが読み込まれる
**Then** `"DATABASE_URL environment variable is not set"` メッセージの Error が throw される

#### Scenario: DATABASE_URL が設定されている場合

**Given** `DATABASE_URL` 環境変数が有効な接続文字列に設定されている
**When** `db.ts` モジュールが読み込まれる
**Then** `db` インスタンスが正常に生成され export される
