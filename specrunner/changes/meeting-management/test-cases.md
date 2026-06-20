# Test Cases: 商談管理

## Summary

- **Total**: 50 cases
- **Automated** (unit/integration): 35
- **Manual**: 15
- **Priority**: must: 40, should: 10, could: 0

---

## スキーマ定義

### TC-001: meetingTypeEnum がスキーマに存在する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: meetingTypeEnum は 5 値で定義される > Scenario: meetingTypeEnum がスキーマに存在する

---

### TC-002: meetings テーブルがスキーマに定義されている

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: meetings テーブルが必要なカラムを持つ > Scenario: meetings テーブルがスキーマに定義されている

---

### TC-003: meetings テーブルの FK が正しい外部キーを参照している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` が読み込まれる  
**WHEN** `meetings` テーブルの FK 定義を確認する  
**THEN** `organizationId` が organizations への FK、`inquiryId` が inquiries への FK、`createdById` が users への FK として定義されている

---

## hearingData の null 制約

### TC-004: hearing タイプで hearingData が保存される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: type が hearing の場合のみ hearingData が保存される > Scenario: hearing タイプで hearingData が保存される

---

### TC-005: proposal タイプで hearingData が null になる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: type が hearing の場合のみ hearingData が保存される > Scenario: proposal タイプで hearingData が null になる

---

### TC-006: hearing 以外の全 type で hearingData が null である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: type が hearing の場合のみ hearingData が保存される > Scenario: hearing 以外の全 type で hearingData が null である

---

## 引き合い存在確認

### TC-007: 存在しない引き合い ID で商談を作成するとエラーになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 商談作成時に引き合いの存在確認を行う > Scenario: 存在しない引き合い ID で商談を作成するとエラーになる

---

### TC-008: 存在する引き合い ID で商談が作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 商談作成時に引き合いの存在確認を行う > Scenario: 存在する引き合い ID で商談が作成される

---

## テナント分離

### TC-009: 商談一覧が自組織のみ返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全リポジトリ関数に organizationId 条件を付与する > Scenario: 商談一覧が自組織のみ返る

---

## 監査ログ

### TC-010: 商談作成時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 商談作成・更新で監査ログを記録する > Scenario: 商談作成時に監査ログが記録される

---

### TC-011: 商談更新時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 商談作成・更新で監査ログを記録する > Scenario: 商談更新時に監査ログが記録される

---

## UI — 引き合い詳細ページ（商談履歴セクション）

### TC-012: 引き合い詳細ページに商談履歴が表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引き合い詳細ページに商談履歴セクションを表示する > Scenario: 引き合い詳細ページに商談履歴が表示される

---

### TC-013: 商談がない場合に空状態が表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 引き合い詳細ページに商談履歴セクションを表示する > Scenario: 商談がない場合に空状態が表示される

---

## UI — ヒアリングフォームの条件付き表示

### TC-014: hearing 選択時にヒアリングフォームが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 種別が hearing の場合にヒアリング項目フォームが表示される > Scenario: hearing 選択時にヒアリングフォームが表示される

---

### TC-015: hearing 以外の選択時にヒアリングフォームが非表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 種別が hearing の場合にヒアリング項目フォームが表示される > Scenario: hearing 以外の選択時にヒアリングフォームが非表示

---

## アクションアイテム完了

### TC-016: アクションアイテムを完了にする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: アクションアイテムの done 状態を更新できる > Scenario: アクションアイテムを完了にする

---

## 依存方向

### TC-017: ドメインモデルファイルに ORM import がない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 依存方向を遵守する > Scenario: ドメインモデルファイルに ORM import がない

---

### TC-018: ドメインモデルファイルに infrastructure import がない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 依存方向を遵守する > Scenario: ドメインモデルファイルに infrastructure import がない

---

## Relations 定義

### TC-019: meetingsRelations が organization / inquiry / createdBy の one 関係を持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/schema.ts` が読み込まれる  
**WHEN** `meetingsRelations` の定義を確認する  
**THEN** `organization`（one → organizations）、`inquiry`（one → inquiries）、`createdBy`（one → users）の 3 リレーションが定義されている

---

### TC-020: 既存 Relations に meetings が追記されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/schema.ts` が読み込まれる  
**WHEN** `inquiriesRelations`, `organizationsRelations`, `usersRelations` の定義を確認する  
**THEN** それぞれに `meetings: many(meetings)` が含まれている

---

## ドメインモデル型定義

### TC-021: Meeting 型が全フィールドを持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/domain/models/meeting.ts` が存在する  
**WHEN** `Meeting` 型の定義を確認する  
**THEN** `id`, `organizationId`, `inquiryId`, `type`, `date`, `location`, `attendees`, `summary`, `actionItems`, `hearingData`, `createdById`, `createdAt`, `updatedAt` の全フィールドが含まれている

---

### TC-022: barrel export に Meeting 関連型が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/domain/models/index.ts` が読み込まれる  
**WHEN** export 内容を確認する  
**THEN** `MeetingType`, `HearingData`, `ActionItem`, `MeetingAttendees`, `Meeting` がすべて re-export されている

---

## meetingRepository

### TC-023: meetingRepository の全 5 メソッドが export される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/meetingRepository.ts` が存在する  
**WHEN** export されているシンボルを確認する  
**THEN** `create`, `findById`, `findAllByInquiry`, `findAllByOrganization`, `update` がすべて export されている

---

### TC-024: findAllByInquiry が inquiryId と organizationId の両条件を持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/meetingRepository.ts` が読み込まれる  
**WHEN** `findAllByInquiry` の実装を確認する  
**THEN** `inquiryId` 条件と `organizationId` 条件が両方 WHERE 句に含まれている

---

### TC-025: findAllByInquiry が date 昇順、findAllByOrganization が date 降順で返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** 同一引き合いに日時の異なる商談が複数存在する  
**WHEN** `findAllByInquiry` を呼び出す  
**THEN** date 昇順（古い商談が先頭）で返り、`findAllByOrganization` は date 降順（新しい商談が先頭）で返る

---

### TC-026: repositories/index.ts に meetingRepository が追記されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/index.ts` が読み込まれる  
**WHEN** export 内容を確認する  
**THEN** `export * as meetingRepository from "./meetingRepository"` が存在する

---

## updateMeeting ユースケース

### TC-027: updateMeeting が存在しない meetingId でエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/updateMeeting.ts` が読み込まれる  
**WHEN** `meetingRepository.findById` が null を返すケースのコードを確認する  
**THEN** `{ ok: false, reason: "商談が見つかりません" }` を返す分岐が存在する

---

### TC-028: updateMeeting で更新後 type が hearing 以外なら hearingData が null になる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/updateMeeting.ts` が読み込まれる  
**WHEN** hearingData の null 制御コードを確認する  
**THEN** 更新後の type が `hearing` でない場合に `hearingData` を null に強制するロジックが含まれている

---

## Server Actions

### TC-029: createMeetingAction / updateMeetingAction に認証チェックがある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/app/actions/meetings.ts` が読み込まれる  
**WHEN** 各 action 関数の実装を確認する  
**THEN** `auth()` の呼び出しが含まれ、未認証時に早期リターンするコードがある

---

### TC-030: organizationId をセッションから取得している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/app/actions/meetings.ts` が読み込まれる  
**WHEN** organizationId の取得コードを確認する  
**THEN** `session.user.organizationId` から取得している（ハードコード・クエリパラメータ由来でない）

---

### TC-031: createMeetingAction の Zod スキーマに全フィールドが定義されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** `src/app/actions/meetings.ts` が読み込まれる  
**WHEN** `createMeetingSchema` の定義を確認する  
**THEN** `inquiryId`, `type`, `date`, `location`, `internalAttendees`, `externalAttendees`, `summary`, `actionItems`, `hearingData` のフィールドが含まれている

---

### TC-032: updateMeetingAction スキーマに meetingId が必須フィールドとして含まれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** `src/app/actions/meetings.ts` が読み込まれる  
**WHEN** `updateMeetingSchema` の定義を確認する  
**THEN** `meetingId`（UUID 必須）が定義されており、その他フィールドは optional である

---

## UI — 引き合い詳細ページ（追加ナビゲーション）

### TC-033: 「商談を記録」リンクが正しいパスを指す

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** 引き合い詳細ページ（`/inquiries/[id]`）を開く  
**WHEN** 「商談を記録」リンクを確認する  
**THEN** リンク先が `/inquiries/[id]/meetings/new` になっている

---

### TC-034: 各商談行に商談詳細ページへのリンクがある

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** 引き合い詳細ページに商談が複数表示されている  
**WHEN** 各商談行をクリックする  
**THEN** `/inquiries/[id]/meetings/[meetingId]` に遷移する

---

## UI — 商談記録フォーム

### TC-035: 社内・社外参加者を動的に追加・削除できる

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** 商談記録フォーム（`/inquiries/[id]/meetings/new`）を開く  
**WHEN** 社内参加者フィールドの「追加」ボタンを押し、名前を入力後「削除」ボタンを押す  
**THEN** 入力欄が追加・削除できる。社外参加者も同様に動作する

---

### TC-036: アクションアイテムを動的に追加・削除できる

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** 商談記録フォームを開く  
**WHEN** アクションアイテム欄の「追加」ボタンを押し、内容入力後「削除」ボタンを押す  
**THEN** 入力欄が追加・削除できる

---

### TC-037: フォームバリデーションエラーがフォーム上に表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** 商談記録フォームを開く  
**WHEN** 必須フィールド（種別・日時）を空のまま送信する  
**THEN** エラーメッセージがフォーム上に表示され、ページ遷移しない

---

## UI — 商談詳細ページ

### TC-038: 存在しない meetingId の場合 404 が表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** 存在しない `meetingId` を含む URL（`/inquiries/[id]/meetings/nonexistent`）にアクセスする  
**WHEN** ページを表示する  
**THEN** 404 エラーページが表示される

---

### TC-039: 商談詳細ページで hearing type 時にヒアリング項目が表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** type が `hearing` の商談詳細ページを開く  
**WHEN** ページを表示する  
**THEN** ヒアリング項目（課題、予算感、決裁者、時期、競合状況、備考）が SectionCard 内に表示される

---

### TC-040: 商談詳細ページに編集フォームが配置されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** 商談詳細ページを開く  
**WHEN** ページを確認する  
**THEN** 編集フォームが表示されており、値を変更して送信すると `updateMeetingAction` が呼ばれて内容が更新される

---

## シードデータ

### TC-041: truncation 順序に meetings が inquiries の前に配置されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** `src/infrastructure/seed.ts` が読み込まれる  
**WHEN** テーブル truncation 順序を確認する  
**THEN** `meetings` の truncation が `inquiries` より前に記述されている（FK 制約違反を防ぐため）

---

### TC-042: hearing 商談の hearingData が正しい値で設定されている

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** `bun run db:seed` を実行する  
**WHEN** `meetings` テーブルを確認する  
**THEN** type が `hearing` の商談 1 件に `hearingData`（challenge, budget, decisionMaker, timeline, competitors を含む）が null でなく設定されており、非 hearing 商談 3 件の `hearingData` は null である

---

## 静的検証テスト — projectStructure

### TC-043: projectStructure.test.ts のドメインモデル一覧に meeting.ts が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** `src/__tests__/static/projectStructure.test.ts` が読み込まれる  
**WHEN** TC-031（ドメインモデルファイル一覧）と TC-034（domain 層 infra import なし）のファイルリストを確認する  
**THEN** `"domain/models/meeting.ts"` が両方のリストに含まれている

---

## 静的検証テスト — meetingManagement

### TC-044: createMeeting の引き合い存在確認が検証される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** `src/__tests__/usecases/meetingManagement.test.ts` が読み込まれる  
**WHEN** `createMeeting usecase 静的検証` describe の内容を確認する  
**THEN** `inquiryRepository.findById` の呼び出しを検証するテストが含まれている

---

### TC-045: createMeeting の監査ログ・トランザクション・hearingData 制御が検証される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** `src/__tests__/usecases/meetingManagement.test.ts` が読み込まれる  
**WHEN** `createMeeting usecase 静的検証` describe の内容を確認する  
**THEN** `auditLogRepository.create` の呼び出し、`db.transaction` の呼び出し、hearing 以外で hearingData を null にするコードを検証するテストが含まれている

---

### TC-046: updateMeeting の存在確認・監査ログ・hearingData 制御が検証される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** `src/__tests__/usecases/meetingManagement.test.ts` が読み込まれる  
**WHEN** `updateMeeting usecase 静的検証` describe の内容を確認する  
**THEN** `meetingRepository.findById` の存在確認、`auditLogRepository.create`、`db.transaction`、hearingData null 制御をそれぞれ検証するテストが含まれている

---

### TC-047: listMeetings のリポジトリ呼び出しが検証される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** `src/__tests__/usecases/meetingManagement.test.ts` が読み込まれる  
**WHEN** `listMeetings usecase 静的検証` describe の内容を確認する  
**THEN** `meetingRepository.findAllByInquiry` の呼び出しを検証するテストが含まれている

---

## ビルド・CI

### TC-048: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-17

**GIVEN** 全実装タスクが完了している  
**WHEN** `bun run build` を実行する  
**THEN** エラーなく完了する

---

### TC-049: bunx tsc --noEmit が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-17

**GIVEN** 全実装タスクが完了している  
**WHEN** `bunx tsc --noEmit` を実行する  
**THEN** 型エラーゼロで完了する

---

### TC-050: bun test が全件 green になる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-17

**GIVEN** 全実装タスクが完了している  
**WHEN** `bun test` を実行する  
**THEN** 全テストケースが PASS する

---

## Result

```yaml
result: completed
total: 50
automated: 35
manual: 15
must: 40
should: 10
could: 0
blocked_reasons: []
```
