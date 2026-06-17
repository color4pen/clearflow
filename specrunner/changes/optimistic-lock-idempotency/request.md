# 楽観的ロックと冪等性キー

## Meta

- **type**: new-feature
- **slug**: optimistic-lock-idempotency
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 並行制御の導入、冪等性保証の新パターン → true -->

## 背景

現在、同じ承認ステップに対して2人の admin が同時に承認操作を行った場合、両方とも成功してステップが二重承認される可能性がある。また、ネットワーク遅延でユーザーが承認ボタンを二重クリックした場合にも同じ操作が2回実行される。

楽観的ロック（version カラムによる競合検出）と冪等性キー（同じリクエストの再送を検出して重複実行を防止）を導入し、データ整合性を保証する。

## 現状コードの前提

- `src/infrastructure/schema.ts:55-70` — `requests` テーブルに `updatedAt` はあるが `version` カラムがない
- `src/infrastructure/schema.ts:83-101` — `approval_steps` テーブルに `version` カラムがない
- `src/infrastructure/repositories/requestRepository.ts` — `updateStatus` は `id` + `organizationId` で WHERE し、version チェックなし
- `src/infrastructure/repositories/approvalStepRepository.ts` — `updateStatus` は `id` で WHERE し、version チェックなし
- `src/application/usecases/approveRequest.ts` — トランザクション内で `findByRequestId` → `findById` → `updateStatus` の流れ。楽観的ロックなし
- `src/app/actions/requests.ts` — Server Actions に冪等性キーのチェックなし

## 要件

1. **requests テーブルに version カラム追加**: `version integer NOT NULL DEFAULT 1` を追加する。状態変更のたびにインクリメントする
2. **approval_steps テーブルに version カラム追加**: 同上
3. **楽観的ロックの実装**: `requestRepository.updateStatus` と `approvalStepRepository.updateStatus` の WHERE 条件に `version = expectedVersion` を追加する。更新行数が0の場合（=他のトランザクションが先に更新済み）はエラーを返す
4. **usecase での楽観的ロック統合**: `approveRequest`, `rejectRequest`, `submitRequest`, `resubmitRequest` の各 usecase で、エンティティ取得時の version を保持し、更新時にその version を WHERE 条件に含める。楽観的ロック失敗時は `{ ok: false, reason: "この申請は他のユーザーによって更新されました。画面を更新してください" }` を返す
5. **冪等性キーテーブル追加**: `idempotency_keys` テーブルを新設する。カラム: id (uuid), key (text, unique), action (text), result (jsonb), organizationId (FK), createdAt (timestamp)。TTL は未実装（スコープ外）
6. **冪等性キーの実装**: 承認・却下・差し戻し・再申請の Server Actions に `idempotencyKey` パラメータを追加する。同じキーで2回目以降のリクエストが来た場合、前回の結果を返して操作を実行しない
7. **UI での冪等性キー生成**: 承認/却下/再申請ボタンのクリック時に UUID v4 の冪等性キーを生成し、Server Action に渡す。ボタンの二重クリック防止（disable on submit）も併用する
8. **ドメインモデル更新**: `Request` 型と `ApprovalStep` 型に `version: number` を追加する
9. **テスト**: 楽観的ロック失敗のシナリオをテストで確認する。冪等性キーの重複検出をテストで確認する

## スコープ外

- 冪等性キーの TTL（自動期限切れ）
- 冪等性キーの手動クリーンアップ UI
- ペシミスティックロック（SELECT FOR UPDATE）
- 申請作成の冪等性（状態変更操作のみ対象）

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `requests` テーブルと `approval_steps` テーブルに `version` カラムが存在する
- [ ] `idempotency_keys` テーブルが schema.ts に定義されている
- [ ] 楽観的ロック: version 不一致で更新が拒否されることをテストで確認する
- [ ] 楽観的ロック: version 一致で更新が成功し version がインクリメントされることをテストで確認する
- [ ] 冪等性: 同じキーで2回目のリクエストが前回の結果を返すことをテストで確認する
- [ ] 冪等性: 異なるキーで同じ操作が正常に実行されることをテストで確認する
- [ ] Server Actions に `idempotencyKey` パラメータが追加されている
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **楽観的ロック（version カラム）を採用、ペシミスティックロック（SELECT FOR UPDATE）を却下** — ペシミスティックロックはトランザクション保持時間が長くなりデッドロックリスクがある。楽観的ロックは衝突頻度が低い場合に高パフォーマンス。承認ワークフローの同時操作頻度は低いため楽観的ロックが適切
2. **冪等性キーを DB テーブルで管理を採用、Redis / インメモリキャッシュを却下** — Redis は追加インフラ依存。デモ用途ではDB テーブルで十分。TTL は今後必要になれば cron で古いキーを削除する
3. **冪等性の対象を状態変更操作に限定** — 申請作成は冪等性不要（一覧画面で重複確認可能）。承認・却下・差し戻し・再申請は状態変更を伴い、二重実行でデータ不整合が発生するため対象とする
4. **version を integer で採用、updatedAt による楽観的ロックを却下** — timestamp ベースは精度依存で信頼性が低い（ミリ秒以下の同時更新）。integer の方がシンプルで確実
