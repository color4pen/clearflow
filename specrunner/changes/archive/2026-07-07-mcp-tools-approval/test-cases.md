# Test Cases: MCP ツール — 承認系（申請・承認・委任・テンプレート・ポリシー）

<!-- FORMAT REQUIREMENTS:
Test Case heading format: `### TC-{NNN}: {Name}` (3-digit zero-padded, e.g. TC-001)

Required fields per test case:
  **Category**: unit | integration | manual
  **Priority**: must | should | could
  **Source**: reference to spec Scenario (spec.md > Requirement: <name> > Scenario: <name>) or design.md / tasks.md section

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

Summary section MUST appear immediately after the title with ALL 4 items:
  ## Summary
  - **Total**: {count} cases
  - **Automated** (unit/integration): {count}
  - **Manual**: {count}
  - **Priority**: must: {count}, should: {count}, could: {count}

Result section MUST appear at the very end as a YAML code block:
  ## Result
  ```yaml
  result: completed | partial | failed
  total: {count}
  automated: {count}
  manual: {count}
  must: {count}
  should: {count}
  could: {count}
  blocked_reasons: []
  ```

  result determination:
    completed — all testable behaviors are documented
    partial   — some cases could not be derived due to design ambiguity
    failed    — spec is absent AND design.md / tasks.md are also missing
-->

## Summary

- **Total**: 46 cases
- **Automated** (unit/integration): 43
- **Manual**: 3
- **Priority**: must: 36, should: 9, could: 1

---

## approval_requests — list フィルタリング

### TC-001: manager ロールの action_required フィルタ

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approval_requests ツールの list operation は承認者資格に基づいて絞り込みを行う > Scenario: manager ロールの action_required フィルタ

### TC-002: member ロールの action_required フィルタ

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approval_requests ツールの list operation は承認者資格に基づいて絞り込みを行う > Scenario: member ロールの action_required フィルタ

### TC-003: finance ロールの action_required フィルタ

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** organizationId=org-1 に pending リクエストが 2 件あり、1 件は finance ステップが pending、もう 1 件は manager ステップが pending である
**WHEN** finance ロールのユーザーが approval_requests ツールの list を filter="action_required" で呼ぶ
**THEN** finance ステップが pending のリクエストのみが返される

### TC-004: filter="my_requests" で creatorId フィルタリング

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** organizationId=org-1 に複数のリクエストがあり、一部は userId=user-1 が作成し、残りは別ユーザーが作成した
**WHEN** userId=user-1 のユーザーが approval_requests ツールの list を filter="my_requests" で呼ぶ
**THEN** creatorId=user-1 のリクエストのみが返される

### TC-005: filter="all" で admin/manager 以外が空配列を返す

**Category**: integration
**Priority**: should
**Source**: design.md > D2

**GIVEN** organizationId=org-1 に複数のリクエストがある
**WHEN** member ロールのユーザーが approval_requests ツールの list を filter="all" で呼ぶ
**THEN** 空配列が返される（isError でない）

### TC-006: statusFilter による追加絞り込み

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** organizationId=org-1 に pending リクエスト 2 件、approved リクエスト 1 件がある
**WHEN** ユーザーが list operation を statusFilter="pending" で呼ぶ
**THEN** pending ステータスのリクエストのみが返される

---

## approval_requests — get

### TC-007: システム連動リクエストの get

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approval_requests の get でシステム連動承認の影響情報が返される > Scenario: システム連動リクエストの get

### TC-008: get でリクエストが存在しない場合のエラー

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** requestId="nonexistent-uuid" が organizationId=org-1 に存在しない
**WHEN** ユーザーが get operation を requestId="nonexistent-uuid" で呼ぶ
**THEN** isError=true で「承認リクエストが見つかりません」が返される

---

## approval_requests — create

### TC-009: create で formData の required フィールドが空の場合のバリデーションエラー

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01, design.md > D4

**GIVEN** テンプレートに required=true の "projectName" フィールドが定義されている
**WHEN** formData に "projectName" を含まずに create operation を呼ぶ
**THEN** isError=true でバリデーションエラーが返される
**AND** createRequest usecase は呼ばれない

### TC-010: create で formData の number フィールドに数値以外が指定された場合のバリデーションエラー

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01, design.md > D4

**GIVEN** テンプレートに type="number" の "amount" フィールドが定義されている
**WHEN** formData に { amount: "not-a-number" } を指定して create operation を呼ぶ
**THEN** isError=true でバリデーションエラーが返される
**AND** createRequest usecase は呼ばれない

### TC-011: create で formData の select フィールドに無効なオプションが指定された場合のバリデーションエラー

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01, design.md > D4

**GIVEN** テンプレートに type="select", options=["A", "B", "C"] の "category" フィールドが定義されている
**WHEN** formData に { category: "D" }（無効な選択肢）を指定して create operation を呼ぶ
**THEN** isError=true でバリデーションエラーが返される
**AND** createRequest usecase は呼ばれない

---

## approval_requests — submit / resubmit

### TC-012: submit で result.ok === false の場合にエラーが返される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** submitRequest usecase が { ok: false, reason: "Request is not in draft status" } を返す
**WHEN** ユーザーが submit operation を呼ぶ
**THEN** isError=true でエラーメッセージが返される

### TC-013: resubmit で result.ok === false の場合にエラーが返される

**Category**: integration
**Priority**: could
**Source**: tasks.md > T-01

**GIVEN** resubmitRequest usecase が { ok: false, reason: "Request is not in revision status" } を返す
**WHEN** ユーザーが resubmit operation を呼ぶ
**THEN** isError=true でエラーメッセージが返される

---

## approval_requests — approve

### TC-014: 全ステップ承認済みの場合の approve 拒否（順序制約）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 順序外のステップ承認は拒否される > Scenario: 全ステップ承認済みの場合

### TC-015: システム連動承認の完了

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: システム連動承認の承認完了で後続アクションが実行される > Scenario: システム連動承認の完了

### TC-016: admin ロールで approve が usecase に到達する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** admin ロールのユーザーが approval_requests ツールの approve operation を呼ぶ
**WHEN** canPerform(role, "approval", "approve") を評価する
**THEN** approveRequest usecase が呼ばれる

### TC-017: approve で usecase の未知エラーメッセージが固定文言に変換される

**Category**: integration
**Priority**: must
**Source**: design.md > D10, tasks.md > T-01

**GIVEN** approveRequest usecase が { ok: false, reason: "DB connection error: ECONNREFUSED" } を返す（DB エラーが混入した場合）
**WHEN** admin ロールのユーザーが approve operation を呼ぶ
**THEN** isError=true で「操作を完了できませんでした」という固定文言が返される
**AND** DB エラー詳細がクライアントに露出しない

---

## approval_requests — reject

### TC-018: member ロールの approve 拒否

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 資格のないユーザーの承認・却下は拒否される > Scenario: member ロールが approve を試みる

### TC-019: member ロールの reject 拒否

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 資格のないユーザーの承認・却下は拒否される > Scenario: member ロールが reject を試みる

### TC-020: finance ロールで reject が usecase に到達する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** finance ロールのユーザーが approval_requests ツールの reject operation を呼ぶ
**WHEN** canPerform(role, "approval", "reject") を評価する
**THEN** rejectRequest usecase が呼ばれる

### TC-021: reject で targetStatus="revision" と comment が usecase に渡される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-01, design.md > D8

**GIVEN** admin ロールのユーザーが reject operation を呼ぶ
**WHEN** targetStatus="revision", comment="内容の修正が必要です" を指定する
**THEN** rejectRequest usecase に targetStatus="revision" と comment が渡される

---

## approval_requests — bulk_approve

### TC-022: bulk_approve が usecase を呼ぶ

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: bulk_approve は個別承認と同一の判定・記録になる > Scenario: bulk_approve が usecase を呼ぶ

### TC-023: bulk_approve で requestIds が 21 件の場合に上限エラーが返される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10, design.md > D9

**GIVEN** requestIds に 21 個の UUID を含む bulk_approve operation を呼ぶ
**WHEN** ツールレイヤーの上限チェックが実行される
**THEN** isError=true で上限超過エラーが返される
**AND** bulkApprove usecase は呼ばれない

### TC-024: member ロールで bulk_approve が拒否される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** member ロールのユーザーが approval_requests ツールの bulk_approve operation を呼ぶ
**WHEN** canPerform(role, "approval", "approve") を評価する
**THEN** isError=true で「権限がありません」が返される
**AND** bulkApprove usecase は呼ばれない

---

## テナント分離・監査ログ

### TC-025: approval_requests create での organizationId 伝播

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 書き込みが監査ログに記録され、他テナントに触れられない > Scenario: 異なるテナントの organizationId がツール引数で指定できない

### TC-026: delegations create での organizationId 伝播

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 書き込みが監査ログに記録され、他テナントに触れられない > Scenario: 異なるテナントの操作

### TC-027: approval_templates create での organizationId 伝播

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** organizationId="org-A" の authInfo で approval_templates の create operation を呼ぶ
**WHEN** createTemplate usecase が呼ばれる
**THEN** usecase に渡される organizationId は "org-A" である（authInfo.extra 由来）

### TC-028: approval_policies create での organizationId 伝播

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** organizationId="org-B" の authInfo で approval_policies の create operation を呼ぶ
**WHEN** createPolicy usecase が呼ばれる
**THEN** usecase に渡される organizationId は "org-B" である（authInfo.extra 由来）

---

## delegations ツール

### TC-029: manager が他人を fromUserId に指定した場合の拒否

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: delegations ツールの create は admin 以外の場合 fromUserId が自分自身でなければ拒否される > Scenario: manager が他人を fromUserId に指定

### TC-030: admin が他人を fromUserId に指定した場合の許可

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: delegations ツールの create は admin 以外の場合 fromUserId が自分自身でなければ拒否される > Scenario: admin が他人を fromUserId に指定

### TC-031: manager が自分自身を fromUserId に指定した場合は usecase に到達する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** manager ロール（userId="user-mgr-1"）のユーザーが delegations の create を fromUserId="user-mgr-1" で呼ぶ
**WHEN** fromUserId と自分の userId の一致チェックが行われる
**THEN** createDelegation usecase が呼ばれる

### TC-032: delegations list で admin 以外は自身の委任のみ返される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** organizationId=org-1 に userId=user-mgr-1 の委任 1 件と userId=user-other の委任 1 件が存在する
**WHEN** manager ロール（userId=user-mgr-1）のユーザーが delegations ツールの list operation を呼ぶ
**THEN** userId=user-mgr-1（自身）の委任のみが返される

### TC-033: delegations deactivate で admin 以外が他人の委任を無効化しようとした場合の拒否

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** delegationId="deleg-1" の委任の fromUserId="user-other" であり、manager ロール（userId="user-mgr-1"）のユーザーが deactivate operation を呼ぶ
**WHEN** 委任の fromUserId と自分の userId の一致チェックが行われる
**THEN** isError=true で権限エラーが返される
**AND** deactivateDelegation usecase は呼ばれない

---

## approval_templates ツール

### TC-034: approval_templates create で steps に stepOrder が自動付与される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** admin ロールのユーザーが steps=[{approverRole:"manager"}, {approverRole:"admin"}] を指定して approval_templates の create operation を呼ぶ
**WHEN** createTemplate usecase に引数が渡される
**THEN** steps[0].stepOrder=1, steps[1].stepOrder=2 が自動付与された形で usecase に渡される

### TC-035: approval_templates update で省略フィールドが undefined として usecase に渡される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03, design.md > D6

**GIVEN** admin ロールのユーザーが templateId="tmpl-1", name="新しい名前" のみを指定して update operation を呼ぶ（steps と fields は省略）
**WHEN** updateTemplate usecase に引数が渡される
**THEN** usecase に渡される steps と fields が undefined（変更なし）である

### TC-036: approval_templates list が member ロールで拒否される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** member ロールのユーザーが approval_templates ツールの list operation を呼ぶ
**WHEN** canPerform(role, "approvalSettings", "listTemplates") を評価する
**THEN** isError=true で「権限がありません」が返される

### TC-037: approval_templates create が member ロールで拒否される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** member ロールのユーザーが approval_templates ツールの create operation を呼ぶ
**WHEN** canPerform(role, "approvalSettings", "createTemplate") を評価する
**THEN** isError=true で「権限がありません」が返される
**AND** createTemplate usecase は呼ばれない

---

## approval_policies ツール

### TC-038: approval_policies create で conditionField 指定時に conditionOperator と conditionValue が必須

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** admin ロールのユーザーが create operation を conditionField="amount" のみ（conditionOperator と conditionValue を省略して）呼ぶ
**WHEN** Zod superRefine バリデーションが実行される
**THEN** バリデーションエラーが返される

### TC-039: approval_policies update で conditionField 指定時に conditionOperator と conditionValue が必須

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** admin ロールのユーザーが update operation を conditionField="amount" のみ（conditionOperator と conditionValue を省略して）呼ぶ
**WHEN** Zod superRefine バリデーションが実行される
**THEN** バリデーションエラーが返される

### TC-040: approval_policies toggle が togglePolicy usecase を呼ぶ

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** admin ロールのユーザーが approval_policies ツールの toggle operation を policyId="pol-1" で呼ぶ
**WHEN** togglePolicy usecase が実行される
**THEN** togglePolicy usecase に policyId と organizationId が渡される

### TC-041: approval_policies list が member ロールで拒否される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** member ロールのユーザーが approval_policies ツールの list operation を呼ぶ
**WHEN** canPerform(role, "approvalSettings", "listPolicies") を評価する
**THEN** isError=true で「権限がありません」が返される

### TC-042: approval_policies create が member ロールで拒否される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** member ロールのユーザーが approval_policies ツールの create operation を呼ぶ
**WHEN** canPerform(role, "approvalSettings", "createPolicy") を評価する
**THEN** isError=true で「権限がありません」が返される
**AND** createPolicy usecase は呼ばれない

---

## ツール登録

### TC-043: createMcpServer() が 15 ツールを登録する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** MCP サーバーが createMcpServer() で初期化される
**WHEN** 登録されたツール一覧を取得する
**THEN** 15 ツール（既存 11 + approval_requests / delegations / approval_templates / approval_policies の 4）が登録されている

---

## ビルド・品質ゲート

### TC-044: typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** 全ての新規ツールファイルが実装済みである
**WHEN** bun run typecheck を実行する
**THEN** エラーなく完了する

### TC-045: bun test が green（既存テスト含む）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** 全ての新規テストファイルが作成され、TC-025（TC-043 の前身）の期待値が 15 に更新済みである
**WHEN** bun test を実行する
**THEN** 全てのテストが pass する

### TC-046: aozu check が exit 0

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** 全ての新規ツールファイルと依存関係が実装済みである
**WHEN** aozu check を実行する
**THEN** exit 0 で完了する

---

## Result

```yaml
result: completed
total: 46
automated: 43
manual: 3
must: 36
should: 9
could: 1
blocked_reasons: []
```
