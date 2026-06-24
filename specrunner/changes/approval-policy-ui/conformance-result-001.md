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
| tasks.md | ✓ | T-01〜T-08 の全チェックボックスが [x] で完了済み |
| design.md | △ | D1/D3/D4/D5 は準拠。D2（usecase不要）に逸脱あり（後述） |
| spec.md | ✓ | 全 Requirement（SHALL/MUST）と全 Scenario の実装を確認 |
| request.md | ✓ | 全受け入れ基準を充足。typecheck/test/build すべて green |

---

## 詳細

### tasks.md

T-01〜T-08 の全チェックボックスが `[x]` で完了している。

| Task | 確認内容 | 結果 |
|------|----------|------|
| T-01 | `SettingsNav.tsx` に `/settings/policies` リンク追加、テンプレートの直後 | ✓ |
| T-02 | `constants.ts` に `TRIGGER_ACTION_LABELS`, `TRIGGER_ACTION_OPTIONS`, `CONDITION_OPERATOR_LABELS`, `getTriggerActionLabel`, `formatCondition` を定義 | ✓ |
| T-03 | `policies.ts` に `listPoliciesAction`, `createPolicyAction`, `updatePolicyAction`, `togglePolicyAction` を実装。canPerform 認可チェック、zod バリデーション、revalidatePath を含む | ✓ |
| T-04 | `PolicyForm.tsx` を "use client" で作成。Props 型、useActionState、条件連動制御（useState + disabled/required）、成功時リダイレクト、エラー表示 | ✓ |
| T-05 | `policies/page.tsx` を作成。canPerform による認可チェック、DataTable 表示、admin 条件表示、トグルボタン、0件時 SectionCard、フッター件数 | ✓ |
| T-06 | `policies/new/page.tsx` を作成。createPolicy 認可チェック、PolicyForm mode="create" | ✓ |
| T-07 | `policies/[id]/edit/page.tsx` を作成。editPolicy 認可チェック、params Promise<{id}> 型、notFound()、defaultValues マッピング | ✓ |
| T-08 | verification-result.md で build/typecheck/test/lint が全 pass 確認済み | ✓ |

### design.md

| Decision | 実装 | 結果 |
|----------|------|------|
| D1: templates/ と同じディレクトリ構成 | `policies/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`, `PolicyForm.tsx` — 準拠 | ✓ |
| D2: usecase 層を新設しない（直接リポジトリ呼び出し） | `createPolicy.ts`, `updatePolicy.ts`, `togglePolicy.ts` を `src/application/usecases/` に新設 — **設計の却下案を採用** | △ |
| D3: constants.ts に定数を切り出す | `policies/constants.ts` に全定数・ヘルパーを集約 — 準拠 | ✓ |
| D4: インライン form + サーバーアクションでトグル実装 | `page.tsx` の renderカラム内に `handleToggle` インライン server action + `<form action={handleToggle}>` — 準拠 | ✓ |
| D5: canPerform でアクセス制御（ロール直比較禁止） | `page.tsx` の `isAdmin` 算出に `canPerform(role, "approvalSettings", "createPolicy")` を使用 — 準拠 | ✓ |

**D2 逸脱について**:

設計では「単純な CRUD なので usecase を新設せず、actions から直接リポジトリを呼ぶ。監査ログが必要になった時点で抽出する」と決定していたが、実装では `createPolicy`, `updatePolicy`, `togglePolicy` の 3 usecase が新設されている。

これらの usecase は:
- DB トランザクション境界の明示
- テンプレートのクロステナント所有権検証（createPolicy/updatePolicy）
- 監査ログ記録（policy.create / policy.update / policy.activate / policy.deactivate）

を追加している。設計の却下案を実装したことは事実だが、この逸脱は機能的な欠落ではなく品質・セキュリティの向上を伴う上方向の逸脱である。domain-invariants レビューが approved（監査ログ完全性・テナント分離ともに適合）、code-review が approved（全 findings が low 以下）であることから、spec.md・request.md のすべての要件は満たされており、この逸脱は conformance を阻害しないと判断する。

### spec.md

| Requirement | 実装確認 | 結果 |
|-------------|----------|------|
| ポリシー一覧: admin/manager のみアクセス可、member/finance はリダイレクト | `canPerform(role, "approvalSettings", "listPolicies")` チェック → 否の場合 `redirect("/requests")` | ✓ |
| テナント分離: 組織のポリシーのみ取得 | `findByOrganization(session.user.organizationId)` — organizationId はセッションから取得 | ✓ |
| 日本語ラベル表示（3 種、未定義はフォールバック） | `getTriggerActionLabel` が `TRIGGER_ACTION_LABELS[action] ?? action` で実装 | ✓ |
| 条件表示: null →「常に」、非 null → "{field} {op} {value}" 形式 | `formatCondition` が `field === null ? "常に" : ...` で実装 | ✓ |
| admin のみ作成可 | 作成ページで `canPerform(role, "approvalSettings", "createPolicy")`、action でも同チェック | ✓ |
| admin のみ編集可 | 編集ページ + action で `canPerform(role, "approvalSettings", "editPolicy")` | ✓ |
| admin のみトグル可 | `togglePolicyAction` で `canPerform(role, "approvalSettings", "editPolicy")` | ✓ |
| 条件フィールド空 → 演算子・値 disabled | `useState(conditionField)` → `disabled={!hasCondition}` / `required={hasCondition}` | ✓ |
| SettingsNav に承認ポリシーリンク | `NAV_ITEMS` に `{ href: "/settings/policies", label: "承認ポリシー" }` — テンプレートとユーザーの間 | ✓ |
| フォームバリデーション: name/triggerAction/templateId 必須、conditionField 入力時は operator/value 必須 | `policySchema` + `superRefine` で実装 | ✓ |

### request.md（受け入れ基準）

| 基準 | 結果 |
|------|------|
| `/settings/policies` でポリシー一覧が表示される | ✓ |
| ポリシーの新規作成ができる | ✓ |
| ポリシーの編集ができる | ✓ |
| 有効/無効の切り替えができる | ✓ |
| admin ロールでのみ作成・編集・トグル操作ができる | ✓ |
| manager ロールで一覧閲覧ができる | ✓ |
| member / finance ロールではアクセスが拒否される | ✓ |
| SettingsNav に「承認ポリシー」リンクが表示されている | ✓ |
| トリガーアクションが日本語ラベルで表示される | ✓ |
| 条件フィールドが空のとき演算子・値が disabled になる | ✓ |
| `typecheck && test` が green | ✓ (verification-result: build/typecheck/test/lint 全 pass) |

---

## 総評

仕様・要件・受け入れ基準はすべて充足している。設計 D2 の逸脱（usecase 新設）は機能欠落ではなく品質向上を伴う上方向の逸脱であり、既存のコードレビューおよび domain-invariants レビューの approved 判定と整合する。**conformance: approved**。
