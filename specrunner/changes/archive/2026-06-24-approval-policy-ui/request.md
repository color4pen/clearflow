# 承認ポリシー設定画面

## Meta

- **type**: new-feature
- **slug**: approval-policy-ui
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存の設定画面パターン（templates/）の踏襲 → false -->

## 背景

R04a/R04b で承認ポリシーのバックエンド（テーブル、リポジトリ、評価ロジック）を実装した。管理者がポリシーを一覧・作成・編集・無効化できる設定画面を追加する。

## 現状コードの前提

- `src/infrastructure/repositories/approvalPolicyRepository.ts:41-152` — create, findById, findByOrganization, findActiveByTriggerAction, updateById, deleteById が実装済み
- `src/domain/models/approvalPolicy.ts` — ApprovalPolicy 型（id, organizationId, name, description, triggerAction, conditionField, conditionOperator, conditionValue, templateId, isActive, createdAt）が定義済み
- `src/app/(dashboard)/settings/SettingsNav.tsx:6-12` — NAV_ITEMS 配列に Webhook, テンプレート, ユーザー, 代理承認, 監査ログ の 5 項目。ポリシーなし
- `src/app/(dashboard)/settings/templates/` — テンプレート設定画面が参考パターン（page.tsx, TemplateForm.tsx, new/, [id]/, DeleteButton.tsx）
- `src/domain/authorization.ts` — canPerform 関数で認可チェック。approval_settings エンティティの policy_list は admin/manager、policy_create/policy_edit は admin のみ
- `src/app/actions/templates.ts` — テンプレートのサーバーアクション実装が参考パターン

## 要件

1. **ポリシー一覧ページ**: `/settings/policies/page.tsx` を新設する。approvalPolicyRepository.findByOrganization で取得し、ポリシー名、トリガーアクション（日本語ラベル表示）、条件（あれば表示、なければ「常に」）、テンプレート名、有効/無効を一覧表示する
2. **トリガーアクションの日本語ラベル**: `inquiry.convert` → 「引合の案件化」、`contract.create` → 「契約の作成」、`contract.cancel` → 「契約の解除」のマッピングを定義する
3. **有効/無効トグル**: 一覧の各行に isActive を切り替えるトグルボタンを配置する。approvalPolicyRepository.updateById で isActive を更新する
4. **ポリシー作成ページ**: `/settings/policies/new/page.tsx` を新設する。PolicyForm コンポーネントを共通化して作成・編集で再利用する
5. **PolicyForm コンポーネント**: ポリシー名（text, 必須）、説明（textarea, 任意）、トリガーアクション（select, 必須）、条件フィールド（text, 任意）、条件演算子（select, 条件フィールド入力時は必須）、条件値（text, 条件フィールド入力時は必須）、テンプレート（select, 必須 — approvalTemplateRepository.findByOrganization で選択肢を取得）
6. **ポリシー編集ページ**: `/settings/policies/[id]/page.tsx` を新設する。既存のポリシーをフォームに表示して編集する
7. **サーバーアクション**: `src/app/actions/policies.ts` を新設する。createPolicyAction, updatePolicyAction, togglePolicyAction, listPoliciesAction を実装する。認可: 作成・編集・トグルは admin のみ、一覧は admin/manager
8. **SettingsNav にリンク追加**: NAV_ITEMS に `{ href: "/settings/policies", label: "承認ポリシー" }` を追加する
9. **条件入力の連動**: 条件フィールドが空の場合は演算子・値の入力を disabled にする。条件フィールドが入力されたら演算子・値を required にする

## スコープ外

- ポリシーの削除（無効化で対応）
- 条件のプレビュー・テスト機能
- ポリシーの適用ログ・履歴

## 受け入れ基準

- [ ] `/settings/policies` でポリシー一覧が表示される
- [ ] ポリシーの新規作成ができる
- [ ] ポリシーの編集ができる
- [ ] 有効/無効の切り替えができる
- [ ] admin ロールでのみ作成・編集・トグル操作ができる
- [ ] manager ロールで一覧閲覧ができる
- [ ] member / finance ロールではアクセスが拒否される
- [ ] SettingsNav に「承認ポリシー」リンクが表示されている
- [ ] トリガーアクションが日本語ラベルで表示される
- [ ] 条件フィールドが空のとき演算子・値が disabled になる
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **templates/ と同じディレクトリ構成** — page.tsx（一覧）、new/page.tsx（作成）、[id]/page.tsx（編集）、PolicyForm.tsx（共通フォーム）。理由: 既存パターンとの一貫性。却下案: モーダルで作成・編集 — ポリシーのフィールド数が多く、モーダルでは狭い
