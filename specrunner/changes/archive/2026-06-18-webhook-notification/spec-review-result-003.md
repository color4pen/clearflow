# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Spec inconsistency | tasks.md T-03 | `deleteById` に「FK の CASCADE 削除、または先に削除する」と二択が残っているが、T-02 ですでに `onDelete: "cascade"` が指定されている。実装者が「先に削除する」を選択した場合でも機能するが、T-02 との一貫性が欠ける。 | T-03 の `deleteById` から「または先に削除する」の選択肢を削除し、「FK cascade（T-02 で定義済み）により `webhookDeliveries` は自動削除される」と一本化することを推奨する。現状でも実装は可能なため blocking ではない。 |
| 2 | LOW | Type definition gap | tasks.md T-01 / spec.md | `WebhookEventData.metadata` が `Record<string, unknown>` として定義されており、`step.approved` / `step.rejected` イベント固有の `{ stepId, stepOrder, approverRole }` フィールドが型定義に明示されていない。spec.md のシナリオには記載があり、T-05 に実装指示もあるため実装者は対処できるが、型安全性の観点では弱い。 | T-01 または design.md D4 に「step 系イベントでは `metadata` に `{ stepId: string, stepOrder: number, approverRole: string }` を格納する」ことを型コメントとして追記することを推奨する。blocking ではない。 |

## 判断根拠

前回の反復（002）で報告された HIGH / MEDIUM 所見はすべて仕様に反映済みであることを確認した。

- **SSRF 対策（旧 HIGH）**: tasks.md T-06 に https スキーム制限と RFC 1918 / ループバック / リンクローカルの IP ブロックが明示された。spec.md に "Requirement: Webhook エンドポイントの URL は安全であること" が追加され、3 つのシナリオで検証可能な形になっている。✓
- **トランザクション外 step データ（旧 MEDIUM）**: tasks.md T-05 で `approveRequest` のマルチステップトランザクション戻り値型を `{ request: Request, approvedStep: ApprovalStep | null, allApproved: boolean }` に変更すること、`rejectRequest` も `currentStep` をトランザクション戻り値に含めることが明示された。実際の `approveRequest.ts` / `rejectRequest.ts` のコードと照合し、指示が実装可能であることを確認した。✓
- **FK cascade（旧 MEDIUM）**: tasks.md T-02 に `.references(() => webhookEndpoints.id, { onDelete: "cascade" })` が明示された。T-03 に残る二択表現は LOW にとどまる。✓
- **`userRepository.findById` シグネチャ**: 実コード `src/infrastructure/repositories/userRepository.ts` を確認し、`findById(id: string, organizationId: string)` であることを検証済み。T-04 の呼び出しと一致する。✓

残存 LOW 所見 2 件は実装の妨げにならず、実装者は対処可能である。仕様は実装フェーズに進める状態と判断する。
