# Domain Invariants Review — fix-source-labels-sort — iter 1

- **reviewer**: domain-invariants
- **verdict**: approved

## 観点

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件（ステップ順序・ポリシー評価順序）が変更によって破壊されていないことを検証する。

---

## 検証結果

### 1. テナント分離（全修正リポジトリ）

| リポジトリ | 修正関数 | organizationId フィルタ | 判定 |
|---|---|---|---|
| inquiryRepository | findAllByOrganization, findAllWithClientByOrganization, findByClientId | `.where(eq(inquiries.organizationId, organizationId))` — 維持 | ✅ |
| dealRepository | findAllByOrganization, findAllByClientId | `.where(eq(deals.organizationId, organizationId))` — 維持 | ✅ |
| contractRepository | findAllByClientId, findAllByOrganization | `.where(and(eq(...clientId), eq(...organizationId)))` — 維持 | ✅ |
| requestRepository | findAllByOrganization, findAllWithStepsByOrganization | `.where(eq(requests.organizationId, organizationId))` — 維持 | ✅ |
| clientRepository | findAllByOrganization | `.where(eq(clients.organizationId, organizationId))` — 維持 | ✅ |

`orderBy` の方向変更は `WHERE` 述語に影響しない。クロステナントデータ漏洩リスクは導入されていない。

### 2. 承認ステップ順序不変条件

`findAllWithStepsByOrganization` の `orderBy` は以下の通り変更された:

```
Before: .orderBy(requests.createdAt, approvalSteps.stepOrder)
After:  .orderBy(desc(requests.createdAt), approvalSteps.stepOrder)
```

`approvalSteps.stepOrder` は方向指定なし（Drizzle デフォルト = ASC）のまま維持されており、承認ステップの論理順序（1→2→3）は保たれている。要件4「approvalSteps の orderBy は変更しない」を遵守している。

LEFT JOIN 条件に `eq(approvalSteps.organizationId, requests.organizationId)` が含まれており、クロステナントのステップ混入は防止されている。

また、Map ベースのグループ化ロジックは JavaScript Map の挿入順序（= `desc(requests.createdAt)` 順）を保持し、`Array.from(map.values())` でその順序が返される。申請一覧の降順表示は正しく機能する。

### 3. 承認ポリシー評価順序不変条件

`approvalPolicyRepository.ts` は本変更で**修正されていない**。

- `findActiveByTriggerAction` — `asc(approvalPolicies.createdAt)` を維持。ポリシー評価の決定的順序（古い順 = FIFO）が保たれている ✅
- `findByOrganization` — `desc(approvalPolicies.createdAt)` を維持（設定画面表示用、評価には使用しない） ✅

### 4. 監査ログ完全性

`auditLogRepository.ts` は修正されていない。

`requestRepository.existsPendingByTemplateId` は `auditLogs.organizationId` と `requests.organizationId` の両方で organizationId フィルタリングを行っており、テナント間の監査ログ参照は発生しない。

新規ラベル（`email`, `agent_service`）は既に `inquirySourceEnum` に存在する値のみで、スキーマ変更なし。監査ログの `action` フィールドや `metadata` 構造に変更はない。

### 5. revenueRepository・approvalPolicies の orderBy 保護

`revenueRepository.ts` は修正されていない。月次集計・ランキングの `orderBy` は変更なし ✅

`approvalPolicies` の `orderBy` も変更なし ✅

---

## 所見

### INFO: clientContacts テナント分離の既存パターン

`clientRepository.findContactsByClientId` / `updateContact` / `deleteContact` は `organizationId` を直接フィルタとして受け取らず、呼び出し元での事前確認（`findById` 経由）に委ねている。これは本変更で導入されたものではなく、既存のパターンとして文書化されているため、本レビュー対象外。

---

## 総評

本変更の実装内容はすべて `orderBy` 方向の変更と UI ラベルの追加に限定されており、ドメイン不変条件（テナント分離・承認ステップ順序・ポリシー評価順序・監査ログ完全性）を破壊する変更は一切含まれていない。verification-result.md の build / typecheck / test / lint がすべて passed であることも確認した。
