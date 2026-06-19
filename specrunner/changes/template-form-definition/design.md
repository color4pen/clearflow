# Design: テンプレートにフォーム定義を追加し、金額ベースのテンプレート選択を廃止

## Context

Clearflow の承認テンプレートは現在、承認経路（steps）と金額条件（minAmount / maxAmount）のみを定義する。全申請は同一のフォーム（title + description + amount）で作成され、テンプレートは金額に基づき自動選択される。

現行のデータモデル:
- `requests` テーブル: `title` (text), `description` (text, nullable), `amount` (integer, nullable) が固定カラム
- `approval_templates` テーブル: `steps` (jsonb), `minAmount` (integer, nullable), `maxAmount` (integer, nullable)
- `templateSelectionService.ts`: 金額ベースで `selectTemplate()` を実行する純粋関数
- `approvalTemplateRepository.findByOrganizationForAmount()`: 金額でテンプレートをフィルタするクエリ

実務では「経費申請」「購買申請」「休暇申請」のように申請種別ごとにフォーム項目が異なり、金額は一部の申請種別にのみ関係する。テンプレートが申請種別（＝フォーム定義）を表す概念に進化する必要がある。

## Goals / Non-Goals

**Goals**:

1. テンプレートにフォーム定義（fields）を追加し、申請種別ごとに異なるフォーム項目を定義可能にする
2. 金額ベースのテンプレート自動選択を廃止し、ユーザーによる手動選択に変更する
3. テンプレートの承認ステップに条件（condition）を追加し、フォーム入力値に応じた動的な承認経路生成を実現する
4. `requests` テーブルの固定カラム（description / amount）を動的な `formData` (jsonb) に置き換える
5. 既存データを migration で `formData` 形式に変換する

**Non-Goals**:

- ファイル添付フィールド
- フィールドのバリデーションルール（最大文字数、正規表現等）
- テンプレートのバージョン管理（フィールド定義変更時の既存申請への影響管理）
- フォームの条件付き表示（あるフィールドの値に応じて別フィールドを表示/非表示）

## Decisions

### D1: formData を jsonb で格納

`requests` テーブルの `description` / `amount` 固定カラムを廃止し、`formData` (jsonb) カラムに統合する。`title` カラムは全申請共通のため固定カラムとして維持する。

- **格納形式**: `{ [fieldName]: { value: unknown, label: string } }` — 各フィールドの値と表示ラベルをペアで保持する。これにより申請詳細表示時にテンプレート定義を参照せずにラベルを表示できる
- **Rationale**: EAV (Entity-Attribute-Value) テーブル方式は複雑でクエリパフォーマンスが悪い。jsonb なら1行で全フィールドを格納でき、PostgreSQL の jsonb 演算子で必要に応じてクエリ可能
- **Alternatives considered**: (A) EAV テーブル（`request_field_values(request_id, field_name, field_value)`）— 正規化されるがクエリが複雑になりパフォーマンスも低下。却下

### D2: templateId を requests テーブルに追加

`requests` テーブルに `templateId` (uuid, nullable, FK to approval_templates) を追加する。

- **Rationale**: 申請がどのテンプレートから作成されたかを永続化することで、申請詳細表示時のフィールド定義の参照や将来的なレポーティングに活用できる。nullable にするのは migration 時の既存レコード対応のため
- **Alternatives considered**: (A) audit_logs の metadata からのみ templateId を参照 — 逆引きが必要で非効率。却下

### D3: テンプレートの fields 定義

`approval_templates` テーブルの `minAmount` / `maxAmount` を削除し、`fields` (jsonb) カラムを追加する。

- **fields の型定義**: `TemplateField = { name: string, label: string, type: "text" | "number" | "date" | "textarea" | "select", required: boolean, options?: string[] }`
- **title の扱い**: `title` は全テンプレートで暗黙に存在する固定フィールドとして扱い、fields 配列には含めない
- **select の options**: `type: "select"` の場合、`options` は必須とし、バリデーション時に検証する
- **Rationale**: jsonb でフレキシブルに定義でき、テンプレート1レコードにフォーム構造が自己完結する

### D4: 承認条件をステップ内に定義

`ApprovalTemplateStep` に `condition?: StepCondition` を追加する。`StepCondition = { field: string, operator: "gt" | "gte" | "lt" | "lte" | "eq", value: number }`。

- **Rationale**: 別テーブル（routing_rules）ではなくステップの condition として定義する。テンプレート1つを見れば承認経路の全体像がわかるシンプルな設計
- **condition は number フィールドのみ**: `condition.field` は `type: "number"` のフィールドにのみ適用可能とする
- **条件評価**: 条件なしステップは常に生成される。条件付きステップはフォーム入力値が条件を満たす場合のみ生成される
- **Alternatives considered**: (A) `routing_rules` テーブルを新設 — 柔軟だが現段階ではオーバーエンジニアリング。却下

### D5: テンプレート手動選択への回帰

`templateSelectionService.ts` と `findByOrganizationForAmount` を削除し、`createRequest` usecase で `templateId` をユーザーが明示的に指定する方式に変更する。

- **Rationale**: 金額自動選択は申請種別の概念がないためのワークアラウンドだった。テンプレートが申請種別を表す今、ユーザーが「経費申請」「購買申請」を選ぶ方が自然
- **UI 上の動作**: 申請作成画面にテンプレート選択ドロップダウンを配置する。テンプレート選択後にそのテンプレートの fields に基づいて動的にフォーム項目を描画する

### D6: 条件付きステップ生成のドメインサービス

`createRequest` usecase 内で承認ステップを生成する際、テンプレートの各ステップの `condition` を評価し、条件を満たすステップのみを生成する。この条件評価ロジックは `approvalStepService` に `evaluateStepCondition` として追加する。

- **Rationale**: 条件評価は純粋なビジネスルール（formData とステップ定義の照合）のため domain service に配置する。usecase は domain service を呼び出して条件付きフィルタを行う
- **評価ロジック**: `condition` が undefined のステップは常に含める。`condition` が定義されているステップは、`formData[condition.field]` の値を取得し、`operator` で比較して true の場合のみ含める

### D7: migration で既存データを変換

Drizzle migration で既存の `description` / `amount` データを `formData` jsonb に移行する。

- **変換ルール**: `description` → `formData.description = { value: description, label: "説明" }`、`amount` → `formData.amount = { value: amount, label: "金額" }`。両方 null の場合は `formData = {}`
- **カラム削除**: データ変換後に `description` / `amount` カラムを削除する
- **Rationale**: 後方互換のために古いカラムを残さない。クリーンなスキーマを維持する

### D8: formData のバリデーション

`createRequestAction` (Server Action) でテンプレートの `fields` 定義を参照し、`required: true` のフィールドが `formData` に含まれていることを検証する。型チェック（number フィールドに文字列が入っていないか等）も行う。

- **Rationale**: バリデーションは actions 層の責務。usecase 層はバリデーション済みのデータを受け取る前提とする
- **テンプレートの取得**: バリデーション時にテンプレートを DB から取得し、fields 定義を参照する

## Risks / Trade-offs

- **[Risk] Drizzle migration での既存データ変換** → SQL レベルの UPDATE + ALTER TABLE で対応する。`drizzle-kit generate` が期待通りの SQL を生成しない場合は、カスタム migration SQL を手書きする。migration はテスト環境で事前検証する
- **[Risk] formData の型安全性の低下** → 固定カラム（description / amount）から jsonb への移行により、コンパイル時の型チェックが効かなくなる。ドメインモデルで `Record<string, unknown>` として扱い、Server Action 層でランタイムバリデーションを強化する
- **[Risk] 既存テストの大規模更新** → `templateSelectionService` 関連テスト（`templateSelectionService.test.ts`）の全件削除、`requestWorkflow.test.ts` の createRequest テスト更新、`requestValidation.test.ts` のスキーマ更新が必要。テスト更新は実装変更と同一タスクで行い、常に green を維持する
- **[Trade-off] formData の格納形式 `{ [name]: { value, label } }` はデータ冗長** → テンプレート定義変更時にラベルが古いまま残る可能性があるが、スコープ外の「テンプレートのバージョン管理」で対応する想定。現時点では申請作成時のラベルを保持する設計で十分
- **[Trade-off] 一覧テーブルの金額列** → formData から `amount` フィールドを動的に取得するため、テンプレートに `amount` フィールドがない場合は `-` 表示になる。これは意図された動作

## Open Questions

- なし（architect 評価済みの設計判断で全設計判断が解決済み）
