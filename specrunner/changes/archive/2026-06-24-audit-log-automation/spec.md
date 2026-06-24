# Spec: dispatcher の async 化と submitRequest の監査ログハンドラ移行

## Requirements

### Requirement: dispatch() が async でハンドラを await すること

EventDispatcher の `dispatch()` メソッドは `Promise<void>` を返し、sync ハンドラの呼び出しを `await` しなければならない (MUST)。options 引数を受け取り、sync ハンドラに伝播しなければならない (MUST)。

#### Scenario: sync ハンドラが await される

**Given** EventDispatcher に sync モードのハンドラが登録されている
**When** `dispatch(event, options)` が呼ばれる
**Then** ハンドラが `await` で呼ばれ、ハンドラの Promise が解決するまで dispatch は完了しない

#### Scenario: options が sync ハンドラに伝播する

**Given** EventDispatcher に sync モードのハンドラが登録されている
**When** `dispatch(event, { tx: someTransaction })` が呼ばれる
**Then** ハンドラの第 2 引数に `{ tx: someTransaction }` が渡される

### Requirement: EventHandler 型が options 引数を受け取れること

EventHandler 型は `(event: T, options?: DispatchOptions) => void | Promise<void>` でなければならない (MUST)。`DispatchOptions` は `{ tx?: unknown }` を持つ型でなければならない (MUST)。

#### Scenario: 既存ハンドラが options なしで動作する

**Given** 既存の webhookHandler が `(event: DomainEvent) => Promise<void>` のシグネチャで定義されている
**When** dispatch が options 付きで呼ばれる
**Then** webhookHandler は第 2 引数を無視し、従来通り動作する

### Requirement: 全 dispatch 呼び出しに await が追加されていること

全ユースケースの `dispatcher.dispatch(...)` 呼び出しに `await` が追加されなければならない (MUST)。

#### Scenario: await の追加が既存動作に影響しない

**Given** 既存の sync ハンドラが void を返す
**When** `await dispatcher.dispatch(event)` が呼ばれる
**Then** await は即座に解決し、既存のトランザクション処理に影響しない

### Requirement: submitRequest の dispatch 呼び出しに tx が渡されること

submitRequest 内の `dispatcher.dispatch(event, { tx })` 呼び出しにトランザクションオブジェクトが渡されなければならない (MUST)。

#### Scenario: tx 付きの dispatch が呼ばれる

**Given** submitRequest が `db.transaction(async (tx) => {...})` 内で dispatch を呼んでいる
**When** ステータス更新が成功する
**Then** `dispatcher.dispatch(event, { tx })` が呼ばれ、tx がハンドラに伝播する

### Requirement: 監査ログハンドラが request.submitted イベントを処理すること

`auditLogHandler` は `request.submitted` イベントに対して sync ハンドラとして登録されなければならない (MUST)。action: `request.submit`, targetType: `request`, targetId: `event.payload.requestId`, actorId: `event.actorId`, organizationId: `event.organizationId`, metadata: `null` で `auditLogRepository.create(data, tx as Transaction)` を呼ばなければならない (MUST)。

#### Scenario: submitRequest で監査ログが自動記録される

**Given** auditLogHandler が `request.submitted` イベントの sync ハンドラとして登録されている
**When** submitRequest が `dispatcher.dispatch(event, { tx })` を呼ぶ
**Then** auditLogHandler が呼ばれ、action=`request.submit` で auditLogRepository.create がトランザクション内で実行される

#### Scenario: tx が未提供の場合

**Given** auditLogHandler が `request.submitted` イベントの sync ハンドラとして登録されている
**When** dispatch が `options.tx` なしで呼ばれる
**Then** auditLogHandler は `auditLogRepository.create(data, undefined)` を呼び、トランザクション外で記録する

### Requirement: submitRequest から手動の auditLogRepository.create 呼び出しが削除されること

submitRequest の `auditLogRepository.create` 手動呼び出しと `auditLogRepository` の import は削除されなければならない (MUST)。

#### Scenario: submitRequest に auditLogRepository の直接呼び出しがない

**Given** auditLogHandler が監査ログを自動記録する
**When** submitRequest.ts のソースを確認する
**Then** `auditLogRepository.create` の直接呼び出しが存在しない

### Requirement: 他のユースケースの監査ログが引き続き動作すること

submitRequest 以外のユースケースで `auditLogRepository.create` を手動呼び出ししている箇所は変更しない (MUST NOT)。

#### Scenario: approveRequest の監査ログが引き続き動作する

**Given** approveRequest が `auditLogRepository.create` を手動呼び出ししている
**When** dispatch の async 化と await 追加が適用される
**Then** approveRequest の監査ログ記録は従来通り手動呼び出しで動作する

### Requirement: 既存の Webhook ハンドラが引き続き動作すること

webhookHandler は async ハンドラとして登録されており、dispatch の async 化による影響を受けない (SHALL NOT)。

#### Scenario: webhook 配信が引き続き動作する

**Given** webhookHandler が全イベントタイプの async ハンドラとして登録されている
**When** dispatch の async 化が適用される
**Then** async ハンドラは従来通り `flushAsync()` でバッファから発火し、動作に変更はない
