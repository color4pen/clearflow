# Spec: アクションアイテムのテーブル・モデル・リポジトリ・ユースケース新設

## Requirements

### Requirement: アクションアイテムのテナント分離

リポジトリ層のすべてのクエリは `organization_id` 条件を含まなければならない（MUST）。ユースケース層は認証済みセッションから取得した `organizationId` を使用し、リクエストボディの値を使用してはならない。

#### Scenario: 組織 A のユーザーが組織 B のアクションアイテムを取得できない

**Given** 組織 A と組織 B がそれぞれアクションアイテムを持つ
**When** 組織 A のユーザーが `findByOrganization(orgAId)` を呼び出す
**Then** 組織 A のアクションアイテムのみが返され、組織 B のアクションアイテムは含まれない

#### Scenario: 他組織のアクションアイテムを ID で取得できない

**Given** 組織 B に属するアクションアイテムが存在する
**When** 組織 A のユーザーが `findById(itemId, orgAId)` を呼び出す
**Then** null が返される

### Requirement: アクションアイテムの紐づけ先エンティティの ownership チェック

サーバーアクションは、アクションアイテム作成・更新時に紐づけ先エンティティ（meeting, deal, inquiry）の `organizationId` が操作者の `organizationId` と一致することを検証しなければならない（MUST）。

#### Scenario: 他組織の案件にアクションアイテムを紐づけられない

**Given** 組織 A のユーザーが組織 B の案件 ID を指定してアクションアイテムを作成しようとする
**When** `createActionItem` ユースケースが呼び出される
**Then** エラーが返され、アクションアイテムは作成されない

#### Scenario: 自組織の案件にアクションアイテムを紐づけられる

**Given** 組織 A のユーザーが組織 A の案件 ID を指定してアクションアイテムを作成する
**When** `createActionItem` ユースケースが呼び出される
**Then** アクションアイテムが作成される

### Requirement: サーバーアクションでの認可チェック

すべてのアクションアイテム関連サーバーアクションは、操作実行前に `canPerform` による認可チェックを行わなければならない（MUST）。権限がないユーザーの操作はエラーメッセージと共に拒否されなければならない。

#### Scenario: member ロールのユーザーがアクションアイテムを作成できる

**Given** role が `member` のユーザーが認証済みである
**When** `createActionItemAction` を呼び出す
**Then** 認可チェックが成功し、ユースケースが実行される

#### Scenario: 権限のないロールのユーザーが削除できない

**Given** `canPerform(role, "actionItem", "delete")` が false を返すロールのユーザーが認証済みである
**When** `deleteActionItemAction` を呼び出す
**Then** 「この操作を実行する権限がありません」エラーが返される

### Requirement: アクションアイテムの done 状態トグル

`toggleActionItemDone` ユースケースは、アクションアイテムの `done` フラグを反転させなければならない（MUST）。操作対象のアクションアイテムが存在しない場合、または組織が一致しない場合はエラーを返さなければならない。

#### Scenario: 未完了のアクションアイテムを完了にする

**Given** `done = false` のアクションアイテムが存在する
**When** `toggleActionItemDone` を呼び出す
**Then** `done` が `true` に更新される

#### Scenario: 完了のアクションアイテムを未完了に戻す

**Given** `done = true` のアクションアイテムが存在する
**When** `toggleActionItemDone` を呼び出す
**Then** `done` が `false` に更新される

### Requirement: マイグレーションで既存データが保持される

既存の `meetings.action_items` JSON データは `action_items` テーブルに移行されなければならない（MUST）。`assignee`（名前文字列）は `assignee_id = null` で移行し、`description` に `[担当: {assignee}] {description}` として付記しなければならない。`meetings.action_items` カラムは削除してはならない（MUST NOT）。

#### Scenario: JSON 埋め込みのアクションアイテムがテーブルに移行される

**Given** meeting レコードに `action_items` JSON 配列が存在する
**When** マイグレーション SQL を実行する
**Then** 各 JSON 要素が `action_items` テーブルの行として挿入される

#### Scenario: assignee の名前が description に付記される

**Given** JSON アクションアイテムに `assignee: "田中太郎"`, `description: "見積もり作成"` がある
**When** マイグレーション SQL を実行する
**Then** 移行先の `description` は `[担当: 田中太郎] 見積もり作成` となり、`assignee_id` は null である

#### Scenario: meetings.action_items カラムが残る

**Given** マイグレーション完了後
**When** meetings テーブルのスキーマを確認する
**Then** `action_items` カラムが存在する

### Requirement: revalidatePath の適切な呼び出し

サーバーアクションは `/dashboard` を常に revalidate しなければならない（MUST）。`dealId` がある場合は `/deals/[dealId]` を、`meetingId` がある場合は紐づく deal の `/deals/[dealId]/meetings/[meetingId]` も revalidate しなければならない。

#### Scenario: dealId 付きアクションアイテム作成時に deal ページが再検証される

**Given** `dealId` が指定されたアクションアイテムを作成する
**When** サーバーアクションが成功する
**Then** `/dashboard` と `/deals/{dealId}` が revalidate される

#### Scenario: meetingId 付きアクションアイテム作成時に meeting ページが再検証される

**Given** `meetingId` が指定されたアクションアイテムを作成する（meeting は dealId を持つ）
**When** サーバーアクションが成功する
**Then** `/dashboard` と `/deals/{dealId}/meetings/{meetingId}` が revalidate される
