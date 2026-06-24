# Tasks: ドメインイベント基盤の導入

## T-01: ドメインイベント型の定義

- [ ] `src/domain/events/types.ts` を新規作成し、以下を定義する:
  - `BaseDomainEvent` 型 — 共通フィールド `type: string`, `organizationId: string`, `actorId: string`, `occurredAt: Date`
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
- [ ] `WebhookEventData` 型を拡張して新イベント種別のペイロードに対応する。既存フィールド（`requestId`, `requestTitle`）を optional にし、新しいフィールド（`inquiryId`, `dealId`, `contractId`, `invoiceId`, `fromPhase`, `toPhase`, `fromStatus`, `toStatus` 等）を optional で追加する。または `Record<string, unknown>` と union するなど、後方互換を保ちつつ新イベントのデータを含められるようにする

**Acceptance Criteria**:
- `WEBHOOK_EVENT_TYPES` が 18 要素を含む
- `WebhookEventType` 型に新しいイベント種別が含まれる
- 既存の `WebhookPayload` 型が後方互換を維持する
- TypeScript の型チェックが通る

## T-04: Webhook 配信イベントハンドラの実装

- [ ] `src/infrastructure/handlers/webhookHandler.ts` を新規作成し、以下を実装する:
  - ドメインイベントの `type` を `WebhookEventType` にマッピングする関数
  - ドメインイベントの `payload` を `WebhookEventData` 形式に変換する関数。承認関連イベント（`request.*`, `step.*`）は既存の `WebhookEventData` 構造を維持する。新規イベント（`inquiry.*`, `deal.*`, `contract.*`, `invoice.*`）は対応するエンティティ ID と状態情報をマッピングする
  - 全ドメインイベントタイプに対する非同期ハンドラを実装。内部で `deliverWebhookEvent` を呼び出す
- [ ] `src/infrastructure/handlers/index.ts` を新規作成し、`registerHandlers()` 関数を定義する:
  - `dispatcher` をインポートし、`webhookHandler` の非同期ハンドラを全イベントタイプに登録する
  - ハンドラ登録時の `mode` は `"async"` を指定する

**Acceptance Criteria**:
- 全 18 種のドメインイベントに対して Webhook 配信ハンドラが登録される
- 承認関連イベントのペイロードが既存の `WebhookEventData` と同じ構造（`requestId`, `requestTitle`, `actorId`, `actorName` は `deliverWebhookEvent` 内で解決）を維持する
- 新規イベントのペイロードが適切なエンティティ ID と状態情報を含む
- ハンドラは `"async"` モードで登録される
- TypeScript の型チェックが通る

## T-05: ハンドラ登録の初期化

- [ ] アプリケーション起動時に `registerHandlers()` が呼び出されるようにする。以下のいずれかの方式を採用する:
  - 方式 A: `src/instrumentation.ts` に `register` 関数を実装し、内部で `registerHandlers()` を呼び出す（Next.js の instrumentation hook）
  - 方式 B: `src/infrastructure/handlers/index.ts` のモジュール副作用として実行する（`registerHandlers()` をモジュールロード時に即座に呼び出す）
- [ ] ハンドラ登録が複数回呼ばれても問題ないよう冪等性を確保する（登録済みフラグ or ディスパッチャーの `reset()` + 再登録）

**Acceptance Criteria**:
- アプリケーション起動時に `registerHandlers()` が実行される
- 登録が複数回実行されてもハンドラが重複しない
- TypeScript の型チェックが通る

## T-06: 新規ユースケースへのイベント発行の組み込み — updateInquiryStatus

- [ ] `src/application/usecases/updateInquiryStatus.ts` を修正:
  - `dispatcher` を `@/domain/events` から import する
  - `converted` 遷移のトランザクション内で、Deal 作成と status 更新の後に `dispatcher.dispatch()` を呼び出し、`InquiryConverted` イベントを発行する。`payload` には `inquiryId` と生成された `dealId` を含める
  - `declined` 遷移のトランザクション内で `dispatcher.dispatch()` を呼び出し、`InquiryDeclined` イベントを発行する。`payload` には `inquiryId` を含める
  - 各トランザクションコミット後（`db.transaction()` の戻り値取得後）に `dispatcher.flushAsync()` を呼び出す
  - 既存の audit log 記録はそのまま維持する（監査ログ移行はスコープ外）

**Acceptance Criteria**:
- `converted` 遷移時に `InquiryConverted` イベントが dispatch される
- `declined` 遷移時に `InquiryDeclined` イベントが dispatch される
- イベント dispatch がトランザクション内で行われる
- `flushAsync()` がトランザクション後に呼ばれる
- 既存の Deal 作成・audit log 記録の動作が変更されない
- TypeScript の型チェックが通る

## T-07: 新規ユースケースへのイベント発行の組み込み — updateDealPhase

- [ ] `src/application/usecases/updateDealPhase.ts` を修正:
  - `dispatcher` を `@/domain/events` から import する
  - トランザクション内で、フェーズ更新と audit log 作成の後に `dispatcher.dispatch()` を呼び出す:
    - `newPhase === "won"` → `DealWon` イベント（`payload: { dealId, fromPhase: deal.phase }`）
    - `newPhase === "lost"` → `DealLost` イベント（`payload: { dealId, fromPhase: deal.phase }`）
    - それ以外 → `DealPhaseChanged` イベント（`payload: { dealId, fromPhase: deal.phase, toPhase: data.newPhase }`）
  - トランザクションコミット後に `dispatcher.flushAsync()` を呼び出す

**Acceptance Criteria**:
- `won` 遷移時に `DealWon` イベントが dispatch される
- `lost` 遷移時に `DealLost` イベントが dispatch される
- その他のフェーズ遷移時に `DealPhaseChanged` イベントが dispatch される
- イベントの `payload` に `fromPhase` と `toPhase`（DealPhaseChanged の場合）が含まれる
- 既存の audit log 記録の動作が変更されない
- TypeScript の型チェックが通る

## T-08: 新規ユースケースへのイベント発行の組み込み — createContract, updateContractStatus, updateInvoiceStatus

- [ ] `src/application/usecases/createContract.ts` を修正:
  - `dispatcher` を import し、トランザクション内で `ContractCreated` イベントを dispatch する。`payload` に `contractId`, `dealId`, `clientId` を含める
  - トランザクションコミット後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/updateContractStatus.ts` を修正:
  - `dispatcher` を import し、トランザクション内でステータスに応じたイベントを dispatch する:
    - `newStatus === "completed"` → `ContractCompleted`（`payload: { contractId }`）
    - `newStatus === "cancelled"` → `ContractCancelled`（`payload: { contractId }`）
  - トランザクションコミット後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/updateInvoiceStatus.ts` を修正:
  - `dispatcher` を import し、トランザクション内でステータスに応じたイベントを dispatch する:
    - `newStatus === "paid"` → `InvoicePaid`（`payload: { invoiceId, contractId: invoice.contractId }`）
    - `newStatus === "overdue"` → `InvoiceOverdue`（`payload: { invoiceId, contractId: invoice.contractId }`）
    - `newStatus === "invoiced"` → イベント発行なし（中間状態のため）
  - トランザクションコミット後に `dispatcher.flushAsync()` を呼び出す

**Acceptance Criteria**:
- `createContract` で `ContractCreated` イベントが dispatch される
- `updateContractStatus` で `completed` → `ContractCompleted`、`cancelled` → `ContractCancelled` が dispatch される
- `updateInvoiceStatus` で `paid` → `InvoicePaid`、`overdue` → `InvoiceOverdue` が dispatch される
- `invoiced` 遷移ではイベントが発行されない
- 既存の audit log 記録の動作が変更されない
- TypeScript の型チェックが通る

## T-09: 既存承認ユースケースの Webhook 配信をイベントハンドラ経由に移行

- [ ] `src/application/usecases/createRequest.ts` を修正:
  - `deliverWebhookEvent` の import を削除し、`dispatcher` を `@/domain/events` から import する
  - `void deliverWebhookEvent(...)` 呼び出し（L84）を削除する
  - トランザクション内で `dispatcher.dispatch()` を呼び出し、`RequestCreated` イベントを発行する。`payload` に `requestId: result.id`, `requestTitle: result.title`, `status: "draft"` を含める
  - トランザクションコミット後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/submitRequest.ts` を修正:
  - `deliverWebhookEvent` の import を削除し、`dispatcher` を import する
  - `void deliverWebhookEvent(...)` 呼び出し（L59）を削除する
  - トランザクション内で `RequestSubmitted` イベントを dispatch する
  - トランザクションコミット後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/approveRequest.ts` を修正:
  - `deliverWebhookEvent` の import を削除し、`dispatcher` を import する
  - 単一承認フロー: `void deliverWebhookEvent(...)` 呼び出し（L79）を削除。トランザクション内で `RequestApproved` イベントを dispatch。トランザクション後に `flushAsync()` を呼び出す
  - 多段階承認フロー: `void deliverWebhookEvent(...)` 呼び出し（L252, L270）を削除。トランザクション内で:
    - `StepApproved` イベントを dispatch（ステップ承認時）
    - 全ステップ完了時は `RequestApproved` イベントも dispatch
  - トランザクションコミット後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/rejectRequest.ts` を修正:
  - `deliverWebhookEvent` の import を削除し、`dispatcher` を import する
  - 差し戻しフロー: `void deliverWebhookEvent(...)` 呼び出し（L104, L115）を削除。トランザクション内で `RequestRevised` と `StepRejected` イベントを dispatch
  - 最終却下フロー: `void deliverWebhookEvent(...)` 呼び出し（L191）を削除。トランザクション内で `RequestRejected` イベントを dispatch
  - トランザクションコミット後に `dispatcher.flushAsync()` を呼び出す
- [ ] `src/application/usecases/resubmitRequest.ts` を修正:
  - `deliverWebhookEvent` の import を削除し、`dispatcher` を import する
  - `void deliverWebhookEvent(...)` 呼び出し（L88）を削除。トランザクション内で `RequestResubmitted` イベントを dispatch
  - トランザクションコミット後に `dispatcher.flushAsync()` を呼び出す

**Acceptance Criteria**:
- 5 つのユースケースから `deliverWebhookEvent` の直接 import と `void deliverWebhookEvent(...)` 呼び出しが全て除去されている
- 各ユースケースでトランザクション内で適切なドメインイベントが dispatch されている
- 各ユースケースでトランザクションコミット後に `dispatcher.flushAsync()` が呼び出されている
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
