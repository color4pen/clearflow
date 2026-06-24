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
| 1 | HIGH | Migration Bug | tasks.md — T-04 Step 6 | `jsonb_agg(item)` は入力セットが空の場合に NULL を返す。`{ internal: [], external: [] }` を持つ meeting（スキーマのデフォルト値）で UPDATE 後に `attendees = NULL` となり、NOT NULL 制約違反でマイグレーションが中断する。 | `jsonb_agg(item)` を `COALESCE(jsonb_agg(item), '[]'::jsonb)` に変更し、空配列を保証する。 |
| 2 | HIGH | Test Incompatibility | src/__tests__/usecases/meetingManagement.test.ts + tasks.md T-08 | 既存テスト T-01 に `expect(content).not.toContain("inquiryId")` がある。T-08 が `createMeeting.ts` に `inquiryId` を追加した後、このアサーションは失敗し `bun test`（受け入れ基準）が通らない。いかなるタスクもこのテストの更新を指示していない。 | tasks.md に「T-08 実装後に `meetingManagement.test.ts` T-01 の `not.toContain("inquiryId")` アサーションを削除または書き換える」旨のステップを追加する。 |
| 3 | HIGH | Requirement Gap | tasks.md T-08, T-09 / src/app/actions/clients.ts | isPrimary 検証が実際の呼び出しフローに到達しない。(a) `addClientContactAction` は `isPrimary` をフォームから受け取るが `createClientContact` に渡していない（T-09 は「action 層の追加変更は不要」と誤記）。(b) `updateClientContactAction` は usecase を経由せず `clientRepository.updateContact()` を直接呼び出す。`updateClientContact` usecase も計画されていない。結果として仕様要件 8 の「更新時の検証」が機能しない。 | T-09 に `addClientContactAction` での `isPrimary` パススルーを追加する。T-08 に `updateClientContact` usecase の新設（または `updateClientContactAction` への inline 検証ロジック追加）を追加し、更新パスでも `validateIsPrimaryUniqueness` が呼ばれることを保証する。 |
| 4 | MEDIUM | Schema Inconsistency | tasks.md T-01 / src/infrastructure/schema.ts | `meetings.attendees` の `default({ internal: [], external: [] })` が T-01 スキーマ変更で更新されていない。型を `MeetingAttendee[]` に変更しても default が旧形式のままだと、migration 適用後・アプリ再デプロイ前の期間に作成された meeting が旧形式デフォルト値を持ち、型エラーの原因になる。 | T-01 に `meetings.attendees` の `default` を `default([])` に変更する手順を追加する。 |
