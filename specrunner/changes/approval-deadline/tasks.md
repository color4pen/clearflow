# Tasks: approval-deadline

## T-01: ドメインモデルに expired 状態と deadline フィールドを追加

- [x] `src/domain/models/request.ts` — `RequestStatus` 型に `"expired"` を追加
- [x] `src/domain/models/approvalStep.ts` — `ApprovalStep` 型に `deadline: Date | null` フィールドを追加
- [x] `src/domain/models/approvalTemplate.ts` — `ApprovalTemplateStep` 型に `deadlineHours?: number` フィールドを追加

**Acceptance Criteria**:
- `RequestStatus` が `"draft" | "pending" | "approved" | "rejected" | "revision" | "expired"` である
- `ApprovalStep` に `deadline: Date | null` が存在する
- `ApprovalTemplateStep` に `deadlineHours?: number` が存在する
- `typecheck` が green

## T-02: DB スキーマに expired 状態と deadline カラムを追加

- [x] `src/infrastructure/schema.ts` — `requestStatusEnum` に `"expired"` を追加
- [x] `src/infrastructure/schema.ts` — `approvalSteps` テーブルに `deadline: timestamp("deadline")` カラムを追加（nullable）

**Acceptance Criteria**:
- `requestStatusEnum` が `["draft", "pending", "approved", "rejected", "revision", "expired"]` を含む
- `approvalSteps` テーブル定義に `deadline` カラムが存在する
- `typecheck` が green

## T-03: 状態遷移ルールに expired を追加

- [x] `src/domain/services/requestTransition.ts` — `VALID_TRANSITIONS` に `pending: [..., "expired"]` を追加
- [x] `expired` のエントリは追加しない（または空配列）で終端状態とする

**Acceptance Criteria**:
- `validateTransition("pending", "expired")` が `{ ok: true }` を返す
- `validateTransition("expired", "pending")` が `{ ok: false }` を返す
- `validateTransition("expired", "approved")` が `{ ok: false }` を返す
- `validateTransition("expired", "rejected")` が `{ ok: false }` を返す
- 既存の遷移ルールに影響がない

## T-04: 期限チェック用ドメインサービス関数を追加

- [x] `src/domain/services/approvalStepService.ts` — `isStepExpired(step: ApprovalStep, now?: Date): boolean` 関数を追加
  - `step.deadline` が null の場合は `false` を返す
  - `step.deadline` が `now`（デフォルト: `new Date()`）より過去の場合は `true` を返す

**Acceptance Criteria**:
- deadline が null のステップで `false` を返す
- deadline が未来のステップで `false` を返す
- deadline が過去のステップで `true` を返す

## T-05: approvalStepRepository に deadline 対応を追加

- [x] `src/infrastructure/repositories/approvalStepRepository.ts` — `mapRow` 関数に `deadline` マッピングを追加（`row.deadline ?? null`）
- [x] `createMany` の引数型に `deadline?: Date | null` を追加し、values に含める
- [x] `findOverdueRequestIds(organizationId?: undefined, tx?: Transaction): Promise<Array<{ requestId: string; organizationId: string }>>` を追加
  - `approval_steps` から `status = 'pending' AND deadline < NOW()` のレコードを取得し、対応する `requests` が `status = 'pending'` であるもののみ返す
  - 重複排除のため `requestId` で DISTINCT する

**Acceptance Criteria**:
- `mapRow` が `deadline` を正しくマッピングする
- `createMany` が `deadline` 付きでレコードを作成できる
- `findOverdueRequestIds` が期限切れの pending ステップを持つ pending 申請の ID リストを返す

## T-06: approveRequest に期限チェックを追加

- [x] `src/application/usecases/approveRequest.ts` — multi-step フローの pre-check（TX 外）で `isStepExpired(currentStep)` を呼び出し、`true` なら `{ ok: false, reason: "この承認ステップの期限が切れています" }` を返す
- [x] TX 内の re-check でも `isStepExpired(freshCurrentStep)` を再確認し、`true` なら throw する（TOCTOU 防止）

**Acceptance Criteria**:
- deadline が過去のステップへの承認が `{ ok: false, reason: "この承認ステップの期限が切れています" }` で拒否される
- deadline が未来 / null のステップへの承認は従来通り処理される
- TX 内でも期限チェックが行われる

## T-07: rejectRequest に期限チェックを追加

- [x] `src/application/usecases/rejectRequest.ts` — revision パス: TX 内で `currentStep` の `isStepExpired` を確認し、期限切れなら throw する
- [x] rejected パス: steps を取得して `getCurrentStep` で現在のステップを取り、`isStepExpired` を確認する。期限切れなら `{ ok: false, reason: "この承認ステップの期限が切れています" }` を返す
- [x] 両パスで TOCTOU 防止のため TX 内で再チェックする

**Acceptance Criteria**:
- deadline が過去のステップへの revision 却下が拒否される
- deadline が過去のステップへの rejected 却下が拒否される
- deadline が未来 / null のステップへの却下は従来通り処理される

## T-08: createRequest で deadline を算出して設定

- [x] `src/application/usecases/createRequest.ts` — `approvalStepRepository.createMany` の呼び出しで、テンプレートステップの `deadlineHours` が存在する場合に `deadline: new Date(now.getTime() + s.deadlineHours * 60 * 60 * 1000)` を算出して渡す
- [x] `deadlineHours` が未設定の場合は `deadline: null` を渡す
- [x] 全ステップで同じ基準時刻（`now`）を使用する

**Acceptance Criteria**:
- `deadlineHours` 付きテンプレートから作成した申請の `approval_steps.deadline` が `createdAt + deadlineHours` になる
- `deadlineHours` なしのテンプレートから作成した申請の `approval_steps.deadline` が `null` になる

## T-09: expireOverdueRequests usecase を新設

- [x] `src/application/usecases/expireOverdueRequests.ts` を新規作成
- [x] 環境変数 `SYSTEM_USER_ID` を取得し、未設定時はエラーを返す
- [x] `approvalStepRepository.findOverdueRequestIds()` で期限切れ対象を取得
- [x] 各申請を個別のトランザクションで処理:
  - `requestRepository.findById` で申請を取得（TX 内）
  - `validateTransition(existing.status, "expired")` で遷移可能か確認
  - `requestRepository.updateStatus` で `expired` に更新
  - `auditLogRepository.create` で `action: "request.expire"` を記録（`actorId: SYSTEM_USER_ID`）
- [x] 結果として `{ expired: number; failed: number; errors: Array<{ requestId: string; reason: string }> }` を返す
- [x] `src/application/usecases/index.ts` にエクスポートを追加

**Acceptance Criteria**:
- 期限切れの pending 申請が `expired` に遷移する
- audit_logs に `request.expire` アクションが `SYSTEM_USER_ID` の actorId で記録される
- `SYSTEM_USER_ID` 未設定時にエラーが返される
- 1 申請の失敗が他の申請の処理をブロックしない
- 結果に expired / failed 件数が含まれる

## T-10: cron Route Handler を追加

- [x] `src/app/api/cron/expire-requests/route.ts` を新規作成
- [x] POST ハンドラを実装
- [x] 認証処理:
  - `CRON_SECRET` 環境変数を取得。未設定なら 401
  - `Authorization` ヘッダーから `Bearer ` プレフィックスを除去してトークンを取得。ヘッダーなし or プレフィックス不一致なら 401
  - トークンと `CRON_SECRET` のバイト長を比較。不一致なら 401（`timingSafeEqual` の `RangeError` 回避）
  - `crypto.timingSafeEqual(Buffer.from(token), Buffer.from(cronSecret))` で比較。不一致なら 401
- [x] 認証成功後、`expireOverdueRequests()` を呼び出し、結果を JSON レスポンスで返す

**Acceptance Criteria**:
- 正しい `CRON_SECRET` で認証が通り、`expireOverdueRequests` が実行される
- 不正なトークンで 401 が返される
- トークン長不一致で `timingSafeEqual` を呼び出さずに 401 が返される
- `CRON_SECRET` 未設定で 401 が返される
- `Authorization` ヘッダーなしで 401 が返される

## T-11: 申請詳細画面に deadline 表示を追加

- [x] `src/app/(dashboard)/requests/[id]/page.tsx` — `ApprovalStepsSection` コンポーネントを修正
  - ステップの `deadline` が存在する場合:
    - 現在時刻より未来なら残り時間を表示（例: 「残り 2日 3時間」）
    - 現在時刻より過去なら「期限切れ」を赤テキストで表示
  - `deadline` が null の場合は期限表示なし
- [x] `statusLabel` / `statusClass` に `expired: "期限切れ"` / `expired: "bg-gray-100 text-gray-500"` を追加

**Acceptance Criteria**:
- deadline が未来のステップに残り時間が表示される
- deadline が過去のステップに「期限切れ」が表示される
- deadline が null のステップに期限表示がない
- `expired` ステータスのラベルとスタイルが正しい

## T-12: シードデータと環境変数の更新

- [x] `src/infrastructure/seed.ts` — system user を追加（固定 UUID `00000000-0000-0000-0000-000000000000`、name: "System"、email: "system@clearflow.internal"、デフォルト組織所属、role: "member"）
- [x] `src/infrastructure/seed.ts` — 高額テンプレートの各ステップに `deadlineHours: 72` を追加
- [x] `.env.example` を新規作成し、`DATABASE_URL`、`AUTH_SECRET`、`SYSTEM_USER_ID=00000000-0000-0000-0000-000000000000`、`CRON_SECRET=<your-cron-secret>` を記載

**Acceptance Criteria**:
- シード実行後、system user が作成される
- 高額テンプレートの steps jsonb に `deadlineHours: 72` が含まれる
- `.env.example` に `SYSTEM_USER_ID` と `CRON_SECRET` が記載されている

## T-13: Drizzle マイグレーション生成

- [x] `drizzle-kit generate` でマイグレーションファイルを生成する（`request_status` enum への `expired` 追加、`approval_steps` への `deadline` カラム追加）

**Acceptance Criteria**:
- `drizzle/` ディレクトリにマイグレーションファイルが生成される
- `bun run build` が成功する
