# Regression Gate Result — Iteration 001

- **verdict**: approved

## Summary

Both findings from the review ledger are confirmed fixed in the current branch.

## Finding Verification

### TC-001: sourceLabels に email/agent_service が含まれる

- **File**: `src/app/(dashboard)/labels.ts`
- **Status**: ✅ Fixed

`sourceLabels` に `email: "メール"` と `agent_service: "仲介サービス"` が追加されている。

```ts
export const sourceLabels: Record<string, string> = {
  web: "Web",
  phone: "電話",
  email: "メール",         // 追加済み
  referral: "紹介",
  agent_service: "仲介サービス",  // 追加済み
  exhibition: "展示会",
  other: "その他",
};
```

対応テスト（`src/__tests__/static/projectStructure.test.ts` — `TC-001: labels.ts の sourceLabels に email と agent_service が含まれる`）も追加済み。

---

### TC-007: sourceOptions が 8 要素かつ正確な順序で定義されている

- **File**: `src/app/(dashboard)/inquiries/new/InquiryForm.tsx`
- **Status**: ✅ Fixed

`sourceOptions` に `email` と `agent_service` が追加され、要求順序 `['', 'web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other']` が満たされている。

```ts
const sourceOptions = [
  { value: "", label: "選択してください" },
  { value: "web", label: "Web" },
  { value: "phone", label: "電話" },
  { value: "email", label: "メール" },           // 追加済み
  { value: "referral", label: "紹介" },
  { value: "agent_service", label: "仲介サービス" }, // 追加済み
  { value: "exhibition", label: "展示会" },
  { value: "other", label: "その他" },
];
```

対応テスト（`src/__tests__/static/projectStructure.test.ts` — `TC-007: InquiryForm の sourceOptions が 8 要素かつ正確な順序で定義されている`）も追加済み。

---

## Findings

なし。リグレッションは検出されなかった。
