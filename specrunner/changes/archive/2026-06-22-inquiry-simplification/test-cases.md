# Test Cases: 引き合い簡素化と商談の案件専属化

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
- **Automated** (unit/integration): 8
- **Manual**: 34
- **Priority**: must: 25, should: 17, could: 0

---

## スキーマ変更（A）

### TC-001: スキーマ定義に in_progress が含まれない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: inquiryStatusEnum から in_progress を削除する > Scenario: スキーマ定義に in_progress が含まれない

---

### TC-002: meetings テーブルに inquiryId カラムが存在しない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: meetings テーブルから inquiryId カラムを削除し dealId を NOT NULL にする > Scenario: meetings テーブルに inquiryId カラムが存在しない

---

### TC-003: マイグレーションファイルが差分として追加される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: meetings テーブルから inquiryId カラムを削除し dealId を NOT NULL にする > Scenario: マイグレーションファイルが差分として追加される

---

### TC-004: inquiriesRelations に meetings フィールドが存在しない

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: inquiriesRelations と meetingsRelations から meetings/inquiry 参照を削除する > Scenario: inquiriesRelations に meetings フィールドが存在しない

---

### TC-005: meetingsRelations に inquiry フィールドが存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/schema.ts` の `meetingsRelations` 定義
**WHEN** リレーション定義を確認する
**THEN** `inquiry: one(inquiries, {...})` フィールドが存在しない

---

## ドメインモデル変更（B）

### TC-006: InquiryStatus 型に in_progress が含まれない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: InquiryStatus 型から in_progress を削除する > Scenario: InquiryStatus 型に in_progress が含まれない

---

### TC-007: Meeting 型に inquiryId フィールドが存在しない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Meeting 型から inquiryId フィールドを削除し dealId を必須にする > Scenario: Meeting 型に inquiryId フィールドが存在しない

---

## ドメインサービス変更（C）

### TC-008: new から converted への直接遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 引き合いの遷移ルールを簡素化する > Scenario: new から converted への直接遷移が許可される

---

### TC-009: new から declined への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 引き合いの遷移ルールを簡素化する > Scenario: new から declined への遷移が許可される

---

### TC-010: declined から new への復帰が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 引き合いの遷移ルールを簡素化する > Scenario: declined から new への復帰が許可される

---

### TC-011: new から in_progress への遷移が禁止される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 引き合いの遷移ルールを簡素化する > Scenario: new から in_progress への遷移が禁止される

---

### TC-012: declined から in_progress への遷移が禁止される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 引き合いの遷移ルールを簡素化する > Scenario: declined から in_progress への遷移が禁止される

---

### TC-013: in_progress から converted への遷移が禁止される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `canTransition` 関数と更新後の遷移ルール
**WHEN** `canTransition("in_progress", "converted")` を呼び出す
**THEN** `false` が返る（in_progress はどの遷移元としても廃止済み）

---

## リポジトリ変更（D）

### TC-014: findAllByInquiry メソッドが存在しない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: meetingRepository から inquiryId 関連メソッドを削除する > Scenario: findAllByInquiry メソッドが存在しない

---

### TC-015: findAllByInquiryOrDeal メソッドが存在しない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: meetingRepository から inquiryId 関連メソッドを削除する > Scenario: findAllByInquiryOrDeal メソッドが存在しない

---

### TC-016: create 関数の引数に inquiryId が存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `src/infrastructure/repositories/meetingRepository.ts` の `create` 関数定義
**WHEN** 引数の型定義を確認する
**THEN** `inquiryId` パラメータが存在せず、`dealId` のみが参照される

---

### TC-017: mapRow 関数が inquiryId をマッピングしない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `src/infrastructure/repositories/meetingRepository.ts` の `mapRow` 関数
**WHEN** マッピングの一覧を確認する
**THEN** `inquiryId: row.inquiryId ?? null` の行が存在しない

---

## ユースケース変更（E）

### TC-018: createMeeting に inquiryId パラメータが存在しない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: createMeeting ユースケースから inquiryId を削除し dealId を必須にする > Scenario: createMeeting に inquiryId パラメータが存在しない

---

### TC-019: createMeeting の dealId が必須 string 型である

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/application/usecases/createMeeting.ts` の引数型定義
**WHEN** `dealId` フィールドの型を確認する
**THEN** `dealId: string`（optional なし、null なし）として定義されている

---

### TC-020: inquiryRepository.findById を inquiryId で呼ぶロジックが存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/application/usecases/createMeeting.ts`
**WHEN** ファイル全体を確認する
**THEN** `inquiryRepository.findById` を呼び出すコードブロックが存在しない

---

### TC-021: new から converted への案件化が成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateInquiryStatus ユースケースから in_progress 遷移処理を削除する > Scenario: new から converted への案件化が成功する

---

### TC-022: newStatus の型注釈が InquiryStatus のみ

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/updateInquiryStatus.ts` の引数型定義
**WHEN** `newStatus` フィールドの型を確認する
**THEN** 型が `InquiryStatus`（`"new" | "converted" | "declined"`）であり、`"in_progress"` を含む型注釈が存在しない

---

## Server Actions 変更（F）

### TC-023: createMeetingSchema に inquiryId が存在しない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Server Actions から inquiryId 関連処理を削除する > Scenario: createMeetingSchema に inquiryId が存在しない

---

### TC-024: createMeetingAction 内に /inquiries/ を参照する revalidatePath が存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** `src/app/actions/meetings.ts` の `createMeetingAction` 関数
**WHEN** `revalidatePath` 呼び出しを確認する
**THEN** `/inquiries/` パスへの `revalidatePath` が存在しない

---

### TC-025: updateMeetingSchema に inquiryId フィールドが存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** `src/app/actions/meetings.ts` の `updateMeetingSchema`
**WHEN** スキーマ定義を確認する
**THEN** `inquiryId` フィールドが存在しない

---

### TC-026: updateInquiryStatusAction が in_progress を型レベルで受け付けない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** `src/app/actions/inquiries.ts` の `updateInquiryStatusAction`
**WHEN** `newStatus` の型キャストを確認する
**THEN** 型が `"new" | "converted" | "declined"` に限定され、`"in_progress"` を含む型キャストが存在しない

---

## UI 変更（G）

### TC-027: new 状態で「対応開始」ボタンが表示されない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: InquiryActions UI から in_progress 関連ボタンを削除する > Scenario: new 状態で「対応開始」ボタンが表示されない

---

### TC-028: declined 状態で「再開」ボタンが new へ遷移する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: InquiryActions UI から in_progress 関連ボタンを削除する > Scenario: declined 状態で「再開」ボタンが new へ遷移する

---

### TC-029: new 状態で「案件化」と「見送り」ボタンが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 引き合いのステータスが `new` かつ `canChangeStatus` が true
**WHEN** `InquiryActions` コンポーネントをレンダリングする
**THEN** 「案件化」ボタンと「見送り」ボタンが表示され、他の遷移ボタンは存在しない

---

### TC-030: in_progress への遷移を呼ぶコードが存在しない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx`
**WHEN** ファイル全体を確認する
**THEN** `handleTransition("in_progress")` の呼び出しが1件も存在しない

---

### TC-031: in_progress フィルタリンクが存在しない

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 引き合い一覧ページから in_progress フィルタを削除する > Scenario: in_progress フィルタリンクが存在しない

---

### TC-032: inProgressCount の計算が存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/inquiries/page.tsx`
**WHEN** ファイル全体を確認する
**THEN** `inProgressCount` の変数宣言および計算コードが存在しない

---

### TC-033: statusLabels に in_progress が存在しない

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: labels.ts から in_progress ラベルを削除する > Scenario: statusLabels に in_progress が存在しない

---

### TC-034: 引き合い詳細ページに商談履歴セクションが存在しない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引き合い経由の商談ルートを削除する > Scenario: 引き合い詳細ページに商談履歴セクションが存在しない

---

### TC-035: page.tsx に MeetingTable コンポーネントが存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** `src/app/(dashboard)/inquiries/[id]/page.tsx`
**WHEN** インポートと JSX を確認する
**THEN** `MeetingTable` のインポートが存在せず、JSX 内での使用も存在しない

---

### TC-036: inquiries/[id]/meetings/ ディレクトリが存在しない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** `src/app/(dashboard)/inquiries/[id]/` ディレクトリ
**WHEN** ディレクトリ構造を確認する
**THEN** `meetings/` サブディレクトリが存在しない（`new/` および `[meetingId]/` を含む全ファイルが削除済み）

---

## シードデータ修正（H）

### TC-037: シードデータに in_progress ステータスの引き合いが存在しない

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: シードデータから in_progress と inquiryId を削除する > Scenario: シードデータに in_progress ステータスの引き合いが存在しない

---

### TC-038: seed.ts の商談 insert に inquiryId フィールドが存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-15

**GIVEN** `src/infrastructure/seed.ts` の商談シードデータ（全 `insert` 呼び出し）
**WHEN** 各 `insert` のフィールド一覧を確認する
**THEN** `inquiryId` フィールドへの参照が1件も存在しない

---

## テスト・ビルド整合（I + 全体）

### TC-039: 全テストが新しい遷移ルールで green になる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: テストを新しい遷移ルールに合わせて更新する > Scenario: 全テストが新しい遷移ルールで green になる

---

### TC-040: in_progress を参照するテストケースが存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-16

**GIVEN** `src/__tests__/domain/inquiryTransition.test.ts`
**WHEN** テストケースの内容を確認する
**THEN** `"in_progress"` を遷移元または遷移先として検証するテストケースが存在しない

---

### TC-041: bun run typecheck がエラーなしで完了する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-17

**GIVEN** 全ファイルの変更が完了した状態
**WHEN** `bun run typecheck` を実行する
**THEN** TypeScript 型エラーが0件で完了する

---

### TC-042: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-17

**GIVEN** 全ファイルの変更が完了した状態
**WHEN** `bun run build` を実行する
**THEN** ビルドがエラーなく成功する

---

## Result

```yaml
result: completed
total: 42
automated: 8
manual: 34
must: 25
should: 17
could: 0
blocked_reasons: []
```
