# Tasks: 監査ログ記録の型付きヘルパへの集約

## T-01: 型付きヘルパ `recordAudit` の新設

- [x] `src/application/services/auditRecorder.ts` を新規作成する
- [x] ジェネリック関数 `recordAudit<A extends AuditAction>` を定義する
  - 引数型: `AuditRecordParams<A>` — conditional type で `AuditMetadataMap` の既知 action には metadata を必須、それ以外は省略可能とする
  - 第 2 引数: `tx?: Transaction`
  - 戻り値: `Promise<AuditLog>`
- [x] 内部では `auditLogRepository.create` を純粋に委譲呼び出しする（追加ロジックなし）
- [x] `AuditRecordParams` 型をファイルからエクスポートする（型テストで使用）

```typescript
// 期待するシグネチャ概要
import { auditLogRepository } from "@/infrastructure/repositories";
import type { Transaction } from "@/infrastructure/db";
import type {
  AuditAction,
  AuditTargetType,
  AuditMetadataMap,
  AuditLog,
} from "@/domain/models/auditLog";

type AuditRecordParams<A extends AuditAction> = {
  action: A;
  targetType: AuditTargetType;
  targetId: string;
  actorId: string;
  organizationId: string;
} & (A extends keyof AuditMetadataMap
  ? { metadata: AuditMetadataMap[A] }
  : { metadata?: Record<string, unknown> | null });

export async function recordAudit<A extends AuditAction>(
  params: AuditRecordParams<A>,
  tx?: Transaction
): Promise<AuditLog> {
  return auditLogRepository.create(
    {
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      actorId: params.actorId,
      organizationId: params.organizationId,
      metadata: (params.metadata ?? null) as Record<string, unknown> | null,
    },
    tx
  );
}
```

**Acceptance Criteria**:
- `src/application/services/auditRecorder.ts` が存在し、`recordAudit` 関数がエクスポートされている
- `tsc --noEmit` が通る

## T-02: 型テスト・ガードテストの新設

- [x] `src/__tests__/static/auditRecorder.test.ts` を新規作成する
- [x] テスト 1: `recordAudit` が `AuditAction` と `AuditTargetType` を型に持つことを静的検証する（ソースの型アノテーション文字列を検査）
- [x] テスト 2: `AuditRecordParams` が `action_item.toggle` の metadata を `{ done: boolean }` として要求することを型テスト（`@ts-expect-error` または `tsd` の `expectType` 相当）で検証する
- [x] テスト 3: `auditLogRepository.create` の直接呼び出しがヘルパ実装以外の `src/application/` および `src/infrastructure/handlers/` に残っていないことを検証する
  - `src/application/services/auditRecorder.ts` は許可リストとして除外
  - `src/application/usecases/` 配下の全 `.ts` ファイルと `src/infrastructure/handlers/` 配下をスキャンし、`auditLogRepository.create` 文字列が含まれていないことを確認

**Acceptance Criteria**:
- テスト 1〜3 が全て green
- テスト 3 のガードが、もし `auditLogRepository.create` の直接呼び出しが残っている場合に検出（fail）できること

## T-03: 43 usecase ファイルの移行（49 呼び出し）

各 usecase で `auditLogRepository.create(...)` を `recordAudit(...)` に置換する。引数構造は同一のため、機械的な置換となる。

- [x] 各ファイルの import 文を変更する:
  - `import { recordAudit } from "@/application/services/auditRecorder"` を追加
  - `auditLogRepository` が `.create` のみに使われていたファイルでは、import から `auditLogRepository` を削除
  - `auditLogRepository` が読み取り関数（`.findByTargets` 等）にも使われているファイルでは、`auditLogRepository` の import を残す
- [x] 全 `await auditLogRepository.create({ ... }, tx)` を `await recordAudit({ ... }, tx)` に置換する
- [x] tx 引き回しパターンを維持する（`tx` が渡されている呼び出しは `recordAudit` の第 2 引数に `tx` を引き継ぐ）

### 対象ファイル一覧（呼び出し数）

**1 呼び出し（38 ファイル）**:
- `addDealContact.ts`, `createActionItem.ts`, `createClient.ts`, `createClientContact.ts`
- `createContract.ts`, `createDelegation.ts`, `createInquiry.ts`, `createInvoice.ts`
- `createMeeting.ts`, `createPolicy.ts`, `createRequest.ts`, `createTemplate.ts`
- `deactivateDelegation.ts`, `deleteActionItem.ts`, `deleteClientContact.ts`
- `deleteContract.ts`, `deleteDeal.ts`, `deleteInquiry.ts`, `deleteRevenueTarget.ts`
- `deleteTemplate.ts`, `expireOverdueRequests.ts`
- `removeDealContact.ts`, `resubmitRequest.ts`
- `setRevenueTarget.ts`, `toggleActionItemDone.ts`, `togglePolicy.ts`
- `updateActionItem.ts`, `updateContract.ts`, `updateContractStatus.ts`
- `updateDeal.ts`, `updateDealPhase.ts`, `updateInquiry.ts`
- `updateInvoice.ts`, `updateInvoiceStatus.ts`
- `updateMeeting.ts`, `updatePolicy.ts`, `updateRevenueTarget.ts`
- `updateTemplate.ts`, `updateUserRole.ts`

**2 呼び出し（2 ファイル）**:
- `rejectRequest.ts` — `approval_step.reject` + `request.reject`

**3 呼び出し（1 ファイル）**:
- `approveRequest.ts` — `request.approve` × 2 + `approval_step.approve`

**4 呼び出し（1 ファイル）**:
- `updateInquiryStatus.ts` — `request.create` + `inquiry.conversionPending` + `inquiry.updateStatus` × 2

**注意**: `getRecentActivities.ts` / `getDealActivity.ts` / `listAuditLogs.ts` は読み取り専用で `.create` を呼ばないため対象外。

**Acceptance Criteria**:
- `src/application/usecases/` 配下に `auditLogRepository.create` の文字列が残っていないこと
- 全ファイルで `recordAudit` が使用されていること
- `tsc --noEmit` が通ること

## T-04: infrastructure handler の移行（1 呼び出し）

- [x] `src/infrastructure/handlers/auditLogHandler.ts` の `auditLogRepository.create` を `recordAudit` に置換する
- [x] import 文を `recordAudit` に変更し、`auditLogRepository` の import を削除する

**Acceptance Criteria**:
- `src/infrastructure/handlers/auditLogHandler.ts` に `auditLogRepository.create` が残っていないこと
- `tsc --noEmit` が通ること

## T-05: 既存静的テストの更新

既存の 7 テストファイル（35 アサーション）は `auditLogRepository.create` 文字列の存在をソースコード上で検査している。移行後はこの文字列が usecase に存在しなくなるため、`recordAudit` への参照検査に更新する。

- [x] 以下の各テストファイルで `auditLogRepository.create` を検査しているアサーションを `recordAudit` に更新する:
  - `src/__tests__/usecases/inquiryManagement.test.ts`（6 アサーション）
  - `src/__tests__/usecases/dealManagement.test.ts`（6 アサーション）
  - `src/__tests__/usecases/meetingManagement.test.ts`（4 アサーション）
  - `src/__tests__/usecases/templateManagement.test.ts`（7 アサーション — `indexOf` 検査を含む）
  - `src/__tests__/usecases/userManagement.test.ts`（3 アサーション — `indexOf` 検査を含む）
  - `src/__tests__/usecases/invoiceManagement.test.ts`（2 アサーション）
  - `src/__tests__/static/projectStructure.test.ts`（7 アサーション）

### `templateManagement.test.ts` / `userManagement.test.ts` の特殊パターン

これらのテストは `indexOf` を使って `auditLogRepository.create` が `db.transaction` より後に出現することを検証している。移行後は `recordAudit` がトランザクション内で呼ばれることの検証に変更する:

```typescript
// Before
const auditIdx = src.indexOf("auditLogRepository.create");
// After
const auditIdx = src.indexOf("recordAudit");
```

### `projectStructure.test.ts` の特殊パターン

TC-015（`auditLogRepository.create has optional tx parameter`）は `auditLogRepository.ts` のシグネチャを検査しており、移行の影響を受けない。変更不要。

`auditLogRepository.create` の action / targetType カタログ型検査（テスト 5）も `auditLogRepository.ts` を検査しており、変更不要。

削除・更新対象は `deleteInquiry` / `deleteDeal` / `deleteContract` の監査ログ検査アサーションのみ。

**Acceptance Criteria**:
- 更新後の全テストが green
- テストの意図（監査ログ記録が存在すること）が維持されていること

## T-06: 最終検証

- [x] `tsc --noEmit` が green であることを確認する
- [x] `bun run lint` が green であることを確認する
- [x] `bun test` が全件 green であることを確認する
- [x] T-02 のガードテストが green であることを再確認する（全移行完了後）

**Acceptance Criteria**:
- typecheck / lint / 全テストが green
- `auditLogRepository.create` の直接呼び出しが `auditRecorder.ts` 以外に存在しないことがテストで保証されている
