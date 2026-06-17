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
| 1 | HIGH | Security: SSRF (OWASP A10) | tasks.md T-06 / design.md D9 | `createWebhookEndpointAction` の URL バリデーションに `z.string().url()` のみを使用している。フォーマット合法性しか検証しないため、admin ユーザーが `http://localhost/`、`http://169.254.169.254/latest/meta-data/`（AWS メタデータエンドポイント）、RFC 1918 プライベートレンジ（`10.*`, `172.16-31.*`, `192.168.*`）を登録できる。配信時にサーバーがそれらへ HTTP POST を送信する SSRF（Server-Side Request Forgery）が成立し、内部ネットワーク探索・クラウドメタデータ窃取のリスクがある。また `http://` スキームを許可すると HMAC secret が平文で流れるため中間者攻撃のリスクがある。 | T-06 の URL バリデーションを以下の 2 点で強化する。(1) スキーム制限: `https://` のみ許可し `http://` をブロックする。(2) 私有 IP ブロック: `z.string().url()` 通過後に `new URL(url)` で hostname を取り出し、`localhost`、`127.0.0.1`、`::1`、`169.254.*`（リンクローカル）、`10.*`、`172.16-31.*`、`192.168.*`（RFC 1918）に該当する場合は `{ success: false, message: "内部ネットワークの URL は登録できません" }` を返す。このバリデーションロジックを spec.md の Requirements セクションに「Webhook エンドポイントの URL は https スキームであること、かつ私有 IP・ループバック・リンクローカルアドレスへの登録を拒否する」として明記する。 |
| 2 | MEDIUM | Implementation gap | tasks.md T-05 / design.md D6 | `approveRequest` のマルチステップパスでは `freshCurrentStep`（stepId, stepOrder, approverRole）が `db.transaction()` コールバック内にのみ存在する。T-05 は「各 return の直前に適切なイベントを配信する」と指示するが、トランザクション外で `step.approved` ペイロードを組み立てるために必要なステップデータをどう取り出すかが未定義。現状の `db.transaction` は `Request` オブジェクトのみを返しており、実装者がステップデータを取り出す方法（変数リーク方式 or トランザクション戻り値の拡張）を独自判断しなければならない。同様に `rejectRequest` の revision パスでも `currentStep` がトランザクション内にしか存在しない。 | T-05 に以下の明示的な指示を追加する: 「`approveRequest` のマルチステップパスでは、`db.transaction` のコールバック戻り値の型を `{ request: Request, approvedStep: ApprovalStep \| null, allApproved: boolean }` に変更し、トランザクション完了後に `approvedStep` の stepId / stepOrder / approverRole を参照して `step.approved` ペイロードを組み立てる。`rejectRequest` の revision パスでも `currentStep` を同様にトランザクション戻り値に含める。」この変更は既存コード（`src/application/usecases/approveRequest.ts` の `updated` 変数型）と整合する必要がある点もあわせて明記する。 |
| 3 | MEDIUM | Spec gap: FK cascade | tasks.md T-02 / T-03 | T-02 の `webhookDeliveries.endpointId` FK 定義に `onDelete` 動作が未指定。T-03 の `deleteById` は「FK の CASCADE 削除、または先に削除する」と二択を提示しており、どちらを採用するかが実装者に委ねられている。スキーマに `onDelete: "cascade"` がない場合に削除のみを実行すると FK 制約違反で実行時エラーになる。また T-10 のシード truncate 順（deliveries → endpoints）は FK cascade の有無を問わず機能するが、通常の削除フローとの整合性が保証されない。 | T-02 の `webhookDeliveries.endpointId` FK 定義に `.references(() => webhookEndpoints.id, { onDelete: "cascade" })` を採用することを明記する。T-03 の `deleteById` から「または先に削除する」の選択肢を削除し、「FK cascade により `webhookDeliveries` は自動削除される」と一本化する。これにより通常削除フロー・シード truncate 両方で整合性が保たれる。 |
| 4 | LOW | Type definition gap | tasks.md T-01 / design.md D4 | `WebhookEventData` 型の `metadata?: Record<string, unknown>` に step 系イベント固有フィールド（stepId, stepOrder, approverRole）が格納される旨が、型定義にも tasks.md にも明記されていない。design.md D4 では「step イベントでは stepId, stepOrder, approverRole 等」と記載があるが、型定義上は `Record<string, unknown>` の非明示的なキーとして暗黙に扱われており、実装者が独自の構造を作る可能性がある。 | T-01 または design.md D4 に「step 系イベント（`step.approved`, `step.rejected`）では `metadata` フィールドに `{ stepId: string, stepOrder: number, approverRole: string }` を格納する」ことを明示する。オプションとして `StepWebhookEventData` のような派生型を定義してもよい。 |
