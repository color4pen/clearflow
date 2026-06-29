# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ | T-01〜T-06 の全チェックボックスが [x] |
| design.md | ✅ | D1〜D4 すべて準拠 |
| spec.md | ✅ | 全 5 Requirement・13 Scenario をカバー |
| request.md | ✅ | 受け入れ基準 AC-1〜AC-4 を充足 |

---

## J1: Tasks — all checkboxes marked complete

tasks.md のすべてのチェックボックスが `[x]` に更新されている。

| Task | Description | Status |
|------|-------------|--------|
| T-01 | updateUserRole.dynamic.test.ts 作成 | ✅ 全サブ項目 [x] |
| T-02 | deactivateUser.dynamic.test.ts 作成 | ✅ 全サブ項目 [x] |
| T-03 | reactivateUser.dynamic.test.ts 作成 | ✅ 全サブ項目 [x] |
| T-04 | createUser.dynamic.test.ts 作成 | ✅ 全サブ項目 [x] |
| T-05 | changeOwnPassword.dynamic.test.ts 作成 | ✅ 全サブ項目 [x] |
| T-06 | 全体検証（test / typecheck / build） | ✅ 全サブ項目 [x] |

**判定: pass**

---

## J2: Design Decisions — D1〜D4 の準拠

### D1: usecase ごとに独立した `.dynamic.test.ts` を作成する

5 つの usecase が独立したファイルに分離されている。`git diff --stat` で 5 ファイルの独立した追加を確認。

**判定: pass**

### D2: 個別ファイルモック（バレル `@/infrastructure/repositories` は使わない）

全ファイルで `mock.module("@/infrastructure/repositories/userRepository", ...)` の個別ファイルモックを使用。バレル `@/infrastructure/repositories` のモックは一切なし。

**判定: pass**

### D3: `bcryptjs` の compare/hash を state で制御する

- `createUser.dynamic.test.ts`: `hash` → 固定値 `"hashed_password"`
- `changeOwnPassword.dynamic.test.ts`: `compare` → `state.bcryptCompareResult` で制御、`hash` → 固定値 `"new_hashed_password"`

D3 の設計通りに実装されている。

**判定: pass**

### D4: 既存の静的テストは変更しない

`git diff main...HEAD --stat` で `src/application/`・`src/infrastructure/`・`src/domain/`・`src/app/` に差分なし。`userManagement.test.ts` 等の既存テストファイルにも変更なし。

**判定: pass**

---

## J3: Spec Requirements / Scenarios — カバレッジ確認

### Requirement: updateUserRole behavioral テスト（SHALL NOT readSrc/toContain）

| Scenario | テストケース | 対応 |
|----------|-------------|------|
| 自己降格は拒否される | `自己降格拒否: actorId === targetUserId のとき { ok: false }、updateRole は呼ばれない` | ✅ |
| 最後の admin を非 admin に降格しようとすると拒否される | `最後の admin 降格拒否: 他に有効な admin がいないとき { ok: false }` | ✅ |
| 他に有効な admin がいれば降格が成功し監査が記録される | `降格成功: { ok: true }、updateRole と audit が呼ばれる。metadata に oldRole/newRole を assert` | ✅ |

### Requirement: deactivateUser behavioral テスト（SHALL NOT readSrc/toContain）

| Scenario | テストケース | 対応 |
|----------|-------------|------|
| 自己無効化は拒否される | `自己無効化拒否: actorId === targetUserId のとき { ok: false }` | ✅ |
| 最後の有効 admin の無効化は拒否される | `最後の有効 admin 無効化拒否` | ✅ |
| 無効化成功時に deactivated_at が設定され監査が記録される | `member 無効化成功: { ok: true }、deactivate 引数・user.deactivate 監査を assert` | ✅ |

### Requirement: reactivateUser behavioral テスト（SHALL NOT readSrc/toContain）

| Scenario | テストケース | 対応 |
|----------|-------------|------|
| 再有効化成功時に deactivatedAt=null となり監査が記録される | `再有効化成功: { ok: true }、reactivate と user.reactivate 監査を assert` | ✅ |
| 既に有効なユーザーへの再有効化は拒否される | `既に有効なユーザーへの再有効化拒否: { ok: false }、reactivate は呼ばれない` | ✅ |

### Requirement: createUser behavioral テスト（SHALL NOT readSrc/toContain）

| Scenario | テストケース | 対応 |
|----------|-------------|------|
| email 重複時に事前チェックで拒否される | `email 重複拒否: existsByEmail が true のとき { ok: false }、userRepository.create は呼ばれない` | ✅ |
| DB 23505 制約違反時にフォールバックで拒否される | `23505 フォールバック: transaction が 23505 エラーをスローしたとき { ok: false }` | ✅ |
| 成功時に bcrypt ハッシュ済みパスワードで作成され監査が記録される | `成功パス: { ok: true }、hashedPassword="hashed_password"・user.create 監査を assert` | ✅ |

### Requirement: changeOwnPassword behavioral テスト（SHALL NOT readSrc/toContain）

| Scenario | テストケース | 対応 |
|----------|-------------|------|
| 現在パスワード不一致で拒否される | `現在パスワード不一致: bcrypt.compare が false のとき { ok: false }、updatePassword は呼ばれない` | ✅ |
| パスワード一致時に新パスワードがハッシュされ更新・監査が記録される | `パスワード変更成功: { ok: true }、updatePassword="new_hashed_password"、actorId=targetId=userId を assert` | ✅ |

**全 13 シナリオ: 判定 pass**

---

## J4: Request Acceptance Criteria — 受け入れ基準の充足

### AC-1: 要件 1〜4 が mock ベース behavioral テストで固定される（readSrc/toContain 不使用）

全 5 ファイルに `readSrc` / `toContain` の使用なし。すべてのテストが usecase を直接実行し、戻り値・repository 呼び出し引数・監査 action を `expect()` で assert している。

**判定: pass**

### AC-2: 追加テストが `.dynamic.test.ts` 作法（個別ファイルモック・バレル不使用）に従う

`mock.module("@/infrastructure/repositories/userRepository", ...)` の個別ファイルモックを使用。バレルのモックなし。`mock.module` が静的 `import` より前に配置（評価順序を保証）。`beforeEach` で state をリセット。

**判定: pass**

### AC-3: 実装ファイルに差分が無い（テストのみの追加・整理）

`git diff main...HEAD --stat` の結果、変更はすべて `specrunner/changes/behavioral-test-hardening/`（pipeline artifacts）と `src/__tests__/usecases/`（追加テスト 5 ファイル）のみ。`src/application/`、`src/infrastructure/`、`src/domain/`、`src/app/` への変更なし。

**判定: pass**

### AC-4: `bun test` green、`typecheck` green、`bun run build` 成功

verification-result.md より（iter 1）：

| Phase | Status |
|-------|--------|
| build | passed (26.1s) |
| typecheck | passed (3.7s) |
| test | passed — 1432 pass / 0 fail (489ms) |
| lint | passed (5.8s) |

**判定: pass**

---

## Issues

なし。

軽微な観察（問題ではない）:

- `updateUserRole.dynamic.test.ts` に spec の 3 シナリオに加えて「昇格成功」「対象ユーザー not found」の 2 ケースが追加されている。spec の範囲を超えるが矛盾はなく、カバレッジ増強として適切。
- `deactivateUser.dynamic.test.ts` の `deactivate` モックは `state.deactivatedUser` が null のとき例外をスローするが、各成功テストケースでは正しく `state.deactivatedUser` が設定されており、動作に問題はない。
