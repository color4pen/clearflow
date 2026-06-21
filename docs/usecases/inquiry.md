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
| `converted` | 案件化済み。Deal が存在する |
| `declined` | 見送り |

## 遷移ルール

| 操作 | from | to | 権限 | 処理 |
|---|---|---|---|---|
| 対応開始 | `new` | `in_progress` | 全ロール | ステータス変更 + 監査ログ |
| 案件化 | `in_progress` | `converted` | admin / manager | ステータス変更 + Deal 自動作成 + 監査ログ |
| 見送り | `new` | `declined` | 全ロール | ステータス変更 + 監査ログ |
| 見送り | `in_progress` | `declined` | 全ロール | ステータス変更 + 監査ログ |

### 終端状態

- `converted`: 案件化済み。遷移不可
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
- 監査ログ: `inquiry.updateStatus`

### UC-03: 案件化

- 前提: ステータスが `in_progress`。操作者が admin または manager
- 操作: 「案件化」ボタン → 確認
- 処理:
  1. 引き合いステータスを `converted` に変更
  2. 引き合い情報をもとに Deal を自動作成（タイトル・顧客を引き継ぎ、初期フェーズ `proposal_prep`）
- 結果: `converted` に遷移。Deal が作成される
- 監査ログ: `inquiry.updateStatus` + `deal.create`
- 承認フローとの関係: なし。承認が必要な場合は申請一覧から別途承認リクエストを作成する

### UC-04: 見送り

- 前提: ステータスが `new` または `in_progress`
- 操作: 「見送り」ボタン
- 結果: `declined` に遷移（終端）
- 監査ログ: `inquiry.updateStatus`

### UC-05: 引き合い編集

- 前提: 引き合いが存在する（全ステータスで編集可能）
- 操作: 件名・概要・流入経路・顧客の変更
- 結果: 引き合い情報が更新される
