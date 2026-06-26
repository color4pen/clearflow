# Test Cases: アクションアイテムのテーブル・モデル・リポジトリ・ユースケース新設

<!-- FORMAT REQUIREMENTS:
Test Case heading format: `### TC-{NNN}: {Name}` (3-digit zero-padded, e.g. TC-001)

Required fields per test case:
  **Category**: unit | integration | manual
  **Priority**: must | should | could
  **Source**: reference to spec Scenario (spec.md > Requirement: <name> > Scenario: <name>) or design.md / tasks.md section

GIVEN/WHEN/THEN structure (mixed format — depends on TC type):
  Scenario 由来 TC (Source = spec.md > Requirement: <name> > Scenario: <name>):
    GWT は記述しない。Source 参照のみ。behavior の正典は spec の Scenario。
  非 Scenario 由来 TC (Source = design.md or tasks.md section):
    GWT は必須:
    **GIVEN** <preconditions>
    **WHEN** <action>
    **THEN** <expected result>

Category determination:
  unit        — pure logic, validation, helper functions (automated)
  integration — DB operations, API endpoints, multi-module interaction (automated)
  manual      — UI/UX confirmation, visual verification, build artifact check (not automated)

Priority determination:
  must   — core functionality; if broken, the feature does not work
  should — important but core still works; edge cases, error handling
  could  — nice to have; performance, UX details

Summary section MUST appear immediately after the title with ALL 4 items:
  ## Summary
  - **Total**: {count} cases
  - **Automated** (unit/integration): {count}
  - **Manual**: {count}
  - **Priority**: must: {count}, should: {count}, could: {count}

Result section MUST appear at the very end as a YAML code block:
  ## Result
  ```yaml
  result: completed | partial | failed
  total: {count}
  automated: {count}
  manual: {count}
  must: {count}
  should: {count}
  could: {count}
  blocked_reasons: []
  ```

  result determination:
    completed — all testable behaviors are documented
    partial   — some cases could not be derived due to design ambiguity
    failed    — spec is absent AND design.md / tasks.md are also missing
-->

## Summary

- **Total**: 47 cases
- **Automated** (unit/integration): 40
- **Manual**: 7
- **Priority**: must: 40, should: 7, could: 0

---

## スキーマ

### TC-001: action_items テーブルに 6 つの FK 制約が存在する

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `src/infrastructure/schema.ts` に actionItems テーブルが定義されている  
**WHEN** テーブル定義の FK カラムを確認する  
**THEN** organizations, users (assigneeId), users (createdById), meetings, deals, inquiries への合計 6 つの FK 参照が存在する

---

### TC-002: action_items テーブルに 3 つのインデックスが定義されている

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `src/infrastructure/schema.ts` に actionItems テーブルが定義されている  
**WHEN** テーブル定義のインデックスを確認する  
**THEN** `(organization_id, done)`、`(meeting_id)`、`(deal_id)` の 3 つのインデックスが定義されている

---

### TC-003: drizzle-kit generate で action_items の DDL マイグレーションファイルが生成される

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-01 Acceptance Criteria, T-07 Acceptance Criteria

**GIVEN** `src/infrastructure/schema.ts` に actionItems テーブルが追加されている  
**WHEN** `bunx drizzle-kit generate` を実行する  
**THEN** `drizzle/` 配下に新しい SQL ファイルが生成され、CREATE TABLE 文・FK 制約・インデックスがすべて含まれている

---

## モデル

### TC-004: ActionItem ドメインモデル型が全フィールドを含んで定義されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** `src/domain/models/actionItem.ts` が存在する  
**WHEN** ファイルの型定義を確認する  
**THEN** id, organizationId, description, assigneeId (string|null), dueDate (Date|null), done, meetingId (string|null), dealId (string|null), inquiryId (string|null), createdById, createdAt, updatedAt がすべて定義されており `ActionItem` として export されている

---

### TC-005: ActionItem モデルに infrastructure 層への import がない

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** `src/domain/models/actionItem.ts` が存在する  
**WHEN** ファイルの import 文を確認する  
**THEN** `@/infrastructure` への import が一切存在しない

---

### TC-006: ActionItem がドメインモデルのバレルファイルから re-export されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** `src/domain/models/index.ts` が存在する  
**WHEN** バレルファイルの export を確認する  
**THEN** `ActionItem` 型が re-export されている

---

## 認可マトリクス

### TC-007: canPerform("member", "actionItem", "create") が true を返す

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** `authorization.ts` の Entity 型に `"actionItem"` が追加され PERMISSION_MATRIX が定義されている  
**WHEN** `canPerform("member", "actionItem", "create")` を呼び出す  
**THEN** `true` が返される

---

### TC-008: canPerform("member", "actionItem", "delete") が false を返す

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** `authorization.ts` の PERMISSION_MATRIX が定義されている  
**WHEN** `canPerform("member", "actionItem", "delete")` を呼び出す  
**THEN** `false` が返される

---

### TC-009: canPerform("finance", "actionItem", "create") が false を返す

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** `authorization.ts` の PERMISSION_MATRIX が定義されている  
**WHEN** `canPerform("finance", "actionItem", "create")` を呼び出す  
**THEN** `false` が返される

---

### TC-010: canPerform("admin", "actionItem", "delete") が true を返す

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** `authorization.ts` の PERMISSION_MATRIX が定義されている  
**WHEN** `canPerform("admin", "actionItem", "delete")` を呼び出す  
**THEN** `true` が返される

---

## テナント分離

### TC-011: 組織 A のユーザーが組織 B のアクションアイテムを取得できない

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: アクションアイテムのテナント分離 > Scenario: 組織 A のユーザーが組織 B のアクションアイテムを取得できない

---

### TC-012: 他組織のアクションアイテムを ID で取得できない

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: アクションアイテムのテナント分離 > Scenario: 他組織のアクションアイテムを ID で取得できない

---

## Ownership チェック

### TC-013: 他組織の案件にアクションアイテムを紐づけられない

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: アクションアイテムの紐づけ先エンティティの ownership チェック > Scenario: 他組織の案件にアクションアイテムを紐づけられない

---

### TC-014: 自組織の案件にアクションアイテムを紐づけられる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: アクションアイテムの紐づけ先エンティティの ownership チェック > Scenario: 自組織の案件にアクションアイテムを紐づけられる

---

### TC-015: 存在しない dealId を指定した場合エラーが返される

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** DB に存在しない dealId を指定してアクションアイテムを作成しようとする  
**WHEN** `createActionItem` ユースケースを呼び出す  
**THEN** `{ ok: false, reason: "..." }` が返され、action_items テーブルに行が挿入されない

---

### TC-016: 存在しない meetingId を指定した場合エラーが返される

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** DB に存在しない meetingId を指定してアクションアイテムを作成しようとする  
**WHEN** `createActionItem` ユースケースを呼び出す  
**THEN** `{ ok: false, reason: "..." }` が返され、action_items テーブルに行が挿入されない

---

## サーバーアクション認可

### TC-017: member ロールのユーザーがアクションアイテムを作成できる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: サーバーアクションでの認可チェック > Scenario: member ロールのユーザーがアクションアイテムを作成できる

---

### TC-018: 権限のないロールのユーザーが削除できない

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: サーバーアクションでの認可チェック > Scenario: 権限のないロールのユーザーが削除できない

---

### TC-019: 未認証ユーザーがサーバーアクションを呼び出した場合エラーが返される

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-06 Acceptance Criteria

**GIVEN** `auth()` が null を返す（未認証状態）  
**WHEN** `createActionItemAction` を呼び出す  
**THEN** 認証エラーが返され、ユースケースは呼び出されない

---

### TC-020: レート制限超過時に createActionItemAction がエラーを返す

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-06 実装仕様

**GIVEN** ユーザーが RATE_LIMITS.createRequest の上限を超えてリクエストを送信している  
**WHEN** `createActionItemAction` を呼び出す  
**THEN** レート制限エラーが返され、ユースケースは呼び出されない

---

## done 状態トグル

### TC-021: 未完了のアクションアイテムを完了にする

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: アクションアイテムの done 状態トグル > Scenario: 未完了のアクションアイテムを完了にする

---

### TC-022: 完了のアクションアイテムを未完了に戻す

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: アクションアイテムの done 状態トグル > Scenario: 完了のアクションアイテムを未完了に戻す

---

### TC-023: 存在しないアクションアイテムの toggle はエラーを返す

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** DB に存在しない id を指定する  
**WHEN** `toggleActionItemDone` ユースケースを呼び出す  
**THEN** `{ ok: false, reason: "..." }` が返される

---

## リポジトリ

### TC-024: findByOrganization がフィルタなしで全件を createdAt 降順で返す

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** 同一組織に 3 件のアクションアイテムが存在し、作成日時がそれぞれ異なる  
**WHEN** `findByOrganization(organizationId)` をフィルタなしで呼び出す  
**THEN** 3 件すべてが `createdAt` 降順で返される

---

### TC-025: findByOrganization が done フィルタで絞り込む

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** 組織に `done=true` と `done=false` のアクションアイテムが混在する  
**WHEN** `findByOrganization(organizationId, { done: true })` を呼び出す  
**THEN** `done=true` のアクションアイテムのみが返される

---

### TC-026: findByOrganization が dealId フィルタで絞り込む

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-04 実装仕様

**GIVEN** 同一組織に異なる dealId を持つアクションアイテムが存在する  
**WHEN** `findByOrganization(organizationId, { dealId: targetDealId })` を呼び出す  
**THEN** 指定した dealId に紐づくアクションアイテムのみが返される

---

### TC-027: update が updatedAt を自動更新する

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** アクションアイテムが存在し、現在の updatedAt が記録されている  
**WHEN** `update(id, organizationId, { description: "更新後の説明" })` を呼び出す  
**THEN** 返された ActionItem の updatedAt が更新前より新しい時刻になっている

---

### TC-028: delete が対象なし時に false を返す

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-04 実装仕様

**GIVEN** DB に存在しない id を指定する  
**WHEN** `delete(nonExistentId, organizationId)` を呼び出す  
**THEN** `false` が返される

---

### TC-029: actionItemRepository がリポジトリのバレルファイルから export されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** `src/infrastructure/repositories/index.ts` が存在する  
**WHEN** バレルファイルの export を確認する  
**THEN** `actionItemRepository` が export されている

---

## ユースケース

### TC-030: 状態変更ユースケースで audit_log が記録される

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** 有効なアクションアイテムと認証済みアクターが存在する  
**WHEN** `createActionItem` / `toggleActionItemDone` / `updateActionItem` / `deleteActionItem` のいずれかを呼び出す  
**THEN** `audit_logs` テーブルに対応するアクション種別（`action_item.create` / `action_item.toggle` / `action_item.update` / `action_item.delete`）のレコードが挿入される

---

### TC-031: listActionItemsByDeal が他組織の案件を拒否する

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** 組織 B に属する dealId を組織 A の organizationId で指定する  
**WHEN** `listActionItemsByDeal` ユースケースを呼び出す  
**THEN** エラー（`{ ok: false, reason: "..." }`）が返される

---

### TC-032: listActionItemsByMeeting が他組織の商談を拒否する

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** 組織 B に属する meetingId を組織 A の organizationId で指定する  
**WHEN** `listActionItemsByMeeting` ユースケースを呼び出す  
**THEN** エラー（`{ ok: false, reason: "..." }`）が返される

---

### TC-033: 全ユースケースがバレルファイルから export されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** `src/application/usecases/index.ts` が存在する  
**WHEN** バレルファイルの export を確認する  
**THEN** createActionItem, toggleActionItemDone, updateActionItem, deleteActionItem, listActionItemsByDeal, listActionItemsByMeeting がすべて export されている

---

## サーバーアクション

### TC-034: 全サーバーアクションに "use server" ディレクティブがある

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-06 Acceptance Criteria

**GIVEN** `src/app/actions/actionItems.ts` が存在する  
**WHEN** ファイルの先頭を確認する  
**THEN** `"use server"` ディレクティブが存在する

---

### TC-035: createActionItemAction の description が空文字列の場合バリデーションエラーになる

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-06 実装仕様

**GIVEN** 認証済みユーザーが `description: ""` を送信する  
**WHEN** `createActionItemAction` を呼び出す  
**THEN** zod バリデーションエラーが返され、ユースケースは呼び出されない

---

### TC-036: dealId 付きアクションアイテム作成時に deal ページが再検証される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: revalidatePath の適切な呼び出し > Scenario: dealId 付きアクションアイテム作成時に deal ページが再検証される

---

### TC-037: meetingId 付きアクションアイテム作成時に meeting ページが再検証される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: revalidatePath の適切な呼び出し > Scenario: meetingId 付きアクションアイテム作成時に meeting ページが再検証される

---

### TC-038: 紐づけなしのアクションアイテムで /dashboard のみが revalidate される

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-06 Acceptance Criteria

**GIVEN** dealId も meetingId も指定しないアクションアイテムを作成する  
**WHEN** `createActionItemAction` が成功する  
**THEN** `/dashboard` が `revalidatePath` で再検証され、deal や meeting パスは再検証されない

---

## マイグレーション

### TC-039: JSON 埋め込みのアクションアイテムがテーブルに移行される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: マイグレーションで既存データが保持される > Scenario: JSON 埋め込みのアクションアイテムがテーブルに移行される

---

### TC-040: assignee の名前が description に付記される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: マイグレーションで既存データが保持される > Scenario: assignee の名前が description に付記される

---

### TC-041: meetings.action_items カラムが残る

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: マイグレーションで既存データが保持される > Scenario: meetings.action_items カラムが残る

---

### TC-042: assignee が空文字列のアクションアイテムは description をそのまま移行する

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-08 Acceptance Criteria

**GIVEN** meetings テーブルに `assignee: ""` のアクションアイテム JSON が存在する  
**WHEN** マイグレーション SQL を実行する  
**THEN** 移行先の description に `[担当: ]` の付記がなく、元の description がそのまま使用される

---

### TC-043: マイグレーション SQL に DROP COLUMN が含まれていない

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-08 Acceptance Criteria

**GIVEN** データ移行 SQL ファイルが存在する  
**WHEN** ファイルの内容を確認する  
**THEN** `DROP COLUMN` の記述が一切存在しない

---

### TC-044: action_items が空配列の meeting はスキップされる

- **Category**: manual
- **Priority**: should
- **Source**: design.md > Risks / Trade-offs

**GIVEN** meetings テーブルに `action_items = '[]'` のレコードが存在する  
**WHEN** マイグレーション SQL を実行する  
**THEN** そのレコードは action_items テーブルへの挿入対象から除外され、エラーが発生しない

---

## ビルド・型チェック

### TC-045: bun run build が成功する

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** すべてのファイルの実装が完了している  
**WHEN** `bun run build` を実行する  
**THEN** exit code 0 で完了し、型エラーが出力されない

---

### TC-046: bun run lint がエラーなしで通る

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** すべてのファイルの実装が完了している  
**WHEN** `bun run lint` を実行する  
**THEN** exit code 0 で完了し、lint エラーが出力されない

---

### TC-047: domain 層から infrastructure 層への import がない

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** `src/domain/` 配下のファイルが実装されている  
**WHEN** import パスを静的に解析する  
**THEN** `@/infrastructure` へのいかなる import も存在しない

---

## Result

```yaml
result: completed
total: 47
automated: 40
manual: 7
must: 40
should: 7
could: 0
blocked_reasons: []
```
