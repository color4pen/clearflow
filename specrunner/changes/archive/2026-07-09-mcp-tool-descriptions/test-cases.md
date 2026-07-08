# Test Cases: MCP ツールの発見性向上（description / フィールド説明の充実）

## Summary

- **Total**: 30 cases
- **Automated** (unit/integration): 27
- **Manual**: 3
- **Priority**: must: 26, should: 4, could: 0

---

### TC-001: 全 19 ツールの description が空でなく相互に distinct である

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全 19 ツールの description が相互に distinct である > Scenario: tools/list で取得した description が全て異なる

---

### TC-002: clients の description に「顧客」が含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 各ツールの description にリソースの主要キーワードが含まれる > Scenario: clients の description に「顧客」が含まれる

---

### TC-003: inquiries の description に「引合」が含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 各ツールの description にリソースの主要キーワードが含まれる > Scenario: inquiries の description に「引合」が含まれる

---

### TC-004: deals の description に「案件」が含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 各ツールの description にリソースの主要キーワードが含まれる > Scenario: deals の description に「案件」が含まれる

---

### TC-005: contracts の description に「契約」が含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 各ツールの description にリソースの主要キーワードが含まれる > Scenario: contracts の description に「契約」が含まれる

---

### TC-006: invoices の description に「請求」が含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 各ツールの description にリソースの主要キーワードが含まれる > Scenario: invoices の description に「請求」が含まれる

---

### TC-007: 既存の inputSchema 広告テストが green

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: description 変更後も inputSchema 広告テストが green である > Scenario: 既存の inputSchema 広告テストが green

---

### TC-008: 既存の全テストが無変更で green

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 挙動は不変である > Scenario: 既存の全テストが無変更で green

---

### TC-009: typecheck / lint / build が green

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 挙動は不変である > Scenario: typecheck / lint / build が green

---

### TC-010: interactions の description に「顧客接点」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `interactions` ツールの description を取得する  
**THEN** description に「顧客接点」が含まれる

---

### TC-011: tasks の description に「タスク」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `tasks` ツールの description を取得する  
**THEN** description に「タスク」が含まれる

---

### TC-012: watches の description に「ウォッチ」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `watches` ツールの description を取得する  
**THEN** description に「ウォッチ」が含まれる

---

### TC-013: notifications の description に「通知」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `notifications` ツールの description を取得する  
**THEN** description に「通知」が含まれる

---

### TC-014: revenue の description に「売上」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `revenue` ツールの description を取得する  
**THEN** description に「売上」が含まれる

---

### TC-015: revenue_targets の description に「売上目標」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `revenue_targets` ツールの description を取得する  
**THEN** description に「売上目標」が含まれる

---

### TC-016: approval_requests の description に「承認」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `approval_requests` ツールの description を取得する  
**THEN** description に「承認」が含まれる

---

### TC-017: delegations の description に「委任」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `delegations` ツールの description を取得する  
**THEN** description に「委任」が含まれる

---

### TC-018: approval_templates の description に「テンプレート」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `approval_templates` ツールの description を取得する  
**THEN** description に「テンプレート」が含まれる

---

### TC-019: approval_policies の description に「ポリシー」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `approval_policies` ツールの description を取得する  
**THEN** description に「ポリシー」が含まれる

---

### TC-020: organization の description に「組織」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `organization` ツールの description を取得する  
**THEN** description に「組織」が含まれる

---

### TC-021: users の description に「ユーザー」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `users` ツールの description を取得する  
**THEN** description に「ユーザー」が含まれる

---

### TC-022: webhooks の description に「Webhook」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `webhooks` ツールの description を取得する  
**THEN** description に「Webhook」が含まれる

---

### TC-023: audit_logs の description に「監査」が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > keyword テスト

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `audit_logs` ツールの description を取得する  
**THEN** description に「監査」が含まれる

---

### TC-024: 全 19 ツールの name が変更されていない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-01: 全 19 ツールの description 書き直し > Acceptance Criteria

**GIVEN** description 変更が適用された MCP サーバー  
**WHEN** `tools/list` で全ツールの name 一覧を取得する  
**THEN** clients / inquiries / deals / contracts / invoices / interactions / tasks / watches / notifications / revenue / revenue_targets / approval_requests / delegations / approval_templates / approval_policies / organization / users / webhooks / audit_logs の 19 名が全て含まれ、その他の名前が増えていない

---

### TC-025: 全 description に operation: リストが含まれる

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-01: 全 19 ツールの description 書き直し > 注意事項 / design.md > D1: description フォーマットの統一規約

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で全ツールの description を取得する  
**THEN** 全 19 件の description が `"operation:"` という文字列を含む

---

### TC-026: approval_requests の description に filter 引数の注意事項が含まれる

**Category**: integration
**Priority**: should
**Source**: design.md > D3: approval_requests の既存補足テキストの扱い

**GIVEN** 全 19 ツールが登録された MCP サーバー  
**WHEN** `tools/list` で `approval_requests` ツールの description を取得する  
**THEN** description に `filter` に言及した注意事項テキストが含まれる（既存の補足テキストが削除されていない）

---

### TC-027: 主要フィールドに .describe() が付与されている

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-02: 主要フィールドの .describe() 補強 > Acceptance Criteria

**GIVEN** .describe() 補強が適用された MCP サーバー  
**WHEN** `tools/list` で各ツールの inputSchema を取得する  
**THEN** contracts ツールの `contractId` プロパティに `description` キーが存在する、deals ツールの `contractType` プロパティに `description` キーが存在する、invoices ツールの `amount` プロパティに `description` キーが存在する

---

### TC-028: inquiries の source・budget フィールドの .describe() が維持されている

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02: 主要フィールドの .describe() 補強 > 注意事項

**GIVEN** .describe() 補強が適用された MCP サーバー  
**WHEN** `tools/list` で `inquiries` ツールの inputSchema を取得する  
**THEN** `source` プロパティの `description` が「問い合わせ元」を含み、`budget` プロパティの `description` が「予算（整数）」を含む

---

### TC-029: mcpToolDescriptions.test.ts がソース文字列照合を使用していない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-03: description 品質テストの作成 > Acceptance Criteria

**GIVEN** `src/__tests__/mcp/mcpToolDescriptions.test.ts` が作成されている  
**WHEN** テストファイルの実装内容を確認する  
**THEN** `readFile`・`fs` 等によるファイル読み込みや description 文字列のソース grep を使用していない。全アサーションが `tools/list` レスポンスのデータに基づく

---

### TC-030: aozu check が exit 0 である

**Category**: manual
**Priority**: should
**Source**: request.md > 受け入れ基準 / request.md > aozu 影響判定

**GIVEN** 全変更（description 書き直し・.describe() 補強）が適用された状態  
**WHEN** `aozu check` を実行する  
**THEN** exit 0（アーキテクチャ制約違反なし）

---

## Result

```yaml
result: completed
total: 30
automated: 27
manual: 3
must: 26
should: 4
could: 0
blocked_reasons: []
```
