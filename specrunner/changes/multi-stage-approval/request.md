# 複数段階承認と差し戻し・再申請

## Meta

- **type**: new-feature
- **slug**: multi-stage-approval
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 承認フローの根本的な構造変更（単一承認→複数段階）、新テーブル追加、状態遷移モデルの拡張 → true -->

## 背景

現在の承認フローは単一承認者による一段階の承認のみ。実際の業務では経費申請のように「上長承認 → 経理承認」のような複数段階の承認が必要になる。また、承認者が差し戻した申請を申請者が修正して再提出できるフローも不可欠。

本 request で承認ワークフローの核心機能を導入する。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/domain/models/request.ts:1` — `RequestStatus` は `"draft" | "pending" | "approved" | "rejected"` の4状態
- `src/domain/services/requestTransition.ts:3-6` — 状態遷移は `draft → pending`, `pending → approved | rejected` のみ
- `src/infrastructure/schema.ts:15-20` — `requestStatusEnum` は4値（draft, pending, approved, rejected）
- `src/infrastructure/schema.ts:45-58` — `requests` テーブルに承認段階や承認者の情報を持つカラムがない
- `src/application/usecases/approveRequest.ts` — 単一の承認操作。誰が承認したかの記録は audit_logs のみ
- `src/application/usecases/index.ts` — `submitRequest`, `approveRequest`, `rejectRequest`, `createRequest`, `getRequest`, `listRequests` の6 usecase
- `src/infrastructure/schema.ts:14` — `roleEnum` は `admin | member` の2値

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

1. **承認ステップテーブルの追加**: `approval_steps` テーブルを新設する。カラム: id, requestId (FK), stepOrder (integer), approverRole (text), status (pending | approved | rejected), approvedBy (FK to users, nullable), approvedAt (timestamp, nullable), comment (text, nullable), organizationId (FK)。1つの申請に対して順序付きの承認ステップを複数定義できる
2. **承認テンプレートテーブルの追加**: `approval_templates` テーブルを新設する。カラム: id, name, organizationId (FK), steps (jsonb — `[{ stepOrder: number, approverRole: string }]`), createdAt。組織ごとに承認フローのテンプレートを定義し、申請作成時に適用する
3. **状態遷移の拡張**: `RequestStatus` に `"revision"` を追加し、差し戻し後の修正中状態を表す。遷移ルール: `draft → pending`, `pending → approved | rejected | revision`, `revision → pending`。`approved` と `rejected` は終端状態
4. **承認ロジックの変更**: `approveRequest` usecase を拡張する。現在のステップを承認した後、次のステップが存在すれば申請は `pending` のまま次ステップへ進む。全ステップが承認されたら申請を `approved` にする
5. **差し戻しロジック**: `reviseRequest` usecase を新設する。任意のステップで差し戻し可能。差し戻し時に申請のステータスを `revision` に変更し、コメント（差し戻し理由）を承認ステップに記録する。`rejectRequest` は最終却下専用として維持し、申請を `rejected`（終端状態）に遷移させる
6. **再申請ロジック**: `resubmitRequest` usecase を新設する。`revision` 状態の申請を `pending` に戻し、差し戻されたステップ以降の承認ステータスをリセットする。差し戻し前に完了したステップはリセットしない
7. **createRequest の拡張**: `createRequest` usecase に `templateId` パラメータを追加する。テンプレートの steps 定義をもとに `approval_steps` レコードをトランザクション内で生成する
8. **ドメインモデル**: `src/domain/models/` に `ApprovalStep` 型と `ApprovalTemplate` 型を追加する
9. **ドメインサービス拡張**: `requestTransition.ts` に新しい遷移ルール（revision 状態を含む）を追加する。承認ステップの進行判定ロジックを `src/domain/services/approvalStepService.ts` に配置する。ステップ承認の認可ルール: `approvalStep.approverRole` が `user.role` と一致するユーザーのみ承認可能
10. **リポジトリ**: `approvalStepRepository.ts` と `approvalTemplateRepository.ts` を `src/infrastructure/repositories/` に追加する
11. **UI拡張**: 申請詳細画面に承認ステップの進捗表示を追加する。差し戻し時のコメント入力フォームを追加する。再申請ボタンを追加する。申請作成時に承認テンプレートを選択できるようにする。テンプレートが存在しない組織では申請作成を禁止しエラーメッセージを表示する
12. **監査ログ**: 各ステップの承認・差し戻し・再申請・最終却下をそれぞれ audit_logs に記録する。トランザクション内で記録する
13. **シードデータ拡張**: 既存のシードスクリプトにデフォルトの承認テンプレート（2段階: admin → admin）を追加する

## スコープ外

- 金額による承認経路の自動分岐（次の request で対応）
- 代理承認
- 承認期限
- 承認テンプレートの CRUD 管理画面（シードデータで初期テンプレートを投入）
- メール/Slack通知

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `approval_steps` テーブルと `approval_templates` テーブルが schema.ts に定義されている
- [ ] `RequestStatus` に `"revision"` が含まれる
- [ ] 状態遷移テスト: `pending → revision` が許可される
- [ ] 状態遷移テスト: `revision → pending` が許可される
- [ ] 状態遷移テスト: `revision → approved` が拒否される
- [ ] 全ステップ承認後に申請が `approved` になることをテストで確認する
- [ ] 差し戻し後の再申請で、差し戻しステップ以降のみリセットされることをテストで確認する
- [ ] 各操作（ステップ承認、差し戻し、再申請、最終却下）で audit_logs にレコードが記録される
- [ ] 申請作成時に `approval_steps` がテンプレートに基づいて生成されることをテストで確認する
- [ ] `rejectRequest` usecase が `targetStatus: "rejected"` で最終却下、`targetStatus: "revision"` で差し戻しを処理する（1 つの usecase で両操作をカバーする）
- [ ] 承認・差し戻し・再申請の各操作が `db.transaction()` 内で実行される
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **承認ステップを独立テーブルで管理を採用、requests テーブルへのカラム追加を却下** — requests テーブルに `currentStep`, `totalSteps` 等を追加する方式だと、ステップごとの承認者・コメント・タイムスタンプが記録できない。正規化された独立テーブルの方が拡張性が高い
2. **承認テンプレートを jsonb steps カラムで管理を採用、テンプレートステップ用の別テーブルを却下** — テンプレートのステップ定義は読み取り専用で結合クエリの必要がない。jsonb カラムでシンプルに保持する
3. **差し戻し時の部分リセットを採用、全ステップリセットを却下** — 差し戻されたステップ以降のみリセットし、差し戻し前の完了ステップは維持する。全リセット方式は先のステップの承認者に再承認の負担をかける
4. **承認者の判定: approverRole ベースを採用、特定ユーザー指名を却下** — 初期実装では admin ロールのみが承認可能。将来的にロール拡張（manager, finance 等）で承認経路を制御する設計。特定ユーザー指名は組織変更時のメンテナンスコストが高い
5. **revision 状態の追加を採用、rejected からの再申請を却下** — rejected は終端状態として確定する。差し戻し（revision）と最終却下（rejected）を分離することで、ワークフローの意味が明確になる
