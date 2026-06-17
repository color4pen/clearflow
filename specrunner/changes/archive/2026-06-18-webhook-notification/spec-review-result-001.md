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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Security: SSRF (OWASP A10) | tasks.md T-06 / design.md D9 | `createWebhookEndpointAction` の URL バリデーションに `z.string().url()` のみを使用している。これはフォーマットの妥当性しか検証しないため、admin ユーザーが `http://localhost/`、`http://169.254.169.254/latest/meta-data/`（AWS メタデータエンドポイント）、内部 IP レンジ（`10.0.0.x`, `172.16.0.x`, `192.168.0.x`）を登録できる。配信時にサーバーがそのアドレスに HTTP POST を送信する SSRF（サーバーサイドリクエストフォージェリ）が成立し、内部ネットワーク探索・クラウドメタデータ窃取のリスクがある。マルチテナント SaaS における OWASP A10 の典型的な実例。 | T-06 の URL バリデーションに「私有 IP・ループバック・リンクローカルアドレスのブロック」を追加する。具体的には `z.string().url()` 通過後に URL オブジェクトに parse し、hostname が `localhost`、`127.0.0.1`、`::1`、RFC 1918 プライベートレンジ（`10.*`, `172.16-31.*`, `192.168.*`）、リンクローカル（`169.254.*`）に該当する場合は `{ success: false, message: "内部ネットワークの URL は登録できません" }` を返す。また、`https://` のみ許可し `http://` をブロックすることを推奨する。この検証ロジックを spec.md の「Webhook エンドポイントの URL バリデーション」要件として明記する。 |
| 2 | MEDIUM | Implementation gap | tasks.md T-05 | `approveRequest` と `rejectRequest` の step イベント（`step.approved`, `step.rejected`）には `stepId`, `stepOrder`, `approverRole` が必要だが（design.md D4）、これらのデータは現在の usecase コードではトランザクションコールバック内の `freshCurrentStep` / `currentStep` 変数にのみ存在する。T-05 は「各 return の直前に適切なイベントを配信する」と指示するが、トランザクション外での配信に必要なステップデータをどのように取り出すかが未定義。実装者がトランザクション戻り値の構造を変更（`{ result, currentStep, allApproved }` 形式にするなど）しなければ、step ペイロードの組み立てが不可能か空 `metadata` となる。 | T-05 に以下を追加する: 「`approveRequest` では、`db.transaction` のコールバックの戻り値を `{ result: Request, approvedStep: ApprovalStep \| null, allApproved: boolean }` の形式に変更し、トランザクション外で `approvedStep` の `stepId`, `stepOrder`, `approverRole` を参照して `step.approved` ペイロードの `metadata` を組み立てる。`rejectRequest` (revision) でも同様に `currentStep` をトランザクション戻り値に含める。」この変更を tasks.md の各 usecase 統合サブタスクに明示する。 |
| 3 | MEDIUM | Spec gap: FK cascade | tasks.md T-02 / T-03 | T-02 の `webhookDeliveries` テーブル定義に `endpointId` FK の `onDelete` 動作が未指定。T-03 の `deleteById` は「CASCADE 削除、または先に削除する」と二択を提示するが、どちらを採用するかが実装者に委ねられている。`onDelete: "cascade"` が schema に存在しない状態で削除だけを実行した場合、FK 制約違反で実行時エラーとなる。また T-10 のシードの truncate 順（deliveries → endpoints）は明示されているが、通常の削除フローとの整合性が保証されない。 | T-02 の `webhookDeliveries.endpointId` FK 定義に `.references(() => webhookEndpoints.id, { onDelete: "cascade" })` を採用することを明記し、T-03 の `deleteById` から「または先に削除する」の選択肢を削除して「FK cascade により自動削除される」と一本化する。これにより実装の曖昧さをなくし、通常削除フローとシード truncate の両方で整合性が保たれる。 |
| 4 | LOW | Type definition gap | tasks.md T-01 / design.md D4 | `WebhookEventData` 型（T-01）は `{ requestId, requestTitle, actorId, actorName, status?, metadata? }` で定義されており、`step.approved` / `step.rejected` イベント固有のフィールド（`stepId`, `stepOrder`, `approverRole`）は `metadata?: Record<string, unknown>` に格納される想定だが、このマッピングが型定義にもドキュメントにも明記されていない。実装者が step フィールドを `metadata` に入れるか、別途型定義を追加するか判断できない。 | design.md D4 または T-01 に「step 系イベントでは `metadata` に `{ stepId: string, stepOrder: number, approverRole: string }` を格納する」ことを明示する。オプションとして、`StepWebhookEventData extends WebhookEventData` のような派生型を定義する選択肢も提示する。 |
