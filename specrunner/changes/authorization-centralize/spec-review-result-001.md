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
| 1 | HIGH | 権限マトリクス不整合 | tasks.md (T-01 vs T-09) | T-01 の権限マトリクスに `deleteTemplate` 操作が定義されていないが、T-09 は `canPerform(session.user.role, "approvalSettings", "deleteTemplate")` を呼び出す。deny-by-default 設計では、`authorization.ts` の実装者が T-01 のマトリクスに従った場合、全ロール（admin 含む）のテンプレート削除が拒否される機能退行が発生する。設計書（03-authorization-design.md）にもこの行が存在しないため、T-09 が "admin のみ" と明記していても T-01 との整合性がない | T-01 の権限マトリクスに `deleteTemplate: ["admin"]` を追加する。また design.md の `PermissionMatrix` 型定義例にも反映し、実装者が参照する単一情報源を確保する |
| 2 | MEDIUM | 認可カバレッジ不足 | tasks.md (T-06, T-07), src/app/actions/inquiries.ts, clients.ts | 設計書 3.1・3.4 では finance ロールが引合作成・顧客作成・顧客編集を実行できないと定義しているが、現行コードの `createInquiryAction`・`createClientAction`・`updateClientAction` には認可チェックが存在しない。T-06 は inquiries.ts の既存チェック置換のみを記述し、T-07 は clients.ts の担当者操作のみを扱う。このためリファクタ後も finance ユーザーがこれら操作を実行でき、権限マトリクスとの乖離が残る | T-06 に `createInquiryAction` への認可チェック追加（`canPerform(role, "inquiry", "create")`）を追記する。T-07 に `createClientAction` および `updateClientAction` への認可チェック追加（`canPerform(role, "client", "create")` / `canPerform(role, "client", "edit")`）を追記する。これらは既存チェックの「置換」ではなく「新規追加」であることを明記する |
| 3 | MEDIUM | 権限設計の根拠欠如 | tasks.md (T-07), spec.md | T-07 は `deleteClientContactAction` を `canPerform(session.user.role, "client", "delete")` に置換する（admin のみ）としているが、設計書 3.4「顧客」には「担当者削除」行が存在しない。T-01 の権限マトリクスにも `deleteContact` 操作が定義されておらず、`client.delete`（顧客削除）を担当者削除に流用することになる。spec.md にも担当者削除のシナリオがない。現行コードでは admin/manager が担当者削除できるが、変更後は admin のみとなり、manager のワークフローが破壊される可能性がある | 設計書 3.4 に「担当者削除」行を追加して許可ロールを明示する。T-01 に `deleteContact` 操作を独立して定義する（推奨: `addContact/editContact/deleteContact=admin+manager+member` または `admin+manager` など設計判断のうえで）。T-07 を `!canPerform(role, "client", "deleteContact")` に更新し、spec.md に対応するシナリオを追加する |
| 4 | LOW | スペックカバレッジ | spec.md (T-08 対応) | `deactivateDelegationAction` の所有者確認（admin 以外は `fromUserId === session.user.id` を検証する）について、spec.md には `createDelegation` の所有者確認シナリオは存在するが、`deactivateDelegation` に対する同様のシナリオが存在しない。T-08 では実装が指定されているが spec で保証されていない | spec.md に "manager が自身以外の委任を無効化しようとする → 権限エラー" シナリオを追加する |
| 5 | LOW | スペックカバレッジ | spec.md (T-08 対応) | `listDelegationsAction` で admin 以外のロールが自身の委任のみを取得できること（`fromUserId` フィルタ）が T-08 に記述されているが、spec.md にシナリオが存在しない。データアクセス制御の振る舞いがテストで保証されない | spec.md に "manager が委任一覧を取得すると自身の委任のみが返される" シナリオを追加する |
