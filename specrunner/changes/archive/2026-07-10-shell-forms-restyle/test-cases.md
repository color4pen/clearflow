# Test Cases: シェルと共有部品の刷新（サイドバー装飾・フォーム規律・トースト/ダイアログ）

## Summary

- **Total**: 62 cases
- **Automated** (unit/integration): 59
- **Manual**: 3
- **Priority**: must: 41, should: 18, could: 3

---

## サイドバー（SidebarNav・layout.tsx）

### TC-001: セクションラベルが描画される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: サイドバーのセクション分けとアイコン表示 > Scenario: セクションラベルが描画される

---

### TC-002: アイコンがラベル左に固定幅で表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: サイドバーのセクション分けとアイコン表示 > Scenario: アイコンがラベル左に固定幅で表示される

---

### TC-003: active 項目に border-primary が付く

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: サイドバー active スタイルの border-primary 化 > Scenario: active 項目に border-primary が付く

---

### TC-004: 非 active 項目に border-primary が付かない

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: サイドバー active スタイルの border-primary 化 > Scenario: 非 active 項目に border-primary が付かない

---

### TC-005: 未承認申請がある場合にバッジが表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 申請バッジの配線 > Scenario: 未承認申請がある場合にバッジが表示される

---

### TC-006: pending 申請が 0 件の場合にバッジが非表示になる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 申請バッジの配線 > Scenario: pending 申請が 0 件の場合にバッジが非表示になる

---

### TC-007: サイドバーの幅が 220px になる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: サイドバー幅とロゴ行の更新 > Scenario: サイドバーの幅が 220px になる

---

### TC-008: dark テーマでパネル背景が正常に描画される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: NotificationPanel の未定義トークン修正 > Scenario: dark テーマでパネル背景が正常に描画される

---

### TC-009: アバターと縦 2 段テキストが描画される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: ユーザー領域の頭文字アバター追加 > Scenario: アバターと縦 2 段テキストが描画される

---

### TC-010: ログアウトボタンが danger 色で表示される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: ログアウトボタンの danger 色化 > Scenario: ログアウトボタンが danger 色で表示される

---

### TC-011: SidebarNav active クラスに border-white が含まれない（旧スタイル除去）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** 変更後の `SidebarNav.tsx` が存在する
**WHEN** ファイル内の active クラス文字列を確認する
**THEN** `border-white` が active クラスとして含まれない（`border-l-2 border-white` が削除されている）

---

### TC-012: layout.tsx が listRequests をインポートし badgeCount を算出して SidebarNav に渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** 変更後の `src/app/(dashboard)/layout.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `listRequests` のインポートが存在し、`badgeCount` が計算されて `<SidebarNav badgeCount={badgeCount}` に渡されている

---

### TC-013: badgeCount が 99 を超える場合に "99+" と表示される

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-05

**GIVEN** `SidebarNav.tsx` のバッジ描画ロジック
**WHEN** `badgeCount` に 100 以上の値が渡される
**THEN** ピル要素に "99+" が表示される（`badgeCount > 99 ? "99+" : badgeCount` のガード）

---

### TC-014: サイドバーロゴ行が h-14 固定高さ・下線付きで描画される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-06

**GIVEN** ダッシュボードレイアウトが描画されている
**WHEN** サイドバー上部のロゴ行を目視確認する
**THEN** ロゴ行の高さが 56px（h-14）で固定され、下部に border-b border-white/10 の区切り線が表示される

---

### TC-015: NotificationPanel のパネル幅が w-[340px] になる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** 変更後の `src/app/(dashboard)/NotificationPanel.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `w-[340px]` が含まれ、`w-80` は含まれない

---

### TC-016: NotificationPanel の left オフセットが left-[220px] になる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** 変更後の `src/app/(dashboard)/NotificationPanel.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `left-[220px]` が含まれ、`left-[210px]` は含まれない

---

## フォーム部品（FormField・styles.ts）

### TC-017: FormField ラベルのクラスが更新される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: FormField ラベルスタイルの統一 > Scenario: FormField ラベルのクラスが更新される

---

### TC-018: required=true のとき * が表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: FormField の required props > Scenario: required=true のとき * が表示される

---

### TC-019: required 未指定のとき * が表示されない

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: FormField の required props > Scenario: required 未指定のとき * が表示されない

---

### TC-020: Input に invalid=true のとき赤枠が付く

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 入力部品のエラー赤枠 > Scenario: invalid=true のとき赤枠が付く

---

### TC-021: Input に invalid 未指定のとき赤枠が付かない

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 入力部品のエラー赤枠 > Scenario: invalid 未指定のとき赤枠が付かない

---

### TC-022: Textarea に最小高さが設定される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Textarea の min-h-20 追加 > Scenario: Textarea に最小高さが設定される

---

### TC-023: FORM_LABEL 定数が新しいクラス値を持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** 変更後の `src/app/(dashboard)/styles.ts` が存在する
**WHEN** `FORM_LABEL` 定数の値を確認する
**THEN** `"text-xs font-semibold text-text-secondary"` に変更されており、`font-bold` および `text-text` は含まれない

---

### TC-024: FormField が FORM_LABEL をインポートして参照する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** 変更後の `src/app/components/FormField.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `import { FORM_LABEL }` が存在し、ラベル要素のクラスに `FORM_LABEL` の参照が含まれる

---

### TC-025: Select コンポーネントに invalid=true で border-danger が付く

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** 変更後の `src/app/components/FormField.tsx` の `Select` が存在する
**WHEN** ファイル内容を確認する
**THEN** `Select` が `invalid?: boolean` props を持ち、`border-danger` クラスの適用ロジックが含まれる

---

### TC-026: Textarea コンポーネントに invalid=true で border-danger が付く

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** 変更後の `src/app/components/FormField.tsx` の `Textarea` が存在する
**WHEN** ファイル内容を確認する
**THEN** `Textarea` が `invalid?: boolean` props を持ち、`border-danger focus:border-danger` クラスの適用ロジックが含まれる

---

### TC-027: MoneyInput に invalid=true で border-danger が付く

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 変更後の `src/app/components/MoneyInput.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `invalid?: boolean` props が存在し、`invalid=true` のとき表示 input のクラスに `border-danger` が含まれる

---

## フォームレイアウト

### TC-028: deals/new が 2 カラムになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: deals/new・contracts/new の 2 カラム化 > Scenario: deals/new が 2 カラムになる

---

### TC-029: contracts/new が 2 カラムになる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08b

**GIVEN** 変更後の `src/app/(dashboard)/contracts/new/NewContractForm.tsx` が存在する
**WHEN** フォームグリッドコンテナのクラスを確認する
**THEN** `grid-cols-2` と `gap-x-6` が含まれる

---

### TC-030: NewDealForm の備考フィールドが col-span-2 で wrap される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-08a

**GIVEN** 変更後の `src/app/(dashboard)/deals/new/NewDealForm.tsx` が存在する
**WHEN** 備考（`name="notes"`）の `Textarea` を持つ `FormField` の親コンテナを確認する
**THEN** `col-span-2` クラスが含まれる

---

### TC-031: ClientForm のグリッド gap が統一される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: clients/new・inquiries/new の gap 統一 > Scenario: ClientForm のグリッド gap が統一される

---

### TC-032: InquiryForm のグリッド gap が統一される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: clients/new・inquiries/new の gap 統一 > Scenario: InquiryForm のグリッド gap が統一される

---

### TC-033: ClientForm に手書きの * が残っていない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-09a

**GIVEN** 変更後の `src/app/(dashboard)/clients/new/ClientForm.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** 手書きの `<span className="text-danger">*</span>` が含まれない（`FormField required` prop に置き換え済み）

---

### TC-034: InquiryForm に手書きの * が残っていない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-09b

**GIVEN** 変更後の `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** 手書きの `<span className="text-danger">*</span>` が含まれない（`FormField required` prop に置き換え済み）

---

## トースト（Toast.tsx・globals.css）

### TC-035: globals.css に --bg-toast トークンが両テーマで定義される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** 変更後の `src/app/globals.css` が存在する
**WHEN** ファイル内容を確認する
**THEN** `:root` ブロックに `--bg-toast: #1e293b;` が存在し、`[data-theme="dark"]` ブロックに `--bg-toast: #334155;` が存在し、`@theme inline` ブロックに `--color-bg-toast: var(--bg-toast)` が存在する

---

### TC-036: globals.css に @keyframes toast-slide-in が定義される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** 変更後の `src/app/globals.css` が存在する
**WHEN** ファイル内容を確認する
**THEN** `@keyframes toast-slide-in` が定義されており、`translateX(60px)` と `opacity: 0` から `opacity: 1` へのアニメーション記述が含まれる

---

### TC-037: Toast が右下に表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Toast の刷新 > Scenario: Toast が右下に表示される

---

### TC-038: success Toast に ✓ プレフィックスが付く

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Toast の刷新 > Scenario: success Toast に ✓ プレフィックスが付く

---

### TC-039: error Toast に ✗ プレフィックスが付く

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Toast の刷新 > Scenario: error Toast に ✗ プレフィックスが付く

---

### TC-040: Toast に border-l-4 が含まれない（左カラーバー廃止）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 変更後の `src/app/components/Toast.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `border-l-4` が含まれない（左カラーバーが廃止されている）

---

### TC-041: Toast に bg-bg-toast が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 変更後の `src/app/components/Toast.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `bg-bg-toast` が含まれる

---

### TC-042: Toast に toast-slide-in アニメーション参照が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 変更後の `src/app/components/Toast.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `toast-slide-in` の文字列が含まれる（`animation` プロパティで参照）

---

## 新規作成成功時のトースト

### TC-043: 顧客登録成功時にトーストが表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 新規作成成功時のトースト表示 > Scenario: 顧客登録成功時にトーストが表示される

---

### TC-044: InquiryForm 成功時に「引き合いを登録しました」トーストが呼ばれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11b

**GIVEN** 変更後の `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `useToast` のインポートが存在し、`showToast("引き合いを登録しました", "success")` の呼び出しが含まれる

---

### TC-045: NewDealForm 成功時に「案件を作成しました」トーストが呼ばれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11c

**GIVEN** 変更後の `src/app/(dashboard)/deals/new/NewDealForm.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `useToast` のインポートが存在し、`showToast("案件を作成しました", "success")` の呼び出しが含まれる

---

### TC-046: NewContractForm 成功時に「契約を作成しました」トーストが呼ばれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11d

**GIVEN** 変更後の `src/app/(dashboard)/contracts/new/NewContractForm.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `useToast` のインポートが存在し、`showToast("契約を作成しました", "success")` の呼び出しが含まれる

---

## ダイアログ（ConfirmDialog・ActionItemModal）

### TC-047: ConfirmDialog のボタンに角丸クラスが含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ConfirmDialog の整形 > Scenario: ボタンに角丸クラスが含まれる

---

### TC-048: variant="danger" 時に確定ボタンが BTN_DANGER になる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ConfirmDialog の整形 > Scenario: variant="danger" 時に確定ボタンが BTN_DANGER になる

---

### TC-049: ConfirmDialog の overlay に bg-black/45 が含まれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** 変更後の `src/app/components/ConfirmDialog.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `bg-black/45` が含まれ、`bg-black/40` は含まれない

---

### TC-050: ConfirmDialog 本体に rounded-lg が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 変更後の `src/app/components/ConfirmDialog.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `rounded-lg` が含まれる

---

### TC-051: ConfirmDialog に header-body・body-footer 区切り線が存在する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** 変更後の `src/app/components/ConfirmDialog.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `border-b border-border`（header-body 区切り）と `border-t border-border`（body-footer 区切り）の両方が含まれる

---

### TC-052: ConfirmDialog 本体の maxWidth が 480 になる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** 変更後の `src/app/components/ConfirmDialog.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** maxWidth として `480` が設定されており、`420` は含まれない

---

### TC-053: 担当者フィールドが Select コンポーネントを使う

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ActionItemModal のラベル・select 統一 > Scenario: 担当者フィールドが Select コンポーネントを使う

---

### TC-054: ActionItemModal が FORM_LABEL をインポートしている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** 変更後の `src/app/(dashboard)/components/ActionItemModal.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** `FORM_LABEL` のインポートが存在し、ラベル要素のクラスに `FORM_LABEL` が参照されている

---

### TC-055: ActionItemModal のラベルに text-text-muted が含まれない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** 変更後の `src/app/(dashboard)/components/ActionItemModal.tsx` が存在する
**WHEN** ファイル内容を確認する
**THEN** ラベル要素のクラスに `text-text-muted` が含まれない（`FORM_LABEL` 参照に置き換え済み）

---

## 品質ゲート（静的解析・アーキテクチャ）

### TC-056: 変更後のファイルに hex 直書きクラスが存在しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 生パレット・hex 直書きクラスの持ち込み禁止 > Scenario: 変更後のファイルに hex 直書きクラスが存在しない

---

### TC-057: aozu check が exit 0 で終了する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: architecture test と aozu check が green を維持 > Scenario: aozu check が exit 0 で終了する

---

### TC-058: architecture test が green になる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: architecture test と aozu check が green を維持 > Scenario: architecture test が green になる

---

### TC-059: 全追加テストファイルが bun test で pass する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** T-14a〜T-14f で追加されたすべてのテストファイルが存在する
**WHEN** `bun test` を実行する
**THEN** SidebarNav・FormField・Toast・ConfirmDialog・successToasts・NotificationPanel の各テストがすべて pass する

---

### TC-060: typecheck・lint・build が green を維持する

**Category**: integration
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** 本 change の全ファイルが適用されている
**WHEN** `bun typecheck`・`bun lint`・`bun build` を順に実行する
**THEN** すべてエラーなし（exit 0）で完了する

---

### TC-061: ダークテーマでサイドバー・バッジ・トースト・ダイアログ・赤枠のコントラストが成立する

**Category**: manual
**Priority**: must
**Source**: request.md > 実装上の必須事項 3

**GIVEN** ブラウザを `[data-theme="dark"]` モードで開く
**WHEN** サイドバー・申請バッジ・Toast（success/error）・ConfirmDialog・エラー赤枠を目視確認する
**THEN** 各要素の文字と背景にコントラストが成立しており、未定義トークン（透明・白抜け等）による表示崩れがない

---

### TC-062: mock-fidelity-check.md が change folder に存在し対象部品の突き合わせを含む

**Category**: manual
**Priority**: could
**Source**: request.md > 参照資料

**GIVEN** 参照資料（mock.html・mock-styles.css）が利用可能な環境である
**WHEN** `specrunner/changes/shell-forms-restyle/` ディレクトリを確認する
**THEN** `mock-fidelity-check.md` が存在し、sidebar・form-group・toast・modal の各部品について「モックの該当箇所 / 適用した値 / 意図的な差異と理由」が記録されている

---

## Result

```yaml
result: completed
total: 62
automated: 59
manual: 3
must: 41
should: 18
could: 3
blocked_reasons: []
```
