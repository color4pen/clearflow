# Domain Invariants Review — interaction-contract-invoice — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 観点と検証結果

### 1. テナント分離

#### 1-1. リポジトリ層での `organizationId` フィルタ

| 関数 | WHERE 条件 | 判定 |
|------|-----------|------|
| `interactionRepository.findAllByContract` | `eq(contractId) AND eq(organizationId)` | ✅ |
| `interactionRepository.findAllByInvoice` | `eq(invoiceId) AND eq(organizationId)` | ✅ |
| `contractRepository.findById` | `eq(id) AND eq(organizationId)` | ✅ |
| `invoiceRepository.findById` | `eq(id) AND eq(organizationId)` | ✅ |

新規追加されたすべてのリポジトリ関数において、`organizationId` が WHERE 条件に含まれており、クロステナントアクセスは構造的に不可能である。

#### 1-2. `organizationId` の出所（信頼できる発生源）

`src/app/actions/interactions.ts` の両 action において `organizationId` は `session.user.organizationId` から取得され、ユーザー入力（FormData）は使用されていない。`contractId`/`invoiceId` はユーザー入力だが、usecase 内の `findById(id, organizationId)` で所属テナントを検証しているため、他テナントの ID を渡してもデータ取得は失敗し、操作は拒否される。

#### 1-3. `getDealActivity` でのクロステナントリーク検査

- `contracts` は `contractRepository.findAllByDealId(dealId, organizationId)` で取得（組織フィルタ済み）
- `invoices` は `invoiceRepository.findAllByContract(c.id, organizationId)` で取得（組織フィルタ済み）
- `contractInteractions` / `invoiceInteractions` は、上記の filtered entity の ID を使って `findAllByContract/findAllByInvoice(id, organizationId)` で取得

クロステナントリークは発生しない。

**判定**: ✅ テナント分離は完全に担保されている

---

### 2. 監査ログの完全性

#### 2-1. 原子性（トランザクション境界）

`createContractAdjustment` / `createInvoiceAdjustment` ともに、`interactionRepository.create` と `recordAudit` を同一の `db.transaction` 内で実行している。Interaction レコードの作成と監査ログの記録は原子的に処理され、「Interaction だけ作られて監査ログが記録されない」状態は生じない。

#### 2-2. 監査ログの内容

| フィールド | 契約調整 | 請求調整 |
|-----------|---------|---------|
| `action` | `interaction.create` | `interaction.create` |
| `targetType` | `interaction` | `interaction` |
| `targetId` | 作成された interaction の ID | 作成された interaction の ID |
| `actorId` | session 由来 | session 由来 |
| `organizationId` | session 由来 | session 由来 |
| `metadata.kind` | `contract_adjustment` | `invoice_adjustment` |

kind 別の監査トレーサビリティが確保されており、後から種別での絞り込み・監査が可能である。

#### 2-3. テストによる固定

`contractAdjustment.dynamic.test.ts` および `invoiceAdjustment.dynamic.test.ts` において、`state.auditArgs` を参照して `action / targetType / metadata` の正確な値を assert している。また、契約不在時には `state.auditArgs === null` であることも確認されており、不正な監査記録が行われないことも保証されている。

**判定**: ✅ 監査ログの完全性・原子性は担保されている

---

### 3. 承認ワークフローの不変条件

#### 3-1. パーミッションマトリクスの整合性

`src/domain/authorization.ts` において：
- 既存の `approval` エンティティの操作定義（`submit / approve / reject`）は変更なし
- 新規追加は `interaction` エンティティの `recordContractAdjustment / recordInvoiceAdjustment` のみ
- `canPerform` 関数の deny-by-default ロジック（未定義操作 → `false`）は変更なし

#### 3-2. 契約ページでの承認バナー

`contracts/[id]/page.tsx` は `hasPendingApproval` の呼び出しを維持しており、承認待ちバナーは引き続き表示される。承認ワークフローの UI 動線は変更の影響を受けていない。

#### 3-3. 承認操作と記録操作の分離

設計判断 D2 に従い、契約調整の「記録」は `interaction` エンティティへの操作として定義され、`contract` エンティティへの操作（`changeStatus` など）とは独立している。承認ポリシーの評価対象は変更前後で同一であり、新しい顧客接点記録が既存の承認フローに割り込む経路はない。

**判定**: ✅ 承認ワークフローの不変条件は維持されている

---

### 4. 認可の境界

| 操作 | 許可ロール | 拒否ロール | テスト |
|------|-----------|-----------|-------|
| `recordContractAdjustment` | admin / manager / member | finance | ✅ `interactionAuthorization.dynamic.test.ts` |
| `recordInvoiceAdjustment` | admin / manager / finance | member | ✅ `interactionAuthorization.dynamic.test.ts` |

Server Action での認可チェックは `canPerform(session.user.role, "interaction", ...)` で行われ、DB 操作の前に拒否される。UI の `canRecord` フラグは表示制御のみであり、Server Action の認可チェックがバイパスされる経路はない。

**判定**: ✅ 認可は仕様どおりに実装されている

---

## 所見サマリ

| ID | 重大度 | 内容 |
|----|--------|------|
| — | — | 指摘事項なし |

すべての観点（テナント分離・監査ログ完全性・承認ワークフロー不変条件・認可境界）において問題は検出されなかった。ビルド・型チェック・テスト（1560件）・lint がすべてパスしていることも確認した。

---

## 結論

- **verdict**: approved
