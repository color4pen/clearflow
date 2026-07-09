# Test Cases: controls-tables-restyle

## Summary

- **Total**: 35 cases
- **Automated** (unit/integration): 23
- **Manual**: 12
- **Priority**: must: 22, should: 11, could: 2

---

### TC-001: 過去日は danger クラスを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dueDateClass が暦日単位で期限切れ・当日・未来を判定する > Scenario: 過去日は danger クラスを返す

---

### TC-002: 当日は warning クラスを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dueDateClass が暦日単位で期限切れ・当日・未来を判定する > Scenario: 当日は warning クラスを返す

---

### TC-003: 未来日は空文字を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dueDateClass が暦日単位で期限切れ・当日・未来を判定する > Scenario: 未来日は空文字を返す

---

### TC-004: null は空文字を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dueDateClass が暦日単位で期限切れ・当日・未来を判定する > Scenario: null は空文字を返す

---

### TC-005: 日付境界（当日 0 時ちょうど）は当日として扱う

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dueDateClass が暦日単位で期限切れ・当日・未来を判定する > Scenario: 日付境界（当日 0 時ちょうど）は当日として扱う

---

### TC-006: 文字列型の日付も受け付ける

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dueDateClass が暦日単位で期限切れ・当日・未来を判定する > Scenario: 文字列型の日付も受け付ける

---

### TC-007: grep がゼロ件を返す

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 生パレットクラスが `(dashboard)` 配下に残存しない > Scenario: grep がゼロ件を返す

---

### TC-008: クリック可能行の hover クラス

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DataTable 行 hover が単一トークンに統一される > Scenario: クリック可能行の hover クラス

---

### TC-009: 期限切れの期日が danger クラスで表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ActionItemRow の期日が dueDateClass で強調される > Scenario: 期限切れの期日が danger クラスで表示される

---

### TC-010: 当日の期日が warning クラスで表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ActionItemRow の期日が dueDateClass で強調される > Scenario: 当日の期日が warning クラスで表示される

---

### TC-011: 期日なしは強調なし

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ActionItemRow の期日が dueDateClass で強調される > Scenario: 期日なしは強調なし

---

### TC-012: styles.ts の廃止定数が export されていない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/styles.ts` が更新されている  
**WHEN** `BTN_PRIMARY_DISABLED` / `BTN_SUCCESS` / `BTN_WARNING` / `BTN_SUBMIT` を named import しようとする  
**THEN** TypeScript コンパイルエラーとなる（または対象 export が存在しない）

---

### TC-013: BTN_PRIMARY の値が塗りボタン仕様に準拠している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/styles.ts` の `BTN_PRIMARY` を import する  
**WHEN** その文字列値を確認する  
**THEN** `bg-primary`・`text-white`・`hover:opacity-90`・`disabled:opacity-50`・`disabled:cursor-not-allowed` がすべて含まれる

---

### TC-014: BTN_SECONDARY の値がサーフェストークン参照になっている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/styles.ts` の `BTN_SECONDARY` を import する  
**WHEN** その文字列値を確認する  
**THEN** `bg-bg-surface`・`border border-border`・`hover:bg-bg-surface-alt`・`disabled:opacity-50` がすべて含まれる

---

### TC-015: BTN_DANGER の値が danger トークン参照になっている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/styles.ts` の `BTN_DANGER` を import する  
**WHEN** その文字列値を確認する  
**THEN** `bg-danger`・`text-white` がともに含まれる

---

### TC-016: INPUT_BASE / SELECT_BASE がテキスト・背景トークンを参照している

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/styles.ts` の `INPUT_BASE` および `SELECT_BASE` を import する  
**WHEN** 各文字列値を確認する  
**THEN** `text-text`・`bg-bg-surface` がともに含まれる

---

### TC-017: DataTable の th が text-text-secondary を持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** `DataTable` コンポーネントに任意の columns と rows を渡してレンダリングする  
**WHEN** `<th>` 要素の className を確認する  
**THEN** `text-text-secondary` が含まれ、`text-text`（`text-text-secondary` のプレフィックスでない単独指定）は含まれない

---

### TC-018: DataTable.tsx に hover:bg-primary/10 が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** `DataTable.tsx` のソースコード  
**WHEN** `hover:bg-primary/10` をファイル内で検索する  
**THEN** マッチ件数が 0 である

---

### TC-019: BulkApprovalPanel の結果アラートがデザイントークンを参照している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** `BulkApprovalPanel` を `resultType` が `"success"` / `"error"` / 部分成功（それ以外）の各状態でレンダリングする  
**WHEN** 結果アラート要素の className を確認する  
**THEN** それぞれ `bg-bg-success-light` / `bg-status-red-bg` / `bg-bg-row-pending` が含まれ、`bg-green-50` / `bg-red-50` / `bg-yellow-50` は含まれない

---

### TC-020: InvoiceSection の進捗チャートに生パレットクラスが存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/contracts/[id]/InvoiceSection.tsx` のソースコード  
**WHEN** `bg-green-500` / `bg-blue-500` / `bg-gray-200` / `border-gray-300` をファイル内で検索する  
**THEN** マッチ件数が 0 であり、代わりに `bg-success` / `bg-primary` / `bg-border` / `border-border` が使用されている

---

### TC-021: DealPhaseStepper の終端ボタンがステータストークンを参照している

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/deals/[id]/DealPhaseStepper.tsx` のソースコード  
**WHEN** `border-green-600` / `text-green-700` / `hover:bg-green-50` / `hover:bg-red-50` / `border-gray-500` / `text-gray-600` / `hover:bg-gray-50` をファイル内で検索する  
**THEN** マッチ件数が 0 であり、受注・失注・見送りボタンがそれぞれ `status-green-*` / `status-red-*` / `status-gray-*` トークンを参照している

---

### TC-022: ActionButtons の却下ボタンが bg-bg-surface と hover:bg-status-red-bg を持つ

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` のソースコード  
**WHEN** `bg-white` および `hover:bg-red-50` をファイル内で検索する  
**THEN** マッチ件数が 0 であり、却下ボタンが `bg-bg-surface` と `hover:bg-status-red-bg` を持つ

---

### TC-023: セクション内保存ボタンの bg-green-600 が全廃されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07 Acceptance Criteria

**GIVEN** T-07 対象の 14 ファイル（ClientInfoSection.tsx / InquiryCustomerSection.tsx / InquiryActions.tsx / InquiryInfoSection.tsx / ContractInfoSection.tsx / ContractStatusActions.tsx / InvoiceActions.tsx / DealNotesSection.tsx / DealInfoSection.tsx / MeetingActionItemsSection.tsx / MeetingSummarySection.tsx / MeetingHearingSection.tsx / MeetingInfoSection.tsx / MeetingAttendeesSection.tsx）のソースコード  
**WHEN** `bg-green-600` を各ファイルで検索する  
**THEN** 全ファイルでマッチ件数が 0 であり、各保存ボタンが `bg-primary text-white` を持つ

---

### TC-024: フォームフィードバックアラートに旧クラスが存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08 Acceptance Criteria

**GIVEN** T-08 対象の設定フォームファイル群（OrganizationForm.tsx / CreateUserForm.tsx / TemplateForm.tsx / WebhookCreateForm.tsx / PolicyForm.tsx / requests/new/page.tsx / ProfileForm.tsx / PasswordForm.tsx / ApiTokenSection.tsx）のソースコード  
**WHEN** `bg-green-50` / `bg-red-50` / `border-green-200` / `border-red-200` / `text-green-800` / `text-green-700` / `bg-green-100` をファイル内で検索する  
**THEN** 全ファイルでマッチ件数が 0 であり、アラートが `bg-bg-success-light` / `bg-status-red-bg` 等のトークンを参照している

---

### TC-025: required asterisk の text-red-500 が text-danger に統一されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08 Acceptance Criteria

**GIVEN** T-08-2 対象ファイル（OrganizationForm.tsx / PolicyForm.tsx / TemplateForm.tsx / WebhookCreateForm.tsx / CreateUserForm.tsx）のソースコード  
**WHEN** `text-red-500` をファイル内で検索する  
**THEN** 全ファイルでマッチ件数が 0 であり、必須マーカーが `text-danger` を使用している

---

### TC-026: 情報バナー・バッジ・プログレスバーに生パレットが存在しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** T-09 対象ファイル（SystemOriginBanner.tsx / contracts/[id]/page.tsx / contracts/page.tsx / NotificationPanel.tsx / revenue/forecast/page.tsx / revenue/page.tsx / OAuthConnectionSection.tsx）のソースコード  
**WHEN** `bg-amber-*` / `bg-blue-*` / `border-amber-*` / `border-blue-*` / `text-amber-*` / `text-blue-*` / `bg-red-500` / `bg-gray-200` / `bg-gray-100` / `text-gray-600` を各ファイルで検索する  
**THEN** 全ファイルでマッチ件数が 0 である

---

### TC-027: 新規作成フォームの submit ボタンが SubmitButton コンポーネントに統一されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-10 Acceptance Criteria

**GIVEN** `NewContractForm.tsx` / `NewInvoiceForm.tsx` / `NewDealForm.tsx` のソースコード  
**WHEN** `type="submit"` かつ インライン `bg-primary text-white` を持つ `<button>` 要素を検索する  
**THEN** マッチ件数が 0 であり、代わりに `<SubmitButton>` コンポーネントが使用されている

---

### TC-028: TaskList の select 要素が SELECT_BASE を参照している

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-10 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/tasks/TaskList.tsx` のソースコード  
**WHEN** select 要素の className 指定を確認する  
**THEN** `SELECT_BASE` が styles.ts から import されており、該当 select の className に参照されている

---

### TC-029: インラインの bg-primary ボタン群が BTN_PRIMARY / BTN_SECONDARY 定数に統一されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-10 Acceptance Criteria

**GIVEN** T-10-3 対象ファイル（AuditLogFilter.tsx / ContractInteractionSection.tsx / InvoiceInteractionSection.tsx / InvoiceActions.tsx / InvoiceSection.tsx / ClientContactsSection.tsx / InquiryActions.tsx / DealContactsSection.tsx / DealActionItemsSection.tsx / ActionItemModal.tsx）のソースコード  
**WHEN** 各ファイルの主要アクションボタンの className 指定を確認する  
**THEN** `import { BTN_PRIMARY` または `import { BTN_SECONDARY` が存在し、該当ボタンの className が定数参照になっている

---

### TC-030: dueDateClass.ts が存在し named export している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/lib/` ディレクトリおよび `dueDateClass.ts` が作成されている  
**WHEN** `dueDateClass` を named import する  
**THEN** import が成功し、関数として呼び出せる

---

### TC-031: ActionItemRow が dueDateClass を import し両モードの期日 span に適用している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/components/ActionItemRow.tsx` のソースコード  
**WHEN** `dueDateClass` の import および使用箇所を確認する  
**THEN** `@/app/(dashboard)/lib/dueDateClass` から import されており、showSource=true・showSource=false の両モードの期日 span の className に適用されている

---

### TC-032: lint・typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13 Acceptance Criteria

**GIVEN** 全タスクの実装が完了した状態  
**WHEN** `bun run lint` および `bun run typecheck` を実行する  
**THEN** 両コマンドがエラー・警告なしで exit 0 となる

---

### TC-033: build が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13 Acceptance Criteria

**GIVEN** 全タスクの実装が完了した状態  
**WHEN** `bun run build` を実行する  
**THEN** ビルドエラーなしで完了し exit 0 となる

---

### TC-034: aozu check が exit 0

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-13 Acceptance Criteria

**GIVEN** 全タスクの実装が完了した状態  
**WHEN** `aozu check` を実行する  
**THEN** exit 0 となり、architecture test が green を維持する

---

### TC-035: ダークテーマでの全変更箇所コントラスト確認

**Category**: manual
**Priority**: could
**Source**: design.md > Risks / Trade-offs

**GIVEN** アプリを `[data-theme="dark"]` に切り替えた状態  
**WHEN** 変更が適用されたボタン・アラート・進捗チャート・期限強調・情報バナーを目視確認する  
**THEN** 全箇所でテキストと背景のコントラストが成立しており、生パレット由来の意図しない色（例: 白背景への緑ベタ塗り）が表示されない

---

## Result

```yaml
result: completed
total: 35
automated: 23
manual: 12
must: 22
should: 11
could: 2
blocked_reasons: []
```
