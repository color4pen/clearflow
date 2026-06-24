# Tasks: dispatcher の async 化と submitRequest の監査ログハンドラ移行

## T-01: EventHandler 型と dispatch() の async 化

- [ ] `src/domain/events/dispatcher.ts` に `DispatchOptions` 型を追加: `export type DispatchOptions = { tx?: unknown };`
- [ ] `EventHandler<T>` 型を `(event: T, options?: DispatchOptions) => void | Promise<void>` に変更
- [ ] `dispatch(event: DomainEvent): void` を `async dispatch(event: DomainEvent, options?: DispatchOptions): Promise<void>` に変更
- [ ] sync ハンドラ呼び出し（L43）を `await entry.handler(event, options)` に変更
- [ ] `src/domain/events/index.ts` の export に `DispatchOptions` を追加

**Acceptance Criteria**:
- `dispatch()` の戻り値が `Promise<void>` になっている
- `EventHandler` 型が `(event: T, options?: DispatchOptions) => void | Promise<void>` である
- `DispatchOptions` が `{ tx?: unknown }` を持つ型としてエクスポートされている
- sync ハンドラ呼び出しで `options` が第 2 引数として渡されている

## T-02: 全 dispatch 呼び出しに await を追加

以下の 22 箇所すべてに `await` を追加する:

- [ ] `src/application/usecases/approveRequest.ts` — 5 箇所（L78, L103, L236, L280, L305）
- [ ] `src/application/usecases/rejectRequest.ts` — 3 箇所（L102, L114, L192）
- [ ] `src/application/usecases/updateDealPhase.ts` — 3 箇所（L57, L68, L79）
- [ ] `src/application/usecases/updateInquiryStatus.ts` — 3 箇所（L148, L221, L276）
- [ ] `src/application/usecases/updateContractStatus.ts` — 2 箇所（L58, L66）
- [ ] `src/application/usecases/updateInvoiceStatus.ts` — 2 箇所（L62, L73）
- [ ] `src/application/usecases/submitRequest.ts` — 1 箇所（L57）
- [ ] `src/application/usecases/createRequest.ts` — 1 箇所（L82）
- [ ] `src/application/usecases/createContract.ts` — 1 箇所（L80）
- [ ] `src/application/usecases/resubmitRequest.ts` — 1 箇所（L86）

変更パターン: `dispatcher.dispatch({` → `await dispatcher.dispatch({`
（approveRequest L103, L305 は `dispatcher.dispatch(approvalCompletedEvent)` → `await dispatcher.dispatch(approvalCompletedEvent)`）

**Acceptance Criteria**:
- 全 22 箇所の dispatch 呼び出しに `await` が追加されている
- `grep -rn 'dispatcher\.dispatch(' src/application/usecases/` の結果すべてが `await dispatcher.dispatch` である
- `bun run typecheck` がエラーなしで通る

## T-03: submitRequest の dispatch 呼び出しに tx を追加

- [ ] `src/application/usecases/submitRequest.ts` L57 の dispatch 呼び出しに `{ tx }` オプションを追加: `await dispatcher.dispatch({...}, { tx })`

**Acceptance Criteria**:
- submitRequest の dispatch 呼び出しが `await dispatcher.dispatch(event, { tx })` の形式になっている
- 他のユースケースの dispatch 呼び出しには `{ tx }` が追加されていない

## T-04: 監査ログハンドラの実装

- [ ] `src/infrastructure/handlers/auditLogHandler.ts` を新規作成
- [ ] `auditLogRepository` を `@/infrastructure/repositories` から import
- [ ] `Transaction` 型を `@/infrastructure/db` から import
- [ ] `DomainEvent` と `DispatchOptions` を `@/domain/events` から import
- [ ] `handleAuditLog` 関数を export: `async function handleAuditLog(event: DomainEvent, options?: DispatchOptions): Promise<void>`
- [ ] `event.type === "request.submitted"` のみ処理する switch/if 文を実装
- [ ] auditLogRepository.create の呼び出しデータ: `{ action: "request.submit", targetType: "request", targetId: event.payload.requestId, actorId: event.actorId, organizationId: event.organizationId, metadata: null }`
- [ ] tx は `options?.tx as Transaction | undefined` で取得し、`auditLogRepository.create(data, tx)` に渡す

**Acceptance Criteria**:
- `src/infrastructure/handlers/auditLogHandler.ts` が存在する
- `request.submitted` イベントに対して action=`request.submit` で監査ログを記録する
- tx をオプショナルに受け取り、`auditLogRepository.create` に渡す
- `request.submitted` 以外のイベントタイプでは何もしない

## T-05: registerHandlers の更新

- [ ] `src/infrastructure/handlers/index.ts` に `handleAuditLog` を import
- [ ] `registerHandlers()` 内で `dispatcher.on("request.submitted", handleAuditLog, "sync")` を追加
- [ ] 既存の webhook ハンドラ登録・approvalCompleted ハンドラ登録は変更しない

**Acceptance Criteria**:
- `handleAuditLog` が `request.submitted` イベントの sync ハンドラとして登録されている
- 既存のハンドラ登録に変更がない
- audit ログハンドラは sync モードで登録されている（webhook の async モードではない）

## T-06: submitRequest から手動の auditLogRepository 呼び出しを削除

- [ ] `src/application/usecases/submitRequest.ts` から L46-55 の `auditLogRepository.create(...)` ブロックを削除
- [ ] L1 の import から `auditLogRepository` を削除: `import { requestRepository, auditLogRepository } from` → `import { requestRepository } from`
- [ ] 削除後も dispatch 呼び出し、db.transaction、flushAsync の順序が正しいことを確認

**Acceptance Criteria**:
- submitRequest.ts に `auditLogRepository.create` の直接呼び出しが存在しない
- submitRequest.ts に `auditLogRepository` の import が存在しない
- dispatch → flushAsync の順序が維持されている

## T-07: テストの更新

- [ ] `src/__tests__/usecases/requestWorkflow.test.ts` TC-011 を更新: submitRequest.ts のソースから `auditLogRepository` を検証する代わりに、`auditLogHandler.ts` のソースから `request.submit` の処理を検証する形に変更する。あるいは、submitRequest.ts が `dispatcher.dispatch` を呼び出すことと、auditLogHandler.ts が `request.submit` アクションで `auditLogRepository.create` を呼び出すことをそれぞれ検証する
- [ ] submitRequest.ts のソースに `request.submit` 文字列が含まれなくなる場合、TC-011 の `expect(src).toContain("request.submit")` も更新する（dispatch イベントの type は `request.submitted` であり `request.submit` ではないため、手動呼び出し削除後に失敗する可能性がある）
- [ ] TC-011 が `targetType` を検証している部分: submitRequest.ts には dispatch イベントで `targetType` を含まないため、ハンドラ側の検証に切り替えるか削除する
- [ ] 他のテスト（TC-012, TC-013 等）は変更不要であることを確認する（approveRequest, rejectRequest は手動呼び出しを維持するため）

**Acceptance Criteria**:
- TC-011 が submitRequest の監査ログがハンドラ経由で記録されることを正しく検証している
- TC-012, TC-013 は変更されていない
- `bun test` が全テスト green

## T-08: 最終検証

- [ ] `bun run typecheck` がエラーなしで通ることを確認
- [ ] `bun test` が全テスト green であることを確認
- [ ] `grep -rn 'dispatcher\.dispatch(' src/application/usecases/` で全箇所が `await` 付きであることを確認
- [ ] submitRequest.ts に `auditLogRepository` が残っていないことを確認
- [ ] 他のユースケース（approveRequest, rejectRequest 等）の `auditLogRepository.create` 手動呼び出しが残っていることを確認

**Acceptance Criteria**:
- `typecheck && test` が green
- submitRequest のみハンドラ移行済み、他は手動呼び出しを維持
- 全 dispatch 呼び出しに await が追加されている
