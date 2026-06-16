# Test Cases: トランザクション導入・認証プロキシ修正・テナント分離強化

## Summary

- **Total**: 29 cases
- **Automated** (unit/integration): 27 (unit: 23, integration: 4)
- **Manual**: 2
- **Priority**: must: 23, should: 6, could: 0

---

## カテゴリ: トランザクション原子性

### TC-001: 監査ログ挿入失敗時にステータス更新もロールバックされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Usecase のステータス更新と監査ログ記録はトランザクションで原子的に実行される > Scenario: 監査ログ挿入失敗時にステータス更新もロールバックされる

---

### TC-002: 正常系でステータス更新と監査ログが両方コミットされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Usecase のステータス更新と監査ログ記録はトランザクションで原子的に実行される > Scenario: 正常系でステータス更新と監査ログが両方コミットされる

---

### TC-003: トランザクション内でリポジトリ関数に tx が渡される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Usecase のステータス更新と監査ログ記録はトランザクションで原子的に実行される > Scenario: トランザクション内でリポジトリ関数に tx が渡される

---

### TC-004: tx 省略時は db でクエリ実行される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: リポジトリ関数は省略可能なトランザクション引数を受け付ける > Scenario: tx 省略時は db でクエリ実行される

---

### TC-005: tx 指定時は tx でクエリ実行される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: リポジトリ関数は省略可能なトランザクション引数を受け付ける > Scenario: tx 指定時は tx でクエリ実行される

---

### TC-013: Transaction 型が db.ts から export される

**Category**: unit
**Priority**: must
**Source**: design.md > D1, tasks.md > T-01

**GIVEN** `src/infrastructure/db.ts` を import する
**WHEN** named export の一覧を確認する
**THEN** `Transaction` 型が export されており、型は `Parameters<Parameters<typeof db.transaction>[0]>[0]` に相当する

---

### TC-014: requestRepository.updateStatus に省略可能な tx 引数が追加される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/repositories/requestRepository.ts`
**WHEN** `updateStatus` 関数のシグネチャを確認する
**THEN** 末尾引数に `tx?: Transaction` が存在する

---

### TC-015: auditLogRepository.create に省略可能な tx 引数が追加される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/repositories/auditLogRepository.ts`
**WHEN** `create` 関数のシグネチャを確認する
**THEN** 末尾引数に `tx?: Transaction` が存在する

---

### TC-016: rejectRequest usecase が監査ログ挿入失敗時にステータス更新をロールバックする

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** status が `pending` の申請が存在する
**WHEN** `rejectRequest` usecase が実行され、`requestRepository.updateStatus` は成功するが `auditLogRepository.create` が失敗する
**THEN** 申請のステータスは `pending` のまま変更されない（トランザクションがロールバックされる）

---

### TC-017: submitRequest usecase が監査ログ挿入失敗時にステータス更新をロールバックする

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** status が `draft` の申請が存在する
**WHEN** `submitRequest` usecase が実行され、`requestRepository.updateStatus` は成功するが `auditLogRepository.create` が失敗する
**THEN** 申請のステータスは `draft` のまま変更されない（トランザクションがロールバックされる）

---

### TC-018: validateTransition がトランザクション外で実行される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** approve/reject/submit usecase が実行される
**WHEN** `db.transaction()` の呼び出し位置を確認する
**THEN** `validateTransition` が `db.transaction()` ブロック外で先に呼ばれ、`updateStatus` と `auditLogRepository.create` のみがトランザクション内で実行される

---

## カテゴリ: リポジトリリネーム

### TC-006: auth.ts が findByEmailForAuth を使用する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: findByEmail は findByEmailForAuth にリネームされる > Scenario: auth.ts が findByEmailForAuth を使用する

---

### TC-007: findByEmail 関数が存在しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: findByEmail は findByEmailForAuth にリネームされる > Scenario: findByEmail 関数が存在しない

---

## カテゴリ: Server Actions エラーレスポンス統一

### TC-008: 未認証ユーザーが承認アクションを実行する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: approve/reject/submit Server Actions は構造化エラーレスポンスを返す > Scenario: 未認証ユーザーが承認アクションを実行する

---

### TC-009: member ロールのユーザーが承認アクションを実行する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: approve/reject/submit Server Actions は構造化エラーレスポンスを返す > Scenario: member ロールのユーザーが承認アクションを実行する

---

### TC-010: 正常な承認アクション

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: approve/reject/submit Server Actions は構造化エラーレスポンスを返す > Scenario: 正常な承認アクション

---

### TC-019: rejectRequestAction が未認証時に構造化エラーレスポンスを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** セッションが存在しない（未認証）
**WHEN** `rejectRequestAction` が呼ばれる
**THEN** `{ success: false, message: "認証が必要です" }` が返される

---

### TC-020: submitRequestAction が未認証時に構造化エラーレスポンスを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** セッションが存在しない（未認証）
**WHEN** `submitRequestAction` が呼ばれる
**THEN** `{ success: false, message: "認証が必要です" }` が返される

---

### TC-021: rejectRequestAction が認可失敗時に構造化エラーレスポンスを返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** role が `member` のセッションが存在する
**WHEN** `rejectRequestAction` が呼ばれる
**THEN** `{ success: false, message: "権限がありません" }` が返される

---

### TC-022: approveRequestAction が usecase 失敗時に構造化エラーレスポンスを返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** role が `admin` の認証済みセッションが存在するが、usecase が失敗する（例: 不正なステータス遷移）
**WHEN** `approveRequestAction` が呼ばれる
**THEN** `{ success: false, message: <reason> }` が返され、Error は throw されない

---

### TC-023: rejectRequestAction が正常実行時に { success: true } を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** role が `admin` の認証済みセッションが存在し、対象の申請が存在する
**WHEN** `rejectRequestAction` が正常に実行される
**THEN** `{ success: true }` が返される

---

### TC-024: submitRequestAction が正常実行時に { success: true } を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** 認証済みセッションが存在し、対象の申請が `pending` 状態で存在する
**WHEN** `submitRequestAction` が正常に実行される
**THEN** `{ success: true }` が返される

---

### TC-025: createRequestAction の戻り値型・動作が変更されていない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05, design.md > D4

**GIVEN** `src/app/actions/requests.ts` の `createRequestAction`
**WHEN** 関数の戻り値型を確認する
**THEN** `CreateRequestState` 型（フィールドレベル `errors` を含む）が維持されており、`ActionResult` 型には変更されていない

---

## カテゴリ: DATABASE_URL 環境変数ガード

### TC-011: DATABASE_URL が未設定の場合

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DATABASE_URL 未設定時に明示的なエラーメッセージで throw する > Scenario: DATABASE_URL が未設定の場合

---

### TC-012: DATABASE_URL が設定されている場合

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DATABASE_URL 未設定時に明示的なエラーメッセージで throw する > Scenario: DATABASE_URL が設定されている場合

---

## カテゴリ: ファイル構造・依存方向

### TC-026: proxy.ts が存在し middleware.ts が存在しない

**Category**: unit
**Priority**: must
**Source**: design.md > D2

**GIVEN** Next.js 16 プロジェクト（`proxy.ts` が認証プロキシの file convention）
**WHEN** `src/` ディレクトリのファイル一覧を確認する
**THEN** `src/proxy.ts` が存在し、`src/middleware.ts` が存在しない

---

### TC-029: 依存方向が actions → usecases → domain / infrastructure を遵守している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07, T-03

**GIVEN** `src/domain/` 配下のファイル
**WHEN** import 文を確認する
**THEN** `@/infrastructure` または `@/app` への import が存在しない

---

## カテゴリ: ビルド検証

### TC-027: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** 全実装変更が完了している
**WHEN** `bun run build` を実行する
**THEN** ビルドが成功し、TypeScript コンパイルエラーおよびビルドエラーが発生しない

---

### TC-028: bun test が全件 green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07, T-06

**GIVEN** 全実装変更が完了している
**WHEN** `bun test` を実行する
**THEN** 全テストが green（失敗件数 0）

---

## Result

```yaml
result: completed
total: 29
automated: 27
manual: 2
must: 23
should: 6
could: 0
blocked_reasons: []
```
