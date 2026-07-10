# Domain-Invariants Review — interaction-external-attendee-contact — iter 1

## Meta

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## Scope

変更対象ファイル（実装カテゴリ別）:

| カテゴリ | ファイル |
|---------|---------|
| Server Action | `src/app/actions/meetings.ts` |
| MCP ツール | `src/app/api/mcp/tools/interactions.ts` |
| UI | `src/app/(dashboard)/deals/[id]/meetings/new/DealMeetingForm.tsx` |
| UI | `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingAttendeesSection.tsx` |
| マイグレーション | `drizzle/0022_remove_external_attendee_without_contact.sql` |
| テスト | `src/__tests__/actions/meetingActions.dynamic.test.ts` |
| テスト | `src/__tests__/mcp/mcpExternalContactIds.dynamic.test.ts` |
| テスト | `src/__tests__/mcp/mcpPartialUpdate.dynamic.test.ts` |

---

## Findings

### F-01: [[inv-interaction-external-attendee-from-contact]] — 全経路で充足 ✅

**観点**: 社外参加者は顧客に登録済みの ClientContact からの選択でなければならない。

**検証結果**:

| 経路 | 検証 | 判定 |
|------|------|------|
| Server Action `createMeetingAction` | `externalContactIds.length > 0` かつ `clientId` 未指定時にバリデーションエラー。`listClientContacts(clientId, session.user.organizationId)` で取得したマップで全 ID を解決。未解決 ID は即時エラー返却。 | ✅ |
| Server Action `updateMeetingAction` | `externalContactIds` 指定時は `clientId` を FormData から取得し同様に解決。省略時は既存参加者を保持（`externalAttendeesList = undefined`）。 | ✅ |
| MCP `create_meeting` | `dealId`/`inquiryId` → `dealRepository.findById`/`inquiryRepository.findById` で `clientId` を解決（organizationId スコープ済み）。`clientId` が null ならエラー。`listClientContacts` で未解決 ID をエラー。 | ✅ |
| MCP `update_meeting` | `interactionRepository.findById(meetingId, organizationId)` → `existing.dealId`/`existing.inquiryId` → repository で `clientId` を解決（organizationId スコープ済み）。配列指定時のみ解決が走る。null=クリア・undefined=保持の三値意味論維持。 | ✅ |

氏名はサーバ側のみで確定（クライアント送信の氏名文字列を信用しない）。設計決定 D1 の実装と整合。

---

### F-02: [[inv-all-tenant-scoped]] — テナント分離の完全性 ✅

**観点**: 全データアクセスが organizationId でスコープされていること。

**検証結果**:

1. **`clientRepository.findContactsByClientId`**: `clients` テーブルと `INNER JOIN` し `eq(clients.organizationId, organizationId)` を WHERE に含む。他テナントの `clientId` を指定しても JOIN が失敗して空リストになり、その後の未解決 ID チェックでエラーになる。テナント越えアクセスは repository レベルで封鎖。

2. **MCP create_meeting の deal/inquiry 取得**: `dealRepository.findById(dealId, organizationId)` / `inquiryRepository.findById(inquiryId, organizationId)` ともに organizationId で分離。他テナントの dealId を指定しても `clientId` が得られずエラー。

3. **MCP update_meeting の interaction 取得**: `interactionRepository.findById(meetingId, organizationId)` で organizationId でスコープ。他テナントの meetingId を指定すると `existing = null` → 「商談が見つかりません」エラー。

4. **usecase 呼び出し**: `createMeeting`/`updateMeeting` ともに `organizationId: session.user.organizationId`（Action）または `organizationId`（MCP の `getAuthInfo` 由来）を渡しており一貫している。

---

### F-03: [[inv-audit-log-append-only]] — 監査ログの完全性 ✅

**観点**: すべての作成・更新に監査ログが同一トランザクション内で記録され、変更後も完全性が保たれること。

**検証結果**:

- `createMeeting` usecase: `db.transaction` 内で `interactionRepository.create` → `recordAudit({ action: "interaction.create", ... }, tx)` の順で同一トランザクション。今回の変更で usecase のシグネチャ・ロジックは不変。
- `updateMeeting` usecase: `db.transaction` 内で `interactionRepository.update` → `recordAudit({ action: "interaction.update", ... }, tx)` の順で同一トランザクション。今回の変更で usecase のシグネチャ・ロジックは不変。

今回の変更は入口層（Action/MCP ハンドラ）の前処理（contactId → MeetingAttendee 変換）のみ。usecase への `attendees` の渡し方が変わったが、usecase 内部の監査記録フローは完全に保たれる。

---

### F-04: [[inv-interaction-requires-related]] — 関連先必須の不変条件 ✅

**観点**: Interaction は dealId/inquiryId/contractId/invoiceId/clientId のいずれかを持つこと。

**検証結果**:

- `createMeetingAction`: dealId/inquiryId の両方が未指定の場合に `{ errors: { dealId: ["案件または引合のいずれかの指定が必要です"] } }` でエラー。usecase 内でも同条件をチェック。今回の変更で関連先チェックのコードパスに触れていない。
- MCP `create_meeting`: usecase 内のチェックは不変。`{ ok: false, reason: "..." }` → `toToolError` でエラー返却。

---

### F-05: 承認ワークフロー不変条件への影響 ✅

**観点**: [[inv-approval-evaluate-all-policies]]、[[inv-system-approval-blocks-action]]、[[inv-post-approval-same-tx]]、[[inv-approval-steps-sequential]] が破壊されていないこと。

**検証結果**:

`createMeeting`/`updateMeeting` usecase のコードを確認。承認ポリシー評価・承認リクエスト生成のコードは含まれておらず（Interaction の作成/更新は承認ワークフローをトリガーしない設計）、今回の変更で新たなトリガーも追加されていない。承認ワークフローへの影響はゼロ。

---

### F-06: データ移行の精度と不変条件 ✅

**観点**: 移行が条件外の要素（社内参加者、contactId 保持の社外参加者）を破壊しないこと。

**検証結果**:

```sql
WHERE NOT (
  (elem->>'isExternal')::boolean = true
  AND (elem->>'contactId' IS NULL OR elem->>'contactId' = 'null')
)
```

- 除去条件を `isExternal=true` かつ `contactId` が SQL NULL または JSON 文字列 `'null'` に限定。
- 社内参加者（`isExternal=false`）はフィルタを通過して保持される。
- contactId 保持の社外参加者（将来的に存在しうる）も保持される。
- スキーマ変更（DDL）なし。他カラムへの影響なし。
- `COALESCE(..., '[]'::jsonb)` で全件除去後に空配列を保証。
- WHERE 句で除去対象行のみ UPDATE。

---

### F-07: 懸垂参照の設計決定の実装整合 ✅

**観点**: 担当者削除後も商談記録の氏名スナップショットが維持され、読み取り経路で ClientContact を参照しないこと。

**検証結果**:

- 氏名は `attendees` JSONB の `name` フィールドにスナップショットとして永続化。
- `update_meeting` で `externalContactIds` を省略した場合、`listClientContacts` は呼ばれない（`externalAttendees = undefined`）。
- behavioral テスト TC-020 で「listClientContacts 非呼び出し」を regression として固定済み。

---

### F-08: 観察事項（情報提供・ブロックなし）

**F-08-1: ドメイン層での不変条件強制なし**

[[inv-interaction-external-attendee-from-contact]] のバリデーションは入口層（Action/MCP ハンドラ）のみで実施され、ドメインモデル/usecase 層には含まれない。設計決定 D2 で意図的に選択された方針であり、今回の変更はこれに従う。将来の書き込み経路追加時に不変条件が bypassed されるリスクは設計が認識済み。現時点の書き込み経路はすべてカバーされているため問題なし。

**F-08-2: Server Action update での clientId UUID バリデーション欠如**

`updateMeetingAction` で FormData から取得した `clientId` が UUID 形式かどうかの検証がない。ただし `listClientContacts → findContactsByClientId` が organizationId + JOIN でテナント分離済みであり、不正な clientId は空リスト返却 → 未解決 ID エラーで安全に処理される。実害なし。

---

## Verdict

- **verdict**: approved

全ての主要な不変条件（テナント分離、監査ログ完全性、社外参加者の担当者参照化、関連先必須制約、承認ワークフロー不変条件）が保持されている。データ移行は対象条件の要素に限定された精密な差分のみ。テスト全 2237 件 green（build/typecheck/lint も通過）。観察事項 F-08-1/F-08-2 はいずれも設計で認識済みか実害なしであり、ブロック要因ではない。
