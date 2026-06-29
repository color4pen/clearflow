# Domain Invariants Review — super-admin — Iteration 1

## Meta

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **date**: 2026-06-29
- **verdict**: approved

---

## Verdict Summary

- **verdict**: approved

全ドメイン不変条件が維持されている。テナント分離・監査ログの原子性・承認ワークフロー不変条件のいずれも破壊されていない。軽微な観察事項は記録するが、修正を要するものはない。

---

## Scope of Changes

```
28 files changed, 2825 insertions(+), 2 deletions(-)
```

主な追加:
- `src/domain/services/superAdmin.ts` — `isSuperAdmin` 純関数
- `src/domain/models/auditLog.ts` — `"organization.create"` 追加
- `src/infrastructure/repositories/organizationRepository.ts` — `create` / `findAll` 追加
- `src/application/usecases/provisionOrganization.ts` — プロビジョニング usecase
- `src/application/usecases/listAllOrganizations.ts` — 一覧 usecase
- `src/app/actions/platform.ts` — Server Action
- `src/app/(platform)/layout.tsx` — スーパー管理者ゲート付きレイアウト
- テストファイル 4 件

---

## Invariant Checks

### 1. テナント分離（organizationId スコープ）

**結果: PASS**

| チェック項目 | 実装 | 判定 |
|---|---|---|
| `organizationRepository.findAll()` が業務データを JOIN しない | `organizations` テーブルの `id / name / createdAt` のみを SELECT | ✅ |
| `userRepository.create` が正しい `organizationId` を設定する | `organizationId: createdOrganization.id`（新組織の ID）を明示的に渡す | ✅ |
| 監査ログの `organizationId` が新組織を指す | `organizationId: createdOrganization.id` — スーパー管理者の所属組織ではなく新組織にスコープ | ✅ |
| 既存業務リポジトリ（案件・契約・請求等）に非スコープ API を追加していない | 変更ファイルに `organizationId` なしのクエリは `organizations` テーブルの `findAll` のみ（spec で明示的に例外許可） | ✅ |
| `/platform` からの業務データへの横断アクセス経路がない | `provisionOrganization` と `listAllOrganizations` 以外のユースケース/リポジトリは呼ばれない | ✅ |

#### 詳細: `organizationRepository.findAll` の意図的な非スコープ設計

`findAll()` は `organizationId` フィルタなしで全組織を返す。これは本変更の意図的な設計（spec.md §「テナント分離の維持」で明示的に例外許可）。呼び出し経路は `listAllOrganizations usecase → listAllOrganizationsAction (isSuperAdmin ゲート付き)` に限定されており、非スーパー管理者がこのパスに到達する手段はない。

---

### 2. 監査ログの完全性

**結果: PASS**

| チェック項目 | 実装 | 判定 |
|---|---|---|
| `"organization.create"` が `AuditAction` 型に追加されている | `src/domain/models/auditLog.ts` 55 行目 | ✅ |
| `recordAudit` が `db.transaction` の**内部**で呼ばれている | `provisionOrganization.ts` の `db.transaction` コールバック内に含まれる | ✅ |
| 中間ステップ失敗時に監査ログが残らない | `userRepository.create` 失敗のテスト（TC-019）で `auditCreateArgs === null` をアサート | ✅ |
| `actorId` がスーパー管理者の `user.id` を使用している | `actorId: session.user.id`（Server Action から渡す） | ✅ |
| `actorId` がフォーム入力から取得されていない | `session.user.id` のみ使用、FormData から `actorId` を受け取る経路なし | ✅ |

#### 詳細: 原子性の保証

```
db.transaction(async (tx) => {
  organizationRepository.create(...)  // 1. 組織作成
  userRepository.create(...)          // 2. 初期 admin 作成
  recordAudit(...)                    // 3. 監査ログ記録（同一 tx）
});
```

いずれかのステップが失敗すると全体がロールバックされる。「組織が作られたが監査ログがない」「ユーザーがいない組織が残る」などの不整合状態は発生しない。

---

### 3. 承認ワークフロー不変条件

**結果: PASS**

| チェック項目 | 実装 | 判定 |
|---|---|---|
| `canPerform` 関数と権限マトリクスに変更なし | `src/domain/authorization.ts` は変更されていない | ✅ |
| `Role` 型に `"superadmin"` を追加していない（組織内 RBAC との混線なし） | 変更なし。`isSuperAdmin` は別レイヤー（domain service）に分離 | ✅ |
| 既存承認フロー（request.create / approve / reject 等）に影響なし | 承認関連ファイルに変更なし | ✅ |
| `AuditAction` への追加は純粋加算（既存値を変更・削除しない） | `"organization.create"` を末尾に追加のみ | ✅ |

---

### 4. スーパー管理者認可ゲートの完全性

**結果: PASS**

| チェック項目 | 実装 | 判定 |
|---|---|---|
| `/platform` レイアウトで `isSuperAdmin` チェック | `(platform)/layout.tsx` で `auth()` + `isSuperAdmin` を両方チェック | ✅ |
| Server Action でも `isSuperAdmin` チェック | `provisionOrganizationAction` / `listAllOrganizationsAction` 双方で実施 | ✅ |
| `isSuperAdmin` が null/undefined email に安全に `false` を返す | 実装 7〜8 行目: `if (email == null) return false` | ✅ |
| env 未設定時に誰もアクセスできない（安全デフォルト） | `raw.trim()` が空なら即 `false`、`adminEmails` が空配列 | ✅ |
| `organizationId` を入力から受け取っていない | `actorId` は `session.user.id`、`organizationId` は DB 生成の新組織 ID | ✅ |

---

### 5. メール重複チェックと整合性

**結果: PASS（注記あり）**

`existsByEmail` はトランザクション外で実行される（TOCTOU 競合の可能性）。ただし：

- DB の UNIQUE 制約が最終防衛線として機能する
- 23505 エラーが catch され `{ ok: false }` を返す実装が存在する
- これはドメイン不変条件の違反ではなく、許容可能な設計（pre-check は UX 向け早期リターン）

---

## Observations（修正不要）

### OBS-001: /platform レイアウトが非スーパー管理者を `/login` にリダイレクト

**重要度: 情報**

`(platform)/layout.tsx` は `isSuperAdmin` 失敗時に `/login` へリダイレクトする。認証済みの一般 admin が誤ってアクセスした場合、ログイン済みであるにもかかわらずログインページに遷移する UX 上のわかりにくさがある。セキュリティ上の問題はない（アクセスを遮断している点は正しい）。

### OBS-002: 監査ログの `actorId` と `organizationId` が異なる組織に属する

**重要度: 情報**

`actorId` はスーパー管理者の `user.id`（スーパー管理者自身の所属組織のユーザー）。`organizationId` は新規作成された組織の ID。スーパー管理者は新組織に属していないが、`recordAudit` はそのまま記録する。`spec.md` が明示的にこの設計を採用しており、`auditRecorder.ts` も actorId/organizationId の整合性を検証しないため、実装として正しい。

---

## Test Coverage (Domain Invariant 観点)

| テストケース | ファイル | カバー内容 |
|---|---|---|
| `isSuperAdmin` 単体 | `superAdmin.test.ts` | 全 edge case（null/undefined/大小文字/trim/空）|
| provisionOrganization 正常系 | `provisionOrganization.dynamic.test.ts` | 組織・admin 作成、organizationId の正確性 |
| 監査ログ記録 | `provisionOrganization.dynamic.test.ts` | `organization.create` / actorId / organizationId |
| 中間失敗ロールバック | `provisionOrganization.dynamic.test.ts` (TC-019) | audit log 未記録を assert |
| email 重複 | `provisionOrganization.dynamic.test.ts` | org も user も create されないことを確認 |
| 未認証アクセス | `platformActions.test.ts` | エラー返却 |
| 非スーパー管理者アクセス | `platformActions.test.ts` | エラー返却 |

受け入れ基準のテスト方針（実 DB 不使用の usecase レベルテスト）を採用。全テスト green（1411 pass / 0 fail）。

---

## Conclusion

本変更はテナント分離・監査ログ完全性・承認ワークフロー不変条件のいずれも破壊しない。スーパー管理者機能はプロビジョニング専用に正しく制限されており、既存の組織スコープ設計に影響を与えていない。
