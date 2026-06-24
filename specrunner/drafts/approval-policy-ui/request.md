# 承認ポリシー設定画面

## Meta

- **type**: new-feature
- **slug**: approval-policy-ui
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存の設定画面パターン（templates, delegations）の延長 → false -->

## 背景

R04 で承認ポリシーのバックエンドを実装するが、管理者がポリシーを設定する画面がない。管理者が「どの業務ポイントで承認が必要か」を一覧・作成・編集・無効化できる設定画面を追加する。

本リクエストは R04（承認ポリシーとシステム連動承認）の完了を前提とする。

## 現状コードの前提

- `src/app/(dashboard)/settings/SettingsNav.tsx` — ナビゲーションに Webhook / テンプレート / ユーザー / 代理承認 / 監査ログ のリンクがある。ポリシーのリンクなし
- `src/app/(dashboard)/settings/templates/` — テンプレート設定画面が参考パターンとして存在する
- R04 完了後に approval_policies テーブル、approvalPolicyRepository が存在する前提

## 要件

1. **ポリシー一覧ページ**: `/settings/policies` にページを新設する。ポリシー名、トリガーアクション、条件、テンプレート名、有効/無効を一覧表示する
2. **有効/無効トグル**: 一覧の各行でポリシーの isActive を切り替えられるトグルを配置する
3. **ポリシー作成フォーム**: ポリシー名（必須）、説明（任意）、トリガーアクション（セレクト、必須）、条件フィールド（任意）、条件演算子（条件フィールド設定時は必須）、条件値（条件フィールド設定時は必須）、テンプレート（セレクト、必須）
4. **ポリシー編集フォーム**: 既存ポリシーの各フィールドを編集できる
5. **サーバーアクション**: createPolicyAction, updatePolicyAction, listPoliciesAction, togglePolicyAction を実装する
6. **認可**: ポリシーの作成・編集は admin のみ。一覧閲覧は admin / manager
7. **SettingsNav にリンク追加**: 「承認ポリシー」リンクを追加する
8. **トリガーアクションの表示名**: `inquiry.convert` → 「引合の案件化」、`contract.create` → 「契約の作成」、`contract.cancel` → 「契約の解除」のようにユーザーに分かりやすいラベルで表示する

## スコープ外

- ポリシーの削除（無効化で対応）
- 条件のプレビュー・テスト機能
- ポリシーの適用ログ・履歴

## 受け入れ基準

- [ ] `/settings/policies` でポリシー一覧が表示される
- [ ] ポリシーの新規作成ができる
- [ ] ポリシーの編集ができる
- [ ] 有効/無効の切り替えができる
- [ ] admin ロールでのみ作成・編集操作ができる
- [ ] manager ロールで一覧閲覧ができる
- [ ] member ロールではアクセスできない
- [ ] SettingsNav にポリシーリンクが表示されている
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

TBD
