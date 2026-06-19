# Domain-Invariants Review — template-form-definition — iteration 001

- **verdict**: needs-fix
- **iteration**: 001

## Scope

**Purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

**Diff scope**: 46 files changed, 3216 insertions(+), 571 deletions(-)

---

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | correctness | `src/infrastructure/schema.ts` + `drizzle/0006_template_form_definition.sql` + `src/application/usecases/deleteTemplate.ts` | `requests.template_id` FK が `ON DELETE no action` で追加された結果、承認済み/却下済みの申請が1件でも存在するテンプレートは永続的に削除不能になる。`deleteTemplate` の `existsPendingByTemplateId` チェックは pending のみを見るため「pending なし → 削除試行 → FK 違反で失敗」という経路が発生し、ユーザーに不親切な DB エラーが返される。ビジネス要件「承認待ちリクエストがある場合のみ削除不可」と FK の制約（すべてのリクエストが対象）が矛盾している。 | 以下いずれかで修正する。(A) `existsPendingByTemplateId` を「templateId FK で直接参照しているリクエストが存在するか」に置き換えてすべての参照をブロック対象とし、エラーメッセージを「このテンプレートを使用した申請が存在するため削除できません」に変更する。または (B) スキーマの FK を `ON DELETE SET NULL` に変更し、テンプレート削除時に関連リクエストの `templateId` を NULL にクリアする（テンプレートと申請の関係は audit_logs.metadata に保存済みのため監査証跡は維持される）。より低コストな (A) を推奨。 | yes |
| 2 | low | correctness | `src/infrastructure/schema.ts` | `requests.template_id` FK は `approval_templates(id)` のみを参照しており、組織横断テンプレート参照を DB レベルで防止しない。アプリケーション層（`createRequestAction` → `findById(templateId, orgId)` + `createRequest` → `findById(templateId, orgId)`）で二重チェックされているため現時点でセキュリティ上の脆弱性はないが、DB 制約の外側で保証されている点は注記に値する。 | 現状は application 層の二重チェックで十分に緩和されているため必須修正ではない。参考: PostgreSQL では複合 FK（`template_id, organization_id`）は `approval_templates` 側に `(id, organization_id)` unique 制約が必要なため容易ではなく、shared-schema マルチテナント設計の既知の制限。 | no |
| 3 | info | correctness | `src/application/usecases/createRequest.ts` | 全ステップが条件付きかつすべての条件が未充足の場合、`filterStepsByCondition` が空配列を返し承認ステップ0件の申請が作成される。`approveRequest` の後方互換パス（`steps.length === 0`）が適用され直接 "approved" 遷移となる。これは既存の後方互換動作であり、本変更の導入した問題ではない。シードデータはすべて条件なしの manager ステップを含むため実運用上のリスクは低い。 | 管理者が誤って全条件付きテンプレートを作成した場合のリスクがある。将来対応として `createTemplate` / `updateTemplate` でステップに少なくとも1つの条件なしステップを要求するバリデーションを追加することを推奨（スコープ外のため今回は対応不要）。 | no |

---

## Invariant-by-Invariant Verification

### テナント分離

| 確認項目 | 結果 | 根拠 |
|---------|------|------|
| `approvalTemplateRepository.findById` が `(id, organizationId)` の AND 条件で検索 | ✅ PASS | `and(eq(approvalTemplates.id, id), eq(approvalTemplates.organizationId, organizationId))` |
| `approvalTemplateRepository.findByOrganization` が `organizationId` でフィルタ | ✅ PASS | `eq(approvalTemplates.organizationId, organizationId)` |
| `approvalTemplateRepository.updateById` / `deleteById` が `organizationId` でスコープ制限 | ✅ PASS | AND 条件で組織チェック |
| `createRequestAction` が `organizationId` をセッションから取得（フォームデータから取得しない） | ✅ PASS | `session.user.organizationId` のみ使用、`formData.get("organizationId")` なし |
| `createRequest` usecase がテンプレート取得時に `organizationId` でスコープ制限 | ✅ PASS | `findById(data.templateId, data.organizationId)` |
| `listTemplatesForRequestAction` が認証チェック後に組織スコープのテンプレートを返す | ✅ PASS | セッション認証 + `findByOrganization(session.user.organizationId)` |
| `existsPendingByTemplateId` が `auditLogs.organizationId` と `requests.organizationId` 両方でフィルタ | ✅ PASS | double-tenant-check により cross-tenant audit log 参照を防止 |
| `requestRepository.findAllWithStepsByOrganization` の JOIN が organizationId 条件を持つ | ✅ PASS | `eq(approvalSteps.organizationId, requests.organizationId)` で approvalSteps もスコープ制限 |

### 監査ログの完全性

| 操作 | 監査ログ | トランザクション内 | 備考 |
|-----|---------|-------------|------|
| `request.create` | ✅ `action: "request.create"`, `metadata: { templateId, templateName }` | ✅ | `amount` は削除（設計上意図的）、`formData` は非記録（サイズ最適化・immutable のため targetId から参照可） |
| `request.submit` | ✅ 変更なし | ✅ | |
| `approval_step.approve` | ✅ 変更なし（`stepId`, `stepOrder`, `approverRole`, `delegatedFrom` 含む） | ✅ | |
| `request.approve` | ✅ 変更なし | ✅ | |
| `request.reject` | ✅ 変更なし | ✅ | |
| `request.resubmit` | ✅ 変更なし | ✅ | |
| `template.create` | ✅ `metadata: { name }` | ✅ | |
| `template.update` | ✅ `metadata: { name }` | ✅ | |
| `template.delete` | ✅ 変更なし | ✅ | |

**注**: `formData` が `request.create` の監査ログに含まれないことについて — formData は `requestRepository.create` で DB に保存され、その後 `updateStatus` のみが更新対象のため immutable。`targetId` → `requests.id` で常に参照可能。監査証跡の完全性は維持されている。

### 承認ワークフローの不変条件

| 不変条件 | 結果 | 根拠 |
|---------|------|------|
| 状態遷移バリデーション（`validateTransition`）がすべてのワークフロー操作で呼ばれる | ✅ PASS | `submitRequest`, `approveRequest`, `rejectRequest`, `resubmitRequest` すべてで確認 |
| 楽観ロック（`version`）による並行更新防止 | ✅ PASS | `updateStatus` で `version` 条件、`approvalStepRepository.updateStatus` も同様 |
| トランザクション内での TOCTOU 防止（`approveRequest`） | ✅ PASS | TX 内で steps と delegations を再取得して再バリデーション |
| `filterStepsByCondition` が pure function（副作用なし） | ✅ PASS | `Record<string, unknown>` を参照のみ、書き換えなし |
| 承認ステップはリクエスト作成時にスナップショットで生成（テンプレート変更の影響なし） | ✅ PASS | `filteredSteps` が TX 開始前に計算され、TX 内で immutable な approval_steps として生成 |
| `deleteTemplate` が使用中テンプレートの削除を防止 | ⚠️ PARTIAL | pending チェックは動作するが、approved/rejected 申請参照時は FK エラーで別経路失敗（Finding #1） |
| `canApproveWithDelegation` の inactive delegation 無視 | ✅ PASS | 変更なし |

### 依存方向

| 確認項目 | 結果 |
|---------|------|
| `domain/models/` が `infrastructure/` を import しない | ✅ PASS |
| `domain/services/approvalStepService.ts` が `infrastructure/` を import しない | ✅ PASS |
| `evaluateStepCondition` / `filterStepsByCondition` が `domain/services/index.ts` から export | ✅ PASS |
| `templateSelectionService.ts` が存在しない | ✅ PASS |
| `domain/services/index.ts` に `selectTemplate` export が存在しない | ✅ PASS |

---

## Summary

テナント分離・監査ログ完全性・承認ワークフロー不変条件の大部分は正しく維持されている。`evaluateStepCondition` / `filterStepsByCondition` の pure function 実装、組織スコープを一貫してかけたリポジトリ設計、トランザクション内監査ログ生成、いずれも問題ない。

**修正が必要な点**:

Finding #1（medium）: `requests.templateId` FK（`ON DELETE no action`）と `deleteTemplate` の `existsPendingByTemplateId`（pending のみチェック）が矛盾している。本番運用で1件でも申請が作成されたテンプレートは `deleteTemplate` で削除できなくなり、DB エラーが返される。`existsPendingByTemplateId` の判定ロジックをFK の意図に合わせるか、FK を `ON DELETE SET NULL` に変更することで整合させる必要がある。
