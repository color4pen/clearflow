# Test Cases: UI動線改善

## Summary

- **Total**: 28 cases
- **Automated** (unit/integration): 14
- **Manual**: 14
- **Priority**: must: 16, should: 11, could: 1

---

## 引き合い作成時の顧客同時登録

### TC-001: 新規登録オプションの表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引き合い作成時に新規顧客を同時登録できること > Scenario: 新規登録オプションの表示

---

### TC-002: 新規顧客名入力フィールドの表示切り替え

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引き合い作成時に新規顧客を同時登録できること > Scenario: 新規顧客名入力フィールドの表示切り替え

---

### TC-003: 既存顧客に戻した場合のフィールド非表示

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 引き合い作成時に新規顧客を同時登録できること > Scenario: 既存顧客に戻した場合のフィールド非表示

---

### TC-004: 新規顧客名を入力して引き合いを作成

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引き合い作成時に新規顧客を同時登録できること > Scenario: 新規顧客名を入力して引き合いを作成

---

### TC-005: createClient 失敗時に引き合い作成がエラーを返す

**Category**: integration
**Priority**: should
**Source**: design.md > Risks/Trade-offs; tasks.md > T-02

**GIVEN** `createInquiryAction` が呼ばれ、`newClientName` が FormData に含まれており、`createClient` UC が `{ ok: false, reason: "..." }` を返す
**WHEN** Action の処理が実行される
**THEN** `createInquiry` は呼び出されず、エラーメッセージを含むレスポンスが返される

---

### TC-006: clientId 指定時は newClientName を無視する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `createInquiryAction` が呼ばれ、有効な `clientId`（UUID）と `newClientName` の両方が FormData に含まれている
**WHEN** Action の処理が実行される
**THEN** `createClient` は呼び出されず、指定した `clientId` で `createInquiry` が呼ばれる

---

## 案件詳細の商談履歴拡充

### TC-007: 案件詳細の商談テーブルに拡充された列が表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細の商談履歴が引き合い詳細と同等の情報を表示すること > Scenario: 案件詳細の商談テーブルに拡充された列が表示される

---

### TC-008: 引き合い経由の商談に正しい詳細リンクが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細の商談履歴が引き合い詳細と同等の情報を表示すること > Scenario: 引き合い経由の商談に正しい詳細リンクが表示される

---

### TC-009: 案件直紐づきの商談に正しい詳細リンクが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細の商談履歴が引き合い詳細と同等の情報を表示すること > Scenario: 案件直紐づきの商談に正しい詳細リンクが表示される

---

## 案件商談詳細ページ

### TC-010: 存在しない meetingId にアクセスすると 404 が返る

**Category**: integration
**Priority**: must
**Source**: design.md > Decisions > D2; tasks.md > T-05

**GIVEN** `/deals/{dealId}/meetings/{存在しないmeetingId}` に対してリクエストが発生する
**WHEN** Server Component がレンダリングされる
**THEN** `notFound()` が呼ばれ 404 レスポンスが返される

---

### TC-011: URL の dealId と商談の dealId が不一致の場合 404 が返る

**Category**: integration
**Priority**: should
**Source**: design.md > Decisions > D2; tasks.md > T-05

**GIVEN** 商談 X は `dealId = "A"` に紐づいているが、`/deals/B/meetings/{X.id}` でリクエストが発生する
**WHEN** Server Component がレンダリングされる
**THEN** `notFound()` が呼ばれ 404 レスポンスが返される

---

### TC-012: hearing タイプの商談詳細にヒアリング項目が表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `type = "hearing"` の商談に対して `/deals/{dealId}/meetings/{meetingId}` を表示している
**WHEN** 商談詳細ページを確認する
**THEN** ヒアリング項目セクションが表示される

---

## 案件担当者管理

### TC-013: 担当者セクションの表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件担当者の一覧表示・追加・削除ができること > Scenario: 担当者セクションの表示

---

### TC-014: 担当者の追加

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件担当者の一覧表示・追加・削除ができること > Scenario: 担当者の追加

---

### TC-015: 担当者の削除

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件担当者の一覧表示・追加・削除ができること > Scenario: 担当者の削除

---

### TC-016: 顧客未紐づけ時の追加フォーム非表示

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 案件担当者の一覧表示・追加・削除ができること > Scenario: 顧客未紐づけ時の追加フォーム非表示

---

### TC-017: 重複担当者の追加でエラーメッセージが返る

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06; design.md > Decisions > D3

**GIVEN** ある担当者 (contactId X, role "key_person") がすでに案件に登録されている
**WHEN** 同一の contactId X と role "key_person" で `addDealContactAction` を呼び出す
**THEN** `{ ok: false, reason: "この担当者はすでに登録されています" }` が返される

---

### TC-018: addDealContact と removeDealContact が監査ログを記録する

**Category**: integration
**Priority**: should
**Source**: design.md > Decisions > D3; tasks.md > T-06

**GIVEN** 有効なセッションと案件・担当者が存在する
**WHEN** `addDealContact` UC を実行し、次いで `removeDealContact` UC を実行する
**THEN** auditLog に `deal_contact.create` と `deal_contact.delete` のレコードがそれぞれ記録される

---

### TC-019: createClientContact のテナント検証

**Category**: integration
**Priority**: must
**Source**: design.md > Decisions > D5; tasks.md > T-09

**GIVEN** `organizationId = "org-A"` のセッションで、`organizationId = "org-B"` に属する `clientId` を指定して `createClientContact` UC を呼び出す
**WHEN** UC の処理が実行される
**THEN** `{ ok: false, reason: "顧客が見つかりません" }` が返され、ClientContact は作成されない

---

## 商談記録時の担当者登録

### TC-020: チェックボックスの表示（clientId あり）

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 商談記録時に外部参加者を顧客担当者として登録できること > Scenario: チェックボックスの表示（clientId あり）

---

### TC-021: チェックボックスの非表示（clientId なし）

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 商談記録時に外部参加者を顧客担当者として登録できること > Scenario: チェックボックスの非表示（clientId なし）

---

### TC-022: チェックされた参加者が担当者として登録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 商談記録時に外部参加者を顧客担当者として登録できること > Scenario: チェックされた参加者が担当者として登録される

---

### TC-023: 担当者登録失敗時も商談作成は成功として返される

**Category**: integration
**Priority**: should
**Source**: design.md > Risks/Trade-offs; tasks.md > T-10

**GIVEN** FormData に有効な商談情報と `register: true` の参加者1名が含まれ、`createClientContact` UC が `{ ok: false }` を返す
**WHEN** `createMeetingAction` が実行される
**THEN** 商談は作成され、成功レスポンスが返される（担当者登録の失敗は握りつぶされる）

---

### TC-024: clientId 未指定の場合に担当者登録をスキップする

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** FormData に `clientId` が含まれず、`contactRegistrations` に `register: true` の参加者が含まれる
**WHEN** `createMeetingAction` が実行される
**THEN** `createClientContact` は呼び出されず、商談のみが作成される

---

## labels.ts とシードデータ

### TC-025: dealContactRoleLabels の定義

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: labels.ts に dealContactRoleLabels が定義されていること > Scenario: dealContactRoleLabels の定義

---

### TC-026: シードデータの検証

**Category**: integration
**Priority**: could
**Source**: spec.md > Requirement: シードデータに1案件あたり複数ロールの担当者が紐づくこと > Scenario: シードデータの検証

---

## 静的構造・ビルド検証

### TC-027: 新規 Action・UC のテナント分離・監査ログ記録・依存方向の静的検証

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** `projectStructure.test.ts` に各ソースファイルの文字列検索テストが追加されている
**WHEN** `bun test` を実行する
**THEN** 以下がすべて green になる: `dealContacts.ts` に `session.user.organizationId` が含まれる / `addDealContact.ts` に `auditLogRepository` 呼び出しが含まれる / `removeDealContact.ts` に `auditLogRepository` 呼び出しが含まれる / `createClientContact.ts` に `findById` と `createContact` が含まれる / `inquiries.ts` に `createClient` の import が含まれる / `labels.ts` に `dealContactRoleLabels` が定義されている

---

### TC-028: ビルド・型チェック・テスト・lint の全件 green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14; request.md > 受け入れ基準

**GIVEN** すべての実装タスク（T-01〜T-12）が完了している
**WHEN** `bun run build`、`bunx tsc --noEmit`、`bun test`、`bun run lint` を順に実行する
**THEN** すべてエラーなく完了する

---

## Result

```yaml
result: completed
total: 28
automated: 14
manual: 14
must: 16
should: 11
could: 1
blocked_reasons: []
```
