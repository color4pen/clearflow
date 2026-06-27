# Design: lint-warning-cleanup

## Context

`bun run lint` は 0 error だが `@typescript-eslint/no-unused-vars` の warning が 10 件残っている。内訳は 3 カテゴリに分類される:

1. **未使用 import (3 件)** — `Textarea` (2 ファイル)、`FormEvent` (1 ファイル)
2. **未使用引数 (2 件)** — DeleteButton.tsx の Server Action で `_prev` / `_formData` が `_` プレフィックス付きだが eslint が警告
3. **未使用 const (5 件)** — seed.ts で `insert().returning()` の戻り値を const に束縛しているが参照していない

挙動変更は一切ない。

### 対象ファイル一覧

| ファイル | 行 | 警告対象 | カテゴリ |
|---------|-----|---------|---------|
| `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx` | 6 | `Textarea` (import) | 未使用 import |
| `src/app/components/FormField.tsx` | 1 | `FormEvent` (import type) | 未使用 import |
| `src/app/components/MarkdownTextarea.tsx` | 6 | `Textarea` (import) | 未使用 import |
| `src/app/(dashboard)/settings/templates/DeleteButton.tsx` | 10 | `_prev`, `_formData` | 未使用引数 |
| `src/infrastructure/seed.ts` | 517,558,567,575,585 | `greenContact1`, `newInquiry1`, `newInquiry2`, `inProgressInquiry1`, `inProgressInquiry2` | 未使用 const |

## Goals / Non-Goals

**Goals**:

- `bun run lint` の warning を 0 にする
- 画面表示・seed の投入データ・既存テストの挙動を一切変えない

**Non-Goals**:

- eslint-disable コメントで警告を握りつぶす対応
- `argsIgnorePattern: "^_"` 以外の eslint 設定変更
- 未使用シンボル除去以外のリファクタリング

## Decisions

### D1: 未使用 import は直接除去する

**対応**: import 文から未使用シンボルを削除する。

- InquiryInfoSection.tsx: named import リストから `Textarea` を除去（`Input, Select, MarkdownTextarea, preventEnterSubmit` は残る）
- FormField.tsx: `import type` から `FormEvent` を除去（`ReactNode`, `KeyboardEvent as ReactKeyboardEvent` は残る）
- MarkdownTextarea.tsx: `import { Textarea } from "./FormField"` の行全体を削除（コンポーネント内で `<textarea>` HTML 要素を直接使用しており `Textarea` コンポーネントは不要）

**Rationale**: 未使用 import は無意味なコードであり、disable コメントより除去が適切。

**Alternatives considered**: eslint-disable コメント → 原因を残すため不採用。

### D2: `_` プレフィックス引数は eslint 設定で許容する

**対応**: `eslint.config.mjs` に `@typescript-eslint/no-unused-vars` ルールのオーバーライドを追加し、`argsIgnorePattern: "^_"` を設定する。

DeleteButton.tsx の `_prev` / `_formData` は `useActionState` のコールバックシグネチャ上必須の引数であり、削除するとランタイムエラーになる。`_` プレフィックスで「意図的な未使用」を表す慣習に従い、eslint 側で許容する。

**Rationale**: 引数を削除できないため、eslint 設定の調整が唯一の正当な手段。`argsIgnorePattern: "^_"` は TypeScript コミュニティの標準的な慣習。

**Alternatives considered**:
- 引数を削除 → `useActionState` のシグネチャ要件で不可
- eslint-disable コメント → 横展開性がなく、同パターンの引数が増えるたびにコメントが必要になる

### D3: seed の未使用 const は束縛を外して insert 副作用のみ残す

**対応**: `const [varName] = await db.insert(...).returning()` を `await db.insert(...).returning()` に変更する。5 件すべてで、宣言行以外に変数の参照箇所がないことを確認済み（FK 参照漏れなし）。

**Rationale**: insert の副作用（データ投入）はそのまま維持し、使わない戻り値の束縛だけ除去する。投入データ件数・内容は不変。

**Alternatives considered**:
- `.returning()` 自体を削除 → 不要だが影響範囲が広がるため最小変更に留める
- eslint-disable コメント → 原因を残すため不採用

## Risks / Trade-offs

- [Risk] seed.ts の変数が実は後続コードで FK 参照されるべきだった → **Mitigation**: grep で全ファイルを検索し、宣言行以外に参照がないことを確認済み。FK 参照漏れはない。
- [Risk] eslint 設定変更が他のコードに影響する → **Mitigation**: `argsIgnorePattern: "^_"` は `_` プレフィックス引数のみを許容するため、意図しない未使用引数の見逃しリスクは極めて低い（`_` プレフィックスは明示的な未使用宣言）。
- [Risk] MarkdownTextarea.tsx の `Textarea` import 削除で見えない依存が壊れる → **Mitigation**: `Textarea` は import のみで JSX・ロジックで一切参照されていないことを確認済み。コンポーネントは `<textarea>` HTML 要素を直接使用している。

## Open Questions

なし。全警告の原因と対処方針が確定している。
