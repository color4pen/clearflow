# Test Cases: 商談・顧客画面のデザイン適用

## Summary

- **Total**: 34 cases
- **Automated** (unit/integration): 0
- **Manual**: 34
- **Priority**: must: 18, should: 13, could: 1

---

## A: 商談詳細 — 基本情報表示/編集

### TC-001: 表示モードで基本情報が読み取り表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 商談詳細の基本情報は表示/編集モードを切り替える > Scenario: 表示モードで基本情報が読み取り表示される

---

### TC-002: 編集ボタンで編集モードに切り替わる

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 商談詳細の基本情報は表示/編集モードを切り替える > Scenario: 編集ボタンで編集モードに切り替わる

---

### TC-003: キャンセルで表示モードに戻る

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 商談詳細の基本情報は表示/編集モードを切り替える > Scenario: キャンセルで表示モードに戻る

---

### TC-004: 保存成功で表示モードに戻る

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-03

**GIVEN** 編集モードで種別・日時・場所を変更し「保存」ボタンをクリックした  
**WHEN** `updateMeetingAction` が成功を返す  
**THEN** 表示モードに切り替わり、更新後の値がテキスト表示される

---

### TC-005: editable が false の場合は「編集」ボタンが表示されない

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-03

**GIVEN** `editable` prop が `false` である商談詳細画面を表示している  
**WHEN** 基本情報ヘッダー領域を確認する  
**THEN** 「編集」ボタンが存在しない

---

## B: 商談詳細 — ヒアリング情報

### TC-006: hearing タイプで表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: ヒアリング情報は hearing タイプの場合のみ左カラムに表示する > Scenario: hearing タイプで表示される

---

### TC-007: hearing 以外のタイプでは非表示

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: ヒアリング情報は hearing タイプの場合のみ左カラムに表示する > Scenario: hearing 以外のタイプでは非表示

---

### TC-008: ヒアリングデータの編集・保存が独立して動作する

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-02

**GIVEN** type が "hearing" の商談詳細画面を表示している  
**WHEN** ヒアリング情報セクションのフィールドを変更し「保存」ボタンをクリックする  
**THEN** `hearingData` のみを含む FormData で `updateMeetingAction` が呼び出され、他のセクションは再送信されない

---

### TC-009: ヒアリングセクションのレイアウトが 100px ラベル + 1fr 値の grid である

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-02

**GIVEN** type が "hearing" の商談詳細画面を表示している  
**WHEN** ヒアリング情報セクションのスタイルを確認する  
**THEN** `grid-template-columns: 100px 1fr` が適用されている

---

## C: 商談詳細 — 出席者セクション

### TC-010: 社内・外部の出席者が分離表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 出席者セクションは社内と外部をサブセクションで分離する > Scenario: 社内・外部の出席者が分離表示される

---

### TC-011: 出席者の追加・削除・保存が独立して動作する

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-01

**GIVEN** 商談詳細画面の出席者セクションを表示している  
**WHEN** 社内出席者を 1 名追加し「保存」ボタンをクリックする  
**THEN** `internalAttendees` を含む FormData で `updateMeetingAction` が呼び出され、議事録・基本情報のセクションは影響を受けない

---

### TC-012: 外部出席者の「顧客担当者として登録」機能が維持される

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-01

**GIVEN** 商談詳細画面の外部出席者サブセクションを表示している  
**WHEN** 外部出席者に担当者名を入力し「顧客担当者として登録」チェックボックスをオンにして保存する  
**THEN** `registerContacts` フィールドが FormData に含まれ `updateMeetingAction` が呼び出される

---

## D: 商談詳細 — レイアウト

### TC-013: 商談詳細のカラム比率が 1.6fr:1fr で gap が 24px である

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** 商談詳細画面を表示している  
**WHEN** 2 カラムグリッドのスタイルを確認する  
**THEN** `grid-template-columns: 1.6fr 1fr` かつ `gap: 24px` が適用されている

---

### TC-014: 議事録が左カラム、出席者が右カラムに配置される

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** 商談詳細画面を表示している  
**WHEN** 2 カラムグリッドの配置を確認する  
**THEN** 左カラムに議事録セクション（MeetingSummarySection）、右カラムに出席者セクション（MeetingAttendeesSection）が配置されている

---

### TC-015: 基本情報がヘッダー領域に表示される

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** 商談詳細画面を表示している  
**WHEN** ツールバー（ヘッダーバー）領域を確認する  
**THEN** 種別・日時・場所がグリッドの外側のヘッダー領域にテキスト表示されている

---

### TC-016: アクションアイテムが右カラムの出席者の下に配置される

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-04

**GIVEN** 商談詳細画面を表示している  
**WHEN** 右カラムの構成を確認する  
**THEN** 出席者セクションの下にアクションアイテムセクションが配置されている

---

## E: 顧客一覧 — カラム

### TC-017: 4 カラムのテーブルが表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 顧客一覧は 4 カラムで表示する > Scenario: 4 カラムのテーブルが表示される

---

### TC-018: 規模・担当者数・引き合い数カラムが存在しない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-05

**GIVEN** 顧客一覧画面を表示している  
**WHEN** テーブルヘッダーを確認する  
**THEN** 「規模」「担当者数」「引き合い数」のカラムが存在しない

---

### TC-019: 案件数カラムが「関連案件数」ラベルで表示される

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-05

**GIVEN** 顧客が 1 件以上登録されている  
**WHEN** 顧客一覧画面のテーブルヘッダーを確認する  
**THEN** 4 列目のヘッダーが「関連案件数」と表示されている

---

### TC-020: 不要クエリ（担当者数・引き合い数）が削除されている

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-05

**GIVEN** `clients/page.tsx` のソースコードを確認する  
**WHEN** `clientRepository.countContactsByClientIds` および `inquiryRepository.findAllByOrganization` の呼び出しを検索する  
**THEN** どちらも呼び出されていない

---

### TC-021: 関連案件数の表示が維持されている

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-05

**GIVEN** 案件が 3 件紐づいた顧客が登録されている  
**WHEN** 顧客一覧画面を表示する  
**THEN** 該当顧客行の「関連案件数」セルに「3」が表示されている

---

## F: 顧客詳細 — レイアウト

### TC-022: 顧客詳細のカラム比率が 1.5fr:1fr で gap が 24px である

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** 顧客詳細画面を表示している  
**WHEN** 2 カラムグリッドのスタイルを確認する  
**THEN** `grid-template-columns: 1.5fr 1fr` かつ `gap: 24px` が適用されている

---

### TC-023: 左カラムに企業情報と担当者が配置される

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** 顧客詳細画面を表示している  
**WHEN** 左カラムの構成を確認する  
**THEN** 企業情報セクション（ClientInfoSection）の下に担当者セクション（ClientContactsSection）が配置されている

---

### TC-024: 右カラムに関連引合・案件一覧・契約一覧が配置される

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** 顧客詳細画面を表示している  
**WHEN** 右カラムの構成を確認する  
**THEN** 関連引合セクション・案件一覧セクション・契約一覧セクションが右カラムに配置されている

---

### TC-025: 企業情報のラベル幅が 80px である

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-06

**GIVEN** 顧客詳細画面の企業情報セクションを表示している  
**WHEN** `dl` リストの `dt` 要素のスタイルを確認する  
**THEN** ラベル幅が 80px（`w-20` クラスまたは相当スタイル）である

---

## G: 顧客詳細 — 担当者テーブル

### TC-026: 統合カラムが正しく表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 顧客詳細の担当者テーブルは 4 カラムで表示する > Scenario: 統合カラムが正しく表示される

---

### TC-027: 部署・役職が片方のみの場合

**Category**: manual  
**Priority**: should  
**Source**: spec.md > Requirement: 顧客詳細の担当者テーブルは 4 カラムで表示する > Scenario: 部署・役職が片方のみの場合

---

### TC-028: 担当者テーブルが 4 カラムの grid 表示になっている

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-07

**GIVEN** 顧客詳細画面を表示している  
**WHEN** 担当者テーブルのヘッダー行を確認する  
**THEN** 「名前」「部署・役職」「連絡先」「アクション」の 4 カラムが `grid-template-columns: 1.2fr 1fr 1.4fr 120px` で表示されている

---

### TC-029: 主担当フラグが名前カラムに表示される

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-07

**GIVEN** `isPrimary: true` の担当者が登録されている  
**WHEN** 顧客詳細画面の担当者テーブルを確認する  
**THEN** 名前カラムに担当者名と並んで主担当を示すバッジが表示されている

---

### TC-030: 追加フォームと編集モーダルの動作が維持される

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-07

**GIVEN** 顧客詳細画面の担当者テーブルを表示している  
**WHEN** 「担当者を追加」ボタンをクリックして追加フォームを開き、担当者行をクリックして編集モーダルを開く  
**THEN** 追加フォームと編集モーダルがそれぞれ正常に表示・操作できる

---

### TC-031: 部署・役職・連絡先が両方 null の場合は「-」が表示される

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-07

**GIVEN** `department`, `position`, `email`, `phone` がすべて null の担当者が登録されている  
**WHEN** 顧客詳細画面の担当者テーブルを確認する  
**THEN** 「部署・役職」セルと「連絡先」セルに「-」が表示される

---

## H: 品質保証

### TC-032: typecheck が green

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-08

**GIVEN** すべての実装変更が完了している  
**WHEN** `bun run typecheck` を実行する  
**THEN** 型エラーなしで exit 0 で完了する

---

### TC-033: test が green

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-08

**GIVEN** すべての実装変更が完了している  
**WHEN** `bun test` を実行する  
**THEN** すべてのテストが pass し exit 0 で完了する

---

### TC-034: build が green

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-08

**GIVEN** すべての実装変更が完了している  
**WHEN** `bun run build` を実行する  
**THEN** ビルドエラーなしで exit 0 で完了する

---

## Result

```yaml
result: completed
total: 34
automated: 0
manual: 34
must: 18
should: 13
could: 1
blocked_reasons: []
```
