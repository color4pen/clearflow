# ドメインイベント基盤の導入

## Meta

- **type**: new-feature
- **slug**: domain-events
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しいイベント駆動パターンの導入、既存の Webhook・監査ログの配信方式を変更する構造的変更 → true -->

## 背景

ドメインで発生した事象（引合の案件化、案件の受注、請求の入金確認など）を他のコンテキストに伝達する仕組みが存在しない。監査ログは 37 箇所のユースケースに手動でコピペされ、Webhook はトランザクション外で fire-and-forget で呼ばれている。

ドメインイベントの定義・発行・ハンドリングの基盤を導入し、承認ポリシー評価（後続リクエストで実装）、監査ログ自動記録、Webhook 配信を統一的に扱えるようにする。

## 現状コードの前提

- `src/domain/models/webhookEvent.ts:1-10` — Webhook イベントは承認関連の 8 種のみ定義（request.created, request.submitted 等）。案件・契約・請求のイベントは存在しない
- `src/infrastructure/webhookDelivery.ts:1-30` — `deliverWebhookEvent` はインフラ層に直接実装。ドメインイベントの概念なし
- `src/application/usecases/approveRequest.ts:79,252,270` — Webhook 呼び出しが `void deliverWebhookEvent(...)` でトランザクション外に fire-and-forget
- `src/application/usecases/createRequest.ts:84` — 同上
- `src/application/usecases/submitRequest.ts:59` — 同上
- `src/application/usecases/rejectRequest.ts:104,115,191` — 同上
- `src/application/usecases/resubmitRequest.ts:88` — 同上
- `src/application/usecases/updateInquiryStatus.ts:40-49` — 案件化時に Deal を直接生成。イベント発行なし
- `src/domain/services/dealTransition.ts:1-25` — 状態遷移の検証のみ。遷移時のイベント発行なし
- `src/domain/services/contractTransition.ts:1-15` — 同上
- `src/domain/services/invoiceTransition.ts:1-10` — 同上

## 要件

1. **ドメインイベントの型定義**: `src/domain/events/` ディレクトリを新設し、以下のイベント型を定義する。各イベントは `type`（イベント名）、`payload`（エンティティ ID や変更内容）、`organizationId`、`actorId` を持つ
   - `InquiryConverted` — 引合が案件化された
   - `InquiryDeclined` — 引合が見送られた
   - `DealPhaseChanged` — 案件のフェーズが変更された
   - `DealWon` — 案件が受注した
   - `DealLost` — 案件が失注した
   - `ContractCreated` — 契約が作成された
   - `ContractCompleted` — 契約が完了した
   - `ContractCancelled` — 契約が解除された
   - `InvoicePaid` — 請求の入金が確認された
   - `InvoiceOverdue` — 請求が期日超過になった
2. **イベントディスパッチャーの実装**: `src/domain/events/dispatcher.ts` にイベントディスパッチャーを実装する。同期ハンドラ（トランザクション内で実行）と非同期ハンドラ（トランザクション後に実行）を区別できる仕組みとする。ハンドラの登録は起動時に行う
3. **既存ユースケースへのイベント発行の組み込み**: 以下のユースケースでイベントを発行する。イベント発行はトランザクション内で行い、同期ハンドラはトランザクション内で実行、非同期ハンドラはトランザクションコミット後に実行する
   - `updateInquiryStatus` — InquiryConverted / InquiryDeclined
   - `updateDealPhase` — DealPhaseChanged / DealWon / DealLost
   - `createContract` — ContractCreated
   - `updateContractStatus` — ContractCompleted / ContractCancelled
   - `updateInvoiceStatus` — InvoicePaid / InvoiceOverdue
4. **Webhook 配信のイベントハンドラ移行**: 既存の `void deliverWebhookEvent(...)` 呼び出しを非同期イベントハンドラに置き換える。承認関連の既存 Webhook イベント（request.created 等）もイベントハンドラ経由で配信するよう統一する
5. **Webhook イベント種別の拡張**: `WEBHOOK_EVENT_TYPES` に新しいドメインイベントに対応するイベント種別を追加する（inquiry.converted, deal.won, deal.lost, contract.created, invoice.paid 等）

## スコープ外

- 監査ログのイベントハンドラ移行（後続リクエストで実施）
- 承認ポリシー評価のイベントハンドラ接続（後続リクエストで実施）
- イベントの永続化（イベントソーシング）
- メッセージキューやイベントバスの外部サービス導入

## 受け入れ基準

- [ ] `src/domain/events/` に 10 種のドメインイベント型が定義されている
- [ ] イベントディスパッチャーが同期・非同期ハンドラを区別して実行できる
- [ ] `updateInquiryStatus` で converted 遷移時に `InquiryConverted` イベントが発行される
- [ ] `updateDealPhase` で won 遷移時に `DealWon` イベントが発行される
- [ ] 既存の Webhook 配信がイベントハンドラ経由に統一されている
- [ ] 既存の承認関連 Webhook（request.created 等）が引き続き正しく配信される
- [ ] `WEBHOOK_EVENT_TYPES` にドメインイベント対応の種別が追加されている
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **インプロセスのイベントディスパッチャーを採用** — 外部メッセージキュー（Redis Pub/Sub 等）ではなく、プロセス内のイベントディスパッチャーを使用する。理由: 現時点の規模ではインプロセスで十分であり、外部依存を増やさない。将来スケールが必要になった時点でディスパッチャーの実装を差し替えればよい。却下案: EventEmitter ベース — Node.js の EventEmitter はエラーハンドリングが弱く、型安全性がない
2. **同期/非同期ハンドラの区別をディスパッチャー側で管理** — ハンドラ登録時に sync/async を指定し、ディスパッチャーが実行タイミングを制御する。理由: ユースケース側はイベントを発行するだけで、ハンドラの実行タイミングを意識しなくてよい。却下案: ユースケース側で同期・非同期を使い分ける — 呼び出し側の負担が増え、漏れが発生しやすい
