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
| 1 | HIGH | Spec inconsistency | request.md（行71）/ design.md D5 / tasks.md T-07 | request.md 受け入れ基準が「`rejectRequest`（最終却下）と `reviseRequest`（差し戻し）が別ユースケースとして存在する」を要求しているが、design.md D5 は `rejectRequest` に `targetStatus: "rejected" \| "revision"` 引数を追加する方式を採用し、差し戻し専用 usecase の新設を明示的に却下している。tasks.md T-07 も design に従い `rejectRequest` を拡張する実装方針で、`reviseRequest` を作成するタスクは存在しない。実装者が tasks.md に従うと request.md の受け入れ基準が未充足となり、検証フェーズで矛盾が露見する。 | request.md の受け入れ基準 `reviseRequest` の行を design.md D5 の設計決定に合わせて更新する（「`rejectRequest` が `targetStatus: "revision"` で差し戻しを処理し、`targetStatus: "rejected"` で最終却下することをテストで確認する」に書き換える）。spec.md の差し戻しシナリオはすでに `rejectRequest` + `targetStatus` を使用しており設計と整合しているため、request.md の修正のみで解消できる。 |
| 2 | MEDIUM | Authorization / Security | tasks.md T-10 / spec.md | `resubmitRequestAction` が「初期実装では認証済みユーザーなら実行可能とする」（T-10）と規定されているが、spec.md にこの認可ルールが記載されていない。同一組織内の任意のユーザーが他ユーザーの申請を再申請できる状態になる。domain-invariants レビュアの基準（「テナント所有リソースへのクエリは必ず organizationId で制約」）は満たすが、リソース所有者（creatorId）確認が欠落しており、認可の粒度が不十分。spec.md が沈黙しているためテストケース生成時に認可要件が無視される可能性がある。 | spec.md の「再申請は差し戻しステップ以降のみリセットする」要件に「初期実装では組織内の認証済みユーザーであれば再申請を実行できる（申請者本人確認は将来対応）」という記述を追加して既知の制約として明示する。または、spec.md に「再申請は申請者本人のみ実行可能」の Requirement とシナリオを追加してその制約を受け入れ基準に含める。 |
| 3 | MEDIUM | Tenant isolation | tasks.md T-10 / design.md D11 | `listApprovalTemplatesAction` が usecase 層を経由せず `approvalTemplateRepository.findByOrganization` を直接呼び出す設計（T-10）で、`organizationId` の取得元が明示されていない。既存 Action の慣例（`session.user.organizationId`）から推論可能ではあるが、tasks.md に明記がないため、実装者が request パラメータや URL クエリから `organizationId` を取得した場合にテナント横断アクセスが生じる。usecase を経由しない直接リポジトリ呼び出しはこのリスクが高い。 | T-10 の `listApprovalTemplatesAction` 実装方針に「`organizationId` は必ず `session.user.organizationId` から取得し、リクエストボディや URL パラメータからは受け取らない」を追記する。 |
| 4 | LOW | Spec coverage | spec.md | spec.md に最終却下（`rejectRequest` で `targetStatus: "rejected"` を指定し申請を `rejected` 終端状態にする）のシナリオが存在しない。差し戻し（`revision`）と再申請のシナリオはカバーされているが、最終却下後に `resubmitRequest` が失敗するケース（`rejected` からの遷移禁止）が spec.md でテストケース化されていないため、test-case-gen が後退検知テストを生成できない。 | spec.md に「最終却下操作で申請が `rejected` 終端状態に遷移し、その後 `validateTransition("rejected", "pending")` が `{ ok: false }` を返すことを示す」シナリオを追加する。 |
| 5 | LOW | Implementation ambiguity | tasks.md T-11 | T-11 が「`getRequest` usecase を拡張するか、`getApprovalSteps` usecase を新設するかどちらか」（「または」構文）を実装者の裁量に委ねており、実装方法が未決定。design.md D11 では Server Action `getApprovalStepsAction` が明示されているが、それが呼び出す usecase が特定されていない。裁量が実装者に残ると test-case-gen が期待ファイルパスを特定できない。 | T-11 を確定的な記述に修正する。「`getApprovalSteps(requestId, organizationId): Promise<ApprovalStep[]>` usecase を新設し `src/application/usecases/getApprovalSteps.ts` に配置する」か「`getRequest` の戻り値を `{ request: Request; approvalSteps: ApprovalStep[] } \| null` に拡張する」のいずれか一方に決定する。 |
