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
| `estimate_approval` | 見積承認中。社内の見積承認待ち |
| `won` | 受注。契約成立 |
| `lost` | 失注 |

## 遷移ルール

### 手動操作

| 操作 | from | to | 権限 | 処理 |
|---|---|---|---|---|
| 提案済みに変更 | `proposal_prep` | `proposed` | admin / manager | フェーズ変更 + 監査ログ |
| 交渉に変更 | `proposed` | `negotiation` | admin / manager | フェーズ変更 + 監査ログ |
| 見積承認申請 | `negotiation` | `estimate_approval` | admin / manager | 承認リクエスト作成（pending, formData に想定金額）+ フェーズ変更 + 監査ログ |
| 失注 | `proposal_prep` / `proposed` / `negotiation` / `estimate_approval` | `lost` | admin / manager | フェーズ変更 + 監査ログ |

### 自動操作（承認フローフック）

| トリガー | from | to | 処理 |
|---|---|---|---|
| 見積承認完了 | `estimate_approval` | `won` | フェーズ変更 + 監査ログ |

### 終端状態

- `won`: 受注。遷移不可
- `lost`: 失注。遷移不可

## ユースケース詳細

### UC-01: 案件作成（自動）

- 前提: 引き合いの案件化承認が完了（UC-04 in inquiry.md）
- トリガー: `approveRequest` の承認完了フック
- 処理: 引き合いのタイトルを引き継いで Deal を作成。初期フェーズは `proposal_prep`
- 結果: 案件が作成される
- 監査ログ: `deal.create`

### UC-02: フェーズ進行

- 前提: 案件が終端状態でない。操作者が admin または manager
- 操作: フェーズ変更ボタン
- 結果: 次のフェーズに遷移
- 監査ログ: `deal.updatePhase`

### UC-03: 見積承認申請

- 前提: フェーズが `negotiation`。操作者が admin または manager
- 操作: 見積承認ボタン → 承認テンプレート選択 → 確認
- 処理:
  1. 承認リクエストを `pending` で作成（sourceType: "deal", sourceId: 案件ID, formData に想定金額）
  2. 承認ステップをテンプレートから生成（金額による条件付きステップ対応）
  3. 案件フェーズを `estimate_approval` に変更
  4. `estimateRequestId` に承認リクエストIDをセット
- 結果: `estimate_approval` に遷移。承認者のキューに載る
- 監査ログ: `deal.updatePhase` + `request.create`

### UC-04: 見積承認完了（自動）

- 前提: 案件フェーズが `estimate_approval`。承認リクエストの全ステップが承認済み
- トリガー: `approveRequest` の承認完了フック（sourceType === "deal"）
- 処理: 案件フェーズを `won` に変更
- 結果: `won` に遷移
- 監査ログ: `deal.updatePhase`

### UC-05: 案件情報更新

- 前提: 案件が存在する。操作者が admin または manager
- 操作: タイトル・想定金額・期間・契約種別・担当者・備考の変更
- 結果: 案件情報が更新される
- 監査ログ: `deal.update`

### UC-06: 失注

- 前提: 案件が終端状態でない。操作者が admin または manager
- 操作: 「失注」ボタン
- 結果: `lost` に遷移（終端）
- 監査ログ: `deal.updatePhase`

### UC-07: 案件担当者管理

- 前提: 案件が存在する。顧客が確定している（clientId あり）
- 操作: 顧客の担当者を選択してロール（キーマン・決裁者・技術担当・その他）を指定して追加。削除も可能
- 結果: deal_contacts が更新される
- 監査ログ: `deal_contact.create` / `deal_contact.delete`

## 未解決事項

- 見積承認の差し戻し/却下時に案件フェーズをどこに戻すか（`negotiation` が妥当）
- `estimate_approval` からの失注を許可するか。許可する場合、作成済みの承認リクエストの扱い
