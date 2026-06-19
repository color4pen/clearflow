# Tasks: テンプレートにフォーム定義を追加し、金額ベースのテンプレート選択を廃止

## T-01: ドメインモデル変更 — ApprovalTemplate, Request

- [ ] `src/domain/models/approvalTemplate.ts` — `TemplateField` 型を追加する: `{ name: string, label: string, type: "text" | "number" | "date" | "textarea" | "select", required: boolean, options?: string[] }`
- [ ] `src/domain/models/approvalTemplate.ts` — `StepCondition` 型を追加する: `{ field: string, operator: "gt" | "gte" | "lt" | "lte" | "eq", value: number }`
- [ ] `src/domain/models/approvalTemplate.ts` — `ApprovalTemplateStep` に `condition?: StepCondition` を追加する
- [ ] `src/domain/models/approvalTemplate.ts` — `ApprovalTemplate` から `minAmount: number | null` と `maxAmount: number | null` を削除し、`fields: TemplateField[]` を追加する
- [ ] `src/domain/models/request.ts` — `Request` から `description: string | null` と `amount: number | null` を削除し、`formData: Record<string, { value: unknown; label: string }>` と `templateId: string | null` を追加する
- [ ] `src/domain/models/index.ts` — `TemplateField`, `StepCondition` を export に追加する

**Acceptance Criteria**:
- `ApprovalTemplate` 型に `fields: TemplateField[]` が存在し、`minAmount` / `maxAmount` が存在しない
- `ApprovalTemplateStep` に `condition?: StepCondition` が存在する
- `Request` 型に `formData: Record<string, { value: unknown; label: string }>` と `templateId: string | null` が存在し、`description` / `amount` が存在しない
- `TemplateField` と `StepCondition` が `src/domain/models/index.ts` から export されている

## T-02: スキーマ変更 — approval_templates と requests テーブル

- [ ] `src/infrastructure/schema.ts` — `approvalTemplates` テーブルから `minAmount` と `maxAmount` カラムを削除する
- [ ] `src/infrastructure/schema.ts` — `approvalTemplates` テーブルに `fields: jsonb("fields").notNull().default([])` カラムを追加する（default は空配列）
- [ ] `src/infrastructure/schema.ts` — `requests` テーブルから `description` と `amount` カラムを削除する
- [ ] `src/infrastructure/schema.ts` — `requests` テーブルに `formData: jsonb("form_data").notNull().default({})` カラムを追加する
- [ ] `src/infrastructure/schema.ts` — `requests` テーブルに `templateId: uuid("template_id").references(() => approvalTemplates.id)` カラムを追加する（nullable）
- [ ] `bunx drizzle-kit generate` でマイグレーションを生成する。生成された SQL を確認し、既存データの `description` / `amount` → `formData` への変換ステップが含まれていない場合はカスタム SQL を追記する。変換ロジック: `UPDATE requests SET form_data = jsonb_build_object() || CASE WHEN description IS NOT NULL THEN jsonb_build_object('description', jsonb_build_object('value', to_jsonb(description), 'label', '"説明"'::jsonb)) ELSE '{}'::jsonb END || CASE WHEN amount IS NOT NULL THEN jsonb_build_object('amount', jsonb_build_object('value', to_jsonb(amount), 'label', '"金額"'::jsonb)) ELSE '{}'::jsonb END` を `ALTER TABLE requests DROP COLUMN description` / `DROP COLUMN amount` の前に実行する
- [ ] 同様に `approval_templates` の `minAmount` / `maxAmount` のドロップ前に、テンプレートの `fields` にデフォルト値を設定する SQL は不要（空配列がデフォルト）

**Acceptance Criteria**:
- `approvalTemplates` テーブル定義に `fields` カラムが存在し、`minAmount` / `maxAmount` が存在しない
- `requests` テーブル定義に `formData` と `templateId` カラムが存在し、`description` / `amount` が存在しない
- マイグレーション SQL が既存データの `description` / `amount` を `formData` に変換してからカラムを削除する
- `bunx drizzle-kit generate` が成功する

## T-03: リポジトリ更新 — requestRepository

- [ ] `src/infrastructure/repositories/requestRepository.ts` — `mapRow` 関数を更新する: `description` / `amount` を削除し、`formData: (row.formData ?? {}) as Record<string, unknown>` と `templateId: row.templateId ?? null` を追加する
- [ ] `src/infrastructure/repositories/requestRepository.ts` — `create` 関数のシグネチャを更新する: `description` / `amount` を削除し、`formData: Record<string, unknown>` と `templateId?: string | null` を受け取る。`.values()` に `formData: data.formData` と `templateId: data.templateId ?? null` を含める
- [ ] `src/infrastructure/repositories/requestRepository.ts` — `findAllWithStepsByOrganization` の select フィールドを確認し、`description` / `amount` 参照があれば削除する

**Acceptance Criteria**:
- `requestRepository.mapRow` が `formData` と `templateId` を含む `Request` を返す
- `requestRepository.create` が `formData` と `templateId` を受け取り DB に保存する
- `description` / `amount` への参照が `requestRepository` から完全に除去されている

## T-04: リポジトリ更新 — approvalTemplateRepository

- [ ] `src/infrastructure/repositories/approvalTemplateRepository.ts` — `mapRow` 関数を更新する: `minAmount` / `maxAmount` を削除し、`fields: (row.fields ?? []) as TemplateField[]` を追加する（`TemplateField` を import する）
- [ ] `src/infrastructure/repositories/approvalTemplateRepository.ts` — `create` 関数を更新する: `minAmount` / `maxAmount` を削除し、`fields: TemplateField[]` を受け取る。`.values()` に `fields: data.fields` を含める
- [ ] `src/infrastructure/repositories/approvalTemplateRepository.ts` — `updateById` 関数を更新する: `minAmount` / `maxAmount` を削除し、`fields?: TemplateField[]` を受け取る
- [ ] `src/infrastructure/repositories/approvalTemplateRepository.ts` — `findByOrganizationForAmount` 関数を完全に削除する
- [ ] `src/infrastructure/repositories/approvalTemplateRepository.ts` — 不要な import（`isNull`, `lte`, `gte`, `or`, `sql` のうち `findByOrganizationForAmount` でのみ使用されていたもの）を整理する

**Acceptance Criteria**:
- `approvalTemplateRepository.mapRow` が `fields` を含む `ApprovalTemplate` を返し、`minAmount` / `maxAmount` を含まない
- `create` / `updateById` が `fields` を受け取り、`minAmount` / `maxAmount` を受け取らない
- `findByOrganizationForAmount` 関数が存在しない
- 未使用 import が残っていない

## T-05: ドメインサービス変更 — templateSelectionService 削除と条件評価追加

- [ ] `src/domain/services/templateSelectionService.ts` ファイルを削除する
- [ ] `src/domain/services/index.ts` から `export { selectTemplate } from "./templateSelectionService"` を削除する
- [ ] `src/domain/services/approvalStepService.ts` に `evaluateStepCondition` 関数を追加する: `evaluateStepCondition(condition: StepCondition | undefined, formData: Record<string, unknown>): boolean`。condition が undefined の場合は `true` を返す。condition が定義されている場合は `formData[condition.field]` から値を取得し（`{ value, label }` 形式なら `.value` を参照）、数値に変換して `operator` で比較する。値が存在しないか数値でない場合は `false` を返す
- [ ] `src/domain/services/approvalStepService.ts` に `filterStepsByCondition` 関数を追加する: `filterStepsByCondition(steps: ApprovalTemplateStep[], formData: Record<string, unknown>): ApprovalTemplateStep[]`。各ステップの `condition` を `evaluateStepCondition` で評価し、true のステップのみを返す
- [ ] `src/domain/services/index.ts` に `evaluateStepCondition` と `filterStepsByCondition` を export に追加する

**Acceptance Criteria**:
- `src/domain/services/templateSelectionService.ts` が存在しない
- `selectTemplate` が `src/domain/services/index.ts` から export されていない
- `evaluateStepCondition` が純粋関数として実装されている（副作用なし）
- `evaluateStepCondition(undefined, any)` が `true` を返す
- `evaluateStepCondition({ field: "amount", operator: "gt", value: 100000 }, { amount: { value: 200000, label: "金額" } })` が `true` を返す
- `evaluateStepCondition({ field: "amount", operator: "gt", value: 100000 }, { amount: { value: 50000, label: "金額" } })` が `false` を返す
- `evaluateStepCondition({ field: "amount", operator: "gt", value: 100000 }, {})` が `false` を返す（フィールド不存在）
- `filterStepsByCondition` が条件を満たすステップのみを返す

## T-06: createRequest usecase の変更

- [ ] `src/application/usecases/createRequest.ts` — `data` 引数を変更する: `description` / `amount` を削除し、`templateId: string`、`formData: Record<string, unknown>` を追加する
- [ ] `src/application/usecases/createRequest.ts` — テンプレート自動選択ロジックを削除する: `approvalTemplateRepository.findByOrganizationForAmount` の呼び出しと `selectTemplate` の呼び出しを削除する
- [ ] `src/application/usecases/createRequest.ts` — テンプレートの直接取得に変更する: `approvalTemplateRepository.findById(data.templateId, data.organizationId)` でテンプレートを取得する。テンプレートが見つからない場合は `{ ok: false, reason: "テンプレートが見つかりません。" }` を返す
- [ ] `src/application/usecases/createRequest.ts` — 承認ステップ生成に条件フィルタを追加する: `filterStepsByCondition(selectedTemplate.steps, data.formData)` を呼び出し、条件を満たすステップのみで `approvalStepRepository.createMany` を呼び出す
- [ ] `src/application/usecases/createRequest.ts` — `requestRepository.create` に `formData: data.formData` と `templateId: data.templateId` を渡す（`description` / `amount` を削除）
- [ ] `src/application/usecases/createRequest.ts` — import を更新する: `selectTemplate` を削除し、`filterStepsByCondition` を追加する。`findByOrganizationForAmount` ではなく `findById` を使うため import 調整する
- [ ] `src/application/usecases/createRequest.ts` — 監査ログの metadata を更新する: `amount` を削除し、`formData` は含めない（サイズが大きくなる可能性があるため）。`templateId` と `templateName` は維持する

**Acceptance Criteria**:
- `createRequest` が `templateId` と `formData` を受け取り、`description` / `amount` を受け取らない
- `selectTemplate` / `findByOrganizationForAmount` の呼び出しが存在しない
- `approvalTemplateRepository.findById` でテンプレートを取得している
- テンプレートが見つからない場合にエラーが返される
- `filterStepsByCondition` で条件フィルタされたステップのみが承認ステップとして生成される
- 監査ログに `templateId` と `templateName` が記録される

## T-07: createTemplate / updateTemplate usecase の変更

- [ ] `src/application/usecases/createTemplate.ts` — `data` 引数から `minAmount` / `maxAmount` を削除し、`fields: TemplateField[]` を追加する。`approvalTemplateRepository.create` に `fields` を渡す
- [ ] `src/application/usecases/updateTemplate.ts` — `data` 引数から `minAmount` / `maxAmount` を削除し、`fields?: TemplateField[]` を追加する。`approvalTemplateRepository.updateById` に `fields` を渡す

**Acceptance Criteria**:
- `createTemplate` が `fields` を受け取り、`minAmount` / `maxAmount` を受け取らない
- `updateTemplate` が `fields` を受け取り、`minAmount` / `maxAmount` を受け取らない
- テンプレート作成・更新時に `fields` が DB に保存される

## T-08: Server Action 変更 — requests.ts

- [ ] `src/app/actions/requests.ts` — `createRequestSchema` を変更する: `description` / `amount` を削除し、`templateId: z.string().uuid("テンプレートを選択してください")` を追加する。formData のバリデーションは動的に行うため、スキーマには含めない
- [ ] `src/app/actions/requests.ts` — `createRequestAction` を変更する: `formData.get("templateId")` を取得する。テンプレートを `approvalTemplateRepository.findById` で取得し、fields 定義に基づいて formData を構築・バリデーションする。required フィールドが未入力の場合はエラーを返す。number フィールドは数値変換する。`type: "select"` フィールドは送信値がそのフィールドの `options` 配列に含まれるかを検証し、含まれない場合はエラーを返す
- [ ] `src/app/actions/requests.ts` — `createRequestAction` から `createRequest` への引数を更新する: `templateId` と `formData`（`{ [name]: { value, label } }` 形式）を渡す
- [ ] `src/app/actions/requests.ts` — `CreateRequestState` の `errors` 型を更新する: `description` / `amount` を削除し、`templateId?: string[]` と `formData?: Record<string, string[]>` を追加する
- [ ] `src/app/actions/requests.ts` — `approvalTemplateRepository` を import する

**Acceptance Criteria**:
- `createRequestAction` が `templateId` をフォームから取得してバリデーションする
- テンプレートの `fields` 定義に基づいて formData が構築される
- required フィールドの未入力時にバリデーションエラーが返される
- number フィールドの値が数値に変換される
- `type: "select"` フィールドの送信値がそのフィールドの `options` に含まれない場合はバリデーションエラーが返される
- `createRequest` に `templateId` と `formData` が渡される

## T-09: Server Action 変更 — templates.ts

- [ ] `src/app/actions/templates.ts` — `templateSchema` から `minAmount` / `maxAmount` のフィールドと `.refine()` を削除する
- [ ] `src/app/actions/templates.ts` — `templateSchema` に `fields` フィールドを追加する: `fields: z.array(z.object({ name: z.string().min(1), label: z.string().min(1), type: z.enum(["text", "number", "date", "textarea", "select"]), required: z.boolean(), options: z.array(z.string()).optional() })).default([])`。`type: "select"` の場合 `options` が必須であることを `.refine()` で検証する
- [ ] `src/app/actions/templates.ts` — `templateStepSchema` に `condition` フィールドを追加する: `condition: z.object({ field: z.string(), operator: z.enum(["gt", "gte", "lt", "lte", "eq"]), value: z.number() }).optional()`
- [ ] `src/app/actions/templates.ts` — `createTemplateAction` を更新する: `formData.get("fields")` をパースし、`createTemplate` に `fields` を渡す。`minAmount` / `maxAmount` の取得を削除する
- [ ] `src/app/actions/templates.ts` — `updateTemplateAction` を更新する: 同様に `fields` を渡し、`minAmount` / `maxAmount` を削除する

**Acceptance Criteria**:
- `templateSchema` に `fields` が含まれ、`minAmount` / `maxAmount` が含まれない
- `templateStepSchema` に `condition` が含まれる
- `createTemplateAction` / `updateTemplateAction` が `fields` を処理し、`minAmount` / `maxAmount` を処理しない
- `type: "select"` で `options` が未指定の場合にバリデーションエラーが返される

## T-10: UI 変更 — 申請作成フォーム

- [ ] `src/app/(dashboard)/requests/new/page.tsx` — 固定の「説明」（Textarea）と「金額」（Input type=number）フィールドを削除する
- [ ] `src/app/(dashboard)/requests/new/page.tsx` — テンプレート選択ドロップダウンを追加する: 組織のテンプレート一覧を取得し、`<select name="templateId">` で表示する。テンプレートの取得には新しい Server Action `listTemplatesForRequestAction` を使用する（または既存の `listTemplatesAction` を流用する）
- [ ] `src/app/(dashboard)/requests/new/page.tsx` — テンプレート選択時にそのテンプレートの `fields` 定義に基づいて動的フォームを描画する: `type: "text"` → `<Input>`, `type: "number"` → `<Input type="number">`, `type: "date"` → `<Input type="date">`, `type: "textarea"` → `<Textarea>`, `type: "select"` → `<Select>` + options。各フィールドの `name` 属性は `field_${field.name}` のようなプレフィックス付きにして formData から識別可能にする
- [ ] `src/app/(dashboard)/requests/new/page.tsx` — テンプレート一覧データの取得方法を実装する。ページをクライアントコンポーネントからサーバーコンポーネント + クライアントフォームの構成に分割するか、useEffect でテンプレート一覧を取得する。テンプレート選択時は state でテンプレートの fields を保持し、動的フォームを描画する
- [ ] `src/app/actions/requests.ts` — 必要に応じて `listTemplatesForRequestAction` を追加する（認証チェックのみ、admin ガード不要で全ユーザーがテンプレート一覧を取得可能にする）

**Acceptance Criteria**:
- テンプレート選択ドロップダウンが表示される
- テンプレート選択後にそのテンプレートの fields に基づいたフォーム項目が描画される
- 固定の「説明」「金額」フィールドが存在しない
- 各フィールドタイプ（text, number, date, textarea, select）が正しい HTML 要素で描画される
- required フィールドには必須マーク（*）が表示される

## T-11: UI 変更 — 申請詳細画面

- [ ] `src/app/(dashboard)/requests/[id]/page.tsx` — 固定の `request.description` 表示と `request.amount` 表示を削除する
- [ ] `src/app/(dashboard)/requests/[id]/page.tsx` — `request.formData` のキー・値ペアを動的に表示する: `Object.entries(request.formData)` でイテレートし、各エントリの `label` と `value` を表示する。`value` が数値の場合は `toLocaleString("ja-JP")` でフォーマットする

**Acceptance Criteria**:
- 固定の「説明」「金額」セクションが存在しない
- formData の各フィールドがラベル付きで動的に表示される
- 数値フィールドはカンマ区切りで表示される

## T-12: UI 変更 — 申請一覧画面

- [ ] `src/app/(dashboard)/requests/page.tsx` — `BulkApprovalPanel` に渡す `amount` プロパティを、`formData` から取得する形に変更する: `formData` 内に `amount` キーがあり、その `value` が数値であればその値、なければ `null`
- [ ] `src/app/(dashboard)/requests/BulkApprovalPanel.tsx` — `RequestItem` 型の `amount` プロパティは維持する（表示用の計算済み値として）。formData の `amount` フィールドから値を抽出する処理は呼び出し元（page.tsx）で行う

**Acceptance Criteria**:
- 申請一覧テーブルの「金額」列が formData の `amount` フィールドの値を表示する
- formData に `amount` フィールドがない申請は `-` が表示される
- `BulkApprovalPanel` のインタフェースに破壊的変更がない（`amount: number | null` は維持）

## T-13: UI 変更 — テンプレート管理画面

- [ ] `src/app/(dashboard)/settings/templates/TemplateForm.tsx` — `minAmount` / `maxAmount` の入力欄を削除する（Amount conditions セクション全体を削除）
- [ ] `src/app/(dashboard)/settings/templates/TemplateForm.tsx` — fields エディタセクションを追加する: フィールドの追加ボタン、各フィールドの `name`(text入力), `label`(text入力), `type`(select: text/number/date/textarea/select), `required`(checkbox), `options`(type=select のときのみ表示、カンマ区切りテキスト入力) を編集可能にする。フィールドの削除ボタンも追加する
- [ ] `src/app/(dashboard)/settings/templates/TemplateForm.tsx` — Props の `defaultValues` 型から `minAmount` / `maxAmount` を削除し、`fields: TemplateField[]` を追加する
- [ ] `src/app/(dashboard)/settings/templates/TemplateForm.tsx` — ステップエディタに条件設定 UI を追加する: 各ステップに「条件あり」チェックボックス + `field`(text入力), `operator`(select: gt/gte/lt/lte/eq), `value`(number入力) を表示する
- [ ] `src/app/(dashboard)/settings/templates/TemplateForm.tsx` — `handleSubmit` で `fields` と `steps`（condition 含む）を hidden input に JSON.stringify して設定する
- [ ] `src/app/(dashboard)/settings/templates/[id]/edit/page.tsx` — テンプレートの `defaultValues` に `fields` を渡す（`minAmount` / `maxAmount` を削除）
- [ ] `src/app/(dashboard)/settings/templates/page.tsx` — テンプレート一覧テーブルの「金額条件」列を「フィールド数」列に変更する: `t.fields.length` を表示する

**Acceptance Criteria**:
- テンプレート作成・編集画面に fields エディタが表示される
- フィールドの追加・削除が可能
- 各フィールドの name, label, type, required, options が編集可能
- ステップに条件を設定する UI が存在する
- `minAmount` / `maxAmount` の入力欄が存在しない
- テンプレート一覧の「金額条件」列が「フィールド数」列に変更されている

## T-14: シードデータ更新

- [ ] `src/infrastructure/seed.ts` — 3つのテンプレートを以下に置き換える:
  - 「経費申請」: `fields: [{ name: "amount", label: "金額", type: "number", required: true }, { name: "purpose", label: "用途", type: "text", required: true }, { name: "vendor", label: "支払先", type: "text", required: false }]`, `steps: [{ stepOrder: 1, approverRole: "manager" }, { stepOrder: 2, approverRole: "finance", deadlineHours: 72, condition: { field: "amount", operator: "gt", value: 100000 } }]`
  - 「購買申請」: `fields: [{ name: "amount", label: "金額", type: "number", required: true }, { name: "item", label: "品名", type: "text", required: true }, { name: "quantity", label: "数量", type: "number", required: true }, { name: "deliveryDate", label: "納期", type: "date", required: false }]`, `steps: [{ stepOrder: 1, approverRole: "manager" }, { stepOrder: 2, approverRole: "finance", deadlineHours: 72, condition: { field: "amount", operator: "gt", value: 100000 } }]`
  - 「休暇申請」: `fields: [{ name: "startDate", label: "開始日", type: "date", required: true }, { name: "endDate", label: "終了日", type: "date", required: true }, { name: "reason", label: "理由", type: "textarea", required: false }]`, `steps: [{ stepOrder: 1, approverRole: "manager" }]`
- [ ] `src/infrastructure/seed.ts` — テンプレート作成の `.values()` から `minAmount` / `maxAmount` を削除し、`fields` を追加する
- [ ] `src/infrastructure/seed.ts` — 申請データの `description` / `amount` を `formData` 形式に変更する:
  - 備品購入申請: `formData: { amount: { value: 50000, label: "金額" }, purpose: { value: "オフィス用の椅子を5脚購入したい", label: "用途" }, vendor: { value: "オフィス家具店", label: "支払先" } }`
  - 出張申請: `formData: { amount: { value: 150000, label: "金額" }, purpose: { value: "来週月曜日に東京オフィスへの出張", label: "用途" } }`
  - ソフトウェアライセンス: `formData: { amount: { value: 30000, label: "金額" }, purpose: { value: "開発ツールのライセンスを購入", label: "用途" } }`
- [ ] `src/infrastructure/seed.ts` — 各申請に `templateId` を設定する（経費申請テンプレートの id を参照）

**Acceptance Criteria**:
- 3つのテンプレートが fields 定義付きで存在する
- 経費・購買テンプレートのステップ2に `condition: { field: "amount", operator: "gt", value: 100000 }` が設定されている
- 申請データが `formData` 形式で保存される
- `description` / `amount` / `minAmount` / `maxAmount` への直接参照がシードデータに存在しない

## T-15: テスト更新・追加

- [ ] `src/__tests__/domain/templateSelectionService.test.ts` — ファイル全体を削除する（`templateSelectionService.ts` が削除されるため）
- [ ] `src/__tests__/domain/approvalStepService.test.ts` — `evaluateStepCondition` のテストケースを追加する:
  - condition が undefined → true
  - `{ field: "amount", operator: "gt", value: 100000 }` + `{ amount: { value: 200000, label: "金額" } }` → true
  - `{ field: "amount", operator: "gt", value: 100000 }` + `{ amount: { value: 50000, label: "金額" } }` → false
  - `{ field: "amount", operator: "gt", value: 100000 }` + `{}` → false（フィールド不存在）
  - `{ field: "amount", operator: "gte", value: 100000 }` + `{ amount: { value: 100000, label: "金額" } }` → true
  - `{ field: "amount", operator: "lt", value: 50000 }` + `{ amount: { value: 30000, label: "金額" } }` → true
  - `{ field: "amount", operator: "eq", value: 100000 }` + `{ amount: { value: 100000, label: "金額" } }` → true
- [ ] `src/__tests__/domain/approvalStepService.test.ts` — `filterStepsByCondition` のテストケースを追加する:
  - 条件なしステップ2件 → 2件とも返される
  - 条件付きステップ（amount > 100000）+ formData amount=200000 → ステップが返される
  - 条件付きステップ（amount > 100000）+ formData amount=50000 → ステップが返されない
  - 混合（条件なし1件 + 条件付き1件）→ 条件を満たすステップのみ返される
- [ ] `src/__tests__/usecases/requestWorkflow.test.ts` — TC-024b を更新する: `createRequest` が `templateId` と `formData` を使用することを検証する（`amount` ベースのテンプレート自動選択の検証を削除）
- [ ] `src/__tests__/usecases/requestWorkflow.test.ts` — TC-047 を更新する: `listApprovalTemplatesAction` の不在検証は維持しつつ、テンプレート選択方式の変更に対応する
- [ ] `src/__tests__/usecases/templateManagement.test.ts` — テンプレート作成・更新テストを確認し、`minAmount` / `maxAmount` を参照しているアサーションがあれば `fields` ベースに更新する
- [ ] `src/__tests__/actions/requestValidation.test.ts` — スキーマ定義を `createRequestSchema = z.object({ title: z.string().min(1, ...), templateId: z.string().uuid(...) })` に完全に書き換える: 既存の `description: z.string().optional()` を含むスキーマ定義とそれを前提としたテストを削除し、`templateId` の必須バリデーション（未入力・空文字・不正 UUID の各ケース）テストに置き換える
- [ ] `src/__tests__/static/projectStructure.test.ts` — TC-054 を更新する: テスト名・説明を「テンプレート選択 UI があり、固定の金額入力フィールドがない」に変更する。`name="templateId"` が存在すること、`name="amount"` が存在しないことをアサートする（旧アサーション `not.toContain('name="templateId"')` と `toContain('name="amount"')` を反転・削除する）
- [ ] `src/__tests__/static/projectStructure.test.ts` — TC-057 の `keyFiles` 配列から `"domain/services/templateSelectionService.ts"` を削除する（ファイルが削除されるため `expect(exists).toBe(true)` が失敗する）
- [ ] `src/__tests__/static/projectStructure.test.ts` — TC-057b を更新する: `templateSelectionService.ts` が「存在しないこと」の検証に変更する（`expect(exists).toBe(false)`）。`selectTemplate` の export 検証を削除し、`approvalStepService.ts` に `evaluateStepCondition` と `filterStepsByCondition` が存在することの検証を追加する

**Acceptance Criteria**:
- `templateSelectionService.test.ts` が存在しない
- `evaluateStepCondition` のテストが全件 green
- `filterStepsByCondition` のテストが全件 green
- 既存テストが更新され全件 green
- `bun test` が全件 green

## T-16: ビルド・型チェック・lint 確認

- [ ] `bun run build` が成功することを確認する
- [ ] TypeScript の型チェックが全て通ることを確認する（`bunx tsc --noEmit`）
- [ ] `bun run lint` が成功することを確認する
- [ ] `bun test` が全件 green であることを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `bunx tsc --noEmit` 成功
- `bun run lint` 成功
- `bun test` 全件 green
