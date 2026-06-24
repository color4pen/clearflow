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
| 1 | HIGH | Consistency | tasks.md T-04 / design.md D6 | **T-04 が `deliverSingleAttempt` を指示しているが D6 は `deliverToEndpoint` を指定している。** D6 は spec-review-002 Finding #1 の修正として「`deliverToEndpoint` を export し新規ドメインイベントの配信に使用する。`deliverSingleAttempt` はリトライ専用関数（既存の `deliveryId` を必須引数とする）のため新規配信には使用できない」と正しく更新された。しかし T-04 の実装指示は「`deliverSingleAttempt`（または等価な低レベル配信関数）を直接呼び出し」のまま未更新である。実際のソースコード（`src/infrastructure/webhookDelivery.ts:103`）で確認した通り `deliverSingleAttempt` は `deliveryId: string` を必須引数とし内部で `webhookDeliveryRepository.findById(deliveryId, ...)` を呼ぶリトライ専用関数であり、新規配信（配信レコードが存在しない）に使用すると実行時エラーになる。一方 `deliverToEndpoint` は非 export（同ファイル L20）であり、T-04 の実装者は D6 を読まなければ正しい関数を特定できない。 | T-04 の「新規ドメインイベント」の配信指示を D6 に合わせて更新する。「`deliverSingleAttempt` の呼び出し」を「`deliverToEndpoint` を `webhookDelivery.ts` から export し、その関数を呼び出す」に変更する。`deliverSingleAttempt` への言及を T-04 から削除する。 |
| 2 | HIGH | Architecture | tasks.md T-02 / T-06〜T-09 / design.md D3 | **D3 が要求する `AsyncLocalStorage` + `runInContext()` パターンが T-02 の API 仕様にも T-06〜T-09 の実装指示にも反映されていない。** D3（spec-review-002 Finding #2 の修正）は「ディスパッチャーは `AsyncLocalStorage` を使用してリクエストごとに独立したイベントバッファを管理する。`runInContext(callback)` メソッドでリクエストスコープのバッファを作成する」と明確に定め、コード例でも `dispatcher.runInContext(async () => { ... db.transaction(...); ... dispatcher.flushAsync(); })` パターンを示している。しかし T-02 の `EventDispatcher` API 定義（`on`, `dispatch`, `flushAsync`, `discardBuffer`, `reset`）には `runInContext()` が含まれていない。また T-06〜T-09 の各ユースケース実装指示も `dispatcher.runInContext(...)` の呼び出しを記述しておらず、代わりに `dispatcher.discardBuffer()` を明示的に呼ぶよう指示している。結果として T-02 を実装した場合 `AsyncLocalStorage` によるリクエストスコープ分離が行われず、D3 が解決しようとした「並行リクエスト間のバッファ汚染」問題が依然として発生する。 | T-02 の `EventDispatcher` クラス定義に `runInContext<T>(callback: () => Promise<T>): Promise<T>` を追加し、内部で `AsyncLocalStorage` を使用してリクエストスコープのバッファを作成・管理する旨を明記する。T-06〜T-09 の各ユースケースの実装パターンを D3 のコード例（`dispatcher.runInContext(async () => { ... })` でトランザクション全体を囲む）に合わせて更新する。null リターンの場合は `runInContext` スコープを抜けることで自動破棄されるため、T-06〜T-09 から null リターン時の明示的 `discardBuffer()` 呼び出し指示を削除する（D3 の「楽観的ロック失敗時は明示的な破棄は不要」に合わせる）。 |
| 3 | MEDIUM | Consistency | design.md D3 / tasks.md T-06〜T-09 | **null リターン時の `discardBuffer()` 呼び出しについて D3 と T-06〜T-09 が矛盾している。** D3 は「楽観的ロック失敗（null リターン）: バッファは `runInContext` のスコープ終了時に自動破棄される。明示的な破棄は不要」と明記している。一方 T-06 は「戻り値が `null`（楽観的ロック失敗）の場合: `dispatcher.discardBuffer()` を呼び出してから早期 return する」、T-07・T-08・T-09 も同様に明示的 `discardBuffer()` を指示している。Finding #2 で指摘した `runInContext()` がタスクに反映されれば自動解消するが、修正前の状態でも設計書と実装指示の矛盾は仕様の信頼性を損なう。 | Finding #2 の修正（T-06〜T-09 を `runInContext()` パターンに更新）と同時に null リターン時の明示的 `discardBuffer()` 指示を削除し、D3 の説明と整合させる。 |
| 4 | MEDIUM | Consistency | tasks.md T-06〜T-09 / design.md D3 | **T-06〜T-09 の例外時 re-throw 指示が既存ユースケースのエラーハンドリング規約と依然として矛盾している。** D3 は「ビジネスルール違反: `{ ok: false, reason: ... }` を返す。既存のエラーハンドリング規約を維持し、例外は再スローしない」と更新された。しかし T-06〜T-09 は「例外が発生した場合: catch ブロックで `dispatcher.discardBuffer()` を呼び出してから例外を再スローする」と引き続き指示している。既存ユースケース（`updateInquiryStatus`・`createRequest` 等）はトランザクション例外を catch して `{ ok: false, reason: ... }` を返す規約であり、再スローに変更するとこれらのユースケースの呼び出し元（actions 層）が非ハンドル例外を受け取る可能性がある。D3 が「re-throw しない」と定めているのに tasks が「re-throw する」と指示しており、実装者がどちらに従うべきか不明確。 | T-06〜T-09 の例外時 catch パターンを「`dispatcher.discardBuffer()` を呼び出してから `{ ok: false, reason: ... }` を返す」に統一し、D3 の規約と整合させる。再スローが意図的な設計変更（インフラ例外は re-throw して上位で処理）であれば、対象ユースケースの actions 層での catch・エラー変換を変更範囲に明記し、それぞれのタスク（T-06〜T-09）に actions 層の修正手順を追記する。 |

## Review Summary

spec-review-002 で指摘された 5 件の findings のうち以下が修正済み:
- Finding #3（MEDIUM）: D3 に「ビジネスルール違反は re-throw しない」の記述が追加された（部分的解消）
- Finding #4（MEDIUM）: spec.md が全 18 種のイベント型を網羅するシナリオに更新された ✅
- Finding #5（LOW）: D3 で null リターン時の自動破棄が定義されたことで T-08 の注記不要問題は副次的に解消 ✅

002 の HIGH 2 件の状況:
- Finding #1（`deliverSingleAttempt` 不整合）: **D6 は正しく `deliverToEndpoint` 使用に修正された** が、**T-04 が未更新のまま `deliverSingleAttempt` を指示しており、実装時に依然として実行時エラーが発生する**（新規 Finding #1）
- Finding #2（並行リクエストバッファ汚染）: **D3 と D8 は `AsyncLocalStorage` + `runInContext()` で設計レベルで解決された** が、**T-02 の `EventDispatcher` API と T-06〜T-09 の実装指示に `runInContext()` が反映されておらず、実装物に `AsyncLocalStorage` 分離が実装されない**（新規 Finding #2）

設計書（design.md）レベルの修正は適切だが、タスク（tasks.md）への修正の cascading が不完全。実装者が tasks.md を指示通りに実装した場合、HIGH 2 件の問題が再現する。

セキュリティ評価: Finding #1 の正しい解決（`deliverToEndpoint` の export）はすでに HMAC 署名実装済みの関数であるため、新規ドメインイベントも `X-Clearflow-Signature: sha256=...` 付きで配信される。`organizationId`/`actorId` はセッション由来でリクエストボディから注入されない。イベントペイロードは内部ドメインオブジェクトから構築されるため外部入力の直接埋め込みはない。OWASP Top 10 上の新規リスクはない。
