# Test Cases: UI デザイン基盤の刷新（デザイントークン＋ステータスバッジ体系）

## Summary

- **Total**: 62 cases
- **Automated** (unit/integration): 57
- **Manual**: 5
- **Priority**: must: 53, should: 8, could: 1

---

## TC-001: variant=green が描画される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: StatusBadge は variant に応じた系統トークンクラスを適用する > Scenario: variant=green が描画される

---

## TC-002: variant=red が描画される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: StatusBadge は variant に応じた系統トークンクラスを適用する > Scenario: variant=red が描画される

---

## TC-003: variant=yellow が描画される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: StatusBadge は variant に応じた系統トークンクラスを適用する > Scenario: variant=yellow が描画される

---

## TC-004: variant=gray が描画される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: StatusBadge は variant に応じた系統トークンクラスを適用する > Scenario: variant=gray が描画される

---

## TC-005: variant=navy が描画される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: StatusBadge は variant に応じた系統トークンクラスを適用する > Scenario: variant=navy が描画される

---

## TC-006: ライトテーマで status-green-bg が正しい値を持つ

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: globals.css にステータス系統トークンがライト/ダーク両値で定義され @theme inline に配線される > Scenario: ライトテーマで status-green-bg が正しい値を持つ

---

## TC-007: ダークテーマで status-green-bg が正しい値を持つ

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: globals.css にステータス系統トークンがライト/ダーク両値で定義され @theme inline に配線される > Scenario: ダークテーマで status-green-bg が正しい値を持つ

---

## TC-008: @theme inline に全系統が配線されている

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: globals.css にステータス系統トークンがライト/ダーク両値で定義され @theme inline に配線される > Scenario: @theme inline に全系統が配線されている

---

## TC-009: draft ステータスの variant

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: statusVariant 関数がハードコード hex を含まない > Scenario: draft ステータスの variant

---

## TC-010: approved ステータスの variant

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: statusVariant 関数がハードコード hex を含まない > Scenario: approved ステータスの variant

---

## TC-011: pending ステータスの variant

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: statusVariant 関数がハードコード hex を含まない > Scenario: pending ステータスの variant

---

## TC-012: rejected ステップの variant が yellow である

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: stepStatusVariant 関数がステップ状態を variant に変換する > Scenario: rejected ステップの variant が yellow である

---

## TC-013: pending 行の背景クラス

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: statusRowClass がトークン参照クラスを返す > Scenario: pending 行の背景クラス

---

## TC-014: revision 行の背景クラス

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: statusRowClass がトークン参照クラスを返す > Scenario: revision 行の背景クラス

---

## TC-015: won フェーズのバッジ

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: deals 一覧のフェーズ列が StatusBadge で描画される > Scenario: won フェーズのバッジ

---

## TC-016: lost フェーズのバッジ

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: deals 一覧のフェーズ列が StatusBadge で描画される > Scenario: lost フェーズのバッジ

---

## TC-017: hearing フェーズのバッジ

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: deals 一覧のフェーズ列が StatusBadge で描画される > Scenario: hearing フェーズのバッジ

---

## TC-018: pending ステータスのバッジ（承認リクエスト）

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 承認リクエスト一覧のステータスが StatusBadge で描画される > Scenario: pending ステータスのバッジ

---

## TC-019: approved ステータスのバッジ（承認リクエスト）

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 承認リクエスト一覧のステータスが StatusBadge で描画される > Scenario: approved ステータスのバッジ

---

## TC-020: overdue の請求ステータスバッジ

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 請求ステータスが StatusBadge で描画される > Scenario: overdue の請求ステータスバッジ

---

## TC-021: paid の請求ステータスバッジ

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 請求ステータスが StatusBadge で描画される > Scenario: paid の請求ステータスバッジ

---

## TC-022: text-[# が残っていないことを確認する

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: requests/statusUtils.ts に text-[# 形式の文字列が残らない > Scenario: text-[# が残っていないことを確認する

---

## TC-023: statusVariant — rejected が red を返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** `statusVariant("rejected")` を呼び出す  
**WHEN** 戻り値を確認する  
**THEN** `"red"` が返される

---

## TC-024: statusVariant — revision が yellow を返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** `statusVariant("revision")` を呼び出す  
**WHEN** 戻り値を確認する  
**THEN** `"yellow"` が返される

---

## TC-025: statusVariant — expired が gray を返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** `statusVariant("expired")` を呼び出す  
**WHEN** 戻り値を確認する  
**THEN** `"gray"` が返される

---

## TC-026: stepStatusVariant — pending が yellow を返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** `stepStatusVariant("pending")` を呼び出す  
**WHEN** 戻り値を確認する  
**THEN** `"yellow"` が返される

---

## TC-027: stepStatusVariant — approved が green を返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** `stepStatusVariant("approved")` を呼び出す  
**WHEN** 戻り値を確認する  
**THEN** `"green"` が返される

---

## TC-028: statusClass / stepStatusClass の export が削除されている

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** 変更後の `statusUtils.ts` ファイル内容  
**WHEN** `export` キーワードと共に `statusClass` または `stepStatusClass` という識別子を検索する  
**THEN** いずれも 0 件ヒットする（rename により export が削除されている）

---

## TC-029: StatusBadge — variant=blue が描画される

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-03, T-16

**GIVEN** `StatusBadge.tsx` のソース  
**WHEN** `blue` variant のクラスマッピングを確認する  
**THEN** `bg-status-blue-bg` および `text-status-blue-text` クラスが定義されている

---

## TC-030: StatusBadge — "use client" ディレクティブが存在しない

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-03, T-16

**GIVEN** `StatusBadge.tsx` のファイル内容  
**WHEN** `"use client"` 文字列を検索する  
**THEN** 0 件ヒットする（Server Component として動作可能）

---

## TC-031: StatusBadge — pill 形状クラスが含まれる

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-03, T-16

**GIVEN** `StatusBadge.tsx` のソース  
**WHEN** レイアウトクラスの記述を確認する  
**THEN** `rounded-full` と `whitespace-nowrap` がいずれもソース内に存在する

---

## TC-032: StatusBadge — className prop がマージされる

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-03, T-10

**GIVEN** `StatusBadge.tsx` のソース  
**WHEN** `className` prop の使い方を確認する  
**THEN** 外部から渡された `className` が span のクラスに追加（マージ）される実装になっている

---

## TC-033: StatusBadgeVariant 型がエクスポートされている

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-03

**GIVEN** `StatusBadge.tsx` のソース  
**WHEN** `StatusBadgeVariant` の export を確認する  
**THEN** `export type StatusBadgeVariant` または同等の型エクスポートが存在する

---

## TC-034: deals/page.tsx — proposal_prep / proposed / negotiation が blue のマッピングを持つ

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-05

**GIVEN** 変更後の `deals/page.tsx` ファイル内容  
**WHEN** フェーズと variant のマッピング定義を確認する  
**THEN** `proposal_prep`・`proposed`・`negotiation` のそれぞれに対して `"blue"` が対応づけられている

---

## TC-035: deals/page.tsx — passed が gray のマッピングを持つ

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-05

**GIVEN** 変更後の `deals/page.tsx` ファイル内容  
**WHEN** フェーズと variant のマッピング定義を確認する  
**THEN** `passed` に対して `"gray"` が対応づけられている

---

## TC-036: deals/[id]/page.tsx — 契約テーブルのステータス列が StatusBadge を使用する

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-05

**GIVEN** 変更後の `deals/[id]/page.tsx` ファイル内容  
**WHEN** `dealContracts` テーブルの status 列 render を確認する  
**THEN** `StatusBadge` のインポートと使用がある

---

## TC-037: InquiryStatusBadge.tsx が削除されている

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** `src/app/(dashboard)/inquiries/` ディレクトリ  
**WHEN** `InquiryStatusBadge.tsx` の存在を確認する  
**THEN** ファイルが存在しない（削除済み）

---

## TC-038: inquiries — new=gray / declined=gray のマッピングが存在する

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** 変更後の `InquiryListView.tsx` ファイル内容  
**WHEN** 引合ステータスと variant のマッピングを確認する  
**THEN** `new` → `"gray"` および `declined` → `"gray"` のマッピングが定義されており、`converted` → `"green"` も存在する

---

## TC-039: InquiryStatusBanner — インラインスタイル hex が削除されている

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** 変更後の `InquiryStatusBanner.tsx` ファイル内容  
**WHEN** `style=` 属性内の hex カラーコードを検索する  
**THEN** `#eef5fb`・`#2980b9`・`#eef7f1`・`#cde6d8` 等のインライン hex が 0 件ヒットする

---

## TC-040: contracts — active=green / completed=navy / cancelled=red のマッピングが存在する

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-07

**GIVEN** 変更後の `contracts/page.tsx` または近傍ファイルの内容  
**WHEN** 契約ステータスと variant のマッピングを確認する  
**THEN** `active` → `"green"`・`completed` → `"navy"`・`cancelled` → `"red"` が定義されている

---

## TC-041: contracts/[id]/page.tsx — 契約ステータスが StatusBadge を使用している

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-07

**GIVEN** 変更後の `contracts/[id]/page.tsx` ファイル内容  
**WHEN** `contractStatusLabels[contract.status]` の表示箇所を確認する  
**THEN** `StatusBadge` インポートがあり、ステータス表示に `StatusBadge` が使用されている

---

## TC-042: invoices — scheduled=gray / invoiced=blue のマッピングが存在する

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-08

**GIVEN** 変更後の `InvoiceSection.tsx` またはマッピング定義ファイルの内容  
**WHEN** 請求ステータスと variant のマッピングを確認する  
**THEN** `scheduled` → `"gray"` および `invoiced` → `"blue"` が定義されている

---

## TC-043: contracts/[id]/invoices/[invoiceId]/page.tsx — 請求ステータスが StatusBadge を使用している

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-08

**GIVEN** 変更後の `contracts/[id]/invoices/[invoiceId]/page.tsx` ファイル内容  
**WHEN** `invoice.status` の表示箇所を確認する  
**THEN** `StatusBadge` インポートがあり、ステータス表示に `StatusBadge` が使用されている

---

## TC-044: BulkApprovalPanel — statusClass: string フィールドが存在しない

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-09

**GIVEN** 変更後の `BulkApprovalPanel.tsx` ファイル内容  
**WHEN** `RequestItem` 型または相当する型定義を確認する  
**THEN** `statusClass: string` フィールドが存在せず、`statusVariant` フィールドが使われている

---

## TC-045: requests/page.tsx — statusClass インポートが残っていない

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-09

**GIVEN** 変更後の `requests/page.tsx` ファイル内容  
**WHEN** import 文で `statusClass` を検索する  
**THEN** 0 件ヒットする（`statusVariant` に置き換え済み）

---

## TC-046: requests/[id]/page.tsx — statusBadgeClass 関数が削除されている

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-10

**GIVEN** 変更後の `requests/[id]/page.tsx` ファイル内容  
**WHEN** `statusBadgeClass` という識別子を検索する  
**THEN** 0 件ヒットする（ローカル関数が削除され StatusBadge に移行済み）

---

## TC-047: ApprovalStepper — ハードコード Tailwind パレットが残っていない

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-11

**GIVEN** 変更後の `ApprovalStepper.tsx` ファイル内容  
**WHEN** `bg-emerald-`・`bg-red-`・`bg-blue-` のパレット直参照を検索する  
**THEN** いずれも 0 件ヒットする

---

## TC-048: ApprovalStepper — StepIcon と ConnectorLine がシステムトークン参照を使用する

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-11

**GIVEN** 変更後の `ApprovalStepper.tsx` ファイル内容  
**WHEN** `StepIcon` の承認済み色と `ConnectorLine` の完了ライン色を確認する  
**THEN** `bg-status-green-text` および `bg-status-green-text/70` が使用されており、`bg-emerald-500`・`bg-emerald-400` は存在しない

---

## TC-049: StatusChipSelect — CHIP マップにパレット直参照が存在しない

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-12

**GIVEN** 変更後の `StatusChipSelect.tsx` ファイル内容  
**WHEN** `CHIP` マップの定義を確認する  
**THEN** `bg-blue-50`・`text-blue-700`・`bg-green-50`・`text-green-700` 等のパレット直参照が 0 件である

---

## TC-050: StatusChipSelect — DOT マップにパレット直参照が存在しない

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-12

**GIVEN** 変更後の `StatusChipSelect.tsx` ファイル内容  
**WHEN** `DOT` マップの定義を確認する  
**THEN** `bg-gray-400`・`bg-blue-500`・`bg-green-500` 等のパレット直参照が 0 件であり、`bg-status-*-text` 参照に置き換えられている

---

## TC-051: DealPhaseStepper — 終端フェーズ色がシステムトークン参照に変更されている

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-13

**GIVEN** 変更後の `DealPhaseStepper.tsx` ファイル内容  
**WHEN** 終端フェーズ（won / lost / passed）の `<span>` クラス条件分岐を確認する  
**THEN** `bg-status-green-bg`・`text-status-green-text`・`bg-status-red-bg`・`text-status-red-text`・`bg-status-gray-bg`・`text-status-gray-text` が使用されている

---

## TC-052: DealPhaseStepper — 旧パレット直参照が削除されている

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-13

**GIVEN** 変更後の `DealPhaseStepper.tsx` ファイル内容  
**WHEN** `bg-green-50`・`text-green-700`・`border-green-300`・`bg-red-50`・`bg-gray-50`・`text-gray-700` を検索する  
**THEN** いずれも 0 件ヒットする

---

## TC-053: styles.ts — SECTION_CARD に rounded-lg が含まれる

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-14

**GIVEN** 変更後の `src/app/(dashboard)/styles.ts` ファイル内容  
**WHEN** `SECTION_CARD` 定数の値を確認する  
**THEN** `rounded-lg` が含まれており、`rounded` のみ（`rounded-lg` 以外の rounded）は含まれない

---

## TC-054: styles.ts — 他の定数が変更されていない

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-14

**GIVEN** 変更後の `src/app/(dashboard)/styles.ts` ファイル内容  
**WHEN** `BTN_PRIMARY`・`BTN_SECONDARY`・`INPUT_BASE`・`SELECT_BASE` 等の定数値を確認する  
**THEN** これらの定数が変更前と同一の値を持つ（SECTION_CARD のみ変更）

---

## TC-055: globals.css — :root のデザイントークン値が仕様値に更新されている

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-01

**GIVEN** 変更後の `src/app/globals.css` ファイルの `:root` ブロック  
**WHEN** 代表的なトークン値を確認する（`--bg-page`・`--bg-surface`・`--text`・`--theme-primary` 等）  
**THEN** `--bg-page: #f1f5f9`・`--bg-surface: #ffffff`・`--text: #0f172a`・`--theme-primary: #1a56db` が定義されている

---

## TC-056: globals.css — [data-theme="dark"] のデザイントークン値が仕様値に更新されている

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-01

**GIVEN** 変更後の `src/app/globals.css` ファイルの `[data-theme="dark"]` ブロック  
**WHEN** 代表的なトークン値を確認する（`--bg-page`・`--bg-surface`・`--text`・`--theme-primary` 等）  
**THEN** `--bg-page: #0f172a`・`--bg-surface: #1e293b`・`--text: #f1f5f9`・`--theme-primary: #60a5fa` が定義されている

---

## TC-057: StatusChipSelect — 開閉・選択の挙動が維持されている

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-12

**GIVEN** 変更後の `StatusChipSelect.tsx` ファイル内容  
**WHEN** イベントハンドラとドロップダウン制御ロジックを確認する  
**THEN** `onChange` ハンドラおよびドロップダウン開閉制御（onClick 等）が変更前と同様に存在する

---

## TC-058: ダークテーマ — バッジ・ページ背景のコントラストを目視確認

**Category**: manual  
**Priority**: could  
**Source**: design.md > Risks / Trade-offs（ダークテーマのコントラスト）

**GIVEN** `[data-theme="dark"]` を有効にした状態でアプリを起動する  
**WHEN** deals 一覧・requests 一覧・contracts 詳細・inquiries 一覧の各ページを確認する  
**THEN** すべての StatusBadge でテキストと背景のコントラストが確保されており、薄背景色がライト値のまま残っていない（白っぽい背景に白文字になっていない）

---

## TC-059: typecheck / lint / build が green

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-18

**GIVEN** 変更後のコードベース  
**WHEN** `bun run typecheck && bun run lint && bun run build` を実行する  
**THEN** すべてのコマンドがエラーなしで完了する（exit code 0）

---

## TC-060: bun test 全件 pass

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-18

**GIVEN** 変更後のコードベース（新テスト含む）  
**WHEN** `bun test` を実行する  
**THEN** 全テストケース（既存 + 新設 TC）が pass する（fail / error が 0 件）

---

## TC-061: aozu check exit 0

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-18

**GIVEN** 変更後のコードベース  
**WHEN** `bunx aozu check` を実行する  
**THEN** exit code 0 で終了する（モジュール境界違反なし）

---

## TC-062: architecture test green

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-18

**GIVEN** 変更後のコードベース  
**WHEN** `bun test src/__tests__/static/architecture.test.ts` を実行する  
**THEN** 全件 pass する（`StatusBadge` が mod-ui にマップされ、層間依存が緑）

---

## Result

```yaml
result: completed
total: 62
automated: 57
manual: 5
must: 53
should: 8
could: 1
blocked_reasons: []
```
