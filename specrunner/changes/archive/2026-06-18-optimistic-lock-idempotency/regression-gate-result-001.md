# Regression Gate Result — Iteration 1

- **change**: optimistic-lock-idempotency
- **iteration**: 1
- **verdict**: approved

## Verification Summary

All 7 findings from the review ledger are confirmed fixed. No regressions detected.

---

## Finding-by-Finding Verification

### Finding 1 — [MEDIUM] 楽観的ロック競合エラーが UI に伝達されない
- **File**: `src/app/(dashboard)/requests/[id]/ActionButtons.tsx`
- **Status**: FIXED ✅

`ActionForm` コンポーネントが `useTransition` + 手動 `handleSubmit` パターンに変更されており、Server Action の戻り値 `{ success, message }` を捕捉している。`result.success === false` の場合に `setErrorMessage` で `<p role="alert">` を描画し、ユーザーにエラーメッセージを表示する実装が確認できる（lines 29–35, 42–45）。

---

### Finding 2 — [MEDIUM] 並行重複リクエスト時の unique constraint エラーが未処理
- **File**: `src/infrastructure/repositories/idempotencyKeyRepository.ts:22`
- **Status**: FIXED ✅

`isUniqueConstraintError` 関数（lines 22–29）が PostgreSQL エラーコード `23505` を検出し、`create` の catch ブロック（lines 44–51）でその場合は `return` して例外を飲み込んでいる。コメントに意図が明記されており、500 応答への昇格を防ぐ実装が確認できる。

---

### Finding 3 — [LOW] rejectRequest が request version をトランザクション外で取得している（approveRequest と非一貫）
- **File**: `src/application/usecases/rejectRequest.ts:68`
- **Status**: FIXED ✅

Finding #4 の修正（`approveRequest` のマルチステップ最終 UPDATE を `existing.version` に変更）によって、両 usecase が同じパターン（TX 外取得の `existing.version` を楽観的ロックトークンとして使用）で統一されている。`rejectRequest.ts` の lines 73・145 がいずれも `existing.version` を使用していることを確認。

---

### Finding 4 — [HIGH] マルチステップ最終 request 更新が freshRequest.version を使用 — 無効な状態遷移が可能
- **File**: `src/application/usecases/approveRequest.ts:180`
- **Status**: FIXED ✅

`approveRequest.ts` lines 179–194 で、最終 `requestRepository.updateStatus` 呼び出しが `existing.version`（TX 外スナップショット）を使用している。コメント（lines 181–186）に「`freshRequest.version` を使うと並行書き込みを受け入れて `rejected → approved` の無効遷移が発生する」旨が明記されており、意図的な選択であることが確認できる。

---

### Finding 5 — [HIGH] マルチステップ承認パスのロール検証が outer snapshot のみ — TX 内 freshCurrentStep に対して再検証されない
- **File**: `src/application/usecases/approveRequest.ts:121`
- **Status**: FIXED ✅

TX 内部（lines 126–134）で `canApprove(freshCurrentStep, data.actorRole)` による再検証が実装されている。コメント（lines 127–130）に「TX 外スナップショットで Step N を通過した後に Step N が別トランザクションで承認された場合、`freshCurrentStep` は Step N+1 になり得る」という根拠が記載されており、ロール認可バイパスが塞がれていることを確認。

---

### Finding 6 — [MEDIUM] idempotency_keys.key のユニーク制約がグローバルスコープ — クロステナント衝突で冪等性保証が機能しない
- **File**: `src/infrastructure/schema.ts:111`
- **Status**: FIXED ✅

`idempotencyKeys` テーブルの unique 制約が `unique("idempotency_keys_key_org_unique").on(table.key, table.organizationId)`（lines 122–123）として `(key, organizationId)` の複合制約に変更されている。グローバルスコープの単一 key 制約は削除されており、テナント分離が DB レベルで保証されていることを確認。

---

### Finding 7 — [LOW] idempotencyKey のサーバー側 UUID 形式バリデーション未実装
- **File**: `src/app/actions/requests.ts`
- **Status**: FIXED ✅

UUID v4 形式の正規表現 `UUID_RE`（lines 34–35）と `isValidIdempotencyKey` ガード関数（lines 41–43）が実装されている。全 Server Actions（`submitRequestAction`, `approveRequestAction`, `rejectRequestAction`, `resubmitRequestAction`）において、`findByKey` 呼び出し前および `create` 呼び出し前に `isValidIdempotencyKey` でガードされており、任意文字列が DB に書き込まれないことを確認。

---

## Regressions

なし。

## Contradictions

なし。
