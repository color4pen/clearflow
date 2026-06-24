# Spec: ドメインイベント基盤の導入

## Requirements

### Requirement: ドメインイベント型は discriminated union として定義される

`src/domain/events/` に 10 種のドメインイベント型が discriminated union として定義される。各イベントは共通のベースフィールド（`type`, `organizationId`, `actorId`, `occurredAt`）とイベント固有の `payload` を持つ。`DomainEvent` union 型により型安全なハンドリングが可能でなければならない（MUST）。

#### Scenario: 全 10 種のドメインイベント型が定義されている

**Given** `src/domain/events/` ディレクトリが存在する
**When** ドメインイベントの型定義を確認する
**Then** `InquiryConverted`, `InquiryDeclined`, `DealPhaseChanged`, `DealWon`, `DealLost`, `ContractCreated`, `ContractCompleted`, `ContractCancelled`, `InvoicePaid`, `InvoiceOverdue` の 10 型が定義されている

#### Scenario: ドメインイベント型が discriminated union である

**Given** `DomainEvent` 型が定義されている
**When** ハンドラ内で `event.type === "inquiry.converted"` と判別する
**Then** TypeScript の型推論により `event` が `InquiryConverted` 型に絞り込まれる

### Requirement: イベントディスパッチャーは同期ハンドラと非同期ハンドラを区別して実行する

ディスパッチャーは `dispatch()` で同期ハンドラを即座に実行し、イベントをバッファに蓄積する。`flushAsync()` でバッファされたイベントの非同期ハンドラを実行する。同期ハンドラと非同期ハンドラの登録は `on()` メソッドで `mode: "sync" | "async"` を指定する。ディスパッチャーは同期ハンドラの例外を呼び出し元に伝播させ、非同期ハンドラの例外は呼び出し元に伝播させてはならない（MUST NOT）。

#### Scenario: 同期ハンドラが dispatch 呼び出し時に実行される

**Given** `"inquiry.converted"` に同期ハンドラが登録されている
**When** `dispatcher.dispatch(inquiryConvertedEvent)` を呼び出す
**Then** 同期ハンドラが即座に実行される

#### Scenario: 同期ハンドラの例外が呼び出し元に伝播する

**Given** `"inquiry.converted"` に例外を投げる同期ハンドラが登録されている
**When** `dispatcher.dispatch(inquiryConvertedEvent)` を呼び出す
**Then** 例外が呼び出し元（トランザクション内）に伝播し、トランザクションがロールバックされる

#### Scenario: 非同期ハンドラが flushAsync 呼び出し時に実行される

**Given** `"inquiry.converted"` に非同期ハンドラが登録されている
**And** `dispatch(inquiryConvertedEvent)` が呼び出し済み
**When** `dispatcher.flushAsync()` を呼び出す
**Then** バッファされたイベントの非同期ハンドラが実行される

#### Scenario: 非同期ハンドラの例外が呼び出し元に伝播しない

**Given** `"inquiry.converted"` に例外を投げる非同期ハンドラが登録されている
**And** `dispatch(inquiryConvertedEvent)` が呼び出し済み
**When** `dispatcher.flushAsync()` を呼び出す
**Then** 例外はログ出力されるが呼び出し元には伝播しない

### Requirement: updateInquiryStatus で converted 遷移時に InquiryConverted イベントが発行される

`updateInquiryStatus` ユースケースで引合が `converted` に遷移した場合、`InquiryConverted` ドメインイベントがトランザクション内で dispatch されなければならない（MUST）。トランザクションコミット後に `flushAsync()` で非同期ハンドラが実行される。

#### Scenario: 引合の案件化で InquiryConverted が発行される

**Given** ステータスが `new` の引合が存在する
**When** `updateInquiryStatus` で `newStatus: "converted"` を指定する
**Then** トランザクション内で `InquiryConverted` イベントが dispatch される
**And** イベントの `payload` に `inquiryId` と生成された `dealId` が含まれる

#### Scenario: 引合の見送りで InquiryDeclined が発行される

**Given** ステータスが `new` の引合が存在する
**When** `updateInquiryStatus` で `newStatus: "declined"` を指定する
**Then** トランザクション内で `InquiryDeclined` イベントが dispatch される

### Requirement: updateDealPhase でフェーズ遷移時に適切なイベントが発行される

`updateDealPhase` ユースケースでフェーズが変更された場合、遷移先に応じたドメインイベントがトランザクション内で dispatch されなければならない（MUST）。won → `DealWon`、lost → `DealLost`、その他 → `DealPhaseChanged`。

#### Scenario: 案件の受注で DealWon が発行される

**Given** フェーズが `negotiation` の案件が存在する
**When** `updateDealPhase` で `newPhase: "won"` を指定する
**Then** トランザクション内で `DealWon` イベントが dispatch される
**And** イベントの `payload` に `dealId` と `fromPhase: "negotiation"` が含まれる

#### Scenario: 案件の失注で DealLost が発行される

**Given** フェーズが `negotiation` の案件が存在する
**When** `updateDealPhase` で `newPhase: "lost"` を指定する
**Then** トランザクション内で `DealLost` イベントが dispatch される

#### Scenario: 案件のフェーズ変更で DealPhaseChanged が発行される

**Given** フェーズが `proposal_prep` の案件が存在する
**When** `updateDealPhase` で `newPhase: "proposed"` を指定する
**Then** トランザクション内で `DealPhaseChanged` イベントが dispatch される
**And** イベントの `payload` に `dealId`, `fromPhase`, `toPhase` が含まれる

### Requirement: 契約・請求のユースケースで適切なイベントが発行される

各ユースケースは対応するドメインイベントをトランザクション内で dispatch しなければならない（MUST）。`createContract` で `ContractCreated`、`updateContractStatus` で `ContractCompleted` / `ContractCancelled`、`updateInvoiceStatus` で `InvoicePaid` / `InvoiceOverdue` がそれぞれ dispatch される。

#### Scenario: 契約作成で ContractCreated が発行される

**Given** フェーズが `won` の案件が存在する
**When** `createContract` で契約を作成する
**Then** トランザクション内で `ContractCreated` イベントが dispatch される
**And** イベントの `payload` に `contractId` と `dealId` が含まれる

#### Scenario: 契約完了で ContractCompleted が発行される

**Given** ステータスが `active` の契約が存在する
**When** `updateContractStatus` で `newStatus: "completed"` を指定する
**Then** トランザクション内で `ContractCompleted` イベントが dispatch される

#### Scenario: 請求の入金確認で InvoicePaid が発行される

**Given** ステータスが `invoiced` の請求が存在する
**When** `updateInvoiceStatus` で `newStatus: "paid"` を指定する
**Then** トランザクション内で `InvoicePaid` イベントが dispatch される

### Requirement: 既存の Webhook 配信がイベントハンドラ経由に統一される

承認関連の既存 Webhook 配信（`request.created`, `request.submitted`, `request.approved`, `request.rejected`, `request.revised`, `request.resubmitted`, `step.approved`, `step.rejected`）は全てイベントディスパッチャーの非同期ハンドラ経由で配信されなければならない（MUST）。各ユースケースから `void deliverWebhookEvent(...)` の直接呼び出しは除去しなければならない（MUST）。

#### Scenario: 承認関連 Webhook が引き続き配信される

**Given** `request.created` イベントを購読する Webhook エンドポイントが登録されている
**When** `createRequest` ユースケースが実行される
**Then** Webhook エンドポイントに `request.created` イベントが配信される
**And** 配信は `deliverWebhookEvent` 関数経由で行われる（ハンドラ内部から呼び出し）

#### Scenario: ユースケースから deliverWebhookEvent の直接呼び出しが除去されている

**Given** `createRequest`, `submitRequest`, `approveRequest`, `rejectRequest`, `resubmitRequest` のソースコード
**When** ソースコードを検査する
**Then** `deliverWebhookEvent` の直接 import と呼び出しが存在しない
**And** 代わりに `dispatcher.dispatch()` と `dispatcher.flushAsync()` が使用されている

### Requirement: WEBHOOK_EVENT_TYPES にドメインイベント対応の種別が追加される

`WEBHOOK_EVENT_TYPES` 配列に新しい 10 種のイベント種別が追加され、合計 18 種とならなければならない（MUST）。`WebhookEventType` 型が自動的に拡張される。

#### Scenario: 新しいイベント種別が追加されている

**Given** `src/domain/models/webhookEvent.ts` のソースコード
**When** `WEBHOOK_EVENT_TYPES` の内容を確認する
**Then** `inquiry.converted`, `inquiry.declined`, `deal.phase_changed`, `deal.won`, `deal.lost`, `contract.created`, `contract.completed`, `contract.cancelled`, `invoice.paid`, `invoice.overdue` が含まれる

### Requirement: typecheck と test が green である

全ての変更完了後、`bun run build`（型チェック含む）と `bun test` が成功しなければならない（MUST）。

#### Scenario: ビルドとテストが成功する

**Given** 全ての変更が完了している
**When** `bun run build && bun test` を実行する
**Then** exit code 0 で完了する
