# Test Cases: テンプレートにフォーム定義を追加し、金額ベースのテンプレート選択を廃止

## Summary

- **Total**: 78 cases
- **Automated** (unit/integration): 61
- **Manual**: 17
- **Priority**: must: 47, should: 30, could: 1

---

## DB / Schema

### TC-001: approval_templates テーブルに fields カラムが存在する

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: テンプレートの fields 定義 > Scenario: minAmount / maxAmount カラムが存在しない

### TC-002: approval_templates テーブルに minAmount / maxAmount カラムが存在しない

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: テンプレートの fields 定義 > Scenario: minAmount / maxAmount カラムが存在しない

### TC-003: requests テーブルに formData カラムが存在する

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: requests テーブルの formData > Scenario: description / amount カラムが存在しない

### TC-004: requests テーブルに description / amount カラムが存在しない

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: requests テーブルの formData > Scenario: description / amount カラムが存在しない

### TC-005: マイグレーション SQL が既存データを formData に変換してからカラムを削除する

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-02

**GIVEN** `requests` テーブルに `description = "テスト"`, `amount = 50000` のレコードが存在する  
**WHEN** Drizzle マイグレーションを適用する  
**THEN** `form_data = { "description": { "value": "テスト", "label": "説明" }, "amount": { "value": 50000, "label": "金額" } }` に変換されてから `description` / `amount` カラムが削除されている

### TC-006: drizzle-kit generate が成功する

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/schema.ts` のスキーマ変更が完了している  
**WHEN** `bunx drizzle-kit generate` を実行する  
**THEN** エラーなく完了し、マイグレーションファイルが生成される

---

## Domain Model

### TC-007: Request ドメインモデルの構造

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: Request ドメインモデル > Scenario: Request モデルの構造

### TC-008: ApprovalTemplate モデルに fields が存在し minAmount / maxAmount が存在しない

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-01

**GIVEN** `src/domain/models/approvalTemplate.ts`  
**WHEN** `ApprovalTemplate` 型定義を確認する  
**THEN** `fields: TemplateField[]` が存在し、`minAmount` / `maxAmount` が存在しない

### TC-009: ApprovalTemplateStep に condition が存在する

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-01

**GIVEN** `src/domain/models/approvalTemplate.ts`  
**WHEN** `ApprovalTemplateStep` 型定義を確認する  
**THEN** `condition?: StepCondition` が定義されている

### TC-010: TemplateField と StepCondition が domain/models/index.ts から export されている

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-01

**GIVEN** `src/domain/models/index.ts`  
**WHEN** export 一覧を確認する  
**THEN** `TemplateField` と `StepCondition` が export されている

---

## Domain Service

### TC-011: evaluateStepCondition — condition が undefined のとき true を返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-05

**GIVEN** `evaluateStepCondition` 関数  
**WHEN** `evaluateStepCondition(undefined, {})` を呼び出す  
**THEN** `true` が返される

### TC-012: evaluateStepCondition — gt 演算子で条件を満たす場合に true を返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-05

**GIVEN** `condition = { field: "amount", operator: "gt", value: 100000 }`  
**WHEN** `formData = { amount: { value: 200000, label: "金額" } }` で `evaluateStepCondition` を呼び出す  
**THEN** `true` が返される

### TC-013: evaluateStepCondition — gt 演算子で条件を満たさない場合に false を返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-05

**GIVEN** `condition = { field: "amount", operator: "gt", value: 100000 }`  
**WHEN** `formData = { amount: { value: 50000, label: "金額" } }` で `evaluateStepCondition` を呼び出す  
**THEN** `false` が返される

### TC-014: evaluateStepCondition — 条件フィールドが formData に存在しない場合に false を返す

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 承認ステップの条件定義 > Scenario: 条件フィールドが formData に存在しない場合

### TC-015: evaluateStepCondition — gte 演算子で境界値（value = threshold）のとき true を返す

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-15

**GIVEN** `condition = { field: "amount", operator: "gte", value: 100000 }`  
**WHEN** `formData = { amount: { value: 100000, label: "金額" } }` で `evaluateStepCondition` を呼び出す  
**THEN** `true` が返される

### TC-016: evaluateStepCondition — lt 演算子で値が閾値未満のとき true を返す

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-15

**GIVEN** `condition = { field: "amount", operator: "lt", value: 50000 }`  
**WHEN** `formData = { amount: { value: 30000, label: "金額" } }` で `evaluateStepCondition` を呼び出す  
**THEN** `true` が返される

### TC-017: evaluateStepCondition — eq 演算子で値が一致するとき true を返す

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-15

**GIVEN** `condition = { field: "amount", operator: "eq", value: 100000 }`  
**WHEN** `formData = { amount: { value: 100000, label: "金額" } }` で `evaluateStepCondition` を呼び出す  
**THEN** `true` が返される

### TC-018: filterStepsByCondition — 条件なしステップのみの場合は全件返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** 条件なしステップが2件（manager, director）  
**WHEN** `filterStepsByCondition(steps, {})` を呼び出す  
**THEN** 2件とも返される

### TC-019: filterStepsByCondition — 条件付きステップが条件を満たす場合に含まれる

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 承認ステップの条件定義 > Scenario: 条件を満たす場合にステップが生成される

### TC-020: filterStepsByCondition — 条件付きステップが条件を満たさない場合に含まれない

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 承認ステップの条件定義 > Scenario: 条件を満たさない場合にステップが生成されない

### TC-021: filterStepsByCondition — 混合ステップで条件を満たすステップのみ返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** ステップ1（条件なし、manager）とステップ2（`amount > 100000`、finance）  
**WHEN** `formData = { amount: { value: 50000, label: "金額" } }` で `filterStepsByCondition` を呼び出す  
**THEN** ステップ1（manager）のみが返され、ステップ2（finance）は含まれない

### TC-022: templateSelectionService.ts が存在しない

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: テンプレート手動選択 > Scenario: templateSelectionService が存在しない

### TC-023: domain services index から selectTemplate が export されていない

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: selectTemplate の削除と domain services index の更新 > Scenario: domain services index が更新されている

### TC-024: evaluateStepCondition と filterStepsByCondition が domain/services/index.ts から export されている

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-05

**GIVEN** `src/domain/services/index.ts`  
**WHEN** export 一覧を確認する  
**THEN** `evaluateStepCondition` と `filterStepsByCondition` が export されている

### TC-025: domain models が infrastructure を import しない

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 依存方向の遵守 > Scenario: domain models が infrastructure を import しない

---

## Repository

### TC-026: approvalTemplateRepository.mapRow が fields を含み minAmount / maxAmount を含まない

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/approvalTemplateRepository.ts`  
**WHEN** `mapRow` 関数の実装を確認する  
**THEN** `fields: (row.fields ?? []) as TemplateField[]` が存在し、`minAmount` / `maxAmount` の参照が存在しない

### TC-027: approvalTemplateRepository.create / updateById が fields を受け取り minAmount / maxAmount を受け取らない

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-04

**GIVEN** `approvalTemplateRepository.create` / `updateById` の関数シグネチャ  
**WHEN** 引数の型定義を確認する  
**THEN** `fields: TemplateField[]` が含まれ、`minAmount` / `maxAmount` が存在しない

### TC-028: approvalTemplateRepository から findByOrganizationForAmount が存在しない

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: テンプレート手動選択 > Scenario: findByOrganizationForAmount が存在しない

### TC-029: approvalTemplateRepository に未使用 import が残っていない

**Category**: unit  
**Priority**: could  
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/approvalTemplateRepository.ts`  
**WHEN** import 宣言を確認する  
**THEN** `findByOrganizationForAmount` でのみ使用されていた `isNull`, `lte`, `gte`, `or` 等が削除されている

### TC-030: requestRepository.mapRow が formData と templateId を含む Request を返す

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/requestRepository.ts`  
**WHEN** `mapRow` 関数の実装を確認する  
**THEN** `formData: (row.formData ?? {}) as Record<string, unknown>` と `templateId: row.templateId ?? null` が存在する

### TC-031: requestRepository.create が formData と templateId を DB に保存する

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-03

**GIVEN** `requestRepository.create` の実装  
**WHEN** `formData = { amount: { value: 50000, label: "金額" } }`, `templateId = "<uuid>"` を含むデータで呼び出す  
**THEN** DB の `form_data` と `template_id` カラムに値が保存される

### TC-032: requestRepository から description / amount への参照が完全に除去されている

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/requestRepository.ts`  
**WHEN** ファイル内の参照を確認する  
**THEN** `description` / `amount` カラム名への参照が存在しない

---

## UseCase

### TC-033: createRequest が templateId と formData を受け取り description / amount を受け取らない

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** `src/application/usecases/createRequest.ts`  
**WHEN** `data` 引数の型定義を確認する  
**THEN** `templateId: string` と `formData: Record<string, unknown>` が存在し、`description` / `amount` が存在しない

### TC-034: createRequest が approvalTemplateRepository.findById でテンプレートを取得する

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** `src/application/usecases/createRequest.ts`  
**WHEN** コードを確認する  
**THEN** `approvalTemplateRepository.findById(data.templateId, data.organizationId)` が呼び出され、`findByOrganizationForAmount` / `selectTemplate` の呼び出しが存在しない

### TC-035: createRequest でテンプレートが見つからない場合にエラーが返される

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** 存在しない UUID を `templateId` として指定している  
**WHEN** `createRequest` usecase を呼び出す  
**THEN** `{ ok: false, reason: "テンプレートが見つかりません。" }` が返される

### TC-036: ユーザーがテンプレートを選択して申請を作成する

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: テンプレート手動選択 > Scenario: ユーザーがテンプレートを選択して申請を作成する

### TC-037: filterStepsByCondition によって条件付き承認ステップが正しく生成される

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** 経費申請テンプレート（ステップ1: manager 条件なし、ステップ2: finance `amount > 100000`）と `formData = { amount: { value: 200000, label: "金額" } }`  
**WHEN** `createRequest` usecase を呼び出す  
**THEN** 承認ステップが2件（manager, finance）生成される

### TC-038: 監査ログに templateId と templateName が記録される

**Category**: integration  
**Priority**: should  
**Source**: tasks.md > T-06

**GIVEN** 有効なテンプレートを指定して申請を作成する  
**WHEN** `createRequest` usecase を実行する  
**THEN** 監査ログの metadata に `templateId` と `templateName` が含まれ、`amount` が含まれない

### TC-039: createTemplate が fields を受け取り minAmount / maxAmount を受け取らない

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/createTemplate.ts`  
**WHEN** `data` 引数の型定義を確認する  
**THEN** `fields: TemplateField[]` が存在し、`minAmount` / `maxAmount` が存在しない

### TC-040: updateTemplate が fields を受け取り minAmount / maxAmount を受け取らない

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/updateTemplate.ts`  
**WHEN** `data` 引数の型定義を確認する  
**THEN** `fields?: TemplateField[]` が存在し、`minAmount` / `maxAmount` が存在しない

---

## Server Action

### TC-041: 必須フィールドが未入力の場合にバリデーションエラーが返される

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: formData バリデーション > Scenario: 必須フィールドが未入力の場合にエラーが返される

### TC-042: 全必須フィールドが入力済みの場合に申請が作成される

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: formData バリデーション > Scenario: 全必須フィールドが入力済みの場合に申請が作成される

### TC-043: select フィールドに options 外の値が送信された場合にバリデーションエラーが返される

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: formData バリデーション > Scenario: select フィールドに options 外の値が送信された場合にエラーが返される

### TC-044: select フィールドに options 内の値が送信された場合にバリデーションを通過する

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: formData バリデーション > Scenario: select フィールドに options 内の値が送信された場合に通過する

### TC-045: createRequestAction が templateId 未指定の場合にバリデーションエラーを返す

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-08

**GIVEN** `src/app/actions/requests.ts` の `createRequestAction`  
**WHEN** `templateId` を含まないフォームデータで呼び出す  
**THEN** `templateId` のバリデーションエラーが返される

### TC-046: number フィールドの値が数値に変換される

**Category**: integration  
**Priority**: should  
**Source**: tasks.md > T-08

**GIVEN** テンプレートに `type: "number"` のフィールドが定義されている  
**WHEN** `createRequestAction` に文字列 `"50000"` を送信する  
**THEN** `formData` の該当フィールドの `value` が数値 `50000` として保存される

### TC-047: formData 付き申請を作成すると requests テーブルに正しく保存される

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: requests テーブルの formData > Scenario: formData 付きの申請を作成する

### TC-048: templateSchema に fields が含まれ minAmount / maxAmount が含まれない

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-09

**GIVEN** `src/app/actions/templates.ts`  
**WHEN** `templateSchema` の定義を確認する  
**THEN** `fields` フィールドが含まれ、`minAmount` / `maxAmount` が含まれない

### TC-049: templateStepSchema に condition フィールドが含まれる

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-09

**GIVEN** `src/app/actions/templates.ts`  
**WHEN** `templateStepSchema` の定義を確認する  
**THEN** `condition: z.object({ field, operator, value }).optional()` が定義されている

### TC-050: type="select" で options が未指定の場合にテンプレート作成のバリデーションエラーが返される

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-09

**GIVEN** `type: "select"` かつ `options` が未指定のフィールドを含むテンプレートデータ  
**WHEN** `createTemplateAction` を呼び出す  
**THEN** バリデーションエラーが返される

---

## UI — 申請作成

### TC-051: テンプレート選択後にフォームが動的に描画される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 申請作成 UI の動的フォーム > Scenario: テンプレート選択後にフォームが動的に描画される

### TC-052: テンプレート未選択時はフォームフィールドが表示されない

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 申請作成 UI の動的フォーム > Scenario: テンプレート未選択時はフォームフィールドが表示されない

### TC-053: 各フィールドタイプが正しい HTML 要素で描画される

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-10

**GIVEN** テンプレートに text / number / date / textarea / select のフィールドが定義されている  
**WHEN** 申請作成画面でそのテンプレートを選択する  
**THEN** `<Input>` / `<Input type="number">` / `<Input type="date">` / `<Textarea>` / `<Select>` がそれぞれ対応するフィールドに描画される

### TC-054: required フィールドには必須マークが表示される

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-10

**GIVEN** テンプレートに `required: true` のフィールドが含まれている  
**WHEN** 申請作成画面でそのテンプレートを選択する  
**THEN** 必須フィールドのラベルに `*` が表示される

### TC-055: 固定の「説明」「金額」フィールドが申請作成画面に存在しない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/requests/new/page.tsx`  
**WHEN** ページの DOM を確認する  
**THEN** 固定の `description` フィールドと固定の `amount` フィールドが存在しない

---

## UI — 申請詳細

### TC-056: 申請詳細画面に formData が表示される

**Category**: manual  
**Priority**: should  
**Source**: spec.md > Requirement: 申請詳細・一覧の formData 表示 > Scenario: 申請詳細画面に formData が表示される

### TC-057: 数値フィールドはカンマ区切りでフォーマットされて表示される

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-11

**GIVEN** `formData = { amount: { value: 1000000, label: "金額" } }` の申請が存在する  
**WHEN** 申請詳細画面を表示する  
**THEN** 金額が `1,000,000` のようにカンマ区切りでフォーマットされて表示される

### TC-058: 固定の「説明」「金額」セクションが申請詳細画面に存在しない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx`  
**WHEN** ページの DOM を確認する  
**THEN** `request.description` / `request.amount` への固定表示が存在しない

---

## UI — 申請一覧

### TC-059: 申請一覧の金額列が formData から動的に表示される

**Category**: manual  
**Priority**: should  
**Source**: spec.md > Requirement: 申請詳細・一覧の formData 表示 > Scenario: 申請一覧の金額列

### TC-060: BulkApprovalPanel のインタフェースに破壊的変更がない

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-12

**GIVEN** `src/app/(dashboard)/requests/BulkApprovalPanel.tsx`  
**WHEN** `RequestItem` 型の `amount` プロパティを確認する  
**THEN** `amount: number | null` が維持されており、呼び出し元（page.tsx）が `formData` から値を抽出して渡す形になっている

---

## UI — テンプレート管理

### TC-061: テンプレート管理画面に fields エディタが表示される

**Category**: manual  
**Priority**: should  
**Source**: spec.md > Requirement: テンプレート管理 UI の fields エディタ > Scenario: テンプレート管理画面に fields エディタが表示される

### TC-062: ステップに条件を設定できる

**Category**: manual  
**Priority**: should  
**Source**: spec.md > Requirement: テンプレート管理 UI の fields エディタ > Scenario: ステップに条件を設定できる

### TC-063: フィールドの追加・削除が可能

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-13

**GIVEN** テンプレート作成・編集画面を表示している  
**WHEN** フィールド追加ボタンをクリックする / 既存フィールドの削除ボタンをクリックする  
**THEN** フィールドが追加 / 削除される

### TC-064: テンプレート一覧の「金額条件」列が「フィールド数」列に変更されている

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-13

**GIVEN** テンプレート一覧画面を表示している  
**WHEN** テーブルのヘッダーを確認する  
**THEN** 「金額条件」列が「フィールド数」列になっており、各行に `fields.length` の値が表示される

---

## Data Migration

### TC-065: 既存データが formData に変換される

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: 既存データの migration > Scenario: 既存データが formData に変換される

### TC-066: description と amount が両方 null の場合に formData が空オブジェクトになる

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: 既存データの migration > Scenario: description と amount が両方 null の場合

---

## Seed Data

### TC-067: 3つの申請種別テンプレートが定義される

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: シードデータの更新 > Scenario: 3つのテンプレートが定義される

### TC-068: 経費申請テンプレートに条件付きステップが設定されている

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: シードデータの更新 > Scenario: 経費申請テンプレートに条件付きステップが設定されている

### TC-069: 購買申請テンプレートに条件付きステップが設定されている

**Category**: integration  
**Priority**: should  
**Source**: tasks.md > T-14

**GIVEN** シードスクリプトを実行する  
**WHEN** 「購買申請」テンプレートのステップを確認する  
**THEN** ステップ2（finance）に `condition: { field: "amount", operator: "gt", value: 100000 }` が設定されている

### TC-070: 申請シードデータが formData 形式で保存される

**Category**: integration  
**Priority**: should  
**Source**: tasks.md > T-14

**GIVEN** シードスクリプトを実行する  
**WHEN** `requests` テーブルを確認する  
**THEN** 申請の `formData` に `{ value, label }` 形式でデータが格納されており、`description` / `amount` への直接参照が存在しない

---

## Test Code

### TC-071: templateSelectionService.test.ts が存在しない

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** テスト実装が完了している  
**WHEN** `src/__tests__/domain/templateSelectionService.test.ts` のファイル存在を確認する  
**THEN** ファイルが存在しない

### TC-072: projectStructure.test.ts TC-054 が templateId セレクタと固定 amount フィールドの不在を検証している

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** `src/__tests__/static/projectStructure.test.ts`  
**WHEN** TC-054 のアサーションを確認する  
**THEN** `name="templateId"` が存在することと `name="amount"` が存在しないことをアサートしている

### TC-073: projectStructure.test.ts TC-057b が templateSelectionService.ts の不在を検証している

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** `src/__tests__/static/projectStructure.test.ts`  
**WHEN** TC-057b のアサーションを確認する  
**THEN** `templateSelectionService.ts` のファイル存在チェックが `toBe(false)` であり、`approvalStepService.ts` に `evaluateStepCondition` と `filterStepsByCondition` が存在することを検証している

### TC-074: requestValidation.test.ts が templateId の必須バリデーションを検証している

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** `src/__tests__/actions/requestValidation.test.ts`  
**WHEN** テスト内容を確認する  
**THEN** `templateId` の必須・UUID 形式バリデーション（未入力・空文字・不正 UUID）のテストケースが存在し、`description` / `amount` のバリデーションテストが削除されている

---

## Build / Type Check

### TC-075: bun run build が成功する

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-16

**GIVEN** 全変更が適用されている  
**WHEN** `bun run build` を実行する  
**THEN** エラーなく完了する

### TC-076: TypeScript 型チェックが通る

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-16

**GIVEN** 全変更が適用されている  
**WHEN** `bunx tsc --noEmit` を実行する  
**THEN** 型エラーが0件

### TC-077: bun run lint が成功する

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-16

**GIVEN** 全変更が適用されている  
**WHEN** `bun run lint` を実行する  
**THEN** lint エラーが0件

### TC-078: bun test が全件 green

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-16

**GIVEN** 全変更とテスト更新が完了している  
**WHEN** `bun test` を実行する  
**THEN** 全テストケースが pass する

---

## Result

```yaml
result: completed
total: 78
automated: 61
manual: 17
must: 47
should: 30
could: 1
blocked_reasons: []
```
