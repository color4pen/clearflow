# Spec: 認可ルールの一元化と設計整合

## Requirements

### Requirement: canPerform は権限マトリクスに基づいてロールの操作可否を判定する

`canPerform(role, entity, operation)` 関数は `docs/design/03-authorization-design.md` セクション 3 の権限マトリクスに一致する結果を返さなければならない (SHALL)。定義に存在しないエンティティ・操作の組み合わせは拒否する (MUST)。

#### Scenario: admin は全操作を実行できる

**Given** role が "admin" である
**When** 任意のエンティティの任意の操作に対して canPerform を呼び出す
**Then** 権限マトリクスで ○ と定義されたすべての操作に対して true を返す

#### Scenario: 定義されていない操作は拒否される

**Given** 存在しないエンティティまたは操作名が指定される
**When** canPerform を呼び出す
**Then** false を返す

### Requirement: finance ロールは契約の作成・編集・完了・解除を実行できる

finance ロールは契約 (contract) の作成、編集、ステータス変更（完了・解除）操作を実行できなければならない (SHALL)。

#### Scenario: finance が契約を作成する

**Given** role が "finance" である
**When** canPerform("finance", "contract", "create") を呼び出す
**Then** true を返す

#### Scenario: finance が契約ステータスを変更する

**Given** role が "finance" である
**When** canPerform("finance", "contract", "changeStatus") を呼び出す
**Then** true を返す

#### Scenario: member は契約を作成できない

**Given** role が "member" である
**When** canPerform("member", "contract", "create") を呼び出す
**Then** false を返す

### Requirement: 請求操作は admin と finance のみに許可される

請求 (invoice) の作成、編集、発行、入金確認は admin と finance のみが実行できなければならない (SHALL)。manager は請求の変更操作を実行できない (MUST NOT)。

#### Scenario: finance が請求を作成する

**Given** role が "finance" である
**When** canPerform("finance", "invoice", "create") を呼び出す
**Then** true を返す

#### Scenario: manager は請求を作成できない

**Given** role が "manager" である
**When** canPerform("manager", "invoice", "create") を呼び出す
**Then** false を返す

#### Scenario: manager は請求ステータスを変更できない

**Given** role が "manager" である
**When** canPerform("manager", "invoice", "changeStatus") を呼び出す
**Then** false を返す

### Requirement: member は案件の編集・通常フェーズ変更を実行できる

member ロールは案件 (deal) の編集およびフェーズ変更（非終端フェーズ）を実行できなければならない (SHALL)。ただし、受注 (won) / 失注 (lost) への遷移は admin / manager のみに許可される (MUST)。

#### Scenario: member が案件を編集する

**Given** role が "member" である
**When** canPerform("member", "deal", "edit") を呼び出す
**Then** true を返す

#### Scenario: member が案件のフェーズを変更する（非終端）

**Given** role が "member" である
**When** canPerform("member", "deal", "changePhase") を呼び出す
**Then** true を返す

#### Scenario: member は案件を受注・失注できない

**Given** role が "member" である
**When** canPerform("member", "deal", "closePhase") を呼び出す
**Then** false を返す

#### Scenario: member は案件を作成できない

**Given** role が "member" である
**When** canPerform("member", "deal", "create") を呼び出す
**Then** false を返す

### Requirement: member は引合の編集を実行できる

member ロールは引合 (inquiry) の基本情報を編集できなければならない (SHALL)。案件化 (converted) と見送り (declined) への遷移は admin / manager のみに許可される (MUST)。

#### Scenario: member が引合を編集する

**Given** role が "member" である
**When** canPerform("member", "inquiry", "edit") を呼び出す
**Then** true を返す

#### Scenario: member は引合を案件化できない

**Given** role が "member" である
**When** canPerform("member", "inquiry", "convert") を呼び出す
**Then** false を返す

#### Scenario: member は引合を見送りにできない

**Given** role が "member" である
**When** canPerform("member", "inquiry", "decline") を呼び出す
**Then** false を返す

### Requirement: member は顧客担当者の追加・編集を実行できる

member ロールは顧客 (client) の担当者追加および担当者編集を実行できなければならない (SHALL)。

#### Scenario: member が顧客担当者を追加する

**Given** role が "member" である
**When** canPerform("member", "client", "addContact") を呼び出す
**Then** true を返す

#### Scenario: member が顧客担当者を編集する

**Given** role が "member" である
**When** canPerform("member", "client", "editContact") を呼び出す
**Then** true を返す

### Requirement: 削除操作は admin のみに許可される

引合、案件、契約の削除は admin のみが実行できなければならない (SHALL)。manager、finance、member は削除操作を実行できない (MUST NOT)。

#### Scenario: admin が案件を削除する

**Given** role が "admin" である
**When** canPerform("admin", "deal", "delete") を呼び出す
**Then** true を返す

#### Scenario: manager は案件を削除できない

**Given** role が "manager" である
**When** canPerform("manager", "deal", "delete") を呼び出す
**Then** false を返す

#### Scenario: manager は引合を削除できない

**Given** role が "manager" である
**When** canPerform("manager", "inquiry", "delete") を呼び出す
**Then** false を返す

#### Scenario: manager は契約を削除できない

**Given** role が "manager" である
**When** canPerform("manager", "contract", "delete") を呼び出す
**Then** false を返す

### Requirement: 委任操作は admin / manager / finance に許可される

委任 (delegation) の作成・無効化は admin / manager / finance ロールが実行できなければならない (SHALL)。member は委任操作を実行できない (MUST NOT)。admin 以外のロールは自身の委任のみ操作可能であり、この制約はアクション層で `fromUserId === session.user.id` を検証する (MUST)。

#### Scenario: manager が委任を作成する

**Given** role が "manager" である
**When** canPerform("manager", "approvalSettings", "createDelegation") を呼び出す
**Then** true を返す

#### Scenario: finance が委任を作成する

**Given** role が "finance" である
**When** canPerform("finance", "approvalSettings", "createDelegation") を呼び出す
**Then** true を返す

#### Scenario: member は委任を作成できない

**Given** role が "member" である
**When** canPerform("member", "approvalSettings", "createDelegation") を呼び出す
**Then** false を返す

#### Scenario: manager が自身以外の委任を作成しようとする

**Given** role が "manager" であり、fromUserId がセッションユーザーの id と異なる
**When** createDelegationAction を呼び出す
**Then** 権限エラーを返す

#### Scenario: manager が自身の委任を無効化する

**Given** role が "manager" であり、対象委任の fromUserId がセッションユーザーの id と一致する
**When** deactivateDelegationAction を呼び出す
**Then** 操作が成功する

#### Scenario: manager が他ユーザーの委任を無効化しようとする

**Given** role が "manager" であり、対象委任の fromUserId がセッションユーザーの id と異なる
**When** deactivateDelegationAction を呼び出す
**Then** 権限エラーを返す

#### Scenario: finance が自身の委任を無効化する

**Given** role が "finance" であり、対象委任の fromUserId がセッションユーザーの id と一致する
**When** deactivateDelegationAction を呼び出す
**Then** 操作が成功する

#### Scenario: admin が他ユーザーの委任を無効化する

**Given** role が "admin" であり、対象委任の fromUserId がセッションユーザーの id と異なる
**When** deactivateDelegationAction を呼び出す
**Then** 操作が成功する（admin は所有者確認なしで全委任を操作可能）

#### Scenario: admin 以外が委任一覧を取得すると自身の委任のみが返される

**Given** role が "manager" である
**When** listDelegationsAction を呼び出す
**Then** fromUserId がセッションユーザーの id と一致する委任のみが返される

#### Scenario: finance が委任一覧を取得すると自身の委任のみが返される

**Given** role が "finance" である
**When** listDelegationsAction を呼び出す
**Then** fromUserId がセッションユーザーの id と一致する委任のみが返される

#### Scenario: admin が委任一覧を取得すると全委任が返される

**Given** role が "admin" である
**When** listDelegationsAction を呼び出す
**Then** fromUserId によるフィルタが適用されず、全ユーザーの委任が返される

### Requirement: テンプレート一覧とユーザー一覧は manager にも許可される

承認テンプレート一覧および組織ユーザー一覧は admin と manager が閲覧できなければならない (SHALL)。

#### Scenario: manager がテンプレート一覧を閲覧する

**Given** role が "manager" である
**When** canPerform("manager", "approvalSettings", "listTemplates") を呼び出す
**Then** true を返す

#### Scenario: manager がユーザー一覧を閲覧する

**Given** role が "manager" である
**When** canPerform("manager", "organization", "listUsers") を呼び出す
**Then** true を返す

#### Scenario: finance はテンプレート一覧を閲覧できない

**Given** role が "finance" である
**When** canPerform("finance", "approvalSettings", "listTemplates") を呼び出す
**Then** false を返す

### Requirement: 全アクションのインライン認可チェックが canPerform 呼び出しに置換される

すべてのアクションファイルの `session.user.role !== "admin" && ...` 形式のインライン認可チェックは `canPerform` 呼び出しに置換されなければならない (SHALL)。認可失敗時のレスポンスメッセージは `"この操作を実行する権限がありません"` に統一する (MUST)。

#### Scenario: アクションが認可失敗時に統一メッセージを返す

**Given** 認可チェックで拒否されるロールのユーザーがアクションを呼び出す
**When** アクション関数が実行される
**Then** `"この操作を実行する権限がありません"` を含むエラーレスポンスが返される

#### Scenario: contracts.ts の認可チェックが canPerform を使用する

**Given** contracts.ts のアクション関数
**When** ソースコードを確認する
**Then** `canPerform` を import して使用しており、`session.user.role !== "admin" && session.user.role !== "manager"` のパターンが存在しない

### Requirement: updateDealAction でのフェーズ変更は追加の権限検証を行う

`updateDealAction` の FormData に `phase` フィールドが含まれる場合、edit 権限に加えてフェーズ変更の権限（遷移先が won/lost なら `closePhase`、それ以外は `changePhase`）を検証しなければならない (MUST)。

#### Scenario: member が updateDealAction でフェーズ変更を含む更新を行う（非終端）

**Given** role が "member" であり、FormData に phase="negotiation" が含まれる
**When** updateDealAction を呼び出す
**Then** edit と changePhase の両方が許可されているため、操作が成功する

#### Scenario: member が updateDealAction で終端フェーズへの変更を含む更新を行う

**Given** role が "member" であり、FormData に phase="won" が含まれる
**When** updateDealAction を呼び出す
**Then** closePhase の権限がないため、権限エラーを返す

### Requirement: 引合の見送り (declined) 遷移に認可チェックが追加される

現行コードでは `updateInquiryStatusAction` で `converted` への遷移のみロールチェックがある。`declined` への遷移にも admin / manager のみ許可する認可チェックを追加しなければならない (MUST)。

#### Scenario: member が引合を見送りにする

**Given** role が "member" であり、newStatus が "declined" である
**When** updateInquiryStatusAction を呼び出す
**Then** 権限エラーを返す

#### Scenario: manager が引合を見送りにする

**Given** role が "manager" であり、newStatus が "declined" である
**When** updateInquiryStatusAction を呼び出す
**Then** 操作が成功する

### Requirement: 商談記録の作成は member にも許可される

商談記録 (meeting) の作成は admin / manager / member が実行できなければならない (SHALL)。編集も admin / manager / member に許可される (SHALL)。

#### Scenario: member が商談記録を作成する

**Given** role が "member" である
**When** canPerform("member", "meeting", "create") を呼び出す
**Then** true を返す

#### Scenario: member が商談記録を編集する

**Given** role が "member" である
**When** canPerform("member", "meeting", "edit") を呼び出す
**Then** true を返す

#### Scenario: finance は商談記録を作成できない

**Given** role が "finance" である
**When** canPerform("finance", "meeting", "create") を呼び出す
**Then** false を返す
