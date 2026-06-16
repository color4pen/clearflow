# Design: 複数段階承認と差し戻し・再申請

## Context

Clearflow の承認フローは現在、単一承認者による一段階の承認のみをサポートしている。実際の業務では「上長承認 → 経理承認」のような複数段階の承認が必要になる。また、承認者が差し戻した申請を申請者が修正して再提出できるフローも不可欠である。

確認済みの現状コード:

- `src/domain/models/request.ts:1` — `RequestStatus` は `"draft" | "pending" | "approved" | "rejected"` の 4 状態
- `src/domain/services/requestTransition.ts:3-6` — 遷移マップは `draft → pending`, `pending → approved | rejected` のみ。`approved` と `rejected` は終端状態
- `src/infrastructure/schema.ts:15-20` — `requestStatusEnum` は 4 値
- `src/infrastructure/schema.ts:45-58` — `requests` テーブルに承認段階の情報なし。承認者情報は `audit_logs` のみに記録
- `src/application/usecases/approveRequest.ts` — `validateTransition(existing.status, "approved")` で直接 `approved` に遷移。承認ステップの概念なし
- `src/application/usecases/rejectRequest.ts` — `validateTransition(existing.status, "rejected")` で直接 `rejected`（終端状態）に遷移。差し戻し（修正可能な拒否）の概念なし
- `src/application/usecases/index.ts` — 6 usecase: `createRequest`, `submitRequest`, `approveRequest`, `rejectRequest`, `getRequest`, `listRequests`
- `src/domain/models/user.ts:1` — `Role` は `"admin" | "member"` の 2 値
- `src/infrastructure/schema.ts:14` — `roleEnum` は `admin | member`
- `src/app/(dashboard)/requests/[id]/page.tsx` — 承認・却下ボタンは `pending` 時のみ表示。ステップ進捗表示なし。差し戻しコメント入力なし
- `src/app/(dashboard)/requests/new/page.tsx` — テンプレート選択なし。タイトルと説明のみ
- `src/__tests__/domain/models.test.ts:9-21` — `RequestStatus` のテストが 4 状態を前提としている（`statuses.length === 4`）
- `src/__tests__/domain/requestTransition.test.ts` — 5 テストケースが現在の遷移ルールを前提

本変更で承認ワークフローの核心機能（複数段階承認、差し戻し、再申請）を導入する。

## Goals / Non-Goals

**Goals**:

- `approval_steps` テーブルを新設し、申請ごとに順序付きの承認ステップを管理する
- `approval_templates` テーブルを新設し、組織ごとに再利用可能な承認フローテンプレートを定義する
- `RequestStatus` に `"revision"` 状態を追加し、差し戻し後の修正中状態を表現する
- 承認ロジックを拡張し、全ステップ完了まで `pending` を維持、全ステップ承認で `approved` に遷移させる
- 差し戻しロジックを実装し、任意のステップから申請を `revision` 状態に戻せるようにする
- 再申請ロジック（`resubmitRequest`）を新設し、差し戻し前に完了したステップを維持しつつ差し戻しステップ以降をリセットする
- 各操作（ステップ承認、差し戻し、再申請）を `db.transaction()` 内で実行し、`audit_logs` に記録する
- 申請詳細画面に承認ステップの進捗表示、差し戻しコメント入力、再申請ボタンを追加する
- 申請作成時に承認テンプレートを選択可能にする

**Non-Goals**:

- 金額による承認経路の自動分岐
- 代理承認
- 承認期限
- 承認テンプレートの CRUD 管理画面（シードデータで初期テンプレートを投入）
- メール/Slack 通知
- `roleEnum` の拡張（初期実装では `admin` ロールのみが承認可能）

## Decisions

### D1: 承認ステップを独立テーブル `approval_steps` で管理

`approval_steps` テーブルを `src/infrastructure/schema.ts` に追加する。

**カラム**: `id` (uuid PK), `requestId` (uuid FK → requests), `stepOrder` (integer), `approverRole` (text), `status` (approvalStepStatusEnum: `"pending" | "approved" | "rejected"`), `approvedBy` (uuid FK → users, nullable), `approvedAt` (timestamp, nullable), `comment` (text, nullable), `organizationId` (uuid FK → organizations)

**enum**: `approvalStepStatusEnum = pgEnum("approval_step_status", ["pending", "approved", "rejected"])` を新設する。`requestStatusEnum` に `"revision"` を追加する。

1 つの申請に対して `stepOrder` で順序付けされた複数のステップを持つ。`stepOrder` は 1 始まりの整数で、小さいほど先に承認される。

**Rationale**: `requests` テーブルに `currentStep`, `totalSteps` 等を追加する方式だと、ステップごとの承認者・コメント・タイムスタンプが記録できない。正規化された独立テーブルの方が拡張性が高く、監査証跡の粒度が細かい。

**Alternatives considered**:
- requests テーブルへのカラム追加 — ステップごとの詳細情報（誰が承認したか、コメント等）が記録できない。却下
- JSON カラムで承認ステップを保持 — クエリが複雑化し、DB レベルの整合性制約が使えない。却下

### D2: 承認テンプレートを `approval_templates` テーブルで管理、steps は jsonb

`approval_templates` テーブルを `src/infrastructure/schema.ts` に追加する。

**カラム**: `id` (uuid PK), `name` (text), `organizationId` (uuid FK → organizations), `steps` (jsonb — `[{ stepOrder: number, approverRole: string }]`), `createdAt` (timestamp)

申請作成時にテンプレートの `steps` を読み取り、対応する `approval_steps` レコードを生成する。テンプレート自体は読み取り専用の定義データであり、申請作成後にテンプレートを変更しても既存の申請には影響しない（スナップショット方式）。

**Rationale**: テンプレートのステップ定義は読み取り専用で結合クエリの必要がない。jsonb カラムでシンプルに保持する。テンプレートステップ用の正規化テーブルを別に作る方式は、この段階では複雑さに見合うメリットがない。

**Alternatives considered**:
- テンプレートステップ用の別テーブル（`approval_template_steps`）— 結合クエリが必要になり、テンプレートの読み取り専用用途に対して過剰。却下

### D3: 状態遷移モデルの拡張 — `revision` 状態の追加

`RequestStatus` を `"draft" | "pending" | "approved" | "rejected" | "revision"` の 5 状態に拡張する。

**遷移ルール**:
```
draft    → pending
pending  → approved | rejected | revision
revision → pending
```

`approved` と `rejected` は終端状態（遷移先なし）。

**`pending → revision`**: 差し戻し操作。承認者が差し戻し理由のコメント付きで実行する。
**`revision → pending`**: 再申請操作。申請者が修正後に再提出する。
**`pending → approved`**: 全承認ステップ完了時のみ。usecase 内で判定する（遷移マップ上は許可するが、usecase が全ステップ完了を検証する）。

`requestTransition.ts` の `VALID_TRANSITIONS` マップを拡張する。

**Rationale**: `rejected` からの再申請を許可する設計も可能だが、`rejected` は最終却下として確定させ、差し戻し（`revision`）と最終却下（`rejected`）を分離することでワークフローの意味が明確になる。

**Alternatives considered**:
- `rejected` からの再申請 — `rejected` の意味が曖昧になる（最終却下なのか差し戻しなのか）。却下
- `revision` なしで `pending` のままコメントだけ記録 — 申請者が修正中であることを表現できない。却下

### D4: 承認ロジック — ステップ進行と全ステップ完了判定

`approveRequest` usecase を拡張する。

**フロー**:
1. 対象申請が `pending` 状態であることを確認する
2. 現在アクティブなステップ（`stepOrder` が最小で `status === "pending"` のステップ）を取得する
3. アクターの role がステップの `approverRole` と一致することを確認する
4. 当該ステップの `status` を `"approved"` に更新し、`approvedBy`, `approvedAt` を記録する
5. 次のステップが存在するか確認する:
   - 存在する場合: 申請は `pending` のまま（次ステップへ進行）
   - 存在しない場合（全ステップ完了）: 申請を `approved` に遷移する
6. `audit_logs` に `"approval_step.approve"` を記録する（metadata にステップ情報を含める）
7. 全ステップ完了時は追加で `"request.approve"` も記録する

全操作を `db.transaction()` 内で実行する。

**「現在アクティブなステップ」の定義**: `approval_steps` のうち、`requestId` が一致し、`status === "pending"` で、`stepOrder` が最小のもの。これにより承認順序が保証される。

**Rationale**: 承認順序を `stepOrder` の昇順で強制する。ステップの飛ばしや並列承認は初期実装では許可しない。

### D5: 差し戻しロジック — `revision` 状態への遷移

`rejectRequest` usecase を拡張して差し戻し（`pending → revision`）と最終却下（`pending → rejected`）を区別する。

既存の `rejectRequest` usecase は `pending → rejected`（最終却下）の動作を維持する。

新たに差し戻し操作を `rejectRequest` 内で `comment` 付きの場合に `revision` 遷移として扱うのではなく、明確に分離するため、usecase 内で `targetStatus` 引数を受け取る方式にする。

**方式**: `rejectRequest` の引数に `targetStatus: "rejected" | "revision"` と `comment?: string` を追加する。

- `targetStatus === "rejected"`: 従来通り申請を `rejected` に遷移する（終端状態）
- `targetStatus === "revision"`: 申請を `revision` に遷移し、現在のアクティブステップの `status` を `"rejected"` に設定、`comment` を記録する

**Rationale**: 差し戻しと最終却下は呼び出し元（Server Action）で区別する。usecase を 2 つに分割する方式（`rejectRequest` と `remandRequest`）も検討したが、共通処理（存在確認、遷移検証、トランザクション、監査ログ）が重複するため、引数で分岐する方式を採用する。

**Alternatives considered**:
- 差し戻し専用の `remandRequest` usecase — 共通処理の重複が大きい。却下
- `comment` の有無で自動判別 — コメントなしの差し戻しができなくなる。却下

### D6: 再申請ロジック — 部分リセット

`resubmitRequest` usecase を新設する。

**フロー**:
1. 対象申請が `revision` 状態であることを確認する（`validateTransition` で `revision → pending` を検証）
2. 差し戻されたステップ（`status === "rejected"` のステップ）を特定する
3. 差し戻されたステップ以降（`stepOrder` がそのステップ以上）の `approval_steps` の `status` を `"pending"` にリセットし、`approvedBy`, `approvedAt`, `comment` を null にする
4. 差し戻し前に完了したステップ（`stepOrder` が差し戻しステップより小さく `status === "approved"`）はリセットしない
5. 申請の status を `pending` に遷移する
6. `audit_logs` に `"request.resubmit"` を記録する（metadata に差し戻しステップ情報を含める）

全操作を `db.transaction()` 内で実行する。

**Rationale**: 全ステップリセット方式は先のステップの承認者に再承認の負担をかける。差し戻されたステップ以降のみリセットし、それ以前の完了ステップは維持する。

**Alternatives considered**:
- 全ステップリセット — 再承認コストが高く、ユーザー体験が悪い。却下

### D7: ドメインモデルの追加

`src/domain/models/` に以下の型を追加する:

**`approvalStep.ts`**:
- `ApprovalStepStatus = "pending" | "approved" | "rejected"`
- `ApprovalStep` 型 — id, requestId, stepOrder, approverRole, status, approvedBy (nullable), approvedAt (nullable), comment (nullable), organizationId

**`approvalTemplate.ts`**:
- `ApprovalTemplateStep = { stepOrder: number; approverRole: string }`
- `ApprovalTemplate` 型 — id, name, organizationId, steps (ApprovalTemplateStep[]), createdAt

`src/domain/models/index.ts` から re-export する。

### D8: ドメインサービスの追加

`src/domain/services/approvalStepService.ts` を新設する。以下の純粋関数を配置する:

- `getCurrentStep(steps: ApprovalStep[]): ApprovalStep | null` — `status === "pending"` で `stepOrder` 最小のステップを返す
- `isAllApproved(steps: ApprovalStep[]): boolean` — 全ステップが `approved` かを判定する
- `getStepsToReset(steps: ApprovalStep[], rejectedStepOrder: number): ApprovalStep[]` — 差し戻しステップ以降のステップを返す
- `canApprove(step: ApprovalStep, actorRole: string): boolean` — アクターの role がステップの `approverRole` と一致するかを判定する

これらは永続化を知らない純粋関数であり、domain 層の規約に従う。

`src/domain/services/index.ts` から re-export する。

### D9: リポジトリの追加

**`src/infrastructure/repositories/approvalStepRepository.ts`**:
- `createMany(steps, tx?)` — 承認ステップを一括作成（申請作成時）
- `findByRequestId(requestId, organizationId)` — 申請の全ステップを `stepOrder` 昇順で取得
- `updateStatus(stepId, status, approvedBy, approvedAt, comment, tx?)` — ステップのステータスを更新
- `resetSteps(requestId, fromStepOrder, tx?)` — 指定 stepOrder 以降のステップをリセット

**`src/infrastructure/repositories/approvalTemplateRepository.ts`**:
- `findByOrganization(organizationId)` — 組織のテンプレート一覧を取得
- `findById(id, organizationId)` — テンプレートを ID で取得

`src/infrastructure/repositories/index.ts` から re-export する。

### D10: 申請作成フローの拡張

`createRequest` usecase を拡張し、`templateId` 引数（任意）を追加する。

**フロー**:
1. `templateId` が指定されている場合、`approvalTemplateRepository.findById` でテンプレートを取得する
2. テンプレートの `steps` から `approval_steps` レコードを生成する（`status: "pending"`, `approvedBy: null`, `approvedAt: null`, `comment: null`）
3. `templateId` が未指定の場合、承認ステップなしで申請を作成する（後方互換性のため。ただし `submitRequest` 時にステップが 0 件の申請は従来通り単一承認フローとして動作する）

**テンプレート未指定時の動作**: 承認ステップが 0 件の申請は、`approveRequest` 実行時にステップチェックをスキップし、直接 `approved` に遷移する。これにより後方互換性を維持する。

### D11: UI 拡張

**申請詳細画面** (`src/app/(dashboard)/requests/[id]/page.tsx`):
- 承認ステップの進捗をステップ番号・approverRole・ステータスの一覧で表示する
- `pending` 状態の申請に対して、差し戻しボタンとコメント入力フォームを追加する（現在の「却下する」ボタンに加えて）
- `revision` 状態の申請に対して、再申請ボタンを表示する（申請者のみ）
- `revision` 状態のラベル（「差し戻し」）とスタイルクラスを追加する

**申請作成画面** (`src/app/(dashboard)/requests/new/page.tsx`):
- 承認テンプレート選択用のセレクトボックスを追加する
- 選択されたテンプレートの `templateId` を Server Action に送信する

**申請一覧画面** (`src/app/(dashboard)/requests/page.tsx`):
- `revision` 状態のラベルとスタイルクラスを追加する

**Server Actions** (`src/app/actions/requests.ts`):
- `createRequestAction` に `templateId` フィールドを追加する
- `rejectRequestAction` に `targetStatus` と `comment` フィールドを追加する（差し戻し対応）
- `resubmitRequestAction` を新設する
- `getApprovalStepsAction` を新設する（申請詳細画面でのステップ取得用）
- `listApprovalTemplatesAction` を新設する（申請作成画面でのテンプレート一覧取得用）

### D12: 既存テストの更新方針

**影響を受ける既存テスト**:
- `src/__tests__/domain/models.test.ts:9-21` — `RequestStatus` のテストが `statuses.length === 4` を前提。`5` に更新し、`"revision"` を追加する
- `src/__tests__/domain/requestTransition.test.ts` — 新しい遷移ルール（`pending → revision`, `revision → pending`, `revision → approved` 拒否）のテストを追加する

**新規テスト**:
- `src/__tests__/domain/approvalStepService.test.ts` — ドメインサービスの純粋関数テスト
- `src/__tests__/usecases/requestWorkflow.test.ts` に追加 — 新 usecase のソースコード静的解析テスト（既存パターンに準拠）

### D13: シードデータの拡張

`src/infrastructure/seed.ts` に以下を追加する:
- `approval_templates` テーブルのシードデータ（初期テンプレート: 「上長承認のみ」（1 ステップ）、「上長承認 → 経理承認」（2 ステップ））
- `approval_steps` テーブルのシードデータ（既存の `pending` 申請に承認ステップを追加）
- `approval_steps` テーブルの truncate 文を FK 制約順に追加

## Risks / Trade-offs

[Risk] `requestStatusEnum` への `"revision"` 追加は DB マイグレーション（ALTER TYPE ADD VALUE）を要する → Drizzle Kit の `drizzle-kit generate` でマイグレーション SQL を生成し、`drizzle-kit push` または手動適用で対応する。enum への値追加はトランザクション内では実行できない PostgreSQL の制約があるが、Drizzle Kit が適切にハンドルする。

[Risk] 後方互換性 — 承認ステップが 0 件の既存申請 → D10 で記載の通り、ステップ 0 件の場合は従来通りの単一承認フローとして動作する設計にする。既存の `approveRequest` テストは従来動作を維持する。

[Risk] `rejectRequest` usecase の引数拡張による呼び出し元への影響 → `targetStatus` にデフォルト値 `"rejected"` を設定し、既存の呼び出し元（`rejectRequestAction`）は変更なしで従来動作を維持する。

[Risk] UI の `Record<RequestStatus, string>` マッピングが網羅性チェックで `"revision"` の追加漏れを起こす可能性 → TypeScript の型チェックで `revision` キーが未定義の場合にコンパイルエラーになるため、漏れは検出される。

[Risk] `approval_steps` の `approverRole` が現在は `admin` のみ有効 → `roleEnum` の拡張はスコープ外だが、`approverRole` を text 型にすることで将来のロール追加に対応可能な設計にしている。初期テンプレートでは `admin` のみを使用する。

## Open Questions

なし
