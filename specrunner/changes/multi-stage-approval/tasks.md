# Tasks: 複数段階承認と差し戻し・再申請

## T-01: ドメインモデルの追加と RequestStatus の拡張

- [ ] `src/domain/models/approvalStep.ts` を新規作成する。`ApprovalStepStatus = "pending" | "approved" | "rejected"` 型と `ApprovalStep` 型（id: string, requestId: string, stepOrder: number, approverRole: string, status: ApprovalStepStatus, approvedBy: string | null, approvedAt: Date | null, comment: string | null, organizationId: string）を export する
- [ ] `src/domain/models/approvalTemplate.ts` を新規作成する。`ApprovalTemplateStep = { stepOrder: number; approverRole: string }` 型と `ApprovalTemplate` 型（id: string, name: string, organizationId: string, steps: ApprovalTemplateStep[], createdAt: Date）を export する
- [ ] `src/domain/models/request.ts` の `RequestStatus` に `"revision"` を追加する: `"draft" | "pending" | "approved" | "rejected" | "revision"`
- [ ] `src/domain/models/index.ts` に `ApprovalStep`, `ApprovalStepStatus`, `ApprovalTemplate`, `ApprovalTemplateStep` の re-export を追加する

**Acceptance Criteria**:
- `ApprovalStep` 型と `ApprovalStepStatus` 型が `src/domain/models/approvalStep.ts` から export されている
- `ApprovalTemplate` 型と `ApprovalTemplateStep` 型が `src/domain/models/approvalTemplate.ts` から export されている
- `RequestStatus` が 5 状態（`"draft" | "pending" | "approved" | "rejected" | "revision"`）を含む
- `src/domain/models/` 配下に ORM (`drizzle`) や `@/infrastructure` の import がない
- `typecheck` が green

## T-02: 状態遷移ルールの拡張

- [ ] `src/domain/services/requestTransition.ts` の `VALID_TRANSITIONS` マップに `revision` の遷移を追加する: `pending: ["approved", "rejected", "revision"]`, `revision: ["pending"]`
- [ ] `draft`, `approved`, `rejected` の遷移ルールは変更しない

**Acceptance Criteria**:
- `validateTransition("pending", "revision")` が `{ ok: true }` を返す
- `validateTransition("revision", "pending")` が `{ ok: true }` を返す
- `validateTransition("revision", "approved")` が `{ ok: false, reason: ... }` を返す
- `validateTransition("revision", "rejected")` が `{ ok: false, reason: ... }` を返す
- `validateTransition("draft", "pending")` が従来通り `{ ok: true }` を返す（後方互換）
- `src/domain/services/requestTransition.ts` に `@/infrastructure` の import がない

## T-03: ドメインサービスの追加 — approvalStepService

- [ ] `src/domain/services/approvalStepService.ts` を新規作成する
- [ ] `getCurrentStep(steps: ApprovalStep[]): ApprovalStep | null` を実装する — `status === "pending"` で `stepOrder` が最小のステップを返す。該当なしは `null`
- [ ] `isAllApproved(steps: ApprovalStep[]): boolean` を実装する — 全ステップが `status === "approved"` か（空配列は `true`）
- [ ] `getStepsToReset(steps: ApprovalStep[], rejectedStepOrder: number): ApprovalStep[]` を実装する — `stepOrder >= rejectedStepOrder` のステップを返す
- [ ] `canApprove(step: ApprovalStep, actorRole: string): boolean` を実装する — `step.approverRole === actorRole` を返す
- [ ] `src/domain/services/index.ts` に `approvalStepService` の各関数を re-export する

**Acceptance Criteria**:
- 4 つの関数が `src/domain/services/approvalStepService.ts` から export されている
- 全関数が純粋関数（副作用なし、async なし）
- `src/domain/services/approvalStepService.ts` に `@/infrastructure` の import がない
- `typecheck` が green

## T-04: スキーマ定義の拡張

- [ ] `src/infrastructure/schema.ts` に `approvalStepStatusEnum = pgEnum("approval_step_status", ["pending", "approved", "rejected"])` を追加する
- [ ] `src/infrastructure/schema.ts` の `requestStatusEnum` に `"revision"` を追加する: `pgEnum("request_status", ["draft", "pending", "approved", "rejected", "revision"])`
- [ ] `src/infrastructure/schema.ts` に `approvalSteps` テーブルを追加する。カラム: `id` (uuid PK defaultRandom), `requestId` (uuid FK → requests, notNull), `stepOrder` (integer, notNull), `approverRole` (text, notNull), `status` (approvalStepStatusEnum, notNull, default "pending"), `approvedBy` (uuid FK → users, nullable), `approvedAt` (timestamp, nullable), `comment` (text, nullable), `organizationId` (uuid FK → organizations, notNull)
- [ ] `src/infrastructure/schema.ts` に `approvalTemplates` テーブルを追加する。カラム: `id` (uuid PK defaultRandom), `name` (text, notNull), `organizationId` (uuid FK → organizations, notNull), `steps` (jsonb, notNull), `createdAt` (timestamp, defaultNow, notNull)
- [ ] `approvalSteps` と `approvalTemplates` の relations を追加する。`approvalSteps` は `requests`, `users`（approvedBy）, `organizations` への relation を持つ。`approvalTemplates` は `organizations` への relation を持つ
- [ ] 既存の `requestsRelations` に `approvalSteps` への `many` relation を追加する
- [ ] 既存の `organizationsRelations` に `approvalSteps` と `approvalTemplates` への `many` relation を追加する

**Acceptance Criteria**:
- `approvalSteps` テーブルが schema.ts に定義されている
- `approvalTemplates` テーブルが schema.ts に定義されている
- `requestStatusEnum` に `"revision"` が含まれている
- `approvalStepStatusEnum` が定義されている
- relations が正しく定義されている
- `typecheck` が green

## T-05: リポジトリの追加

- [ ] `src/infrastructure/repositories/approvalStepRepository.ts` を新規作成する
- [ ] `createMany(steps: Array<{requestId, stepOrder, approverRole, organizationId}>, tx?)` を実装する — `approvalSteps` テーブルに一括 insert
- [ ] `findByRequestId(requestId: string, organizationId: string)` を実装する — `requestId` と `organizationId` で絞り込み、`stepOrder` 昇順で取得。mapRow 関数で `ApprovalStep` 型に変換
- [ ] `updateStatus(stepId: string, data: {status, approvedBy?, approvedAt?, comment?}, tx?)` を実装する — ステップのステータスと承認者情報を更新
- [ ] `resetSteps(requestId: string, fromStepOrder: number, tx?)` を実装する — `stepOrder >= fromStepOrder` のステップの `status` を `"pending"` に、`approvedBy`, `approvedAt`, `comment` を null にリセット
- [ ] `src/infrastructure/repositories/approvalTemplateRepository.ts` を新規作成する
- [ ] `findByOrganization(organizationId: string)` を実装する — 組織のテンプレート一覧を取得
- [ ] `findById(id: string, organizationId: string)` を実装する — テンプレートを ID + organizationId で取得
- [ ] `src/infrastructure/repositories/index.ts` に `approvalStepRepository` と `approvalTemplateRepository` の re-export を追加する

**Acceptance Criteria**:
- `approvalStepRepository` の 4 関数（`createMany`, `findByRequestId`, `updateStatus`, `resetSteps`）が export されている
- `approvalTemplateRepository` の 2 関数（`findByOrganization`, `findById`）が export されている
- 全関数にテナント分離（organizationId 条件）が適用されている
- `tx` 引数省略時は module-level の `db` でクエリが実行される
- `typecheck` が green

## T-06: approveRequest usecase の拡張

- [ ] `src/application/usecases/approveRequest.ts` に `approvalStepRepository` の import を追加する
- [ ] `src/application/usecases/approveRequest.ts` に `getCurrentStep`, `isAllApproved`, `canApprove` の import を追加する（`@/domain/services/approvalStepService` から）
- [ ] `approveRequest` 関数内のトランザクション内ロジックを拡張する:
  1. `approvalStepRepository.findByRequestId` で申請の全ステップを取得する
  2. ステップが 0 件の場合: 従来通り申請を直接 `approved` に遷移する（後方互換）
  3. ステップが 1 件以上の場合:
     a. `getCurrentStep` で現在のアクティブステップを取得する（null なら全ステップ完了済みでエラー）
     b. `canApprove` でアクターの role チェック。不一致なら `{ ok: false, reason: "..." }` を返す
     c. `approvalStepRepository.updateStatus` で当該ステップを `approved` に更新する
     d. `isAllApproved` で残りステップを再チェック。全完了なら申請を `approved` に遷移する
     e. 残りステップがある場合は申請を `pending` のまま維持する
  4. `audit_logs` に `"approval_step.approve"` を記録する（metadata にステップ情報: stepId, stepOrder, approverRole を含む）
  5. 全ステップ完了時は追加で `"request.approve"` も記録する
- [ ] `approveRequest` の引数に `actorRole: string` を追加する（承認者の role 判定に必要）

**Acceptance Criteria**:
- ステップ 0 件の申請は従来通り直接 `approved` に遷移する
- ステップ 1 件以上の申請で、ステップ承認後に次ステップがある場合は申請が `pending` のまま維持される
- 全ステップ承認後に申請が `approved` に遷移する
- 承認者の role がステップの `approverRole` と一致しない場合にエラーが返される
- `audit_logs` に `"approval_step.approve"` が記録される
- 全操作が `db.transaction()` 内で実行される
- 依存方向 `usecases → domain / infrastructure` を遵守
- `typecheck` が green

## T-07: rejectRequest usecase の拡張（差し戻し対応）

- [ ] `src/application/usecases/rejectRequest.ts` の `rejectRequest` 関数の引数に `targetStatus?: "rejected" | "revision"` (デフォルト: `"rejected"`) と `comment?: string` を追加する
- [ ] `src/application/usecases/rejectRequest.ts` に `approvalStepRepository` の import を追加する
- [ ] `src/application/usecases/rejectRequest.ts` に `getCurrentStep` の import を追加する
- [ ] `targetStatus === "revision"` の場合のロジックを追加する:
  1. `validateTransition(existing.status, "revision")` で遷移を検証する
  2. `approvalStepRepository.findByRequestId` で全ステップを取得する
  3. `getCurrentStep` で現在のアクティブステップを取得する
  4. 当該ステップの `status` を `"rejected"` に、`comment` を記録する
  5. 申請の status を `"revision"` に更新する
  6. `audit_logs` に `"approval_step.reject"` を記録する（metadata にステップ情報と comment を含む）
- [ ] `targetStatus === "rejected"`（デフォルト）の場合は従来通りの動作を維持する
- [ ] 全操作を `db.transaction()` 内で実行する

**Acceptance Criteria**:
- `targetStatus` 未指定時は従来通り `rejected` に遷移する（後方互換）
- `targetStatus === "revision"` 時に申請が `revision` に遷移する
- 差し戻し時にアクティブステップの `status` が `"rejected"` になり `comment` が記録される
- `audit_logs` に差し戻し操作が記録される
- 全操作が `db.transaction()` 内で実行される
- `typecheck` が green

## T-08: resubmitRequest usecase の新設

- [ ] `src/application/usecases/resubmitRequest.ts` を新規作成する
- [ ] `ResubmitRequestResult = { ok: true; request: Request } | { ok: false; reason: string }` 型を定義する
- [ ] `resubmitRequest` 関数を実装する。引数: `{ requestId, organizationId, actorId }`
- [ ] フロー:
  1. `requestRepository.findById` で申請を取得する
  2. `validateTransition(existing.status, "pending")` で遷移を検証する（`revision → pending` が許可される）
  3. `approvalStepRepository.findByRequestId` で全ステップを取得する
  4. `status === "rejected"` のステップを特定する
  5. `getStepsToReset` で差し戻しステップ以降のステップを取得する
  6. `approvalStepRepository.resetSteps` で該当ステップをリセットする
  7. `requestRepository.updateStatus` で申請を `pending` に遷移する
  8. `audit_logs` に `"request.resubmit"` を記録する（metadata にリセットされたステップ情報を含む）
- [ ] 全操作を `db.transaction()` 内で実行する
- [ ] `src/application/usecases/index.ts` に `resubmitRequest` の re-export を追加する

**Acceptance Criteria**:
- `revision` 状態の申請に対して `resubmitRequest` を実行すると `pending` に遷移する
- 差し戻しステップ以降のステップのみリセットされる（`status` → `"pending"`, `approvedBy` / `approvedAt` / `comment` → null）
- 差し戻し前に完了したステップは `approved` のまま維持される
- `audit_logs` に `"request.resubmit"` が記録される
- 全操作が `db.transaction()` 内で実行される
- 依存方向 `usecases → domain / infrastructure` を遵守
- `typecheck` が green

## T-09: createRequest usecase の拡張（テンプレート対応）

- [ ] `src/application/usecases/createRequest.ts` の `createRequest` 関数の引数に `templateId?: string` を追加する
- [ ] `approvalTemplateRepository` と `approvalStepRepository` の import を追加する
- [ ] `templateId` が指定されている場合:
  1. `approvalTemplateRepository.findById` でテンプレートを取得する（見つからない場合はエラー）
  2. テンプレートの `steps` から `approval_steps` レコードを生成する（`approvalStepRepository.createMany`）
- [ ] `templateId` が未指定の場合は従来通りステップなしで申請を作成する
- [ ] 申請作成と承認ステップ作成を `db.transaction()` 内で実行する（テンプレート指定時）

**Acceptance Criteria**:
- `templateId` 指定時にテンプレートの steps に基づく `approval_steps` が作成される
- `templateId` 未指定時は従来通り（後方互換）
- 存在しないテンプレート ID が指定された場合にエラーが返される
- テンプレート指定時の操作が `db.transaction()` 内で実行される
- `typecheck` が green

## T-10: Server Actions の拡張

- [ ] `src/app/actions/requests.ts` の `createRequestAction` に `templateId` フィールド処理を追加する。`formData.get("templateId")` で取得し、空文字列の場合は `undefined` として扱う
- [ ] `src/app/actions/requests.ts` の `rejectRequestAction` の引数に差し戻しモードを追加する。`formData.get("targetStatus")` で `"rejected" | "revision"` を取得し、`formData.get("comment")` でコメントを取得する。`rejectRequest` usecase に渡す
- [ ] `src/app/actions/requests.ts` に `resubmitRequestAction` を新設する。認証チェック → `resubmitRequest` usecase 呼び出し → `revalidatePath` の流れ。申請者本人のみ実行可能とする（`session.user.id === request.creatorId` の検証は usecase 側ではなく action 側で行う。ただし初期実装では認証済みユーザーなら実行可能とする）
- [ ] `src/app/actions/requests.ts` に `listApprovalTemplatesAction` を新設する。認証チェック → `session.user.organizationId` を取得（セッションから取得する。URL クエリや request パラメータからは取得しない）→ `approvalTemplateRepository.findByOrganization(session.user.organizationId)` 呼び出し（usecase を経由しない読み取り専用操作）
- [ ] `src/app/actions/requests.ts` の `approveRequestAction` に `actorRole` を渡す。`session.user.role` を `approveRequest` usecase の `actorRole` 引数に渡す
- [ ] `src/application/usecases/index.ts` に `resubmitRequest` の re-export が追加されていることを確認する（T-08 で実施済みの想定）

**Acceptance Criteria**:
- `createRequestAction` が `templateId` を `createRequest` usecase に渡す
- `rejectRequestAction` が `targetStatus` と `comment` を `rejectRequest` usecase に渡す
- `resubmitRequestAction` が認証チェック後に `resubmitRequest` usecase を呼び出す
- `listApprovalTemplatesAction` が認証チェック後にテンプレート一覧を返す
- `approveRequestAction` が `session.user.role` を `actorRole` として渡す
- 全 mutation 系 action で `revalidatePath` が呼ばれる
- `typecheck` が green

## T-11: getApprovalSteps usecase の新設（承認ステップ取得）

- [ ] `src/application/usecases/getApprovalSteps.ts` を新規作成する。承認ステップ取得専用の usecase として `getRequest` は変更しない
- [ ] `getApprovalSteps` 関数を実装する。引数: `{ requestId: string; organizationId: string }`。戻り値: `ApprovalStep[]`
- [ ] `approvalStepRepository.findByRequestId(requestId, organizationId)` を呼び出して取得する
- [ ] `src/application/usecases/index.ts` に `getApprovalSteps` の re-export を追加する
- [ ] `src/app/actions/requests.ts` の `getApprovalStepsAction` は `getApprovalSteps` usecase を呼び出す。`session` から `organizationId` を取得し usecase に渡す（URL クエリや request パラメータから `organizationId` を取得しない）

**Acceptance Criteria**:
- `src/application/usecases/getApprovalSteps.ts` が存在し `getApprovalSteps` 関数を export している
- 申請詳細画面から `getApprovalStepsAction` 経由で承認ステップのデータを取得できる
- テナント分離（organizationId 条件）がセッション由来の値で適用されている
- `getRequest` usecase の戻り値型は変更されない（後方互換を維持）
- `typecheck` が green

## T-12: UI 拡張 — 申請詳細画面

- [ ] `src/app/(dashboard)/requests/[id]/page.tsx` の `statusLabel` と `statusClass` に `revision` のエントリを追加する: `revision: "差し戻し"`, `revision: "bg-orange-100 text-orange-700"`
- [ ] 承認ステップの進捗表示セクションを追加する。各ステップについて: ステップ番号、approverRole、ステータス（承認済み / 差し戻し / 審査中）、承認者名（承認済みの場合）、承認日時、コメント（差し戻しの場合）を表示する
- [ ] `pending` 状態の申請に対する差し戻しボタンとコメント入力フォームを追加する。既存の「却下する」ボタンを維持し、「差し戻す」ボタンを追加する。差し戻しボタンはコメント入力テキストエリアを表示し、フォーム送信時に `rejectRequestAction` に `targetStatus: "revision"` と `comment` を渡す
- [ ] `revision` 状態の申請に対する再申請ボタンを追加する。`resubmitRequestAction` を呼び出す

**Acceptance Criteria**:
- `revision` 状態が「差し戻し」ラベルとオレンジ色のバッジで表示される
- 承認ステップの進捗が一覧表示される
- 差し戻しボタンとコメント入力フォームが `pending` 状態の申請に表示される
- 再申請ボタンが `revision` 状態の申請に表示される
- `bun run build` が成功する

## T-13: UI 拡張 — 申請作成画面・申請一覧画面

- [ ] `src/app/(dashboard)/requests/new/page.tsx` に承認テンプレート選択用のセレクトボックスを追加する。`listApprovalTemplatesAction` でテンプレート一覧を取得し、セレクトボックスの選択肢として表示する。選択された `templateId` を hidden input または formData で送信する
- [ ] `src/app/(dashboard)/requests/page.tsx` の `statusLabel` と `statusClass` に `revision` のエントリを追加する

**Acceptance Criteria**:
- 申請作成画面にテンプレート選択セレクトボックスが表示される
- テンプレート未選択時は `templateId` が送信されない（従来動作）
- 申請一覧画面で `revision` 状態が正しく表示される
- `bun run build` が成功する

## T-14: シードデータの拡張

- [ ] `src/infrastructure/seed.ts` に `approvalSteps` と `approvalTemplates` テーブルの truncate 文を追加する（FK 制約順: `approvalSteps` → `approvalTemplates` の順で削除）
- [ ] 初期テンプレートを 2 件作成する:
  1. 「上長承認のみ」— steps: `[{ stepOrder: 1, approverRole: "admin" }]`
  2. 「上長承認 → 経理承認」— steps: `[{ stepOrder: 1, approverRole: "admin" }, { stepOrder: 2, approverRole: "admin" }]`
- [ ] 既存の `pending` 申請（「出張申請 - 東京オフィス訪問」）に「上長承認のみ」テンプレートに基づく承認ステップを追加する
- [ ] シードデータ挿入時の import に `approvalSteps` と `approvalTemplates` を追加する

**Acceptance Criteria**:
- `bun run seed` でエラーなく完了する（`seed` スクリプトが package.json に定義されている前提）
- `approval_templates` に 2 件のテンプレートが作成される
- `approval_steps` に `pending` 申請のステップが作成される
- `typecheck` が green

## T-15: 既存テストの更新と新規テストの追加

- [ ] `src/__tests__/domain/models.test.ts` の `statuses.length` を `4` から `5` に更新し、`"revision"` を statuses 配列と expect に追加する
- [ ] `src/__tests__/domain/requestTransition.test.ts` に以下のテストケースを追加する:
  - `pending → revision` が許可される
  - `revision → pending` が許可される
  - `revision → approved` が拒否される
  - `revision → rejected` が拒否される
- [ ] `src/__tests__/domain/approvalStepService.test.ts` を新規作成する:
  - `getCurrentStep` が `status === "pending"` で `stepOrder` 最小のステップを返す
  - `getCurrentStep` が全ステップ `approved` の場合に `null` を返す
  - `isAllApproved` が全ステップ `approved` の場合に `true` を返す
  - `isAllApproved` が `pending` ステップを含む場合に `false` を返す
  - `isAllApproved` が空配列の場合に `true` を返す
  - `getStepsToReset` が指定 stepOrder 以降のステップのみを返す
  - `canApprove` が role 一致時に `true` を返す
  - `canApprove` が role 不一致時に `false` を返す
- [ ] `src/__tests__/usecases/requestWorkflow.test.ts` に以下のテストケースを追加する:
  - `resubmitRequest` usecase ファイルが存在し `validateTransition` を呼び出していることを確認
  - `resubmitRequest` usecase が `db.transaction` を使用していることを確認
  - `resubmitRequest` usecase が `auditLogRepository` を使用していることを確認
  - `approveRequest` usecase が `approvalStepRepository` を使用していることを確認
- [ ] `src/__tests__/static/projectStructure.test.ts` の domain model integrity テスト（TC-031）のファイルリストに `domain/models/approvalStep.ts` と `domain/models/approvalTemplate.ts` を追加する
- [ ] `src/__tests__/static/projectStructure.test.ts` の dependency direction テスト（TC-034）のファイルリストに `domain/models/approvalStep.ts`, `domain/models/approvalTemplate.ts`, `domain/services/approvalStepService.ts` を追加する

**Acceptance Criteria**:
- `bun test` が全件 green
- 状態遷移テスト: `pending → revision` が許可される
- 状態遷移テスト: `revision → pending` が許可される
- 状態遷移テスト: `revision → approved` が拒否される
- 全ステップ承認後に申請が `approved` になることのテスト（ドメインサービスレベルで `isAllApproved` を検証）
- 差し戻し後の再申請で差し戻しステップ以降のみリセットされることのテスト（ドメインサービスレベルで `getStepsToReset` を検証）
- 新規ドメインモデルファイルに ORM import がないことのテスト
- 新規ドメインサービスファイルに infrastructure import がないことのテスト

## T-16: ビルド検証と最終確認

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `typecheck` が green
- [ ] `approval_steps` テーブルと `approval_templates` テーブルが `schema.ts` に定義されていることを確認する
- [ ] `RequestStatus` に `"revision"` が含まれていることを確認する
- [ ] 依存方向 `actions → usecases → domain / infrastructure` が遵守されていることを確認する: `src/domain/` 配下に `@/infrastructure` の import がないことを grep で確認する
- [ ] 各操作（ステップ承認、差し戻し、再申請）で `db.transaction()` が使用されていることを確認する
- [ ] 各操作で `audit_logs` にレコードが記録されることを確認する（ソースコード内に `auditLogRepository.create` の呼び出しが存在する）
