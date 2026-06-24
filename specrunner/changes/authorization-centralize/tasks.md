# Tasks: 認可ルールの一元化と設計整合

## T-01: 認可ポリシーモジュールの作成

- [ ] `src/domain/authorization.ts` を新規作成する
- [ ] `Entity` 型を定義する: `"inquiry" | "deal" | "meeting" | "client" | "contract" | "invoice" | "approval" | "approvalSettings" | "organization"`
- [ ] 各エンティティの `Operation` を文字列リテラルユニオン型で定義する
- [ ] `Role` 型は `src/domain/models/user.ts` から import する
- [ ] `PermissionMatrix` 型を定義する: `Record<Entity, Record<string, Role[]>>`
- [ ] `docs/design/03-authorization-design.md` セクション 3 の全 9 ドメインの操作権限マトリクスをオブジェクトリテラルとして定義する
- [ ] `canPerform(role: Role, entity: Entity, operation: string): boolean` 関数を export する
- [ ] deny-by-default: マトリクスに存在しないエンティティ・操作の組み合わせは `false` を返す

権限マトリクスの内容（`docs/design/03-authorization-design.md` セクション 3 に準拠）:

**引合 (inquiry)**: list/view=全員, create/edit=admin+manager+member, convert/decline=admin+manager, delete=admin
**案件 (deal)**: list/view=全員, create=admin+manager, edit/changePhase/manageContacts=admin+manager+member, closePhase=admin+manager, delete=admin
**商談記録 (meeting)**: list/view=全員, create/edit=admin+manager+member, delete=admin+manager
**顧客 (client)**: list/view=全員, create/edit/addContact/editContact=admin+manager+member, deleteContact=admin+manager, delete=admin
**契約 (contract)**: list/view=全員, create/edit/changeStatus=admin+manager+finance, delete=admin
**請求 (invoice)**: list/view=全員, create/edit/changeStatus=admin+finance, delete=admin
**承認 (approval)**: listRequests/viewRequest/submit=全員, approve/reject=admin+manager+finance
**承認設定 (approvalSettings)**: listPolicies/listTemplates=admin+manager, createPolicy/editPolicy/createTemplate/editTemplate/deleteTemplate=admin, listDelegations=admin+manager+finance+member, createDelegation/deactivateDelegation=admin+manager+finance
**組織管理 (organization)**: listUsers/viewAuditLog=admin+manager, changeRole/exportAuditLog/manageWebhooks=admin

**Acceptance Criteria**:
- `src/domain/authorization.ts` がコンパイル可能である
- `canPerform` が全 9 ドメインの操作に対して正しい boolean を返す
- マトリクスに存在しないエンティティ・操作は `false` を返す

## T-02: 認可ポリシーのユニットテスト作成

- [ ] `src/__tests__/domain/authorization.test.ts` を新規作成する
- [ ] 各エンティティの全操作 × 全ロール（admin, manager, finance, member）の組み合わせをテストする
- [ ] 設計書のマトリクスと一致することを検証する
- [ ] 未定義のエンティティ・操作に対して `false` を返すことを検証する
- [ ] テストフレームワークは `bun:test` を使用する

**Acceptance Criteria**:
- 全 9 ドメインの操作権限マトリクスが網羅的にテストされている
- `bun test src/__tests__/domain/authorization.test.ts` が green

## T-03: contracts.ts の認可チェック置換

- [ ] `canPerform` を `@/domain/authorization` から import する
- [ ] `createContractAction`: `session.user.role !== "admin" && session.user.role !== "manager"` を `!canPerform(session.user.role, "contract", "create")` に置換する
- [ ] `updateContractAction`: 同上の条件を `!canPerform(session.user.role, "contract", "edit")` に置換する
- [ ] `updateContractStatusAction`: 同上の条件を `!canPerform(session.user.role, "contract", "changeStatus")` に置換する
- [ ] `deleteContractAction`: 同上の条件を `!canPerform(session.user.role, "contract", "delete")` に置換する
- [ ] 全認可エラーメッセージを `"この操作を実行する権限がありません"` に統一する

**Acceptance Criteria**:
- `contracts.ts` に `session.user.role !== "admin" && session.user.role !== "manager"` パターンが存在しない
- finance ロールで契約の作成・編集・ステータス変更が許可される
- admin のみ削除が許可される

## T-04: invoices.ts の認可チェック置換

- [ ] `canPerform` を `@/domain/authorization` から import する
- [ ] `createInvoiceAction`: `session.user.role !== "admin" && session.user.role !== "manager"` を `!canPerform(session.user.role, "invoice", "create")` に置換する
- [ ] `updateInvoiceStatusAction`: 同上の条件を `!canPerform(session.user.role, "invoice", "changeStatus")` に置換する
- [ ] 全認可エラーメッセージを `"この操作を実行する権限がありません"` に統一する

**Acceptance Criteria**:
- `invoices.ts` にインラインロールチェックが存在しない
- finance ロールで請求の作成・ステータス変更が許可される
- manager ロールで請求操作が拒否される

## T-05: deals.ts の認可チェック置換

- [ ] `canPerform` を `@/domain/authorization` から import する
- [ ] `createDealAction`: `session.user.role !== "admin" && session.user.role !== "manager"` を `!canPerform(session.user.role, "deal", "create")` に置換する
- [ ] `updateDealPhaseAction`: 同上の条件を、遷移先フェーズに応じた分岐に置換する:
  - 遷移先が `"won"` または `"lost"` の場合: `!canPerform(session.user.role, "deal", "closePhase")`
  - それ以外: `!canPerform(session.user.role, "deal", "changePhase")`
- [ ] `updateDealAction`: 同上の条件を `!canPerform(session.user.role, "deal", "edit")` に置換する
- [ ] `updateDealAction` の `phase` フィールド処理部分に追加の権限チェックを挿入する:
  - `phase` が `"won"` または `"lost"` の場合: `!canPerform(session.user.role, "deal", "closePhase")` を検証
  - それ以外の `phase`: `!canPerform(session.user.role, "deal", "changePhase")` を検証
- [ ] `deleteDealAction`: 同上の条件を `!canPerform(session.user.role, "deal", "delete")` に置換する
- [ ] 全認可エラーメッセージを `"この操作を実行する権限がありません"` に統一する

**Acceptance Criteria**:
- `deals.ts` にインラインロールチェックが存在しない
- member ロールで案件の編集・フェーズ変更（非終端）が許可される
- member ロールで案件の受注・失注（won/lost）が拒否される
- admin のみ削除が許可される

## T-06: inquiries.ts の認可チェック置換

- [ ] `canPerform` を `@/domain/authorization` から import する
- [ ] `createInquiryAction`: 認証チェックの直後に `!canPerform(session.user.role, "inquiry", "create")` の認可チェックを追加する（finance ロールを排除）
- [ ] `updateInquiryAction`: `session.user.role !== "admin" && session.user.role !== "manager"` を `!canPerform(session.user.role, "inquiry", "edit")` に置換する
- [ ] `updateInquiryStatusAction`: `converted` への遷移の既存チェックを `!canPerform(session.user.role, "inquiry", "convert")` に置換する
- [ ] `updateInquiryStatusAction`: `declined` への遷移チェックを追加する — `!canPerform(session.user.role, "inquiry", "decline")`
- [ ] `deleteInquiryAction`: 同上の条件を `!canPerform(session.user.role, "inquiry", "delete")` に置換する
- [ ] 全認可エラーメッセージを `"この操作を実行する権限がありません"` に統一する

**Acceptance Criteria**:
- `inquiries.ts` にインラインロールチェックが存在しない
- member ロールで引合の作成・編集が許可される
- finance ロールで引合の作成が拒否される
- member ロールで引合の案件化・見送りが拒否される
- admin のみ削除が許可される

## T-07: clients.ts の認可チェック置換

- [ ] `canPerform` を `@/domain/authorization` から import する
- [ ] `createClientAction`: 認証チェックの直後に `!canPerform(session.user.role, "client", "create")` の認可チェックを追加する（finance ロールを排除）
- [ ] `updateClientAction`: 認証チェックの直後に `!canPerform(session.user.role, "client", "edit")` の認可チェックを追加する（finance ロールを排除）
- [ ] `addClientContactAction`: `session.user.role !== "admin" && session.user.role !== "manager"` を `!canPerform(session.user.role, "client", "addContact")` に置換する
- [ ] `updateClientContactAction`: 同上の条件を `!canPerform(session.user.role, "client", "editContact")` に置換する
- [ ] `deleteClientContactAction`: 同上の条件を `!canPerform(session.user.role, "client", "deleteContact")` に置換する（担当者削除は admin + manager — `client.delete` ではなく `client.deleteContact` を使用すること）
- [ ] 全認可エラーメッセージを `"この操作を実行する権限がありません"` に統一する

**Acceptance Criteria**:
- `clients.ts` にインラインロールチェックが存在しない
- member ロールで顧客の作成・編集が許可される
- finance ロールで顧客の作成・編集が拒否される
- member ロールで顧客担当者の追加・編集が許可される
- admin と manager が顧客担当者を削除できる
- member と finance は顧客担当者を削除できない

## T-08: delegations.ts の認可チェック置換

- [ ] `canPerform` を `@/domain/authorization` から import する
- [ ] `createDelegationAction`: `session.user.role !== "admin"` を `!canPerform(session.user.role, "approvalSettings", "createDelegation")` に置換する
- [ ] `createDelegationAction`: admin 以外のロールに対して `fromUserId === session.user.id` の検証を追加する。admin 以外かつ `fromUserId !== session.user.id` の場合、権限エラーを返す
- [ ] `deactivateDelegationAction`: `session.user.role !== "admin"` を `!canPerform(session.user.role, "approvalSettings", "deactivateDelegation")` に置換する
- [ ] `deactivateDelegationAction`: admin 以外のロールに対して、対象委任の `fromUserId === session.user.id` の検証を追加する（委任の所有者確認のために委任レコードの取得が必要）
- [ ] `listDelegationsAction`: `session.user.role !== "admin"` を `!canPerform(session.user.role, "approvalSettings", "listDelegations")` に置換する
- [ ] `listDelegationsAction`: admin 以外のロールの場合、自身の委任のみにフィルタリングする（`fromUserId` でフィルタ）
- [ ] 全認可エラーメッセージを `"この操作を実行する権限がありません"` に統一する

**Acceptance Criteria**:
- `delegations.ts` に `session.user.role !== "admin"` パターンが存在しない
- manager / finance ロールで自身の委任の作成・無効化が許可される
- manager / finance ロールで他ユーザーの委任操作が拒否される
- admin は全ユーザーの委任を操作可能

## T-09: templates.ts の認可チェック置換

- [ ] `canPerform` を `@/domain/authorization` から import する
- [ ] `listTemplatesAction`: `session.user.role !== "admin"` を `!canPerform(session.user.role, "approvalSettings", "listTemplates")` に置換する
- [ ] `createTemplateAction`: `session.user.role !== "admin"` を `!canPerform(session.user.role, "approvalSettings", "createTemplate")` に置換する（admin のみのまま）
- [ ] `updateTemplateAction`: `session.user.role !== "admin"` を `!canPerform(session.user.role, "approvalSettings", "editTemplate")` に置換する（admin のみのまま）
- [ ] `deleteTemplateAction`: `session.user.role !== "admin"` を `!canPerform(session.user.role, "approvalSettings", "deleteTemplate")` に置換する（admin のみ — 設計書 3.8 のテンプレート削除行に準拠）
- [ ] 全認可エラーメッセージを `"この操作を実行する権限がありません"` に統一する

**Acceptance Criteria**:
- `templates.ts` に `session.user.role !== "admin"` パターンが存在しない
- manager ロールでテンプレート一覧が閲覧可能
- テンプレートの作成・編集・削除は admin のみ

## T-10: users.ts の認可チェック置換

- [ ] `canPerform` を `@/domain/authorization` から import する
- [ ] `listUsersAction`: `session.user.role !== "admin"` を `!canPerform(session.user.role, "organization", "listUsers")` に置換する
- [ ] `updateUserRoleAction`: `session.user.role !== "admin"` を `!canPerform(session.user.role, "organization", "changeRole")` に置換する（admin のみのまま）
- [ ] 全認可エラーメッセージを `"この操作を実行する権限がありません"` に統一する

**Acceptance Criteria**:
- `users.ts` に `session.user.role !== "admin"` パターンが存在しない
- manager ロールでユーザー一覧が閲覧可能
- ロール変更は admin のみ

## T-11: meetings.ts の認可チェック置換

- [ ] `canPerform` を `@/domain/authorization` から import する
- [ ] `createMeetingAction`: 認証チェックの直後に `!canPerform(session.user.role, "meeting", "create")` の認可チェックを追加する
- [ ] `updateMeetingAction`: `session.user.role !== "admin" && session.user.role !== "manager"` を `!canPerform(session.user.role, "meeting", "edit")` に置換する
- [ ] 全認可エラーメッセージを `"この操作を実行する権限がありません"` に統一する

**Acceptance Criteria**:
- `meetings.ts` にインラインロールチェックが存在しない
- member ロールで商談記録の作成・編集が許可される
- finance ロールで商談記録の作成・編集が拒否される

## T-12: webhooks.ts の認可チェック置換

- [ ] `canPerform` を `@/domain/authorization` から import する
- [ ] 全 webhook アクション（listWebhookEndpointsAction, createWebhookEndpointAction, deleteWebhookEndpointAction, toggleWebhookEndpointAction, listWebhookDeliveriesAction, retryWebhookDeliveryAction）の `session.user.role !== "admin"` を `!canPerform(session.user.role, "organization", "manageWebhooks")` に置換する
- [ ] 全認可エラーメッセージを `"この操作を実行する権限がありません"` に統一する

**Acceptance Criteria**:
- `webhooks.ts` に `session.user.role !== "admin"` パターンが存在しない
- admin のみ webhook 操作が許可される（変更なし）

## T-13: 既存テストの更新

- [ ] `src/__tests__/actions/roleCheck.test.ts` を更新する
- [ ] ソースコード文字列の静的パターンマッチング（`session.user.role !== "admin" && session.user.role !== "manager"` の検出）を、`canPerform` import の検出に置換する
- [ ] 認可エラーメッセージの検出を `"権限がありません"` から `"この操作を実行する権限がありません"` に更新する
- [ ] `bun test` で全テストが green であることを確認する

**Acceptance Criteria**:
- `roleCheck.test.ts` が更新後のコードで green
- `bun test` が全件 green
- `bun run build` が成功する（typecheck 含む）
