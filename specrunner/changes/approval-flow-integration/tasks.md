# Tasks: approval-flow-integration

## T-01: requests テーブルに sourceType/sourceId カラムを追加

- [ ] `src/infrastructure/schema.ts` の `requests` テーブル定義に `sourceType: text("source_type")` と `sourceId: uuid("source_id")` を追加する（両方 nullable）
- [ ] `bunx drizzle-kit generate` でマイグレーションファイルを生成する

**Acceptance Criteria**:
- `requests` テーブル定義に `source_type`（text, nullable）と `source_id`（uuid, nullable）が存在する
- マイグレーションファイルが生成されている
- `bun run build` が成功する

## T-02: Request ドメインモデルに sourceType/sourceId を追加

- [ ] `src/domain/models/request.ts` の `Request` 型に `sourceType: string | null` と `sourceId: string | null` を追加する
- [ ] `src/infrastructure/repositories/requestRepository.ts` の `mapRow` 関数に `sourceType: row.sourceType ?? null` と `sourceId: row.sourceId ?? null` を追加する

**Acceptance Criteria**:
- `Request` 型に `sourceType` と `sourceId` フィールドが存在する
- `mapRow` が DB の `source_type`/`source_id` カラムを正しくマッピングする
- `typecheck` が green

## T-03: requestRepository.create に status/sourceType/sourceId パラメータを追加

- [ ] `src/infrastructure/repositories/requestRepository.ts` の `create` メソッドの `data` 引数に `status?: RequestStatus`, `sourceType?: string | null`, `sourceId?: string | null` を追加する
- [ ] `.values()` 内の `status: "draft"` を `status: data.status ?? "draft"` に変更する
- [ ] `.values()` に `sourceType: data.sourceType ?? null` と `sourceId: data.sourceId ?? null` を追加する
- [ ] `RequestStatus` 型の import を確認する（既に import 済み）

**Acceptance Criteria**:
- `create` メソッドが `status`, `sourceType`, `sourceId` のオプショナルパラメータを受け付ける
- パラメータ省略時は `status: "draft"`, `sourceType: null`, `sourceId: null` がデフォルト
- 既存の `createRequest` UC からの呼び出しがコード変更なしで動作する
- `typecheck` が green

## T-04: updateInquiryStatus の converted 遷移で pending/source metadata を渡す

- [ ] `src/application/usecases/updateInquiryStatus.ts` の converted 遷移ブロック内の `requestRepository.create` 呼び出しに以下を追加する:
  - `status: "pending" as const`
  - `sourceType: "inquiry"`
  - `sourceId: data.inquiryId`

**Acceptance Criteria**:
- converted 遷移で作成される Request の `status` が `"pending"` である
- `sourceType` が `"inquiry"`、`sourceId` が引き合いの ID である
- 既存のトランザクション内処理に変更なし（audit log、approval steps 作成は従来通り）
- `typecheck` が green

## T-05: updateDealPhase の estimate_approval 遷移で pending/source metadata を渡す

- [ ] `src/application/usecases/updateDealPhase.ts` の estimate_approval 遷移ブロック内の `requestRepository.create` 呼び出しに以下を追加する:
  - `status: "pending" as const`
  - `sourceType: "deal"`
  - `sourceId: data.dealId`

**Acceptance Criteria**:
- estimate_approval 遷移で作成される Request の `status` が `"pending"` である
- `sourceType` が `"deal"`、`sourceId` が案件の ID である
- 既存のトランザクション内処理に変更なし
- `typecheck` が green

## T-06: approveRequest に承認完了後の連動処理を追加

- [ ] `src/application/usecases/approveRequest.ts` の import に `inquiryRepository`, `dealRepository` を追加する
- [ ] 全ステップ承認後の webhook 配信前（`txResult.allApproved` ブロック内、`return` 前）に連動処理を追加する:
  - `txResult.request` の `sourceType` と `sourceId` を参照する
  - **sourceType === "inquiry"** の場合:
    - `inquiryRepository.findById(txResult.request.sourceId, data.organizationId)` で引き合いを取得
    - `dealRepository.create({ organizationId, inquiryId: sourceId, title: inquiry.title })` で Deal を作成
    - `auditLogRepository.create({ action: "deal.create", targetType: "deal", targetId: deal.id, actorId: data.actorId, organizationId })` で audit log を記録
    - エラー発生時は `auditLogRepository.create({ action: "approval.linkage_failed", ... metadata: { sourceType, sourceId, error: message } })` で記録するが、承認結果には影響させない
  - **sourceType === "deal"** の場合:
    - `dealRepository.findById(txResult.request.sourceId, data.organizationId)` で案件を取得
    - `dealRepository.updatePhase(sourceId, organizationId, "won", deal.estimateRequestId, deal.version)` でフェーズを `won` に遷移
    - `auditLogRepository.create({ action: "deal.updatePhase", targetType: "deal", targetId: sourceId, actorId, organizationId, metadata: { fromPhase: deal.phase, toPhase: "won" } })` で audit log を記録
    - エラー発生時は同様に `approval.linkage_failed` として audit log に記録
- [ ] 連動処理は try-catch で囲み、失敗しても `return { ok: true, request: txResult.request }` を返す
- [ ] 連動処理は `txResult.allApproved` ブロック内かつ webhook 配信と同じレベル（トランザクション外）で実行する
- [ ] no-steps フロー（steps.length === 0）側にも同様の連動処理を追加する。この場合は `updated`（updateStatus の戻り値）の `sourceType`/`sourceId` を参照する

**Acceptance Criteria**:
- 案件化承認の全ステップ承認後に Deal が自動作成される
- 見積承認の全ステップ承認後に Deal の phase が `"won"` に遷移する
- 連動処理失敗時に audit log が記録される
- 連動処理失敗時に `approveRequest` は `ok: true` を返す
- no-steps フローでも連動処理が動作する
- 依存方向 `usecases → infrastructure` を遵守する（UC→UC 呼び出しなし）
- `typecheck` が green

## T-07: テスト追加

- [ ] `src/__tests__/usecases/approvalFlowIntegration.test.ts` を作成する（静的検証テスト）
- [ ] 以下のテストケースを実装する（プロジェクトの既存テストパターンに従い、ソースコードの静的解析で検証する）:
  - `updateInquiryStatus` の converted 遷移で `status: "pending"` が渡されることを確認
  - `updateInquiryStatus` の converted 遷移で `sourceType: "inquiry"` が渡されることを確認
  - `updateDealPhase` の estimate_approval 遷移で `status: "pending"` が渡されることを確認
  - `updateDealPhase` の estimate_approval 遷移で `sourceType: "deal"` が渡されることを確認
  - `createRequest` UC が `status` を渡していないことを確認（デフォルトで draft）
  - `approveRequest` が `inquiryRepository` を import していることを確認（連動処理の存在）
  - `approveRequest` が `dealRepository` を import していることを確認
  - `approveRequest` に `sourceType === "inquiry"` の分岐が存在することを確認
  - `approveRequest` に `sourceType === "deal"` の分岐が存在することを確認
  - `approveRequest` に `approval.linkage_failed` の audit log 記録が存在することを確認（失敗時の記録）
  - `requestRepository.create` のシグネチャに `status` パラメータが存在することを確認
  - `requestRepository.create` のシグネチャに `sourceType` パラメータが存在することを確認
  - `Request` 型に `sourceType` フィールドが存在することを確認
  - `Request` 型に `sourceId` フィールドが存在することを確認
  - schema の `requests` テーブルに `source_type` カラムが定義されていることを確認
  - schema の `requests` テーブルに `source_id` カラムが定義されていることを確認

**Acceptance Criteria**:
- `bun test` が全件 green
- 案件化承認リクエストが `pending` で作成されるテストが存在する
- 見積承認リクエストが `pending` で作成されるテストが存在する
- 通常の承認リクエストが `draft` で作成されるテストが存在する
- 案件化承認完了時の Deal 自動作成テストが存在する
- 見積承認完了時の Deal フェーズ進行テストが存在する
- 連動処理失敗時の承認成功テストが存在する

## T-08: ビルド・型チェック・全テスト通過確認

- [ ] `bun run build` を実行し成功を確認する
- [ ] `bun test` を実行し全件 green を確認する

**Acceptance Criteria**:
- `bun run build` が成功する
- `bun test` が全件 green
- `typecheck` が green
