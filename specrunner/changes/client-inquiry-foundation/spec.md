# Spec: 顧客・引き合い管理基盤

## Requirements

### Requirement: inquiryStatusEnum は 4 値で定義される

`inquiryStatusEnum` は pgEnum として `["new", "in_progress", "converted", "declined"]` の 4 値で定義されなければならない（MUST）。

#### Scenario: inquiryStatusEnum がスキーマに存在する

**Given** `src/infrastructure/schema.ts` が読み込まれる
**When** `inquiryStatusEnum` の定義を確認する
**Then** `["new", "in_progress", "converted", "declined"]` の 4 値が順に定義されている

---

### Requirement: 引き合いのステータス遷移ルール

引き合いの状態遷移は以下のルールに従わなければならない（MUST）:
- `new → in_progress`: 許可
- `new → declined`: 許可
- `in_progress → converted`: 許可
- `in_progress → declined`: 許可
- `converted` は終端状態: いかなる遷移も拒否
- `declined` は終端状態: いかなる遷移も拒否

`canTransition(from, to)` 関数がこのルールを判定する。

#### Scenario: new から in_progress への遷移が許可される

**Given** 引き合いのステータスが `new` である
**When** `canTransition("new", "in_progress")` を呼び出す
**Then** `true` が返る

#### Scenario: in_progress から converted への遷移が許可される

**Given** 引き合いのステータスが `in_progress` である
**When** `canTransition("in_progress", "converted")` を呼び出す
**Then** `true` が返る

#### Scenario: converted は終端状態であり遷移が拒否される

**Given** 引き合いのステータスが `converted` である
**When** `canTransition("converted", "new")` を呼び出す
**Then** `false` が返る

#### Scenario: declined は終端状態であり遷移が拒否される

**Given** 引き合いのステータスが `declined` である
**When** `canTransition("declined", "in_progress")` を呼び出す
**Then** `false` が返る

---

### Requirement: converted 遷移時に承認リクエストを自動作成する

引き合いのステータスを `converted` に遷移する際、指定された承認テンプレートを使用して承認リクエスト（Request）を自動作成し、`inquiries.requestId` に紐づけなければならない（MUST）。この操作は単一トランザクション内で完了する。

#### Scenario: converted 遷移時に承認リクエストが作成される

**Given** 引き合いのステータスが `in_progress` であり、有効な承認テンプレートが存在する
**When** `updateInquiryStatus` を `converted` で実行し、テンプレート ID を指定する
**Then** 承認リクエストが作成され、引き合いの `requestId` に紐づく

#### Scenario: テンプレートが存在しない場合にエラーを返す

**Given** 引き合いのステータスが `in_progress` である
**When** `updateInquiryStatus` を `converted` で実行し、存在しないテンプレート ID を指定する
**Then** エラーが返り、引き合いのステータスは変更されない

---

### Requirement: 全リポジトリ関数に organizationId 条件を付与する

`clientRepository` と `inquiryRepository` の全クエリ関数は `organizationId` をパラメータに含み、WHERE 条件に付与しなければならない（SHALL）。`organizationId` はセッションから取得し、リクエストボディから受け取ってはならない。

#### Scenario: 顧客一覧が自組織のみ返る

**Given** 組織 A の顧客が 2 件、組織 B の顧客が 3 件存在する
**When** 組織 A のユーザーが `findAllByOrganization(orgA.id)` を呼び出す
**Then** 組織 A の 2 件のみが返る

#### Scenario: 引き合い一覧が自組織のみ返る

**Given** 組織 A の引き合いが 3 件、組織 B の引き合いが 2 件存在する
**When** 組織 A のユーザーが `findAllByOrganization(orgA.id)` を呼び出す
**Then** 組織 A の 3 件のみが返る

---

### Requirement: 引き合い作成・ステータス変更で監査ログを記録する

引き合いの作成およびステータス変更は、同一トランザクション内で `audit_logs` にレコードを記録しなければならない（MUST）。顧客の作成でも同様に監査ログを記録する。

#### Scenario: 引き合い作成時に監査ログが記録される

**Given** ユーザーが引き合いを作成する
**When** `createInquiry` usecase がトランザクションを完了する
**Then** `action='inquiry.create'`, `targetType='inquiry'`, `targetId=新引き合いID` の監査ログが記録される

#### Scenario: 引き合いステータス変更時に監査ログが記録される

**Given** ユーザーが引き合いのステータスを変更する
**When** `updateInquiryStatus` usecase がトランザクションを完了する
**Then** `action='inquiry.updateStatus'`, `targetType='inquiry'` の監査ログが記録され、metadata にステータスの変更前後が含まれる

#### Scenario: 顧客作成時に監査ログが記録される

**Given** ユーザーが顧客を作成する
**When** `createClient` usecase がトランザクションを完了する
**Then** `action='client.create'`, `targetType='client'`, `targetId=新顧客ID` の監査ログが記録される

---

### Requirement: 引き合いのステータス変更（converted）は admin と manager のみ実行可能

引き合いのステータスを `converted` に変更する Server Action は、セッションユーザーのロールが `admin` または `manager` でない場合にエラーを返さなければならない（SHALL）。その他のステータス変更は全ロールが実行可能とする。

#### Scenario: admin が converted に変更できる

**Given** ログインユーザーのロールが `admin` であり、引き合いのステータスが `in_progress` である
**When** ステータスを `converted` に変更する
**Then** 正常に変更される

#### Scenario: manager が converted に変更できる

**Given** ログインユーザーのロールが `manager` であり、引き合いのステータスが `in_progress` である
**When** ステータスを `converted` に変更する
**Then** 正常に変更される

#### Scenario: member が converted に変更しようとすると拒否される

**Given** ログインユーザーのロールが `member` であり、引き合いのステータスが `in_progress` である
**When** ステータスを `converted` に変更する
**Then** エラーメッセージが返り、ステータスは変更されない

#### Scenario: member が in_progress に変更できる

**Given** ログインユーザーのロールが `member` であり、引き合いのステータスが `new` である
**When** ステータスを `in_progress` に変更する
**Then** 正常に変更される

---

### Requirement: ダッシュボードヘッダーに顧客・引き合いのナビリンクを表示する

ダッシュボードレイアウトのヘッダーナビゲーションに「顧客」（`/clients`）と「引き合い」（`/inquiries`）のリンクを追加しなければならない（SHALL）。このリンクは全ロールに表示する。

#### Scenario: 全ロールのユーザーにナビリンクが表示される

**Given** ログインユーザーのロールが `member` である
**When** ダッシュボードのヘッダーを確認する
**Then** 「顧客」と「引き合い」のナビリンクが表示されている

---

### Requirement: 依存方向を遵守する

新規追加するコードは `actions → usecases → domain (services + models) / repositories (infrastructure)` の依存方向を遵守しなければならない（MUST）。domain 層は infrastructure を import しない。

#### Scenario: inquiryTransition.ts に infrastructure import がない

**Given** `src/domain/services/inquiryTransition.ts` が存在する
**When** ファイルの import 文を確認する
**Then** `@/infrastructure` への import が含まれない

#### Scenario: ドメインモデルファイルに ORM import がない

**Given** `src/domain/models/client.ts` と `src/domain/models/inquiry.ts` が存在する
**When** ファイルの import 文を確認する
**Then** `drizzle` への import が含まれない
