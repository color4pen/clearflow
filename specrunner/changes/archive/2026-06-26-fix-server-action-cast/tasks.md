# Tasks: fix-server-action-cast

## T-01: 二重キャストと未使用 import の削除

- [x] `src/app/(dashboard)/requests/[id]/page.tsx` の L66-69 から `as unknown as ServerAction` を4箇所すべて削除する
- [x] 同ファイルの `import type { ServerAction } from "./ActionButtons"` (L17) を削除する

**Acceptance Criteria**:
- `page.tsx` 内に `as unknown as` が存在しない
- `page.tsx` 内に `ServerAction` への参照が存在しない
- `ActionButtons.tsx` 内の `ServerAction` 型定義と export は変更されていない

## T-02: 型チェックとテストの確認

- [x] `npx tsc --noEmit` が 0 exit code で完了する
- [x] `bun run build` が成功する
- [x] プロジェクトのテストスイートが green になる

**Acceptance Criteria**:
- 型チェック、ビルド、テストがすべてエラーなしで通る
