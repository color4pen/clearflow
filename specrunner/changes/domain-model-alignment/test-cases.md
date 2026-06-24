# Test Cases: ドメインモデルの設計整合

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

- **Total**: 26 cases
- **Automated** (unit/integration): 19
- **Manual**: 7
- **Priority**: must: 21, should: 5, could: 0

---

## Inquiry — budget / timeline

### TC-001: budget / timeline 付きの引き合いを作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Inquiry に budget / timeline フィールドが存在する > Scenario: budget / timeline 付きの引き合いを作成する

### TC-002: budget / timeline を省略して引き合いを作成する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Inquiry に budget / timeline フィールドが存在する > Scenario: budget / timeline を省略して引き合いを作成する

---

## Inquiry — InquirySource enum

### TC-003: 新しい enum 値 email で引き合いを作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: InquirySource は 7 値の pgEnum である > Scenario: 新しい enum 値 email で引き合いを作成する

### TC-004: 新しい enum 値 agent_service で引き合いを作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: InquirySource は 7 値の pgEnum である > Scenario: 新しい enum 値 agent_service で引き合いを作成する

### TC-005: マイグレーションで既存データが enum 外の値から other にフォールバックされる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: InquirySource は 7 値の pgEnum である > Scenario: マイグレーションで既存データが enum にフォールバックされる

### TC-006: inquiries Zod スキーマが 7 値の source enum を受け付ける

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09: Server Action の更新

**GIVEN** `createInquirySchema` の source フィールドが `z.enum(["web", "phone", "email", "referral", "agent_service", "exhibition", "other"])` で定義されている
**WHEN** `"email"`, `"agent_service"`, `"exhibition"` をそれぞれ source に渡して parse する
**THEN** いずれも parse が成功し、`"unknown"` など enum 外の値を渡すと parse が失敗する

---

## Meeting — inquiryId / dealId nullable + CHECK 制約

### TC-007: 引合に紐づく商談を作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Meeting は inquiryId または dealId の少なくとも一方を持つ > Scenario: 引合に紐づく商談を作成する

### TC-008: 案件に紐づく商談を作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Meeting は inquiryId または dealId の少なくとも一方を持つ > Scenario: 案件に紐づく商談を作成する

### TC-009: 両方の FK が null の商談は作成できない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Meeting は inquiryId または dealId の少なくとも一方を持つ > Scenario: 両方の FK が null の商談は作成できない

### TC-010: meetings action が dealId optional・inquiryId optional のスキーマを持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09: Server Action の更新

**GIVEN** `createMeetingSchema` の dealId が `z.string().uuid().optional()` であり inquiryId が `z.string().uuid().optional()` で定義されている
**WHEN** dealId のみを指定して parse する
**THEN** parse が成功し inquiryId は undefined になる
**WHEN** inquiryId のみを指定して parse する
**THEN** parse が成功し dealId は undefined になる

---

## Meeting — attendees 新形式

### TC-011: 新形式で参加者を登録する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Meeting の attendees は配列形式の JSON 構造を持つ > Scenario: 新形式で参加者を登録する

### TC-012: マイグレーションで既存の attendees が新形式に変換される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Meeting の attendees は配列形式の JSON 構造を持つ > Scenario: マイグレーションで既存の attendees が新形式に変換される

### TC-013: findAllByInquiry で引合に紐づく商談一覧を取得できる

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06: リポジトリの更新

**GIVEN** inquiry_id が同一の商談が複数件 DB に存在し、別の inquiry_id の商談も存在する
**WHEN** `meetingRepository.findAllByInquiry(inquiryId, organizationId)` を呼び出す
**THEN** 指定した inquiryId に紐づく商談のみが返り、date 昇順でソートされている

---

## Deal — description

### TC-014: description 付きの案件を作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Deal に description フィールドが存在する > Scenario: description 付きの案件を作成する

### TC-015: description を省略して案件を作成する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Deal に description フィールドが存在する > Scenario: description を省略して案件を作成する

---

## ClientContact — isPrimary 一意性検証

### TC-016: isPrimary = true 設定で既存 primary がなければ成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ClientContact の isPrimary は同一 client_id 内で一意である > Scenario: isPrimary = true を設定するとき既存の primary がなければ成功する

### TC-017: isPrimary = true 設定で既存 primary があればエラーになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ClientContact の isPrimary は同一 client_id 内で一意である > Scenario: isPrimary = true を設定するとき既存の primary があればエラーになる

### TC-018: isPrimary = true 更新で既存 primary があればエラーになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ClientContact の isPrimary は同一 client_id 内で一意である > Scenario: isPrimary = true に更新するとき既存の primary があればエラーになる

### TC-019: isPrimary = false の場合 validateIsPrimaryUniqueness は常に ok を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07: isPrimary 検証の domain service 追加

**GIVEN** client_id = "c1" に isPrimary = true の担当者が複数存在する
**WHEN** `validateIsPrimaryUniqueness(false, existingContacts, undefined)` を呼び出す
**THEN** `{ ok: true }` が返される

### TC-020: 自身が primary である場合に excludeContactId で自身を除外すると成功する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07: isPrimary 検証の domain service 追加

**GIVEN** client_id = "c1" に id = "contact-A" で isPrimary = true の担当者が存在する
**WHEN** `validateIsPrimaryUniqueness(true, existingContacts, "contact-A")` を呼び出す
**THEN** 自身が唯一の primary であるため `{ ok: true }` が返される

---

## Migration 構造検証

### TC-021: migration ファイルが正しい構造と連番を持つ

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04: Drizzle migration 生成とデータマイグレーション SQL の手動編集

**GIVEN** T-01〜T-03 のスキーマ変更が schema.ts に反映されている
**WHEN** `drizzle/` ディレクトリを確認する
**THEN** `drizzle/0003_*.sql` が存在し、Step1〜6 の SQL 文が含まれ、各 statement 間に `--> statement-breakpoint` が挿入されており、`drizzle/meta/_journal.json` に新エントリが追加されている

---

## ドメイン層の独立性

### TC-022: domain 層に infrastructure への import が存在しない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11: ビルド検証

**GIVEN** `src/domain/` 配下のすべての TypeScript ファイルが実装されている
**WHEN** `src/domain/` 配下のファイルで `@/infrastructure` への import を検索する
**THEN** 該当する import が 0 件である

---

## ビルド・品質検証

### TC-023: TypeScript 型チェックが通る

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11: ビルド検証

**GIVEN** T-01〜T-10 の実装がすべて完了している
**WHEN** `bunx tsc --noEmit` を実行する（または `bun run build` に含まれる型チェックを実行する）
**THEN** 型エラーが 0 件で exit code 0 で完了する

### TC-024: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11: ビルド検証

**GIVEN** 全実装が完了している
**WHEN** `bun run build` を実行する
**THEN** exit code 0 で完了する

### TC-025: bun run lint が通る

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-11: ビルド検証

**GIVEN** 全実装が完了している
**WHEN** `bun run lint` を実行する
**THEN** lint エラーが 0 件で exit code 0 で完了する

### TC-026: bun test が green である

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11: ビルド検証

**GIVEN** 全実装が完了しており、DB migration が適用済みである
**WHEN** `bun test` を実行する
**THEN** 全テストが pass し exit code 0 で完了する

---

## Result

```yaml
result: completed
total: 26
automated: 19
manual: 7
must: 21
should: 5
could: 0
blocked_reasons: []
```
