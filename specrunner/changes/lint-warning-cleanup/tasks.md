# Tasks: lint-warning-cleanup

## T-01: 未使用 import の除去

3 ファイルから未使用の import シンボルを削除する。

- [x] `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx` L6: named import リストから `Textarea` を除去する。変更後: `import { Input, Select, MarkdownTextarea, preventEnterSubmit } from "@/app/components";`
- [x] `src/app/components/FormField.tsx` L1: `import type` から `FormEvent` を除去する。変更後: `import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from "react";`
- [x] `src/app/components/MarkdownTextarea.tsx` L6: `import { Textarea } from "./FormField";` の行全体を削除する（コンポーネント内で `Textarea` は一切使用されていない）

**Acceptance Criteria**:
- 上記 3 ファイルから未使用 import が消えている
- 各ファイルの残りの import は変更されていない
- `bun run lint` で該当 3 件の warning が消えている

## T-02: eslint 設定に argsIgnorePattern を追加

`eslint.config.mjs` に `@typescript-eslint/no-unused-vars` のルールオーバーライドを追加し、`_` プレフィックス引数を許容する。

- [x] `eslint.config.mjs` の `defineConfig` 配列に、`@typescript-eslint/no-unused-vars` を `"warn"` + `argsIgnorePattern: "^_"` で上書きするルール設定オブジェクトを追加する。既存の `...nextVitals`, `...nextTs`, `globalIgnores(...)` の後に配置する

設定例:
```js
{
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", {
      argsIgnorePattern: "^_",
    }],
  },
},
```

**Acceptance Criteria**:
- DeleteButton.tsx の `_prev` / `_formData` に対する warning が消えている
- `_` プレフィックスのない未使用引数は引き続き警告される
- DeleteButton.tsx のソースコードは一切変更されていない

## T-03: seed.ts の未使用 const 束縛を除去

`src/infrastructure/seed.ts` の 5 箇所で、`const [varName] =` の束縛を除去し `await` 式のみ残す。insert の副作用（データ投入）は維持する。

- [x] L517: `const [greenContact1] = await db` → `await db`
- [x] L558: `const [newInquiry1] = await db.insert(inquiries).values({` → `await db.insert(inquiries).values({`（`.returning()` はそのまま残す）
- [x] L567: `const [newInquiry2] = await db.insert(inquiries).values({` → `await db.insert(inquiries).values({`
- [x] L575: `const [inProgressInquiry1] = await db.insert(inquiries).values({` → `await db.insert(inquiries).values({`
- [x] L585: `const [inProgressInquiry2] = await db.insert(inquiries).values({` → `await db.insert(inquiries).values({`

**Acceptance Criteria**:
- seed.ts の 5 件の warning が消えている
- insert 文の `.values({...}).returning()` チェーンは変更されていない（投入データは不変）
- seed により投入されるレコード件数は変わらない

## T-04: 全体検証

全変更完了後にプロジェクト全体の品質ゲートを通す。

- [x] `bun run lint` が 0 error / 0 warning であること
- [x] `bun run build` が成功すること
- [x] `bun test` が green であること（テストが存在する場合）

**Acceptance Criteria**:
- 上記 3 コマンドがすべて成功する
- 画面表示・seed の投入データに挙動変化がない（コード差分が未使用シンボル除去と eslint 設定追加のみであることで保証）
