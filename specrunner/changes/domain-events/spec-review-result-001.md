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
| 1 | HIGH | Architecture | design.md / tasks.md T-06〜T-09 | **ディスパッチャーバッファのトランザクション失敗時リーク。** ディスパッチャーはモジュールレベルのシングルトン（D8）。`dispatch()` はトランザクションコールバック内で呼ばれバッファに蓄積されるが、トランザクションが例外を投げた場合や `db.transaction()` が null を返した場合（楽観的ロック失敗）、catch ブロックや早期リターンで `flushAsync()` が呼ばれない。バッファに残った stale なイベントは次に別のユースケースが `flushAsync()` を呼んだ際に外部配信され、失敗したはずのトランザクションに対する Webhook が誤って送信される。Bun プロセス内でモジュールキャッシュが共有される Next.js 環境では並行リクエスト間でバッファが汚染される。現状の `updateInquiryStatus`・`updateDealPhase` 等のパターン（楽観的ロック失敗時に null リターン → 早期 return）がまさにこのケースに該当する。 | `EventDispatcher` に `clearBuffer(): void` メソッドを追加する。各ユースケースの catch ブロックおよびトランザクション後の早期リターンパス（`if (!updatedX)` 判定後の `return { ok: false }` 直前）で `dispatcher.clearBuffer()` を呼ぶよう tasks に明記する。または try/finally パターンで「成功時は `flushAsync()`、失敗時は `clearBuffer()`」とする方式をタスクに記述する。design.md の D3 にもこの lifecycle を明記する。 |
| 2 | MEDIUM | Architecture | tasks.md T-05 | **ハンドラ重複登録の防止方法が未解決。** T-05 は冪等性を確保する方法として「登録済みフラグ or ディスパッチャーの `reset()` + 再登録」のどちらかを列挙しているが未決定。`reset()` を使った場合、ハンドラ登録が他モジュール由来のものも含めて全件削除されるため、複数箇所でハンドラを登録する将来構成では破壊的。また `reset()` はテスト専用として定義されており、本番コードでの使用は設計の意図と矛盾する。 | `registerHandlers()` 内で `let registered = false` フラグを使い、2 回目以降の呼び出しを即リターンする方式に決定する。tasks.md T-05 にこの実装方針を明記し、`reset()` を本番コードで使う選択肢を削除する。 |
| 3 | MEDIUM | Type Safety | tasks.md T-03 | **`WebhookEventData` の既存フィールドを optional 化することで承認イベントの型安全性が低下する。** `requestId` / `requestTitle` を `?` にすると、コンパイラが承認系イベントのハンドラで必須フィールドの欠落を検出できなくなる。`WebhookPayload.data` 型が全イベント共通になるため、既存の Webhook 配信コード内での型推論の恩恵が失われる。 | `WebhookEventData` を変更する代わりに、新規イベント用の `NewDomainEventData` 型（`entityId`, `fromStatus`/`toStatus` 等のフィールドを持つ）を別途定義し、`WebhookPayload.data` を `WebhookEventData \| NewDomainEventData` の discriminated union にするか、Webhook ハンドラ内でイベント種別ごとに適切なデータ構造を `satisfies WebhookEventData` 等で型付けする方針を tasks.md T-03 および T-04 に追記する。 |
| 4 | LOW | Tasks | tasks.md T-01 / T-06〜T-09 | **`BaseDomainEvent.occurredAt` の設定方法が未定義。** `BaseDomainEvent` に `occurredAt: Date` フィールドが定義されているが、各ユースケースでイベントを構築する際にこのフィールドをどう設定するか（`new Date()` を呼ぶタイミング、トランザクション内 vs 外など）がどのタスクにも記載されていない。 | tasks.md の各ユースケースタスク（T-06〜T-09）に「`occurredAt: new Date()` をトランザクション内で設定する」旨を補足する。またはヘルパー関数 `createEvent<T>(type, payload, base)` を定義してデフォルト値を隠蔽する案を T-01 に追記する。 |
| 5 | LOW | Design | design.md D6 | **新規ドメインイベントの Webhook ハンドラが不要な `actorName` ユーザー DB ルックアップを実行する。** `deliverWebhookEvent` は `actorId` から `userRepository.findById` で `actorName` を解決してペイロードに含める実装になっている。`inquiry.converted` / `deal.won` 等の新規イベントでは `actorName` は Webhook ペイロードに不要なデータだが、既存関数を再利用するためルックアップが毎回発生しパフォーマンスオーバーヘッドとなる。 | D6 の設計説明に「新規ドメインイベント向けの Webhook ペイロードでは `actorName` を `""` またはオプショナルとし、ユーザールックアップを省略可能にする」旨を補足する。または新規イベント専用の delivery パスを設けることを検討する旨を記載する（本 PR での対応は任意）。 |

## Review Summary

仕様全体の構造と設計判断（インプロセスディスパッチャー、discriminated union、2 フェーズ実行モデル）は適切。request.md・design.md・tasks.md・spec.md の一貫性も高く、受け入れ基準もテスト可能な形で定義されている。

ブロッカーは **Finding #1 のみ**。モジュールレベルシングルトン + 同プロセス内リクエスト共有という Bun/Next.js の実行モデルにおいて、トランザクション失敗時にバッファが漏洩し誤った Webhook が外部配信されるのは機能的バグとして具現化する。設計文書（D3 の "Risks" セクション）は「`flushAsync()` 呼び忘れ」リスクを認識しているが、「失敗パスでのバッファ残留」は言及されていない。spec-fixer が `clearBuffer()` メソッドの追加と各ユースケースの失敗パスでの呼び出し指定を tasks.md / design.md に追記することで解消できる。

セキュリティ評価：OWASP Top 10 の観点では特段の問題は見当たらない。Webhook HMAC 署名（`X-Clearflow-Signature: sha256=...`）は既存の実装が維持される。イベントペイロードは内部での構成であり、外部入力を直接含まない。`organizationId` はセッション由来（action 層で検証済み）で注入リスクはない。アクセス制御（管理者のみ Webhook 設定可能）も変更されない。
