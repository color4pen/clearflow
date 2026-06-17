# Design: RBAC拡張と金額による承認経路の自動分岐

## Context

現在の Clearflow の承認ワークフローは以下の前提で構築されている:

- **ロール体系**: `roleEnum` は `["admin", "member"]` の2値（`src/infrastructure/schema.ts:14`）。admin がシステム管理者兼承認者を兼務している
- **テンプレート選択**: `createRequest` usecase は `templateId` を直接受け取る手動選択方式（`src/application/usecases/createRequest.ts:19`）
- **承認権限チェック**: `canApprove` は `step.approverRole === actorRole` の単純比較（`src/domain/services/approvalStepService.ts:33-34`）。シードデータではすべてのステップの `approverRole` が `"admin"` に設定されている
- **金額の概念なし**: `requests` テーブルに金額カラムがなく（`src/infrastructure/schema.ts:50-64`）、`ApprovalTemplate` にも金額条件がない（`src/domain/models/approvalTemplate.ts:6-12`）
- **アクション層の権限ゲート**: `approveRequestAction` / `rejectRequestAction` は `session.user.role !== "admin"` でハードコード（`src/app/actions/requests.ts:105,131`）

この構成では「上長承認 → 経理承認」や「少額は上長のみ、高額は経理も必要」といった実務的な承認経路を表現できない。

## Goals / Non-Goals

**Goals**:

1. ロール体系を拡張し、`manager`（上長承認者）と `finance`（経理承認者）を追加する
2. 申請に金額フィールドを追加し、金額に基づく承認テンプレートの自動選択を実現する
3. テンプレートの手動選択を廃止し、金額ベースの自動ルーティングに一本化する
4. テンプレート自動選択の結果を監査ログに記録する
5. UI を金額入力ベースに刷新する

**Non-Goals**:

- ロール管理UI / ユーザーへのロール付与UI（シードデータのみで管理）
- 承認テンプレートの CRUD 管理画面
- 複数テンプレートが該当する場合の優先度ルール（最初に見つかったものを使用）
- admin ロールによる全ステップ承認の上書き権限

## Decisions

### D1: pgEnum へのロール追加

`roleEnum` に `"manager"` と `"finance"` を追加する。

- **Rationale**: enum 型を維持することで DB レベルの型安全性を確保する。text 型に変更するとタイポによるバグリスクが増大する
- **Alternatives considered**: (A) `roleEnum` を text 型に変更 — 柔軟だがバリデーションが必要になり型安全性が低下。却下
- **approverRole は text 型のまま維持**: テンプレート定義の `approverRole` カラム（`approval_steps.approver_role`）は text 型のまま。これはロール名のバリデーションよりもテンプレート定義の自由度を優先する判断。`canApprove` の単純比較で実行時にミスマッチを検出可能

### D2: 金額条件をテンプレートに直接保持

`approval_templates` テーブルに `minAmount` / `maxAmount` を nullable integer として追加する。

- **Rationale**: テンプレートと金額条件の 1:1 対応で十分。テーブル結合なしのシンプルなクエリで選択可能
- **Alternatives considered**: (A) 別テーブル `routing_rules` を新設 — 柔軟だがデモ段階ではオーバーエンジニアリング。却下
- **null の意味**: `minAmount = null` は「下限なし」、`maxAmount = null` は「上限なし」。両方 null のテンプレートはデフォルトテンプレートとして機能する

### D3: テンプレート自動選択の導入

`templateSelectionService` を domain サービスとして新設し、金額に基づくテンプレート選択ロジックを実装する。

- **Rationale**: 自動選択により「高額申請は必ず経理承認を通る」というビジネスルールを強制できる。手動選択では金額に応じた経路制御が保証できない
- **選択アルゴリズム**: テンプレート一覧をフィルタリングし、`minAmount <= amount <= maxAmount` に該当するテンプレートを選択する。金額未指定の場合はデフォルトテンプレート（`minAmount` / `maxAmount` 共に null）を選択する。該当なしの場合はエラーを返す
- **Alternatives considered**: (A) 手動選択 + 金額バリデーション — ユーザーが不適切なテンプレートを選択するリスクが残る。却下

### D4: amount を nullable integer で追加

`requests` テーブルに `amount integer` カラムを nullable で追加する。

- **Rationale**: 全ての申請が金額に関連するわけではない（休暇申請等）。nullable にしてデフォルトテンプレートへのフォールバックを可能にする
- **Alternatives considered**: (A) required (NOT NULL) — 金額が不要な申請で無意味な 0 を強制する。却下

### D5: アクション層の権限ゲート変更

`approveRequestAction` / `rejectRequestAction` の `role !== "admin"` チェックを、member ロール以外を許可するように変更する。

- **Rationale**: `canApprove` domain サービスがステップ単位のロールチェックを行うため、アクション層では「承認操作を試行できるロール」のゲートのみ必要。admin / manager / finance はいずれも承認操作を試行可能であり、実際の権限チェックは usecase 層の `canApprove` に委ねる
- **Alternatives considered**: (A) 許可ロールをリスト化 `["admin", "manager", "finance"]` — ロール追加時にリスト更新が必要。(B) member 排除 `role === "member"` — ロール追加に強い。(B) を採用
- **⚠️ 逆リスク（将来ロール追加時の注意）**: `role === "member"` 排除パターンは、将来 `auditor`・`viewer` などの閲覧専用ロールが追加された場合に、その閲覧専用ロールが明示的な設計意図なく承認・却下権限を自動的に取得する。新ロールを追加する際は、そのロールが承認操作を行うべきかを必ず確認し、承認不要のロールであれば本パターンを (A) の許可リスト方式に変更するか、別途 `canApprove` での制限を追加すること

### D6: createRequest のインタフェース変更

`createRequest` usecase の引数から `templateId` を削除し、`amount` を追加する。テンプレート選択は usecase 内部で `templateSelectionService` を呼び出して行う。

- **Rationale**: テンプレート選択のビジネスロジックを usecase に内包し、呼び出し側（action / UI）が選択の詳細を知らなくてよい設計にする

## Risks / Trade-offs

- **[Risk] pgEnum への値追加マイグレーション** → Drizzle Kit が pgEnum の値追加を正しく生成しない可能性がある。生成されたマイグレーション SQL を確認し、必要に応じて `ALTER TYPE role ADD VALUE` を手動で記述する
- **[Risk] 既存テストの破壊** → `role !== "admin"` チェックに依存するテスト（TC-018, TC-019, TC-020, TC-023）が失敗する。テストを新しい権限モデルに合わせて更新する
- **[Trade-off] 複数テンプレート該当時の選択順序** → `findByOrganizationForAmount` は `CASE WHEN min_amount IS NULL AND max_amount IS NULL THEN 1 ELSE 0 END ASC` で ORDER BY し、デフォルトテンプレート（minAmount/maxAmount 共に null）を最後に置く。これにより amount 指定時は常に特定的なテンプレートが優先され、spec の「金額10万円 → 少額テンプレート選択」シナリオが決定的に動作する。`selectTemplate` 側でも同じ順序でソートすることで、DB 挿入順に依存しない純粋関数となる

## Open Questions

- なし（architect 評価済みの設計判断で全設計判断が解決済み）
