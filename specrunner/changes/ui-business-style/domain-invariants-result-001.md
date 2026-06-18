# Domain Invariants Review — ui-business-style — iter 1

## Reviewer

domain-invariants

## Purpose

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## Scope of Review

本レビューは以下のドメイン不変条件を対象とする:

1. **テナント分離** — マルチテナント環境で organizationId によるデータ境界が維持されているか
2. **監査ログの完全性** — 承認ワークフローの操作が漏れなくログに記録されるか
3. **承認ワークフローの不変条件** — 状態遷移ルール・楽観的ロック・期限チェックが維持されているか
4. **認可ガード** — ロールベースアクセス制御が維持されているか

ドメイン関連の主要変更ファイル:

- `src/domain/models/request.ts` — `ApprovalStepSummary`、`RequestWithSteps` 型を追加
- `src/infrastructure/repositories/requestRepository.ts` — `findAllWithStepsByOrganization` を追加
- `src/application/usecases/listRequests.ts` — 戻り値型を `RequestWithSteps[]` に変更

---

## Findings

### F-01: テナント分離 — `findAllWithStepsByOrganization` の JOIN クエリ

- **severity**: info
- **verdict-impact**: none

新規追加の `findAllWithStepsByOrganization` は `requests LEFT JOIN approval_steps` を行う。テナント分離の観点での検証結果:

```ts
.leftJoin(
  approvalSteps,
  and(
    eq(approvalSteps.requestId, requests.id),
    eq(approvalSteps.organizationId, requests.organizationId)  // JOIN条件にorgId
  )
)
.where(eq(requests.organizationId, organizationId))  // WHERE句にorgId
```

- WHERE 句 `requests.organizationId = organizationId` により、取得対象テナントが確定される ✓
- JOIN 条件にも `approvalSteps.organizationId = requests.organizationId` を含むため、別テナントの承認ステップが誤って JOIN されることはない ✓
- 双方のガードが揃っており、クロステナント漏洩のリスクはない

既存の `findById` / `findAllByOrganization` / `updateStatus` / `existsPendingByTemplateId` も引き続き `organizationId` でフィルタされており、変更なし。

**判定**: テナント分離は正しく維持されている。

---

### F-02: 監査ログの完全性 — 承認操作パスへの変更なし

- **severity**: info
- **verdict-impact**: none

監査ログを生成するすべての操作（`createRequest`, `submitRequest`, `approveRequest`, `rejectRequest`, `resubmitRequest`, `bulkApprove`, `expireOverdueRequests`）は今回の変更で一切変更されていない。

`src/app/actions/requests.ts` は変更なし（今回の diff に含まれない）。監査ログ作成ロジックは usecase 層に存在し、同様に変更なし。

`settings/audit-logs/page.tsx` は `auditLogRepository.findByOrganization(session.user.organizationId, ...)` を呼び出しており、テナントスコープが正しく維持されている ✓

**判定**: 監査ログの完全性は損なわれていない。

---

### F-03: 承認ワークフローの不変条件 — `listRequests` の戻り値型変更

- **severity**: info
- **verdict-impact**: none

`listRequests` の戻り値が `Request[]` → `RequestWithSteps[]` に変更された。

`RequestWithSteps = Request & { approvalSteps: ApprovalStepSummary[] }` であり、`ApprovalStepSummary` は以下の読み取り専用フィールドのみを持つ:

```ts
export type ApprovalStepSummary = {
  approverRole: string;
  status: "pending" | "approved" | "rejected";
  deadline: Date | null;
};
```

`ApprovalStepSummary` には `id`、`version`、`approvedBy`、`approvedAt` が含まれない。これはUI表示専用のサマリーとして意図的な設計であり、この型を通じて承認操作が誤って行われる経路はない。承認操作（approve/reject）は `requests/[id]/page.tsx` が `getApprovalSteps` を別途呼び出して完全な `ApprovalStep[]` を取得する経路で行われ、変更なし ✓

楽観的ロック（`updateStatus` の `expectedVersion` チェック）も変更なし ✓

**判定**: 承認ワークフローの不変条件は維持されている。

---

### F-04: 認可ガード — ロール制御の維持

- **severity**: info
- **verdict-impact**: none

変更後のアクセス制御の状態:

| ページ / 機能 | ガード |
|---|---|
| `settings/layout.tsx` | `session.user.role !== "admin"` → `/requests` にリダイレクト ✓ |
| `settings/audit-logs/page.tsx` | 二重の admin チェック ✓ |
| `settings/delegations/page.tsx` | admin チェック ✓ |
| ダッシュボードヘッダー「設定」リンク | `{isAdmin && ...}` で admin のみ表示 ✓ |
| ダッシュボードヘッダー「監査ログ」リンク | `{isAdmin && ...}` で admin のみ表示 ✓ |
| `bulkApproveAction` | `session.user.role === "member"` を拒否 ✓ |
| `approveRequestAction` | `session.user.role === "member"` を拒否 ✓ |

`SettingsNav.tsx` は全タブ（監査ログ含む）を表示するが、これは `settings/layout.tsx` の admin ガードの内部でのみレンダリングされるため、非 admin ユーザーがタブを操作できる経路はない ✓

**判定**: ロールベースアクセス制御は正しく維持されている。

---

### F-05: `ApprovalStepSummary.status` の型重複定義（保守性リスク）

- **severity**: low
- **verdict-impact**: none

`src/domain/models/request.ts` の `ApprovalStepSummary.status` は `"pending" | "approved" | "rejected"` とリテラルで定義されており、`src/domain/models/approvalStep.ts` に存在する `ApprovalStepStatus` 型（`"pending" | "approved" | "rejected"`）を参照していない。

現時点では値セットが完全に一致しているため機能上の問題はない。ただし将来 `ApprovalStepStatus` に新しい値が追加された際、`ApprovalStepSummary.status` の更新が漏れると型の不整合が生じる。

```ts
// 現状 (request.ts)
export type ApprovalStepSummary = {
  status: "pending" | "approved" | "rejected";  // リテラル型
};

// 推奨
import type { ApprovalStepStatus } from "./approvalStep";
export type ApprovalStepSummary = {
  status: ApprovalStepStatus;  // 既存型を参照
};
```

**判定**: ドメイン不変条件を破壊するものではなく、次イテレーションでの対応を推奨する。

---

### F-06: `BulkApprovalPanel.RequestItem.status` の型弱化

- **severity**: low
- **verdict-impact**: none

`BulkApprovalPanel.tsx` の `RequestItem` 型で `status: string` と定義されており、`RequestStatus` ユニオン型が使われていない。

データ供給元の `requests/page.tsx` が `RequestWithSteps[]` の型付きデータを `requests.map(r => ({ status: r.status, ... }))` で渡しており、ランタイムでは `RequestStatus` の値しか流れてこない。機能上の問題はない。

ただし `RequestStatus` を明示することで、`ApprovalProgress` コンポーネントや `statusRowClass` との整合性がコンパイル時に保証される。

**判定**: ドメイン不変条件には影響しない。型安全性の改善として記録。

---

## Summary

| 観点 | 結果 |
|---|---|
| テナント分離 | ✅ 維持 |
| 監査ログの完全性 | ✅ 影響なし |
| 承認ワークフロー不変条件 | ✅ 維持 |
| ロールベースアクセス制御 | ✅ 維持 |
| 楽観的ロック | ✅ 変更なし |
| 期限チェック (TOCTOU) | ✅ 変更なし |

本変更はUIリデザインが主目的であり、ドメイン層への変更は `RequestWithSteps` 型の追加と `listRequests` の戻り値型変更のみ。いずれも読み取り専用の表示データ拡張であり、書き込み系のワークフロー（状態遷移、監査ログ、認可）には影響しない。

型重複定義（F-05）と型弱化（F-06）は技術的負債として記録するが、ドメイン不変条件の破壊には該当しない。

---

- **verdict**: approved
