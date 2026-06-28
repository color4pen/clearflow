# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ | 全 8 タスク（T-01〜T-08）のチェックボックスが [x] 完了 |
| design.md | ✅ | D1〜D5 すべての設計判断が実装に反映されている |
| spec.md | ✅ | 全 Requirements（SHALL/MUST）および全 Scenarios が実装で満たされている |
| request.md | ✅ | 全 5 件の受け入れ基準が実装・テスト・検証で満たされている |

---

## Detail: tasks.md

| Task | 内容 | 状態 |
|------|------|------|
| T-01 | `requests.ts` に `canPerform` import を追加 | ✅ L18: `import { canPerform } from "@/domain/authorization"` |
| T-02 | `approveRequestAction` のインライン判定を canPerform に置換 | ✅ L217: `if (!canPerform(session.user.role, "approval", "approve"))` |
| T-03 | `rejectRequestAction` のインライン判定を canPerform に置換 | ✅ L323: `if (!canPerform(session.user.role, "approval", "reject"))` |
| T-04 | `bulkApproveAction` のインライン判定を canPerform に置換 | ✅ L287: `if (!canPerform(session.user.role, "approval", "approve"))` |
| T-05 | `updateUserRole` に最後の admin ガードを追加 | ✅ L36–43: `currentUser.role === "admin" && data.newRole !== "admin"` → `findByOrganization` → `otherAdmins.length === 0` → reject |
| T-06 | 承認系アクションの canPerform 使用を静的テストで固定 | ✅ `src/__tests__/actions/approvalRoleCheck.test.ts`（新規、5 テストケース） |
| T-07 | 最後の admin ガードをテストで固定 | ✅ `src/__tests__/usecases/userManagement.test.ts`（5 テストケース追加） |
| T-08 | ビルド・型チェック検証 | ✅ verification-result.md: build/typecheck/test/lint 全 phase passed |

---

## Detail: design.md

| Decision | 実装箇所 | 適合 |
|----------|----------|------|
| D1: 承認系アクションを canPerform に統一 | `requests.ts` L18（import）、L217（approve）、L287（bulk）、L323（reject） | ✅ |
| D2: エラーメッセージ `"権限がありません"` を維持 | L218、L288、L324 でメッセージ不変 | ✅ |
| D3: 最後の admin ガードを usecase 層（`updateUserRole`）に配置 | `updateUserRole.ts` L36–43 | ✅ |
| D4: `findByOrganization` を利用（新 repository メソッド不要） | `updateUserRole.ts` L37: `userRepository.findByOrganization(data.organizationId)` | ✅ |
| D5: ガード評価順序（自己降格 → 存在確認 → 最後の admin → トランザクション） | L20 → L25–31 → L36–43 → L46 の順序で実装 | ✅ |

`delegations.ts` および `authorization.ts` は design.md の「変更しないファイル」通り未変更。✅

---

## Detail: spec.md

### Requirement: approveRequestAction は canPerform 経由でロールゲートを行う（SHALL）
- 実装: `requests.ts` L217 `if (!canPerform(session.user.role, "approval", "approve"))` ✅
- Scenario「admin が承認実行できる」: `canPerform("admin", "approval", "approve")` → RBAC `ADMIN_MANAGER_FINANCE` に含まれる → true → usecase 実行 ✅
- Scenario「member が拒否される」: → false → `{ success: false, message: "権限がありません" }` ✅

### Requirement: rejectRequestAction は canPerform 経由でロールゲートを行う（SHALL）
- 実装: `requests.ts` L323 `if (!canPerform(session.user.role, "approval", "reject"))` ✅
- Scenario「finance が却下実行できる」: `canPerform("finance", "approval", "reject")` → true ✅
- Scenario「member が拒否される」: → false → `{ success: false, message: "権限がありません" }` ✅

### Requirement: bulkApproveAction は canPerform 経由でロールゲートを行う（SHALL）
- 実装: `requests.ts` L287 `if (!canPerform(session.user.role, "approval", "approve"))` ✅
- Scenario「manager が一括承認実行できる」: `canPerform("manager", "approval", "approve")` → true ✅
- Scenario「member が拒否される」: → false → `{ success: false, message: "権限がありません" }` ✅

### Requirement: 組織で最後の admin は降格できない（SHALL / MUST）
- 実装: `updateUserRole.ts` L36–43 ✅
- Scenario「最後の admin を降格しようとすると拒否される」: `otherAdmins.length === 0` → `{ ok: false, reason: "組織に最低1人の管理者が必要です" }` ✅
- Scenario「他に admin がいれば降格できる」: `otherAdmins.length > 0` → ガード非発動 → トランザクション実行 ✅
- Scenario「admin → admin の変更はガード不要」: `data.newRole !== "admin"` が false → ガードスキップ ✅

### Requirement: 自己降格ガードは引き続き機能する（SHALL / MUST）
- 実装: `updateUserRole.ts` L20–21（最後の admin ガードより前） ✅
- Scenario「actorId === targetUserId」: → `{ ok: false, reason: "自分自身のロールは変更できません" }` ✅

### Requirement: requests.ts は canPerform を @/domain/authorization から import する（SHALL / MUST）
- 実装: `requests.ts` L18 ✅
- Scenario「requests.ts が canPerform を使用している」: ✅

---

## Detail: request.md（受け入れ基準）

| 基準 | 実装 | テスト | 適合 |
|------|------|--------|------|
| 承認/却下/一括承認が canPerform 経由、admin/manager/finance 可・member 不可 | ✅ | ✅ `approvalRoleCheck.test.ts` | ✅ |
| 最後の admin 降格で拒否、他 admin 存在時は降格可をテストで固定 | ✅ | ✅ `userManagement.test.ts` | ✅ |
| 自己降格ガードが引き続き機能することをテストで確認 | ✅ | ✅ `userManagement.test.ts` | ✅ |
| 依存方向 actions → usecases → domain を遵守 | ✅ | — | ✅ |
| 既存テスト無変更で `bun test` green / `typecheck` green / `bun run build` 成功 | — | ✅ verification-result.md（1251 pass, 0 fail） | ✅ |

---

## Prior Review Summary

- **Verification**: build / typecheck / test / lint 全 phase passed（verification-result.md）
- **Code Review**: approved（score 9.75/10）。Low-severity 指摘 2 件はいずれも Fix: no（conformance 判定に影響しない）
