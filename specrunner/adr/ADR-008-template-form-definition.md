# ADR-008: テンプレートのフォーム定義と動的申請データモデル（formData）

- **Status**: accepted
- **Date**: 2026-06-19
- **Change**: template-form-definition
- **Deciders**: architect
- **Supersedes**: ADR-003 (D2, D3, D4, D6) — minAmount/maxAmount・テンプレート自動選択・amount固定カラムを全廃

---

## Context

ADR-003 でテンプレートに `minAmount` / `maxAmount` を追加し、申請の金額に基づくテンプレート自動選択（`templateSelectionService`）を導入した。しかしこの設計には根本的な限界があった:

- **全申請が同一フォーム**: `requests` テーブルの `title` / `description` / `amount` が固定カラムのため、申請種別（経費・購買・休暇）ごとに異なるフォーム項目を表現できない
- **金額=テンプレート選択条件の不自然さ**: 「休暇申請」のように金額が無意味な申請種別に対し、金額自動選択のワークアラウンドが必要だった
- **テンプレートの役割の矛盾**: テンプレートは「申請種別」を表すべき概念なのに、「金額条件付き承認経路」として実装されていた

実務では「経費申請」「購買申請」「休暇申請」のように申請種別ごとにフォーム項目が異なり、承認ステップの発動も一部の申請でのみ金額が条件になる。本変更でテンプレートを「申請種別のフォーム定義 + 条件付き承認ステップ定義」に再定義する。

---

## Decisions

### D1: formData を jsonb で格納（EAV テーブル方式を却下）

**Decision**: `requests` テーブルの `description` / `amount` 固定カラムを廃止し、`formData` (jsonb) カラムに統合する。`title` カラムは全申請共通のため固定カラムとして維持する。格納形式は `{ [fieldName]: { value: unknown, label: string } }` とし、各フィールドの値と表示ラベルをペアで保持する。

**Rationale**:
- jsonb なら1行で全フィールドを格納でき、PostgreSQL の jsonb 演算子で必要に応じてクエリ可能
- `{ value, label }` 形式により、申請詳細表示時にテンプレート定義を参照せずにラベルを表示できる（テンプレートが後から変更されても過去の申請表示に影響しない）

#### Alternative 1: EAV（Entity-Attribute-Value）テーブル方式

| | |
|---|---|
| **Pros** | 正規化されており、フィールド単位でのクエリ・インデックス追加が容易 |
| **Cons** | 1件の申請のデータ取得に N+1 クエリまたは複雑な JOIN が必要。フォームデータの全件取得・表示が著しく複雑になる |
| **Why not** | クエリパフォーマンスと実装複雑度のデメリットが、現在の要件では jsonb の柔軟性を上回らないため |

---

### D2: title を固定カラムとして維持

**Decision**: `title` カラムは `formData` に含めず、`requests` テーブルの固定カラムとして維持する。

**Rationale**:
- 全申請に共通する「件名」は申請一覧表示・ソート・検索で必須
- `formData` に入れると `ORDER BY title` や全文検索がjsonb演算子経由になり、インデックス設計が複雑化する

---

### D3: templateId を requests テーブルに追加

**Decision**: `requests` テーブルに `templateId` (uuid, nullable, FK to approval_templates) を追加する。nullable にするのは migration 時の既存レコードへの対応のため。

**Rationale**:
- 申請がどのテンプレートから作成されたかを永続化することで、申請詳細表示時のフィールド定義の参照や将来的なレポーティングに活用できる
- 承認ステップの条件評価（D6）でテンプレートのステップ定義を参照する際に、どのテンプレートで作成されたかが追跡可能になる

#### Alternative 1: audit_logs の metadata からのみ templateId を参照

| | |
|---|---|
| **Pros** | requests テーブルにカラム追加不要 |
| **Cons** | 特定の申請の作成テンプレートを取得するために audit_logs を逆引きする必要があり、クエリが非効率 |
| **Why not** | 申請と作成テンプレートの関係はファーストクラスの情報として requests テーブルに保持する方が適切なため |

---

### D4: テンプレートの fields 定義（minAmount / maxAmount を廃止）

**Decision**: `approval_templates` テーブルの `minAmount` / `maxAmount` を削除し、`fields` (jsonb) カラムを追加する。`TemplateField = { name: string, label: string, type: "text" | "number" | "date" | "textarea" | "select", required: boolean, options?: string[] }` の配列として定義する。`type: "select"` の場合 `options` は必須とし、バリデーション時に検証する。`title` は全テンプレートで暗黙に存在する固定フィールドとして扱い、fields 配列には含めない。

**Rationale**:
- テンプレート1レコードにフォーム構造が自己完結し、申請種別ごとに任意のフォーム項目を定義できる
- `minAmount` / `maxAmount` の廃止により、金額が存在しない申請種別（休暇申請等）でのワークアラウンドが不要になる
- jsonb でフレキシブルに定義でき、新フィールドタイプの追加がスキーマ変更なしに可能

**ADR-003 D2 との関係**: ADR-003 で導入した `minAmount` / `maxAmount` による「テンプレートと金額条件の1:1対応」を廃止する。金額は `type: "number"` の fields の一要素として定義されるようになる。

---

### D5: テンプレート手動選択への回帰（templateSelectionService を廃止）

**Decision**: `templateSelectionService.ts` と `findByOrganizationForAmount` を削除する。`createRequest` usecase で `templateId` をユーザーが明示的に指定する方式に変更する。申請作成画面にテンプレート選択ドロップダウンを配置し、テンプレート選択後にそのテンプレートの fields に基づいて動的にフォーム項目を描画する。

**Rationale**:
- テンプレートが申請種別を表す今、ユーザーが「経費申請」「購買申請」を選ぶ方が自然でわかりやすい
- 金額自動選択は申請種別の概念がないためのワークアラウンドだった（ADR-003 D3 では「ビジネスルールを強制できる」という Rationale で導入したが、テンプレートが申請種別を表す設計では manual selection の方が適切）
- テンプレートの fields 定義がフォームを決定するため、テンプレートが先に選択される必要がある

**ADR-003 D3 との関係**: ADR-003 D3 で「申請者が不適切なテンプレートを選択するリスク」を理由に自動選択を採用したが、申請種別という概念自体が明示的になった今、ユーザーが種別を選ぶことは適切な操作であり、「不適切な選択」という問題設定自体が解消された。

#### Alternative 1: 自動選択を維持しつつ fields を追加

| | |
|---|---|
| **Pros** | ADR-003 の「ユーザーがテンプレートを意識しなくてよい」というUXを維持できる |
| **Cons** | テンプレートに fields が追加された場合、フォームの描画順序を決定するためにいずれかのテンプレートが事前に選択されている必要がある。自動選択は「金額入力後」に確定するため、フォーム項目が動的に変わるUXになり混乱を招く |
| **Why not** | テンプレート選択とフォーム描画が不可分になった設計では、手動選択が唯一の整合的な方式 |

---

### D6: 承認条件をステップ内に定義（条件付きステップ生成）

**Decision**: `ApprovalTemplateStep` に `condition?: StepCondition` を追加する。`StepCondition = { field: string, operator: "gt" | "gte" | "lt" | "lte" | "eq", value: number }` とし、`type: "number"` のフィールドにのみ適用可能とする。条件評価ロジックは `approvalStepService.ts` の純粋関数 `evaluateStepCondition` / `filterStepsByCondition` として実装する。条件なしステップは常に生成され、条件付きステップはフォーム入力値が条件を満たす場合のみ生成される。

**Rationale**:
- テンプレート1レコードを見れば承認経路の全体像（条件込み）がわかるシンプルな設計
- `evaluateStepCondition` は純粋関数のため、ユニットテストが DB 非依存で記述できる（ADR-001 D8、ADR-002 D8 の domain service 純粋関数原則を継承）
- `{ value, label }` 形式と生数値の両方を透過的に処理し、フィールド不存在・数値変換不能時は `false` を返す堅牢な設計

#### Alternative 1: routing_rules テーブルを新設

| | |
|---|---|
| **Pros** | 条件の種類（金額・部門・申請種別等）を将来的に拡張しやすい |
| **Cons** | 現段階の要件に対してオーバーエンジニアリング。テンプレート取得に JOIN が必要で実装が複雑化する。テンプレートと承認ルールの対応関係が分散する |
| **Why not** | ADR-003 D2 の Alternative 1 で同様の理由で却下された方式であり、シンプルなステップ内 condition で現要件は十分に充足できる |

---

### D7: formData のバリデーションを actions 層で実施

**Decision**: `createRequestAction` (Server Action) でテンプレートの `fields` 定義を参照し、`required: true` のフィールドが formData に含まれ空でないことを検証する。`type: "number"` のフィールドには数値変換を行い、`type: "select"` のフィールドは送信値が `options` 配列に含まれるかを検証する。

**Rationale**:
- バリデーションは actions 層の責務（ADR-001 D4 継承）。usecase 層はバリデーション済みのデータを受け取る前提
- `select` フィールドの options バリデーションは、フォーム改ざんによる想定外値の注入を防ぐセキュリティ上の要件

---

### D8: migration で既存データを formData に変換（後方互換カラムを維持しない）

**Decision**: Drizzle migration で既存の `description` / `amount` データを `formData` jsonb に変換する。変換ルール: `description` → `formData.description = { value: description, label: "説明" }`、`amount` → `formData.amount = { value: amount, label: "金額" }`。両方 null の場合は `formData = {}`。データ変換後に `description` / `amount` カラムを削除する。

**Rationale**:
- クリーンなスキーマを維持するため、後方互換のために古いカラムを残さない
- 変換後の formData は `{ value, label }` 形式（D1）に準拠し、既存申請の詳細表示が formData の統一インタフェースで動作する

---

## Consequences

### Positive

- 申請種別（経費・購買・休暇）ごとに異なるフォーム項目を定義でき、業務実態に即した申請フローを構築できる
- テンプレートと申請データモデルが申請種別の概念と一致し、コードの意図が自明になる
- `templateSelectionService.ts` が削除され、金額ベースのワークアラウンドが解消される
- 承認ステップの条件評価がドメインサービスの純粋関数として実装され、テストが容易
- formData の `{ value, label }` 格納形式により、テンプレート変更後も既存申請の詳細表示が正しく動作する
- 申請詳細・一覧のコードが固定カラム参照から formData 動的参照に統一される

### Negative / Trade-offs

- **formData の型安全性の低下**: 固定カラム（description / amount）から jsonb への移行により、コンパイル時の型チェックが効かなくなる。domain モデルで `Record<string, { value: unknown; label: string }>` として扱い、Server Action 層のランタイムバリデーション（D7）で補完する
- **formData のデータ冗長**: `{ value, label }` 形式はラベルの重複保持になる。テンプレートのフィールドラベルが変更された場合、過去の申請の `formData.label` は古いラベルのままになる（テンプレートのバージョン管理はスコープ外）
- **一覧の金額列が動的**: `formData` から `amount` フィールドを動的に取得するため、テンプレートに `amount` フィールドがない場合（休暇申請等）は `-` 表示になる。これは意図された動作
- **テンプレート二重取得**: `createRequestAction` でフィールド検証のため1回、`createRequest` usecase でステップ条件評価のため再度 `findById` を呼ぶ。アーキテクチャ的な層分離の意図的トレードオフ（review-feedback-001 finding #1 参照）

### Constraints for future changes

- **フォームフィールド追加時**: `TemplateField.type` の拡張には `approvalTemplateRepository.ts` の型定義と `TemplateForm.tsx` のフィールド描画ロジックの両方を更新すること
- **formData クエリ追加時**: PostgreSQL の jsonb 演算子（`->`, `->>`, `@>`）を使用すること。`formData->>'amount'` の型キャストが必要な場合は `(formData->>'amount')::numeric` を使用する
- **condition の拡張時**: 現在 `condition.field` は `type: "number"` のフィールドにのみ適用可能。文字列フィールドへの条件適用を追加する場合は `evaluateStepCondition` と `StepCondition.value` の型を合わせて変更すること
- **テンプレートのバージョン管理追加時**: formData 内の `label` が作成時点のスナップショットである設計（D1）と整合するよう、バージョン管理スキーマを設計すること
- **`select` フィールドの options 変更時**: 既存申請の `formData` に保存された値が変更後の options に含まれない可能性がある。申請の再編集機能を追加する場合は過去の値の扱いを定義すること
- **新ロール追加時（ADR-003 D5 継承）**: `approverRole` が text 型のため、存在しないロール名を `steps` に設定してもコンパイル時には検出されない。テンプレート作成・更新時に `approverRole` の値が `roleEnum` と一致していることを確認すること

### Known Design Debt

- テンプレートのバージョン管理未実装（フィールド定義変更時の既存申請への影響管理、スコープ外）
- ファイル添付フィールド未実装（スコープ外）
- フォームの条件付き表示（あるフィールドの値に応じて別フィールドを表示/非表示）未実装（スコープ外）
- フィールドのバリデーションルール（最大文字数、正規表現等）未実装（スコープ外）
- テンプレート二重取得問題（`createRequestAction` + `createRequest` usecase）は意図的トレードオフとして残存（review-feedback-001 finding #1 参照）

---

## References

- `specrunner/changes/template-form-definition/design.md` — 詳細設計（D1〜D8）
- `specrunner/changes/template-form-definition/spec.md` — ビヘイビア仕様
- `specrunner/changes/template-form-definition/request.md` — 要件定義
- `specrunner/changes/template-form-definition/review-feedback-001.md` — コードレビュー結果（approved, score 8.70）
- `specrunner/adr/ADR-001-foundation-db-auth-domain.md` — D4（actions 層バリデーション）・D8（domain service 純粋関数）を継承
- `specrunner/adr/ADR-002-multi-stage-approval-workflow.md` — D8（domain service 純粋関数原則）を継承
- `specrunner/adr/ADR-003-rbac-amount-routing.md` — D2/D3/D4/D6 を本 ADR で部分廃止
- `src/infrastructure/schema.ts` — `requests.formData`・`approval_templates.fields` スキーマ変更
- `src/domain/models/approvalTemplate.ts` — `TemplateField` / `StepCondition` 型定義
- `src/domain/models/request.ts` — `Request.formData` 型定義
- `src/domain/services/approvalStepService.ts` — `evaluateStepCondition` / `filterStepsByCondition` 追加
- `src/application/usecases/createRequest.ts` — 手動 templateId 選択・条件付きステップ生成
- `src/app/actions/requests.ts` — formData バリデーション（required / number / select）
- `src/app/(dashboard)/requests/new/page.tsx` — テンプレート選択 + 動的フォーム描画
- `src/app/(dashboard)/settings/templates/TemplateForm.tsx` — fields エディタ・ステップ条件設定 UI
- `drizzle/0006_template_form_definition.sql` — DB マイグレーション（formData 変換・カラム削除）
