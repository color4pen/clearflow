# テンプレートにフォーム定義を追加し、金額ベースのテンプレート選択を廃止

## Meta

- **type**: spec-change
- **slug**: template-form-definition
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: テンプレートの構造変更、申請データモデルの変更（固定カラム→動的フィールド） → true -->

## 背景

現在のテンプレートは承認経路の定義のみで、申請フォームの項目を定義できない。全申請が同じフォーム（タイトル + 説明 + 金額）で、テンプレートの選択は金額（minAmount/maxAmount）で自動決定される。

実際の業務では「経費申請」「購買申請」「休暇申請」のように申請種別ごとにフォーム項目が異なり、テンプレートはその種別を定義するもの。金額はフォーム項目の1つに過ぎず、テンプレート選択の条件にするのは不適切。

本 request でテンプレートにフォーム定義（fields）を追加し、金額ベースのテンプレート自動選択を廃止する。テンプレートはユーザーが申請種別として手動選択する。

また、テンプレート内に承認条件ルール（金額が閾値を超えた場合にステップを追加する等）を定義できるようにする。

## 現状コードの前提

- `src/infrastructure/schema.ts:62-65` — `requests` テーブルに `title`, `description`, `amount` が固定カラムで存在
- `src/infrastructure/schema.ts:145-147` — `approval_templates` に `steps` (jsonb), `minAmount`, `maxAmount` がある
- `src/domain/models/approvalTemplate.ts:1-15` — `ApprovalTemplate` に `minAmount: number | null`, `maxAmount: number | null`
- `src/domain/services/templateSelectionService.ts` — `selectTemplate` が金額ベースでテンプレートを自動選択
- `src/infrastructure/repositories/approvalTemplateRepository.ts` — `findByOrganizationForAmount` が金額でフィルタ
- `src/application/usecases/createRequest.ts` — テンプレート自動選択 → approval_steps 生成
- `src/app/(dashboard)/requests/new/page.tsx` — 金額入力による自動選択UI

## 要件

1. **テンプレートに fields 定義を追加**: `approval_templates` テーブルの `minAmount` / `maxAmount` カラムを削除し、`fields` (jsonb) カラムを追加する。`fields` はフォーム項目の定義配列: `[{ name: string, label: string, type: "text" | "number" | "date" | "textarea" | "select", required: boolean, options?: string[] }]`。`title` フィールドは全テンプレートで暗黙に存在し、fields には含めない。`type: "select"` の場合 `options` は必須とし、バリデーション時に検証する
2. **テンプレートに承認条件ルールを追加**: `approval_templates` の `steps` jsonb を拡張し、各ステップに `condition?: { field: string, operator: "gt" | "gte" | "lt" | "lte" | "eq", value: number }` を追加する。condition は `type: "number"` のフィールドにのみ適用可能とする。条件付きステップは、フォーム入力値が条件を満たす場合のみ生成される。条件なしステップは常に生成される
3. **requests テーブルの変更**: 固定の `description` / `amount` カラムを廃止し、`formData` (jsonb) カラムを追加する。`title` と `templateId` (FK to approval_templates, nullable) カラムは維持する。`formData` の格納形式は `{ [name]: { value: unknown, label: string } }` とし、表示時にテンプレートを参照せずにラベルを取得可能にする
4. **Request ドメインモデル更新**: `description: string | null` と `amount: number | null` を `formData: Record<string, unknown>` に置換する
5. **ApprovalTemplate ドメインモデル更新**: `minAmount` / `maxAmount` を削除し、`fields: TemplateField[]` を追加する。`ApprovalTemplateStep` に `condition?: StepCondition` を追加する
6. **テンプレート選択の変更**: `templateSelectionService.ts` と `findByOrganizationForAmount` を削除する。`createRequest` usecase を変更し、`templateId` をユーザーが明示的に選択する方式に戻す。承認ステップ生成時に `condition` を評価し、条件を満たすステップのみ生成する
7. **申請作成UIの変更**: テンプレート選択ドロップダウンを復活させる。テンプレート選択後、そのテンプレートの `fields` に基づいて動的にフォーム項目を描画する。金額入力は固定フィールドではなく、テンプレートのfields定義で `type: "number"` として定義される
8. **申請詳細・一覧の変更**: `description` / `amount` の固定表示を `formData` のキー・値ペア表示に変更する。一覧テーブルの「金額」列は、formData 内に `type: "number"` かつ `name: "amount"` のフィールドがあればその値を表示し、なければ `-` を表示する
9. **テンプレート管理UIの変更**: fields エディタを追加する。フィールドの追加・削除・並べ替え。ステップに条件を設定するUIを追加する。`minAmount` / `maxAmount` の入力欄を削除する
10. **シードデータ更新**: 3つのテンプレートを更新する — 「経費申請」（fields: `amount`/金額/number/required, `purpose`/用途/text/required, `vendor`/支払先/text/optional）、「購買申請」（fields: `amount`/金額/number/required, `item`/品名/text/required, `quantity`/数量/number/required, `deliveryDate`/納期/date/optional）、「休暇申請」（fields: `startDate`/開始日/date/required, `endDate`/終了日/date/required, `reason`/理由/textarea/optional）。経費・購買テンプレートの承認ステップに条件を設定（`{ field: "amount", operator: "gt", value: 100000 }` で finance ステップ追加）
11. **既存データの互換性**: migration で既存の `description` / `amount` データを `formData` に移行する。`description` → `formData.description`、`amount` → `formData.amount`
12. **監査ログ・Webhook**: formData の変更は既存の仕組みで自動的に対応される（Request オブジェクトが変わるだけ）

## スコープ外

- ファイル添付フィールド
- フィールドのバリデーションルール（最大文字数、正規表現等）
- テンプレートのバージョン管理（フィールド定義変更時の既存申請への影響管理）
- フォームの条件付き表示（あるフィールドの値に応じて別フィールドを表示/非表示）

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `approval_templates` テーブルに `fields` (jsonb) カラムが存在する
- [ ] `approval_templates` テーブルに `minAmount` / `maxAmount` カラムが存在しない
- [ ] `requests` テーブルに `formData` (jsonb) カラムが存在する
- [ ] `requests` テーブルに `description` / `amount` カラムが存在しない
- [ ] `templateSelectionService.ts` が存在しない
- [ ] 申請作成画面でテンプレートを選択するとフォーム項目が動的に描画されることを確認する
- [ ] 条件付きステップが条件を満たす場合のみ生成されることをテストで確認する
- [ ] 条件付きステップが条件を満たさない場合に生成されないことをテストで確認する
- [ ] 既存データの migration が formData に変換されること
- [ ] createRequest Server Action がテンプレートの fields 定義を参照し、required: true のフィールドが formData に含まれることを検証する
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **formData を jsonb で格納を採用、EAV（Entity-Attribute-Value）テーブル方式を却下** — EAV は複雑でクエリパフォーマンスが悪い。jsonb なら1行で全フィールドを格納でき、PostgreSQL の jsonb 演算子で必要に応じてクエリ可能
2. **title を固定カラムとして維持** — 全申請に共通する「件名」は一覧表示やソートで必須。formData に入れると表示・ソートが面倒になる
3. **テンプレート選択をユーザー手動に戻す** — 金額自動選択は申請種別の概念がないためワークアラウンドだった。ユーザーが「経費申請」「購買申請」を選ぶ方が自然
4. **承認条件をステップ内に定義** — 別テーブル（routing_rules）ではなくステップの condition として定義する。シンプルで、テンプレート1つを見れば承認経路の全体像がわかる
5. **migration で既存データを変換** — description/amount を formData に移行してカラム削除。後方互換のために古いカラムを残さない
