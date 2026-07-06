---
id: seq-inquiry-conversion
---
# 引合の案件化（承認ポリシーゲート付き）

引合を案件化するとき、承認ポリシーに合致すれば案件生成をブロックして承認リクエストを生成し、合致しなければ即時に案件を生成する。案件化と承認ゲートの主体は [[act-manager]] である。

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
1. [[act-manager]] が案件化操作を [[mod-ui]] から送り、[[mod-ui]] が [[mod-action]] に渡す
2. [[mod-action]] が認証・認可・入力検証を行い、[[mod-usecase]]（updateInquiryStatus）を呼ぶ
3. [[mod-usecase]] が [[mod-repo]] で引合を取得し、[[mod-domainservice]] で new → converted の遷移可否を検証する
4. [[mod-usecase]] が [[mod-repo]] で既存の pending 承認リクエストの有無を確認し（重複防止）、有効な承認ポリシーを [[mod-repo]] から取得して条件を評価する
5. 合致するポリシーがある場合: [[mod-db]] のトランザクション内で [[mod-repo]] が承認リクエストと承認ステップを生成し、[[mod-appservice]] が監査ログを記録し、案件は生成しない。[[mod-event]] に承認申請イベントを発行する
6. 合致するポリシーがない場合: [[mod-db]] のトランザクション内で [[mod-repo]] が案件を生成し引合を converted に更新、[[mod-appservice]] が監査ログを記録し、[[mod-event]] に案件化イベントを発行する
7. [[mod-usecase]] が Result を返し、[[mod-action]] が UI へ結果を返す。トランザクション後に [[mod-event]] が非同期ハンドラをフラッシュする
</content>
