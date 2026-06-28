# Regression Gate Result — Iteration 002

- **verdict**: approved

## Summary

All 4 findings from the previous review are confirmed fixed. No regressions detected.

---

## Finding Verification

### [MEDIUM] TC-018（must）欠落: organizationId/actorId がセッション由来であることの静的テストが未実装

- **Status**: ✅ Fixed
- **Evidence**: `src/__tests__/settings/userSettingsActions.test.ts` lines 108–120 に新テスト `"TC-018: organizationId と actorId が formData からではなくセッションから参照される"` が追加されている。`session.user.organizationId` / `session.user.id` を含むことと、`formData.get("organizationId"` / `formData.get("actorId"` を含まないことの両方をアサートしている。

### [MEDIUM] TC-010（must）欠落: 未認証ユーザーの認証チェックパスの静的テストが未実装

- **Status**: ✅ Fixed
- **Evidence**: `src/__tests__/settings/userSettingsActions.test.ts` lines 97–106 に新テスト `"TC-010: 未認証時に「認証が必要です」を返す分岐が存在する"` が追加されている。`session?.user?.id` チェックと `"認証が必要です"` 文字列の両方をアサートしている。

### [LOW] PostgreSQL 23505 エラーの型キャストに NodeJS.ErrnoException を使用しており意味的に不正確

- **Status**: ✅ Fixed
- **Evidence**: `src/application/usecases/createUser.ts` line 58 にて `(err as { code?: string }).code === "23505"` に変更済み。`NodeJS.ErrnoException` は使用されていない。

### [LOW] 一般エラー時に err.message を直接クライアントへ返しており内部情報が露出しうる

- **Status**: ✅ Fixed
- **Evidence**: `src/application/usecases/createUser.ts` lines 61–62 にて `console.error("[createUser] unexpected error:", err)` でサーバーログに出力し、クライアントには固定メッセージ `"ユーザーの作成に失敗しました"` を返すように変更済み。`err.message` をクライアントへ露出させていない。
