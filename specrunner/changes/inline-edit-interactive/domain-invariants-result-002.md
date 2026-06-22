# Domain Invariants Review: inline-edit-interactive

- **reviewer**: domain-invariants
- **iteration**: 2
- **date**: 2026-06-22
- **verdict**: approved

## 目的

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## 調査範囲

Iteration 1 の必須修正（R-01 / R-02）の対応を中心に検証した。

- `src/application/usecases/updateInquiry.ts` (新規)
- `src/application/usecases/index.ts` (+1 export)
- `src/app/actions/inquiries.ts` (修正)
- `src/infrastructure/repositories/inquiryRepository.ts` (参照確認)
- `src/infrastructure/repositories/auditLogRepository.ts` (参照確認)

---

## 所見

### F-01: R-01 / R-02 対応 — 引き合い更新の監査ログ欠損が修正された [severity: ok]

Iteration 1 で指摘した「`updateInquiryAction` が `inquiryRepository.update()` を直接呼び出し、監査ログを記録しない」問題が正しく解消されている。

**修正内容の確認**:

1. `src/application/usecases/updateInquiry.ts` が新規作成され、以下の構造になっている:
   - `db.transaction(async (tx) => { ... })` でトランザクション境界を確立
   - `inquiryRepository.update(id, orgId, payload, tx)` でデータ更新
   - `auditLogRepository.create({ action: "inquiry.update", targetType: "inquiry", ... }, tx)` で同一トランザクション内に監査ログを記録
   - `metadata: { updatedFields: Object.keys(updatePayload) }` で変更フィールドを記録

2. `src/app/actions/inquiries.ts` が `updateInquiry` usecase を呼び出すように修正されている:
   ```typescript
   import { ..., updateInquiry, ... } from "@/application/usecases";
   // ...
   const result = await updateInquiry({
     inquiryId, organizationId, actorId, title, description, source, clientId, assigneeId
   });
   ```

3. 両 repository 関数はトランザクション引数 (`tx?: Transaction`) を受け付けるシグネチャを持ち、正しく使用されている。

4. `src/application/usecases/index.ts` に `export { updateInquiry } from "./updateInquiry"` が追加済み。

これにより4エンティティ全ての更新パスが usecase を経由した監査ログ記録に統一された:

| エンティティ | 更新パス | 監査ログ |
|---|---|---|
| deal | `updateDealAction` → `updateDeal` usecase | `deal.update` ✓ |
| contract | `updateContractAction` → `updateContract` usecase | `contract.update` ✓ |
| meeting | `updateMeetingAction` → `updateMeeting` usecase | `meeting.update` ✓ |
| inquiry | `updateInquiryAction` → `updateInquiry` usecase | `inquiry.update` ✓ (今回修正) |

---

### F-02: テナント分離は引き続き維持されている [severity: ok]

`updateInquiry` usecase は `data.organizationId` を `inquiryRepository.findById()` および `inquiryRepository.update()` の両呼び出しに渡しており、テナント境界が保たれている。`organizationId` はサーバーコンポーネントで `session.user.organizationId` から取得し、クライアントからの入力を使用していない。

---

### F-03 〜 F-06: 変更なし [severity: ok]

Iteration 1 で問題なしと確認した以下の点は、今回の修正（R-01 / R-02 対応のみ）で影響を受けていない:

- ロールベースアクセス制御（F-03）: `updateInquiryAction` / `updateMeetingAction` の admin/manager チェックは維持されている
- 案件フェーズ遷移の不変条件（F-04）: `updateDealPhase` usecase / `canDealTransition()` の経路は変更なし
- 契約ステータス遷移の不変条件（F-05）: `ContractStatusActions` 経路は変更なし
- 承認ワークフロー（F-06）: `src/app/actions/requests.ts` への変更なし

---

## 判定

- **verdict**: approved

Iteration 1 で指摘した R-01 / R-02 が正しく実装されており、以下の不変条件がすべて満たされている:

1. **監査ログ完全性**: 4エンティティすべての更新操作が usecase を経由してトランザクション内に監査ログを記録する
2. **テナント分離**: すべての Server Action がサーバー側セッションから `organizationId` を取得し、クライアント入力を権限判定に使用しない
3. **ロールベース制御**: 4つの更新 Action すべてに admin/manager 制限が適用されている
4. **フェーズ / ステータス遷移ルール**: ドメインサービスによる遷移検証は迂回されていない
5. **承認ワークフロー**: スコープ外として適切に除外されており影響なし
