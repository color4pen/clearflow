# Design: fix-server-action-cast

## Context

`src/app/(dashboard)/requests/[id]/page.tsx` の4箇所で `as unknown as ServerAction` の二重キャストが使われている（L66-69）。

```ts
const submitAction = submitRequestAction.bind(null, id) as unknown as ServerAction;
```

`ServerAction` 型（`ActionButtons.tsx` で定義）は `(formData: FormData) => Promise<ActionResult>`。
Server Action の元シグネチャは `(requestId: string, formData: FormData) => Promise<ActionResult>`。

TypeScript 5.9.3 + `strict: true`（`strictBindCallApply` 含む）環境下で実際に検証した結果、`.bind(null, id)` の戻り値型は `(formData: FormData) => Promise<ActionResult>` として正しく推論され、`ServerAction` 型と完全に一致する。つまり、**二重キャストは不要**であり、単純に削除するだけで型チェックが通る。

型定義の修正や `ActionButtons` の props 変更は不要。

## Goals / Non-Goals

**Goals**:

- `page.tsx` から4箇所の `as unknown as ServerAction` 二重キャストを削除する
- 不要になった `ServerAction` 型の import 文を削除する
- 型チェックとテストが引き続き通ることを確認する

**Non-Goals**:

- 他のページの型キャスト修正
- Server Action 自体のロジック変更
- `ServerAction` 型定義や `ActionButtons` コンポーネントの修正

## Decisions

### D1: キャストの単純削除（型定義の修正なし）

**選択**: `as unknown as ServerAction` を削除するだけで、型定義の変更は行わない。

**Rationale**: TypeScript 5.9.3 の `strictBindCallApply` が `.bind()` の戻り値型を正しく推論するため、そもそもキャストが不要。tsc --noEmit でキャスト除去後も型エラーが発生しないことを実証済み。request で提示された方法 A〜C のいずれも不要。

**Alternatives considered**:
- 方法 A (ServerAction 型の修正): 型はすでに互換なので不要
- 方法 B (ActionButtons の props 型修正): 型はすでに互換なので不要
- 方法 C (bind を使わず closure で参照): 動作するが、現行の `.bind()` パターンが型安全に機能するため変更理由がない

### D2: 未使用 import の削除

**選択**: `page.tsx` の `import type { ServerAction } from "./ActionButtons"` を削除する。

**Rationale**: キャスト削除後、`page.tsx` 内で `ServerAction` 型は未使用となる。`ActionButtons.tsx` 内部では引き続き使用されるため、export 自体は維持。

## Risks / Trade-offs

[Risk] TypeScript バージョンダウングレード時に `.bind()` の型推論が壊れる可能性
→ Mitigation: `strict: true` が維持される限りリスクは極めて低い。万一発生してもコンパイルエラーで即座に検知される

## Open Questions

なし
