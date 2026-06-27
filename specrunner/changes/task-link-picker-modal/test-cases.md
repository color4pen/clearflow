# Test Cases: タスク紐づけ先の検索選択モーダル（案件・引合・会議）

## Summary

- **Total**: 38 cases
- **Automated** (unit/integration): 31
- **Manual**: 7
- **Priority**: must: 33, should: 5, could: 0

---

## リポジトリ検索 — 案件

### TC-001: title 部分一致で案件が絞り込まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: リポジトリ検索 — 案件を title 部分一致で検索し LIMIT 件を返す > Scenario: title 部分一致で案件が絞り込まれる

### TC-002: 他テナントの案件は返されない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: リポジトリ検索 — 案件を title 部分一致で検索し LIMIT 件を返す > Scenario: 他テナントの案件は返されない

### TC-003: 結果が LINK_SEARCH_LIMIT 件に制限される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: リポジトリ検索 — 案件を title 部分一致で検索し LIMIT 件を返す > Scenario: 結果が LINK_SEARCH_LIMIT 件に制限される

---

## リポジトリ検索 — 引合

### TC-004: title 部分一致で引合が絞り込まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: リポジトリ検索 — 引合を title 部分一致で検索し LIMIT 件を返す > Scenario: title 部分一致で引合が絞り込まれる

### TC-005: 他テナントの引合は返されない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: リポジトリ検索 — 引合を title 部分一致で検索し LIMIT 件を返す > Scenario: 他テナントの引合は返されない

---

## リポジトリ検索 — 会議

### TC-006: summary 部分一致で会議が絞り込まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: リポジトリ検索 — 会議を summary 部分一致で検索し LIMIT 件を返す > Scenario: summary 部分一致で会議が絞り込まれる

### TC-007: summary が null の会議は対象外

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: リポジトリ検索 — 会議を summary 部分一致で検索し LIMIT 件を返す > Scenario: summary が null の会議は対象外

---

## searchLinkTargetsAction

### TC-008: type="deal" で案件の title を label にした結果が返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: searchLinkTargetsAction が type 別に検索し { id, label }[] を返す > Scenario: type="deal" で案件の title を label にした結果が返る

### TC-009: type="meeting" で日付+種別+親名を label にした結果が返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: searchLinkTargetsAction が type 別に検索し { id, label }[] を返す > Scenario: type="meeting" で日付+種別+親名を label にした結果が返る

### TC-010: 未認証ユーザーからの呼び出しはエラーを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: searchLinkTargetsAction が type 別に検索し { id, label }[] を返す > Scenario: 未認証ユーザーからの呼び出しはエラーを返す

---

## LinkTargetPicker UI

### TC-011: 案件タブで検索して1件選択する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: LinkTargetPicker が 3 タブで候補を検索表示し 1 件選択で確定する > Scenario: 案件タブで検索して 1 件選択する

### TC-012: 「なし」で紐づけを外す

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: LinkTargetPicker が 3 タブで候補を検索表示し 1 件選択で確定する > Scenario: 「なし」で紐づけを外す

---

## 単一紐づけセマンティクス（ピッカー経由）

### TC-013: 案件を選択すると inquiryId と meetingId が null になる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 単一紐づけ — ピッカー経由の操作で選択した type の FK のみ保持し他をクリアする > Scenario: 案件を選択すると inquiryId と meetingId が null になる

### TC-014: 編集で紐づけ先を案件から引合に変更する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 単一紐づけ — ピッカー経由の操作で選択した type の FK のみ保持し他をクリアする > Scenario: 編集で紐づけ先を案件から引合に変更する

### TC-015: 紐づけを解除する（なし）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 単一紐づけ — ピッカー経由の操作で選択した type の FK のみ保持し他をクリアする > Scenario: 紐づけを解除する（なし）

---

## MeetingActionItemsSection — 既存動作の維持

### TC-016: MeetingActionItemsSection から作成したタスクが meetingId+dealId を保持する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MeetingActionItemsSection — meetingId と dealId を同時に保持して動作する > Scenario: MeetingActionItemsSection から作成したタスクが meetingId+dealId を保持する

### TC-017: meetingId+dealId を保持したタスクが一覧で親案件名を表示する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: MeetingActionItemsSection — meetingId と dealId を同時に保持して動作する > Scenario: meetingId+dealId を保持したタスクが一覧で親案件名を表示する

---

## ActionItemModal UI

### TC-018: 既存の紐づけ先が表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ActionItemModal に紐づけ先の表示・変更機能を追加する > Scenario: 既存の紐づけ先が表示される

### TC-019: 紐づけ先を変更して保存する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ActionItemModal に紐づけ先の表示・変更機能を追加する > Scenario: 紐づけ先を変更して保存する

---

## TaskList 旧プルダウン除去

### TC-020: TaskList に dealOptions / inquiryOptions props が存在しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TaskList 新規作成モーダルから旧プルダウンを除去し LinkTargetPicker に置換する > Scenario: TaskList に dealOptions / inquiryOptions props が存在しない

### TC-021: tasks/page.tsx が listDeals / listInquiries を呼ばない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TaskList 新規作成モーダルから旧プルダウンを除去し LinkTargetPicker に置換する > Scenario: tasks/page.tsx が listDeals / listInquiries を呼ばない

---

## リポジトリ構造確認（静的検証）

### TC-022: dealRepository に searchByTitle が存在し deals.title を検索対象にしている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 / T-09

**GIVEN** dealRepository.ts のソースコード
**WHEN** `searchByTitle` 関数の定義と WHERE 句を確認する
**THEN** `searchByTitle` 関数が存在し、`deals.title` に対する `ilike` 条件が含まれる

### TC-023: inquiryRepository に searchByTitle が存在し inquiries.title を検索対象にしている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 / T-09

**GIVEN** inquiryRepository.ts のソースコード
**WHEN** `searchByTitle` 関数の定義と WHERE 句を確認する
**THEN** `searchByTitle` 関数が存在し、`inquiries.title` に対する `ilike` 条件が含まれる

### TC-024: meetingRepository に searchBySummary が存在し meetings.summary と IS NOT NULL を検索条件にしている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 / T-09

**GIVEN** meetingRepository.ts のソースコード
**WHEN** `searchBySummary` 関数の定義と WHERE 句を確認する
**THEN** `searchBySummary` 関数が存在し、`meetings.summary` に対する `ilike` 条件と `isNotNull(meetings.summary)` が含まれる

### TC-025: 3リポジトリの検索メソッドが organizationId でフィルタし LIMIT を設定している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 / T-09

**GIVEN** dealRepository.ts / inquiryRepository.ts / meetingRepository.ts のソースコード
**WHEN** 各検索メソッドの WHERE 句と LIMIT 設定を確認する
**THEN** 全3ファイルの検索メソッドに `organizationId` の条件が含まれ、`.limit(` が含まれる

---

## ユーティリティ切り出し（アーキテクチャ）

### TC-026: formatDateJP が src/lib/dateUtils.ts に export され listActionItems.ts が import している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** src/lib/dateUtils.ts と src/application/usecases/listActionItems.ts のソースコード
**WHEN** dateUtils.ts の export と listActionItems.ts の import を確認する
**THEN** dateUtils.ts に `export function formatDateJP` が存在し、listActionItems.ts が `src/lib/dateUtils` から `formatDateJP` を import している（ファイル内 private 定義が削除されている）

### TC-027: meetingTypeLabels が src/lib/meetingLabels.ts に export されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** src/lib/meetingLabels.ts のソースコード
**WHEN** export を確認する
**THEN** `meetingTypeLabels` が `export const` で定義されている

### TC-028: searchMeetings.ts がアーキテクチャ境界を遵守している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02 / T-09

**GIVEN** src/application/usecases/searchMeetings.ts のソースコード
**WHEN** import 文を確認する
**THEN** `src/app/(dashboard)/` 以下のファイルを import していない、かつ `src/lib/dateUtils` と `src/lib/meetingLabels` を import している

---

## searchLinkTargetsAction 構造

### TC-029: searchLinkTargetsAction が "use server" 宣言と organizationId のセッション取得を持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** src/app/actions/actionItems.ts のソースコード
**WHEN** `searchLinkTargetsAction` の実装を確認する
**THEN** `"use server"` 宣言が存在し、`auth()` によるセッション取得と `session.user.organizationId` の参照が含まれる（organizationId をリクエストボディから受け取っていない）

### TC-030: searchLinkTargetsAction がレートリミット・権限チェックを含む

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** src/app/actions/actionItems.ts のソースコード
**WHEN** `searchLinkTargetsAction` の実装を確認する
**THEN** `checkRateLimit` の呼び出しと `canPerform` による権限チェックが含まれる

---

## FK マッピング（呼び出し元）

### TC-031: createActionItem.ts に FK 排他ロジックが存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 / T-09

**GIVEN** src/application/usecases/createActionItem.ts のソースコード
**WHEN** usecase 内の FK 処理ロジックを確認する
**THEN** `dealId` / `inquiryId` / `meetingId` のいずれかを null にする優先ロジックが存在しない（usecase はパラメータをそのまま保存する）

### TC-032: TaskList.tsx と ActionItemRow.tsx に linkTarget → FK マッピングロジックが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 / T-09

**GIVEN** src/app/(dashboard)/tasks/TaskList.tsx と src/app/(dashboard)/components/ActionItemRow.tsx のソースコード
**WHEN** `createActionItemAction` / `updateActionItemAction` の呼び出し箇所を確認する
**THEN** 両ファイルに `linkTarget` の `type` に応じて `dealId` / `inquiryId` / `meetingId` を単一にセットし他を null にするマッピングコードが存在する

---

## LinkTargetPicker デバウンス

### TC-033: LinkTargetPicker.tsx にデバウンス cleanup が存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 / T-09

**GIVEN** src/app/(dashboard)/components/LinkTargetPicker.tsx のソースコード
**WHEN** `useEffect` の実装を確認する
**THEN** `clearTimeout` の呼び出しが含まれる（アンマウント時・query 変更時のタイマーキャンセル）

---

## ActionItemModal / ActionItemRow 条件表示

### TC-034: ActionItemModal が showLinkTarget=false のとき紐づけ欄を表示しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** ActionItemModal が `showLinkTarget` を渡さずに（またはデフォルト false で）開かれている
**WHEN** モーダルの表示を確認する
**THEN** 紐づけ先欄（ラベル・「変更」ボタン）が表示されない（既存の DealActionItemsSection / MeetingActionItemsSection からの利用が壊れない）

### TC-035: ActionItemRow が Deal/Meeting ページで showLinkTarget=false を ActionItemModal に渡す

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** ActionItemRow が Deal 詳細ページまたは Meeting 詳細ページのコンテキストで利用されている（`showSource=false`）
**WHEN** 編集ボタンを押して ActionItemModal を開く
**THEN** ActionItemModal に `showLinkTarget={false}` が渡され、紐づけ欄が表示されない

---

## ビルド・型・テスト検証

### TC-036: bun run build・typecheck・bun test 全体が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 実装が完了した状態のコードベース
**WHEN** `bun run build`、`typecheck`、`bun test` を実行する
**THEN** すべてが green で成功し、既存テストに変更がない

---

## 追加カバレッジ

### TC-037: type="inquiry" で引合 title を label にした結果が返る

**Category**: integration
**Priority**: must
**Source**: design.md > D7 / tasks.md > T-03

**GIVEN** organizationId=O1 に title="引合テスト" の inquiry が存在する
**WHEN** 認証済みユーザーが `searchLinkTargetsAction({ type: "inquiry", query: "引合テスト" })` を呼ぶ
**THEN** `[{ id: "<inquiry-id>", label: "引合テスト" }]` が返される

### TC-038: 会議の親が引合（inquiryId）の場合 label に引合名が表示される

**Category**: integration
**Priority**: should
**Source**: design.md > D4 / tasks.md > T-02

**GIVEN** organizationId=O1 に date=2026-03-10, type="kickoff", summary="キックオフ確認", inquiryId=I1（title="引合Y"）の meeting が存在する
**WHEN** 認証済みユーザーが `searchLinkTargetsAction({ type: "meeting", query: "キックオフ" })` を呼ぶ
**THEN** label が `"2026/03/10 キックオフ（引合Y）"` の形式で返される

---

## Result

```yaml
result: completed
total: 38
automated: 31
manual: 7
must: 33
should: 5
could: 0
blocked_reasons: []
```
