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
| 1 | MEDIUM | テスト不完全 | tasks.md T-08 / T-09 | `externalContactIds` 解決のために MCP ハンドラが使う追加依存（`dealRepository` / `inquiryRepository` / `interactionRepository.findById`、`listClientContacts`）が、T-08 の `mcpPartialUpdate.dynamic.test.ts` 更新指示および T-09 のモック設定に明示されていない。`mcpPartialUpdate` を指示通りに変更すると、`externalContactIds` パス（update_meeting で外部参加者を差し替える場合）においてモック不足で実行時エラーになる可能性がある。 | T-08 の `mcpPartialUpdate.dynamic.test.ts` 更新タスクに「`externalContactIds` 指定テスト用に `listClientContacts`（`@/application/usecases/listClientContacts`）と `interactionRepository.findById`（meetingId → clientId 解決用）のモックを追加する」を追記する。T-09 に「`create_meeting` / `update_meeting` ハンドラが `dealRepository` / `inquiryRepository` / `interactionRepository` を直接参照する場合、これらのモックも設定する」を追記する。 |
| 2 | LOW | テスト不完全 | tasks.md T-08 | `src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts` に `externalAttendees`（`MeetingAttendee[]`）の参照が多数あるが、T-08 のチェックリストに含まれていない。usecase のシグネチャ（`externalAttendees?: MeetingAttendee[]`）は変更しないため当ファイルの変更は不要だが、スキャン対象から明示的に除外されていない。 | T-08 に「`updateMeetingPartialAttendees.dynamic.test.ts` は usecase 層テストのため変更不要（`externalAttendees: MeetingAttendee[]` パラメータは維持）」と注記して意図的除外を確認する。 |
| 3 | LOW | 実装細目 | tasks.md T-07 | JSONB フィルタリング SQL の条件として `contactId IS NULL OR contactId = 'null'` が示されているが、演算子の種類（`->` vs `->>`）によって意味が変わる。`->>` (テキスト抽出) を使うと JSON null は SQL NULL になるため `= 'null'` 節は不要かつ誤解を招く。現行コードは `contactId: null` を JSON null として格納しており、文字列 `"null"` は保存されない。 | T-07 に「`->>`（テキスト抽出）演算子を使い `(elem->>'contactId') IS NULL` のみで判定し、`= 'null'` 比較は不要」と明示する。 |

## Review Notes

### 肯定的所見

**spec.md の完備性**

- 8 つの Requirement がすべて Given/When/Then 形式のシナリオを 1 件以上持ち、各 Requirement に MUST/MUST NOT の normative keyword が含まれている。
- contactId 指定の正常系・未登録 ID エラー・顧客未設定エラー・MCP 広告スキーマ・部分更新意味論・データ移行・懸垂参照許容・社内参加者不変の 8 観点を網羅する。

**design.md の設計判断の明確さ**

- D1〜D7 の設計判断はすべて Rationale と Alternatives が記載されており、実装者が判断軸を理解できる。
- D2「contactId → name 解決は入口層（Action / MCP ハンドラ）で行う」は usecase シグネチャ不変の方針と一貫しており、設計の内部整合性が取れている。
- N+1 クエリへの配慮（D4 / Risks 節）が明示されており、`listClientContacts` を 1 回呼び出して Map 化する実装指針が導出できる。

**tasks.md の実装ガイダンス**

- T-01〜T-10 の各タスクに Acceptance Criteria が付属しており、実装者が完了判定できる。
- 既存の `design/rules.json` により `mod-mcp → mod-repo` は許可済みの依存辺であることが確認でき、T-03 / T-04 で `dealRepository` / `interactionRepository` を MCP ハンドラに直接 import する方針はアーキテクチャルール違反ではない。
- T-07 のマイグレーション指示（スキーマ不変・条件限定・`jsonb_agg` + `jsonb_array_elements` 方式・NULL フォールバック）は既存の差分移行規律に準拠している。
- mock.module の個別ファイルモック + afterAll 復元の方針は既存テスト群のパターンと一致している。

**コードベースとの整合確認**

| 対象 | 確認結果 |
|------|---------|
| `MeetingAttendee` 型 | `{ userId, contactId, name, isExternal }` — contactId スロット既存 ✅ |
| `createMeetingAction` | `externalAttendees: string[]` + `contactRegistrations` 機構が現行コードに存在 ✅ |
| `updateMeetingAction` | `externalAttendees: string[]` + `registerContacts` 機構が現行コードに存在 ✅ |
| MCP `interactions.ts` | `externalAttendees: z.array(z.string())` が create_meeting / update_meeting の両方に存在 ✅ |
| `updateMeeting` usecase | `internalAttendees?: MeetingAttendee[]` / `externalAttendees?: MeetingAttendee[]` の分離引数構造を持ち、usecase シグネチャ不変方針と整合 ✅ |
| `listClientContacts` | `(clientId, organizationId)` — テナント分離済みの既存 usecase ✅ |
| `design/rules.json` | `["mod-mcp", "mod-repo"]` が `allowed` に含まれ、repository 直接 import は許可済み ✅ |
| drizzle/meta/_journal.json | 現行最大 idx=21（0021）— 次マイグレーションは 0022 が正しい ✅ |
| DealMeetingForm.tsx / MeetingAttendeesSection.tsx | 自由入力行・「顧客担当者として登録」チェックが現行実装に存在 ✅ |
