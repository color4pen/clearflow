---
status: draft
domain: contract
updated: 2026-06-21
---

# 契約ユースケース

## エンティティ定義

### Contract（契約）

| フィールド | 意味 |
|---|---|
| dealId | 案件への参照（受注した Deal） |
| clientId | 顧客への直接参照 |
| title | 契約名 |
| contractType | 準委任 / 請負 / SES |
| amount | 契約金額 |
| startDate / endDate | 契約期間 |
| paymentTerms | 支払条件（月末締め翌月末払い等） |
| renewalType | one_time（スポット） / recurring（定期） |
| renewalCycle | 更新サイクル（monthly / yearly）。recurring の場合のみ |
| status | active / completed / cancelled |

### Invoice（請求）

| フィールド | 意味 |
|---|---|
| contractId | 契約への参照 |
| title | 請求名（着手金 / 中間金 / ○月分稼働 等） |
| amount | 請求金額 |
| dueDate | 支払期日 |
| status | scheduled / invoiced / paid / overdue |
| invoicedAt | 請求日 |
| paidAt | 入金日 |

## ステータス定義

### Contract Status

| ステータス | 意味 |
|---|---|
| `active` | 契約中 |
| `completed` | 完了（納品・検収済み or 契約期間終了） |
| `cancelled` | 解約 |

### Invoice Status

| ステータス | 意味 |
|---|---|
| `scheduled` | 請求予定。まだ請求書を発行していない |
| `invoiced` | 請求済み。請求書を発行した |
| `paid` | 入金済み |
| `overdue` | 支払期日超過 |

## ユースケース

### UC-01: 契約作成

- 前提: Deal が won フェーズ。操作者が admin または manager
- 操作: 案件詳細から「契約を作成」
- 処理: Deal の情報（金額・契約種別・期間）を引き継いで Contract を作成
- 結果: active ステータスの Contract が作成される

### UC-02: 請求追加

- 前提: Contract が active
- 操作: 契約詳細から請求を追加
- 処理: タイトル・金額・支払期日を入力。one_time の場合、請求合計が契約金額を超えないことを検証
- 結果: scheduled ステータスの Invoice が作成される

### UC-03: 請求ステータス変更

- 前提: Invoice が存在する
- 操作: scheduled → invoiced → paid
- 遷移ルール: scheduled → invoiced（請求書発行）、invoiced → paid（入金確認）

### UC-04: 契約完了

- 前提: Contract が active
- 操作: 「完了」ボタン
- 結果: completed に遷移

## 請求パターン

### one_time（請負・スポット）

手動で分割請求を追加:
- 着手金 30%（契約時）
- 中間金 30%（設計完了時）
- 残金 40%（納品検収後）

合計が契約金額を超えないことをシステムで検証する。

### recurring（保守・SES・運用）

月次または年次で定期的に請求が発生する。請求は手動で追加する（自動生成は将来対応）。合計金額の上限チェックは行わない。

## 未決事項

- 追加発注時に Contract の金額を改定するのか、別 Contract を立てるのか
- 請求書の PDF 生成・出力
- 入金管理の詳細（部分入金、振込手数料）
- 定期契約の自動請求生成
