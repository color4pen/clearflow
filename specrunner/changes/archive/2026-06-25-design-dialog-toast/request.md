# ダイアログ・トーストのデザイン統一

## Meta

- **type**: spec-change
- **slug**: design-dialog-toast
- **base-branch**: main
- **adr**: false

## 背景

Claude Design（docs/design/Clearflow.dc.html の DIALOG / TOAST セクション）に合わせて確認ダイアログとトースト通知のスタイルを統一する。

## 現状コードの前提

- 確認ダイアログ: 各画面で window.confirm() または独自実装。統一されていない
- トースト通知: 一部の画面でインラインメッセージ表示。統一されたトーストコンポーネントなし
- `docs/design/Clearflow.dc.html` — ダイアログ: オーバーレイ + 中央モーダル（max-width 420px、border-radius 4px、shadow）。トースト: 右上固定位置、成功（緑）/エラー（赤）

## 要件

1. **確認ダイアログコンポーネント**: `src/app/components/ConfirmDialog.tsx` を新設する。オーバーレイ（半透明黒）+ 中央モーダル（max-width 420px、bg-surface、border-radius 4px、shadow-md）。タイトル + メッセージ + キャンセル（outline）+ 確認（primary or danger）ボタン。danger バリアント（受注/失注、契約解除、削除用）は確認ボタンを赤にする
2. **入金日入力ダイアログ**: ConfirmDialog を拡張して日付入力フィールドを含むバリアントを作る。または別コンポーネント InputDialog として実装する
3. **トーストコンポーネント**: `src/app/components/Toast.tsx` を新設する。右上固定位置（top: 16px, right: 16px）。成功: 緑左ボーダー + 白背景。エラー: 赤左ボーダー + 白背景。3 秒で自動消去。メッセージテキスト
4. **既存の window.confirm() を置換**: 全画面の window.confirm() 呼び出しを ConfirmDialog に置き換える。対象: 受注/失注確認、契約完了/解除確認、削除確認
5. **既存のインラインメッセージをトーストに置換**: フォーム送信後の成功/エラーメッセージをトーストに統一する

## スコープ外

- アニメーション（フェードイン/アウト）
- 複数トーストのスタック表示

## 受け入れ基準

- [ ] ConfirmDialog コンポーネントが存在する
- [ ] ConfirmDialog に通常バリアントと danger バリアントがある
- [ ] Toast コンポーネントが存在する
- [ ] Toast に成功とエラーの 2 バリアントがある
- [ ] 既存の window.confirm() が ConfirmDialog に置き換えられている
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **ConfirmDialog を共通コンポーネントに** — 各画面で独自実装するのではなく、共通の ConfirmDialog を全画面で再利用する。danger バリアントで不可逆操作の確認を統一的に行う
2. **トーストは React Context で管理** — トーストの表示/非表示をグローバルに管理するため、Context + Provider パターンを使用する。各コンポーネントから useToast() フックでトーストを発行する
