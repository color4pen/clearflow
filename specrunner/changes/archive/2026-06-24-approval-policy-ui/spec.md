# Spec: 承認ポリシー設定画面

## Requirements

### Requirement: ポリシー一覧ページは認可された管理者とマネージャーのみがアクセスできる

The system SHALL allow admin and manager roles to view the policy list at `/settings/policies`. The system SHALL redirect member and finance roles to `/requests`. The list MUST display only policies belonging to the user's organization (tenant isolation).

#### Scenario: admin ユーザーがポリシー一覧を閲覧する

**Given** admin ロールのユーザーがログインしている
**When** `/settings/policies` にアクセスする
**Then** 所属組織のポリシー一覧が表示される

#### Scenario: manager ユーザーがポリシー一覧を閲覧する

**Given** manager ロールのユーザーがログインしている
**When** `/settings/policies` にアクセスする
**Then** 所属組織のポリシー一覧が表示される（ただし作成・編集リンクは非表示）

#### Scenario: member ユーザーがアクセスを拒否される

**Given** member ロールのユーザーがログインしている
**When** `/settings/policies` にアクセスする
**Then** `/requests` にリダイレクトされる

#### Scenario: finance ユーザーがアクセスを拒否される

**Given** finance ロールのユーザーがログインしている
**When** `/settings/policies` にアクセスする
**Then** `/requests` にリダイレクトされる

### Requirement: ポリシー一覧はトリガーアクションを日本語ラベルで表示する

The system SHALL display trigger actions using Japanese labels instead of internal values. The defined mappings are: `inquiry.convert` → 「引合の案件化」, `contract.create` → 「契約の作成」, `contract.cancel` → 「契約の解除」. Values not present in the mapping MUST be displayed as-is.

#### Scenario: inquiry.convert が日本語ラベルで表示される

**Given** トリガーアクションが `inquiry.convert` のポリシーが存在する
**When** ポリシー一覧を表示する
**Then** トリガーアクション列に「引合の案件化」と表示される

#### Scenario: 未定義のトリガーアクションはそのまま表示される

**Given** トリガーアクションが `deal.phase_change` のポリシーが存在する（ラベルマッピング未定義）
**When** ポリシー一覧を表示する
**Then** トリガーアクション列に「deal.phase_change」とそのまま表示される

### Requirement: ポリシー一覧は条件の有無を適切に表示する

The system SHALL display policies with a condition field set in the format "{field} {operator} {value}". Policies with a null condition field MUST display 「常に」.

#### Scenario: 条件付きポリシーの条件表示

**Given** conditionField=`amount`, conditionOperator=`gte`, conditionValue=`100000` のポリシーが存在する
**When** ポリシー一覧を表示する
**Then** 条件列に「amount ≥ 100000」のような形式で表示される

#### Scenario: 無条件ポリシーの条件表示

**Given** conditionField が null のポリシーが存在する
**When** ポリシー一覧を表示する
**Then** 条件列に「常に」と表示される

### Requirement: admin ユーザーのみがポリシーを作成できる

The system SHALL allow only admin role users to create policies via `/settings/policies/new`. Non-admin roles MUST be redirected, and the server action MUST return an authorization error.

#### Scenario: admin がポリシーを作成する

**Given** admin ロールのユーザーがログインしている
**When** `/settings/policies/new` でフォームに必須項目を入力して送信する
**Then** ポリシーが作成され、一覧ページにリダイレクトされる

#### Scenario: manager が作成ページにアクセスを拒否される

**Given** manager ロールのユーザーがログインしている
**When** `/settings/policies/new` にアクセスする
**Then** `/requests` にリダイレクトされる

### Requirement: admin ユーザーのみがポリシーを編集できる

The system SHALL allow only admin role users to edit existing policies via `/settings/policies/[id]/edit`. Non-admin roles MUST be redirected to `/requests`.

#### Scenario: admin がポリシーを編集する

**Given** admin ロールのユーザーがログインしている、かつポリシーが存在する
**When** `/settings/policies/[id]/edit` でフォームの値を変更して送信する
**Then** ポリシーが更新され、一覧ページにリダイレクトされる

#### Scenario: 存在しないポリシー ID で 404 が返される

**Given** admin ロールのユーザーがログインしている
**When** 存在しないポリシー ID で `/settings/policies/[id]/edit` にアクセスする
**Then** 404 ページが表示される

### Requirement: admin ユーザーのみがポリシーの有効/無効を切り替えられる

The toggle button in the policy list SHALL be available only to admin role users. Clicking the toggle MUST invert the `isActive` value and the list SHALL be re-rendered with the updated state.

#### Scenario: admin が有効なポリシーを無効にする

**Given** admin ロールのユーザーがログインしている、かつ isActive=true のポリシーが存在する
**When** 一覧のトグルボタンをクリックする
**Then** ポリシーの isActive が false に更新され、一覧に「無効」と表示される

#### Scenario: manager にはトグルボタンが表示されない

**Given** manager ロールのユーザーがログインしている
**When** ポリシー一覧を表示する
**Then** トグルボタンおよび作成・編集リンクが非表示である

### Requirement: 条件フィールドの入力状態に応じて演算子・値の入力が連動する

When the condition field is empty in PolicyForm, the operator and value inputs SHALL be disabled. When a value is entered in the condition field, the operator and value inputs MUST become enabled and required.

#### Scenario: 条件フィールドが空のとき演算子・値が disabled

**Given** PolicyForm が表示されている
**When** 条件フィールドが空である
**Then** 演算子の select と値の input が disabled である

#### Scenario: 条件フィールド入力時に演算子・値が enabled かつ required

**Given** PolicyForm が表示されている
**When** 条件フィールドに「amount」と入力する
**Then** 演算子の select と値の input が enabled かつ required になる

### Requirement: SettingsNav に承認ポリシーリンクが表示される

The SettingsNav component SHALL include a `{ href: "/settings/policies", label: "承認ポリシー" }` entry in NAV_ITEMS so that the link is displayed in the settings navigation.

#### Scenario: 設定画面にポリシーリンクが表示される

**Given** ユーザーが設定画面にアクセスしている
**When** SettingsNav を表示する
**Then** 「承認ポリシー」リンクが表示され、クリックすると `/settings/policies` に遷移する

### Requirement: ポリシー作成・編集フォームのバリデーション

The server action SHALL validate that policy name, trigger action, and template are required fields. When a condition field is provided, the condition operator and condition value MUST also be required.

#### Scenario: 必須項目が未入力の場合エラーが返される

**Given** admin ユーザーが PolicyForm を表示している
**When** ポリシー名を空のまま送信する
**Then** バリデーションエラーが表示される

#### Scenario: 条件フィールド入力時に演算子・値が未入力の場合エラーが返される

**Given** admin ユーザーが PolicyForm を表示している
**When** 条件フィールドに値を入力し、演算子・値を空のまま送信する
**Then** バリデーションエラーが表示される
