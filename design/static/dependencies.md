# 許可依存

列挙されない依存はすべて禁止（fail-closed）。実際の import 方向をコードから確認して列挙する。

## プレゼンテーション層

- [[mod-ui]] -> [[mod-action]]
- [[mod-ui]] -> [[mod-usecase]]
- [[mod-ui]] -> [[mod-repo]]
- [[mod-ui]] -> [[mod-authz]]
- [[mod-ui]] -> [[mod-auth]]
- [[mod-ui]] -> [[mod-model]]
- [[mod-ui]] -> [[mod-domainservice]]
- [[mod-ui]] -> [[mod-lib]]
- [[mod-action]] -> [[mod-usecase]]
- [[mod-action]] -> [[mod-repo]]
- [[mod-action]] -> [[mod-authz]]
- [[mod-action]] -> [[mod-auth]]
- [[mod-action]] -> [[mod-model]]
- [[mod-action]] -> [[mod-domainservice]]
- [[mod-action]] -> [[mod-appservice]]
- [[mod-action]] -> [[mod-webhook]]
- [[mod-api]] -> [[mod-usecase]]
- [[mod-api]] -> [[mod-repo]]
- [[mod-api]] -> [[mod-authz]]
- [[mod-api]] -> [[mod-auth]]
- [[mod-mcp]] -> [[mod-usecase]]
- [[mod-mcp]] -> [[mod-auth]]
- [[mod-mcp]] -> [[mod-authz]]
- [[mod-mcp]] -> [[mod-model]]
- [[mod-mcp]] -> [[mod-webhook]]
- [[mod-mcp]] -> [[mod-appservice]]
- [[mod-proxy]] -> [[mod-auth]]

## アプリケーション層

- [[mod-usecase]] -> [[mod-repo]]
- [[mod-usecase]] -> [[mod-db]]
- [[mod-usecase]] -> [[mod-model]]
- [[mod-usecase]] -> [[mod-domainservice]]
- [[mod-usecase]] -> [[mod-appservice]]
- [[mod-usecase]] -> [[mod-event]]
- [[mod-usecase]] -> [[mod-lib]]
- [[mod-appservice]] -> [[mod-repo]]
- [[mod-appservice]] -> [[mod-db]]
- [[mod-appservice]] -> [[mod-model]]

## ドメイン層

- [[mod-domainservice]] -> [[mod-model]]
- [[mod-event]] -> [[mod-model]]
- [[mod-authz]] -> [[mod-model]]

## インフラストラクチャ層

- [[mod-repo]] -> [[mod-model]]
- [[mod-repo]] -> [[mod-db]]
- [[mod-auth]] -> [[mod-model]]
- [[mod-auth]] -> [[mod-db]]
- [[mod-auth]] -> [[mod-repo]]
- [[mod-webhook]] -> [[mod-model]]
- [[mod-webhook]] -> [[mod-db]]
- [[mod-handler]] -> [[mod-event]]
- [[mod-handler]] -> [[mod-usecase]]
- [[mod-handler]] -> [[mod-appservice]]
- [[mod-handler]] -> [[mod-repo]]
- [[mod-handler]] -> [[mod-db]]
- [[mod-handler]] -> [[mod-model]]
- [[mod-handler]] -> [[mod-webhook]]

## 共有

- [[mod-lib]] -> [[mod-model]]

## 開発スクリプト

- [[mod-devscript]] -> [[mod-db]]
</content>
