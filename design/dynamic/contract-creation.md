---
id: seq-contract-creation
---
# 受注案件からの契約作成

受注（won）した案件に対して契約を作成する。案件フェーズが won であることの検証と金額・期間の整合性検証を経て契約を永続化し、売上見込みに反映する。

## 登場要素
- [[act-manager]]
- [[mod-ui]]
- [[mod-action]]
- [[mod-usecase]]
- [[mod-domainservice]]
- [[mod-repo]]
- [[mod-appservice]]
- [[mod-event]]
- [[mod-db]]

## 流れ
1. [[act-manager]] が契約作成フォームを [[mod-ui]] から送り、[[mod-ui]] が [[mod-action]] に渡す
2. [[mod-action]] が認証・認可・入力検証を行い、[[mod-usecase]]（createContract）を呼ぶ
3. [[mod-usecase]] が [[mod-repo]] で対象案件を取得し、[[mod-domainservice]] で phase が won であること・金額と期間の整合性を検証する
4. [[mod-db]] のトランザクション内で [[mod-repo]] が契約を生成し、[[mod-appservice]] が監査ログを記録する
5. [[mod-usecase]] が [[mod-event]] に契約作成イベントを発行する（売上見込みへの反映・承認ポリシー評価の駆動）
6. [[mod-usecase]] が Result を返し、[[mod-action]] が UI へ結果を返す
</content>
