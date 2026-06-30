# Domain-Invariants Review — interaction-kind-channel — iter 1

- **verdict**: approved
- **iteration**: 001

## 観点・判定基準

本レビューはテナント分離と監査ログの完全性、および承認ワークフロー不変条件の維持を検証する。

---

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | info | tenant-isolation | `src/application/usecases/createContractAdjustment.ts` | `organizationId` はセッション（認証コンテキスト）由来であり、ユーザー入力ではない。`contractRepository.findById(contractId, organizationId)` で契約がそのテナントに属することを検証してから Interaction を作成している。テナント分離は維持されている。 | — | no |
| 2 | info | audit-completeness | `src/application/usecases/createContractAdjustment.ts` / `createInvoiceAdjustment.ts` | 両ユースケースとも `action: "interaction.create"`・`metadata: { kind: "note" }` で監査を記録しており、DB トランザクション内で Interaction 作成と監査記録が原子的に実行される。失敗時は両方がロールバックされる。 | — | no |
| 3 | info | audit-immutability | （変更なし） | 過去の監査ログ（`metadata.kind: "contract_adjustment"` / `"invoice_adjustment"`）は書き換えられない。設計どおり追記専用・不可侵が維持されている。 | — | no |
| 4 | info | authz-invariant | `src/domain/authorization.ts` / `src/app/actions/interactions.ts` / RSC 2 ファイル | `canPerform` の deny-by-default は維持されている。旧操作名 `recordContractAdjustment` / `recordInvoiceAdjustment` は全 call site（authorization.ts・interactions.ts・contracts/[id]/page.tsx・invoices/[invoiceId]/page.tsx）から除去され、新操作名 `recordContractInteraction` / `recordInvoiceInteraction` が一貫して参照されている。partial rename による機能停止リスクは解消されている。 | — | no |
| 5 | info | authz-invariant | `src/domain/authorization.ts` | 権限値は変更なし: 契約接点=`ADMIN_MANAGER_MEMBER`、請求接点=`ADMIN_MANAGER_FINANCE`。finance による契約接点記録拒否・member による請求接点記録拒否がテストで固定されている。 | — | no |
| 6 | info | migration-safety | `drizzle/0018_interaction_kind_channel.sql` | 先行 UPDATE で旧値を `note` に寄せ、enum 再作成後に `contract_id` / `invoice_id` を変更しない。`DROP COLUMN` / `DELETE` / `TRUNCATE` は含まれない。USING キャスト時に旧値が残っていれば型変換エラーで安全に失敗する設計。商談行（`kind=meeting`）は WHERE 句が絞り込まず不変。 | — | no |
| 7 | info | approval-workflow | — | 承認ワークフロー（`approval` / `approvalSettings` エンティティ）は本変更の影響を受けていない。Interaction と承認フローは直交する概念であり、permission matrix の approval 操作（submit / approve / reject 等）は不変。 | — | no |

---

## 詳細評価

### テナント分離

**結論: 維持されている**

- Server Action（`recordContractAdjustmentAction` / `recordInvoiceAdjustmentAction`）は `session.user.organizationId` をセッションから取得しており、ユーザー入力ではない。
- `createContractAdjustment`: `contractRepository.findById(contractId, organizationId)` で契約の所属テナントを検証後、`interactionRepository.create({ organizationId, ... })` を実行する。クロステナント混入経路なし。
- `createInvoiceAdjustment`: `invoiceRepository.findById(invoiceId, organizationId)` で請求の所属テナントを検証後、同様に create する。
- 全 `findAll*` メソッドが `AND interactions.organization_id = $org` を WHERE に含む（`findAllByContract` / `findAllByInvoice` / `findAllByDeal` 等）。
- `recordAudit` に渡す `organizationId` もセッション由来。

### 監査ログの完全性

**結論: 維持されている**

- 両ユースケースで `db.transaction` 内に `interactionRepository.create` と `recordAudit` が同居しており、DB トランザクションで原子性が保証されている。Interaction 作成失敗時は audit も記録されず、audit 記録失敗時は Interaction もロールバックされる。
- `action: "interaction.create"` / `targetType: "interaction"` / `metadata: { kind: "note" }` の形式は一貫しており、今後の監査ログ検索・エクスポートに支障なし。
- 過去 audit の `metadata.kind: "contract_adjustment"` / `"invoice_adjustment"` は変更されない（スコープ外）。UI ラベルは `action` ベースであり `metadata.kind` に依存しないため、過去ログの表示も影響を受けない。

### 承認ワークフローの不変条件

**結論: 維持されている**

- `authorization.ts` の `approval` / `approvalSettings` エンティティ定義は変更なし。
- Interaction の記録は承認フローのトリガーになっていない（`hasPendingApproval` は契約に対して独立して動作する）。
- `canPerform` の deny-by-default: マトリクスに存在しない操作名は `false` を返す。旧操作名 `recordContractAdjustment` / `recordInvoiceAdjustment` を参照するコードは存在しない（grep で確認済み）。

### マイグレーション安全性

**結論: データ保全要件を満たしている**

マイグレーション SQL のステップ:
1. `UPDATE ... SET kind = 'note' WHERE kind IN ('contract_adjustment','invoice_adjustment')` — relatedTo 列は不変
2. `ALTER COLUMN kind DROP DEFAULT`
3. `CREATE TYPE interaction_kind_new AS ENUM('meeting','call','email','note')`
4. `ALTER COLUMN kind TYPE ... USING kind::text::interaction_kind_new`
5. `ALTER COLUMN kind SET DEFAULT 'meeting'`
6. `DROP TYPE interaction_kind`
7. `ALTER TYPE interaction_kind_new RENAME TO interaction_kind`

破壊的操作（`DROP COLUMN` / `DELETE` / `TRUNCATE`）なし。ステップ (4) の USING キャストは UPDATE 後に旧値が残留していれば型変換エラーで安全に失敗する。

---

## 総評

テナント分離・監査ログの完全性・認可 deny-by-default・承認ワークフロー不変条件のいずれも侵害されていない。ドメイン不変条件の観点で本変更を承認する。
