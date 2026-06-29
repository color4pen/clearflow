# Regression Gate Result — iteration 001

- **verdict**: approved
- **iteration**: 001

## Summary

4 件の所見を検証した。TC-019 の修正は現在のコードに正しく存在する。残り 3 件はレビューで Fix=no と判定された意図的な未修正であり、現行コードの状態はレビュー承認時と一致している。リグレッションなし。

---

## Verification Results

### Finding 1: [MEDIUM] TC-019（中間ステップ失敗→全ロールバック）が未カバー

- **File**: `src/__tests__/usecases/provisionOrganization.dynamic.test.ts`
- **Status**: ✅ FIXED — 修正が現在のコードに存在する
- **Evidence**:
  - `state` オブジェクトに `failAtUserCreate: false` フラグが追加されている
  - `userRepository.create` モックが `state.failAtUserCreate` を参照し、`true` のとき例外をスローする
  - `"TC-019: 中間ステップ失敗（userRepository.create エラー）→ 全ロールバック相当・{ ok: false } が返る"` テストケースが追加されており、以下を検証する:
    - `organizationRepository.create` は呼ばれる（`orgCreateArgs !== null`）
    - `userRepository.create` は呼ばれる（`userCreateArgs !== null`）
    - 監査ログは記録されない（`auditCreateArgs === null`）
    - `result.ok === false` が返る
  - `provisionOrganization.ts` の `try/catch`（line 27–72）が `userRepository.create` の例外を捕捉し `{ ok: false, reason: "..." }` を返す実装と整合している

---

### Finding 2: [MEDIUM] TC-010〜TC-014（organizationRepository 統合テスト）が未実装

- **File**: `src/__tests__/usecases/`
- **Status**: ✅ ACKNOWLEDGED — 意図的な未修正。リグレッションなし
- **Evidence**:
  - `listAllOrganizations.dynamic.test.ts` はモックベースのテストであり、実 DB に対する統合テストは存在しない
  - レビュー（`review-feedback-001.md`）の Fix 列は `no` — "プロジェクト規約（モックベース）として承認済み、リリースブロッカーではない" との判定
  - `findAll` の `createdAt` 降順実装（`organizationRepository.ts` line 28）は静的コードで確認可能
  - 現行状態はレビュー承認時と変わらず、意図どおり

---

### Finding 3: [LOW] RSC から Server Action 経由で auth チェックを二重実行

- **File**: `src/app/(platform)/platform/page.tsx`
- **Status**: ✅ ACKNOWLEDGED — 意図的な未修正。リグレッションなし
- **Evidence**:
  - `platform/page.tsx` line 5: `listAllOrganizationsAction()` を呼び出し
  - `platform.ts` の `listAllOrganizationsAction`（line 65–76）は `auth() + isSuperAdmin` チェックを含む
  - `(platform)/layout.tsx` も `auth() + isSuperAdmin` を検証しており二重チェックが存在する
  - レビューの Fix 列は `no` — "defense-in-depth として許容範囲" との判定
  - 現行状態はレビュー承認時と変わらず、意図どおり

---

### Finding 4: [LOW] 認証済み非スーパー管理者を /login にリダイレクト（UX 改善余地）

- **File**: `src/app/(platform)/layout.tsx:16`
- **Status**: ✅ ACKNOWLEDGED — 意図的な未修正。リグレッションなし
- **Evidence**:
  - `layout.tsx` line 16: `redirect("/login");` — 認証済み非スーパー管理者を `/login` にリダイレクトしている
  - `/dashboard` または 403 ページへの変更は未実施
  - レビューの Fix 列は `no` — "セキュリティ上の欠陥ではなく UX 改善" との判定
  - 現行状態はレビュー承認時と変わらず、意図どおり

---

## Findings (regressions only)

リグレッション（修正済み所見の再発）は検出されなかった。

| # | Severity | File | Description | Resolution |
|---|----------|------|-------------|------------|
| — | — | — | なし | — |
