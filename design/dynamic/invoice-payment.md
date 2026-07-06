---
id: seq-invoice-payment
---
# 請求の入金確認と Webhook 配信

請求を invoiced から paid に遷移し、入金日を記録する。売上実績への計上を駆動し、トランザクション後に外部システムへ Webhook を配信する。入金確認の主体は [[act-finance]] である。外部の Webhook 受信システムは ext ビュー未実装のため登場要素に現れない（findings 参照）。

## 登場要素
- [[act-finance]]
- [[mod-ui]]
- [[mod-action]]
- [[mod-usecase]]
- [[mod-domainservice]]
- [[mod-repo]]
- [[mod-appservice]]
- [[mod-event]]
- [[mod-handler]]
- [[mod-webhook]]
- [[mod-db]]

## 流れ
1. [[act-finance]] が入金確認操作を [[mod-ui]] から送り、[[mod-ui]] が [[mod-action]] に渡す
2. [[mod-action]] が認証・認可・入力検証を行い、[[mod-usecase]]（updateInvoiceStatus）を呼ぶ
3. [[mod-usecase]] が [[mod-repo]] で請求を取得し、[[mod-domainservice]] で invoiced → paid の遷移可否と入金日の設定を検証する
4. [[mod-db]] のトランザクション内で [[mod-repo]] が請求を paid に更新し paidAt を記録、[[mod-appservice]] が監査ログを記録する
5. [[mod-usecase]] が [[mod-event]] に入金イベントを発行する（売上実績の計上を駆動）
6. トランザクション後、[[mod-event]] のフラッシュにより [[mod-handler]] が入金イベントを受け、[[mod-webhook]] が外部システムへ配信し、失敗時はリトライしつつ配信結果を [[mod-repo]] に記録する
7. [[mod-usecase]] が Result を返し、[[mod-action]] が UI へ結果を返す
</content>
