# RBAC拡張と金額による承認経路の自動分岐

## Meta

- **type**: new-feature
- **slug**: rbac-amount-routing
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: ロール体系の拡張、承認経路の自動選択ロジック導入 → true -->

## 背景

現在のロール体系は admin / member の2値で、承認テンプレートの `approverRole` も admin のみ。実際の承認ワークフローでは「上長（manager）承認 → 経理（finance）承認」のように役割に応じた承認者配置が必要。また、少額申請は上長承認のみ、高額申請は経理承認も必要というように、金額に応じて承認経路を自動選択する仕組みが不可欠。

本 request でロール体系を拡張し、金額による承認テンプレートの自動選択を導入する。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/schema.ts:14` — `roleEnum` は `["admin", "member"]` の2値
- `src/infrastructure/schema.ts:89` — `approverRole` は `text` 型（enum ではない）
- `src/domain/services/approvalStepService.ts:33-34` — `canApprove` は `step.approverRole === actorRole` で単純比較
- `src/domain/models/approvalTemplate.ts:1-12` — `ApprovalTemplate` に金額条件のフィールドがない
- `src/infrastructure/schema.ts:100-108` — `approval_templates` テーブルに金額条件カラムがない
- `src/infrastructure/schema.ts:45-58` — `requests` テーブルに金額カラムがない
- `src/application/usecases/createRequest.ts` — `templateId` を直接受け取る。自動選択ロジックなし
- `src/infrastructure/seed.ts` — 2つのテンプレート（上長承認のみ / 上長→経理）、approverRole はどちらも `"admin"`

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

1. **ロール拡張**: `roleEnum` に `"manager"` と `"finance"` を追加する。既存の `"admin"` と `"member"` は維持する。admin はシステム管理者、manager は上長承認者、finance は経理承認者とする
2. **requests テーブルに金額カラム追加**: `amount integer` カラム（nullable）を `requests` テーブルに追加する。申請作成時に任意で金額を指定できる
3. **承認テンプレートに金額条件追加**: `approval_templates` テーブルに `minAmount integer` (nullable) と `maxAmount integer` (nullable) カラムを追加する。`minAmount <= amount <= maxAmount` の範囲で適用されるテンプレートを定義する。null は「制限なし」を意味する
4. **テンプレート自動選択ロジック**: `src/domain/services/templateSelectionService.ts` を新設する。申請の金額に基づいて適用可能なテンプレートを選択する。金額未指定の場合はデフォルトテンプレート（minAmount/maxAmount が共に null のもの）を選択する。該当テンプレートが見つからない場合はエラーを返す
5. **createRequest の変更**: `templateId` の直接指定を廃止し、金額に基づくテンプレート自動選択に変更する。`createRequest` usecase は金額を受け取り、`templateSelectionService` で適切なテンプレートを決定し、`approval_steps` を生成する
6. **approverRole のテンプレート更新**: シードデータのテンプレートを更新し、`approverRole` に `"manager"` と `"finance"` を使用する
7. **canApprove の維持**: `approvalStepService.canApprove` の単純比較ロジックはそのまま維持する。ロール追加により自然に「manager ステップは manager のみ承認可能」が実現する
8. **Server Actions のロールガード更新**: `approveRequestAction` と `rejectRequestAction` の `session.user.role !== "admin"` ガードを、`admin`, `manager`, `finance` のいずれかであれば許可するチェックに変更する。承認可否の最終判定は `canApprove` に委ねる
9. **Role 型の更新**: `src/domain/models/user.ts` の `Role` 型に `"manager"` と `"finance"` を追加する。`src/infrastructure/auth.ts` の JWT/session コールバック内の型キャスト（`as { role: "admin" | "member" }`）も同様に更新する
10. **Request モデルに amount 追加**: `src/domain/models/request.ts` の `Request` 型に `amount: number | null` を追加する
11. **ApprovalTemplate モデルに金額条件追加**: `src/domain/models/approvalTemplate.ts` の `ApprovalTemplate` 型に `minAmount: number | null` と `maxAmount: number | null` を追加する
12. **UI更新**: 申請作成フォームに金額入力フィールドを追加する。テンプレート選択UIを削除し、金額入力に基づく自動選択に変更する。申請一覧・詳細画面に金額を表示する
13. **シードデータ更新**: 3つのテンプレートを定義する — デフォルト（minAmount=null, maxAmount=null, manager 1段階）、少額（minAmount=null, maxAmount=100000, manager 1段階）、高額（minAmount=100001, maxAmount=null, manager → finance 2段階）。ユーザーに manager ロールと finance ロールのユーザーを追加する
14. **監査ログ**: テンプレート自動選択の結果を audit_logs に記録する（選択されたテンプレートID）

## スコープ外

- ロール管理UI（ロールの追加・変更はシードデータのみ）
- ユーザーへのロール付与UI（シードデータで管理）
- 承認テンプレートのCRUD管理画面
- 複数テンプレートが該当する場合の優先度ルール（最初に見つかったものを使用）
- admin ロールによる全ステップ承認の上書き権限

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `roleEnum` に `"manager"` と `"finance"` が含まれる
- [ ] `requests` テーブルに `amount` カラムが存在する
- [ ] `approval_templates` テーブルに `minAmount` と `maxAmount` カラムが存在する
- [ ] 金額10万円の申請に対して manager 1段階テンプレートが自動選択されることをテストで確認する
- [ ] 金額20万円の申請に対して manager → finance 2段階テンプレートが自動選択されることをテストで確認する
- [ ] 金額未指定の申請に対してデフォルトテンプレートが選択されることをテストで確認する
- [ ] `canApprove` で manager ユーザーが manager ステップを承認でき、finance ステップを承認できないことをテストで確認する
- [ ] 申請作成フォームにテンプレート選択UIが存在しない（金額入力に置き換え済み）
- [ ] `approveRequestAction` / `rejectRequestAction` が manager / finance ロールで実行可能であることをテストで確認する
- [ ] `Role` 型に `"manager"` と `"finance"` が含まれる
- [ ] 金額100000の申請が少額テンプレート（maxAmount=100000）に該当することをテストで確認する
- [ ] 金額100001の申請が高額テンプレート（minAmount=100001）に該当することをテストで確認する
- [ ] 各操作で audit_logs にレコードが記録される
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **テンプレート自動選択を採用、手動選択を却下** — 手動選択では金額に応じた経路制御が保証できない。自動選択により「高額申請は必ず経理承認を通る」というビジネスルールを強制できる
2. **金額条件をテンプレートに直接持たせる方式を採用、別テーブル（routing_rules）方式を却下** — routing_rules テーブルは柔軟だがオーバーエンジニアリング。テンプレートに minAmount/maxAmount を持たせる方式でデモの要件は十分。将来的に条件が複雑になったら routing_rules に移行可能
3. **pgEnum へのロール追加を採用、text 型への変更を却下** — roleEnum を拡張して型安全性を維持する。text 型にするとタイポによるバグが入りやすい。ただし approverRole は text 型のままとする（テンプレートで自由に定義できるようにするため）
4. **amount を nullable integer で追加を採用、required にすることを却下** — 全ての申請が金額に関連するわけではない（休暇申請等）。nullable にしてデフォルトテンプレートへのフォールバックを可能にする
