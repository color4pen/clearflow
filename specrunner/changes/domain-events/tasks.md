# Tasks: ドメインイベント基盤の導入

## T-01: ドメインイベント型の定義

- [ ] `src/domain/events/types.ts` を新規作成し、以下を定義する:
  - `BaseDomainEvent` 型 — 共通フィールド `type: string`, `organizationId: string`, `actorId: string`, `occurredAt: Date`。`occurredAt` は各ユースケースのトランザクションコールバック内でイベントを構築する時点で `new Date()` をセットする（DB が返すタイムスタンプではなく、アプリケーションサーバーの現在時刻を使用）
  - `InquiryConverted` — `type: "inquiry.converted"`, `payload: { inquiryId: string; dealId: string }`
  - `InquiryDeclined` — `type: "inquiry.declined"`, `payload: { inquiryId: string }`
  - `DealPhaseChanged` — `type: "deal.phase_changed"`, `payload: { dealId: string; fromPhase: DealPhase; toPhase: DealPhase }`
  - `DealWon` — `type: "deal.won"`, `payload: { dealId: string; fromPhase: DealPhase }`
  - `DealLost` — `type: "deal.lost"`, `payload: { dealId: string; fromPhase: DealPhase }`
  - `ContractCreated` — `type: "contract.created"`, `payload: { contractId: string; dealId: string; clientId: string }`
  - `ContractCompleted` — `type: "contract.completed"`, `payload: { contractId: string }`
  - `ContractCancelled` — `type: "contract.cancelled"`, `payload: { contractId: string }`
  - `InvoicePaid` — `type: "invoice.paid"`, `payload: { invoiceId: string; contractId: string }`
  - `InvoiceOverdue` — `type: "invoice.overdue"`, `payload: { invoiceId: string; contractId: string }`
  - 承認関連 8 種のドメインイベント型（既存 Webhook イベントに対応）:
    - `RequestCreated` — `type: "request.created"`, `payload: { requestId: string; requestTitle: string; status: string }`
    - `RequestSubmitted` — `type: "request.submitted"`, `payload: { requestId: string; requestTitle: string; status: string }`
    - `RequestApproved` — `type: "request.approved"`, `payload: { requestId: string; requestTitle: string; status: string }`
    - `RequestRejected` — `type: "request.rejected"`, `payload: { requestId: string; requestTitle: string; status: string }`
    - `RequestRevised` — `type: "request.revised"`, `payload: { requestId: string; requestTitle: string; status: string }`
    - `RequestResubmitted` — `type: "request.resubmitted"`, `payload: { requestId: string; requestTitle: string; status: string }`
    - `StepApproved` — `type: "step.approved"`, `payload: { requestId: string; requestTitle: string; status: string; metadata?: Record<string, unknown> }`
    - `StepRejected` — `type: "step.rejected"`, `payload: { requestId: string; requestTitle: string; status: string; metadata?: Record<string, unknown> }`
  - `DomainEvent` — 上記 18 型の discriminated union
  - `DomainEventType` — `DomainEvent["type"]` で導出される文字列リテラル union 型
- [ ] `src/domain/events/index.ts` をバレルファイルとして作成し、全型と `DomainEvent`, `DomainEventType` を re-export する
- [ ] `src/domain/events/types.ts` が ORM 非依存であることを確認（`@/infrastructure` への import がない）。`DealPhase` 等のドメイン型のみ import する

**Acceptance Criteria**:
- `src/domain/events/types.ts` に 18 種のイベント型と `DomainEvent` union 型が定義されている
- TypeScript の型チェックが通る
- domain 層内の他の型のみに依存し、infrastructure 層への依存がない

## T-02: イベントディスパッチャーの実装

- [ ] `src/domain/events/dispatcher.ts` を新規作成し、以下を実装する:
  - `EventHandler<T extends DomainEvent>` 型 — `(event: T) => void | Promise<void>`
  - `EventDispatcher` クラス:
    - `on<T extends DomainEvent>(eventType: T["type"], handler: EventHandler<T>, mode: "sync" | "async"): void` — ハンドラ登録メソッド
    - `dispatch(event: DomainEvent): void` — 同期ハンドラを即座に実行し、イベントを内部バッファに蓄積。同期ハンドラの例外は呼び出し元に伝播する
    - `flushAsync(): void` — バッファされた全イベントの非同期ハンドラを fire-and-forget で実行（`void Promise` + `console.error` でエラーログ）。実行後バッファをクリアする
    - `discardBuffer(): void` — バッファに蓄積されたイベントをハンドラ実行なしで破棄する。トランザクション失敗時（例外 catch または楽観的ロック null リターン）にユースケースから呼び出す。ハンドラ登録は変更しない
    - `reset(): void` — テスト用。全ハンドラ登録とバッファをクリアする
  - モジュールレベルのシングルトンインスタンス `dispatcher` を export
- [ ] `src/domain/events/index.ts` に `dispatcher` と `EventDispatcher` を追加 export する

**Acceptance Criteria**:
- `dispatcher.on("inquiry.converted", handler, "sync")` で同期ハンドラが登録できる
- `dispatcher.on("inquiry.converted", handler, "async")` で非同期ハンドラが登録できる
- `dispatcher.dispatch(event)` で同期ハンドラが即座に実行される
- 同期ハンドラの例外が `dispatch()` 呼び出し元に伝播する
- `dispatcher.flushAsync()` でバッファされたイベントの非同期ハンドラが実行される
- 非同期ハンドラの例外が `flushAsync()` 呼び出し元に伝播しない
- `dispatcher.discardBuffer()` でバッファがクリアされ、非同期ハンドラが実行されない
- `dispatcher.discardBuffer()` 呼び出し後にハンドラ登録が維持されている
- `dispatcher.reset()` で状態がクリアされる
- TypeScript の型チェックが通る

## T-03: WEBHOOK_EVENT_TYPES の拡張

- [ ] `src/domain/models/webhookEvent.ts` の `WEBHOOK_EVENT_TYPES` 配列に以下 10 種を追加する:
  - `"inquiry.converted"`
  - `"inquiry.declined"`
  - `"deal.phase_changed"`
  - `"deal.won"`
  - `"deal.lost"`
  - `"contract.created"`
  - `"contract.completed"`
  - `"contract.cancelled"`
  - `"invoice.paid"`
  - `"invoice.overdue"`
- [ ] `WebhookEventData` の拡張には既存フィールドの optional 化を使わず、以下の方針で型安全性を維持する:
  - 既存の `WebhookEventData` 型（`requestId: string`, `requestTitle: string` 等の必須フィールドを持つ承認系ペイロード型）はそのまま変更しない
  - 新規ドメインイベント用に別型 `DomainEventWebhookData` を定義する。フィールドは `inquiryId`, `dealId`, `contractId`, `invoiceId`, `fromPhase`, `toPhase`, `fromStatus`, `toStatus` 等をイベント種別に応じて必要なものだけ含める。各新規イベントのサブ型（`InquiryConvertedWebhookData`, `DealWonWebhookData` 等）を discriminated union で定義し、`DomainEventWebhookData` はその union とする
  - `WebhookPayload.data` の型を `WebhookEventData | DomainEventWebhookData` に更新する。これにより承認系イベントのハンドラは引き続き `requestId` / `requestTitle` の存在をコンパイラが保証でき、新規イベントのハンドラは `event.type` による絞り込みで対応するフィールドに型安全にアクセスできる

**Acceptance Criteria**:
- `WEBHOOK_EVENT_TYPES` が 18 要素を含む
- `WebhookEventType` 型に新しいイベント種別が含まれる
- 既存の `WebhookEventData` の `requestId` / `requestTitle` が optional 化されていない
- 承認系イベントのハンドラで `requestId` / `requestTitle` の必須性がコンパイラにより保証される
- 新規ドメインイベントのハンドラで `event.type` による型絞り込みが機能する
- TypeScript の型チェックが通る

## T-04: Webhook 配信イベントハンドラの実装

- [ ] `src/infrastructure/handlers/webhookHandler.ts` を新規作成し、以下を実装する:
  - ドメインイベントの `type` を `WebhookEventType` にマッピングする関数
  - D6 の方針に従い、承認系イベントと新規ドメインイベントで配信経路を分ける:
    - **承認系イベント（`request.*`, `step.*`）**: `deliverWebhookEvent` を呼び出す。`actorName` の DB ルックアップはこの関数内で行われ、ペイロードに含まれる（既存受信側との互換性維持）
    - **新規ドメインイベント（`inquiry.*`, `deal.*`, `contract.*`, `invoice.*`）**: `deliverWebhookEvent` を経由しない。`deliverSingleAttempt`（または等価な低レベル配信関数）を直接呼び出し、`actorName` の DB ルックアップを省略する。ペイロードはドメインイベントの `payload` フィールドから直接構築する
  - 全 18 種のドメインイベントタイプに対する非同期ハンドラを実装する
- [ ] `src/infrastructure/handlers/index.ts` を新規作成し、`registerHandlers()` 関数を定義する:
  - `dispatcher` をインポートし、`webhookHandler` の非同期ハンドラを全イベントタイプに登録する
  - ハンドラ登録時の `mode` は `"async"` を指定する

**Acceptance Criteria**:
- 全 18 種のドメインイベントに対して Webhook 配信ハンドラが登録される
- 承認系イベントのハンドラが `deliverWebhookEvent` 経由で `actorName` を解決し、ペイロードに含める
- 新規ドメインイベントのハンドラが `deliverWebhookEvent` を経由せず、`actorName` の DB ルックアップを行わない
- 新規イベントのペイロードが適切なエンティティ ID と状態情報を含む
- ハンドラは `"async"` モードで登録される
- TypeScript の型チェックが通る

## T-05: ハンドラ登録の初期化

- [ ] アプリケーション起動時に `registerHandlers()` が呼び出されるようにする。以下のいずれかの方式を採用する:
  - 方式 A: `src/instrumentation.ts` に `register` 関数を実装し、内部で `registerHandlers()` を呼び出す（Next.js の instrumentation hook）
  - 方式 B: `src/infrastructure/handlers/index.ts` のモジュール副作用として実行する（`registerHandlers()` をモジュールロード時に即座に呼び出す）
- [ ] ハンドラ登録が複数回呼ばれても問題ないよう冪等性を確保する。**モジュールスコープの `let isRegistered = false` フラグを使い、`registerHandlers()` の先頭で確認して既登録の場合は即リターンする方式を採用する**。`dispatcher.reset()` を使った再登録は採用しない（`reset()` はテスト専用であり、本番コードで呼び出すとテスト以外から登録された全ハンドラが消去されるため、将来の多モジュール構成で破壊的になる）

**Acceptance Criteria**:
- アプリケーション起動時に `registerHandlers()` が実行される
- 登録が複数回実行されてもハンドラが重複しない
- 冪等性の実現に `dispatcher.reset()` を使用していない
- TypeScript の型チェックが通る

## T-06: 新規ユースケースへのイベント発行の組み込み — updateInquiryStatus

- [ ] `src/application/usecases/updateInquiryStatus.ts` を修正:
  - `dispatcher` を `@/domain/events` から import する
  - `converted` 遷移のトランザクション内で、Deal 作成と status 更新の後に `dispatcher.dispatch()` を呼び出し、`InquiryConverted` イベントを発行する。`payload` には `inquiryId` と生成された `dealId` を含める。`occurredAt` は `new Date()` で設定する
  - `declined` 遷移のトランザクション内で `dispatcher.dispatch()` を呼び出し、`InquiryDeclined` イベントを発行する。`payload` には `inquiryId` を含める。`occurredAt` は `new Date()` で設定する
  - `db.transaction()` の呼び出しは try-catch で囲み、D3 のパターンに従い失敗パスを処理する:
    - 戻り値が `null`（楽観的ロック失敗）の場合: `dispatcher.discardBuffer()` を呼び出してから早期 return する
    - 例外が発生した場合: catch ブロックで `dispatcher.discardBuffer()` を呼び出してから例外を再スローする
  - トランザクション成功時（`null` でない結果を受け取った後）に `dispatcher.flushAsync()` を呼び出す
  - 既存の audit log 記録はそのまま維持する（監査ログ移行はスコープ外）

**Acceptance Criteria**:
- `converted` 遷移時に `InquiryConverted` イベントが dispatch される
- `declined` 遷移時に `InquiryDeclined` イベントが dispatch される
- イベント dispatch がトランザクション内で行われる
- `flushAsync()` がトランザクション成功後にのみ呼ばれる
- トランザクション失敗（null リターン・例外）時に `discardBuffer()` が呼ばれ、バッファが破棄される
- 既存の Deal 作成・audit log 記録の動作が変更されない
- TypeScript の型チェックが通る

## T-07: 新規ユースケースへのイベント発行の組み込み — updateDealPhase

- [ ] `src/application/usecases/updateDealPhase.ts` を修正:
  - `dispatcher` を `@/domain/events` から import する
  - トランザクション内で、フェーズ更新と audit log 作成の後に `dispatcher.dispatch()` を呼び出す。`occurredAt` は `new Date()` で設定する:
    - `newPhase === "won"` → `DealWon` イベント（`payload: { dealId, fromPhase: deal.phase }`）
    - `newPhase === "lost"` → `DealLost` イベント（`payload: { dealId, fromPhase: deal.phase }`）
    - それ以外 → `DealPhaseChanged` イベント（`payload: { dealId, fromPhase: deal.phase, toPhase: data.newPhase }`）
  - `db.transaction()` の呼び出しは try-catch で囲み、D3 のパターンに従い失敗パスを処理する:
    - 戻り値が `null`（楽観的ロック失敗）の場合: `dispatcher.discardBuffer()` を呼び出してから早期 return する
    - 例外が発生した場合: catch ブロックで `dispatcher.discardBuffer()` を呼び出してから例外を再スローする
  - トランザクション成功時に `dispatcher.flushAsync()` を呼び出す

**Acceptance Criteria**:
- `won` 遷移時に `DealWon` イベントが dispatch される
- `lost` 遷移時に `DealLost` イベントが dispatch される
- その他のフェーズ遷移時に `DealPhaseChanged` イベントが dispatch される
- イベントの `payload` に `fromPhase` と `toPhase`（DealPhaseChanged の場合）が含まれる
- トランザクション失敗（null リターン・例外）時に `discardBuffer()` が呼ばれ、バッファが破棄される
- 既存の audit log 記録の動作が変更されない
- TypeScript の型チェックが通る

## T-08: 新規ユースケースへのイベント発行の組み込み — createContract, updateContractStatus, updateInvoiceStatus

- [ ] `src/application/usecases/createContract.ts` を修正:
  - `dispatcher` を import し、トランザクション内で `ContractCreated` イベントを dispatch する。`payload` に `contractId`, `dealId`, `clientId` を含める。`occurredAt` は `new Date()` で設定する
  - `db.transaction()` の呼び出しは try-catch で囲み、D3 のパターンに従い失敗パスを処理する:
    - 例外が発生した場合: catch ブロックで `dispatcher.discardBuffer()` を呼び出してから例外を再スローする
  - トランザクション成功後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/updateContractStatus.ts` を修正:
  - `dispatcher` を import し、トランザクション内でステータスに応じたイベントを dispatch する。`occurredAt` は `new Date()` で設定する:
    - `newStatus === "completed"` → `ContractCompleted`（`payload: { contractId }`）
    - `newStatus === "cancelled"` → `ContractCancelled`（`payload: { contractId }`）
  - `db.transaction()` の呼び出しは try-catch で囲み、D3 のパターンに従い失敗パスを処理する:
    - 戻り値が `null`（楽観的ロック失敗）の場合: `dispatcher.discardBuffer()` を呼び出してから早期 return する
    - 例外が発生した場合: catch ブロックで `dispatcher.discardBuffer()` を呼び出してから例外を再スローする
  - トランザクション成功後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/updateInvoiceStatus.ts` を修正:
  - `dispatcher` を import し、トランザクション内でステータスに応じたイベントを dispatch する。`occurredAt` は `new Date()` で設定する:
    - `newStatus === "paid"` → `InvoicePaid`（`payload: { invoiceId, contractId: invoice.contractId }`）
    - `newStatus === "overdue"` → `InvoiceOverdue`（`payload: { invoiceId, contractId: invoice.contractId }`）
    - `newStatus === "invoiced"` → イベント発行なし（中間状態のため）
  - `db.transaction()` の呼び出しは try-catch で囲み、D3 のパターンに従い失敗パスを処理する:
    - 戻り値が `null`（楽観的ロック失敗）の場合: `dispatcher.discardBuffer()` を呼び出してから早期 return する
    - 例外が発生した場合: catch ブロックで `dispatcher.discardBuffer()` を呼び出してから例外を再スローする
  - トランザクション成功後に `dispatcher.flushAsync()` を呼び出す

**Acceptance Criteria**:
- `createContract` で `ContractCreated` イベントが dispatch される
- `updateContractStatus` で `completed` → `ContractCompleted`、`cancelled` → `ContractCancelled` が dispatch される
- `updateInvoiceStatus` で `paid` → `InvoicePaid`、`overdue` → `InvoiceOverdue` が dispatch される
- `invoiced` 遷移ではイベントが発行されない
- 全 3 ユースケースでトランザクション失敗（null リターン・例外）時に `discardBuffer()` が呼ばれ、バッファが破棄される
- 既存の audit log 記録の動作が変更されない
- TypeScript の型チェックが通る

## T-09: 既存承認ユースケースの Webhook 配信をイベントハンドラ経由に移行

- [ ] `src/application/usecases/createRequest.ts` を修正:
  - `deliverWebhookEvent` の import を削除し、`dispatcher` を `@/domain/events` から import する
  - `void deliverWebhookEvent(...)` 呼び出し（L84）を削除する
  - トランザクション内で `dispatcher.dispatch()` を呼び出し、`RequestCreated` イベントを発行する。`payload` に `requestId: result.id`, `requestTitle: result.title`, `status: "draft"` を含める。`occurredAt` は `new Date()` で設定する
  - `db.transaction()` の呼び出しは try-catch で囲み、D3 のパターンに従い失敗パスを処理する（例外時: catch で `dispatcher.discardBuffer()` を呼び出してから再スロー）
  - トランザクション成功後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/submitRequest.ts` を修正:
  - `deliverWebhookEvent` の import を削除し、`dispatcher` を import する
  - `void deliverWebhookEvent(...)` 呼び出し（L59）を削除する
  - トランザクション内で `RequestSubmitted` イベントを dispatch する。`occurredAt` は `new Date()` で設定する
  - `db.transaction()` の呼び出しは try-catch で囲み、D3 のパターンに従い失敗パスを処理する
  - トランザクション成功後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/approveRequest.ts` を修正:
  - `deliverWebhookEvent` の import を削除し、`dispatcher` を import する
  - 単一承認フロー: `void deliverWebhookEvent(...)` 呼び出し（L79）を削除。トランザクション内で `RequestApproved` イベントを dispatch（`occurredAt: new Date()`）
  - 多段階承認フロー: `void deliverWebhookEvent(...)` 呼び出し（L252, L270）を削除。トランザクション内で:
    - `StepApproved` イベントを dispatch（ステップ承認時、`occurredAt: new Date()`）
    - 全ステップ完了時は `RequestApproved` イベントも dispatch
  - `db.transaction()` の呼び出しは try-catch で囲み、D3 のパターンに従い失敗パスを処理する
  - トランザクション成功後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/rejectRequest.ts` を修正:
  - `deliverWebhookEvent` の import を削除し、`dispatcher` を import する
  - 差し戻しフロー: `void deliverWebhookEvent(...)` 呼び出し（L104, L115）を削除。トランザクション内で `RequestRevised` と `StepRejected` イベントを dispatch（`occurredAt: new Date()`）
  - 最終却下フロー: `void deliverWebhookEvent(...)` 呼び出し（L191）を削除。トランザクション内で `RequestRejected` イベントを dispatch（`occurredAt: new Date()`）
  - `db.transaction()` の呼び出しは try-catch で囲み、D3 のパターンに従い失敗パスを処理する
  - トランザクション成功後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/resubmitRequest.ts` を修正:
  - `deliverWebhookEvent` の import を削除し、`dispatcher` を import する
  - `void deliverWebhookEvent(...)` 呼び出し（L88）を削除。トランザクション内で `RequestResubmitted` イベントを dispatch（`occurredAt: new Date()`）
  - `db.transaction()` の呼び出しは try-catch で囲み、D3 のパターンに従い失敗パスを処理する
  - トランザクション成功後に `dispatcher.flushAsync()` を呼び出す

**Acceptance Criteria**:
- 5 つのユースケースから `deliverWebhookEvent` の直接 import と `void deliverWebhookEvent(...)` 呼び出しが全て除去されている
- 各ユースケースでトランザクション内で適切なドメインイベントが dispatch されている（`occurredAt: new Date()` 付き）
- 各ユースケースでトランザクション成功後にのみ `dispatcher.flushAsync()` が呼び出されている
- 各ユースケースでトランザクション失敗時（例外）に `dispatcher.discardBuffer()` が呼び出されている
- 発行されるイベントの `payload` が既存の Webhook 配信で渡されていたデータ（`requestId`, `requestTitle`, `status`, `metadata` 等）と同等の情報を含む
- `approveRequest` の多段階承認フローで `StepApproved` と条件付きの `RequestApproved` が正しく dispatch される
- `rejectRequest` の差し戻しフローで `RequestRevised` と `StepRejected` の両方が dispatch される
- TypeScript の型チェックが通る

## T-10: 既存テストの更新

- [ ] `src/__tests__/usecases/webhookWorkflow.test.ts` を更新する:
  - `WEBHOOK_EVENT_TYPES` の要素数検証を 8 → 18 に変更する
  - 承認関連ユースケースの `deliverWebhookEvent` 呼び出し検証を、`dispatcher.dispatch` / `dispatcher.flushAsync` の呼び出し検証に置き換える
  - `void deliverWebhookEvent` の存在チェックを、`dispatcher.dispatch` と `dispatcher.flushAsync` の存在チェックに変更する
  - トランザクション外呼び出しの検証ロジックを、`dispatch` がトランザクション内、`flushAsync` がトランザクション外で呼ばれることの検証に更新する
  - 新しいイベント種別（`inquiry.converted` 等 10 種）が `WEBHOOK_EVENT_TYPES` に含まれることを検証するテストを追加する
- [ ] `src/__tests__/usecases/webhookRetryAuditExport.test.ts` の `deliverWebhookEvent` 関連テストを確認し、必要に応じて更新する（`deliverWebhookEvent` 関数自体は存続するため、export の確認テストは影響を受けない可能性が高い）
- [ ] 他の既存テストファイルが影響を受けないことを確認する（`approvalDeadline.test.ts` の `deliverWebhookEvent` モック等）

**Acceptance Criteria**:
- `bun test` が全テスト green で完了する
- 新しい Webhook イベント種別の存在が検証されている
- 承認関連ユースケースのイベント配信パターン（ディスパッチャー経由）が検証されている

## T-11: ドメインイベント基盤のテスト追加

- [ ] `src/__tests__/domain/domainEvents.test.ts` を新規作成し、以下をテストする:
  - `EventDispatcher` の同期ハンドラが `dispatch()` で即座に実行されること
  - `EventDispatcher` の非同期ハンドラが `dispatch()` では実行されず `flushAsync()` で実行されること
  - 同期ハンドラの例外が `dispatch()` 呼び出し元に伝播すること
  - 非同期ハンドラの例外が `flushAsync()` 呼び出し元に伝播しないこと
  - `discardBuffer()` 呼び出し後に `flushAsync()` を呼んでも非同期ハンドラが実行されないこと（バッファが空になっていること）
  - `discardBuffer()` 呼び出し後もハンドラ登録が維持されており、次回 `dispatch()` + `flushAsync()` で正常に実行されること
  - `reset()` でハンドラとバッファがクリアされること
  - 複数のハンドラが同一イベントに登録できること
  - 異なるイベントタイプのハンドラが混在して正しく動作すること
- [ ] 新規ユースケース（`updateInquiryStatus`, `updateDealPhase`, `createContract`, `updateContractStatus`, `updateInvoiceStatus`）でドメインイベントが発行されることを静的コード解析で検証するテストを追加する（既存の `webhookWorkflow.test.ts` のパターンに準拠）

**Acceptance Criteria**:
- `EventDispatcher` の同期/非同期ハンドラの動作がテストされている
- 新規ユースケースでのイベント発行がテストされている
- `bun test` が全テスト green で完了する

## T-12: ビルド検証と型チェック

- [ ] `bun run build` が成功することを確認する
- [ ] `bun test` が全テスト green で完了することを確認する
- [ ] `src/domain/events/` 配下に `@/infrastructure` への import がないことを確認する
- [ ] 5 つの承認関連ユースケースに `deliverWebhookEvent` の直接呼び出しが残っていないことを確認する
- [ ] `bun run lint` がエラーなしで通ることを確認する

**Acceptance Criteria**:
- `bun run build` が exit code 0 で完了する
- `bun test` が exit code 0 で完了する
- `bun run lint` が exit code 0 で完了する
- `grep -r "from.*@/infrastructure" src/domain/events/` の結果が空である
- `grep -r "deliverWebhookEvent" src/application/usecases/` の結果が空である
