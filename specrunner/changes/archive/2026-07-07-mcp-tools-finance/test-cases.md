# Test Cases: MCP ツール — 経理系（契約・請求・売上）

<!-- FORMAT REQUIREMENTS:
Test Case heading format: `### TC-{NNN}: {Name}` (3-digit zero-padded, e.g. TC-001)

Required fields per test case:
  **Category**: unit | integration | manual
  **Priority**: must | should | could

GIVEN/WHEN/THEN structure (mixed format — depends on TC type):
  Scenario 由来 TC (Source = spec.md > Requirement: <name> > Scenario: <name>):
    GWT は記述しない。Source 参照のみ。behavior の正典は spec の Scenario。
  非 Scenario 由来 TC (Source = design.md or tasks.md section):
    GWT は必須:
    **GIVEN** <preconditions>
    **WHEN** <action>
    **THEN** <expected result>

Category determination:
  unit        — pure logic, validation, helper functions (automated)
  integration — DB operations, API endpoints, multi-module interaction (automated)
  manual      — UI/UX confirmation, visual verification, build artifact check (not automated)

Priority determination:
  must   — core functionality; if broken, the feature does not work
  should — important but core still works; edge cases, error handling
  could  — nice to have; performance, UX details
-->

## Summary

- **Total**: 45 cases
- **Automated** (unit/integration): 43
- **Manual**: 2
- **Priority**: must: 36, should: 8, could: 1

---

## contracts ツール — 基本 CRUD・ステータス遷移

### TC-001: 契約一覧の取得

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: contracts ツールは契約の CRUD・ステータス遷移をサポートする > Scenario: 契約一覧の取得

### TC-002: 契約詳細の取得

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: contracts ツールは契約の CRUD・ステータス遷移をサポートする > Scenario: 契約詳細の取得

### TC-003: 契約の作成（正常系）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: contracts ツールは契約の CRUD・ステータス遷移をサポートする > Scenario: 契約の作成（正常系）

### TC-004: won でない案件への契約作成が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: contracts ツールは契約の CRUD・ステータス遷移をサポートする > Scenario: won でない案件への契約作成が拒否される

### TC-005: 契約のステータス更新

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: contracts ツールは契約の CRUD・ステータス遷移をサポートする > Scenario: 契約のステータス更新

### TC-006: 契約の削除

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: contracts ツールは契約の CRUD・ステータス遷移をサポートする > Scenario: 契約の削除

---

## contracts ツール — 部分更新・楽観的ロック

### TC-007: title のみ更新する（部分更新）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: contracts ツールの update は部分更新と楽観的ロックをサポートする > Scenario: title のみ更新する

### TC-008: version 不一致で衝突エラーが返る（契約）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: contracts ツールの update は部分更新と楽観的ロックをサポートする > Scenario: version 不一致で衝突エラーが返る

### TC-038: contracts の update で null と undefined が区別される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01: contracts ツールの実装

**GIVEN** 既存の契約が存在し、`contractType` と `endDate` がセットされている
**WHEN** `operation: "update"` で `endDate: null`（クリア）と `contractType` を省略（変更なし）して呼ぶ
**THEN** usecase に渡る引数で `endDate` が `null`、`contractType` が `undefined`（元の値を上書きしない）であることを assert する

---

## invoices ツール — 基本 CRUD

### TC-009: 契約別の請求一覧

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: invoices ツールは請求の CRUD・ステータス遷移をサポートする > Scenario: 契約別の請求一覧

### TC-010: 組織全体の請求一覧（フィルタあり）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: invoices ツールは請求の CRUD・ステータス遷移をサポートする > Scenario: 組織全体の請求一覧（フィルタあり）

### TC-011: 請求の作成

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: invoices ツールは請求の CRUD・ステータス遷移をサポートする > Scenario: 請求の作成

### TC-035: invoices の list が contractId 有無で usecase を切り替える

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02: invoices ツールの実装

**GIVEN** invoices ツールの list operation で `contractId` を指定するケースと省略するケースがある
**WHEN** `contractId` を指定して list を呼ぶ
**THEN** `listInvoicesByContract` usecase が呼ばれ、`listInvoicesByOrganization` は呼ばれない
**WHEN** `contractId` を省略して list を呼ぶ
**THEN** `listInvoicesByOrganization` usecase が呼ばれ、`listInvoicesByContract` は呼ばれない

---

## invoices ツール — 入金記録のステータス遷移

### TC-012: scheduled から paid への遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 未発行請求の入金記録が拒否される > Scenario: scheduled から paid への遷移が拒否される

### TC-013: invoiced から paid への遷移が成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 未発行請求の入金記録が拒否される > Scenario: invoiced から paid への遷移が成功する

---

## invoices ツール — 入金日バリデーション

### TC-014: paidAt 指定ありで入金記録（Date 変換）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 入金記録に入金日が必要な場合のバリデーション > Scenario: paidAt 指定ありで入金記録

### TC-015: paidAt 未指定で入金記録（usecase デフォルト動作）

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 入金記録に入金日が必要な場合のバリデーション > Scenario: paidAt 未指定で入金記録

### TC-016: 将来日付の paidAt が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 入金記録に入金日が必要な場合のバリデーション > Scenario: 将来日付の paidAt が拒否される

### TC-042: paidAt の JST タイムゾーン境界検証

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02: invoices ツールの実装

**GIVEN** 現在時刻が JST 0:00 直後（UTC 前日 15:00）のとき、今日の JST 日付 = `todayJST`
**WHEN** `paidAt` に `todayJST` と同じ日付文字列を指定する
**THEN** 「本日以前」と判定され `isError` にならず usecase に渡る
**WHEN** `paidAt` に `todayJST` の翌日を指定する
**THEN** MCP ツールレイヤーで `isError: true` となり usecase は呼ばれない

---

## invoices ツール — 部分更新・楽観的ロック

### TC-017: amount のみ更新する（部分更新）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: invoices ツールの update は部分更新と楽観的ロックをサポートする > Scenario: amount のみ更新する

### TC-018: version 不一致で衝突エラーが返る（請求）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: invoices ツールの update は部分更新と楽観的ロックをサポートする > Scenario: version 不一致で衝突エラーが返る

### TC-039: invoices の update で null と undefined が区別される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02: invoices ツールの実装

**GIVEN** 既存の請求が `issueDate` と `notes` をセットした状態で存在する
**WHEN** `operation: "update"` で `notes: null`（クリア）を指定し `issueDate` を省略（変更なし）して呼ぶ
**THEN** usecase に渡る引数で `notes` が `null`、`issueDate` が `undefined`（元の値を上書きしない）であることを assert する

---

## revenue ツール — 読み取り専用クエリ

### TC-019: 売上ダッシュボードの取得

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: revenue ツールは売上の読み取り専用クエリをサポートする > Scenario: 売上ダッシュボードの取得

### TC-020: 売上明細の取得（顧客別）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: revenue ツールは売上の読み取り専用クエリをサポートする > Scenario: 売上明細の取得（顧客別）

### TC-021: 売上予実の取得

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: revenue ツールは売上の読み取り専用クエリをサポートする > Scenario: 売上予実の取得

### TC-036: revenue ツールは checkRateLimit が適用されない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03: revenue ツールの実装（読み取り専用）

**GIVEN** revenue ツールを呼ぶ際、`@/infrastructure/rateLimit` の `checkRateLimit` が呼ばれていないことを検証したい
**WHEN** `rateLimit` モジュールの `checkRateLimit` をスパイして revenue ツールの `dashboard` / `details` / `forecast` を呼ぶ
**THEN** 全 3 operation で `checkRateLimit` が一度も呼ばれないことを assert する（読み取り専用のためレート制限は適用しない）

---

## revenue_targets ツール — 売上目標 CRUD

### TC-022: 売上目標の設定

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: revenue_targets ツールは売上目標の設定・更新・削除をサポートする > Scenario: 売上目標の設定

### TC-023: 売上目標の更新（version チェック）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: revenue_targets ツールは売上目標の設定・更新・削除をサポートする > Scenario: 売上目標の更新（version チェック）

### TC-024: 売上目標の削除

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: revenue_targets ツールは売上目標の設定・更新・削除をサポートする > Scenario: 売上目標の削除

### TC-037: revenue_targets の全 operation で canPerform(role, "revenue", "setTarget") が使われる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04: revenue_targets ツールの実装

**GIVEN** `canPerform` をスパイして revenue_targets ツールの set / update / delete を呼ぶ
**WHEN** 各 operation を実行する
**THEN** set / update / delete の全 operation で `canPerform(role, "revenue", "setTarget")` が呼ばれることを assert する（他の permission キー（例: "create"）が使われていないことを確認）

---

## 監査ログ記録

### TC-025: 契約作成の監査記録

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 全ツールの書き込みが監査ログに記録される > Scenario: 契約作成の監査記録

### TC-026: 請求ステータス更新の監査記録

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 全ツールの書き込みが監査ログに記録される > Scenario: 請求ステータス更新の監査記録

---

## テナント分離

### TC-027: organizationId がツール引数に含まれない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 全ツールがテナント分離を保証する > Scenario: organizationId がツール引数に含まれない

### TC-028: 異なるテナントの操作が分離される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 全ツールがテナント分離を保証する > Scenario: 異なるテナントの操作が分離される

---

## 権限制御（認可マトリクス）

### TC-029: member ロールが contract.create を拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 権限外ロールでのツール実行が拒否される > Scenario: member ロールが contract.create を拒否される

### TC-030: member ロールが invoice.create を拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 権限外ロールでのツール実行が拒否される > Scenario: member ロールが invoice.create を拒否される

### TC-031: member ロールが revenue.setTarget を拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 権限外ロールでのツール実行が拒否される > Scenario: member ロールが revenue.setTarget を拒否される

### TC-032: finance ロールが contract.create を許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 権限外ロールでのツール実行が拒否される > Scenario: finance ロールが contract.create を許可される

### TC-033: finance ロールが invoice.changeStatus を許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 権限外ロールでのツール実行が拒否される > Scenario: finance ロールが invoice.changeStatus を許可される

### TC-041: finance ロールが revenue.setTarget を拒否される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09: finance / member ロールの操作可否テスト

**GIVEN** finance ロールのトークン（finance は revenue.setTarget 権限なし — admin / manager のみ）
**WHEN** revenue_targets ツールで `operation: "set"` を呼ぶ
**THEN** `isError: true` で拒否され、`setRevenueTarget` usecase は呼ばれない（認可マトリクス: revenue.setTarget = admin, manager のみ）

---

## エラー変換・内部詳細の保護

### TC-034: usecase 例外がマスクされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: エラー変換で内部詳細を漏らさない > Scenario: usecase 例外がマスクされる

### TC-043: createInvoice の金額超過エラーが業務エラーとして伝わる

**Category**: unit
**Priority**: should
**Source**: design.md > D10: エラー変換で内部詳細を漏らさない

**GIVEN** `createInvoice` usecase が SERIALIZABLE トランザクション内で金額超過を throw するよう設定する（業務エラーパス）
**WHEN** invoices ツールの `create` operation を呼ぶ
**THEN** ツール結果が `isError: true` となり、エラーメッセージに金額超過の業務文言が含まれる（DB インフラエラー文字列は含まれない）

---

## ツール登録・ルーティング

### TC-040: route.ts が 11 ツールを登録する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05: route.ts にツール登録を追加

**GIVEN** `src/app/api/mcp/route.ts` の `createMcpServer()` を確認する
**WHEN** `registerContractsTools` / `registerInvoicesTools` / `registerRevenueTools` / `registerRevenueTargetsTools` の 4 関数が呼ばれる
**THEN** 既存 7 ツール + 新規 4 ツール = 合計 11 ツールが MCP サーバーに登録される（typecheck が通る）

---

## ビルド・型チェック確認

### TC-044: typecheck && test が green である

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14: typecheck・test green の確認

**GIVEN** 全ツールファイルとテストファイルが実装済みの状態
**WHEN** `bun run typecheck && bun test` を実行する
**THEN** typecheck が 0 exit、既存テストを含む全テストが green になる（既存テスト無変更で pass）

### TC-045: aozu check exit 0 である

**Category**: manual
**Priority**: could
**Source**: request.md > 受け入れ基準

**GIVEN** 全ツールファイルが実装済みの状態
**WHEN** `aozu check` を実行する
**THEN** exit 0 で完了する（ポインタ参照の未解決やアーキテクチャ違反がない）

---

## Result

```yaml
result: completed
total: 45
automated: 43
manual: 2
must: 36
should: 8
could: 1
blocked_reasons: []
```
