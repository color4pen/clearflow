# Test Cases: アクションアイテムの編集 UI・タスク一覧ページ・サイドバーメニュー追加

## Summary

- **Total**: 45 cases
- **Automated** (unit/integration): 18
- **Manual**: 27
- **Priority**: must: 37, should: 8, could: 0

---

## Category: タスク一覧表示

### TC-001: 未完了タスクのデフォルト表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: タスク一覧ページで組織のアクションアイテムを一覧表示できる > Scenario: 未完了タスクのデフォルト表示

### TC-002: 完了タブへの切替

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: タスク一覧ページで組織のアクションアイテムを一覧表示できる > Scenario: 完了タブへの切替

### TC-003: 紐づけ先の表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: タスク一覧ページで組織のアクションアイテムを一覧表示できる > Scenario: 紐づけ先の表示

### TC-004: タスク一覧の空状態表示

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** 組織のアクションアイテムが 0 件、かつフィルタ状態が「未完了」  
**WHEN** ユーザーが `/tasks` にアクセスする  
**THEN** 「アクションアイテムはありません」というメッセージが表示される

### TC-005: テーブル列構成の確認

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** 組織に複数のアクションアイテムが存在する  
**WHEN** ユーザーが `/tasks` にアクセスする  
**THEN** テーブルに「完了チェック」「内容」「担当者」「期日」「紐づけ先」の列が表示される

---

## Category: 個人タスク作成

### TC-006: 個人タスクの作成

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: タスク一覧ページから個人タスクを新規作成できる > Scenario: 個人タスクの作成

### TC-007: 作成フォームのバリデーション（description 必須）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** タスク一覧ページの個人タスク作成フォームが表示されている  
**WHEN** description を入力せずに追加ボタンを押す  
**THEN** バリデーションエラーが表示され、フォームが送信されない

### TC-008: 担当者フィールドのデフォルト値（自分）

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** ユーザーがタスク一覧ページの個人タスク作成フォームを開く  
**WHEN** フォームが表示される  
**THEN** 担当者フィールドのデフォルト値がログインユーザー自身になっている

---

## Category: サイドバー

### TC-009: サイドバーにタスクリンクが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: サイドバーに「タスク」メニューが表示される > Scenario: サイドバーにタスクリンクが表示される

---

## Category: インライン編集

### TC-010: インライン編集の実行（案件詳細）

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: アクションアイテムをインライン編集できる > Scenario: インライン編集の実行

### TC-011: 編集のキャンセル

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: アクションアイテムをインライン編集できる > Scenario: 編集のキャンセル

### TC-012: 商談詳細からのインライン編集

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** 商談詳細ページにアクションアイテム「見積書作成」が表示されている  
**WHEN** ユーザーが「編集」ボタンを押し、description を「見積書送付」に変更して「保存」を押す  
**THEN** `updateActionItemAction` が呼び出され、表示が「見積書送付」に更新される

### TC-013: タスク一覧ページでのインライン編集

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** タスク一覧ページにアクションアイテム「見積書作成」が表示されている  
**WHEN** ユーザーが「編集」ボタンを押し、description を「見積書送付」に変更して「保存」を押す  
**THEN** `updateActionItemAction` が呼び出され、表示が「見積書送付」に更新される

### TC-014: editable=false の場合に編集ボタンが非表示

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `editable=false` のプロパティで `ActionItemRow` がレンダリングされている  
**WHEN** 行の表示を確認する  
**THEN** 「編集」ボタンが表示されない

---

## Category: 削除

### TC-015: 削除の実行

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: アクションアイテムを確認ダイアログ付きで削除できる > Scenario: 削除の実行

### TC-016: 削除のキャンセル

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: アクションアイテムを確認ダイアログ付きで削除できる > Scenario: 削除のキャンセル

### TC-017: canDelete=false の場合に削除ボタンが非表示

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `canDelete=false` のプロパティで `ActionItemRow` がレンダリングされている  
**WHEN** 行の表示を確認する  
**THEN** 「削除」ボタンが表示されない

### TC-018: 商談詳細からの削除

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** 商談詳細ページにアクションアイテムが表示されている  
**WHEN** ユーザーが「削除」ボタンを押し、確認ダイアログで「削除」を押す  
**THEN** `deleteActionItemAction` が呼び出され、アクションアイテムが一覧から消える

### TC-019: タスク一覧ページからの削除

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** タスク一覧ページにアクションアイテムが表示されている  
**WHEN** ユーザーが「削除」ボタンを押し、確認ダイアログで「削除」を押す  
**THEN** `deleteActionItemAction` が呼び出され、アクションアイテムが一覧から消える

---

## Category: ActionItemRow 共通コンポーネント

### TC-020: showSource=true の場合に紐づけ先列が表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `showSource=true`、`sourceName="受託開発案件"` のプロパティで `ActionItemRow` がレンダリングされている  
**WHEN** 行の表示を確認する  
**THEN** 紐づけ先として「受託開発案件」が表示される

### TC-021: showSource=false の場合に紐づけ先列が非表示

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `showSource=false` のプロパティで `ActionItemRow` がレンダリングされている（案件詳細など）  
**WHEN** 行の表示を確認する  
**THEN** 紐づけ先列が表示されない

### TC-022: 完了チェックボックスの動作

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** タスク一覧ページにアクションアイテムが表示されている  
**WHEN** ユーザーが行の完了チェックボックスをクリックする  
**THEN** `toggleActionItemAction` が呼び出され、完了状態が切り替わる

---

## Category: 回帰確認

### TC-023: 案件詳細の既存機能（追加・完了切替）の回帰

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 案件詳細ページのアクションアイテムセクションが表示されている  
**WHEN** 既存の追加フォームでアクションアイテムを追加し、完了チェックボックスをクリックする  
**THEN** アクションアイテムが正常に追加され、完了状態の切替が動作する（既存機能に退行がない）

### TC-024: 商談詳細の既存機能（追加・完了切替）の回帰

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** 商談詳細ページのアクションアイテムセクションが表示されている  
**WHEN** 既存の追加フォームでアクションアイテムを追加し、完了チェックボックスをクリックする  
**THEN** アクションアイテムが正常に追加され、完了状態の切替が動作する（既存機能に退行がない）

---

## Category: revalidatePath

### TC-025: 案件詳細の操作後にタスク一覧へ反映される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Server Actions が /tasks パスを revalidate する > Scenario: 案件詳細から追加したアクションアイテムがタスク一覧に反映される

---

## Category: listActionItems ユースケース

### TC-026: sourceName の解決（案件名）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `dealId` が設定されたアクションアイテムが存在し、対応する deal の title が「受託開発案件」  
**WHEN** `listActionItems({ organizationId, done: false })` を呼び出す  
**THEN** 該当アクションアイテムの `sourceName` が「受託開発案件」になる

### TC-027: sourceName の解決（商談日）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `meetingId` が設定されたアクションアイテムが存在し、対応する meeting の date が `2025-03-15`  
**WHEN** `listActionItems({ organizationId, done: false })` を呼び出す  
**THEN** 該当アクションアイテムの `sourceName` が「2025/03/15」になる

### TC-028: sourceName の解決（引合名）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `inquiryId` が設定されたアクションアイテムが存在し、対応する inquiry の title が「新規引合A」  
**WHEN** `listActionItems({ organizationId, done: false })` を呼び出す  
**THEN** 該当アクションアイテムの `sourceName` が「新規引合A」になる

### TC-029: sourceName の解決（個人タスク）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `dealId` / `meetingId` / `inquiryId` がいずれも null のアクションアイテムが存在する  
**WHEN** `listActionItems({ organizationId, done: false })` を呼び出す  
**THEN** 該当アクションアイテムの `sourceName` が「個人タスク」になる

### TC-030: done フィルタ（未完了）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** 組織に未完了 3 件・完了 2 件のアクションアイテムが存在する  
**WHEN** `listActionItems({ organizationId, done: false })` を呼び出す  
**THEN** 未完了の 3 件のみが返される

### TC-031: done フィルタ（完了）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** 組織に未完了 3 件・完了 2 件のアクションアイテムが存在する  
**WHEN** `listActionItems({ organizationId, done: true })` を呼び出す  
**THEN** 完了の 2 件のみが返される

### TC-032: sourceHref の解決（案件）

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `dealId="deal-abc"` が設定されたアクションアイテムが存在する  
**WHEN** `listActionItems({ organizationId, done: false })` を呼び出す  
**THEN** 該当アクションアイテムの `sourceHref` が `/deals/deal-abc` になる

### TC-033: sourceHref の解決（商談）

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `meetingId="meet-xyz"` が設定されたアクションアイテムが存在し、meeting の dealId が `"deal-abc"`  
**WHEN** `listActionItems({ organizationId, done: false })` を呼び出す  
**THEN** 該当アクションアイテムの `sourceHref` が `/deals/deal-abc/meetings/meet-xyz` になる

### TC-034: sourceHref の解決（個人タスク）

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `dealId` / `meetingId` / `inquiryId` がいずれも null のアクションアイテムが存在する  
**WHEN** `listActionItems({ organizationId, done: false })` を呼び出す  
**THEN** 該当アクションアイテムの `sourceHref` が `null` になる

---

## Category: 静的解析テスト

### TC-035: actionItems.ts に revalidatePath("/tasks") が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/app/actions/actionItems.ts` のソースコードを解析する  
**WHEN** `revalidatePath("/tasks")` の文字列を検索する  
**THEN** 4 つの Server Actions（create / toggle / update / delete）すべての成功パスに `revalidatePath("/tasks")` が含まれる

### TC-036: SidebarNav.tsx に "/tasks" が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/app/(dashboard)/SidebarNav.tsx` のソースコードを解析する  
**WHEN** `"/tasks"` の文字列を検索する  
**THEN** navItems の中に `href: "/tasks"` が含まれる

### TC-037: listActionItems.ts が存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** プロジェクトのファイルシステムを確認する  
**WHEN** `src/application/usecases/listActionItems.ts` のパスを検査する  
**THEN** ファイルが存在する

### TC-038: ActionItemRow に updateActionItemAction 呼び出しが含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/components/ActionItemRow.tsx` のソースコードを解析する  
**WHEN** `updateActionItemAction` の文字列を検索する  
**THEN** 呼び出しが含まれる

### TC-039: ActionItemRow に deleteActionItemAction 呼び出しが含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/components/ActionItemRow.tsx` のソースコードを解析する  
**WHEN** `deleteActionItemAction` の文字列を検索する  
**THEN** 呼び出しが含まれる

### TC-040: ActionItemRow に ConfirmDialog が使用されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/components/ActionItemRow.tsx` のソースコードを解析する  
**WHEN** `ConfirmDialog` の文字列を検索する  
**THEN** ConfirmDialog コンポーネントの使用が含まれる

### TC-041: ActionItemRow に toggleActionItemAction 呼び出しが含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/components/ActionItemRow.tsx` のソースコードを解析する  
**WHEN** `toggleActionItemAction` の文字列を検索する  
**THEN** 呼び出しが含まれる

### TC-042: listActionItems に actionItemRepository.findByOrganization の呼び出しが含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/application/usecases/listActionItems.ts` のソースコードを解析する  
**WHEN** `findByOrganization` の文字列を検索する  
**THEN** `actionItemRepository.findByOrganization` の呼び出しが含まれる

### TC-043: listActionItems の返り値型に sourceName が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/application/usecases/listActionItems.ts` のソースコードを解析する  
**WHEN** `sourceName` の文字列を検索する  
**THEN** `ActionItemWithSource` 型の定義に `sourceName` フィールドが含まれる

---

## Category: ビルド・型チェック

### TC-044: bun run build が成功する（型エラー・バンドルエラーなし）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** すべての実装タスク（T-01〜T-10）が完了している  
**WHEN** `bun run build` を実行する  
**THEN** ビルドがエラーなく成功する

### TC-045: 型チェック（tsc --noEmit）が通る

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** すべての実装タスク（T-01〜T-10）が完了している  
**WHEN** `bunx tsc --noEmit` を実行する  
**THEN** 型エラーが 0 件で終了する

## Result

```yaml
result: completed
total: 45
automated: 18
manual: 27
must: 37
should: 8
could: 0
blocked_reasons: []
```

