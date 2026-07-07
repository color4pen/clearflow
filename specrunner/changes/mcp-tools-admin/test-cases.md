# Test Cases: MCP ツール 管理系（組織・ユーザー・Webhook・監査ログ）

## Summary

- **Total**: 37 cases
- **Automated** (unit/integration): 34
- **Manual**: 3
- **Priority**: must: 24, should: 13, could: 0

---

## organization ツール

### TC-001: organization get で自組織情報を取得できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: organization ツールは get / update 操作を提供する > Scenario: get で自組織の情報を取得できる

### TC-002: organization update で組織名を変更できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: organization ツールは get / update 操作を提供する > Scenario: update で組織名を変更できる

### TC-003: organization update - admin 以外のロールで拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: organization ツールは get / update 操作を提供する > Scenario: admin 以外のロールでは update が拒否される

### TC-004: organization get - member ロールでも成功する

**Category**: integration
**Priority**: should
**Source**: design.md > Goals / tasks.md > T-02 Acceptance Criteria

**GIVEN** member ロールの PAT で認証されたリクエスト
**WHEN** organization ツールを `{ operation: "get" }` で呼ぶ
**THEN** isError: false で自組織の情報が返る（get は全ロール許可）

### TC-005: organization テナント分離 - authInfo の organizationId のみが使用される

**Category**: integration
**Priority**: must
**Source**: design.md > Context（organizationId は authInfo.extra からのみ取得）/ tasks.md > T-08

**GIVEN** organizationId が異なる admin ロールリクエスト 2 件（org-1, org-2）
**WHEN** それぞれ organization ツールを `{ operation: "get" }` で呼ぶ
**THEN** organizationRepository.findById に org-1 / org-2 がそれぞれ渡され、ツール引数からは organizationId を受け取らない

---

## users ツール

### TC-006: users list で自組織ユーザー一覧を取得できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: users ツールは list / create / update_role / deactivate / reactivate 操作を提供する > Scenario: list で自組織のユーザー一覧を取得できる

### TC-007: users create でユーザーを作成できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: users ツールは list / create / update_role / deactivate / reactivate 操作を提供する > Scenario: create でユーザーを作成できる

### TC-008: users update_role でロールを変更できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: users ツールは list / create / update_role / deactivate / reactivate 操作を提供する > Scenario: update_role でロールを変更できる

### TC-009: users deactivate でユーザーを無効化できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: users ツールは list / create / update_role / deactivate / reactivate 操作を提供する > Scenario: deactivate でユーザーを無効化できる

### TC-010: users reactivate でユーザーを再有効化できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: users ツールは list / create / update_role / deactivate / reactivate 操作を提供する > Scenario: reactivate でユーザーを再有効化できる

### TC-011: users - member ロールで全操作が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: users ツールは list / create / update_role / deactivate / reactivate 操作を提供する > Scenario: member ロールでは全操作が拒否される

### TC-012: users - 自分自身の無効化が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: users ツールの deactivate は自己ロックアウト防止が機能する > Scenario: 自分自身の無効化が拒否される

### TC-013: users list - manager ロールで成功する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03（list は admin/manager のみ許可）

**GIVEN** manager ロールの PAT で認証されたリクエスト
**WHEN** users ツールを `{ operation: "list" }` で呼ぶ
**THEN** isError: false でユーザー一覧が返る

### TC-014: users create - レスポンスにパスワードが含まれない

**Category**: integration
**Priority**: must
**Source**: design.md > D5 / tasks.md > T-03 Acceptance Criteria

**GIVEN** admin ロールの PAT で認証されたリクエスト
**WHEN** users ツールを `{ operation: "create", email: "new@example.com", name: "新規ユーザー", role: "member", password: "password123" }` で呼ぶ
**THEN** 成功レスポンスに password フィールドが含まれない

### TC-015: users テナント分離 - authInfo の organizationId が usecase に渡される

**Category**: integration
**Priority**: must
**Source**: design.md > Context / tasks.md > T-09

**GIVEN** organizationId が異なる admin ロールリクエスト 2 件（org-1, org-2）
**WHEN** それぞれ users ツールを `{ operation: "list" }` で呼ぶ
**THEN** listOrganizationUsers に渡される organizationId がそれぞれ org-1 / org-2 であり、リクエスト間で混在しない

---

## webhooks ツール

### TC-016: webhooks create でフルシークレットが返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: webhooks ツールは 6 操作を提供し、シークレットは create 時のみ返す > Scenario: create でフルシークレットが返る

### TC-017: webhooks list でシークレットが含まれない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: webhooks ツールは 6 操作を提供し、シークレットは create 時のみ返す > Scenario: list でシークレットが含まれない

### TC-018: webhooks create - HTTPS 以外の URL が拒否される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: webhooks ツールは 6 操作を提供し、シークレットは create 時のみ返す > Scenario: create で HTTPS 以外の URL が拒否される

### TC-019: webhooks retry_delivery - failed 以外の配信がエラーになる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: webhooks ツールは 6 操作を提供し、シークレットは create 時のみ返す > Scenario: retry_delivery で failed 以外の配信がエラーになる

### TC-020: webhooks - member ロールで全操作が拒否される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-10（全操作 admin 限定）

**GIVEN** member ロールの PAT で認証されたリクエスト
**WHEN** webhooks ツールを list / create / delete / toggle / list_deliveries / retry_delivery の各 operation で呼ぶ
**THEN** 全ての呼び出しで isError: true となり、usecase・repository に到達しない

### TC-021: webhooks create - プライベート IP アドレスの URL が拒否される

**Category**: integration
**Priority**: should
**Source**: design.md > D4 / tasks.md > T-04 Acceptance Criteria

**GIVEN** admin ロールの PAT で認証されたリクエスト
**WHEN** webhooks ツールを `{ operation: "create", url: "https://192.168.1.1/hook", events: ["request.created"] }` で呼ぶ
**THEN** isError: true でプライベート IP 拒否のエラーが返る

### TC-022: webhooks list_deliveries - admin で成功し organizationId がスコープされる

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04（list_deliveries の organizationId スコープ）

**GIVEN** admin ロールの PAT（organizationId: "org-1"）で認証されたリクエスト
**WHEN** webhooks ツールを `{ operation: "list_deliveries", endpointId: "ep-uuid" }` で呼ぶ
**THEN** webhookDeliveryRepository.findByEndpointId に endpointId と organizationId: "org-1" が渡される

### TC-023: webhooks テナント分離 - authInfo の organizationId が使用される

**Category**: integration
**Priority**: must
**Source**: design.md > Context / tasks.md > T-10

**GIVEN** organizationId が異なる admin ロールリクエスト 2 件（org-1, org-2）
**WHEN** それぞれ webhooks ツールを `{ operation: "list" }` で呼ぶ
**THEN** webhookEndpointRepository.findByOrganization に渡される organizationId がそれぞれ org-1 / org-2 であり混在しない

---

## validateWebhookUrl ユーティリティ

### TC-024: validateWebhookUrl - HTTPS 必須バリデーション

**Category**: unit
**Priority**: should
**Source**: design.md > D4 / tasks.md > T-01 Acceptance Criteria

**GIVEN** `validateWebhookUrl` に `"http://example.com/hook"` が渡される
**WHEN** バリデーションを実行する
**THEN** `{ ok: false }` が返り、HTTPS 必須のメッセージが含まれる

### TC-025: validateWebhookUrl - プライベート IP アドレス拒否

**Category**: unit
**Priority**: should
**Source**: design.md > D4 / tasks.md > T-01 Acceptance Criteria

**GIVEN** `validateWebhookUrl` に `"https://10.0.0.1/hook"` が渡される
**WHEN** バリデーションを実行する
**THEN** `{ ok: false }` が返り、プライベート IP 拒否のメッセージが含まれる

### TC-026: webhooks.ts のバリデーションロジック重複が排除されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `src/app/actions/webhooks.ts` のソース
**WHEN** ファイル内のバリデーション実装を確認する
**THEN** `PRIVATE_IP_PATTERNS` / `isPrivateHost` / `validateWebhookUrl` の実装が `webhookUrlValidator.ts` からの import に差し替えられており、重複した定義がない

---

## audit_logs ツール

### TC-027: audit_logs - admin が自組織の監査ログを検索できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: audit_logs ツールは読み取り専用の search 操作を提供する > Scenario: admin が自組織の監査ログを検索できる

### TC-028: audit_logs - フィルタ付きで検索できる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: audit_logs ツールは読み取り専用の search 操作を提供する > Scenario: フィルタ付きで検索できる

### TC-029: audit_logs - admin 以外のロールで拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: audit_logs ツールは読み取り専用の search 操作を提供する > Scenario: admin 以外のロールでは拒否される

### TC-030: audit_logs - 検索結果は自組織のログのみ返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: audit_logs ツールは読み取り専用の search 操作を提供する > Scenario: 検索結果は自組織のログのみ返す

### TC-031: audit_logs - manager ロールで拒否される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-11（exportAuditLog は admin 限定）

**GIVEN** manager ロールの PAT で認証されたリクエスト
**WHEN** audit_logs ツールを `{ operation: "search" }` で呼ぶ
**THEN** isError: true で権限エラーが返り、listAuditLogs usecase に到達しない

---

## 書き込み操作の監査記録

### TC-032: users create の監査記録

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全管理系ツールの書き込み操作は監査ログに記録される > Scenario: users create の監査記録

---

## エラーハンドリング

### TC-033: エラーレスポンスに内部例外詳細が含まれない

**Category**: integration
**Priority**: should
**Source**: request.md > 実装上の必須事項 #3

**GIVEN** usecase が内部例外（例: DB エラーメッセージを含む Error）を throw する状況
**WHEN** ツールハンドラが handleToolError 経由でその例外をキャッチする
**THEN** ツール結果の error テキストに内部エラーメッセージが含まれず、固定文言のみが返る

---

## ツール登録

### TC-034: tools/list が 19 ツールを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: ツール登録数が 19 になる > Scenario: tools/list が 19 ツールを返す

---

## ドキュメント・ビルド検証

### TC-035: README - MCP セクションに 19 ツール一覧と除外 3 件が記載される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-12 Acceptance Criteria

### TC-036: typecheck && test green

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準 / tasks.md > T-13

### TC-037: aozu check exit 0（architecture test green）

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準

---

## Result

```yaml
result: completed
total: 37
automated: 34
manual: 3
must: 24
should: 13
could: 0
blocked_reasons: []
```
