# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Architecture | design.md D6 / tasks.md T-04 | **`deliverSingleAttempt` は新規 Webhook 配信に使用できない。** 実際の `deliverSingleAttempt` のシグネチャは `(endpoint: WebhookEndpoint, payload: WebhookPayload, deliveryId: string): Promise<void>` であり、既存の配信レコード ID を必須引数とする。内部実装は `webhookDeliveryRepository.findById(deliveryId, ...)` で既存レコードを取得してから HTTP 配信を行うリトライ専用関数であり、新規配信（delivery record 作成を含む初回配信）には使用できない。新規配信に必要な `deliverToEndpoint` 関数は `export` されておらず外部から呼び出せない。D6 が「`deliverSingleAttempt`（または等価な低レベル配信関数）を直接呼び出し」と指定しているが、implementer がこの指示通りに実装すると `deliveryId` が存在せず実行時エラーになる。 | `deliverToEndpoint` を `webhookDelivery.ts` から `export` し、T-04 の新規ドメインイベントのハンドラはこの関数を呼び出すよう変更する。あるいは `deliverWebhookEvent` と同様に「エンドポイント取得 → delivery record 作成 → HMAC 署名 → HTTP 配信」の全フローを担う新規の `deliverDomainEvent` 関数を定義する。D6 の説明を実際の関数インターフェースと整合するよう修正し、T-04 に具体的な実装手順を明記する。 |
| 2 | HIGH | Architecture | design.md D3 / D8 | **シングルトンバッファが並行非同期リクエスト間で汚染される。** D8 はディスパッチャーをプロセス内シングルトンと定め、D3 は「flush/discard を必ず呼ぶことでリクエスト間汚染を防ぐ」と説明している。しかし `db.transaction()` コールバック内には複数の `await` ポイント（`dealRepository.create`, `inquiryRepository.updateStatus`, `auditLogRepository.create` 等）が存在し、JavaScript の非同期実行モデルでは 2 つの並行リクエストのトランザクションが await ポイントでインターリーブする。典型的な汚染シナリオ: (1) Request A が `dispatch(eventA)` → バッファ: [eventA]、(2) A が await で中断中に Request B が `dispatch(eventB)` → バッファ: [eventA, eventB]、(3) A のトランザクションがコミット → A が `flushAsync()` → B のイベントが B のコミット前に Webhook 配信される。逆に A が失敗して `discardBuffer()` を呼ぶと B の正当なイベントも破棄される。これは "flush/discard の呼び忘れ" とは独立した構造的問題であり、D3 の Risk 記述では対処されていない。 | `AsyncLocalStorage`（Node.js/Bun 組み込み）でリクエストごとのイベントバッファを分離する。`EventDispatcher` の内部バッファを `AsyncLocalStorage<DomainEvent[]>` で管理し、`dispatch()` / `flushAsync()` / `discardBuffer()` が呼び出しコンテキストに紐づくバッファを操作するよう実装する。D3 の設計説明と D8 のシングルトン記述を `AsyncLocalStorage` を使った per-request 分離の方式に更新し、T-02 の `EventDispatcher` 実装要件に反映する。代替案: シングルトンをやめ、ユースケースごとにディスパッチャーインスタンスを生成して DI する（ただし規模感から `AsyncLocalStorage` の方が簡潔）。 |
| 3 | MEDIUM | Consistency | design.md D3 / tasks.md T-06〜T-09 | **D3 の例外パスが既存のエラーハンドリング規約と矛盾する。** D3 のコード例では catch ブロックで `dispatcher.discardBuffer()` を呼んだ後に `throw e`（例外再スロー）するよう指定している。しかし既存のユースケース（`updateInquiryStatus`, `createRequest` 等）はトランザクション例外を catch して `{ ok: false, reason: ... }` を返す規約になっており、例外を再スローしない。T-06〜T-09 は各ユースケースに対して「例外時は catch で `discardBuffer()` を呼び出してから例外を再スローする」と指定しているが、再スローに変更すると呼び出し元の actions 層が `{ ok: false }` を期待している箇所で非ハンドル例外が発生する可能性がある。D3 の"再スロー"指示が意図的な規約変更なのか記述ミスなのかが不明確。 | D3 のコード例と T-06〜T-09 の各タスクを既存規約に合わせて修正する。catch ブロックのパターンを `dispatcher.discardBuffer(); return { ok: false, reason: ... }` とし、再スローしない形に統一する。あるいは例外を再スローする方針であれば、actions 層のエラーハンドリングも含めて変更範囲を明記し、T-09 の対象ユースケース（createRequest 等）の catch ブロック書き換え方針を tasks.md に追記する。 |
| 4 | MEDIUM | Completeness | spec.md | **spec.md の受け入れシナリオが承認関連 8 イベント型を検証していない。** spec.md の「ドメインイベント型は discriminated union として定義される」要件は新規 10 種のイベント型のみを検証するシナリオになっている（InquiryConverted 〜 InvoiceOverdue）。tasks.md T-01 は承認関連 8 種（RequestCreated, RequestSubmitted, RequestApproved, RequestRejected, RequestRevised, RequestResubmitted, StepApproved, StepRejected）を含む合計 18 型を定義するよう要求しており、T-01 の acceptance criteria も「18 種のイベント型」と明記している。spec.md の検証シナリオがこれを網羅していないため、CI 上でのテスト自動生成や実装チェックが不完全になる。 | spec.md に「承認関連 8 種のドメインイベント型が定義されている」シナリオを追加し、`RequestCreated`, `RequestSubmitted`, `RequestApproved`, `RequestRejected`, `RequestRevised`, `RequestResubmitted`, `StepApproved`, `StepRejected` の存在と `DomainEvent` union への包含を検証条件に加える。また既存の「全 10 種のドメインイベント型が定義されている」シナリオを「全 18 種」に修正する。 |
| 5 | LOW | Completeness | tasks.md T-08 | **`createContract` に楽観的ロック失敗パスの `discardBuffer()` 呼び出しが不要な理由が未説明。** T-06, T-07, T-08（updateContractStatus, updateInvoiceStatus）および他の全ユースケースは `db.transaction()` の戻り値が `null`（楽観的ロック失敗）の場合に `discardBuffer()` を呼ぶよう明記しているが、T-08 の `createContract` のみ例外ケースのみを記載し null リターンケースを扱っていない。実際のコードで `createContract` が楽観的ロックを使用せず null を返さない設計であれば、その旨の補足がないと実装者が見落としとして null チェックを追加してしまう可能性がある。 | T-08 の `createContract` セクションに「`createContract` は楽観的ロックを使用せず `db.transaction()` が null を返さないため、null リターン時の `discardBuffer()` 処理は不要」という注記を追加する。もし `createContract` が将来的に楽観的ロックを導入する可能性があれば、その場合の対応方針も簡潔に記載する。 |

## Review Summary

spec-review-001 で指摘された 5 件の findings（バッファリーク、ハンドラ重複登録、型安全性、`occurredAt` 設定方法、不要な actorName ルックアップ）はいずれも spec-fixer によって適切に対処されており、design.md と tasks.md の記述は大幅に改善されている。

ブロッカーは **Finding #1 と #2 の 2 件**。

Finding #1 は実コードの検査で発見した具体的な不整合: `deliverSingleAttempt` の実シグネチャが `deliveryId: string` を必須引数とするリトライ専用関数であり、D6 が指示する「新規 Webhook 配信」の用途に使用できない。この指示通りに実装すると実行時エラーが確実に発生する。

Finding #2 はアーキテクチャ上の根本的な問題: D3 が説明する "flush/discard を必ず呼ぶ" という安全策は「呼び忘れ」ケースには有効だが、非同期 JavaScript の並行実行においてトランザクション内の await ポイントで 2 つのリクエストがインターリーブする場合の汚染は防げない。`AsyncLocalStorage` による per-request バッファ分離がこの設計には必要。

セキュリティ評価（OWASP Top 10 視点）: Finding #1 の解決先として `deliverToEndpoint` / 新規デリバリ関数を使用する場合、HMAC 署名（`X-Clearflow-Signature: sha256=...`）は実コードで確認した通り両関数に実装済みであり、新規ドメインイベントも署名付きで配信される。Webhook エンドポイントへのアクセス制御（管理者専用）は変更されない。`organizationId` / `actorId` はセッション由来でリクエストボディから注入されない。イベントペイロードは内部ドメインオブジェクトから構築されるため外部入力が直接含まれない。
