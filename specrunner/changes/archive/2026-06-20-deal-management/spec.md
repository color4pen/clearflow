# Spec: 案件管理と見積承認フロー連携

## Requirements

### Requirement: dealPhaseEnum は 6 値で定義される

`dealPhaseEnum` は pgEnum として `["proposal_prep", "proposed", "negotiation", "internal_approval", "won", "lost"]` の 6 値で定義されなければならない（MUST）。

#### Scenario: dealPhaseEnum がスキーマに存在する

**Given** `src/infrastructure/schema.ts` が読み込まれる
**When** `dealPhaseEnum` の定義を確認する
**Then** `["proposal_prep", "proposed", "negotiation", "internal_approval", "won", "lost"]` の 6 値が順に定義されている

---

### Requirement: 案件のフェーズ遷移ルール

案件のフェーズ遷移は以下のルールに従わなければならない（MUST）:
- `proposal_prep → proposed | lost`: 許可
- `proposed → negotiation | lost`: 許可
- `negotiation → internal_approval | lost`: 許可
- `internal_approval → won | lost`: 許可
- `won` は終端状態: いかなる遷移も拒否
- `lost` は終端状態: いかなる遷移も拒否
- 全フェーズ（終端状態を除く）から `lost` への遷移が許可される

`canTransition(from, to)` 関数がこのルールを判定する。

#### Scenario: proposal_prep から proposed への遷移が許可される

**Given** 案件のフェーズが `proposal_prep` である
**When** `canTransition("proposal_prep", "proposed")` を呼び出す
**Then** `true` が返る

#### Scenario: negotiation から internal_approval への遷移が許可される

**Given** 案件のフェーズが `negotiation` である
**When** `canTransition("negotiation", "internal_approval")` を呼び出す
**Then** `true` が返る

#### Scenario: won は終端状態であり遷移が拒否される

**Given** 案件のフェーズが `won` である
**When** `canTransition("won", "proposal_prep")` を呼び出す
**Then** `false` が返る

#### Scenario: lost は終端状態であり遷移が拒否される

**Given** 案件のフェーズが `lost` である
**When** `canTransition("lost", "negotiation")` を呼び出す
**Then** `false` が返る

#### Scenario: 全フェーズから lost への遷移が許可される（終端状態除く）

**Given** 案件のフェーズが `proposal_prep`, `proposed`, `negotiation`, `internal_approval` のいずれかである
**When** `canTransition(phase, "lost")` を呼び出す
**Then** いずれも `true` が返る

---

### Requirement: internal_approval 遷移時に見積承認リクエストを自動作成する

案件のフェーズを `internal_approval` に遷移する際、指定された承認テンプレートを使用して見積承認リクエスト（Request）を自動作成し、`deals.estimateRequestId` に紐づけなければならない（MUST）。承認リクエストのタイトルは `"見積承認: ${deal.title}"` とし、フォームデータとして `{ amount: { value: deal.estimatedAmount, label: "想定金額" } }` を渡す。この操作は単一トランザクション内で完了する。

#### Scenario: internal_approval 遷移時に見積承認リクエストが作成される

**Given** 案件のフェーズが `negotiation` であり、有効な承認テンプレートが存在する
**When** `updateDealPhase` を `internal_approval` で実行し、テンプレート ID を指定する
**Then** 見積承認リクエストが作成され、案件の `estimateRequestId` に紐づく

#### Scenario: テンプレート未指定で internal_approval 遷移時にエラーを返す

**Given** 案件のフェーズが `negotiation` である
**When** `updateDealPhase` を `internal_approval` で実行し、テンプレート ID を指定しない
**Then** エラーが返り、案件のフェーズは変更されない

#### Scenario: テンプレートが存在しない場合にエラーを返す

**Given** 案件のフェーズが `negotiation` である
**When** `updateDealPhase` を `internal_approval` で実行し、存在しないテンプレート ID を指定する
**Then** エラーが返り、案件のフェーズは変更されない

---

### Requirement: 案件作成時に引き合いのステータスが converted であることを検証する

案件の作成は、紐づく引き合いのステータスが `converted` である場合のみ許可されなければならない（SHALL）。

#### Scenario: converted の引き合いに対して案件を作成できる

**Given** 引き合いのステータスが `converted` である
**When** `createDeal` を実行する
**Then** 案件が作成される

#### Scenario: converted でない引き合いに対して案件を作成しようとした場合にエラーを返す

**Given** 引き合いのステータスが `in_progress` である
**When** `createDeal` を実行する
**Then** エラーが返り、案件は作成されない

---

### Requirement: 同一引き合いに対する案件の重複作成を禁止する

1 つの引き合いに対して作成できる案件は 1 件のみでなければならない（MUST）。

#### Scenario: 同一引き合いに対して 2 件目の案件を作成しようとした場合にエラーを返す

**Given** 引き合い A に対して案件が既に 1 件存在する
**When** 引き合い A に対して `createDeal` を再度実行する
**Then** エラーが返り、2 件目の案件は作成されない

---

### Requirement: 全リポジトリ関数に organizationId 条件を付与する

`dealRepository` の全クエリ関数は `organizationId` をパラメータに含み、WHERE 条件に付与しなければならない（SHALL）。`organizationId` はセッションから取得し、リクエストボディから受け取ってはならない。

#### Scenario: 案件一覧が自組織のみ返る

**Given** 組織 A の案件が 2 件、組織 B の案件が 1 件存在する
**When** 組織 A のユーザーが `findAllByOrganization(orgA.id)` を呼び出す
**Then** 組織 A の 2 件のみが返る

---

### Requirement: 案件の作成・フェーズ変更・情報更新で監査ログを記録する

案件の作成、フェーズ変更、情報更新は、同一トランザクション内で `audit_logs` にレコードを記録しなければならない（MUST）。

#### Scenario: 案件作成時に監査ログが記録される

**Given** ユーザーが案件を作成する
**When** `createDeal` usecase がトランザクションを完了する
**Then** `action='deal.create'`, `targetType='deal'`, `targetId=新案件ID` の監査ログが記録される

#### Scenario: 案件フェーズ変更時に監査ログが記録される

**Given** ユーザーが案件のフェーズを変更する
**When** `updateDealPhase` usecase がトランザクションを完了する
**Then** `action='deal.updatePhase'`, `targetType='deal'` の監査ログが記録され、metadata にフェーズの変更前後が含まれる

#### Scenario: 案件情報更新時に監査ログが記録される

**Given** ユーザーが案件の情報を更新する
**When** `updateDeal` usecase がトランザクションを完了する
**Then** `action='deal.update'`, `targetType='deal'` の監査ログが記録される

---

### Requirement: 案件作成・フェーズ変更は admin と manager のみ実行可能

案件の作成とフェーズ変更の Server Action は、セッションユーザーのロールが `admin` または `manager` でない場合にエラーを返さなければならない（SHALL）。案件情報の更新は全ロールが実行可能とする。

#### Scenario: admin が案件を作成できる

**Given** ログインユーザーのロールが `admin` である
**When** `createDealAction` を実行する
**Then** 正常に案件が作成される

#### Scenario: member が案件を作成しようとすると拒否される

**Given** ログインユーザーのロールが `member` である
**When** `createDealAction` を実行する
**Then** エラーメッセージが返り、案件は作成されない

#### Scenario: member が案件情報を更新できる

**Given** ログインユーザーのロールが `member` である
**When** `updateDealAction` を実行する
**Then** 正常に案件情報が更新される

---

### Requirement: ダッシュボードヘッダーに案件のナビリンクを表示する

ダッシュボードレイアウトのヘッダーナビゲーションに「案件」（`/deals`）のリンクを追加しなければならない（SHALL）。「引き合い」の後に配置し、全ロールに表示する。

#### Scenario: 全ロールのユーザーにナビリンクが表示される

**Given** ログインユーザーのロールが `member` である
**When** ダッシュボードのヘッダーを確認する
**Then** 「案件」のナビリンクが表示されている

---

### Requirement: 引き合い詳細ページに案件セクションを表示する

引き合い詳細ページ（`/inquiries/[id]`）に案件セクションを追加しなければならない（SHALL）。引き合いに紐づく案件があればリンクを表示し、`converted` ステータスで案件が未作成の場合は「案件を作成」ボタンを表示する。

#### Scenario: 案件が存在する場合にリンクを表示する

**Given** 引き合いに紐づく案件が存在する
**When** 引き合い詳細ページを表示する
**Then** 案件へのリンクが表示される

#### Scenario: converted で案件未作成の場合に作成ボタンを表示する

**Given** 引き合いのステータスが `converted` で、案件が存在しない
**When** 引き合い詳細ページを表示する
**Then** 「案件を作成」ボタンが表示される

---

### Requirement: 依存方向を遵守する

新規追加するコードは `actions → usecases → domain (services + models) / repositories (infrastructure)` の依存方向を遵守しなければならない（MUST）。domain 層は infrastructure を import しない。

#### Scenario: dealTransition.ts に infrastructure import がない

**Given** `src/domain/services/dealTransition.ts` が存在する
**When** ファイルの import 文を確認する
**Then** `@/infrastructure` への import が含まれない

#### Scenario: ドメインモデルファイルに ORM import がない

**Given** `src/domain/models/deal.ts` が存在する
**When** ファイルの import 文を確認する
**Then** `drizzle` への import が含まれない
