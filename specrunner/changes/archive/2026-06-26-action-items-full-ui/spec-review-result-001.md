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
| 1 | MEDIUM | Spec completeness | tasks.md T-06 | `/tasks` page の `ActionItemRow` に渡す `editable` / `canDelete` の決定ロジックが未指定。`actionItem.edit` は ADMIN_MANAGER_MEMBER、`actionItem.delete` は ADMIN_MANAGER と権限が異なるため、実装者が両フラグを同一基準で実装するリスクがある | T-06 に `editable: canPerform(session.user.role, "actionItem", "edit")`、`canDelete: canPerform(session.user.role, "actionItem", "delete")` を明記する。Deal ページとの見た目の不一致（member が deal ページでは edit ボタン不表示）は既存動作との一貫性維持のため許容するか否かをコメントで示す |
| 2 | MEDIUM | Authorization | tasks.md T-04, T-05 | Deal / Meeting ページの `canDelete` を `editable` と同等に扱うと記述しているが、その根拠（`canChangePhase = admin \|\| manager` が `actionItem.delete = ADMIN_MANAGER` と偶然一致している）が明示されていない。将来 `editable` の判定基準が変更されると `canDelete` が壊れる | T-04/T-05 に「canDelete は `canPerform(session.user.role, "actionItem", "delete")` で独立して判定する」と明記し、既存の `editable` に依存しないことを確定させる |
| 3 | LOW | Spec completeness | spec.md | 権限ロール別のボタン表示に関するシナリオがない。member ロールで削除ボタンが非表示になること、admin/manager のみ削除できることを Given/When/Then で示すシナリオがあるとセキュリティ要件の検証可能性が高まる | spec.md に「member ロールのユーザーがアクションアイテム行を参照した場合、削除ボタンが表示されない」シナリオを追加する |
| 4 | LOW | Error handling | tasks.md T-01 | `listActionItems` ユースケースの返却型が `ActionItemWithSource[]`（直接返却）で定義されており、`Promise.all` 内の repository 呼び出し失敗時の動作が未定義。既存の `listActionItemsByDeal` / `listActionItemsByMeeting` は `Result` 型を返すが、本ユースケースは例外スロー任せになる | Result 型（`{ ok: true; items: ActionItemWithSource[] } \| { ok: false; reason: string }`）を採用するか、あるいは例外を上位（page.tsx）でキャッチする方針を明記する |

## Security Review Summary

以下の OWASP Top 10 観点を確認した結果、既存実装および本 spec の設計に重大な問題はない。

| 観点 | 評価 | 根拠 |
|------|------|------|
| Broken Access Control | ✓ | 全 Server Actions で `auth()` → `canPerform()` による認証・認可チェック済み。`findByOrganization` / `findById` に `organizationId` 条件を付与してテナント分離している |
| Injection | ✓ | Drizzle ORM のパラメータ化クエリを使用。文字列結合によるクエリ構築なし |
| IDOR | ✓ | `deleteActionItem` / `updateActionItem` ユースケースが `findById(id, organizationId)` で所属確認。他テナントのリソースを操作できない |
| Insecure Design | ✓ | レイヤードアーキテクチャの依存方向（actions → usecases → repositories）を維持。page.tsx が repository を直接呼ばない方針が設計決定 D2 で明示されている |
| Security Misconfiguration | ✓ | 既存の `proxy.ts` が未認証アクセスを `/login` にリダイレクト。`/tasks` は `(dashboard)` route group に配置されるため同一の保護下に置かれる |
| Security Logging | ✓ | create / update / delete usecase で `auditLogRepository.create` を呼び出し、変更操作が監査ログに記録される |
| Input Validation | ✓ | 既存 Server Actions の zod スキーマが `description: z.string().min(1)` など適切なバリデーションを実施。新規作成フォームは既存 `createActionItemAction` を再利用するため追加実装不要 |
| Rate Limiting | ✓ | `createActionItemAction` に既存レートリミット実装あり。タスク一覧からの個人タスク作成も同アクションを経由するため自動適用される |
