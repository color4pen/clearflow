# 監査ログのイベントハンドラ基盤と submitRequest の移行

## Meta

- **type**: refactor
- **slug**: audit-log-automation
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 基盤導入だが dispatcher への引数追加のみ。最小スコープ → false -->

## 背景

監査ログの記録が複数のユースケースに手動でコピペされている。R01 で導入したドメインイベント基盤の同期ハンドラとして監査ログ記録を自動化する基盤を作り、最も単純な submitRequest を 1 件移行して動作を検証する。

createRequest や resubmitRequest はイベントの payload に metadata（templateId, resetStepOrders 等）が不足しているため、イベント型の拡充を先行して行う必要がある。本リクエストでは dispatch の tx 伝播基盤と、metadata が不要な submitRequest のみを対象とする。

## 現状コードの前提

- `src/application/usecases/submitRequest.ts` — `auditLogRepository.create` を手動呼び出し。action: "request.submit", metadata: なし（requestId と title のみ）
- `src/domain/events/dispatcher.ts` — `dispatch(event)` は tx 引数を受け付けない
- `src/domain/events/types.ts` — RequestSubmitted イベント型が定義済み。payload: requestId, requestTitle
- `src/infrastructure/handlers/index.ts` — `registerHandlers()` でハンドラ登録を集約。現在は webhookHandler のみ

## 要件

1. **dispatcher.dispatch に tx 引数を追加**: `dispatch(event, options?)` の第 2 引数でオプションオブジェクト `{ tx?: Transaction }` を受け取れるようにする。Transaction 型は `src/infrastructure/db.ts` から import するが、dispatcher のインターフェースは `unknown` 型で受け取り、ハンドラ側でキャストする（ドメイン層に drizzle の型を直接 import しない）。同期ハンドラのコールバックシグネチャを `(event, options?: { tx?: unknown }) => void` とする。既存の dispatch 呼び出しは options なしで引き続き動作する
2. **submitRequest の dispatch 呼び出しに tx を追加**: submitRequest の既存 `dispatch()` 呼び出しに `{ tx }` を追加する
3. **監査ログハンドラの実装**: `src/infrastructure/handlers/auditLogHandler.ts` に同期ハンドラを実装する。RequestSubmitted イベントのみを処理する。action: "request.submit", targetType: "request", targetId: payload.requestId。metadata は null（現行の submitRequest は metadata を渡さず repository 内で null にセットされるため、同じ挙動を再現する）
4. **registerHandlers の更新**: `src/infrastructure/handlers/index.ts` に監査ログハンドラを登録する
5. **submitRequest の手動呼び出し削除**: submitRequest から `auditLogRepository.create` の手動呼び出しを削除する
6. **既存テストの更新**: `src/__tests__/usecases/webhookWorkflow.test.ts` 等に submitRequest のソースコード内に `auditLogRepository` 文字列が含まれることを検証するスタティック解析テスト（TC-011 相当）がある場合、手動呼び出し削除に合わせてテストを更新する

## スコープ外

- createRequest の移行（payload に templateId/templateName が必要）
- resubmitRequest の移行（payload に resetStepOrders が必要）
- approveRequest / rejectRequest の移行
- 案件・契約・請求ユースケースの移行
- イベント payload の拡充

## 受け入れ基準

- [ ] `dispatcher.dispatch(event, { tx })` がトランザクションオブジェクトを受け取れる
- [ ] 監査ログハンドラが同期ハンドラとして登録されている
- [ ] submitRequest で監査ログが自動記録される（action: "request.submit"）
- [ ] submitRequest から手動の auditLogRepository.create 呼び出しが削除されている
- [ ] 他の全ユースケースの監査ログが引き続き手動で正常に動作する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **submitRequest のみ移行** — metadata が不要な最も単純なケース。基盤（dispatch の tx 伝播 + 監査ログハンドラの登録パターン）の動作検証に十分。他のユースケースはイベント payload の拡充後に個別に移行する。却下案: 3 ユースケース一括 — metadata 不足で spec-review が繰り返し escalation する
2. **dispatch の options を unknown 型で受ける** — dispatcher はドメイン層に配置されているため、drizzle の Transaction 型を直接 import するとアーキテクチャ違反になる。`unknown` 型で受け取り、ハンドラ（インフラ層）側でキャストする。却下案: dispatcher をインフラ層に移動 — イベント定義と dispatcher の分離が崩れる
