# Test Cases: 商談（Meeting）を顧客接点（Interaction）に一般化

## Summary

- **Total**: 25 cases
- **Automated** (unit/integration): 16
- **Manual**: 9
- **Priority**: must: 11, should: 11, could: 3

---

### TC-001: interactions テーブル定義が typecheck を通る

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: Interaction スキーマ定義が interactions テーブルとして定義される > Scenario: interactions テーブル定義が typecheck を通る

---

### TC-002: CHECK 制約が5つの関連先のいずれか1つ以上を要求する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Interaction スキーマ定義が interactions テーブルとして定義される > Scenario: CHECK 制約が5つの関連先のいずれか1つ以上を要求する

---

### TC-003: action_items スキーマが interaction_id を持つ

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: action_items テーブルの meeting_id が interaction_id にリネームされる > Scenario: action_items スキーマが interaction_id を持つ

---

### TC-004: kind=meeting の Interaction を作成する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Interaction ドメインモデルが kind と関連先を持つ > Scenario: kind=meeting の Interaction を作成する

---

### TC-005: kind=meeting の Interaction を更新する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Interaction ドメインモデルが kind と関連先を持つ > Scenario: kind=meeting の Interaction を更新する

---

### TC-006: 商談を案件配下に作成する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 商談の作成が kind=meeting の Interaction として記録される > Scenario: 商談を案件配下に作成する

---

### TC-007: dealId と inquiryId の両方が未指定の場合エラーになる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 商談の作成が kind=meeting の Interaction として記録される > Scenario: dealId と inquiryId の両方が未指定の場合エラーになる

---

### TC-008: 商談を更新する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 商談の更新が interaction.update 監査ログを記録する > Scenario: 商談を更新する

---

### TC-009: 案件配下の商談一覧を取得する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 商談一覧が kind=meeting の Interaction を返す > Scenario: 案件配下の商談一覧を取得する

---

### TC-010: 引合配下の商談一覧を取得する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 商談一覧が kind=meeting の Interaction を返す > Scenario: 引合配下の商談一覧を取得する

---

### TC-011: 商談に紐づくアクションアイテムを取得する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: action_items が interaction_id で商談に紐づく > Scenario: 商談に紐づくアクションアイテムを取得する

---

### TC-012: getDealActivity の targets に interaction と meeting の両方が含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: getDealActivity が interaction と meeting の両 targetType を targets に含める > Scenario: targets 配列に interaction と meeting の両方が含まれる

---

### TC-013: getDealActivity の targetInfoMap に interaction と meeting の両キーが登録される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: getDealActivity が interaction と meeting の両 targetType を targets に含める > Scenario: targetInfoMap に interaction と meeting の両キーが登録される

---

### TC-014: getNotifications の targets に interaction と meeting の両方が含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: getNotifications が interaction と meeting の両 targetType を targets に含める > Scenario: 通知の targets に interaction と meeting の両方が含まれる

---

### TC-015: TIMELINE_ACTIONS が interaction.create を含む

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: TIMELINE_ACTIONS に interaction.create が追加される > Scenario: TIMELINE_ACTIONS が interaction.create を含む

---

### TC-016: NOTIFICATION_ACTIONS が interaction.create を含む

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: NOTIFICATION_ACTIONS に interaction.create が追加される > Scenario: NOTIFICATION_ACTIONS が interaction.create を含む

---

### TC-017: interaction 監査アクションが型定義に含まれる

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: AuditAction 型に interaction.create / interaction.update が追加される > Scenario: interaction 監査アクションが型定義に含まれる

---

### TC-018: マイグレーション SQL が RENAME を使用し DROP/DELETE/TRUNCATE を含まない

**Category**: manual
**Priority**: must
**Source**: design.md > D1: テーブルリネーム + ADD COLUMN 方式 / tasks.md > T-01

**GIVEN** `drizzle-kit generate` を対話モードで実行し、`meetings → interactions` および `action_items.meeting_id → interaction_id` のリネームを選択してマイグレーション SQL ファイルが生成されている

**WHEN** 生成されたマイグレーション SQL ファイルを目視で確認する

**THEN** `ALTER TABLE meetings RENAME TO interactions` および `ALTER TABLE action_items RENAME COLUMN meeting_id TO interaction_id` が含まれ、`DROP TABLE`・`DELETE FROM`・`TRUNCATE` が一切含まれない

---

### TC-019: LegacyMeetingActionItem 型が ActionItem エンティティと名前衝突しない

**Category**: unit
**Priority**: should
**Source**: design.md > D7: 型衝突の解決（LegacyMeetingActionItem）/ tasks.md > T-02

**GIVEN** `src/domain/models/interaction.ts` に `LegacyMeetingActionItem` 型が定義されており、`src/domain/models/actionItem.ts` に `ActionItem` エンティティが定義されている

**WHEN** 両ファイルを同一スコープで import し、`bun run typecheck` を実行する

**THEN** 型名衝突エラーが発生せず、typecheck が成功する。また、旧 `ActionItem`（jsonb 構造）が `LegacyMeetingActionItem` として参照可能である

---

### TC-020: createActionItem が interactionId を interactionRepository.findById で検証する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07 / T-12 > interactionActionItems.dynamic.test.ts

**GIVEN** `interactionRepository.findById` が `null` を返すようモックされている

**WHEN** `createActionItem` を存在しない `interactionId` で呼び出す

**THEN** ok: false が返り、`interactionRepository.findById` が当該 interactionId で呼ばれたことが確認される

---

### TC-021: deleteDeal が interactionRepository を使用して商談紐づき案件のエラーを返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `interactionRepository.findAllByDeal` が kind=meeting の Interaction を 1 件返すようモックされている

**WHEN** `deleteDeal` を当該 dealId で呼び出す

**THEN** ok: false が返り、エラーメッセージに「商談が紐づいている案件は削除できません」が含まれる。`interactionRepository.findAllByDeal` が呼ばれており、`meetingRepository` への参照は存在しない

---

### TC-022: Server Action が canPerform(..., "meeting", ...) を維持する

**Category**: manual
**Priority**: could
**Source**: design.md > D9: 認可エンティティ名の維持 / tasks.md > T-08

**GIVEN** `src/app/actions/meetings.ts` が `interactionRepository` / `Interaction` 型を使用するよう更新されている

**WHEN** ソースコードを確認する

**THEN** `canPerform(session.user.role, "meeting", ...)` の形式が維持されており、`"interaction"` に変更されていない（認可マトリクスの Entity 名は `"meeting"` のまま）

---

### TC-023: UI コンポーネントが meetingType / details プロパティで商談詳細を表示する

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-09

**GIVEN** 商談詳細ページ（`/deals/[id]/meetings/[meetingId]`）に kind=meeting の Interaction データが存在する

**WHEN** ブラウザで商談詳細ページを開き、商談種別・ヒアリングデータ・参加者などを確認する

**THEN** `meetingType` に基づく商談種別ラベルが正しく表示され、`details`（HearingData）の内容が表示される。UI 上の日本語表記「商談」がすべて維持されている。`/deals/[id]/meetings/...` の URL 構造が変わっていない

---

### TC-024: bun test / typecheck / build / lint が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** interaction 一般化の全実装（T-01〜T-12）が完了している

**WHEN** `bun test`、`bun run typecheck`、`bun run build`、`bun run lint` を順に実行する

**THEN** すべてのコマンドがエラーなしで成功する。既存テストおよび新規 dynamic テストがすべて green である

---

### TC-025: meetingRepository への参照がコードベースに残っていない

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-13

**GIVEN** interaction 一般化の全実装が完了している

**WHEN** `meetingRepository` のファイル名・import パス・`mock.module` パスをコードベース全体（`src/` および `__tests__/`）で検索する

**THEN** いずれのファイルにも `meetingRepository` への参照が存在しない（`meeting.ts` が `interaction.ts` への re-export のみの場合はその旨が明示されている）

---

## Result

```yaml
result: completed
total: 25
automated: 16
manual: 9
must: 11
should: 11
could: 3
blocked_reasons: []
```
