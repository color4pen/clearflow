# Spec: UI デザイン基盤の刷新（デザイントークン＋ステータスバッジ体系）

## Requirements

### Requirement: StatusBadge は variant に応じた系統トークンクラスを適用する

`StatusBadge` コンポーネントは `variant` prop に応じて `bg-status-{variant}-bg` および `text-status-{variant}-text` クラスを適用し、`children` を pill 形状（`rounded-full px-2 py-0.5 text-2xs font-semibold whitespace-nowrap`）で描画しなければならない。The component SHALL NOT have any click or focus interaction handlers.

#### Scenario: variant=green が描画される

**Given** `<StatusBadge variant="green">受注</StatusBadge>` をレンダリングする
**When** コンポーネントのソースを確認する
**Then** `bg-status-green-bg` および `text-status-green-text` クラスを持ち、`children` が描画される

#### Scenario: variant=red が描画される

**Given** `<StatusBadge variant="red">失注</StatusBadge>` をレンダリングする
**When** コンポーネントのソースを確認する
**Then** `bg-status-red-bg` および `text-status-red-text` クラスを持ち、`children` が描画される

#### Scenario: variant=yellow が描画される

**Given** `<StatusBadge variant="yellow">審査中</StatusBadge>` をレンダリングする
**When** コンポーネントのソースを確認する
**Then** `bg-status-yellow-bg` および `text-status-yellow-text` クラスを持ち、`children` が描画される

#### Scenario: variant=gray が描画される

**Given** `<StatusBadge variant="gray">下書き</StatusBadge>` をレンダリングする
**When** コンポーネントのソースを確認する
**Then** `bg-status-gray-bg` および `text-status-gray-text` クラスを持ち、`children` が描画される

#### Scenario: variant=navy が描画される

**Given** `<StatusBadge variant="navy">完了</StatusBadge>` をレンダリングする
**When** コンポーネントのソースを確認する
**Then** `bg-status-navy-bg` および `text-status-navy-text` クラスを持ち、`children` が描画される

---

### Requirement: globals.css にステータス系統トークンがライト/ダーク両値で定義され @theme inline に配線される

`globals.css` の `:root` に `--status-{系統}-text` / `--status-{系統}-bg` が定義され、`[data-theme="dark"]` に対応するダーク値が定義され、`@theme inline` で `--color-status-{系統}-text` / `--color-status-{系統}-bg` として配線されなければならない。The CSS MUST define both light and dark values for all 6 color families (gray / blue / green / yellow / red / navy).

#### Scenario: ライトテーマで status-green-bg が正しい値を持つ

**Given** `:root` の CSS 変数定義
**When** `--status-green-bg` を参照する
**Then** `#dcfce7` が適用される

#### Scenario: ダークテーマで status-green-bg が正しい値を持つ

**Given** `[data-theme="dark"]` の CSS 変数定義
**When** `--status-green-bg` を参照する
**Then** `#14532d` が適用される（ライト値のまま残っていない）

#### Scenario: @theme inline に全系統が配線されている

**Given** `globals.css` の `@theme inline` ブロック
**When** `--color-status-gray-text`・`--color-status-gray-bg`・（以降全 6 系統）を確認する
**Then** すべて対応する `var(--status-*)` を参照している

---

### Requirement: statusVariant 関数がハードコード hex を含まない

`statusUtils.ts` の `statusVariant` 関数は `RequestStatus` を受け取り badge variant を返す。The function SHALL return one of `"gray" | "blue" | "green" | "yellow" | "red" | "navy"` and MUST NOT return any string containing `text-[#`.

| RequestStatus | 返却 variant |
|---|---|
| draft | gray |
| pending | yellow |
| approved | green |
| rejected | red |
| revision | yellow |
| expired | gray |

#### Scenario: draft ステータスの variant

**Given** `statusVariant("draft")` を呼び出す
**When** 戻り値を確認する
**Then** `"gray"` が返される

#### Scenario: approved ステータスの variant

**Given** `statusVariant("approved")` を呼び出す
**When** 戻り値を確認する
**Then** `"green"` が返される

#### Scenario: pending ステータスの variant

**Given** `statusVariant("pending")` を呼び出す
**When** 戻り値を確認する
**Then** `"yellow"` が返される

---

### Requirement: stepStatusVariant 関数がステップ状態を variant に変換する

`statusUtils.ts` の `stepStatusVariant` 関数は `ApprovalStepStatus` を受け取り badge variant を返す。The function SHALL return `"yellow"` for both `pending` and `rejected` steps, and `"green"` for `approved`.

| ApprovalStepStatus | 返却 variant |
|---|---|
| pending | yellow |
| approved | green |
| rejected | yellow |

#### Scenario: rejected ステップの variant が yellow である

**Given** `stepStatusVariant("rejected")` を呼び出す
**When** 戻り値を確認する
**Then** `"yellow"` が返される（red でなく yellow: 差し戻し=注意/保留の意味論）

---

### Requirement: statusRowClass がトークン参照クラスを返す

`statusUtils.ts` の `statusRowClass` 関数は pending/revision の行背景をトークン参照クラスで返す。The function SHALL return token-based classes (`bg-bg-row-pending`, `bg-bg-row-revision`) and MUST NOT return Tailwind palette direct references such as `bg-amber-50`.

#### Scenario: pending 行の背景クラス

**Given** `statusRowClass("pending")` を呼び出す
**When** 戻り値を確認する
**Then** `"bg-bg-row-pending"` が返される

#### Scenario: revision 行の背景クラス

**Given** `statusRowClass("revision")` を呼び出す
**When** 戻り値を確認する
**Then** `"bg-bg-row-revision"` が返される

---

### Requirement: deals 一覧のフェーズ列が StatusBadge で描画される

`deals/page.tsx` のフェーズ列は `phaseLabels[row.phase]` の素テキストではなく `<StatusBadge>` で描画される。The phase column SHALL render a `<StatusBadge>` with the semantic variant mapped to each `DealPhase` value.

フェーズと variant の対応:

| DealPhase | variant |
|---|---|
| hearing | gray |
| proposal_prep | blue |
| proposed | blue |
| negotiation | blue |
| won | green |
| lost | red |
| passed | gray |

#### Scenario: won フェーズのバッジ

**Given** phase=won の案件
**When** deals 一覧のフェーズ列を描画する
**Then** `variant="green"` の StatusBadge として「受注」が表示される

#### Scenario: lost フェーズのバッジ

**Given** phase=lost の案件
**When** deals 一覧のフェーズ列を描画する
**Then** `variant="red"` の StatusBadge として「失注」が表示される

#### Scenario: hearing フェーズのバッジ

**Given** phase=hearing の案件
**When** deals 一覧のフェーズ列を描画する
**Then** `variant="gray"` の StatusBadge として「ヒアリング」が表示される

---

### Requirement: 承認リクエスト一覧のステータスが StatusBadge で描画される

`BulkApprovalPanel.tsx` のステータス列はステータス文字色の `<span>` ではなくバッジで描画される。The status column SHALL render a `<StatusBadge variant={...}>` instead of `<span className={statusClass}>`.

#### Scenario: pending ステータスのバッジ

**Given** status=pending の承認リクエスト
**When** requests 一覧を描画する
**Then** `variant="yellow"` の StatusBadge として「審査中」が表示される

#### Scenario: approved ステータスのバッジ

**Given** status=approved の承認リクエスト
**When** requests 一覧を描画する
**Then** `variant="green"` の StatusBadge として「承認済み」が表示される

---

### Requirement: 請求ステータスが StatusBadge で描画される

`InvoiceSection.tsx` および請求詳細ページ（`contracts/[id]/invoices/[invoiceId]/page.tsx`）の請求ステータス表示はバッジで統一する。Both files SHALL render invoice status using `<StatusBadge>` with the variant mapped to each `InvoiceStatus` value.

#### Scenario: overdue の請求ステータスバッジ

**Given** status=overdue の請求
**When** 請求ステータスを描画する
**Then** `variant="red"` の StatusBadge として「期日超過」が表示される

#### Scenario: paid の請求ステータスバッジ

**Given** status=paid の請求
**When** 請求ステータスを描画する
**Then** `variant="green"` の StatusBadge として「入金済」が表示される

---

### Requirement: requests/statusUtils.ts に text-[# 形式の文字列が残らない

`statusUtils.ts` に含まれるすべてのステータス色指定はトークン参照または variant 文字列で表現される。The file MUST NOT contain any string matching `text-[#` after the refactoring is complete.

#### Scenario: text-[# が残っていないことを確認する

**Given** 変更後の `statusUtils.ts` ファイル内容
**When** `text-[#` でファイルを検索する
**Then** 0 件ヒットする
