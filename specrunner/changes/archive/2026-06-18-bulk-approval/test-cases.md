# Test Cases: bulk-approval

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

- **Total**: 37 cases
- **Automated** (unit/integration): 25
- **Manual**: 12
- **Priority**: must: 19, should: 15, could: 3

---

## UC: bulkApprove usecase

### TC-001: 3件の pending 申請を一括承認する

- **Category**: unit
- **Priority**: must
- **Source**: spec.md › Requirement: bulkApprove usecase が複数 requestId を受け取り個別に承認する › Scenario: 3件の pending 申請を一括承認する

---

### TC-002: 2件目が失敗しても1件目と3件目は承認される

- **Category**: unit
- **Priority**: must
- **Source**: spec.md › Requirement: bulkApprove usecase が複数 requestId を受け取り個別に承認する › Scenario: 2件目が失敗しても1件目と3件目は承認される

---

### TC-003: 結果型が BulkApproveResult に準拠する

- **Category**: unit
- **Priority**: must
- **Source**: spec.md › Requirement: bulkApprove の結果型は BulkApproveResult に準拠する › Scenario: 結果型の構造

---

### TC-004: results 配列が入力順序を維持する

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md#T-01

**GIVEN** requestId A (pending), B (approved 済み), C (pending) の3件を入力する  
**WHEN** `bulkApprove({ requestIds: [A, B, C], actorId, actorRole: "manager", organizationId })` を呼び出す  
**THEN** `results.length === 3` で、`results[0].requestId === A`、`results[1].requestId === B`、`results[2].requestId === C` の順序が保たれる

---

### TC-005: 全件失敗時も results に全件が含まれる

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md#T-01, design.md#D2

**GIVEN** requestId A, B, C の3件が全て approved 済みで再承認不可の状態にある  
**WHEN** `bulkApprove({ requestIds: [A, B, C], actorId, actorRole: "manager", organizationId })` を呼び出す  
**THEN** `results.length === 3` で、全要素の `success === false` かつ各要素に `reason` が存在する

---

### TC-006: 3件の一括承認で3件の監査ログが生成される

- **Category**: integration
- **Priority**: should
- **Source**: spec.md › Requirement: 監査ログは個別に記録される › Scenario: 3件の一括承認で3件の監査ログが生成される

---

### TC-007: 3件の一括承認で3件の Webhook が配信される

- **Category**: integration
- **Priority**: should
- **Source**: spec.md › Requirement: Webhook は個別に配信される › Scenario: 3件の一括承認で3件の Webhook が配信される

---

## AC: bulkApproveAction Server Action

### TC-008: 21件の requestIds でバリデーションエラーになる

- **Category**: unit
- **Priority**: must
- **Source**: spec.md › Requirement: requestIds の上限は 20 件 › Scenario: 21件の requestIds でエラーになる

---

### TC-009: 20件の requestIds はバリデーションを通過する

- **Category**: unit
- **Priority**: must
- **Source**: spec.md › Requirement: requestIds の上限は 20 件 › Scenario: 20件の requestIds は受け付けられる

---

### TC-010: 空配列でバリデーションエラーになる

- **Category**: unit
- **Priority**: must
- **Source**: spec.md › Requirement: requestIds の上限は 20 件 › Scenario: 空配列はバリデーションエラーになる

---

### TC-011: member ロールでは権限エラーが返る

- **Category**: unit
- **Priority**: must
- **Source**: spec.md › Requirement: bulkApproveAction は admin / manager / finance ロールのみ実行可能 › Scenario: member ロールで一括承認しようとする

---

### TC-012: manager ロールでは usecase が呼び出される

- **Category**: unit
- **Priority**: must
- **Source**: spec.md › Requirement: bulkApproveAction は admin / manager / finance ロールのみ実行可能 › Scenario: manager ロールで一括承認する

---

### TC-013: admin ロールでは usecase が呼び出される

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md#T-02, request.md#要件3

**GIVEN** session.user.role が "admin" である  
**WHEN** `bulkApproveAction` を有効な requestIds で呼び出す  
**THEN** ロールチェックを通過し、`bulkApprove` usecase が呼び出される

---

### TC-014: finance ロールでは usecase が呼び出される

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md#T-02, request.md#要件3

**GIVEN** session.user.role が "finance" である  
**WHEN** `bulkApproveAction` を有効な requestIds で呼び出す  
**THEN** ロールチェックを通過し、`bulkApprove` usecase が呼び出される

---

### TC-015: 未認証ユーザーが呼び出すと認証エラーが返る

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md#T-02

**GIVEN** `auth()` が null を返す（未認証状態）  
**WHEN** `bulkApproveAction` を呼び出す  
**THEN** `{ success: false, message: "認証が必要です" }` が返り、usecase は呼び出されない

---

### TC-016: レート制限が requestIds.length 分消費される

- **Category**: unit
- **Priority**: should
- **Source**: design.md#D5, tasks.md#T-02

**GIVEN** requestIds に 5 件の ID を渡す  
**WHEN** `bulkApproveAction` を呼び出す  
**THEN** レート制限クォータが 5 消費される（1 ではなく件数分）

---

### TC-017: revalidatePath が呼び出される

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md#T-02

**GIVEN** 認証済みかつ権限あり、有効な requestIds を渡す  
**WHEN** `bulkApproveAction` が完了する  
**THEN** `revalidatePath("/requests")` が呼び出される

---

### TC-018: requestIds の要素が文字列でない場合バリデーションエラーになる

- **Category**: unit
- **Priority**: could
- **Source**: tasks.md#T-02

**GIVEN** requestIds に数値や null が混在する配列を渡す  
**WHEN** `bulkApproveAction` を呼び出す  
**THEN** zod バリデーションエラーが返り、usecase は呼び出されない

---

## UI: 申請一覧画面 / BulkApprovalPanel

### TC-019: pending 申請行にチェックボックスが表示される

- **Category**: manual
- **Priority**: must
- **Source**: spec.md › Requirement: 一覧画面に pending 申請のみ選択可能なチェックボックスを表示する › Scenario: pending 申請にチェックボックスが表示される

---

### TC-020: approved 申請行にチェックボックスが表示されない

- **Category**: manual
- **Priority**: must
- **Source**: spec.md › Requirement: 一覧画面に pending 申請のみ選択可能なチェックボックスを表示する › Scenario: approved 申請にチェックボックスが表示されない

---

### TC-021: 0件選択時に一括承認ボタンが disabled になる

- **Category**: manual
- **Priority**: must
- **Source**: spec.md › Requirement: 一括承認ボタンは1件以上選択時のみ有効化される › Scenario: 0件選択時にボタンが disabled

---

### TC-022: 1件以上選択時に一括承認ボタンが有効になる

- **Category**: manual
- **Priority**: must
- **Source**: spec.md › Requirement: 一括承認ボタンは1件以上選択時のみ有効化される › Scenario: 1件以上選択時にボタンが有効

---

### TC-023: 全件成功時に成功メッセージが表示される

- **Category**: manual
- **Priority**: must
- **Source**: spec.md › Requirement: 一括承認後に成功件数と失敗件数を表示する › Scenario: 全件成功

---

### TC-024: 一部失敗時に成功件数・失敗件数・失敗理由が表示される

- **Category**: manual
- **Priority**: must
- **Source**: spec.md › Requirement: 一括承認後に成功件数と失敗件数を表示する › Scenario: 一部失敗

---

### TC-025: 全件失敗時にエラーメッセージが表示される

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md#T-05

**GIVEN** 選択した全申請が承認失敗（例: 全件 already approved）  
**WHEN** 一括承認を実行する  
**THEN** 全件失敗を示すエラーメッセージが赤色のアラートで表示される

---

### TC-026: 選択件数がボタンラベルに反映される

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md#T-03

**GIVEN** pending 申請が複数あり、3件のチェックボックスを選択する  
**WHEN** 一括承認ボタンの表示を確認する  
**THEN** ボタンラベルに「一括承認（3件）」のように選択件数が含まれる

---

### TC-027: 送信中（useTransition pending）はボタンが disabled になる

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md#T-03

**GIVEN** 1件以上が選択されており、一括承認ボタンをクリックして処理中の状態  
**WHEN** `bulkApproveAction` の非同期処理が完了する前  
**THEN** 一括承認ボタンが disabled 状態になり、二重送信が防止される

---

### TC-028: member ロールではチェックボックス UI が表示されない

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md#T-04

**GIVEN** ログインユーザーの role が "member" である  
**WHEN** 申請一覧画面を表示する  
**THEN** チェックボックス列および一括承認ボタンが表示されない

---

### TC-029: 一括承認後にチェックボックスの選択がリセットされる

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md#T-05

**GIVEN** 複数の申請を選択して一括承認を実行した  
**WHEN** `bulkApproveAction` が完了して結果が表示される  
**THEN** 全チェックボックスの選択状態がリセット（未選択）になる

---

### TC-030: アラートを閉じるボタンで結果表示を非表示にできる

- **Category**: manual
- **Priority**: could
- **Source**: tasks.md#T-05

**GIVEN** 一括承認の結果アラートが表示されている  
**WHEN** アラートの閉じるボタンをクリックする  
**THEN** アラートが非表示になる

---

## STATIC: コード構造・依存関係

### TC-031: bulkApprove.ts が @/app/actions から import しない

- **Category**: unit
- **Priority**: must
- **Source**: spec.md › Requirement: 依存方向を遵守する › Scenario: bulkApprove.ts に actions 層からの import がない

---

### TC-032: bulkApprove.ts が approveRequest を import している

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md#T-06

**GIVEN** `src/application/usecases/bulkApprove.ts` が存在する  
**WHEN** ファイルの import 文を検査する  
**THEN** `approveRequest` が import されている（`from` パスに `approveRequest` が含まれる）

---

### TC-033: bulkApprove が index.ts から export されている

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md#T-01

**GIVEN** `src/application/usecases/index.ts` が存在する  
**WHEN** ファイルの export 文を検査する  
**THEN** `bulkApprove` が export されている

---

### TC-034: bulkApprove.ts が for...of による順次実行を使用している

- **Category**: unit
- **Priority**: could
- **Source**: design.md#D1, tasks.md#T-06

**GIVEN** `src/application/usecases/bulkApprove.ts` が存在する  
**WHEN** ファイルのソースを検査する  
**THEN** `for...of` またはそれに相当するループ構造が存在し、`Promise.all` は使われていない

---

### TC-035: BulkApprovalPanel.tsx が "use client" ディレクティブを持つ

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md#T-08

**GIVEN** `src/app/(dashboard)/requests/BulkApprovalPanel.tsx` が存在する  
**WHEN** ファイルの先頭行を検査する  
**THEN** `"use client"` ディレクティブが存在する

---

### TC-036: requests/page.tsx が BulkApprovalPanel を import している

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md#T-08

**GIVEN** `src/app/(dashboard)/requests/page.tsx` が存在する  
**WHEN** ファイルの import 文を検査する  
**THEN** `BulkApprovalPanel` が import されている

---

### TC-037: bulkApproveAction が requests.ts から export されている

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md#T-07

**GIVEN** `src/app/actions/requests.ts` が存在する  
**WHEN** ファイルの export 文を検査する  
**THEN** `bulkApproveAction` が export されている

---

## Result

```yaml
result: completed
total: 37
automated: 25
manual: 12
must: 19
should: 15
could: 3
blocked_reasons: []
```
