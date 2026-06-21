---
status: draft
domain: inquiry
updated: 2026-06-21
---

# 引き合いユースケース

## ステータス定義

| ステータス | 意味 |
|---|---|
| `new` | 受付済み。未対応 |
| `in_progress` | 対応中。ヒアリング・情報収集フェーズ |
| `pending_approval` | 案件化承認待ち。承認リクエストが作成されている |
| `converted` | 案件化済み。承認完了、Deal が存在する |
| `declined` | 見送り |

## 遷移ルール

### 手動操作

| 操作 | from | to | 権限 | 処理 |
|---|---|---|---|---|
| 対応開始 | `new` | `in_progress` | 全ロール | ステータス変更 + 監査ログ |
| 案件化申請 | `in_progress` | `pending_approval` | admin / manager | 承認リクエスト作成（pending）+ ステータス変更 + 監査ログ |
| 見送り | `new` | `declined` | 全ロール | ステータス変更 + 監査ログ |
| 見送り | `in_progress` | `declined` | 全ロール | ステータス変更 + 監査ログ |

### 自動操作（承認フローフック）

| トリガー | from | to | 処理 |
|---|---|---|---|
| 承認完了 | `pending_approval` | `converted` | ステータス変更 + Deal 自動作成 + 監査ログ |
| 差し戻し / 却下 | `pending_approval` | `in_progress` | ステータス変更 + 監査ログ。再度案件化申請が可能 |

### 終端状態

- `converted`: 案件化済み。Deal が存在する。遷移不可
- `declined`: 見送り。遷移不可

## ユースケース詳細

### UC-01: 引き合い受付

- 前提: なし
- 操作: 件名・概要・流入経路を入力して登録
- 顧客: 任意（未定でも登録可。新規顧客をその場で作成可能）
- 結果: `new` ステータスで引き合いが作成される
- 監査ログ: `inquiry.create`

### UC-02: 対応開始

- 前提: ステータスが `new`
- 操作: 「対応開始」ボタン
- 結果: `in_progress` に遷移
- 監査ログ: `inquiry.updateStatus`（from: new, to: in_progress）

### UC-03: 案件化申請

- 前提: ステータスが `in_progress`。操作者が admin または manager
- 操作: 「案件化」ボタン → 承認テンプレート選択 → 確認
- 処理:
  1. 承認リクエストを `pending` で作成（sourceType: "inquiry", sourceId: 引き合いID）
  2. 承認ステップをテンプレートから生成
  3. 引き合いステータスを `pending_approval` に変更
  4. `conversionRequestId` に承認リクエストIDをセット
- 結果: `pending_approval` に遷移。承認者のキューに載る
- 監査ログ: `inquiry.updateStatus` + `request.create`

### UC-04: 案件化承認完了（自動）

- 前提: 引き合いのステータスが `pending_approval`。承認リクエストの全ステップが承認済み
- トリガー: `approveRequest` の承認完了フック（sourceType === "inquiry"）
- 処理:
  1. 引き合いステータスを `converted` に変更
  2. 引き合い情報をもとに Deal を自動作成（タイトルを引き継ぎ）
- 結果: `converted` に遷移。Deal が作成される
- 監査ログ: `inquiry.updateStatus` + `deal.create`

### UC-05: 案件化差し戻し / 却下（自動）

- 前提: 引き合いのステータスが `pending_approval`
- トリガー: `rejectRequest` または差し戻し操作（sourceType === "inquiry"）
- 処理:
  1. 引き合いステータスを `in_progress` に戻す
- 結果: `in_progress` に遷移。再度案件化申請が可能
- 監査ログ: `inquiry.updateStatus`（from: pending_approval, to: in_progress）

### UC-06: 見送り

- 前提: ステータスが `new` または `in_progress`
- 操作: 「見送り」ボタン
- 結果: `declined` に遷移（終端）
- 監査ログ: `inquiry.updateStatus`

### UC-07: 引き合い編集

- 前提: 引き合いが存在する（全ステータスで編集可能）
- 操作: 件名・概要・流入経路・顧客の変更
- 結果: 引き合い情報が更新される
- 監査ログ: なし（現状。必要であれば追加）

## 未解決事項

- `pending_approval` からの見送り（`declined`）を許可するか。許可する場合、作成済みの承認リクエストをどう扱うか（キャンセル/放置）
- 引き合い編集に監査ログを記録するか
