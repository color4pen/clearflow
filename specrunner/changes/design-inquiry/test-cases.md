# Test Cases: 引合画面のデザイン適用

## Summary

- **Total**: 40 cases
- **Automated** (unit/integration): 13
- **Manual**: 27
- **Priority**: must: 24, should: 14, could: 2

---

## 一覧テーブルのカラム順序

### TC-001: カラムが正しい順序で表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧テーブルのカラム順序 > Scenario: カラムが正しい順序で表示される

---

### TC-002: 件名カラムが引合詳細へのリンクになっている

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧テーブルのカラム順序 > Scenario: 件名カラムが引合詳細へのリンクになっている

---

### TC-003: 登録日が右寄せ mono フォントで表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 一覧テーブルのカラム順序 > Scenario: 登録日が右寄せ mono フォントで表示される

---

## 一覧のフィルタ UI

### TC-004: ステータスタブで全件が表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 一覧のフィルタ UI > Scenario: ステータスタブで全件が表示される

---

### TC-005: ステータスタブで新規のみフィルタされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 一覧のフィルタ UI > Scenario: ステータスタブで新規のみフィルタされる

---

### TC-006: 経路ドロップダウンでフィルタされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 一覧のフィルタ UI > Scenario: 経路ドロップダウンでフィルタされる

---

### TC-007: 検索入力で顧客名が部分一致フィルタされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 一覧のフィルタ UI > Scenario: 検索入力で顧客名が部分一致フィルタされる

---

### TC-008: 検索入力で件名が部分一致フィルタされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 一覧のフィルタ UI > Scenario: 検索入力で件名が部分一致フィルタされる

---

### TC-009: 複数フィルタが AND 条件で適用される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 一覧のフィルタ UI > Scenario: 複数フィルタが AND 条件で適用される

---

## 一覧のステータスバッジと案件リンク

### TC-010: ステータスがバッジとして表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧のステータスバッジと案件リンク > Scenario: ステータスがバッジとして表示される

---

### TC-011: converted 行に案件リンクが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 一覧のステータスバッジと案件リンク > Scenario: converted 行に案件リンクが表示される

---

## 詳細ページの 2 カラムレイアウト

### TC-012: 2 カラムグリッドで表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細ページの 2 カラムレイアウト > Scenario: 2 カラムグリッドで表示される

---

### TC-013: 左カラムに基本情報・顧客・操作が表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細ページの 2 カラムレイアウト > Scenario: 左カラムに基本情報・顧客・操作が表示される

---

### TC-014: 右カラムに商談記録が表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細ページの 2 カラムレイアウト > Scenario: 右カラムに商談記録が表示される

---

## 詳細の基本情報セクション（読み取り表示）

### TC-015: 基本情報がラベル＋値のグリッドで表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細の基本情報セクション（読み取り表示） > Scenario: 基本情報がラベル＋値のグリッドで表示される

---

### TC-016: 編集モードへの切り替え

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 詳細の基本情報セクション（読み取り表示） > Scenario: 編集モードへの切り替え

---

## 詳細の顧客セクション

### TC-017: 顧客が設定済みの場合にリンクが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細の顧客セクション > Scenario: 顧客が設定済みの場合にリンクが表示される

---

### TC-018: 顧客が未設定の場合にエラーメッセージが表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 詳細の顧客セクション > Scenario: 顧客が未設定の場合にエラーメッセージが表示される

---

## 詳細の商談記録セクション

### TC-019: 商談が存在する場合にリストが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細の商談記録セクション > Scenario: 商談が存在する場合にリストが表示される

---

### TC-020: 商談が存在しない場合に空状態が表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 詳細の商談記録セクション > Scenario: 商談が存在しない場合に空状態が表示される

---

### TC-021: 追加ボタンが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細の商談記録セクション > Scenario: 追加ボタンが表示される

---

### TC-022: status=new（deal なし）の引合で追加ボタンが disabled になる

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 詳細の商談記録セクション > Scenario: status=new（deal なし）の引合で追加ボタンが disabled になる

---

### TC-023: 案件化済みの引合で追加ボタンが案件の商談作成へリンクする

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 詳細の商談記録セクション > Scenario: 案件化済みの引合で追加ボタンが案件の商談作成へリンクする

---

### TC-024: dealId を持つ商談行がリンクになる

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 詳細の商談記録セクション > Scenario: dealId を持つ商談行がリンクになる

---

### TC-025: dealId を持たない商談行はリンクにならない

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 詳細の商談記録セクション > Scenario: dealId を持たない商談行はリンクにならない

---

## 詳細のステータスバナー

### TC-026: 承認待ちの青バナーが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細のステータスバナー > Scenario: 承認待ちの青バナーが表示される

---

### TC-027: 案件化済みの緑バナーが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細のステータスバナー > Scenario: 案件化済みの緑バナーが表示される

---

### TC-028: バナーなしの通常状態

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 詳細のステータスバナー > Scenario: バナーなしの通常状態

---

## 詳細のパンくずとタイトル横ステータスバッジ

### TC-029: パンくずが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細のパンくずとタイトル横ステータスバッジ > Scenario: パンくずが表示される

---

### TC-030: タイトル横にステータスバッジが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 詳細のパンくずとタイトル横ステータスバッジ > Scenario: タイトル横にステータスバッジが表示される

---

## コンポーネント単体

### TC-031: InquiryStatusBadge が declined ステータスを正しくレンダリングする

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `InquiryStatusBadge` コンポーネントに `status="declined"` を渡す
**WHEN** コンポーネントをレンダリングする
**THEN** `statusLabels` で定義された「見送り」ラベルが、`inline-block px-[7px] py-[1px] rounded-[3px] bg-[#f5f5f5] border border-[#e0e0e0] text-xs` スタイルで表示される

---

### TC-032: フィルタ結果が 0 件の場合に空状態メッセージが表示される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `InquiryListView` に引合データを渡し、一致する結果がないフィルタ条件を設定する（例: `searchQuery="存在しない文字列"`）
**WHEN** フィルタ適用後のリストを描画する
**THEN** テーブル行が 0 件となり「該当する引合はありません」のメッセージが表示される

---

### TC-033: フッター件数がフィルタ後の件数を正しく反映する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** 引合が 5 件存在し、ステータスタブで「新規」を選択して 3 件に絞り込まれた状態
**WHEN** `InquiryListView` のフッター部分を確認する
**THEN** フッターに「3 件」と表示される

---

### TC-034: InquiryInfoSection に顧客関連 UI が含まれない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `InquiryInfoSection` コンポーネントのソースコード
**WHEN** 顧客セクション（`<dt>顧客</dt>` のブロック）、`clientMode` state、`clients`/`clientName`/`clientLinkId` props を確認する
**THEN** これらが一切含まれておらず、件名・経路・内容の編集フォームのみが残っている

---

### TC-035: 商談要旨が 40 文字を超える場合に切り詰められる

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-08

**GIVEN** `summary` が 41 文字以上の商談行を `InquiryMeetingSection` に渡す
**WHEN** 商談行をレンダリングする
**THEN** 表示される要旨が 40 文字で切り詰めされた文字列（末尾「…」等）になる

---

### TC-036: typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** 全タスク（T-01 〜 T-10）の実装が完了した状態
**WHEN** `bun run typecheck`（または `tsc --noEmit`）を実行する
**THEN** 型エラーが 0 件で正常終了する

---

### TC-037: テストスイートが green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** 全タスク（T-01 〜 T-10）の実装が完了した状態
**WHEN** `bun test` を実行する
**THEN** 全テストが PASS し、FAIL が 0 件で終了する

---

### TC-038: dealMap の inquiryId → dealId マッピングが正しく構築される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `dealRepository.findAllByOrganization` が `[{ id: "deal-1", inquiryId: "inquiry-a" }, { id: "deal-2", inquiryId: "inquiry-b" }]` を返す
**WHEN** `page.tsx` の Server Component で `inquiryId → dealId` の `Map` を構築する
**THEN** `Map.get("inquiry-a")` が `"deal-1"` を返し、`Map.get("inquiry-b")` が `"deal-2"` を返す

---

### TC-039: createdAt が string として Client Component に渡される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `listInquiries` が `createdAt: Date` を含む `InquiryWithClient[]` を返す
**WHEN** Server Component が `InquiryListView` に渡す `InquiryRow[]` を生成する
**THEN** 各行の `createdAt` フィールドが `Date.toISOString()` による `string` に変換されており、`Date` オブジェクトが直接渡されていない

---

### TC-040: グリッドの visual スタイルが仕様と一致する

**Category**: manual
**Priority**: could
**Source**: design.md > Decisions > D7

**GIVEN** 引合一覧ページを表示する
**WHEN** ブラウザの開発ツールでテーブルヘッダー行の CSS を確認する
**THEN** `grid-template-columns` が `1.7fr 1fr 110px 160px 110px` であり、データ行の padding が `10px 14px` になっている

---

## Result

```yaml
result: completed
total: 40
automated: 13
manual: 27
must: 24
should: 14
could: 2
blocked_reasons: []
```
