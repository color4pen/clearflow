# Design: invoice-standalone

## Context

請求操作は契約詳細画面（`/contracts/[id]`）のセクション `InvoiceSection` に埋め込まれている。請求の作成は `CreateInvoiceModal`、ステータス操作は `InvoiceStatusButtons` がインラインで担当する。独立した請求詳細ページ・登録ページは存在せず、経理担当が請求の詳細確認やステータス操作をするには契約詳細画面を経由する必要がある。

ドメインサービス `invoiceTransition` は `overdue` を終端状態として扱い、遅延入金の確認ができない。`updateInvoiceStatus` ユースケースは `paidAt` を `new Date()` で自動設定しており、実際の入金日を記録できない。`getInvoice`（単一請求の取得）ユースケースは存在しない。

## Goals / Non-Goals

**Goals**:

- 請求詳細ページ（`/contracts/[id]/invoices/[invoiceId]`）を新設し、請求情報の表示とステータス操作を独立画面で行えるようにする
- 請求登録ページ（`/contracts/[id]/invoices/new`）を新設し、モーダルでなくフルページで請求を作成できるようにする
- `overdue → paid` 遷移を許可し、遅延入金の確認を可能にする
- `updateInvoiceStatus` に `paidAt` パラメータを追加し、ユーザーが入金日を指定できるようにする
- `getInvoice` ユースケースを新設し、請求詳細ページのデータ取得に使用する
- 契約詳細の `InvoiceSection` を簡素化し、詳細ページへのリンク形式にする

**Non-Goals**:

- 請求一覧ページ（`/invoices`）の新設（経理ダッシュボード R06 で代替）
- 請求の一括操作（一括発行、一括入金確認）

## Decisions

### D1: 請求詳細・登録ページの URL 構造

URL は `/contracts/[id]/invoices/[invoiceId]` および `/contracts/[id]/invoices/new` とする。請求は契約に従属するリソースであり、URL で契約との関係を明示する。`contractId` をパスパラメータに含めることで、`getInvoice` の結果と URL の `contractId` を照合し、不正な URL でのアクセスを拒否できる。

**Rationale**: `/invoices/[id]` のようなトップレベル URL も検討したが、請求一覧ページ（Non-Goal）がない状態でトップレベルに配置するのは不自然であり、パンくずリスト（契約一覧 → 契約詳細 → 請求）の階層とも一致しない。

### D2: getInvoice ユースケースの返却型

`getInvoice` は請求情報に加えて紐づく契約情報を返す。返却型は `{ invoice: Invoice; contract: Contract }` とする。これにより請求詳細ページで契約へのリンク表示やパンくずリストに必要な情報を 1 回の呼び出しで取得できる。

**Rationale**: 請求と契約を別々のユースケースで取得する案もあるが、請求詳細ページでは常に契約情報が必要であり、既存の `getContract` パターン（単純な repository 呼び出し）と同様の軽量なユースケースとして実装する。

### D3: paidAt パラメータの受け渡し方式

`updateInvoiceStatus` ユースケースの入力に `paidAt?: Date` を追加する。`paid` 遷移時のみ使用し、未指定の場合は `new Date()` にフォールバックする。Server Action 側で `paidAt` を受け取り、ユースケースに渡す。

**Rationale**: `paidAt` を別の更新 API で設定する案もあるが、入金確認とは「ステータスを paid にし、入金日を記録する」という単一の業務操作であり、1 つのユースケース呼び出しで完結すべきである。

### D4: 入金日入力の UI パターン

入金確認ボタン押下時にダイアログを表示し、入金日の入力を求める。デフォルト値は現在日時。ダイアログは Client Component として実装する。

**Rationale**: ダイアログを挟まず即時実行する案もあるが、入金日の確認・修正の機会を提供することが要件である。

### D5: 契約詳細の InvoiceSection 簡素化

`InvoiceSection` から `InvoiceStatusButtons` のインライン表示と `CreateInvoiceModal` を削除する。請求一覧テーブルの各行に詳細ページへのリンクを追加し、新規追加ボタンは登録ページへのリンクに置き換える。サマリー表示（請求済合計、入金済合計、未請求合計）は維持する。

**Rationale**: ステータス操作を詳細ページに集約することで、操作の誤りを減らし、入金日入力などの追加操作を自然に配置できる。

### D6: overdue → paid 遷移時のイベント

`overdue → paid` 遷移時も `invoice.paid` ドメインイベントを発行する。既存の `invoiced → paid` と同じイベントタイプを使用する。

**Rationale**: 入金確認という業務操作の意味は遷移元によらず同一であり、Webhook 等の下流処理も同じロジックで処理されるべきである。

## Risks / Trade-offs

[Risk] 請求詳細ページの URL に `contractId` を含めるため、URL が長くなる → パンくずリストで階層を明示し、ナビゲーション上の混乱を防ぐ。契約は請求の親リソースであり、URL 構造として自然である

[Risk] `InvoiceSection` のインライン操作を削除すると、ステータス変更に 1 クリック追加で必要になる → 一覧から詳細へのリンクを明示し、操作動線を明確にすることで補う。入金日入力など詳細ページでのみ可能な操作が加わるため、総合的な UX は向上する

[Trade-off] `getInvoice` が契約情報も含めて返すため、ユースケースの責務が単純な取得を超える → 読み取り専用のユースケースであり、`getDeal` 等の既存パターンと整合的な設計で許容範囲内

## Open Questions

なし
