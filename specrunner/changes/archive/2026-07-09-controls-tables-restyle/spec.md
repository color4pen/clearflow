# Spec: controls-tables-restyle

## Requirements

### Requirement: dueDateClass が暦日単位で期限切れ・当日・未来を判定する

`dueDateClass(date, now?)` は `date` とローカルタイムの暦日を比較し、クラス文字列を返さなければならない (SHALL)。`now` を省略した場合は `new Date()` を使用する。

#### Scenario: 過去日は danger クラスを返す

**Given** `now` が 2024-06-15（ローカルタイム）
**When** `dueDateClass(new Date("2024-06-14"), now)` を呼ぶ
**Then** `"text-danger font-semibold"` を返す

#### Scenario: 当日は warning クラスを返す

**Given** `now` が 2024-06-15
**When** `dueDateClass(new Date("2024-06-15"), now)` を呼ぶ
**Then** `"text-warning font-semibold"` を返す

#### Scenario: 未来日は空文字を返す

**Given** `now` が 2024-06-15
**When** `dueDateClass(new Date("2024-06-16"), now)` を呼ぶ
**Then** `""` を返す

#### Scenario: null は空文字を返す

**Given** `now` が任意の Date
**When** `dueDateClass(null, now)` を呼ぶ
**Then** `""` を返す

#### Scenario: 日付境界（当日 0 時ちょうど）は当日として扱う

**Given** `now` が 2024-06-15T00:00:00（ローカルタイム）
**When** `dueDateClass(new Date("2024-06-15T00:00:00"), now)` を呼ぶ
**Then** `"text-warning font-semibold"` を返す

#### Scenario: 文字列型の日付も受け付ける

**Given** `now` が 2024-06-15
**When** `dueDateClass("2024-06-14", now)` を呼ぶ
**Then** `"text-danger font-semibold"` を返す

---

### Requirement: 生パレットクラスが `(dashboard)` 配下に残存しない

`src/app/(dashboard)` 配下の全 TSX ファイルに、`(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|emerald)-[0-9]+` 形式のクラスが残ってはならない (SHALL)。

#### Scenario: grep がゼロ件を返す

**Given** 全タスクが完了した状態
**When** `grep -rE '(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|emerald)-[0-9]+' src/app/\(dashboard\)` を実行する
**Then** マッチ件数が 0 である

---

### Requirement: DataTable 行 hover が単一トークンに統一される

`DataTable.tsx` の行 hover は、クリック可否によらず `hover:bg-bg-surface-alt` でなければならない (SHALL)。

#### Scenario: クリック可能行の hover クラス

**Given** `DataTable` に `onRowClick` を渡した状態
**When** コンポーネントがレンダリングされる
**Then** `<tr>` の className に `hover:bg-primary/10` が含まれず `hover:bg-bg-surface-alt` が含まれる

---

### Requirement: ActionItemRow の期日が dueDateClass で強調される

ActionItemRow は `dueDateClass` を使って期日テキストに色・太字クラスを適用しなければならない (SHALL)。

#### Scenario: 期限切れの期日が danger クラスで表示される

**Given** `item.dueDate` が昨日の Date
**And** ActionItemRow がレンダリングされる
**When** 期日テキストの wrapper 要素を確認する
**Then** 該当要素の className に `text-danger` が含まれる

#### Scenario: 当日の期日が warning クラスで表示される

**Given** `item.dueDate` が今日の Date
**And** ActionItemRow がレンダリングされる
**When** 期日テキストの wrapper 要素を確認する
**Then** 該当要素の className に `text-warning` が含まれる

#### Scenario: 期日なしは強調なし

**Given** `item.dueDate` が null
**And** ActionItemRow がレンダリングされる
**When** 期日テキストの wrapper 要素を確認する
**Then** 該当要素の className が空または強調クラスを含まない
