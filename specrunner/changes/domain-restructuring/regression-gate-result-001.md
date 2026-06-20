# Regression Gate Result — Iteration 001

- **verdict**: needs-fix
- **checked-at**: 2026-06-21
- **findings-total**: 10
- **still-fixed**: 9
- **regressions**: 0
- **not-fixed**: 1

---

## Per-Finding Status

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | HIGH | findByDeal が organizationId をクエリで使用していない | fixed |
| 2 | MEDIUM | コメントに「商談化」が残存（InquiryActions.tsx:31） | fixed |
| 3 | MEDIUM | wonDeal.estimateRequestId が経費申請リクエストを参照 | fixed |
| 4 | LOW | テスト名・コメントに旧用語 internal_approval が残存 | fixed |
| 5 | LOW | updateMeetingSchema.inquiryId が必須のまま（案件直紐づき商談の更新が不可） | fixed |
| 6 | MEDIUM | deleteByDealAndContact がテナント分離を保証しない | fixed |
| 7 | LOW | updateMeetingSchema.inquiryId が必須のまま（deal-only 商談の更新が不可） | fixed |
| 8 | LOW | テスト名に旧用語 internal_approval が3箇所残存 | fixed |
| 9 | LOW | deals.contractType コメントに旧型制約 contract が残存 | fixed |
| 10 | MEDIUM | dealContactRepository.create にテナント検証がない | not-fixed |

---

## Detail: Fixed Findings

**F-01 [HIGH] findByDeal organizationId** (`dealContactRepository.ts:41`)
`findByDeal` は `clientContacts` → `clients` の inner join を経由し、WHERE 句に `eq(clients.organizationId, organizationId)` を含む（行 50-54）。テナント分離が正しく実装されている。

**F-02 [MEDIUM] InquiryActions.tsx コメント「商談化」** (`InquiryActions.tsx:31`)
コメントが「案件化ボタンが非表示になる可能性があるが、対応中→見送りは可能」に修正済み。「商談化」の文字列なし。TC-048 は満たされている。

**F-03 [MEDIUM] wonDeal.estimateRequestId** (`seed.ts`)
`wonDeal.estimateRequestId` は `estimateApprovalRequest.id`（行 644）を参照しており、経費申請の `approvedRequest` は不使用。T-13 相当の修正が完了している。

**F-04/F-08 [LOW] テスト名の internal_approval** (`dealManagement.test.ts:61`)
テスト名が「estimate_approval 時の見積承認リクエスト作成」（行 61）および「TC-008: templateId が未指定の場合に estimate_approval 遷移が…」（行 76）に修正済み。ファイル内に `internal_approval` の残存なし。

**F-05/F-07 [LOW] updateMeetingSchema.inquiryId が必須** (`meetings.ts:172`)
`inquiryId: z.string().uuid("引き合いIDが不正です").optional()` と `.optional()` が付与されており、deal-only 商談の更新バリデーションが通過できる。

**F-06 [MEDIUM] deleteByDealAndContact テナント分離** (`dealContactRepository.ts:63`)
`deals` テーブルを inner join し WHERE 句に `eq(deals.organizationId, organizationId)` を含む2ステップ実装（select→delete）が正しく実装されている。

**F-09 [LOW] contractType コメント** (`schema.ts:319`)
コメントが `"quasi_delegation" | "fixed_price" | "ses"` に更新済み。`contract` の文字列なし。

---

## Detail: Not-Fixed Finding

### F-10 [MEDIUM] dealContactRepository.create にテナント検証がない

- **File**: `src/infrastructure/repositories/dealContactRepository.ts:17`
- **Resolution**: fixable
- **Status**: not-fixed

**現状**: `create` 関数のシグネチャは `data: { dealId, contactId, role }` のみで `organizationId` パラメータがない。INSERT 前に `dealId` が呼び出し元の organizationId に属するかを検証するロジックがない。

同ファイルの `findByDeal`（clients.organizationId 経由）・`deleteByDealAndContact`（deals.organizationId 経由）は自己完結でテナント検証を実装しているが、`create` のみが未対処のまま。

`projectStructure.test.ts` の Tenant isolation — deal ブロックにも `dealContactRepository.create` の `organizationId` テストが存在しない（行 1136 は `findByDeal` のみ）。

**修正方針**: `create` のシグネチャに `organizationId: string` を追加し、INSERT 前に `deals` テーブルから `organizationId` 一致を確認する（`deleteByDealAndContact` の先行実装と同パターン）。`projectStructure.test.ts` の Tenant isolation — deal ブロックに `dealContactRepository.create includes organizationId` テストを追加する。
