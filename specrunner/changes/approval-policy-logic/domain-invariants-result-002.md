# Domain Invariants Review Result — approval-policy-logic — iter 2

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    invariants are upheld; no violations found
  - needs-fix:   one or more invariant violations that must be corrected
  - escalation:  unresolvable conflicts or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
-->

- **verdict**: approved

## iter-1 Findings の修正確認

| # iter-1 | 重要度 | 修正状況 | 確認箇所 |
|----------|--------|----------|---------|
| #1 HIGH / audit-log-integrity（templateId 欠落） | HIGH | ✅ **FIXED** | `updateInquiryStatus.ts:127` — `metadata: { originType: "system", policyId: policy.id, templateId: template.id }` に `templateId` が追加された。`existsPendingByTemplateId` がシステム生成リクエストを正しく検出できる状態になっている |
| #2 MEDIUM / audit-log-completeness（引合側監査ログ欠落） | MEDIUM | ✅ **FIXED** | `updateInquiryStatus.ts:131-146` — `action: "inquiry.conversionPending"`, `targetType: "inquiry"`, `targetId: data.inquiryId` の監査ログが同一トランザクション内で記録されている。`fromStatus`, `pendingApprovalRequestId`, `policyId` の metadata が揃っており、引合 ID 起点の追跡が可能になっている |
| #3 LOW / observability（テンプレート不在のサイレントフォールバック） | LOW | ❌ 未修正 | `updateInquiryStatus.ts:176` — コメント `"フォールバック（fall through）"` のみで `console.warn` が追加されていない（後述 finding #1） |
| #4 LOW / concurrency（TOCTOU） | LOW | ❌ 設計許容として残存 | `updateInquiryStatus.ts:50-56` — 設計判断 D4 による許容済みのまま（後述 finding #2） |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | observability | `src/application/usecases/updateInquiryStatus.ts:79-176` | iter-1 finding #3 の残存。`approvalTemplateRepository.findById` が null を返した場合（ポリシーが参照するテンプレートが存在しない場合）に、警告ログなしで従来フロー（Deal 直接生成）へサイレントフォールバックする。データ整合性問題（孤立ポリシー）の発見が遅れ、なぜポリシーゲートが発動しなかったかを運用で診断できない。フロー自体は安全に動作する。 | `if (template)` ブロック直下の fallthrough 前に `console.warn("[updateInquiryStatus] Template not found for policy, falling back to direct deal creation", { policyId: policy.id, templateId: policy.templateId })` を追加する。 |
| 2 | LOW | concurrency | `src/application/usecases/updateInquiryStatus.ts:50-56` | iter-1 finding #4 の残存。`findByOriginTriggerEntity`（重複チェック）と `requestRepository.create`（承認リクエスト作成）が異なるトランザクション境界にまたがっており、同一引合への同時案件化操作で重複 pending system リクエストが生成される TOCTOU 競合条件がある。低頻度かつ設計判断 D4 で許容済み。 | 将来タスクとして DB 部分ユニーク制約 `UNIQUE (organization_id, origin_trigger_action, origin_trigger_entity_id) WHERE origin_type = 'system' AND status IN ('draft', 'pending')` の追加を検討する。本 PR スコープ外として許容。 |

## テナント分離レビュー

iter-1 から変更のあった追加実装（`inquiry.conversionPending` 監査ログ等）を含めて再確認した。テナント分離は全経路で正しく保たれている。

| 確認ポイント | ファイル | 結果 |
|-------------|---------|------|
| `findActiveByTriggerAction` に organizationId | `approvalPolicyRepository.ts:105-121` | ✅ WHERE 句に `eq(approvalPolicies.organizationId, organizationId)` あり |
| `findByOriginTriggerEntity` に organizationId | `requestRepository.ts:168-187` | ✅ WHERE 句に `eq(requests.organizationId, organizationId)` あり |
| `requestRepository.create` に organizationId | `updateInquiryStatus.ts:88-95` | ✅ `organizationId: data.organizationId` を明示的に設定 |
| `approvalStepRepository.createMany` に organizationId | `updateInquiryStatus.ts:107-115` | ✅ 各ステップに `organizationId: data.organizationId` を設定 |
| `approvalTemplateRepository.findById` に organizationId | `updateInquiryStatus.ts:75-77` | ✅ 第 2 引数として `data.organizationId` を渡している |
| `auditLogRepository.create`（承認リクエスト側）に organizationId | `updateInquiryStatus.ts:119-129` | ✅ `organizationId: data.organizationId` あり（`templateId` も修正済み） |
| `auditLogRepository.create`（引合側）に organizationId | `updateInquiryStatus.ts:131-146` | ✅ `organizationId: data.organizationId` あり |
| `handleApprovalCompleted` でのテナント引き継ぎ | `approvalCompletedHandler.ts:26-34` | ✅ `event.organizationId` を `updateInquiryStatus` に渡している |
| `approveRequest` の全リポジトリ呼び出し | `approveRequest.ts` | ✅ 全呼び出しで `organizationId` を渡している |
| `evaluatePolicies` の null ガード（conditionOperator/conditionValue） | `evaluatePolicies.ts:27-33` | ✅ 防御的 null チェックを追加済み（code-review finding #1 修正済み） |

## 承認ワークフロー不変条件レビュー

| 不変条件 | 実装確認 | 結果 |
|---------|---------|------|
| ポリシー合致時に Deal が生成されない | `updateInquiryStatus.ts:82-162`: ポリシー合致パス内に `dealRepository.create` 呼び出しなし | ✅ |
| ポリシー合致時に引合ステータスが変更されない | `updateInquiryStatus.ts:155-163`: `inquiryRepository.updateStatus` がポリシー合致パスで呼ばれない | ✅ |
| `skipPolicyCheck=true` で無限ループしない | `updateInquiryStatus.ts:48`: `if (!options?.skipPolicyCheck)` でポリシー評価を条件付き実行。ハンドラから `true` を渡している | ✅ |
| manual origin では ApprovalCompleted が発行されない | `approveRequest.ts:90-103, 292-305`: `result.originType === "system"` 条件チェックあり | ✅ |
| 全ステップ承認完了時のみ ApprovalCompleted 発行 | `approveRequest.ts:253-305`: `isAllApproved(updatedSteps)` チェック後に発行 | ✅ |
| 単一承認フロー（ステップなし）でも originType チェックあり | `approveRequest.ts:90-104`: ステップなしパスでも同様のチェック | ✅ |
| 重複承認リクエスト防止 | `updateInquiryStatus.ts:50-56`: `findByOriginTriggerEntity` で pending 確認 | ✅（finding #2: TOCTOU 残存は許容済み） |
| テンプレート不在時の従来フローフォールバック | `updateInquiryStatus.ts:79-176`: `if (template)` で null ガード | ✅（finding #1: サイレントログのみ） |
| 非同期ハンドラのテナント分離 | `approvalCompletedHandler.ts`: `event.organizationId` を使用 | ✅ |
| 監査ログへの templateId 記録（テンプレート削除ガード） | `updateInquiryStatus.ts:127`: `metadata` に `templateId: template.id` あり | ✅ **（iter-1 HIGH 修正確認）** |
| 引合側の承認待ち遷移が audit trail に記録される | `updateInquiryStatus.ts:131-146`: `inquiry.conversionPending` を同一 TX 内で記録 | ✅ **（iter-1 MEDIUM 修正確認）** |

## 総評

iter-1 で指摘した HIGH（templateId 欠落）および MEDIUM（引合側監査ログ欠落）の 2 件が正しく修正された。

- `existsPendingByTemplateId` がシステム生成リクエストを検出できるようになり、テンプレート削除ガードの機能が回復した。
- ポリシーゲート発動時の引合側 audit trail が `inquiry.conversionPending` として同一トランザクション内で記録されるようになり、引合 ID 起点の完全な追跡が可能になった。

残存する LOW 所見は 2 件（サイレントフォールバック・TOCTOU）で、いずれも iter-1 から指摘済みかつ設計上許容された既知事項。承認ワークフローの不変条件（テナント分離・監査完全性・无限ループ防止・案件非生成保証）はすべて維持されており、**approved** とする。
