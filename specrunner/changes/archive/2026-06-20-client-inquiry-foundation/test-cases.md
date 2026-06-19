# Test Cases: 顧客・引き合い管理基盤

## Summary

- **Total**: 53 cases
- **Automated** (unit/integration): 36
- **Manual**: 17
- **Priority**: must: 38, should: 15, could: 0

---

## スキーマ定義

### TC-001: inquiryStatusEnum がスキーマに存在する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: inquiryStatusEnum は 4 値で定義される > Scenario: inquiryStatusEnum がスキーマに存在する

---

## 状態遷移ドメインサービス（inquiryTransition）

### TC-002: new から in_progress への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 引き合いのステータス遷移ルール > Scenario: new から in_progress への遷移が許可される

---

### TC-003: in_progress から converted への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 引き合いのステータス遷移ルール > Scenario: in_progress から converted への遷移が許可される

---

### TC-004: converted は終端状態であり遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 引き合いのステータス遷移ルール > Scenario: converted は終端状態であり遷移が拒否される

---

### TC-005: declined は終端状態であり遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 引き合いのステータス遷移ルール > Scenario: declined は終端状態であり遷移が拒否される

---

### TC-006: new から declined への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 引き合いのステータスが `new` である
**WHEN** `canTransition("new", "declined")` を呼び出す
**THEN** `true` が返る

---

### TC-007: in_progress から declined への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 引き合いのステータスが `in_progress` である
**WHEN** `canTransition("in_progress", "declined")` を呼び出す
**THEN** `true` が返る

---

### TC-008: new から converted へのステップ飛ばしが拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** 引き合いのステータスが `new` である
**WHEN** `canTransition("new", "converted")` を呼び出す
**THEN** `false` が返る（in_progress を経由しない直接遷移は不可）

---

### TC-009: converted から in_progress への遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 引き合いのステータスが `converted` である
**WHEN** `canTransition("converted", "in_progress")` を呼び出す
**THEN** `false` が返る

---

### TC-010: declined から new への遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 引き合いのステータスが `declined` である
**WHEN** `canTransition("declined", "new")` を呼び出す
**THEN** `false` が返る

---

### TC-011: inquiryTransition.ts に infrastructure import がない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 依存方向を遵守する > Scenario: inquiryTransition.ts に infrastructure import がない

---

### TC-012: ドメインモデルファイルに ORM import がない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 依存方向を遵守する > Scenario: ドメインモデルファイルに ORM import がない

---

## テナント分離（リポジトリ）

### TC-013: 顧客一覧が自組織のみ返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全リポジトリ関数に organizationId 条件を付与する > Scenario: 顧客一覧が自組織のみ返る

---

### TC-014: 引き合い一覧が自組織のみ返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全リポジトリ関数に organizationId 条件を付与する > Scenario: 引き合い一覧が自組織のみ返る

---

### TC-015: clientRepository.findById が他組織の顧客を返さない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** 組織 A と組織 B にそれぞれ顧客が存在する
**WHEN** 組織 A の `organizationId` を指定して組織 B の顧客 ID で `clientRepository.findById` を呼び出す
**THEN** `null` が返る

---

## リポジトリ機能

### TC-016: inquiryRepository.findAllWithClientByOrganization が clientName を含む

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** 顧客と紐づいた引き合いが存在する
**WHEN** `findAllWithClientByOrganization(organizationId)` を呼び出す
**THEN** 返却された各要素に `clientName` フィールドが含まれる

---

### TC-017: inquiryRepository.updateStatus が requestId を同時に更新する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** 引き合いが存在し、承認リクエストの ID がある
**WHEN** `updateStatus(id, organizationId, "converted", requestId, tx)` を呼び出す
**THEN** 引き合いの `status` が `converted`、`requestId` が指定した ID に更新される

---

## 監査ログ記録（ユースケース）

### TC-018: 引き合い作成時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引き合い作成・ステータス変更で監査ログを記録する > Scenario: 引き合い作成時に監査ログが記録される

---

### TC-019: 引き合いステータス変更時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引き合い作成・ステータス変更で監査ログを記録する > Scenario: 引き合いステータス変更時に監査ログが記録される

---

### TC-020: 顧客作成時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引き合い作成・ステータス変更で監査ログを記録する > Scenario: 顧客作成時に監査ログが記録される

---

### TC-021: updateInquiryStatus の監査ログ metadata に fromStatus と toStatus が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** 引き合いのステータスが `new` であり、ユーザーが `in_progress` へ変更する
**WHEN** `updateInquiryStatus` usecase がトランザクションを完了する
**THEN** `audit_logs` の metadata に `{ fromStatus: "new", toStatus: "in_progress" }` が含まれる

---

## ユースケース挙動

### TC-022: createClient で contacts 未指定でも正常に動作する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** contacts 配列を指定せずに createClient を呼び出す
**WHEN** usecase がトランザクションを完了する
**THEN** 顧客が作成され `{ ok: true, client: ... }` が返り、client_contacts には何も挿入されない

---

### TC-023: createClient で contacts 指定時に担当者が同一トランザクション内で作成される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** 担当者 2 名を含む contacts 配列を指定して createClient を呼び出す
**WHEN** usecase がトランザクションを完了する
**THEN** 顧客 1 件と担当者 2 件が作成され、audit_logs に client.create が記録される

---

### TC-024: createInquiry で存在しない clientId を渡した場合にエラーを返す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** データベースに存在しない clientId を指定して createInquiry を呼び出す
**WHEN** usecase が clientRepository.findById を呼び出す
**THEN** `{ ok: false, reason: "顧客が見つかりません" }` が返り、引き合いは作成されない

---

### TC-025: updateInquiryStatus で遷移ルール違反時にエラーを返す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** 引き合いのステータスが `converted`（終端状態）である
**WHEN** `updateInquiryStatus` で `newStatus: "new"` を指定して呼び出す
**THEN** `{ ok: false, reason: ... }` が返り、ステータスは変更されない

---

### TC-026: updateInquiryStatus の converted 遷移時にテンプレート未指定でエラーを返す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** 引き合いのステータスが `in_progress` であり、templateId を指定しない
**WHEN** `updateInquiryStatus` で `newStatus: "converted"` を呼び出す
**THEN** `{ ok: false, reason: "商談化にはテンプレートの指定が必要です" }` が返る

---

### TC-027: converted 遷移時に承認リクエストが作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: converted 遷移時に承認リクエストを自動作成する > Scenario: converted 遷移時に承認リクエストが作成される

---

### TC-028: テンプレートが存在しない場合にエラーを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: converted 遷移時に承認リクエストを自動作成する > Scenario: テンプレートが存在しない場合にエラーを返す

---

### TC-029: updateInquiryStatus の converted 遷移時に承認ステップが作成される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** 引き合いのステータスが `in_progress` であり、承認ステップを持つテンプレートが存在する
**WHEN** `updateInquiryStatus` で `newStatus: "converted"`, `templateId` を指定して呼び出す
**THEN** `approval_steps` テーブルにステップが作成され、引き合いの `requestId` に紐づく

---

## 権限制御（Server Action）

### TC-030: admin が converted に変更できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引き合いのステータス変更（converted）は admin と manager のみ実行可能 > Scenario: admin が converted に変更できる

---

### TC-031: manager が converted に変更できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引き合いのステータス変更（converted）は admin と manager のみ実行可能 > Scenario: manager が converted に変更できる

---

### TC-032: member が converted に変更しようとすると拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引き合いのステータス変更（converted）は admin と manager のみ実行可能 > Scenario: member が converted に変更しようとすると拒否される

---

### TC-033: finance ロールが converted に変更しようとすると拒否される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** ログインユーザーのロールが `finance` であり、引き合いのステータスが `in_progress` である
**WHEN** `updateInquiryStatusAction` で `newStatus: "converted"` を呼び出す
**THEN** `{ success: false, message: "権限がありません" }` が返り、ステータスは変更されない

---

### TC-034: member が in_progress に変更できる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 引き合いのステータス変更（converted）は admin と manager のみ実行可能 > Scenario: member が in_progress に変更できる

---

### TC-035: createInquiryAction で source が enum 外の値の場合バリデーションエラーを返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** source フィールドに `"social_media"`（定義外の値）を指定してフォームを送信する
**WHEN** `createInquiryAction` が Zod バリデーションを実行する
**THEN** バリデーションエラーが返り、引き合いは作成されない

---

### TC-036: updateInquiryStatusAction で organizationId がセッションから取得される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-21

**GIVEN** `src/app/actions/inquiries.ts` のソースコードを確認する
**WHEN** `updateInquiryStatusAction` の organizationId 取得箇所を検査する
**THEN** `session.user.organizationId` からのみ organizationId を取得しており、リクエストボディからは受け取っていない

---

## ナビゲーション

### TC-037: 全ロールのユーザーにナビリンクが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ダッシュボードヘッダーに顧客・引き合いのナビリンクを表示する > Scenario: 全ロールのユーザーにナビリンクが表示される

---

## スキーマ構造（静的確認）

### TC-038: client_contacts テーブルに organizationId カラムが存在しない

**Category**: manual
**Priority**: should
**Source**: design.md > D8

**GIVEN** `src/infrastructure/schema.ts` の `clientContacts` テーブル定義を確認する
**WHEN** カラム一覧を確認する
**THEN** `organizationId` カラムが存在しない（テナント分離は clientId 経由で委譲）

---

### TC-039: inquiries.requestId FK に onDelete: "set null" が設定されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の `inquiries` テーブル定義を確認する
**WHEN** `requestId` カラムの FK 定義を確認する
**THEN** `onDelete: "set null"` が設定されている

---

### TC-040: inquiries.source カラムが text 型で pgEnum ではない

**Category**: manual
**Priority**: should
**Source**: design.md > D6

**GIVEN** `src/infrastructure/schema.ts` の `inquiries` テーブル定義を確認する
**WHEN** `source` カラムの型を確認する
**THEN** `text` 型で定義されており、pgEnum は使用されていない

---

## UI ページ

### TC-041: /clients ページに顧客一覧が表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 認証済みユーザーとして顧客が登録されている状態でアクセスする
**WHEN** ブラウザで `/clients` を開く
**THEN** 企業名・業種・担当者数を含む顧客一覧テーブルと「新規登録」リンク（`/clients/new`）が表示される

---

### TC-042: /clients/new ページに顧客登録フォームと担当者追加 UI が表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** 認証済みユーザーとして `/clients/new` にアクセスする
**WHEN** ページを開く
**THEN** 企業情報フォーム（名前必須・業種・規模・所在地・備考）と担当者の動的追加・削除 UI が表示される

---

### TC-043: /clients/[id] で存在しない顧客 ID の場合 404 が返される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-14

**GIVEN** データベースに存在しない UUID を指定して `/clients/[id]` にアクセスする
**WHEN** ページを開く
**THEN** 404 ページが表示される

---

### TC-044: /inquiries ページに引き合い一覧とステータスフィルタが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** 認証済みユーザーとして引き合いが登録されている状態でアクセスする
**WHEN** ブラウザで `/inquiries` を開く
**THEN** ステータス・顧客名・件名・流入経路を含む引き合い一覧テーブルとステータスフィルタが表示される

---

### TC-045: /inquiries/new で顧客選択に応じて担当者ドロップダウンが更新される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-16

**GIVEN** 顧客と担当者が登録されている状態で `/inquiries/new` にアクセスする
**WHEN** 顧客ドロップダウンで顧客を選択する
**THEN** contactId ドロップダウンにその顧客の担当者一覧が表示される

---

### TC-046: /inquiries/[id] で converted 状態のときステータス変更ボタンが表示されない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-17

**GIVEN** ステータスが `converted` の引き合い詳細ページを開く
**WHEN** ページを確認する
**THEN** ステータス変更ボタンが表示されない（終端状態）

---

### TC-047: /inquiries/[id] で requestId がある場合承認リクエストへのリンクが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-17

**GIVEN** `requestId` が設定された引き合いの詳細ページを開く
**WHEN** ページを確認する
**THEN** `/requests/{requestId}` へのリンクが表示される

---

### TC-048: /inquiries/[id] で存在しない引き合い ID の場合 404 が返される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-17

**GIVEN** データベースに存在しない UUID を指定して `/inquiries/[id]` にアクセスする
**WHEN** ページを開く
**THEN** 404 ページが表示される

---

## ビルド・品質・マイグレーション

### TC-049: Drizzle マイグレーションに inquiry_status enum と 3 テーブルが含まれる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-22

**GIVEN** `bunx drizzle-kit generate` を実行する
**WHEN** 生成されたマイグレーションファイルを確認する
**THEN** `inquiry_status` enum、`clients`、`client_contacts`、`inquiries` テーブルの CREATE 文が含まれる

---

### TC-050: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-23

**GIVEN** 全実装が完了した状態である
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーなしで完了する

---

### TC-051: typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-23

**GIVEN** 全実装が完了した状態である
**WHEN** `bunx tsc --noEmit` を実行する
**THEN** 型エラーが 0 件である

---

### TC-052: bun test が全件 green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-23

**GIVEN** 全実装が完了した状態である
**WHEN** `bun test` を実行する
**THEN** 全テストが green であり、失敗・スキップがない

---

### TC-053: bun run lint エラーがない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-23

**GIVEN** 全実装が完了した状態である
**WHEN** `bun run lint` を実行する
**THEN** lint エラーが 0 件である

---

## Result

```yaml
result: completed
total: 53
automated: 36
manual: 17
must: 38
should: 15
could: 0
blocked_reasons: []
```
