---
id: seq-approval-completion
---
# システム連動承認の完了と承認後アクション

承認者が全ステップを承認すると、システム連動リクエストは承認完了イベントを発火し、記録された triggerAction に対応するドメインアクション（案件化など）が実行される。承認の主体は [[act-approver]]（委任時は委任先が代理する）。

## 登場要素
- [[act-approver]]
- [[mod-ui]]
- [[mod-action]]
- [[mod-usecase]]
- [[mod-domainservice]]
- [[mod-repo]]
- [[mod-appservice]]
- [[mod-event]]
- [[mod-handler]]
- [[mod-db]]

## 流れ
1. [[act-approver]] が承認操作を [[mod-ui]] から送り、[[mod-ui]] が [[mod-action]] に渡す
2. [[mod-action]] が認証・入力検証を行い、[[mod-usecase]]（approveRequest）を呼ぶ
3. [[mod-usecase]] が [[mod-repo]] でリクエストとステップを取得し、[[mod-domainservice]] で [[act-approver]] の承認権限（ロール一致・委任適用）・期限・遷移可否を検証する
4. [[mod-db]] のトランザクション内で [[mod-repo]] が現ステップを approved に更新し、[[mod-appservice]] が監査ログを記録する
5. 全ステップが承認済みなら [[mod-repo]] がリクエストを approved に更新し、[[mod-event]] に承認完了イベントを発行する
6. トランザクション後、[[mod-event]] のフラッシュにより [[mod-handler]] が承認完了イベントを受け、system 起動の場合は記録された triggerAction に対応する [[mod-usecase]] を実行する
7. [[mod-usecase]] が Result を返し、[[mod-action]] が UI へ結果を返す
</content>
