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
| 1 | MEDIUM | 仕様網羅 | spec.md | no-steps（steps.length === 0）パスでの連動処理がspec.mdに未記述。tasks.md T-06は no-steps フローでも連動処理を実装するよう定義しているが、spec.mdの全 Requirement は「全ステップ承認完了後」（multi-step フロー）のみを対象とし、このシナリオの Requirement/Scenario がない。test-case-gen がspec.mdのみを参照するため no-steps パスのテストが生成されないリスクがある。 | spec.md に「steps.length === 0 の Request に sourceType がある場合も同様の連動処理（Deal 自動作成 / フェーズ進行）を実行する」旨の Requirement と Scenario を追加する。あるいは「変換リクエストは必ずテンプレートに 1 件以上のステップを持つ前提のため no-steps パスには入らない」と設計的に除外し、その旨を spec.md の補足に明記する。 |
| 2 | MEDIUM | 仕様網羅 | spec.md | `request.submitted` webhook が案件化・見積承認リクエストで配信されないことが spec.md に未記述。`updateInquiryStatus`/`updateDealPhase` が `status: "pending"` で直接 INSERT することで `submitRequest` UC を経由しないため、`request.submitted` イベントが一切配信されない。webhook 購読者が承認者通知に `request.submitted` を使用している場合、該当リクエストの通知が届かない。design.md D2 では意図的な省略として記述されているが spec.md には反映されていない。 | spec.md にノンゴール的な補足節または非機能要件として「`updateInquiryStatus`/`updateDealPhase` 経由で作成された pending Request に対しては `request.submitted` webhook は配信されない（`submitRequest` UC を経由しない設計のため）」と明記する。 |
| 3 | LOW | 型安全 | spec.md | `sourceType` の型定義が文書間で不一致。request.md は `"inquiry" \| "deal" \| null`（union 型）と記述しているが、design.md D5 および spec.md は `string \| null` と記述している。実装で `string \| null` を採用した場合、TypeScript コンパイラが不正な `sourceType` 値（例: `"deals"` タイポ）を検出できない。 | spec.md の `sourceType` 型を `"inquiry" \| "deal" \| null` と明示するか、design.md D5 に `string \| null` 採用の trade-off（拡張性 vs. 型安全）を明確に記録する。どちらかに統一されていれば実装者が迷わない。 |
| 4 | LOW | 仕様曖昧 | spec.md | 見積承認完了→Deal フェーズ進行シナリオで Deal の現フェーズ前提が未定義。`dealRepository.updatePhase` は楽観ロック（version チェック）のみで現フェーズを検証しない。Request 作成後に Deal フェーズが `estimate_approval` 以外（例: `lost`）に変更されていた場合でも `updatePhase("won")` が成功し、フェーズの不正遷移が起きる可能性がある。 | spec.md のシナリオに「Deal の phase が `estimate_approval` 以外の場合は `approval.linkage_failed` を audit log に記録してフェーズ更新をスキップする」旨を追記するか、「`dealRepository.updatePhase` は楽観ロックのみで遷移バリデーションはしない（呼び出し元が責任を持つ）」という設計意図を補足に明示する。 |
| 5 | LOW | 仕様曖昧 | spec.md | 連動処理失敗時の audit log の `action`・`targetType`・`targetId` が spec.md に未定義。spec.md の失敗シナリオ（Deal 作成失敗、フェーズ進行失敗）では「エラーが audit log に記録される」とあるが、具体的な `action` 名・`targetId`・`targetType` がない。tasks.md T-06 では `action: "approval.linkage_failed"` が定義されているが spec.md には含まれず、test-case-gen が参照する spec から情報が欠落している。request-review にても LOW として指摘済み。 | spec.md の失敗シナリオの Then 節に `action: "approval.linkage_failed"`・`targetType: "request"`・`targetId: requestId`・`metadata: { sourceType, sourceId, error }` 等の必須フィールドを明記する。 |

## セキュリティレビュー所見

OWASP Top 10 / 認証・認可・入力バリデーション観点で確認した結果、重大な問題なし。

- **テナント分離**: `inquiryRepository.findById(sourceId, data.organizationId)`・`dealRepository.findById(sourceId, data.organizationId)`・`dealRepository.create({ organizationId: data.organizationId, ... })` はすべて `data.organizationId` でスコープされており、クロステナントアクセスは防止されている。
- **IDOR**: `sourceId` は Request 作成時に `updateInquiryStatus`/`updateDealPhase` 内で既に `organizationId` 検証済みの引き合い・案件 ID から設定されるため、外部からの任意 ID 注入リスクは低い。`approveRequest` 側でも `findById(sourceId, organizationId)` で再スコープしており多重防御になっている。
- **楽観ロック**: `requestRepository.updateStatus` は `existing.version` を使用して TOCTOU を防止している。連動処理はトランザクション外だが、承認の冪等性は `validateTransition` と楽観ロックで保証されている。
- **認可**: `approveRequest` の役割検証は呼び出し元 Server Action 層（`app/actions/`）で実施される既存構造を踏襲しており、本 UC の変更による認可バイパスは確認されない。
- **入力バリデーション**: `sourceType`・`sourceId` は DB 挿入時に nullable のカラムに対して格納され、参照時は `organizationId` フィルタが付与されるため SQL インジェクション等のリスクは ORM 層で緩和される。
