# Domain Invariants Review — design-revenue — iter 1

- **verdict**: approved

## Summary

テナント分離・監査ログ完全性・承認ワークフロー不変条件の三軸でレビューした。すべての不変条件が維持されており、問題なし。

---

## 1. テナント分離

### 新規クエリ: `getConfirmedRevenue`

```ts
eq(invoices.organizationId, organizationId),
```

`organizationId` フィルタが WHERE 句に含まれている。`getRevenueDashboard` usecase が `session.user.organizationId` を渡す経路も確認した。✅

### 既存クエリ（読み取り経路）

- `revenue/page.tsx` → `getRevenueDashboard` → `revenueRepository.*` — すべて `organizationId` スコープ済み ✅  
- `revenue/details/page.tsx` → `getRevenueDetails` — `organizationId` スコープ済み ✅  
- `revenue/forecast/page.tsx` → `getRevenueForecast` — `organizationId` スコープ済み ✅

### 書き込み経路: `updateRevenueTargetAction`

フォームの hidden フィールド `id` をユーザーが改ざんしても、`updateRevenueTarget` usecase 内で `revenueTargetRepository.findById(id, organizationId)` が組織スコープで存在確認を行う。見つからなければ `{ ok: false }` で早期リターン。その後の `repository.update` も `and(eq(id), eq(organizationId))` の WHERE 句を使用する。クロステナント操作は不可能。✅

### 書き込み経路: `deleteRevenueTargetAction`

同様に `deleteRevenueTarget` usecase が `findById(id, organizationId)` で先行確認し、`deleteById(id, organizationId, tx)` で組織スコープ削除する。`targetId` は inline server action のクロージャ経由だが、実際の権限確認は action 内で `auth()` を呼び出して取得した `session.user.organizationId` を使う。安全。✅

---

## 2. 監査ログ完全性

| 操作 | usecase | audit action | トランザクション内 |
|------|---------|--------------|-------------------|
| 目標作成 | `setRevenueTarget` | `revenue_target.create` | ✅ |
| 目標更新 | `updateRevenueTarget` | `revenue_target.update` (before/after metadata 付き) | ✅ |
| 目標削除 | `deleteRevenueTarget` | `revenue_target.delete` (期間・金額 metadata 付き) | ✅ |

`updateRevenueTarget` の監査ログには変更前後のスナップショット (`before` / `after`) が記録されており、変更追跡が可能。3 操作すべて `db.transaction` 内に audit log の `create` が含まれるため、DB 操作と監査ログの原子性が保証されている。✅

読み取り専用の新規クエリ (`getConfirmedRevenue`) に監査ログ不要であることを確認（参照のみ）。✅

---

## 3. 承認ワークフロー不変条件

今回の変更は売上画面（`revenue/`）の UI レイアウト変更と読み取り専用データアクセスの拡充に限定されており、承認ワークフローに関連するファイルへの変更はゼロ。

- `approveRequest.ts` / `rejectRequest.ts` / `submitRequest.ts` — 変更なし ✅  
- `domain/models/` — 変更なし ✅  
- `domain/services/` — 変更なし ✅  
- `evaluatePolicies.ts` — 変更なし ✅

承認フローの状態遷移・バリデーションルール・委任ロジックに対する影響なし。✅

---

## 4. 認可チェック

`updateRevenueTargetAction` / `deleteRevenueTargetAction` / `setRevenueTargetAction` の三アクションすべてで:

1. `auth()` でセッション検証  
2. `canPerform(session.user.role, "revenue", "setTarget")` で RBAC チェック  
3. レートリミット確認（`setRevenueTarget` / `updateRevenueTarget` のみ）

ページ側でも `canSetTarget` フラグで UI 要素を条件付きレンダリングしているが、これは UX 上の補助に過ぎず、実際の権限強制は Server Action 側で行われている。多重防衛が成立している。✅

---

## 所見

### INFO: `updateRevenueTargetAction` の `periodStart` / `periodEnd` バリデーション

`updateRevenueTargetSchema` で `periodStart` / `periodEnd` は `optional()` となっており、本フォーム（目標金額のインライン編集）では渡されない。usecase 側でも `undefined` の場合は既存値を維持するロジックになっている。スキーマ設計・usecase ロジックの整合性あり。問題なし。

---

## Checklist

- [x] 全クエリに `organizationId` フィルタが存在する
- [x] 書き込み操作はすべてトランザクション内で監査ログを記録している
- [x] 目標更新の監査ログに before/after スナップショットがある
- [x] 承認ワークフロー関連コードへの変更がない
- [x] Server Action で認証・認可チェックを実施している
- [x] domain layer（型定義・状態遷移・バリデーション）への変更がない
