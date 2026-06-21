# 承認フロー統合

## Meta

- **type**: spec-change
- **slug**: approval-flow-integration
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存の承認フロー（approveRequest）に後処理フックを追加する変更だが、新しい port/adapter やアーキテクチャパターンの導入ではない → false -->

## 背景

案件化承認・見積承認で作成される Request が `draft` 状態のままになっており、承認者のキューに載らない。また、承認が完了しても引き合い・案件のステータスが自動更新されないため、手動での状態管理が必要になっている。

この request で承認フローと案件管理ドメインの連携を完成させる。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/repositories/requestRepository.ts:40` — `create` メソッドで `status: "draft"` がハードコードされている。`status` パラメータは存在しない
- `src/domain/services/requestTransition.ts:4-7` — 遷移ルール: `draft → ["pending"]`, `pending → ["approved", "rejected", "revision", "expired"]`, `revision → ["pending"]`
- `src/application/usecases/createRequest.ts:42-51` — `requestRepository.create` に status を渡していない。常に `draft` で作成される
- `src/application/usecases/updateInquiryStatus.ts:53-62` — converted 遷移で `requestRepository.create` を呼び出す。status 指定なし → `draft` で作成。承認者に見えない状態
- `src/application/usecases/updateDealPhase.ts:57-66` — estimate_approval 遷移で `requestRepository.create` を呼び出す。status 指定なし → `draft` で作成
- `src/application/usecases/approveRequest.ts:213-245` — 全ステップ承認後の処理: `requestRepository.updateStatus` で Request を `"approved"` に遷移し、audit log を作成する。その後 webhook `request.approved` を配信する。**承認完了後に引き合い・案件のステータスを更新する処理はない**
- `src/application/usecases/approveRequest.ts:251-280` — webhook 配信: `step.approved` と `request.approved`
- `src/application/usecases/submitRequest.ts:26-29` — `validateTransition(existing.status, "pending")` で `draft → pending` の遷移を検証
- `src/domain/models/inquiry.ts:15` — `conversionRequestId: string | null` で案件化承認リクエストを参照
- `src/domain/models/deal.ts:33` — `estimateRequestId: string | null` で見積承認リクエストを参照
- `src/application/usecases/approveRequest.ts:66-79` — audit log の metadata に `templateId`, `templateName` が記録されるが、`inquiryId` や `dealId` は記録されていない
- `src/application/usecases/updateInquiryStatus.ts:103-117` — Request 作成時の audit log metadata に `inquiryId: data.inquiryId` が記録されている
- `src/application/usecases/updateDealPhase.ts:117-127` — Request 作成時の audit log metadata に `dealId: data.dealId` が記録されている

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。
     粒度: 1 request = 1 つのレビュー収束ループで直しきれる範囲。超えるなら「土台（挙動不変の機構導入）→ 上物（その利用）」に分割する。 -->

1. **requestRepository.create に status パラメータを追加**: `create` メソッドのシグネチャに `status?: RequestStatus` を追加する。指定がなければ従来通り `"draft"` をデフォルトにする。既存の `createRequest` ユースケースの挙動は変わらない（引き続き `draft` で作成される）
2. **案件化承認リクエストを pending で作成**: `updateInquiryStatus.ts` の converted 遷移ブロックで `requestRepository.create` に `status: "pending"` を渡す。これにより承認リクエストが即座に承認者のキューに載る。`submitRequest` ユースケースを別途呼ぶ必要がなくなる
3. **見積承認リクエストを pending で作成**: `updateDealPhase.ts` の estimate_approval 遷移ブロックで `requestRepository.create` に `status: "pending"` を渡す
4. **approveRequest に承認完了後の連動処理を追加**: 全ステップ承認後（`isAllApproved(updatedSteps)` が true の箇所）で、Request の `metadata`（audit log 経由ではなく Request 作成時に記録された情報）を参照して連動処理を実行する。具体的には:
   - Request 作成時の audit log から `inquiryId` または `dealId` を取得する方法では疎結合すぎて信頼性が低い。代わりに **requests テーブルに `sourceType` (text, nullable) と `sourceId` (uuid, nullable) カラムを追加** する。`sourceType` は `"inquiry"` | `"deal"` | null、`sourceId` は引き合いID or 案件ID
   - `updateInquiryStatus` の converted 遷移で Request 作成時に `sourceType: "inquiry"`, `sourceId: data.inquiryId` をセットする
   - `updateDealPhase` の estimate_approval 遷移で Request 作成時に `sourceType: "deal"`, `sourceId: data.dealId` をセットする
   - 通常の承認リクエスト（`createRequest` UC 経由）では `sourceType` と `sourceId` は null のまま
5. **案件化承認完了 → Deal 自動作成**: `approveRequest` の全ステップ承認後、承認済み Request の `sourceType === "inquiry"` の場合に、`approveRequest` 内でリポジトリ層を直接呼び出して案件を作成する（UC→UC 呼び出しは依存方向違反のため行わない）。具体的には `inquiryRepository.findById(sourceId)` で引き合いを取得し、`dealRepository.create` で Deal を作成し、`auditLogRepository.create` で audit log を記録する。Deal のタイトルは引き合いのタイトルをそのまま使用する。Deal 作成が失敗した場合（既に案件が存在する等）はエラーを audit log に記録するが、承認自体は成功させる（承認のロールバックはしない）。この連動処理はトランザクション外で実行する
6. **見積承認完了 → Deal フェーズ自動進行**: `approveRequest` の全ステップ承認後、承認済み Request の `sourceType === "deal"` の場合に、`approveRequest` 内で `dealRepository.findById(sourceId)` で案件を取得し、`dealRepository.updatePhase` で案件のフェーズを `"won"` に遷移する。`estimateRequestId` は既存値を引き継ぐ。楽観ロック失敗（他ユーザーが先にフェーズ変更）の場合は audit log に記録するが承認自体は成功させる。この連動処理はトランザクション外で実行する
7. **Request の requests テーブルに sourceType, sourceId を追加**: `src/infrastructure/schema.ts` の `requests` テーブルに `sourceType: text("source_type")` と `sourceId: uuid("source_id")` を追加する（両方 nullable）。`Request` ドメインモデル型にも `sourceType: string | null` と `sourceId: string | null` を追加する。`requestRepository.ts` の `mapRow` 関数を更新して `sourceType` と `sourceId` を返すようにする。`requestRepository.create` のシグネチャに `sourceType?: string | null` と `sourceId?: string | null` を追加する。マイグレーションファイルは `bunx drizzle-kit generate` で生成する
8. **テスト追加**: 以下をテストする
   - 案件化承認リクエストが `pending` で作成されることを確認する
   - 見積承認リクエストが `pending` で作成されることを確認する
   - 通常の承認リクエスト（`createRequest` UC 経由）が引き続き `draft` で作成されることを確認する
   - 案件化承認完了時に Deal が自動作成されることを確認する
   - 見積承認完了時に Deal のフェーズが `won` に遷移することを確認する
   - 連動処理が失敗しても承認自体は成功することを確認する

## スコープ外

- 承認却下時の引き合い・案件へのステータス反映（rejected → 引き合いを in_progress に戻す等）
- 承認リクエスト一覧での sourceType によるフィルタリング
- 引き合い作成時の顧客同時登録 UI — Request 3 で対応
- 商談記録からの担当者登録 UI — Request 3 で対応

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `requestRepository.create` が `status` パラメータを受け付ける
- [ ] `updateInquiryStatus` の converted 遷移で作成される Request の status が `"pending"` である
- [ ] `updateDealPhase` の estimate_approval 遷移で作成される Request の status が `"pending"` である
- [ ] `createRequest` UC 経由で作成される Request の status が引き続き `"draft"` である
- [ ] `requests` テーブルに `sourceType` と `sourceId` カラムが存在する
- [ ] converted 遷移で作成される Request の `sourceType` が `"inquiry"` で `sourceId` が引き合いIDである
- [ ] estimate_approval 遷移で作成される Request の `sourceType` が `"deal"` で `sourceId` が案件IDである
- [ ] 案件化承認の全ステップ承認後に Deal が自動作成されることをテストで確認する
- [ ] 見積承認の全ステップ承認後に Deal のフェーズが `won` になることをテストで確認する
- [ ] 連動処理失敗時に承認自体が成功することをテストで確認する
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **requests テーブルに sourceType/sourceId を追加を採用、audit log の metadata から逆引きを却下** — audit log は append-only の記録であり、状態遷移のトリガーに使うべきではない。Request 自体が「どこから来たか」を知っている方が、連動処理の実装がシンプルで信頼性が高い
2. **案件化承認・見積承認を pending で直接作成を採用、draft で作成して submitRequest を自動呼び出しを却下** — submitRequest は webhook 配信と audit log を含むため、createRequest 内で呼ぶとトランザクション外の副作用が二重になる。requestRepository.create に status パラメータを追加して直接 pending で INSERT するのが最もシンプル
3. **連動処理の失敗を承認に影響させないを採用、トランザクション内で連動を却下** — 承認は承認として完了すべき。案件作成やフェーズ進行が失敗したからといって承認をロールバックすると、承認者が同じ操作を繰り返す必要があり UX が悪い。失敗は audit log に記録して後から対処する
4. **approveRequest 内でリポジトリ層を直接呼び出して連動処理を実行を採用、UC→UC 呼び出しを却下** — UC→UC 呼び出しは依存方向（actions → usecases → domain / infrastructure）に違反する。approveRequest 内で sourceType を判定し、dealRepository / inquiryRepository を直接呼ぶことで依存方向を遵守する。イベントバスやキューはプロジェクト規模では過剰
