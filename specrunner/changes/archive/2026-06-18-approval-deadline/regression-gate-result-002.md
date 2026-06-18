# Regression Gate Result — Iteration 002

- **verdict**: approved

## Findings Verification

### [MEDIUM] usecase統合テストが静的ソース解析のみで実際のランタイム動作を検証していない
- **File**: src/__tests__/usecases/approvalDeadline.test.ts
- **Status**: FIXED ✅
- **Evidence**: TC-008/012/013/015/016/020-023/025 の全テストが、モックされたリポジトリと実際のユースケース関数（`approveRequest`, `rejectRequest`, `expireOverdueRequests`, `createRequest`, `POST` ルートハンドラ）を呼び出すランタイム統合テストとして実装されている。`mock.module` で全外部依存をモックし、`state` オブジェクト経由で副作用を検証している。静的ソース解析（`readSrc`）は UI・シードデータ等の React レンダリング不可コンポーネントのみに限定されており、ランタイム検証可能なパスは全てランタイムテストで確認されている。

### [LOW] テスト名が期待値と矛盾している
- **File**: src/__tests__/domain/approvalStepService.test.ts:204
- **Status**: FIXED ✅
- **Evidence**: 旧テスト名 `'returns true when deadline equals now (boundary: not strictly future)'` が `'returns false when deadline equals now (strict less-than boundary)'` に修正されており、期待値 `false`（`isStepExpired(step, now).toBe(false)`）と一致している。

### [LOW] TC-013相当のテストが revision パスのエラーメッセージ位置を rejected パスの検証に使用している
- **File**: src/__tests__/usecases/approvalDeadline.test.ts
- **Status**: FIXED ✅
- **Evidence**: TC-013 テストは `src.indexOf()` による文字列位置検索を一切使用していない。`rejectRequest({ targetStatus: "rejected" })` を直接呼び出し、返り値の `result.ok === false` および `result.reason === "この承認ステップの期限が切れています"` をランタイムで検証している。

### [LOW] findOverdueRequestIds がアプリ側 new Date() を使用しており DB サーバとの時刻ズレが影響する可能性がある
- **File**: src/infrastructure/repositories/approvalStepRepository.ts:140
- **Status**: FIXED ✅
- **Evidence**: `findOverdueRequestIds` の WHERE 句が `sql\`${approvalSteps.deadline} < NOW()\`` を使用しており、DB サーバの時刻を基準にしている。アプリサーバ側の `new Date()` は使用されていない。

## Summary

全 4 件の指摘が修正済みであることを確認した。リグレッションなし。
