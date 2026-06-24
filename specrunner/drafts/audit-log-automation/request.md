# 監査ログのイベントハンドラ移行（承認関連）

## Meta

- **type**: refactor
- **slug**: audit-log-automation
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存パターンの適用。scope を限定し段階的に移行する → false -->

## 背景

監査ログの記録が複数のユースケースに手動でコピペされている。R01 で導入したドメインイベント基盤の同期ハンドラとして監査ログ記録を自動化する。

全ユースケースを一括移行するとイベント定義の不足（全遷移がカバーされていない）によりログの欠落リスクがあるため、まず承認関連の 5 ユースケースのみを対象とする。案件・契約・請求のユースケースは R01 でイベント定義を拡充した後に別リクエストで移行する。

## 現状コードの前提

- `src/application/usecases/createRequest.ts` — `auditLogRepository.create` を手動で呼び出し、metadata に templateId/templateName を含む
- `src/application/usecases/submitRequest.ts` — 同上
- `src/application/usecases/approveRequest.ts` — 同上。代理承認時は metadata に delegatedFrom を含む
- `src/application/usecases/rejectRequest.ts` — 同上。差し戻しパスで複数の audit log エントリを記録する
- `src/application/usecases/resubmitRequest.ts` — 同上。metadata に resetStepOrders を含む
- `src/domain/events/types.ts` — 承認関連 8 種のイベント型が定義済み（RequestCreated, RequestSubmitted, RequestApproved, RequestRejected, RequestRevised, RequestResubmitted, StepApproved, StepRejected）
- `src/domain/events/dispatcher.ts` — `dispatch(event)` で同期ハンドラを即座に実行。`AsyncLocalStorage` でリクエストスコープバッファを管理
- `src/infrastructure/handlers/index.ts` — `registerHandlers()` でハンドラ登録を集約

## 要件

1. **トランザクション伝播の実装**: `dispatcher.dispatch(event, tx?)` の第 2 引数にトランザクションオブジェクトを渡せるように拡張する。`tx` の型は `import("drizzle-orm/pg-core").PgTransaction<any, any, any> | undefined` とする。同期ハンドラのコールバックシグネチャを `(event, tx?) => void | Promise<void>` とする。R01 で実装済みの既存 `dispatch()` 呼び出し箇所にも `tx` 引数を追加する
2. **承認関連イベントの payload 拡充**: `src/domain/events/types.ts` の既存の承認関連イベント型の payload に、現在の手動呼び出しで metadata に含めている情報を追加する:
   - RequestCreated: templateId, templateName を payload に追加
   - RequestResubmitted: resetStepOrders を payload に追加
   - StepApproved: delegatedFrom（`string | null`）を payload に追加
   - StepRejected: comment（`string | null`）を payload に追加
   上記に合わせて、既存ユースケースの `dispatch()` 呼び出しで payload にこれらの値を渡すよう更新する
3. **監査ログハンドラの実装**: `src/infrastructure/handlers/auditLogHandler.ts` に同期ハンドラを実装する。承認関連 8 種のイベントに対する action, targetType, targetId, metadata の抽出ルールを定義する。action 名は現在の手動呼び出しで使われている値と完全一致させる（実装時に既存コードから grep で抽出する）
4. **承認関連 4 ユースケースの監査ログ呼び出し削除**: createRequest, submitRequest, approveRequest, resubmitRequest から手動の `auditLogRepository.create` 呼び出しを削除する。rejectRequest は差し戻しパスで複数の audit log エントリを記録する複雑なパターンがあるため、本リクエストでは手動呼び出しを維持する
5. **registerHandlers() の更新**: `src/infrastructure/handlers/index.ts` の `registerHandlers()` に監査ログハンドラを追加する

## スコープ外

- 案件・契約・請求ユースケースの監査ログ移行（イベント定義の拡充が先行して必要）
- 監査ログのスキーマ変更
- 監査ログ UI の変更
- dispatcher の AsyncLocalStorage 設計の変更

## 受け入れ基準

- [ ] `dispatcher.dispatch(event, tx)` がトランザクションオブジェクトを受け取れる
- [ ] 監査ログハンドラが同期ハンドラとして登録されている
- [ ] 承認関連 4 ユースケース（createRequest, submitRequest, approveRequest, resubmitRequest）で監査ログが自動記録される
- [ ] 該当 4 ユースケースから手動の auditLogRepository.create 呼び出しが削除されている
- [ ] rejectRequest の手動 auditLogRepository.create 呼び出しが維持されている
- [ ] 監査ログの action 名が変更前と完全一致する
- [ ] approveRequest の代理承認時に metadata.delegatedFrom が保持される
- [ ] createRequest の metadata に templateId/templateName が保持される
- [ ] 案件・契約・請求ユースケースの監査ログが引き続き手動で正常に記録される
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **承認関連のみ先行移行** — 全ユースケースの一括移行は、イベント定義の不足（scheduled→invoiced, declined→new 等の遷移にイベントがない）により監査ログの欠落リスクがある。承認関連は 8 種のイベントで全遷移がカバーされているため安全に移行できる。却下案: 全ユースケース一括 — 不足イベントの追加がスコープに含まれ肥大化する
2. **dispatch() の第 2 引数で tx を渡す** — ドメインイベントの型定義に tx を含めるのではなく、dispatch のオプション引数として渡す。理由: tx はインフラ層の関心事であり、ドメインイベントの型を汚さない
3. **既存の action 名を維持** — イベントの type（例: request.created）ではなく、既存の手動呼び出しで使われていた action 名を維持する。理由: 監査ログの検索・フィルタが既存の action 名に依存している可能性がある
