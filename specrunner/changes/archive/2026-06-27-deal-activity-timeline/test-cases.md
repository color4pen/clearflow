# Test Cases: 案件アクティビティ・タイムライン

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

- **Total**: 42 cases
- **Automated** (unit/integration): 37
- **Manual**: 5
- **Priority**: must: 37, should: 5, could: 0

---

## カテゴリ: フィーチャーフラグ (FF)

### TC-001: ACTIVITY_FEED_ENABLED=true のとき案件詳細にアクティビティが表示され getDealActivity が呼ばれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: フィーチャーフラグによる表示制御 > Scenario: ACTIVITY_FEED_ENABLED=true のとき表示される

---

### TC-002: ACTIVITY_FEED_ENABLED が未設定のときアクティビティ SectionCard が非表示かつ getDealActivity が呼ばれない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: フィーチャーフラグによる表示制御 > Scenario: ACTIVITY_FEED_ENABLED が未設定のとき非表示

---

### TC-003: ACTIVITY_FEED_ENABLED=false のときアクティビティ SectionCard が非表示かつ getDealActivity が呼ばれない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: フィーチャーフラグによる表示制御 > Scenario: ACTIVITY_FEED_ENABLED=false のとき非表示

---

### TC-004: deals/[id]/page.tsx のソースに isActivityFeedEnabled の呼び出しが含まれる（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/app/(dashboard)/deals/[id]/page.tsx` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `isActivityFeedEnabled` という文字列が含まれている

---

### TC-005: activityConfig.ts のソースに ACTIVITY_FEED_ENABLED の参照が含まれる（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/lib/activityConfig.ts` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `ACTIVITY_FEED_ENABLED` という文字列が含まれている

---

## カテゴリ: getDealActivity usecase (UC)

### TC-006: 案件自身と配下（商談/契約/アクションアイテム/案件連絡先）の監査ログが統合して createdAt desc で返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: getDealActivity が案件自身＋配下の監査ログを返す > Scenario: 案件自身と配下の監査ログが統合して返る

---

### TC-007: 関連ログが 50 件あるとき createdAt desc の先頭 30 件のみ返される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: getDealActivity が案件自身＋配下の監査ログを返す > Scenario: 件数が ACTIVITY_TIMELINE_LIMIT を超える場合

---

### TC-008: getDealActivity.ts が 4 種の子エンティティ取得メソッドをすべて呼び出している（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/getDealActivity.ts` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `meetingRepository.findAllByDeal`、`contractRepository.findAllByDealId`、`actionItemRepository.findByDeal`、`dealContactRepository.findByDeal` の 4 つがそれぞれ含まれている

---

### TC-009: getDealActivity.ts が Promise.all で子エンティティを並列取得している（静的検証）

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/getDealActivity.ts` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `Promise.all` という文字列が含まれている

---

### TC-010: getDealActivity.ts が ACTIVITY_TIMELINE_LIMIT を参照している（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/getDealActivity.ts` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `ACTIVITY_TIMELINE_LIMIT` という文字列が含まれている

---

### TC-011: getDealActivity.ts が getHiddenActions を呼び出している（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/getDealActivity.ts` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `getHiddenActions` という文字列が含まれている

---

### TC-012: getDealActivity.ts が auditLogRepository.findByTargets を呼び出している（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/getDealActivity.ts` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `findByTargets` という文字列が含まれている

---

## カテゴリ: 除外アクションフィルタ (AF)

### TC-013: ACTIVITY_HIDDEN_ACTIONS が未設定のとき全 action の監査ログがタイムラインに含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 除外アクションフィルタ > Scenario: 除外アクション未指定（既定）

---

### TC-014: ACTIVITY_HIDDEN_ACTIONS="deal.view,meeting.view" のとき該当 action がタイムラインに含まれない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 除外アクションフィルタ > Scenario: 除外アクション指定

---

### TC-015: activityConfig.ts のソースに ACTIVITY_HIDDEN_ACTIONS の参照が含まれる（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/lib/activityConfig.ts` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `ACTIVITY_HIDDEN_ACTIONS` という文字列が含まれている

---

## カテゴリ: auditLogRepository / テナント分離 (REPO)

### TC-016: findByTargets が organizationId でフィルタし異なる組織のログを返さない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: auditLogRepository の対象別取得がテナント分離される > Scenario: organizationId 条件でフィルタされる

---

### TC-017: findByTargets のソースに organizationId 条件が含まれる（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/infrastructure/repositories/auditLogRepository.ts` の `findByTargets` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `organizationId` という文字列が含まれている

---

### TC-018: findByTargets のソースに or( が含まれる（複数ターゲットの OR 結合、静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/infrastructure/repositories/auditLogRepository.ts` の `findByTargets` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `or(` という文字列が含まれている

---

### TC-019: findByTargets のソースに desc(auditLogs.createdAt) が含まれる（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/infrastructure/repositories/auditLogRepository.ts` の `findByTargets` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `desc(auditLogs.createdAt)` という文字列が含まれている

---

### TC-020: findByTargets に空配列を渡したとき空配列を即座に返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `findByTargets` が実装されており、targets に空配列を渡す  
**WHEN** `findByTargets(orgId, [], {})` を呼び出す  
**THEN** DB クエリを発行せずに空配列 `[]` を返す

---

## カテゴリ: インデックス・マイグレーション (IDX)

### TC-021: schema.ts の auditLogs テーブル定義に 2 つのインデックスが定義されている

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: audit_logs インデックスの存在 > Scenario: インデックスがスキーマに定義されている

---

### TC-022: 生成されたマイグレーション SQL に CREATE INDEX 文が 2 つあり、データ変更文が含まれない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: audit_logs インデックスの存在 > Scenario: マイグレーション SQL にインデックス作成文がある

---

### TC-023: schema.ts に audit_logs_org_created_at_idx という文字列が存在する（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/infrastructure/schema.ts` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `audit_logs_org_created_at_idx` という文字列が含まれている

---

### TC-024: schema.ts に audit_logs_target_type_id_idx という文字列が存在する（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/infrastructure/schema.ts` が実装済みである  
**WHEN** ファイルの内容を検索する  
**THEN** `audit_logs_target_type_id_idx` という文字列が含まれている

---

## カテゴリ: activityConfig ユーティリティ (CFG)

### TC-025: ACTIVITY_TIMELINE_LIMIT が 30 である

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `src/lib/activityConfig.ts` がインポートされている  
**WHEN** `ACTIVITY_TIMELINE_LIMIT` の値を参照する  
**THEN** 値が `30` である

---

### TC-026: getHiddenActions() は env 未設定時に空配列を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 / T-11

**GIVEN** `process.env.ACTIVITY_HIDDEN_ACTIONS` が未設定である  
**WHEN** `getHiddenActions()` を呼び出す  
**THEN** 空配列 `[]` が返される

---

### TC-027: getHiddenActions() は env に "deal.view,meeting.view" が設定されているとき ["deal.view", "meeting.view"] を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `process.env.ACTIVITY_HIDDEN_ACTIONS` が `"deal.view,meeting.view"` に設定されている  
**WHEN** `getHiddenActions()` を呼び出す  
**THEN** `["deal.view", "meeting.view"]` が返される

---

### TC-028: getHiddenActions() の各要素が trim されている（前後の空白除去）

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `process.env.ACTIVITY_HIDDEN_ACTIONS` が `"deal.view, meeting.view"` のように要素前後に空白がある  
**WHEN** `getHiddenActions()` を呼び出す  
**THEN** 各要素から空白が除去された `["deal.view", "meeting.view"]` が返される

---

### TC-029: isActivityFeedEnabled() は ACTIVITY_FEED_ENABLED="true" のとき true を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 / T-11

**GIVEN** `process.env.ACTIVITY_FEED_ENABLED` が `"true"` に設定されている  
**WHEN** `isActivityFeedEnabled()` を呼び出す  
**THEN** `true` が返される

---

### TC-030: isActivityFeedEnabled() は ACTIVITY_FEED_ENABLED が未設定のとき false を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `process.env.ACTIVITY_FEED_ENABLED` が未設定である  
**WHEN** `isActivityFeedEnabled()` を呼び出す  
**THEN** `false` が返される

---

### TC-031: isActivityFeedEnabled() は ACTIVITY_FEED_ENABLED="false" のとき false を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `process.env.ACTIVITY_FEED_ENABLED` が `"false"` に設定されている  
**WHEN** `isActivityFeedEnabled()` を呼び出す  
**THEN** `false` が返される

---

## カテゴリ: アクションラベルユーティリティ (LBL)

### TC-032: getActionLabel("deal.create") が "案件を作成" を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `getActionLabel` が `src/lib/activityLabels.ts` からインポートされている  
**WHEN** `getActionLabel("deal.create")` を呼び出す  
**THEN** `"案件を作成"` が返される

---

### TC-033: getActionLabel("unknown.action") がそのまま "unknown.action" を返す（フォールバック）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `getActionLabel` がインポートされている  
**WHEN** `getActionLabel("unknown.action")` を呼び出す  
**THEN** `"unknown.action"` がそのまま返される

---

### TC-034: 主要アクション（deal.update/updatePhase/delete, contract.*/meeting.*/action_item.*/deal_contact.*/invoice.* 等）が日本語ラベルを返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `getActionLabel` がインポートされている  
**WHEN** 定義済みの各 action に対して `getActionLabel` を呼び出す  
**THEN** 以下のマッピングがすべて成立する:
- `"deal.update"` → `"案件を更新"`
- `"deal.updatePhase"` → `"フェーズを変更"`
- `"deal.delete"` → `"案件を削除"`
- `"contract.create"` → `"契約を作成"`
- `"contract.update"` → `"契約を更新"`
- `"contract.cancel"` → `"契約を解除"`
- `"meeting.create"` → `"商談を記録"`
- `"meeting.update"` → `"商談を更新"`
- `"action_item.create"` → `"アクションアイテムを追加"`
- `"action_item.update"` → `"アクションアイテムを更新"`
- `"action_item.toggleDone"` → `"アクションアイテムの完了状態を変更"`
- `"action_item.delete"` → `"アクションアイテムを削除"`
- `"deal_contact.add"` → `"担当者を追加"`
- `"deal_contact.remove"` → `"担当者を削除"`
- `"invoice.create"` → `"請求を作成"`
- `"invoice.update"` → `"請求を更新"`

---

### TC-035: getTargetTypeLabel("deal") が "案件" を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `getTargetTypeLabel` が `src/lib/activityLabels.ts` からインポートされている  
**WHEN** `getTargetTypeLabel("deal")` を呼び出す  
**THEN** `"案件"` が返される

---

### TC-036: getTargetTypeLabel("unknown") がそのまま "unknown" を返す（フォールバック）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `getTargetTypeLabel` がインポートされている  
**WHEN** `getTargetTypeLabel("unknown")` を呼び出す  
**THEN** `"unknown"` がそのまま返される

---

## カテゴリ: タイムライン UI (UI)

### TC-037: アクティビティが 0 件のとき「アクティビティはありません」が表示される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `ACTIVITY_FEED_ENABLED=true` かつ取得されたアクティビティが 0 件  
**WHEN** `DealActivitySection` コンポーネントが空の activities 配列を受け取りレンダリングされる  
**THEN** 「アクティビティはありません」というテキストが出力に含まれる

---

## カテゴリ: 依存方向 (DEP)

### TC-038: getDealActivity usecase が @/infrastructure/repositories と @/domain 配下のみを import し循環参照がない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 依存方向の遵守 > Scenario: getDealActivity usecase の依存

---

### TC-039: getDealActivity.ts が @/app からの import を含まない（静的検証）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/application/usecases/getDealActivity.ts` が実装済みである  
**WHEN** ファイルの import 文を検索する  
**THEN** `@/app` からの import が存在しない。他の usecase からの循環 import も存在しない

---

## カテゴリ: ビルド・品質ゲート (BUILD)

### TC-040: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 本 change の全ファイルが実装済みである  
**WHEN** `bun run build` を実行する  
**THEN** ビルドがエラーなく完了する

---

### TC-041: bunx tsc --noEmit が成功する（型チェック）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 本 change の全ファイルが実装済みである  
**WHEN** `bunx tsc --noEmit` を実行する  
**THEN** 型エラーが 0 件である

---

### TC-042: bun test が全件 green かつ既存テストが無変更

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 本 change の全テストファイルが実装済みである  
**WHEN** `bun test` を実行する  
**THEN** 全テストが green であり、既存テストの結果が変わらない

---

## Result

```yaml
result: completed
total: 42
automated: 37
manual: 5
must: 37
should: 5
could: 0
blocked_reasons: []
```
