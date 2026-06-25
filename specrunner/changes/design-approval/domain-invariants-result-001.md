# Domain Invariants Review: design-approval (Iteration 1)

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 観点

1. **テナント分離** — 新規データアクセス（usecase / repository）がすべて `organizationId` スコープで保護されているか
2. **監査ログの完全性** — 承認・却下操作の監査証跡が欠落していないか
3. **承認ワークフロー不変条件** — 「現在の承認者のみが承認・却下できる」という不変条件が維持されているか
4. **認可バイパス** — URL パラメータ等によるロール制御の迂回が防止されているか

---

## 所見

### [PASS] テナント分離 — 新規 usecase

**対象**: `src/application/usecases/getInquiry.ts`, `src/application/usecases/getActiveDelegationsForUser.ts`

両ユースケースは `organizationId` を必須引数に持ち、repository 呼び出し時に正しくスコープする。

```ts
// getInquiry.ts
inquiryRepository.findById(data.inquiryId, data.organizationId)

// getActiveDelegationsForUser.ts
approvalDelegationRepository.findActiveByToUserId(data.userId, data.organizationId, now)
```

- `inquiryRepository.findById` は `WHERE id = ? AND organizationId = ?` でクエリする（`inquiryRepository.ts` L62-67 確認済み）
- `findActiveByToUserId` は `WHERE toUserId = ? AND organizationId = ? AND isActive = true AND ...` でクエリする（`approvalDelegationRepository.ts` L32-46 確認済み）

テナント越えデータ漏洩のリスクなし。

---

### [PASS] テナント分離 — SystemOriginBanner

**対象**: `src/app/(dashboard)/requests/[id]/SystemOriginBanner.tsx`

`organizationId` は Server Component (`[id]/page.tsx`) でセッションから取得し、Props として渡される。クライアント入力から取得していない。

```ts
// [id]/page.tsx
const organizationId = session!.user.organizationId;
// ...
<SystemOriginBanner organizationId={organizationId} ... />
```

バナーが表示するエンティティ（引合・契約）は `getInquiry` / `getContract` 経由で取得され、いずれも `organizationId` で絞り込まれる。テナント分離は維持されている。

---

### [PASS] 承認ワークフロー不変条件 — isCurrentApprover の導出

**対象**: `src/app/(dashboard)/requests/[id]/page.tsx` L60-64

承認/却下ボタンの表示判定に `canApproveWithDelegation` を使用し、委任を含む正確な権限チェックを実施している。

```ts
const isCurrentApprover =
  request.status === "pending" && currentStep !== null
    ? canApproveWithDelegation(currentStep, role, delegations).allowed
    : false;
```

- `delegations` は `getActiveDelegationsForUser` で取得した有効な委任データ（DB から取得済み）
- `canApproveWithDelegation` は `step.approverRole === actorRole`（直接一致）または `delegations` に一致する委任が存在する場合のみ `allowed: true` を返す
- `requestStatus !== "pending"` の場合は `false` に固定

これにより「現在の pending ステップの指定された承認者（または有効な委任受任者）のみがボタンを操作できる」という不変条件を UI レベルで正しく実装している。

---

### [PASS] 承認操作のサーバーサイド二重防御

**対象**: `src/app/actions/requests.ts` (approveRequestAction), `src/application/usecases/approveRequest.ts`

`approveRequest` ユースケースは UI の `isCurrentApprover` フラグとは独立して、usecase 内でも `canApproveWithDelegation` を再チェックしている（L138-144, L174-179）。さらにトランザクション内で delegation と step を再取得して TOCTOU を防止している。監査ログには `stepId`, `stepOrder`, `approverRole`, `delegatedFrom`（委任時）が記録される（L202-218）。

---

### [PASS] タブ認可バイパス防止

**対象**: `src/app/(dashboard)/requests/page.tsx` L29-38

`?tab=all` への直接アクセス時、Server Component でロールチェックを実施してデフォルトタブにフォールバックする。

```ts
if (rawTab === "all") {
  effectiveTab = role === "admin" || role === "manager" ? "all" : defaultTab;
}
```

また「すべて」タブのリンク自体が admin/manager にのみ表示されるため、ユーザーが意図せずアクセスすることもない。`listRequests(organizationId)` で全件取得後に in-memory フィルタリングする設計のため、表示件数の制御のみで権限昇格は発生しない。

---

### [INFO] rejectRequest ユースケースに canApproveWithDelegation チェックなし（既存の問題）

**対象**: `src/application/usecases/rejectRequest.ts`

`approveRequest` ユースケースは `canApproveWithDelegation` で承認者ロールを検証するが、`rejectRequest` にはそれに相当するチェックがない。Server Action (`rejectRequestAction`) は `role === "member"` のみを弾く。これにより admin/manager/finance は直接 Server Action を呼び出せば任意の pending 申請を却下できる。

**ただし、この問題は本変更の導入前から存在している。** 本変更は UI レベルで `isCurrentApprover` によるゲートを追加することで、承認者限定の操作という不変条件を従来より強く実施している。既存ロジックのリグレッションは発生していない。

**推奨**: 別イシューとして `rejectRequest` に `canApproveWithDelegation` チェックを追加することを検討すること（本 PR のスコープ外）。

---

### [INFO] 最終却下パスで却下コメントが監査ログに記録されない（既存の問題）

**対象**: `src/application/usecases/rejectRequest.ts` L156-213

`targetStatus: "rejected"` （最終却下）のパスでは `approvalStepRepository.updateStatus` が呼ばれず、かつ `auditLogRepository.create` の `metadata` にコメントが含まれない。本変更の `ActionButtons` はコメント入力フィールドを表示し、`rejectRequestAction` にコメントを送信するが、`rejectRequest` usecase の最終却下パスはそのコメントを破棄する。

差し戻し（`targetStatus: "revision"`）パスはコメントをステップと監査ログの両方に保存しているため、最終却下との非対称性が生じている。

**ただし、この問題も本変更前から存在している。** `rejectRequest` が `comment` パラメータを受け取ることは既存の API シグネチャであり、最終却下パスで利用しないのは既存の設計上の省略である。新規 UI によってユーザーが入力したコメントが破棄されることがより明確になったため INFO として記録する。

**推奨**: `rejectRequest` の最終却下パスでもステップにコメントを記録し、監査ログ `metadata` にコメント・stepId・approverRole を含めること（本 PR のスコープ外）。

---

## 総評

本変更（承認画面のデザイン適用）はビジネスロジックを変更せず、UI とデータ取得レイヤーの改善に限定されている。審査した範囲では：

- すべての新規データアクセスがテナント `organizationId` でスコープされており、クロステナントアクセスのリスクはない
- `isCurrentApprover` の導出が `canApproveWithDelegation` を正しく使用しており、承認ワークフローの不変条件を維持している（UI レベルは改善、`approveRequest` サーバーサイドは既存のまま二重防御）
- タブ認可バイパスは Server Component で正しく防止されている

指摘した 2 件（[INFO]）はいずれも本変更が導入したものではなく、既存の実装上の不備である。本変更のスコープ（デザイン適用）における不変条件の破壊は確認されなかった。
