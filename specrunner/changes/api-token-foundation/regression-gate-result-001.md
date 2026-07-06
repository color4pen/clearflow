# Regression Gate Result — Iteration 1

- **verdict**: needs-fix
- **date**: 2026-07-06

## Summary

前回レビューで指摘された 3 件の修正が、いずれも現在のコードに反映されていない。すべて未修正のままのためリグレッションとして報告する。

---

## Finding 1 — `listApiTokensAction` が未認証時に空配列をサイレント返却（TC-033 乖離）

- **severity**: high
- **resolution**: fixable
- **file**: src/app/actions/apiTokens.ts
- **line**: 103

### 状態

未修正。`if (!session?.user?.id) return [];` が依然そのままで、認証エラーを返す変更が行われていない。

### 修正方針

戻り値の型をエラーケースを含む型（例: `ListApiTokensResult`）に変更し、未認証時に `{ success: false, message: "認証が必要です" }` を返すよう修正する。

---

## Finding 2 — 空の `export type { }` 文が残存

- **severity**: high
- **resolution**: fixable
- **file**: src/application/usecases/index.ts
- **line**: 123

### 状態

未修正。`export type { } from "./createApiToken"` が line 123 に依然残存している。

### 修正方針

該当行を削除する。

---

## Finding 3 — Zod バリデーションが whitespace-only な name を通過させる

- **severity**: high
- **resolution**: fixable
- **file**: src/app/actions/apiTokens.ts
- **line**: 12

### 状態

未修正。`z.string().min(1, ...)` が依然そのままで、`.trim()` が追加されていない。

### 修正方針

`z.string().trim().min(1, "トークン名は必須です").max(100, "トークン名は100文字以内で入力してください")` に変更する。
