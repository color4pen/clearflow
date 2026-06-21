# Domain-Invariants Review: contract-management — iter 1

## Reviewer

domain-invariants

## Purpose

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件（Deal won フェーズ前提・1 Deal = 1 Contract・契約ステータス終端遷移禁止）が変更によって破壊されていないことを検証する。

---

## Scope

```
src/application/usecases/createContract.ts
src/application/usecases/updateContract.ts
src/application/usecases/updateContractStatus.ts
src/domain/services/contractTransition.ts
src/infrastructure/repositories/contractRepository.ts
src/app/actions/contracts.ts
src/infrastructure/schema.ts  (contracts table, enums, unique constraint)
src/app/(dashboard)/contracts/[id]/ContractStatusActions.tsx
src/app/(dashboard)/deals/[id]/page.tsx
```

---

## Invariants Checked

### I-1: テナント分離 — リポジトリ全メソッドの organizationId 条件

| メソッド | WHERE 条件 | 結果 |
|---------|-----------|------|
| `contractRepository.create` | INSERT values に organizationId を含む | OK |
| `contractRepository.findById` | `eq(id) AND eq(organizationId)` | OK |
| `contractRepository.findByDealId` | `eq(dealId) AND eq(organizationId)` | OK |
| `contractRepository.findAllByOrganization` | `eq(organizationId)` | OK |
| `contractRepository.update` | `eq(id) AND eq(organizationId)` | OK |

`createContract` usecase で Deal を取得する際も `dealRepository.findById(dealId, organizationId)` を使用しており、クロステナントアクセスはレポジトリ層で完全に遮断されている。

### I-2: テナント分離 — Server Actions が organizationId をセッションから取得

全 5 Action (`createContractAction`, `updateContractAction`, `updateContractStatusAction`, `listContractsAction`, `getContractAction`) において `session.user.organizationId` をそのまま usecase / repository に渡している。URL パラメーターからの organizationId 取得はない。テスト (`projectStructure.test.ts`) も `session.user.organizationId` の使用を静的検証している。

### I-3: 監査ログ完全性 — 全ミューテーションでのトランザクション内ログ記録

| usecase | action | metadata | トランザクション内 |
|---------|--------|----------|------------------|
| `createContract` | `contract.create` | なし | `db.transaction` 内 ✓ |
| `updateContract` | `contract.update` | なし | `db.transaction` 内 ✓ |
| `updateContractStatus` | `contract.updateStatus` | `{ fromStatus, toStatus }` | `db.transaction` 内 ✓ |

`listContracts`・`getContract` は読み取りのみのため監査ログ不要。ステータス変更には遷移前後の状態が metadata に記録されており、監査トレーサビリティが確保されている。

### I-4: 承認ワークフロー不変条件 — Deal won フェーズ検証

`createContract.ts:29` で `deal.phase !== "won"` をチェックし、won 以外のフェーズでは `{ ok: false, reason: "受注済みの案件にのみ契約を作成できます" }` を返す。`won` は終端状態（既存コード上、`won` からの遷移は存在しない）であるため、契約作成後に Deal が won フェーズから外れる経路はない。

### I-5: 承認ワークフロー不変条件 — 1 Deal = 1 Contract

- アプリケーション層: `contractRepository.findByDealId(dealId, organizationId)` で事前確認（`createContract.ts:33-36`）
- DB 層: `unique("contracts_deal_id_unique").on(table.dealId)` による制約（`schema.ts:384`）

二重防御が有効。DB 層制約が最終的なフェイルセーフとして機能する。

### I-6: 承認ワークフロー不変条件 — 契約ステータス遷移ルール

`contractTransition.ts` の実装:

```
TERMINAL_STATUSES = ["completed", "cancelled"]
canTransition(from, to):
  if TERMINAL_STATUSES.includes(from) → false
  if from === to → false
  return true
```

`ContractStatus = "active" | "completed" | "cancelled"` の型制約下で:

| 遷移 | 期待 | 実際 |
|-----|-----|------|
| active → completed | true | true ✓ |
| active → cancelled | true | true ✓ |
| completed → active | false | false ✓ |
| cancelled → active | false | false ✓ |
| active → active | false | false ✓ |

`updateContractStatus.ts:24` で `canContractTransition` を呼び出し、拒否時は `ok: false` を返す。Server Action は `updateContractStatusAction` として `admin/manager` ガードを持つ。

### I-7: clientId 不変条件

`createContract` で `deal.clientId` を `contracts.clientId` に設定し、`updateContract` では `clientId` を更新可能フィールドに含めていない。Deal と Contract の顧客一致性が保たれる。

### I-8: 権限制御

| Action | admin | manager | その他 |
|--------|-------|---------|-------|
| createContractAction | ✓ | ✓ | 拒否 |
| updateContractAction | ✓ | ✓ | 拒否 |
| updateContractStatusAction | ✓ | ✓ | 拒否 |
| listContractsAction | ✓ | ✓ | ✓ |
| getContractAction | ✓ | ✓ | ✓ |

案件操作と同一の権限モデル（admin/manager による書き込み制限）を踏襲している。

---

## Findings

### F-01 [Low]: createContract の重複チェックがトランザクション外で実行される

**場所**: `src/application/usecases/createContract.ts:24-36`

```typescript
// トランザクション外
const deal = await dealRepository.findById(data.dealId, data.organizationId);
const existing = await contractRepository.findByDealId(data.dealId, data.organizationId);
// ... その後 db.transaction(...)
```

**問題**: 同一 Deal に対する並行リクエストが両チェックを通過した場合、DB 唯一制約 (`contracts_deal_id_unique`) がエラーを投げるが、catch ブロックが汎用メッセージ ("契約の作成に失敗しました") を返すため、「すでに契約が存在します」という具体的なエラーが伝わらない。

**影響**: 不変条件（1 Deal = 1 Contract）はDB制約により保持される。レート制限が並行リクエストの確率を下げる。実際の不変条件破壊は起きない。

**推奨**: `dealRepository.findById` と `contractRepository.findByDealId` の呼び出しをトランザクション内に移動するか、catch ブロックで unique violation エラーを識別して適切なメッセージを返す。ただし修正は任意。

---

## Verdict

- **verdict**: approved

全ての主要不変条件（テナント分離・監査ログ完全性・Deal won 前提・1 Deal = 1 Contract・ステータス終端遷移禁止）が実装で正しく保証されている。F-01 は不変条件を破壊しない low severity の観察事項であり、マージをブロックする理由はない。
