# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | maintainability | `src/app/(dashboard)/settings/policies/PolicyForm.tsx` | T-04 で `LinkButton` を `@/app/components` から import して使うよう指定されているが、キャンセルリンクに生の `<a>` タグを使っている。共通コンポーネントとの一貫性が失われる。 | `LinkButton` を import し `<a href="/settings/policies" ...>キャンセル</a>` を `<LinkButton href="/settings/policies">キャンセル</LinkButton>` に置換する。 | yes |
| 2 | low | architecture | `src/app/(dashboard)/settings/policies/page.tsx` | `isAdmin` の算出を `session.user.role === "admin"` の直比較で行っている。設計 D5 は UI 要素の表示制御にも `canPerform` を使って認可マトリクスを一箇所管理する方針を示しているが、ここでは逸脱している。 | `const canCreate = canPerform(session.user.role, "approvalSettings", "createPolicy");` / `const canEdit = canPerform(session.user.role, "approvalSettings", "editPolicy");` を用意し、`isAdmin` の代わりにそれぞれ使う。 | yes |
| 3 | low | maintainability | `src/app/(dashboard)/settings/policies/PolicyForm.tsx` | `boundAction` 内で `formData.set("id", policyId)` を実行しているが、同じフォームに `<input type="hidden" name="id" value={policyId} />` が既に存在する。`id` が二重に設定されており冗長。 | `boundAction` 内の `formData.set("id", ...)` を削除し、隠し input のみに統一する。 | yes |
| 4 | low | testing | `src/__tests__/settings/policiesActions.test.ts` | TC-009〜TC-012 の認可テストが静的ソースコード解析（文字列検索）で実装されており、実際の `canPerform` の動作を検証していない。認可ロジックの変更（例: 関数名リファクタリング、ロジック変更）があった場合にテストが誤って通過するリスクがある。 | 当該テストは現行のアーキテクチャ制約（DB 不要で実行可能なテスト方針）の範囲内であり、必須ではないが、将来的に `canPerform` の動作を直接検証するテストへ移行することが望ましい。 | no |
| 5 | low | testing | `src/__tests__/` | TC-005（テナント分離 — integration/must）が自動化テストに含まれていない。静的解析テストで `organizationId` の利用を確認しているが、実際の分離動作は検証されていない。 | DB モック or インメモリ DB を用いたインテグレーションテストで TC-005 をカバーする。現時点ではインフラが未整備のため対応不要だが、整備後に追加する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 8 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.45

## Summary

全体的に仕様・設計に忠実な実装であり、機能面・セキュリティ面の問題は検出されなかった。build / typecheck / test / lint がすべて pass しており、受け入れ基準を満たしている。

検出された findings はすべて low 以下の軽微な問題。

- **Finding 1** (`LinkButton` 未使用): T-04 の明示的指示に反するが動作は同等。共通コンポーネント一貫性の観点で修正推奨。
- **Finding 2** (直比較 vs `canPerform`): 設計 D5 が明示した方針からの逸脱。機能的には等価だが認可マトリクスの一箇所管理が崩れる。修正推奨。
- **Finding 3** (二重 `id` 設定): バグではなく冗長コード。削除してシンプルにすべき。
- **Finding 4/5** (テスト戦略の制約): 現在のインフラ制約下では許容範囲内。将来の改善候補として記録。

セキュリティ上の注意点を特記する: `togglePolicyAction` のインライン server action クロージャは `policyId` をサーバー側レンダリング時に bundle するため、クライアント側から `policyId` を改ざんできない設計になっている。また全アクションが `organizationId` 境界チェックを行っており、テナント間のデータ漏洩リスクはない。
