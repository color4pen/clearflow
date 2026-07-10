# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | LOW | 実装細目 | 要件 5 MCP | `create_meeting` に `clientId` パラメータが存在しないため、`externalContactIds` の解決に必要な `clientId` の取得経路が明記されていない。`update_meeting` では既存商談レコードの `clientId` から導出可能。`create_meeting` では `dealId` → deal ルックアップ → `deal.clientId` が自然な導出経路となるが、暗黙的な依存として残っている。 | 実装 task 作成時に「`create_meeting` ハンドラは `dealId` から deal を取得し `clientId` を導出する」旨を明示する。`inquiryId` のみ指定かつ `externalContactIds` 非空の場合も合わせてエラー仕様を確定させること。 |

## Review Notes

### 肯定的所見

- **設計整合**: `design/domain/model.md`（`ent-interaction`）および `design/domain/invariants.md`（`inv-interaction-external-attendee-from-contact`）へのデルタ反映が確認済みであり、request が依拠する設計的根拠が正本に揃っている。
- **ドメイン型の準備**: `MeetingAttendee.contactId: string | null` は既存型に含まれており、テーブルスキーマ変更なし・JSONB 変更なしの方針と矛盾しない。
- **現状コードの記述精度**: `createMeetingAction`・`updateMeetingAction`・MCP `interactions.ts`・`DealMeetingForm`・`MeetingAttendeesSection` のいずれも実コードと一致しており、差分の起点が明確。
- **受け入れ基準の検証可能性**: contactId 保存・未登録 ID エラー・懸垂参照の氏名維持・MCP 広告 inputSchema・移行後の不整合なし、の各基準が behavioral test で固定できる形式になっている。
- **スコープ境界**: 社内参加者の参照化・案件担当者統合・インライン担当者新規登録を明示的にスコープ外とし、今回の変更範囲が絞れている。
- **部分更新意味論の引継ぎ**: MCP `update_meeting` の `undefined=保持 / null=クリア` 意味論が既存 `updateMeeting` usecase の `internalAttendees` / `externalAttendees` 分離引数に対応済みであり、Server Action 側の統合も自然に導出できる。
- **データ移行制約**: 差分のみ・スキーマ不変・条件限定（`isExternal=true AND contactId=null`）・リセット禁止が明示されており、既存の差分マイグレーション規律（`feedback_db_migration_only.md`）に合致する。

### 検証した内容

| 対象 | 確認結果 |
|------|---------|
| `src/domain/models/interaction.ts` | `MeetingAttendee` に `contactId: string \| null` 存在 ✅ |
| `src/app/actions/meetings.ts` | `externalAttendees: string[]` + `contactRegistrations` 機構が現行コードに存在 ✅ |
| `src/app/api/mcp/tools/interactions.ts` | `externalAttendees: z.array(z.string())` が `create_meeting` / `update_meeting` 双方に存在 ✅ |
| `DealMeetingForm.tsx` | 自由入力行・「顧客担当者として登録」チェックが現行実装に存在 ✅ |
| `MeetingAttendeesSection.tsx` | 同様の UI 構成・`contactId` を状態に持たず name のみ往復している ✅ |
| `new/page.tsx` | `listClientContacts` 呼び出し・`existingContacts` prop 渡し済み ✅ |
| `[meetingId]/page.tsx` | 同様に `existingContacts` / `clientId` prop 渡し済み ✅ |
| `listClientContacts.ts` | `clientId × organizationId` でテナント分離済み ✅ |
| `design/domain/model.md` | `ent-interaction` の社外参加者記述がデルタ反映済み ✅ |
| `design/domain/invariants.md` | `inv-interaction-external-attendee-from-contact` 存在 ✅ |
