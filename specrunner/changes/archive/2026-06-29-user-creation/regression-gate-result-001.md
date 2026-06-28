# Regression Gate Result — Iteration 1

- **verdict**: needs-fix
- **date**: 2026-06-29

## Ledger Verification

### Finding 1 — [MEDIUM] TC-018: organizationId/actorId がセッション由来であることの静的テスト
- **File**: src/__tests__/settings/userSettingsActions.test.ts
- **Status**: ✅ FIXED
- **Evidence**: Lines 109–120 にテストが追加されている。`session.user.organizationId` / `session.user.id` の参照を確認し、`formData.get("organizationId")` / `formData.get("actorId")` が存在しないことをアサートしている。`users.ts` の実装（line 48–49）も対応している。

### Finding 2 — [MEDIUM] TC-010: 未認証ユーザーの認証チェックパスの静的テスト
- **File**: src/__tests__/settings/userSettingsActions.test.ts
- **Status**: ✅ FIXED
- **Evidence**: Lines 98–106 にテストが追加されている。`session?.user?.id` チェックと「認証が必要です」メッセージの両方を検証しており、`users.ts` line 27 の実装と一致している。

### Finding 3 — [LOW] PostgreSQL 23505 エラーの型キャストに NodeJS.ErrnoException を使用
- **File**: src/application/usecases/createUser.ts
- **Line**: 61
- **Status**: ❌ REGRESSION
- **Evidence**: 現在のコード（line 61）は `(err as NodeJS.ErrnoException & { code: string }).code === "23505"` のままであり、`NodeJS.ErrnoException` の使用が残っている。`(err as { code?: string }).code === "23505"` への修正が適用されていない。

### Finding 4 — [LOW] 一般エラー時に err.message を直接クライアントへ返す
- **File**: src/application/usecases/createUser.ts
- **Line**: 67
- **Status**: ❌ REGRESSION
- **Evidence**: 現在のコード（line 67）は `reason: err instanceof Error ? err.message : "ユーザーの作成に失敗しました"` のままであり、内部エラーメッセージがクライアントへ露出する経路が残っている。汎用メッセージへの固定化が適用されていない。

## Required Fixes

1. `src/application/usecases/createUser.ts` line 61:
   ```ts
   // Before
   (err as NodeJS.ErrnoException & { code: string }).code === "23505"
   // After
   (err as { code?: string }).code === "23505"
   ```
   また `err instanceof Error &&` のガードも不要になるため条件を整理すること。

2. `src/application/usecases/createUser.ts` line 67:
   ```ts
   // Before
   reason: err instanceof Error ? err.message : "ユーザーの作成に失敗しました",
   // After
   reason: "ユーザーの作成に失敗しました",
   ```
   詳細なエラー情報はサーバーログ（`console.error(err)`）に出力すること。
