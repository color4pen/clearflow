# lint warning の解消（未使用 import / 変数の除去）

## Meta

- **type**: spec-change
- **slug**: lint-warning-cleanup
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 構造的リファクタリングや振る舞い/契約を変える修正 → true。本リクエストは未使用シンボルの除去のみで挙動を変えないため false -->

## 背景

`bun run lint` は 0 error だが warning が10件残っている（全て @typescript-eslint/no-unused-vars）。未使用の import と変数を除去し、lint warning を 0 にする。挙動は一切変えない。

## 現状コードの前提

- src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx:6 — 未使用 import `Textarea`
- src/app/components/FormField.tsx:1 — 未使用 import `FormEvent`
- src/app/components/MarkdownTextarea.tsx:6 — 未使用 import `Textarea`
- src/app/(dashboard)/settings/templates/DeleteButton.tsx:10 — Server Action の未使用引数 `_prev` / `_formData`（既に `_` プレフィックス済みだが eslint が警告）
- src/infrastructure/seed.ts:517,558,567,575,585 — 未使用の const `greenContact1` / `newInquiry1` / `newInquiry2` / `inProgressInquiry1` / `inProgressInquiry2`（insert の戻り値を受けているが参照していない）

## 要件

1. **未使用 import の除去**: InquiryInfoSection.tsx の `Textarea`、FormField.tsx の `FormEvent`、MarkdownTextarea.tsx の `Textarea` を削除する
2. **未使用引数の処理**: DeleteButton.tsx の Server Action 引数 `_prev` / `_formData` は useActionState のシグネチャ上必要だが本体で使わない。eslint の no-unused-vars に `argsIgnorePattern: "^_"` を設定して `_` プレフィックス引数を許容する（コードからは消さない）
3. **seed の未使用 const の処理**: seed.ts の未使用 const（`greenContact1` ほか4件）は、後続で FK 参照する想定がなければ `const x =` の束縛を外して insert の副作用のみ残す。投入データ件数は減らさない。もし参照漏れ（本来 FK に使うべき）が判明した場合は実装せず報告する
4. **挙動を変えない**: 画面・seed の投入結果・既存テストは不変

## スコープ外

- eslint ルールを disable コメントで握りつぶす対応（原因シンボルを除去/許容設定で解消する）
- lint 設定の大幅変更（`argsIgnorePattern: "^_"` の追加のみ許容）
- 未使用シンボル以外のリファクタリング

## 受け入れ基準

- [ ] `bun run lint` が 0 error / 0 warning になる
- [ ] 画面・seed の投入データ・既存テストに挙動変化がない
- [ ] `typecheck` が green、`bun test` が green、`bun run build` が成功する

## architect 評価済みの設計判断

1. **警告は disable コメントで隠さず原因を除去/許容設定で解消する** — 設計書のコメント規約（後方互換ハック・未使用残置の禁止）に沿う
2. **`_` プレフィックス引数は削除せず eslint 設定で許容する** — useActionState のシグネチャ上必要な引数であり、削除はできない。`argsIgnorePattern: "^_"` は意図的な未使用を表す標準的な慣習
3. **seed の未使用 const は insert 副作用を残して束縛だけ落とす** — 投入データを減らさずに警告を解消する。FK 参照漏れの疑いがあれば実装せず報告し、別途判断する
