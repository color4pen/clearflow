# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | correctness | `src/infrastructure/repositories/userRepository.ts` / `src/application/usecases/createUser.ts` | `findByEmailForAuth` に `isNull(users.deactivatedAt)` が追加された結果、`createUser` の email 重複チェックが無効化済みユーザーを検出できなくなった。無効化済みユーザーと同一メールで新規ユーザーを作成しようとすると、意図した「このメールアドレスは既に使用されています」メッセージではなく DB unique 制約エラーが素通りする。データ整合性は保たれるが UX regression。 | `userRepository` に `isNull` フィルターを持たない `findByEmail(email)` を別途追加し、`createUser` の重複チェックをその関数に切り替える。または `createUser` の try-catch で unique 制約エラー（`23505`）をキャッチしてフレンドリーメッセージに変換する。 | yes |
| 2 | low | correctness | `src/application/usecases/deactivateUser.ts` | `reactivateUser` は「すでに有効なユーザーを再有効化しようとした場合」に早期リターンを返すが、`deactivateUser` には「すでに無効化済みのユーザーを再度無効化しようとした場合」の対称ガードがない。二重無効化は `deactivated_at` の上書きと余分な監査ログ記録を引き起こす（データ破損なし）。 | `findById` で取得した `targetUser.deactivatedAt` が non-null の場合に `{ ok: false, reason: "ユーザーはすでに無効です" }` を早期リターンする（`reactivateUser` の "すでに有効" ガードと対称）。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.55

## Summary

全体として設計要件を忠実に実装しており、品質は高い。

**正しく実装されている点**:
- `users.deactivated_at`（nullable timestamp）の差分マイグレーションは 1 行のみ（TC-014 ✓）
- `findByEmailForAuth` / `findByIdForAuth` の両認証経路に `isNull(users.deactivatedAt)` を適用し、無効化済みユーザーを認証から遮断（TC-010, TC-017, TC-018 ✓）
- `deactivateUser` の last-admin ガードで `deactivatedAt === null` の有効 admin のみをカウント（TC-026 ✓）
- `updateUserRole` の `otherAdmins` フィルターにも `deactivatedAt === null` 条件を追加し、無効化済み admin による意図しない降格許可を防止（TC-026 ✓）
- `deactivateUser` / `reactivateUser` の両 usecase で `db.transaction` 内に repository 更新と `recordAudit` を配置（TC-025, TC-029 ✓）
- cross-org 分離は `findById(id, organizationId)` で正しく実施（TC-013 ✓）
- `canPerform("organization", "deactivateUser")` が ADMIN_ONLY で定義され、Server Actions の認可チェックで使用（TC-023, TC-030, TC-031 ✓）
- `UserDeactivateButton` が自分自身に非表示、無効化済みユーザーの role select を disabled（TC-037, TC-038 ✓）
- build / typecheck / lint / test 全 pass（verification-result.md 確認済み）

**要対応（medium）**:
- Finding #1: `findByEmailForAuth` の auth ゲート化により `createUser` の email 重複チェックが無効化済みユーザーを見落とす回帰。DB レイヤーで整合性は守られるが、ユーザーにフレンドリーなエラーメッセージが届かない。

**情報提供のみ（low / fix: no）**:
- Finding #2: `deactivateUser` の二重無効化ガード欠如は harmless だが、`reactivateUser` との非対称性あり。今回の修正スコープ対象外。
