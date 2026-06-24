# Test Cases: ドメインイベント基盤の導入

## Summary

- **Total**: 35 cases
- **Automated** (unit/integration): 34
- **Manual**: 1
- **Priority**: must: 27, should: 8, could: 0

---

### TC-001: 全 18 種のドメインイベント型が定義されている

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ドメインイベント型は discriminated union として定義される > Scenario: 全 18 種のドメインイベント型が定義されている

---

### TC-002: ドメインイベント型が discriminated union である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ドメインイベント型は discriminated union として定義される > Scenario: ドメインイベント型が discriminated union である

---

### TC-003: 同期ハンドラが dispatch 呼び出し時に実行される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: イベントディスパッチャーは同期ハンドラと非同期ハンドラを区別して実行する > Scenario: 同期ハンドラが dispatch 呼び出し時に実行される

---

### TC-004: 同期ハンドラの例外が呼び出し元に伝播する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: イベントディスパッチャーは同期ハンドラと非同期ハンドラを区別して実行する > Scenario: 同期ハンドラの例外が呼び出し元に伝播する

---

### TC-005: 非同期ハンドラが flushAsync 呼び出し時に実行される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: イベントディスパッチャーは同期ハンドラと非同期ハンドラを区別して実行する > Scenario: 非同期ハンドラが flushAsync 呼び出し時に実行される

---

### TC-006: 非同期ハンドラの例外が呼び出し元に伝播しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: イベントディスパッチャーは同期ハンドラと非同期ハンドラを区別して実行する > Scenario: 非同期ハンドラの例外が呼び出し元に伝播しない

---

### TC-007: 引合の案件化で InquiryConverted が発行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateInquiryStatus で converted 遷移時に InquiryConverted イベントが発行される > Scenario: 引合の案件化で InquiryConverted が発行される

---

### TC-008: 引合の見送りで InquiryDeclined が発行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateInquiryStatus で converted 遷移時に InquiryConverted イベントが発行される > Scenario: 引合の見送りで InquiryDeclined が発行される

---

### TC-009: 案件の受注で DealWon が発行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateDealPhase でフェーズ遷移時に適切なイベントが発行される > Scenario: 案件の受注で DealWon が発行される

---

### TC-010: 案件の失注で DealLost が発行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateDealPhase でフェーズ遷移時に適切なイベントが発行される > Scenario: 案件の失注で DealLost が発行される

---

### TC-011: 案件のフェーズ変更で DealPhaseChanged が発行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateDealPhase でフェーズ遷移時に適切なイベントが発行される > Scenario: 案件のフェーズ変更で DealPhaseChanged が発行される

---

### TC-012: 契約作成で ContractCreated が発行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 契約・請求のユースケースで適切なイベントが発行される > Scenario: 契約作成で ContractCreated が発行される

---

### TC-013: 契約完了で ContractCompleted が発行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 契約・請求のユースケースで適切なイベントが発行される > Scenario: 契約完了で ContractCompleted が発行される

---

### TC-014: 請求の入金確認で InvoicePaid が発行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 契約・請求のユースケースで適切なイベントが発行される > Scenario: 請求の入金確認で InvoicePaid が発行される

---

### TC-015: 承認関連 Webhook が引き続き配信される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 既存の Webhook 配信がイベントハンドラ経由に統一される > Scenario: 承認関連 Webhook が引き続き配信される

---

### TC-016: ユースケースから deliverWebhookEvent の直接呼び出しが除去されている

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 既存の Webhook 配信がイベントハンドラ経由に統一される > Scenario: ユースケースから deliverWebhookEvent の直接呼び出しが除去されている

---

### TC-017: 新しいイベント種別が WEBHOOK_EVENT_TYPES に追加されている

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: WEBHOOK_EVENT_TYPES にドメインイベント対応の種別が追加される > Scenario: 新しいイベント種別が追加されている

---

### TC-018: ビルドとテストが成功する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: typecheck と test が green である > Scenario: ビルドとテストが成功する

---

### TC-019: domain events の型定義がインフラ層に依存しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/domain/events/types.ts` が存在する
**WHEN** `grep -r "from.*@/infrastructure" src/domain/events/` を実行する
**THEN** 結果が空である（`@/infrastructure` への import が一切含まれない）

---

### TC-020: DomainEventType が DomainEvent["type"] として導出される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `src/domain/events/types.ts` に `DomainEvent` union 型が定義されている
**WHEN** `DomainEventType` 型の定義を確認する
**THEN** `DomainEventType` が `DomainEvent["type"]` として定義されており、18 種の文字列リテラル union となっている

---

### TC-021: runInContext スコープ外での dispatch がエラーをスロー

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `dispatcher.runInContext()` の外でコードが実行されている（ALS スコープなし）
**WHEN** `dispatcher.dispatch(event)` を呼び出す
**THEN** エラーがスローされる

---

### TC-022: 並行する runInContext スコープのバッファが独立している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02, T-11

**GIVEN** 2 つの `dispatcher.runInContext()` コールバックが並行して実行されている
**WHEN** スコープ A で `dispatch(eventA)` を呼び出し、スコープ B で `dispatch(eventB)` を呼び出す
**THEN** スコープ A の `flushAsync()` はイベント A のみを処理し、スコープ B の `flushAsync()` はイベント B のみを処理する（スコープ間でバッファが混在しない）

---

### TC-023: flushAsync() 実行後にバッファがクリアされる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `dispatcher.runInContext()` 内で `dispatch(event)` が呼ばれ、イベントがバッファに蓄積されている
**WHEN** `dispatcher.flushAsync()` を呼び出し、非同期ハンドラの実行を待つ
**THEN** `flushAsync()` 再呼び出し時にハンドラが 2 度実行されない（バッファが空になっている）

---

### TC-024: reset() でハンドラ登録がクリアされる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `dispatcher.on("inquiry.converted", handler, "sync")` でハンドラが登録されている
**WHEN** `dispatcher.reset()` を呼び出す
**THEN** 以降の `dispatch(inquiryConvertedEvent)` でそのハンドラが実行されない

---

### TC-025: 同一イベントタイプに複数のハンドラを登録できる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** `"inquiry.converted"` に 2 つの同期ハンドラ（`handlerA`, `handlerB`）が登録されている
**WHEN** `dispatcher.dispatch(inquiryConvertedEvent)` を呼び出す
**THEN** `handlerA` と `handlerB` の両方が実行される

---

### TC-026: 既存の WebhookEventData の必須フィールドが optional 化されない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `src/domain/models/webhookEvent.ts` の `WebhookEventData` 型が定義されている
**WHEN** TypeScript コンパイラが型チェックを実行する
**THEN** `requestId` および `requestTitle` フィールドが必須（non-optional）のままであり、承認系イベントのハンドラで型エラーなしにアクセスできる

---

### TC-027: 新規ドメインイベントのハンドラが deliverToEndpoint を使用する

**Category**: unit
**Priority**: must
**Source**: design.md > D6, tasks.md > T-04

**GIVEN** `src/infrastructure/handlers/webhookHandler.ts` が実装されている
**WHEN** `inquiry.*`, `deal.*`, `contract.*`, `invoice.*` 系ドメインイベントのハンドラコードを検査する
**THEN** `deliverWebhookEvent` の直接呼び出しが含まれず、`deliverToEndpoint` が使用されている
**AND** `deliverSingleAttempt` が使用されていない
**AND** `actorName` の DB ルックアップが行われていない

---

### TC-028: 承認系イベントのハンドラが deliverWebhookEvent 経由で actorName を解決する

**Category**: unit
**Priority**: must
**Source**: design.md > D6, tasks.md > T-04

**GIVEN** `src/infrastructure/handlers/webhookHandler.ts` が実装されている
**WHEN** `request.*` および `step.*` 系イベントのハンドラコードを検査する
**THEN** `deliverWebhookEvent` が呼び出されている
**AND** `actorName` の解決（DB ルックアップ）が `deliverWebhookEvent` 内部で行われるため、ペイロードに含まれる

---

### TC-029: registerHandlers() が冪等である

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `registerHandlers()` が既に一度呼び出されている
**WHEN** `registerHandlers()` を 2 度目に呼び出す
**THEN** イベントハンドラが重複登録されない（同一イベントに対してハンドラが 1 つだけ登録された状態を維持する）

---

### TC-030: ContractCancelled が cancelled ステータス遷移時に発行される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** ステータスが `active` の契約が存在する
**WHEN** `updateContractStatus` で `newStatus: "cancelled"` を指定する
**THEN** トランザクション内で `ContractCancelled` イベントが dispatch される
**AND** イベントの `payload` に `contractId` が含まれる

---

### TC-031: InvoiceOverdue が overdue ステータス遷移時に発行される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** ステータスが `invoiced` の請求が存在する
**WHEN** `updateInvoiceStatus` で `newStatus: "overdue"` を指定する
**THEN** トランザクション内で `InvoiceOverdue` イベントが dispatch される
**AND** イベントの `payload` に `invoiceId` と `contractId` が含まれる

---

### TC-032: updateInvoiceStatus の invoiced 遷移でイベントが発行されない

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** ステータスが `draft` の請求が存在する
**WHEN** `updateInvoiceStatus` で `newStatus: "invoiced"` を指定する
**THEN** `dispatcher.dispatch()` が呼び出されない（中間状態遷移ではイベントを発行しない）

---

### TC-033: approveRequest 多段階承認フローで StepApproved と条件付き RequestApproved が発行される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** 多段階承認フローの途中ステップにある申請が存在する
**WHEN** `approveRequest` で中間ステップを承認する
**THEN** トランザクション内で `StepApproved` イベントが dispatch される
**AND** 全ステップが完了していないため `RequestApproved` イベントは dispatch されない

**GIVEN** 多段階承認フローの最終ステップにある申請が存在する
**WHEN** `approveRequest` で最終ステップを承認する
**THEN** トランザクション内で `StepApproved` と `RequestApproved` の両方が dispatch される

---

### TC-034: rejectRequest 差し戻しフローで RequestRevised と StepRejected の両方が発行される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** 承認中の申請が存在し、差し戻し（revision）フローが対象となる
**WHEN** `rejectRequest` で差し戻しを実行する
**THEN** トランザクション内で `RequestRevised` と `StepRejected` の両方が dispatch される

---

### TC-035: runInContext の null リターン時にバッファが自動破棄される

**Category**: unit
**Priority**: should
**Source**: design.md > D3, tasks.md > T-06

**GIVEN** `dispatcher.runInContext()` 内で `dispatch(event)` が呼ばれ、イベントがバッファに蓄積されている
**WHEN** `db.transaction()` が `null` を返す（楽観的ロック失敗）ためユースケースが `flushAsync()` を呼ばずに `runInContext` を終了する
**THEN** `runInContext` スコープ終了時にバッファが自動破棄される
**AND** 後続リクエストのスコープに蓄積イベントが漏れ出ない

---

## Result

```yaml
result: completed
total: 35
automated: 34
manual: 1
must: 27
should: 8
could: 0
blocked_reasons: []
```
