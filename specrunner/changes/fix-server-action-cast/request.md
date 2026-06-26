# Server Action の二重キャスト解消

## Meta

- **type**: refactor
- **slug**: fix-server-action-cast
- **base-branch**: main
- **adr**: false

## 背景

承認リクエスト詳細ページ（requests/[id]/page.tsx）で `as unknown as ServerAction` の二重キャストが 4 箇所使われている。型チェックを完全に回避しており、ランタイムまでエラーが検出されない。

## 現状コードの前提

- `src/app/(dashboard)/requests/[id]/page.tsx:66-69` — submitRequestAction, approveRequestAction, rejectRequestAction, resubmitRequestAction を `.bind(null, id)` した後に `as unknown as ServerAction` でキャスト
- ActionButtons コンポーネント等が `ServerAction` 型の props を期待しているため、`.bind()` の戻り値型と合わない

## 要件

1. **ServerAction 型の定義確認**: 現在の `ServerAction` 型定義を確認し、`.bind()` の戻り値型との不一致箇所を特定する
2. **型安全な解決**: 以下のいずれかの方法で解決する（実装時にコードを確認して最適な方法を選択）
   - 方法 A: ServerAction 型を `.bind()` の戻り値と互換にする型定義の修正
   - 方法 B: ActionButtons コンポーネントの props 型を修正して `.bind()` の戻り値を直接受け取れるようにする
   - 方法 C: `.bind()` を使わず、Client Component 内で id を closure で参照する形に変更する
3. **4 箇所の `as unknown as` を全て削除**: 二重キャストを残さない

## スコープ外

- 他のページの型キャスト修正
- Server Action 自体のロジック変更

## 受け入れ基準

- [ ] `as unknown as` が requests/[id]/page.tsx から全て削除されている
- [ ] 型チェックが通る（`as` キャストなし）
- [ ] 承認の承認・却下・提出・再提出操作が引き続き動作する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **型定義の修正を優先** — `as` キャスト自体を使わない解決策を採用する。型が合わない根本原因を修正する
