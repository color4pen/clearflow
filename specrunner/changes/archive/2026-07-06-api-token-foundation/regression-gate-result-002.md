# Regression Gate Result — Iteration 2

- **verdict**: approved
- **date**: 2026-07-06

## Summary

前回レビューで指摘された 3 件の修正がすべて現在のコードに正しく反映されていることを確認した。リグレッションなし。

---

## Finding 1 — `listApiTokensAction` が未認証時に空配列をサイレント返却（TC-033 乖離）

- **status**: fixed
- **file**: src/app/actions/apiTokens.ts:105-115

### 確認内容

`listApiTokensAction` は未認証時に `{ success: false, message: "認証が必要です" }` を返すよう修正されている。戻り値の型も `ListApiTokensResult` に変更されており、サイレントな空配列返却はない。

```ts
export async function listApiTokensAction(): Promise<ListApiTokensResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };
  ...
}
```

---

## Finding 2 — 空の `export type { }` 文が残存

- **status**: fixed
- **file**: src/application/usecases/index.ts

### 確認内容

`index.ts` の末尾に空の `export type { } from "./createApiToken"` は存在しない。API トークン関連のエクスポートは正常な形式（lines 122-124）になっている。

```ts
export { createApiToken } from "./createApiToken";
export { revokeApiToken } from "./revokeApiToken";
export { listApiTokens } from "./listApiTokens";
```

---

## Finding 3 — Zod バリデーションが whitespace-only な name を通過させる

- **status**: fixed
- **file**: src/app/actions/apiTokens.ts:12

### 確認内容

`createApiTokenSchema` の `name` フィールドが `z.string().trim().min(1, ...)` に修正されており、whitespace-only な入力を正しく拒否するようになっている。

```ts
name: z.string().trim().min(1, "トークン名は必須です").max(100, "トークン名は100文字以内で入力してください"),
```
