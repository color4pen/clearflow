# Spec: テンプレートにフォーム定義を追加し、金額ベースのテンプレート選択を廃止

## Requirements

### Requirement: テンプレートの fields 定義

`approval_templates` テーブルは `fields` (jsonb) カラムを持ち、`minAmount` / `maxAmount` カラムを持たない MUST。`ApprovalTemplate` ドメインモデルは `fields: TemplateField[]` を持ち、`minAmount` / `maxAmount` を持たない MUST。`TemplateField` は `{ name: string, label: string, type: "text" | "number" | "date" | "textarea" | "select", required: boolean, options?: string[] }` の構造を持つ MUST。`type: "select"` の場合 `options` は必須とする MUST。

#### Scenario: fields 定義付きテンプレートを作成する

**Given** 管理者がテンプレート管理画面を表示している
**When** テンプレート「経費申請」を以下の fields で作成する:
  - `{ name: "amount", label: "金額", type: "number", required: true }`
  - `{ name: "purpose", label: "用途", type: "text", required: true }`
  - `{ name: "vendor", label: "支払先", type: "text", required: false }`
**Then** `approval_templates` テーブルに `fields` jsonb カラムに上記のフィールド定義が保存される

#### Scenario: minAmount / maxAmount カラムが存在しない

**Given** スキーマ migration が適用されている
**When** `approval_templates` テーブルのカラムを確認する
**Then** `minAmount` / `maxAmount` カラムが存在しない

---

### Requirement: 承認ステップの条件定義

`ApprovalTemplateStep` は `condition?: StepCondition` を持つ MUST。`StepCondition` は `{ field: string, operator: "gt" | "gte" | "lt" | "lte" | "eq", value: number }` の構造を持つ MUST。条件付きステップはフォーム入力値が条件を満たす場合のみ承認ステップとして生成される SHALL。条件なしステップは常に生成される MUST。

#### Scenario: 条件を満たす場合にステップが生成される

**Given** テンプレートに以下のステップが定義されている:
  - ステップ1: `{ approverRole: "manager" }` (条件なし)
  - ステップ2: `{ approverRole: "finance", condition: { field: "amount", operator: "gt", value: 100000 } }`
**When** `formData` に `amount = 200000` で申請を作成する
**Then** 承認ステップが2件（manager, finance）生成される

#### Scenario: 条件を満たさない場合にステップが生成されない

**Given** テンプレートに以下のステップが定義されている:
  - ステップ1: `{ approverRole: "manager" }` (条件なし)
  - ステップ2: `{ approverRole: "finance", condition: { field: "amount", operator: "gt", value: 100000 } }`
**When** `formData` に `amount = 50000` で申請を作成する
**Then** 承認ステップが1件（manager のみ）生成される

#### Scenario: 条件フィールドが formData に存在しない場合

**Given** テンプレートにステップ `{ approverRole: "finance", condition: { field: "amount", operator: "gt", value: 100000 } }` が定義されている
**When** `formData` に `amount` フィールドが存在しない申請を作成する
**Then** 条件付きステップは生成されない（条件を満たさないと判定）

---

### Requirement: requests テーブルの formData

`requests` テーブルは `formData` (jsonb) カラムを持ち、`description` / `amount` カラムを持たない MUST。`title` カラムは維持される MUST。`formData` の格納形式は `{ [fieldName]: { value: unknown, label: string } }` とする MUST。

#### Scenario: formData 付きの申請を作成する

**Given** テンプレート「経費申請」のフィールド定義: `amount`(number), `purpose`(text)
**When** 金額 50000、用途「会議費」で申請を作成する
**Then** `requests.formData` に `{ "amount": { "value": 50000, "label": "金額" }, "purpose": { "value": "会議費", "label": "用途" } }` が保存される

#### Scenario: description / amount カラムが存在しない

**Given** スキーマ migration が適用されている
**When** `requests` テーブルのカラムを確認する
**Then** `description` / `amount` カラムが存在しない

---

### Requirement: Request ドメインモデル

`Request` ドメインモデルは `formData: Record<string, unknown>` フィールドを持ち、`description` / `amount` フィールドを持たない MUST。`templateId: string | null` フィールドを持つ MUST。

#### Scenario: Request モデルの構造

**Given** `src/domain/models/request.ts` の `Request` 型
**When** 型定義を確認する
**Then** `formData: Record<string, unknown>` が存在し、`description` / `amount` が存在しない

---

### Requirement: テンプレート手動選択

`templateSelectionService.ts` は削除される MUST。`createRequest` usecase は `templateId` をユーザーが明示的に指定する方式で動作する MUST。

#### Scenario: ユーザーがテンプレートを選択して申請を作成する

**Given** 組織に「経費申請」「購買申請」「休暇申請」の3テンプレートが存在する
**When** ユーザーが「経費申請」テンプレートを選択し、フォームに入力して申請を作成する
**Then** 「経費申請」テンプレートのステップに基づいて承認ステップが生成される

#### Scenario: templateSelectionService が存在しない

**Given** 実装が完了している
**When** `src/domain/services/templateSelectionService.ts` のファイル存在を確認する
**Then** ファイルが存在しない

#### Scenario: findByOrganizationForAmount が存在しない

**Given** 実装が完了している
**When** `approvalTemplateRepository` のエクスポートを確認する
**Then** `findByOrganizationForAmount` 関数が存在しない

---

### Requirement: 申請作成 UI の動的フォーム

申請作成画面はテンプレート選択ドロップダウンを表示する MUST。テンプレート選択後、そのテンプレートの `fields` に基づいて動的にフォーム項目を描画する SHALL。固定の「説明」「金額」フィールドは表示しない MUST。

#### Scenario: テンプレート選択後にフォームが動的に描画される

**Given** 申請作成画面を表示している
**When** テンプレート「経費申請」（fields: amount/number, purpose/text, vendor/text）を選択する
**Then** 「金額」「用途」「支払先」の3つのフォームフィールドが描画される

#### Scenario: テンプレート未選択時はフォームフィールドが表示されない

**Given** 申請作成画面を表示している
**When** テンプレートがまだ選択されていない
**Then** title フィールドのみが表示され、テンプレート固有のフォームフィールドは表示されない

---

### Requirement: 申請詳細・一覧の formData 表示

申請詳細画面は `formData` のキー・値ペアを動的に表示する SHALL。申請一覧テーブルの「金額」列は、`formData` 内に `amount` フィールドがあればその値を表示し、なければ `-` を表示する SHALL。

#### Scenario: 申請詳細画面に formData が表示される

**Given** formData `{ "amount": { "value": 50000, "label": "金額" }, "purpose": { "value": "会議費", "label": "用途" } }` の申請が存在する
**When** 申請詳細画面を表示する
**Then** 「金額: 50,000」「用途: 会議費」が表示される

#### Scenario: 申請一覧の金額列

**Given** formData に `amount` フィールドを持つ申請と持たない申請が存在する
**When** 申請一覧画面を表示する
**Then** `amount` フィールドを持つ申請は金額が表示され、持たない申請は `-` が表示される

---

### Requirement: テンプレート管理 UI の fields エディタ

テンプレート管理画面は fields エディタを表示する MUST。フィールドの追加・削除・並べ替えが可能である SHALL。ステップに条件を設定する UI が存在する MUST。`minAmount` / `maxAmount` の入力欄は表示しない MUST。

#### Scenario: テンプレート管理画面に fields エディタが表示される

**Given** テンプレート作成画面を表示している
**When** フォーム要素を確認する
**Then** フィールドの追加ボタン、フィールド名・ラベル・型の入力欄が存在し、minAmount / maxAmount の入力欄が存在しない

#### Scenario: ステップに条件を設定できる

**Given** テンプレート編集画面で承認ステップを定義している
**When** ステップに条件「amount > 100000」を設定する
**Then** ステップの condition に `{ field: "amount", operator: "gt", value: 100000 }` が保存される

---

### Requirement: formData バリデーション

`createRequestAction` はテンプレートの `fields` 定義を参照し、`required: true` のフィールドが formData に含まれ、空でないことを検証する MUST。`type: "number"` のフィールドには数値変換を行う MUST。

#### Scenario: 必須フィールドが未入力の場合にエラーが返される

**Given** テンプレートに `{ name: "amount", required: true }` のフィールドが定義されている
**When** `amount` フィールドを空のまま申請を作成する
**Then** バリデーションエラーが返される

#### Scenario: 全必須フィールドが入力済みの場合に申請が作成される

**Given** テンプレートの全 required フィールドに値が入力されている
**When** 申請を作成する
**Then** 申請が正常に作成される

---

### Requirement: 既存データの migration

migration で既存の `description` / `amount` データを `formData` に変換する MUST。変換後に `description` / `amount` カラムを削除する MUST。

#### Scenario: 既存データが formData に変換される

**Given** `requests` テーブルに `description = "テスト"`, `amount = 50000` のレコードが存在する
**When** migration を実行する
**Then** `formData = { "description": { "value": "テスト", "label": "説明" }, "amount": { "value": 50000, "label": "金額" } }` に変換される

#### Scenario: description と amount が両方 null の場合

**Given** `requests` テーブルに `description = null`, `amount = null` のレコードが存在する
**When** migration を実行する
**Then** `formData = {}` に変換される

---

### Requirement: シードデータの更新

シードデータは3つの申請種別テンプレートを含む MUST。経費・購買テンプレートの承認ステップに金額条件を設定する MUST。

#### Scenario: 3つのテンプレートが定義される

**Given** シードスクリプトを実行する
**When** `approval_templates` を確認する
**Then** 以下の3テンプレートが存在する:
  - 経費申請（fields: amount/金額/number/required, purpose/用途/text/required, vendor/支払先/text/optional）
  - 購買申請（fields: amount/金額/number/required, item/品名/text/required, quantity/数量/number/required, deliveryDate/納期/date/optional）
  - 休暇申請（fields: startDate/開始日/date/required, endDate/終了日/date/required, reason/理由/textarea/optional）

#### Scenario: 経費申請テンプレートに条件付きステップが設定されている

**Given** シードスクリプトを実行する
**When** 「経費申請」テンプレートのステップを確認する
**Then** ステップ1（manager, 条件なし）とステップ2（finance, `{ field: "amount", operator: "gt", value: 100000 }`）が設定されている

---

### Requirement: selectTemplate の削除と domain services index の更新

`src/domain/services/index.ts` から `selectTemplate` の export を削除する MUST。`templateSelectionService.ts` ファイルを削除する MUST。

#### Scenario: domain services index が更新されている

**Given** 実装が完了している
**When** `src/domain/services/index.ts` の export を確認する
**Then** `selectTemplate` が export されていない

---

### Requirement: 依存方向の遵守

変更後も依存方向 `actions → usecases → domain (services + models) / repositories (infrastructure)` を遵守する MUST。domain layer は repository を呼び出さない MUST。

#### Scenario: domain models が infrastructure を import しない

**Given** 変更後のソースコード
**When** `src/domain/` 配下のファイルの import を確認する
**Then** `@/infrastructure/` への import が存在しない
