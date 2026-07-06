# Test Cases: API トークンの発行・失効と Bearer 認証

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

- **Total**: 59 cases
- **Automated** (unit/integration): 48
- **Manual**: 11
- **Priority**: must: 51, should: 7, could: 1

---

## A. トークン生成・形式

### TC-001: トークン発行時に平文が返り DB にはハッシュのみ保存される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: トークン発行時に平文を一度だけ返し、以後は取得不能にする > Scenario: トークンを発行し平文を受け取る

### TC-002: 発行済みトークンの一覧に平文・ハッシュが含まれない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: トークン発行時に平文を一度だけ返し、以後は取得不能にする > Scenario: 発行済みトークンの平文を再取得しようとする

### TC-003: 平文トークンが `cfp_` prefix + base64url 形式である

**Category**: unit
**Priority**: must
**Source**: design.md > D1: トークン形式、tasks.md > T-06

**GIVEN** createApiToken ユースケースが実行される
**WHEN** 戻り値の plainToken を検査する
**THEN** plainToken が `cfp_` で始まり、その後が base64url 文字（`[A-Za-z0-9_-]+`）で構成される

### TC-004: tokenPrefix が平文トークンの先頭 8 文字と一致する

**Category**: unit
**Priority**: should
**Source**: design.md > D7: トークン prefix の保存方式、tasks.md > T-06

**GIVEN** createApiToken ユースケースが実行される
**WHEN** 返却された plainToken と DB に保存された tokenPrefix を比較する
**THEN** tokenPrefix が plainToken の先頭 8 文字（`cfp_` + 4 文字）と一致する

### TC-005: name が空文字のとき createApiToken がバリデーションエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06, T-09

**GIVEN** 有効なセッションユーザーが存在する
**WHEN** name に空文字を渡して createApiToken ユースケースを呼び出す
**THEN** バリデーションエラーが返り、トークンは作成されず監査ログも記録されない

---

## B. Bearer 解決 — 正常系

### TC-006: 有効なトークンで userId・organizationId・role が解決される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Bearer トークンからユーザーを解決する > Scenario: 有効なトークンでユーザーを解決する

### TC-007: 存在しないトークンで resolveBearer が null を返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Bearer トークンからユーザーを解決する > Scenario: 存在しないトークンで解決を試みる

---

## C. Bearer 解決 — 異常系（失効・期限切れ・不正形式）

### TC-008: 失効済みトークン（revokedAt 非 null）を拒否する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 失効済み・期限切れトークンを拒否する > Scenario: 失効済みトークンを拒否する

### TC-009: 期限切れトークン（expiresAt が過去）を拒否する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 失効済み・期限切れトークンを拒否する > Scenario: 期限切れトークンを拒否する

### TC-010: `cfp_` prefix を持たないトークンを拒否する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 不正形式のトークンを拒否する > Scenario: prefix なしのトークンを拒否する

### TC-011: Bearer scheme でない Authorization ヘッダを拒否する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 不正形式のトークンを拒否する > Scenario: Bearer scheme でないヘッダを拒否する

### TC-012: Authorization ヘッダが null のとき null を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05, design.md > D4: Bearer 解決関数の配置

**GIVEN** Authorization ヘッダが存在しない（null）リクエストがある
**WHEN** resolveBearer(null) を呼び出す
**THEN** null が返る（エラーをスローしない）

### TC-013: 失効済みトークンへの二重失効は拒否される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** ユーザー A のトークン T が既に revokedAt 設定済みである
**WHEN** ユーザー A が再度 revokeApiToken({ tokenId: T.id, userId: A.id, organizationId: A.orgId }) を実行する
**THEN** `{ ok: false, reason: string }` が返り、監査ログは追記されない

---

## D. deactivated ユーザー

### TC-014: deactivated ユーザーのトークンを拒否する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: deactivated ユーザーのトークンを拒否する > Scenario: deactivated ユーザーのトークンを拒否する

---

## E. アクセス制御・テナント分離

### TC-015: listApiTokens は自分のトークンのみ返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: トークンの一覧・発行・失効は本人のみ > Scenario: 自分のトークンを一覧する

### TC-016: admin であっても他ユーザーのトークンを失効できない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: トークンの一覧・発行・失効は本人のみ > Scenario: 他ユーザーのトークンを失効しようとする

### TC-017: listApiTokens は自組織のトークンのみ返す（テナント分離）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: テナント分離 — api_tokens テーブルのクエリに organizationId 条件を付与する > Scenario: トークン一覧が自組織のみ返る

### TC-018: Server Action が userId / organizationId をセッションから取得する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09, T-14, design.md > D5: トークン所有権

**GIVEN** createApiTokenAction / revokeApiTokenAction / listApiTokensAction が実装されている
**WHEN** 各 Action のソースコードを静的解析する
**THEN** `session.user.id` と `session.user.organizationId` が参照されており、formData や関数引数から userId / organizationId を取得するコードが存在しない

---

## F. 監査ログ

### TC-019: トークン発行時に api_token.create の監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 発行・失効が監査ログに記録される > Scenario: トークン発行時に監査ログが記録される

### TC-020: トークン失効時に api_token.revoke の監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 発行・失効が監査ログに記録される > Scenario: トークン失効時に監査ログが記録される

### TC-021: 監査ログのメタデータに平文・ハッシュが含まれない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06, T-07, spec.md > Requirement: 発行・失効が監査ログに記録される > Scenario: トークン発行時に監査ログが記録される

**GIVEN** createApiToken / revokeApiToken のソースが実装されている
**WHEN** recordAudit への引数を静的解析する
**THEN** metadata に `plainToken`・`tokenHash` に相当するフィールドを渡すコードが存在しない

---

## G. lastUsedAt 更新

### TC-022: Bearer 解決成功時に lastUsedAt が現在時刻に更新される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: lastUsedAt が Bearer 解決時に更新される > Scenario: 認証成功時に lastUsedAt が更新される

### TC-023: Bearer 解決失敗時に lastUsedAt は更新されない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05, design.md > D6: lastUsedAt の更新

**GIVEN** トークン T が失効済みである
**WHEN** トークン T で resolveBearer を呼び出す
**THEN** updateLastUsedAt が呼ばれない（lastUsedAt は変化しない）

---

## H. スキーマ・DB・型定義

### TC-024: api_tokens テーブルが全必須カラムを持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** src/infrastructure/schema.ts が更新されている
**WHEN** apiTokens テーブル定義を検査する
**THEN** id / organizationId / userId / name / tokenHash / tokenPrefix / lastUsedAt / expiresAt / revokedAt / createdAt の全カラムが存在する

### TC-025: tokenHash にユニークインデックスが定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** apiTokens テーブルが schema.ts に定義されている
**WHEN** インデックス定義を検査する
**THEN** tokenHash にユニークインデックスが存在する

### TC-026: organizationId / userId が NOT NULL かつ外部キー参照を持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** apiTokens テーブルが schema.ts に定義されている
**WHEN** カラム定義を検査する
**THEN** organizationId が organizations.id を、userId が users.id を参照し、どちらも NOT NULL である

### TC-027: ApiToken ドメインモデルが tokenHash フィールドを含まない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** src/domain/models/apiToken.ts が実装されている
**WHEN** ApiToken 型のフィールドを検査する
**THEN** `tokenHash` フィールドが型定義に存在しない

### TC-028: 差分マイグレーション SQL が drizzle/ に生成されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** db:generate を実行した
**WHEN** drizzle/ ディレクトリを確認する
**THEN** api_tokens テーブルを CREATE する SQL ファイルが存在し、既存テーブルを DROP または変更する SQL が含まれない

### TC-029: AuditAction union に api_token.create / api_token.revoke が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** src/domain/models/auditLog.ts が更新されている
**WHEN** AuditAction 型を検査する
**THEN** `"api_token.create"` と `"api_token.revoke"` が union メンバーとして存在する

### TC-030: AuditTargetType union に api_token が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** src/domain/models/auditLog.ts が更新されている
**WHEN** AuditTargetType 型を検査する
**THEN** `"api_token"` が union メンバーとして存在する

---

## I. Server Actions

### TC-031: createApiTokenAction が name を zod でバリデーションする

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** src/app/actions/apiTokens.ts が実装されている
**WHEN** name に空文字または 101 文字以上の値を含むフォームデータで createApiTokenAction を呼び出す
**THEN** バリデーションエラーが返り、createApiToken ユースケースは呼び出されない

### TC-032: createApiTokenAction の成功時レスポンスに plainToken が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** 有効なセッションと正当な name でフォームデータを構築する
**WHEN** createApiTokenAction を実行し成功する
**THEN** 戻り値に `{ success: true, plainToken: "cfp_..." }` が含まれる

### TC-033: 未認証ユーザーが各 Server Action を呼び出すとエラーが返る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** セッションが存在しない（未認証）状態である
**WHEN** createApiTokenAction / revokeApiTokenAction / listApiTokensAction のいずれかを呼び出す
**THEN** 認証エラーが返り、ユースケースは実行されない

---

## J. UI（アカウント設定）

### TC-034: /account ページにトークン管理セクションが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** 認証済みユーザーが `/account` を開く
**WHEN** ページを視覚的に確認する
**THEN** ProfileForm / PasswordForm の下に ApiTokenSection（トークン管理セクション）が表示される

### TC-035: 発行成功後に平文トークンが一度だけ表示され注意書きがある

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** ユーザーが発行フォームに名前を入力し「発行」ボタンをクリックする
**WHEN** createApiTokenAction が成功する
**THEN** モーダルまたはアラート内に平文トークンが表示され、「この画面を閉じると二度と表示できません」旨の注意書きが添えられている

### TC-036: トークン一覧に name・prefix・lastUsedAt・createdAt が表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** ユーザーが 1 件以上のトークンを保有している
**WHEN** `/account` のトークン管理セクションを確認する
**THEN** 各トークン行に name / tokenPrefix + `...` / lastUsedAt（相対時間または「未使用」）/ createdAt が表示される

### TC-037: 失効済みトークンが視覚的に区別される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-10

**GIVEN** 失効済みトークンが存在する
**WHEN** トークン一覧を確認する
**THEN** 失効済みトークンの行が取り消し線・グレーアウト等で有効トークンと視覚的に区別される

### TC-038: 失効済みトークンの行に失効ボタンが表示されない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** 失効済みトークンが存在する
**WHEN** トークン一覧を確認する
**THEN** 失効済みトークンの行に失効ボタンが存在しない

---

## K. 静的解析・構造検証

### TC-039: resolveBearer ソースに `Bearer ` prefix チェックがある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05, T-12

**GIVEN** src/infrastructure/apiTokenResolver.ts が実装されている
**WHEN** ソースコードを静的解析する
**THEN** `"Bearer "` の文字列チェックがソースに含まれる

### TC-040: resolveBearer ソースに `cfp_` prefix チェックがある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05, T-12

**GIVEN** src/infrastructure/apiTokenResolver.ts が実装されている
**WHEN** ソースコードを静的解析する
**THEN** `"cfp_"` の文字列チェックがソースに含まれる

### TC-041: resolveBearer ソースに SHA-256 ハッシュ算出がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05, T-12

**GIVEN** src/infrastructure/apiTokenResolver.ts が実装されている
**WHEN** ソースコードを静的解析する
**THEN** `createHash("sha256")` または `createHash('sha256')` がソースに含まれる

### TC-042: resolveBearer ソースに revokedAt / expiresAt の検査がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05, T-12

**GIVEN** src/infrastructure/apiTokenResolver.ts が実装されている
**WHEN** ソースコードを静的解析する
**THEN** `revokedAt` と `expiresAt` の両方がソースに含まれる

### TC-043: resolveBearer ソースに deactivatedAt の検査がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05, T-12

**GIVEN** src/infrastructure/apiTokenResolver.ts が実装されている
**WHEN** ソースコードを静的解析する
**THEN** `deactivatedAt` がソースに含まれる

### TC-044: resolveBearer ソースに updateLastUsedAt の呼び出しがある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05, T-12

**GIVEN** src/infrastructure/apiTokenResolver.ts が実装されている
**WHEN** ソースコードを静的解析する
**THEN** `updateLastUsedAt` がソースに含まれる

### TC-045: createApiToken ソースに recordAudit と `api_token.create` がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06, T-13

**GIVEN** src/application/usecases/createApiToken.ts が実装されている
**WHEN** ソースコードを静的解析する
**THEN** `recordAudit` と `"api_token.create"` の両方がソースに含まれる

### TC-046: createApiToken ソースに db.transaction がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06, T-13

**GIVEN** src/application/usecases/createApiToken.ts が実装されている
**WHEN** ソースコードを静的解析する
**THEN** `db.transaction` がソースに含まれる

### TC-047: createApiToken ソースに `cfp_` prefix と randomBytes がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06, T-13

**GIVEN** src/application/usecases/createApiToken.ts が実装されている
**WHEN** ソースコードを静的解析する
**THEN** `"cfp_"` と `randomBytes` の両方がソースに含まれる

### TC-048: revokeApiToken ソースに recordAudit と `api_token.revoke` がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07, T-13

**GIVEN** src/application/usecases/revokeApiToken.ts が実装されている
**WHEN** ソースコードを静的解析する
**THEN** `recordAudit` と `"api_token.revoke"` の両方がソースに含まれる

### TC-049: revokeApiToken ソースに db.transaction がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07, T-13

**GIVEN** src/application/usecases/revokeApiToken.ts が実装されている
**WHEN** ソースコードを静的解析する
**THEN** `db.transaction` がソースに含まれる

### TC-050: revokeById ソースに userId / organizationId の WHERE 条件がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04, T-14

**GIVEN** src/infrastructure/repositories/apiTokenRepository.ts が実装されている
**WHEN** revokeById メソッドのソースを静的解析する
**THEN** `userId` と `organizationId` の両方が WHERE 相当の条件として含まれる

### TC-051: findByUserAndOrganization ソースに userId / organizationId の WHERE 条件がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04, T-14

**GIVEN** src/infrastructure/repositories/apiTokenRepository.ts が実装されている
**WHEN** findByUserAndOrganization メソッドのソースを静的解析する
**THEN** `userId` と `organizationId` の両方が WHERE 相当の条件として含まれる

### TC-052: apiTokenRepository.ts が正しいパスに存在し index.ts に re-export がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04, T-15

**GIVEN** T-04 の実装が完了している
**WHEN** ファイルシステムを確認する
**THEN** `src/infrastructure/repositories/apiTokenRepository.ts` が存在し、`src/infrastructure/repositories/index.ts` に `apiTokenRepository` の re-export がある

### TC-053: apiTokenResolver.ts が src/infrastructure/ に存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05, T-15

**GIVEN** T-05 の実装が完了している
**WHEN** ファイルシステムを確認する
**THEN** `src/infrastructure/apiTokenResolver.ts` が存在する

---

## L. ビルド品質・設計 delta

### TC-054: design/domain/model.md に ent-api-token セクションが追加されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** T-11 が完了している
**WHEN** design/domain/model.md を検査する
**THEN** `{#ent-api-token}` を含むセクションが存在する

### TC-055: bun run typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-16

**GIVEN** 全実装が完了している
**WHEN** `bun run typecheck` を実行する
**THEN** 型エラーが 0 件で正常終了する

### TC-056: bun test が全件 green（既存テスト含む）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-16

**GIVEN** 全実装が完了している
**WHEN** `bun test` を実行する
**THEN** 新規テスト・既存テスト全てが pass し、fail が 0 件

### TC-057: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-16

**GIVEN** 全実装が完了している
**WHEN** `bun run build` を実行する
**THEN** Next.js ビルドが成功しエラーが出力されない

### TC-058: bun run lint でエラーがない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-16

**GIVEN** 全実装が完了している
**WHEN** `bun run lint` を実行する
**THEN** lint エラーが 0 件

### TC-059: aozu check が exit 0（ent-api-token 追加含む）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11, T-16

**GIVEN** ent-api-token が design/domain/model.md に追加されている
**WHEN** `aozu check` を実行する
**THEN** exit code 0 で正常終了する

---

## Result

```yaml
result: completed
total: 59
automated: 48
manual: 11
must: 51
should: 7
could: 1
blocked_reasons: []
```
