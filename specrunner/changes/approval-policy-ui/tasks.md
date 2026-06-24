# Tasks: 承認ポリシー設定画面

## T-01: SettingsNav にポリシーリンクを追加する

- [x] `src/app/(dashboard)/settings/SettingsNav.tsx` の `NAV_ITEMS` 配列に `{ href: "/settings/policies", label: "承認ポリシー" }` を追加する
- [x] 挿入位置は「テンプレート」の直後（Webhook, テンプレート, **承認ポリシー**, ユーザー, 代理承認, 監査ログ の順）

**Acceptance Criteria**:
- 設定画面のナビゲーションに「承認ポリシー」リンクが表示される
- クリックで `/settings/policies` に遷移する
- 他のリンクの表示・動作に影響がない

## T-02: トリガーアクションのラベル定数を定義する

- [x] `src/app/(dashboard)/settings/policies/constants.ts` を新規作成する
- [x] `TRIGGER_ACTION_LABELS: Record<string, string>` を定義する: `"inquiry.convert"` → `"引合の案件化"`, `"contract.create"` → `"契約の作成"`, `"contract.cancel"` → `"契約の解除"`
- [x] `TRIGGER_ACTION_OPTIONS: { value: string; label: string }[]` を定義する（select の選択肢用、上記3つ）
- [x] `CONDITION_OPERATOR_LABELS: Record<string, string>` を定義する: `"gt"` → `">"`, `"gte"` → `"≥"`, `"lt"` → `"<"`, `"lte"` → `"≤"`, `"eq"` → `"="`, `"neq"` → `"≠"`, `"in"` → `"含む"`
- [x] ラベルマッピングに存在しない値を受け取った場合のフォールバック用ヘルパー関数 `getTriggerActionLabel(action: string): string` を export する（マッピングに存在しなければ引数をそのまま返す）
- [x] 条件表示用ヘルパー関数 `formatCondition(field: string | null, operator: string | null, value: string | null): string` を export する（field が null なら `"常に"` を返す。それ以外は `"{field} {operatorLabel} {value}"` 形式）

**Acceptance Criteria**:
- `getTriggerActionLabel("inquiry.convert")` が `"引合の案件化"` を返す
- `getTriggerActionLabel("unknown.action")` が `"unknown.action"` を返す
- `formatCondition(null, null, null)` が `"常に"` を返す
- `formatCondition("amount", "gte", "100000")` が `"amount ≥ 100000"` を返す

## T-03: サーバーアクション `src/app/actions/policies.ts` を新規作成する

- [x] `src/app/actions/policies.ts` を新規作成する（`"use server"` 宣言）
- [x] `listPoliciesAction` を実装する: `auth()` でセッション取得 → `canPerform(role, "approvalSettings", "listPolicies")` で認可チェック → `approvalPolicyRepository.findByOrganization(organizationId)` で取得 → `{ success: true, policies }` を返す
- [x] `createPolicyAction(_prevState, formData)` を実装する: `auth()` → `canPerform(role, "approvalSettings", "createPolicy")` → zod でバリデーション → `approvalPolicyRepository.create(...)` → `revalidatePath("/settings/policies")` → `{ success: true, policy }`
- [x] `updatePolicyAction(_prevState, formData)` を実装する: `auth()` → `canPerform(role, "approvalSettings", "editPolicy")` → zod でバリデーション → `approvalPolicyRepository.updateById(id, organizationId, ...)` → `revalidatePath("/settings/policies")` → `{ success: true, policy }`
- [x] `togglePolicyAction(policyId)` を実装する: `auth()` → `canPerform(role, "approvalSettings", "editPolicy")` → `approvalPolicyRepository.findById(id, organizationId)` で現在値取得 → `approvalPolicyRepository.updateById(id, organizationId, { isActive: !current.isActive })` → `revalidatePath("/settings/policies")` → `{ success: true }`
- [x] zod スキーマ `policySchema` を定義する: name（string, min(1)）、description（string, optional）、triggerAction（string, min(1)）、conditionField（string, optional）、conditionOperator（enum, conditionField 入力時は必須）、conditionValue（string, conditionField 入力時は必須）、templateId（string, min(1)）
- [x] `templates.ts` のパターンに従い、認証エラー・認可エラーは `{ success: false, message: "..." }` 形式で返す

**Acceptance Criteria**:
- `listPoliciesAction` が admin/manager で成功し、member/finance で認可エラーを返す
- `createPolicyAction` が admin で成功し、admin 以外で認可エラーを返す
- `updatePolicyAction` が admin で成功し、admin 以外で認可エラーを返す
- `togglePolicyAction` が admin で成功し、isActive が反転される
- バリデーションエラー時に `{ success: false, message }` が返る
- conditionField が空のとき conditionOperator / conditionValue は null としてリポジトリに渡される

## T-04: PolicyForm コンポーネントを作成する

- [x] `src/app/(dashboard)/settings/policies/PolicyForm.tsx` を新規作成する（`"use client"` 宣言）
- [x] Props 型を定義する: `mode: "create"` | `mode: "edit"` + `policyId: string` + `defaultValues`
- [x] テンプレート選択肢を Props で受け取る: `templates: { id: string; name: string }[]`
- [x] `useActionState` で `createPolicyAction` / `updatePolicyAction` を使い分ける（`templates.ts` の `TemplateForm` パターンに従う）
- [x] フォームフィールドを実装する:
  - ポリシー名（`Input`, type="text", required）
  - 説明（`Textarea`, 任意）
  - トリガーアクション（`Select`, required, `TRIGGER_ACTION_OPTIONS` を選択肢）
  - テンプレート（`Select`, required, Props で受け取った templates を選択肢）
  - 条件フィールド（`Input`, type="text", 任意）
  - 条件演算子（`Select`, conditionField が空のとき disabled, 入力時は required）
  - 条件値（`Input`, type="text", conditionField が空のとき disabled, 入力時は required）
- [x] 条件フィールドの連動制御: `useState` で conditionField の値を管理し、空のとき演算子・値を `disabled` にする。conditionField 入力時に演算子・値を `required` にする
- [x] 演算子の選択肢は `ConditionOperator` 型の全値（gt, gte, lt, lte, eq, neq, in）をラベル付きで定義する
- [x] 成功時に `router.push("/settings/policies")` でリダイレクトする（`useEffect` で `state.success` を監視）
- [x] エラー表示は `TemplateForm` と同じパターン（赤背景の div にメッセージ表示）
- [x] `preventEnterSubmit` を form の `onKeyDown` に設定する
- [x] 共通コンポーネント `FormField`, `Input`, `Select`, `Textarea`, `SubmitButton`, `LinkButton` を `@/app/components` から import する

**Acceptance Criteria**:
- 作成モードではフォームが空の初期状態で表示される
- 編集モードでは既存値がフォームに反映される
- 条件フィールドが空のとき、演算子と値の入力が disabled になっている
- 条件フィールドに値を入力すると、演算子と値の入力が enabled かつ required になる
- 送信成功時に `/settings/policies` にリダイレクトされる
- バリデーションエラー時にエラーメッセージが表示される

## T-05: ポリシー一覧ページを作成する

- [x] `src/app/(dashboard)/settings/policies/page.tsx` を新規作成する
- [x] `auth()` でセッション取得 → `canPerform(role, "approvalSettings", "listPolicies")` で認可チェック → 権限なしは `/requests` にリダイレクト
- [x] `listPoliciesAction()` でポリシー一覧を取得する
- [x] テンプレート名の表示用に `approvalTemplateRepository.findByOrganization(organizationId)` でテンプレート一覧を取得し、`Map<id, name>` を構築する
- [x] `PageToolbar` でタイトル「承認ポリシー管理」を表示する。admin ロールの場合のみ、actions に `[ポリシーを追加]` リンク（`/settings/policies/new`）を表示する
- [x] `DataTable` で以下のカラムを表示する:
  - ポリシー名（`name`）
  - トリガーアクション（`getTriggerActionLabel` で日本語ラベルに変換）
  - 条件（`formatCondition` で整形。null なら「常に」）
  - テンプレート名（テンプレート Map から名前を引く。見つからなければ ID 表示）
  - 状態（isActive: true → 緑「有効」、false → グレー「無効」）
  - 操作（admin の場合のみ: 編集リンク + トグルボタン）
- [x] トグルボタンは `delegations/page.tsx` の無効化ボタンと同じインライン form パターンで実装する（`togglePolicyAction` をサーバーアクションで呼び出す）
- [x] ポリシーが0件の場合は `SectionCard` で「登録済みポリシーはありません。」を表示する
- [x] フッターに件数を表示する

**Acceptance Criteria**:
- `/settings/policies` でポリシー一覧が表示される
- トリガーアクションが日本語ラベルで表示される
- 条件列が適切に表示される（「常に」または条件の内容）
- テンプレート名が表示される
- 有効/無効の状態が表示される
- admin の場合のみ作成リンク・編集リンク・トグルボタンが表示される
- manager の場合は閲覧のみ（操作列なし）
- member / finance の場合は `/requests` にリダイレクトされる

## T-06: ポリシー作成ページを作成する

- [x] `src/app/(dashboard)/settings/policies/new/page.tsx` を新規作成する
- [x] `auth()` → `canPerform(role, "approvalSettings", "createPolicy")` で認可チェック → 権限なしは `/requests` にリダイレクト
- [x] `approvalTemplateRepository.findByOrganization(organizationId)` でテンプレート一覧を取得する
- [x] ツールバー風ヘッダー「ポリシーを追加」を表示する（`templates/new/page.tsx` と同じスタイル）
- [x] `PolicyForm` を `mode="create"` と `templates` Props で呼び出す

**Acceptance Criteria**:
- `/settings/policies/new` でポリシー作成フォームが表示される
- admin ロールでのみアクセスできる
- テンプレート選択肢にテンプレート一覧が表示される
- フォーム送信でポリシーが作成される

## T-07: ポリシー編集ページを作成する

- [x] `src/app/(dashboard)/settings/policies/[id]/edit/page.tsx` を新規作成する
- [x] `auth()` → `canPerform(role, "approvalSettings", "editPolicy")` で認可チェック → 権限なしは `/requests` にリダイレクト
- [x] `params` から `id` を取得し（`Promise<{ id: string }>` 型、`templates/[id]/edit/page.tsx` と同じパターン）、`approvalPolicyRepository.findById(id, organizationId)` でポリシーを取得する
- [x] ポリシーが存在しない場合は `notFound()` を呼ぶ
- [x] `approvalTemplateRepository.findByOrganization(organizationId)` でテンプレート一覧を取得する
- [x] ツールバー風ヘッダー「ポリシーを編集」を表示する
- [x] `PolicyForm` を `mode="edit"`, `policyId`, `defaultValues`, `templates` Props で呼び出す
- [x] `defaultValues` にはポリシーの現在値（name, description, triggerAction, conditionField, conditionOperator, conditionValue, templateId）をマッピングする

**Acceptance Criteria**:
- `/settings/policies/[id]/edit` で既存ポリシーの編集フォームが表示される
- admin ロールでのみアクセスできる
- 既存値がフォームに事前入力される
- 存在しないポリシー ID で 404 が表示される
- フォーム送信でポリシーが更新される

## T-08: 最終検証

- [x] `bun run build` が成功することを確認する
- [x] `bun run typecheck` が型エラーなしで完了することを確認する
- [x] `bun test` が全件 pass することを確認する

**Acceptance Criteria**:
- `bun run build` が exit 0 で完了する
- `bun run typecheck` が型エラーなしで完了する
- `bun test` が既存テストを含め全件 pass する
