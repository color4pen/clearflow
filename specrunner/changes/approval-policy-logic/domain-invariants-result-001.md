# Domain Invariants Review Result — approval-policy-logic — iter 1

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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | audit-log-integrity | `src/application/usecases/updateInquiryStatus.ts:119-129` | システム生成承認リクエストの監査ログ metadata に `templateId` が欠落している。`auditLogRepository.create` で記録される metadata は `{ originType: "system", policyId: policy.id }` のみであり、`templateId` が含まれない。`deleteTemplate` ユースケースが利用する `requestRepository.existsPendingByTemplateId` は `auditLogs.metadata->>'templateId' = ${templateId}` でクエリを実行するため、templateId のない監査ログが対象のリクエストを検出できない。結果として、ポリシー経由で生成された system 起因の pending リクエストが存在する状態でもテンプレート削除が成功してしまい、承認ワークフローの参照整合性が壊れる。spec-review-result-003 finding #2 で MEDIUM として指摘されていたが実装で未反映。 | `metadata: { originType: "system", policyId: policy.id }` を `metadata: { originType: "system", policyId: policy.id, templateId: template.id }` に変更し、`existsPendingByTemplateId` がシステム生成リクエストを正しく検出できるようにする。 |
| 2 | MEDIUM | audit-log-completeness | `src/application/usecases/updateInquiryStatus.ts` | ポリシーゲート発動時（引合が承認待ち状態になったとき）に引合 (`targetType: "inquiry"`) 側の監査ログが記録されない。承認リクエスト作成の監査ログ（`action: "request.create"`, `targetType: "request"`）は存在するが、「引合 X がポリシー Y の承認ゲートにより保留になった」という事実が引合の監査証跡に残らない。誰がいつ案件化を試みてポリシーゲートが発動したかを引合 ID 起点で追跡できない。 | ポリシーゲート分岐の `return { ok: true, inquiry, pendingApproval: ... }` の直前（`dispatcher.flushAsync()` の前）に、引合を対象とした監査ログを追加記録する。例: `auditLogRepository.create({ action: "inquiry.policyGate", targetType: "inquiry", targetId: data.inquiryId, actorId: data.actorId, organizationId: data.organizationId, metadata: { policyId: policy.id, requestId: pendingRequestId } }, tx)` を承認リクエスト生成と同一トランザクション内で実行する。 |
| 3 | LOW | observability | `src/application/usecases/updateInquiryStatus.ts:159` | テンプレートが見つからない場合（`findById` が null を返した場合）にサイレントフォールバックが発生し、警告ログが記録されない。ポリシーが合致してテンプレートを取得しようとしたが見つからなかった事実が観測できず、どのポリシー (ID) のテンプレートが欠損していたかの診断情報がない。 | `if (template)` の else ブランチ（フォールバック実行前）に `console.warn("[updateInquiryStatus] Template not found for policy, falling back to direct deal creation", { policyId: policy.id, templateId: policy.templateId })` を追加する。 |
| 4 | LOW | concurrency | `src/application/usecases/updateInquiryStatus.ts:50-56` | `findByOriginTriggerEntity`（重複チェック）と `requestRepository.create`（承認リクエスト作成）が同一データベーストランザクション外で実行されており、CHECK-THEN-ACT のTOCTOU 競合条件が存在する。同一引合に対して同時に案件化操作が実行された場合、両方のスレッドが「既存リクエストなし」と判定し、重複した pending system リクエストが生成される可能性がある。spec-review-result-003 のセキュリティレビューで既に言及・許容済み。 | 根本的な解決は DB 側のユニーク制約 `UNIQUE (organizationId, originTriggerAction, originTriggerEntityId) WHERE originType = 'system' AND status IN ('draft', 'pending')` の追加（部分インデックス）。本 PR スコープ外として許容する場合は risks セクションへの追記と将来タスクの記録を推奨。 |

## テナント分離レビュー

テナント分離は全経路で正しく保たれている。

| 確認ポイント | ファイル | 結果 |
|-------------|---------|------|
| `findActiveByTriggerAction` に organizationId | `approvalPolicyRepository.ts:105-121` | ✅ WHERE 句に `eq(approvalPolicies.organizationId, organizationId)` あり |
| `findByOriginTriggerEntity` に organizationId | `requestRepository.ts:168-187` | ✅ WHERE 句に `eq(requests.organizationId, organizationId)` あり |
| `requestRepository.create` に organizationId | `updateInquiryStatus.ts:88-95` | ✅ `organizationId: data.organizationId` を明示的に設定 |
| `approvalStepRepository.createMany` に organizationId | `updateInquiryStatus.ts:107-115` | ✅ 各ステップに `organizationId: data.organizationId` を設定 |
| `approvalTemplateRepository.findById` に organizationId | `updateInquiryStatus.ts:75-77` | ✅ 第2引数として `data.organizationId` を渡している |
| `auditLogRepository.create` に organizationId | `updateInquiryStatus.ts:119-129` | ✅ `organizationId: data.organizationId` あり |
| `handleApprovalCompleted` でのテナント引き継ぎ | `approvalCompletedHandler.ts:26-34` | ✅ `event.organizationId` を `updateInquiryStatus` に渡している |
| `approveRequest` の全リポジトリ呼び出し | `approveRequest.ts` | ✅ 全呼び出しで `organizationId` を渡している |

## 承認ワークフロー不変条件レビュー

| 不変条件 | 実装確認 | 結果 |
|---------|---------|------|
| ポリシー合致時に Deal が生成されない | `updateInquiryStatus.ts:80-158`: ポリシー合致パス内に `dealRepository.create` 呼び出しなし | ✅ |
| ポリシー合致時に引合ステータスが変更されない | `updateInquiryStatus.ts:147-151`: `inquiryRepository.updateStatus` が呼ばれない | ✅ |
| `skipPolicyCheck=true` で無限ループしない | `updateInquiryStatus.ts:48`: `if (!options?.skipPolicyCheck)` でポリシー評価を条件付き実行 | ✅ |
| manual origin では ApprovalCompleted が発行されない | `approveRequest.ts:90-103, 292-305`: `result.originType === "system"` 条件チェックあり | ✅ |
| 全ステップ承認完了時のみ ApprovalCompleted 発行 | `approveRequest.ts:253-305`: `isAllApproved(updatedSteps)` チェック後に発行 | ✅ |
| 単一承認フロー（ステップなし）でも originType チェックあり | `approveRequest.ts:90-104`: ステップなしパスでも同様のチェック | ✅ |
| 重複承認リクエスト防止 | `updateInquiryStatus.ts:50-56`: `findByOriginTriggerEntity` で pending 確認 | ✅（ただし TOCTOU あり、finding #4） |
| テンプレート不在時の従来フローフォールバック | `updateInquiryStatus.ts:79-160`: `if (template)` で null ガード | ✅（ただし finding #3: サイレント） |
| 非同期ハンドラのテナント分離 | `approvalCompletedHandler.ts`: `event.organizationId` を使用 | ✅ |

## Finding 優先度まとめ

- **Finding #1 (HIGH)**: 監査ログ metadata の `templateId` 欠落によるテンプレート削除ガードの機能不全 → **修正必須**
- **Finding #2 (MEDIUM)**: 引合側の承認待ち遷移が audit trail に残らない → 修正推奨
- **Finding #3 (LOW)**: テンプレート不在フォールバック時のサイレントログ → 改善推奨
- **Finding #4 (LOW)**: TOCTOU 競合条件（既知・設計許容済み） → 将来タスク
