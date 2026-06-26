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
| 1 | HIGH | Functional Regression | tasks.md T-01 | `meetingId`・`dealId`・`inquiryId` の nullable FK に `onDelete` 動作が未指定。PostgreSQL のデフォルトは `RESTRICT`（NO ACTION）であるため、T-08 のマイグレーション SQL 実行後、これらのエンティティに action_items が紐づいた状態で `deleteInquiry` または `deleteDeal` を呼び出すと DB レベルの FK 制約違反が発生する。`deleteInquiry` は inquiry_id に紐づく case（meeting → inquiry の migrated action_items）でトランザクション内 `deleteById` が例外を投げてエラー文字列ではなくクラッシュになる。既存コードには nullable FK に `onDelete: "set null"` を付与する先例がある（`deals.estimateRequestId`）。 | T-01 の `meetingId`・`dealId`・`inquiryId` FK 定義に `.references(() => xxx.id, { onDelete: "set null" })` を追記する。これにより親エンティティ削除時に action_item の参照カラムが null になり、アクションアイテム自体は残る（設計意図の「個人タスクとして残る」とも整合する）。spec.md への追記は不要だが tasks.md T-01 の acceptance criteria に「nullable FK はすべて `onDelete: "set null"` を持つ」を追加する。 |
| 2 | MEDIUM | Security | tasks.md T-06 | `createActionItemAction` を含む全サーバーアクションに rate limiting の仕様が記載されていない。既存の `createMeetingAction`（meetings.ts）は `checkRateLimit` を実装しており、書き込みアクションへの rate limiting はプロジェクトの確立したパターンである。アクションアイテムは複数エンティティへの一括作成が可能であり、rate limiting なしでは短時間に大量の DB 書き込みが可能になる。 | T-06 の `createActionItemAction` の実装要件に「`checkRateLimit` で書き込みレートを制限する（`RATE_LIMITS.createRequest` を流用）」を追記する。他の write アクション（update・delete）についても同様の方針を明記するか、省略の意図を tasks.md に記載する。 |
| 3 | LOW | Consistency | tasks.md T-04 | `findByOrganization` の `filters` 型に `inquiryId` が含まれていない（`{ done?, assigneeId?, dealId?, meetingId? }`）。スキーマには `inquiryId` FK が存在し、`findByDeal`・`findByMeeting` の対称性から `findByInquiry` フィルタも自然に期待される。省略が意図的かどうかが不明で、実装者が追加すべきか迷う可能性がある。 | `findByOrganization` の filters 型に `inquiryId?: string` を追加するか、「`inquiryId` フィルタは後続リクエストで追加」と T-04 にコメントを入れる。どちらでも可。 |
| 4 | LOW | Completeness | tasks.md T-08 | マイグレーション SQL の `created_by_id` を `m.created_by_id`（meeting 作成者）で代用しているが、action_items は NOT NULL FK である。`m.created_by_id` が null の meeting レコードが存在した場合 INSERT が NOT NULL 制約違反で失敗する。既存スキーマ上 `created_by_id` は NOT NULL だが、マイグレーション SQL に防御的ガード（`AND m.created_by_id IS NOT NULL`）がない。 | T-08 の WHERE 句に `AND m.created_by_id IS NOT NULL` を追加する。または acceptance criteria に「`created_by_id IS NOT NULL` の前提は既存スキーマが保証するため追加ガード不要」と明記してレビュアーの懸念を払拭する。 |
