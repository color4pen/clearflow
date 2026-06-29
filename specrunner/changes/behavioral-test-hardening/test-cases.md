# Test Cases: behavioral-test-hardening

## Summary

- **Total**: 19 cases
- **Automated** (unit/integration): 17
- **Manual**: 2
- **Priority**: must: 14, should: 5, could: 0

---

## updateUserRole behavioral テスト

### TC-001: 自己降格は拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: updateUserRole behavioral テストが mock ベースで全ガード分岐を検証する > Scenario: 自己降格は拒否される

### TC-002: 組織で最後の admin を非 admin に降格しようとすると拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: updateUserRole behavioral テストが mock ベースで全ガード分岐を検証する > Scenario: 組織で最後の admin を非 admin に降格しようとすると拒否される

### TC-003: 他に有効な admin がいれば降格が成功し監査が記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: updateUserRole behavioral テストが mock ベースで全ガード分岐を検証する > Scenario: 他に有効な admin がいれば降格が成功し監査が記録される

### TC-014: updateUserRole — 対象ユーザーが見つからない場合に拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `findById` が null を返す（対象ユーザーが存在しない）
**WHEN** `updateUserRole` を任意の newRole で実行する
**THEN** `{ ok: false }` が返り、`updateRole` は呼ばれない

---

## deactivateUser behavioral テスト

### TC-004: 自己無効化は拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: deactivateUser behavioral テストが mock ベースで全ガード分岐を検証する > Scenario: 自己無効化は拒否される

### TC-005: 組織で最後の有効 admin の無効化は拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: deactivateUser behavioral テストが mock ベースで全ガード分岐を検証する > Scenario: 組織で最後の有効 admin の無効化は拒否される

### TC-006: 無効化成功時に deactivated_at が設定され監査が記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: deactivateUser behavioral テストが mock ベースで全ガード分岐を検証する > Scenario: 無効化成功時に deactivated_at が設定され監査が記録される

### TC-015: deactivateUser — 対象ユーザーが見つからない場合に拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `findById` が null を返す（対象ユーザーが存在しない）
**WHEN** `deactivateUser` を実行する
**THEN** `{ ok: false }` が返り、`deactivate` は呼ばれない

---

## reactivateUser behavioral テスト

### TC-007: 再有効化成功時に deactivatedAt=null となり監査が記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: reactivateUser behavioral テストが mock ベースで全分岐を検証する > Scenario: 再有効化成功時に deactivatedAt=null となり監査が記録される

### TC-008: 既に有効なユーザーへの再有効化は拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: reactivateUser behavioral テストが mock ベースで全分岐を検証する > Scenario: 既に有効なユーザーへの再有効化は拒否される

### TC-016: reactivateUser — 対象ユーザーが見つからない場合に拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `findById` が null を返す（対象ユーザーが存在しない）
**WHEN** `reactivateUser` を実行する
**THEN** `{ ok: false }` が返り、`reactivate` は呼ばれない

---

## createUser behavioral テスト

### TC-009: email 重複時に事前チェックで拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createUser behavioral テストが mock ベースで email 重複検知と正常作成を検証する > Scenario: email 重複時に事前チェックで拒否される

### TC-010: DB 23505 制約違反時にフォールバックで拒否される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: createUser behavioral テストが mock ベースで email 重複検知と正常作成を検証する > Scenario: DB 23505 制約違反時にフォールバックで拒否される

### TC-011: 成功時に bcrypt ハッシュ済みパスワードで作成され監査が記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createUser behavioral テストが mock ベースで email 重複検知と正常作成を検証する > Scenario: 成功時に bcrypt ハッシュ済みパスワードで作成され監査が記録される

---

## changeOwnPassword behavioral テスト

### TC-012: 現在パスワード不一致で拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: changeOwnPassword behavioral テストが mock ベースでパスワード照合と更新を検証する > Scenario: 現在パスワード不一致で拒否される

### TC-013: パスワード一致時に新パスワードがハッシュされ更新・監査が記録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: changeOwnPassword behavioral テストが mock ベースでパスワード照合と更新を検証する > Scenario: パスワード一致時に新パスワードがハッシュされ更新・監査が記録される

### TC-017: changeOwnPassword — ユーザーが見つからない場合に拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `findByIdForAuth` が null を返す（対象ユーザーが認証 DB に存在しない）
**WHEN** `changeOwnPassword` を実行する
**THEN** `{ ok: false }` が返り、`updatePassword` は呼ばれない

---

## テストインフラ・品質ゲート

### TC-018: テストコードが `.dynamic.test.ts` 作法に従う

**Category**: manual
**Priority**: must
**Source**: design.md > D1, D2 / tasks.md > T-01〜T-05 Acceptance Criteria

**GIVEN** 追加された `.dynamic.test.ts` ファイル群が存在する
**WHEN** 各ファイルのモック構成をレビューする
**THEN** バレル `@/infrastructure/repositories` をモックしておらず個別ファイル（`userRepository`, `auditLogRepository` 等）のみをモックしており、`readSrc` / `toContain` による静的検査が一切使用されていない

### TC-019: CI 品質ゲートを全て通過する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** テストファイルが追加された状態のリポジトリ
**WHEN** `bun test`・`bun run typecheck`・`bun run build` を実行する
**THEN** 全コマンドが正常終了し、実装ファイル（`src/application/`・`src/infrastructure/`・`src/domain/`・`src/app/` 配下）に差分がない

---

## Result

```yaml
result: completed
total: 19
automated: 17
manual: 2
must: 14
should: 5
could: 0
blocked_reasons: []
```
