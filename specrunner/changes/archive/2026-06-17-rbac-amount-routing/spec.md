# Spec: RBAC拡張と金額による承認経路の自動分岐

## Requirements

### Requirement: ロール体系の拡張

システムは `roleEnum` に `"manager"` と `"finance"` を含む4値のロール体系を提供 SHALL する。既存の `"admin"` と `"member"` は維持される。`Role` 型はこの4値のユニオン型として定義される MUST。

#### Scenario: roleEnum に manager と finance が存在する

**Given** データベーススキーマが適用されている
**When** `roleEnum` の定義を参照する
**Then** `["admin", "member", "manager", "finance"]` の4値が含まれる

#### Scenario: Role 型が4値のユニオン型である

**Given** `src/domain/models/user.ts` の `Role` 型
**When** 型定義を確認する
**Then** `"admin" | "member" | "manager" | "finance"` として定義されている

---

### Requirement: requests テーブルの金額カラム

`requests` テーブルは `amount` カラム（integer, nullable）を持つ MUST。`Request` ドメインモデルは `amount: number | null` フィールドを持つ MUST。

#### Scenario: 金額ありの申請を作成する

**Given** 申請作成フォームで金額 100000 を入力している
**When** 申請を作成する
**Then** `requests` テーブルに `amount = 100000` のレコードが保存される

#### Scenario: 金額なしの申請を作成する

**Given** 申請作成フォームで金額を入力していない
**When** 申請を作成する
**Then** `requests` テーブルに `amount = null` のレコードが保存される

---

### Requirement: 承認テンプレートの金額条件

`approval_templates` テーブルは `minAmount`（integer, nullable）と `maxAmount`（integer, nullable）カラムを持つ MUST。`ApprovalTemplate` ドメインモデルは `minAmount: number | null` と `maxAmount: number | null` フィールドを持つ MUST。null は「制限なし」を意味する。

#### Scenario: 金額範囲付きテンプレートが定義されている

**Given** テンプレート「少額申請」に `minAmount = null`, `maxAmount = 100000` が設定されている
**When** テンプレートを参照する
**Then** `minAmount` が null（下限なし）、`maxAmount` が 100000 として取得できる

---

### Requirement: テンプレート自動選択

`templateSelectionService` は申請の金額に基づいて適用可能なテンプレートを選択 SHALL する。選択ロジックは `minAmount <= amount <= maxAmount` のマッチングで行われる。金額未指定の場合は `minAmount` / `maxAmount` が共に null のデフォルトテンプレートを選択する MUST。該当テンプレートが見つからない場合はエラーを返す MUST。

#### Scenario: 金額10万円の申請に少額テンプレートが選択される

**Given** 組織に以下のテンプレートが存在する:
  - デフォルト（minAmount=null, maxAmount=null, manager 1段階）
  - 少額（minAmount=null, maxAmount=100000, manager 1段階）
  - 高額（minAmount=100001, maxAmount=null, manager→finance 2段階）
**When** 金額 100000 の申請を作成する
**Then** 少額テンプレート（manager 1段階）が自動選択される

#### Scenario: 金額20万円の申請に高額テンプレートが選択される

**Given** 組織に上記3テンプレートが存在する
**When** 金額 200000 の申請を作成する
**Then** 高額テンプレート（manager→finance 2段階）が自動選択される

#### Scenario: 金額未指定の申請にデフォルトテンプレートが選択される

**Given** 組織に上記3テンプレートが存在する
**When** 金額未指定（null）の申請を作成する
**Then** デフォルトテンプレート（manager 1段階）が選択される

#### Scenario: 該当テンプレートが存在しない場合はエラー

**Given** 組織にデフォルトテンプレート（minAmount/maxAmount 共に null）が存在しない
**When** 金額未指定の申請を作成する
**Then** エラーが返される（申請は作成されない）

---

### Requirement: createRequest の金額ベース移行

`createRequest` usecase は `templateId` の直接指定を廃止し、`amount`（nullable）を受け取る MUST。usecase 内部で `templateSelectionService` を使用してテンプレートを自動選択する SHALL。

#### Scenario: createRequest が金額を受け取りテンプレートを自動選択する

**Given** 少額テンプレート（maxAmount=100000, manager 1段階）が存在する
**When** `createRequest({ title: "備品購入", amount: 50000, ... })` を実行する
**Then** 少額テンプレートが自動選択され、manager ロールの承認ステップ1件が作成される

#### Scenario: createRequest が amount を Request レコードに保存する

**Given** 有効なテンプレートが存在する
**When** `createRequest({ ..., amount: 150000 })` を実行する
**Then** 作成された `Request` レコードの `amount` が 150000 である

---

### Requirement: ロールベースの承認権限

`canApprove` の単純比較ロジック（`step.approverRole === actorRole`）は維持 SHALL される。ロール追加により、manager ステップは manager ユーザーのみ、finance ステップは finance ユーザーのみが承認可能になる。

#### Scenario: manager ユーザーが manager ステップを承認できる

**Given** 承認ステップの `approverRole` が `"manager"` である
**When** `actorRole = "manager"` で `canApprove` を呼び出す
**Then** true が返される

#### Scenario: manager ユーザーが finance ステップを承認できない

**Given** 承認ステップの `approverRole` が `"finance"` である
**When** `actorRole = "manager"` で `canApprove` を呼び出す
**Then** false が返される

#### Scenario: finance ユーザーが finance ステップを承認できる

**Given** 承認ステップの `approverRole` が `"finance"` である
**When** `actorRole = "finance"` で `canApprove` を呼び出す
**Then** true が返される

---

### Requirement: アクション層の承認・却下権限ゲート

`approveRequestAction` と `rejectRequestAction` は member ロール以外のユーザーに操作を許可 SHALL する。member ロールのユーザーが承認・却下を試みた場合は拒否する MUST。

#### Scenario: manager ユーザーが承認操作を試行できる

**Given** ログインユーザーのロールが `"manager"` である
**When** 承認アクションを実行する
**Then** アクション層の権限チェックを通過し、usecase に処理が委譲される

#### Scenario: member ユーザーが承認操作を拒否される

**Given** ログインユーザーのロールが `"member"` である
**When** 承認アクションを実行する
**Then** 「権限がありません」エラーが返される

---

### Requirement: テンプレート自動選択の監査ログ

`createRequest` usecase がテンプレートを自動選択した場合、監査ログに選択されたテンプレート ID と金額を記録する MUST。

#### Scenario: テンプレート自動選択結果が監査ログに記録される

**Given** 金額 200000 の申請を作成する
**When** 高額テンプレート（id: "tmpl-xyz"）が自動選択される
**Then** `audit_logs` に `action = "request.create"` のレコードが作成され、metadata に `templateId` と `amount` が含まれる

---

### Requirement: UI の金額入力への移行

申請作成フォームはテンプレート選択 UI を削除し、金額入力フィールドを表示する MUST。申請一覧・詳細画面は金額を表示する SHALL。

#### Scenario: 申請作成フォームにテンプレート選択UIが存在しない

**Given** 申請作成ページを表示する
**When** フォーム要素を確認する
**Then** テンプレート選択ドロップダウンが存在せず、金額入力フィールドが存在する

#### Scenario: 申請詳細画面に金額が表示される

**Given** 金額 150000 の申請が存在する
**When** 申請詳細画面を表示する
**Then** 金額「150,000」が表示される

---

### Requirement: シードデータの更新

シードデータは3つのテンプレートと、manager / finance ロールのユーザーを含む MUST。

#### Scenario: 3つのテンプレートが定義される

**Given** シードスクリプトを実行する
**When** `approval_templates` を確認する
**Then** 以下の3テンプレートが存在する:
  - デフォルト（minAmount=null, maxAmount=null, steps: manager 1段階）
  - 少額（minAmount=null, maxAmount=100000, steps: manager 1段階）
  - 高額（minAmount=100001, maxAmount=null, steps: manager→finance 2段階）

#### Scenario: manager と finance ロールのユーザーが存在する

**Given** シードスクリプトを実行する
**When** `users` テーブルを確認する
**Then** `role = "manager"` と `role = "finance"` のユーザーが各1名以上存在する
