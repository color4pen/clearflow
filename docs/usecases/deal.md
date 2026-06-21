---
status: draft
domain: deal
updated: 2026-06-21
---

# 案件ユースケース

## フェーズ定義

| フェーズ | 意味 |
|---|---|
| `proposal_prep` | 提案準備。案件化直後の初期状態 |
| `proposed` | 提案済み。顧客に提案書を提出した |
| `negotiation` | 交渉中。条件調整フェーズ |
| `won` | 受注。契約成立 |
| `lost` | 失注 |

## 遷移ルール

| 操作 | from | to | 権限 | 処理 |
|---|---|---|---|---|
| 提案済みに変更 | `proposal_prep` | `proposed` | admin / manager | フェーズ変更 + 監査ログ |
| 交渉に変更 | `proposed` | `negotiation` | admin / manager | フェーズ変更 + 監査ログ |
| 受注 | `negotiation` | `won` | admin / manager | フェーズ変更 + 監査ログ |
| 失注 | `proposal_prep` / `proposed` / `negotiation` | `lost` | admin / manager | フェーズ変更 + 監査ログ |

### 終端状態

- `won`: 受注。遷移不可
- `lost`: 失注。遷移不可

## ユースケース詳細

### UC-01: 案件作成（自動）

- 前提: 引き合いが案件化される（inquiry UC-03）
- トリガー: 引き合いの案件化操作
- 処理: 引き合いのタイトル・顧客を引き継いで Deal を作成。初期フェーズは `proposal_prep`
- 結果: 案件が作成される
- 監査ログ: `deal.create`

### UC-02: フェーズ進行

- 前提: 案件が終端状態でない。操作者が admin または manager
- 操作: フェーズ変更ボタン
- 結果: 次のフェーズに遷移
- 監査ログ: `deal.updatePhase`
- 承認フローとの関係: なし。見積承認が必要な場合は申請一覧から別途承認リクエストを作成する

### UC-03: 案件情報更新

- 前提: 案件が存在する。操作者が admin または manager
- 操作: タイトル・想定金額・期間・契約種別・担当者・備考の変更
- 結果: 案件情報が更新される
- 監査ログ: `deal.update`

### UC-04: 失注

- 前提: 案件が終端状態でない。操作者が admin または manager
- 操作: 「失注」ボタン
- 結果: `lost` に遷移（終端）
- 監査ログ: `deal.updatePhase`

### UC-05: 案件担当者管理

- 前提: 案件が存在する。顧客が確定している（clientId あり）
- 操作: 顧客の担当者を選択してロール（キーマン・決裁者・技術担当・その他）を指定して追加。削除も可能
- 結果: deal_contacts が更新される
- 監査ログ: `deal_contact.create` / `deal_contact.delete`
