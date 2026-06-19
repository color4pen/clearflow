# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✓ | T-01〜T-16 全チェックボックス完了 |
| design.md | ✓ | D1〜D8 全設計判断が実装に反映されている |
| spec.md | ✓ | 全 Requirement (SHALL/MUST) とシナリオが実装・テストで充足されている |
| request.md | ✓ | 全受け入れ基準を満たしている (build/typecheck/test/lint 全 pass) |

---

## 詳細レビュー

### tasks.md — T-01〜T-16 すべて完了

全タスクのチェックボックスが `[x]` で完了済み。verification-result.md で `bun test` 410 pass / 0 fail、build/typecheck/lint いずれも通過が確認済み。

---

### design.md — D1〜D8 全設計判断確認

| ID | 判断内容 | 実装箇所 | 確認結果 |
|----|----------|----------|----------|
| D1 | formData を jsonb で格納 `{ [fieldName]: { value, label } }` | `schema.ts` `form_data jsonb`、`requestRepository.mapRow` | ✓ |
| D2 | templateId を requests テーブルに追加 (nullable FK, onDelete: set null) | `schema.ts` `template_id uuid` FK | ✓ |
| D3 | approval_templates に `fields` jsonb 追加、minAmount/maxAmount 削除 | `schema.ts` `fields jsonb.notNull().default([])` | ✓ |
| D4 | 承認条件をステップ内に `condition?: StepCondition` として定義 | `approvalTemplate.ts` `ApprovalTemplateStep.condition?` | ✓ |
| D5 | templateSelectionService.ts と findByOrganizationForAmount を削除 | ファイル不在・関数不在を確認 | ✓ |
| D6 | 条件評価を approvalStepService の純粋関数として実装 | `evaluateStepCondition` / `filterStepsByCondition` — infrastructure import なし | ✓ |
| D7 | migration で既存データを変換してからカラム削除 | `0006_template_form_definition.sql` UPDATE → DROP の順序 | ✓ |
| D8 | createRequestAction で fields 定義参照のバリデーション | required・number・select options 検証を実装 | ✓ |

---

### spec.md — Requirement と Scenario 確認

#### テンプレートの fields 定義
- `approval_templates.fields` (jsonb) 存在、`minAmount`/`maxAmount` 不在 ✓
- `TemplateField` 型が仕様通りの構造で定義 ✓
- `type: "select"` の場合 `options` 必須バリデーション (`templates.ts` の `templateFieldSchema.refine`) ✓

#### 承認ステップの条件定義
- `evaluateStepCondition(undefined, any) === true` ✓
- gt/gte/lt/lte/eq の全演算子テスト済み (approvalStepService.test.ts) ✓
- フィールド不存在時 `false` を返す ✓
- `filterStepsByCondition` が条件を満たすステップのみ返す ✓

#### requests テーブルの formData
- `form_data` (jsonb) カラム存在、`description`/`amount` 不在 ✓
- 格納形式 `{ [fieldName]: { value, label } }` がスキーマ・リポジトリ・アクション・UI で一貫 ✓

#### Request ドメインモデル
- `formData: Record<string, { value: unknown; label: string }>` 存在 ✓
- `templateId: string | null` 存在 ✓
- `description`/`amount` フィールド不在 ✓

#### テンプレート手動選択
- `templateSelectionService.ts` 削除済み ✓
- `findByOrganizationForAmount` 削除済み ✓
- `createRequest` が `findById` で明示的にテンプレートを取得 ✓

#### 申請作成 UI の動的フォーム
- `name="templateId"` の select 要素存在 ✓
- テンプレート選択後に fields 定義に基づいて動的フォームを描画 ✓
- 固定の `description`/`amount` フィールド不在 ✓
- text/number/date/textarea/select の各 type に対応する HTML 要素で描画 ✓
- required フィールドに必須マーク (`*`) 表示 ✓

#### 申請詳細・一覧の formData 表示
- 詳細画面: `Object.entries(request.formData)` でラベル・値ペア表示 ✓
- 数値は `toLocaleString("ja-JP")` でフォーマット ✓
- 一覧: `formData["amount"].value` から金額を動的に抽出、存在しない場合は `null` (表示は `-`) ✓

#### テンプレート管理 UI の fields エディタ
- `TemplateForm.tsx` に fields エディタ (追加・削除・型選択・required・options) ✓
- ステップに条件設定 UI ✓
- `minAmount`/`maxAmount` 入力欄削除 ✓
- テンプレート一覧の「金額条件」列 → 「フィールド数」列 (`t.fields.length`) ✓

#### formData バリデーション
- required フィールド未入力時エラーを返す ✓
- number フィールドの数値変換・非数値時エラー ✓
- select フィールドの options 外の値を拒否 ✓

#### 既存データの migration
- `description`/`amount` → `formData` への変換 SQL 実装済み (CASE 分岐で NULL も考慮) ✓
- 変換後にカラムを削除 ✓
- 両方 NULL の場合 `formData = {}` ✓

#### シードデータ
- 経費申請・購買申請・休暇申請の3テンプレートが fields 定義付きで存在 ✓
- 経費申請・購買申請のステップ2に `{ field: "amount", operator: "gt", value: 100000 }` 設定 ✓
- 申請データが `{ field: { value, label } }` 形式 ✓

#### 依存方向の遵守
- `src/domain/` 配下に `@/infrastructure` import なし (TC-034 の静的検証テストで確認) ✓
- `createRequest.ts` は `@/domain/services` と `@/infrastructure/repositories` を import し、方向性を遵守 ✓

---

### request.md — 受け入れ基準

| 基準 | 確認結果 |
|------|----------|
| `bun run build` 成功 | ✓ (9.0s, exit 0) |
| `bun test` 全件 green | ✓ (410 pass / 0 fail) |
| `approval_templates` に `fields` (jsonb) 存在 | ✓ |
| `approval_templates` に `minAmount`/`maxAmount` 不在 | ✓ |
| `requests` に `formData` (jsonb) 存在 | ✓ |
| `requests` に `description`/`amount` 不在 | ✓ |
| `templateSelectionService.ts` 不在 | ✓ |
| 申請作成画面でテンプレート選択後に動的フォーム描画 | ✓ |
| 条件付きステップ（条件を満たす場合のみ生成）をテストで確認 | ✓ |
| 条件付きステップ（条件を満たさない場合に生成されない）をテストで確認 | ✓ |
| 既存データの migration が formData に変換されること | ✓ |
| `createRequestAction` が required フィールドの存在を検証 | ✓ |
| 依存方向 `actions → usecases → domain / infrastructure` 遵守 | ✓ |
| `typecheck` green | ✓ (tsc --noEmit, exit 0) |

---

## 備考

- lint に 3 件の warning（`formatAmount` 未使用変数、`_prev`/`_formData` 未使用引数）があるが、すべて warning であり error はなし。ビルド・動作に影響しない。
- migration SQL の `'"説明"'::jsonb` は PostgreSQL の jsonb 型キャストとして正しく、文字列値 `説明` を格納する。
