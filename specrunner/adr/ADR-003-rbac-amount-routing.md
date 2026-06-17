# ADR-003: RBAC拡張と金額による承認経路自動分岐の設計判断

- **Status**: accepted
- **Date**: 2026-06-17
- **Change**: rbac-amount-routing
- **Deciders**: architect

---

## Context

Clearflow の承認フローは ADR-002 時点で複数段階承認・差し戻し・再申請をサポートしたが、以下の制約が残っていた:

- **ロール体系**: `roleEnum` は `["admin", "member"]` の2値のみ。承認ステップの `approverRole` はシードデータで `"admin"` 固定のため、「上長（manager）承認」「経理（finance）承認」といった役割分担が表現できない
- **テンプレート選択**: `createRequest` usecase は `templateId` を呼び出し元から直接受け取る手動選択方式。金額に応じた経路制御がアプリケーション層で保証されない
- **金額の概念なし**: `requests` テーブルに金額カラムがなく、`approval_templates` にも金額条件がない

本変更でロール体系を4値に拡張し、金額に基づく承認テンプレートの自動選択を導入した。

---

## Decisions

### D1: pgEnum へのロール追加（manager, finance）

**Decision**: `roleEnum` に `"manager"` と `"finance"` を追加する。既存の `"admin"` と `"member"` は維持する。`Role` 型は `"admin" | "member" | "manager" | "finance"` の4値ユニオン型として更新する。

**Rationale**:
- enum 型を維持することで DB レベルの型安全性を確保できる
- text 型に変更するとタイポによるバグリスクが増大し、バリデーションコードが必要になる
- `src/infrastructure/auth.ts` の JWT コールバックの型キャストも同様に更新し、型の一貫性を確保する

**Note**: `approval_steps.approver_role` カラムは text 型のまま維持する。テンプレート定義の自由度を優先し、`canApprove` の単純比較で実行時にミスマッチを検出する設計とする。

#### Alternative 1: roleEnum を text 型に変更

| | |
|---|---|
| **Pros** | 将来のロール追加時にマイグレーション不要。任意の文字列値を受け入れられる |
| **Cons** | DB レベルの型制約がなくなりタイポによるバグが入りやすい。バリデーションをアプリケーション層に追加する必要がある |
| **Why not** | enum 型の型安全性を失うデメリットがロール追加コストを上回るため |

---

### D2: 金額条件をテンプレートに直接保持

**Decision**: `approval_templates` テーブルに `minAmount` (integer, nullable) と `maxAmount` (integer, nullable) カラムを追加する。`null` は「制限なし」を意味し、両方 null のテンプレートはデフォルトテンプレートとして機能する。

**Rationale**:
- テンプレートと金額条件は 1:1 対応で十分。テーブル結合なしのシンプルなクエリで選択可能
- テンプレート取得と金額条件が一体のため、`templateSelectionService` の純粋関数実装が容易

**null の意味**:
- `minAmount = null`: 下限なし
- `maxAmount = null`: 上限なし
- `minAmount = null, maxAmount = null`: デフォルトテンプレート（金額条件なし）

#### Alternative 1: 別テーブル routing_rules を新設

| | |
|---|---|
| **Pros** | 1つのテンプレートに複数の金額条件を関連付けられる。条件の種類（金額・部門・申請種別等）を将来的に拡張しやすい |
| **Cons** | デモ段階の要件に対してオーバーエンジニアリング。テンプレート取得に JOIN が必要で実装が複雑化する |
| **Why not** | 現在の要件はテンプレートと金額条件の 1:1 対応で十分。条件が複雑化した段階で routing_rules へ移行可能 |

---

### D3: テンプレート自動選択の導入（手動選択を廃止）

**Decision**: `src/domain/services/templateSelectionService.ts` を domain サービスとして新設する。選択アルゴリズム:
1. `amount` が指定されている場合: `minAmount <= amount <= maxAmount` に該当するテンプレートを選択する
2. `amount` が `null` の場合: `minAmount` / `maxAmount` が共に null のデフォルトテンプレートを選択する
3. 該当テンプレートなしの場合: エラーを返す
4. 複数テンプレートが該当する場合: デフォルトテンプレートを最後に並べ（`CASE WHEN min_amount IS NULL AND max_amount IS NULL THEN 1 ELSE 0 END ASC`）、最初に見つかったものを使用する

**Rationale**:
- 自動選択により「高額申請は必ず経理承認を通る」というビジネスルールをアプリケーション層で強制できる
- 手動選択では申請者が不適切なテンプレートを選択するリスクが排除できない
- `templateSelectionService` は ORM・DB 非依存の純粋関数として実装し、ADR-001 D5 の domain 層制約を遵守する

#### Alternative 1: 手動選択 + 金額バリデーション

| | |
|---|---|
| **Pros** | UI の柔軟性が高い。申請者がテンプレートを意識的に選択できる |
| **Cons** | 申請者が意図的または誤って不適切なテンプレートを選択するリスクが残る。バリデーションロジックが複雑化する |
| **Why not** | 「高額申請は必ず経理承認を通る」というビジネスルールを保証できないため |

---

### D4: amount を nullable integer で requests テーブルに追加

**Decision**: `requests` テーブルに `amount integer` カラムを nullable で追加する。申請作成時に任意で金額を指定できる。`Request` ドメインモデルに `amount: number | null` を追加する。

**Rationale**:
- 全ての申請が金額に関連するわけではない（休暇申請・設備申請等）
- nullable にすることでデフォルトテンプレートへのフォールバックが可能になり、金額ベース以外の申請も収容できる

#### Alternative 1: amount を NOT NULL (required) で追加

| | |
|---|---|
| **Pros** | 全ての申請に金額が存在することを DB レベルで保証できる |
| **Cons** | 金額が不要な申請（休暇申請等）で無意味な 0 を強制する。申請種別を問わず金額入力が必須となりUXが悪化する |
| **Why not** | 金額のない申請をデフォルトテンプレートで処理できる設計の方が汎用性が高いため |

---

### D5: アクション層の権限ゲート変更（member 排除パターン）

**Decision**: `approveRequestAction` / `rejectRequestAction` の `role !== "admin"` チェックを `role === "member"` 排除パターンに変更する。すなわち member ロール以外のユーザー（admin / manager / finance）は承認・却下操作を試行できる。実際の承認権限の最終判定は usecase 層の `canApprove` に委ねる。

**Rationale**:
- `canApprove` domain サービスがステップ単位のロールチェックを行うため、アクション層は「承認操作を試行できるロール」のゲートのみ担当すれば十分
- 許可リスト方式 `["admin", "manager", "finance"]` はロール追加時にリスト更新が必要で、追加漏れが発生しやすい
- member 排除方式はロール追加に対して開放的で、ゲートの更新コストが低い

**⚠️ 将来ロール追加時の注意（逆リスク）**: `role === "member"` 排除パターンは、将来 `auditor`・`viewer` などの閲覧専用ロールが追加された場合に、そのロールが明示的な設計意図なく承認・却下権限を自動的に取得する。新ロールを追加する際は、そのロールが承認操作を行うべきかを必ず確認し、承認不要のロールであれば本パターンを許可リスト方式 `["admin", "manager", "finance"]` に変更するか、`canApprove` で制限を追加すること。

#### Alternative 1: 許可リスト方式 `["admin", "manager", "finance"]`

| | |
|---|---|
| **Pros** | 承認可能なロールが明示的に列挙されており、コードの意図が明確 |
| **Cons** | 新ロール追加時にリストの更新が必要。更新漏れで意図しない承認拒否が発生するリスクがある |
| **Why not** | ロール追加時の更新コストが高く、member 排除方式の方がゲートとして堅牢なため。ただし将来の閲覧専用ロール追加時は本方式に切り替えること |

---

### D6: createRequest のインタフェース変更（templateId → amount）

**Decision**: `createRequest` usecase の引数から `templateId` を削除し、`amount: number | null` を追加する。usecase 内部で `templateSelectionService` を呼び出してテンプレートを自動選択し、`approval_steps` を生成する。テンプレート自動選択の結果（`templateId`, `amount`）は `audit_logs` に記録する。

**Rationale**:
- テンプレート選択のビジネスロジックを usecase に内包し、呼び出し側（Server Action / UI）が選択の詳細を知らなくてよい設計にする
- `actions → usecases → domain / infrastructure` の依存方向を遵守しつつ、UI を金額入力のみに簡素化できる
- 監査ログにテンプレート選択結果を記録することで、どの経路が自動選択されたかを追跡可能にする

---

## Consequences

### Positive

- `manager` / `finance` ロールが実現し、「上長承認 → 経理承認」のような役割分担を持つ承認フローが構築できる
- テンプレート自動選択により「高額申請は必ず経理承認を通る」というビジネスルールが強制される
- 申請フォームからテンプレート選択 UI が除去され、申請者は金額を入力するだけでよい
- テンプレート選択結果が監査ログに記録され、どの承認経路が選択されたかが追跡可能になる
- `canApprove` の単純比較ロジックを維持したまま、ロール追加のみで自然に承認権限が分離される

### Negative / Trade-offs

- pgEnum への値追加は PostgreSQL の制約上トランザクション外で実行される。Drizzle Kit の生成 SQL に `ALTER TYPE role ADD VALUE` が含まれることを確認すること
- `role === "member"` 排除パターンは将来の閲覧専用ロール追加時に意図しない権限付与のリスクがある（D5 参照）
- `approverRole` が text 型のため、存在しないロール名を設定してもコンパイル時には検出されない。シードデータおよびテンプレート定義時の `approverRole` 値は `roleEnum` の値と一致していることを手動で確認する必要がある
- 複数テンプレートが金額条件に該当する場合、最初に見つかったものを使用する（優先度ルールなし）。条件の重複が生じないようにシードデータ・テンプレート設計で担保する必要がある

### Constraints for future changes

- **新ロール追加時**: アクション層の `role === "member"` 排除パターンがそのロールに承認権限を自動付与しないか確認すること。閲覧専用ロール等の場合は D5 の許可リスト方式に変更するか、`canApprove` で制限を追加すること
- **テンプレート追加時**: 金額条件の重複（同一金額に複数テンプレートが該当）が生じないよう設計すること。現在は最初のマッチを採用する動作のため、重複は想定外の動作を引き起こす可能性がある
- **金額条件の複雑化時**: テンプレートへの minAmount/maxAmount 直接保持から `routing_rules` テーブルへの移行を検討すること（D2 参照）
- **`approval_steps.approver_role` の整合性**: 新規テンプレート定義時の `approverRole` 値は `roleEnum` の値（`"admin" | "member" | "manager" | "finance"`）と一致していることを確認すること
- **`canApprove` の変更**: 承認権限ロジックの変更は `src/domain/services/approvalStepService.ts` の `canApprove` を起点とする（ADR-002 D8 を継承）

---

## References

- `specrunner/changes/rbac-amount-routing/design.md` — 詳細設計（D1〜D6）
- `specrunner/changes/rbac-amount-routing/spec.md` — ビヘイビア仕様
- `specrunner/changes/rbac-amount-routing/request.md` — 要件定義
- `src/infrastructure/schema.ts` — Drizzle スキーマ（roleEnum 拡張、amount/minAmount/maxAmount カラム追加）
- `src/domain/services/templateSelectionService.ts` — テンプレート自動選択ロジック
- `src/domain/services/approvalStepService.ts` — 承認権限判定（canApprove）
- `src/application/usecases/createRequest.ts` — テンプレート自動選択を含む申請作成ロジック
- `src/app/actions/requests.ts` — アクション層の権限ゲート（member 排除パターン）
- `drizzle/0001_rbac_amount_routing.sql` — pgEnum 値追加・カラム追加マイグレーション
