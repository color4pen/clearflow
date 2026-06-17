# Design: 楽観的ロックと冪等性キー

## Context

承認ワークフロー SaaS において、同一承認ステップへの同時操作やネットワーク遅延による二重クリックで、データ不整合が発生しうる。

現状の問題点：

- `requestRepository.updateStatus` は `id + organizationId` のみで WHERE し、version チェックがない
- `approvalStepRepository.updateStatus` は `id + organizationId` のみで WHERE し、version チェックがない
- `approveRequest` usecase はトランザクション内で再取得しているが、楽観的ロックによる競合検出がない
- Server Actions に冪等性キーの仕組みがなく、同一リクエストの再送を検出できない

影響範囲：

- スキーマ: `requests`, `approval_steps` テーブル（version カラム追加）、`idempotency_keys` テーブル新設
- ドメインモデル: `Request` 型、`ApprovalStep` 型に `version` フィールド追加
- Repository: `requestRepository`, `approvalStepRepository` の `updateStatus` に version 条件追加
- Usecase: `approveRequest`, `rejectRequest`, `submitRequest`, `resubmitRequest` に楽観的ロック統合
- Server Actions: `requests.ts` の各 action に冪等性キーパラメータ追加
- Infrastructure: `idempotencyKeyRepository` 新設
- UI: 承認・却下・差し戻し・再申請ボタンで冪等性キーを生成して送信

## Goals / Non-Goals

**Goals**:

- 同一リソースへの並行更新を version カラムで検出し、後着の更新を安全に拒否する
- 同一操作の重複実行（二重クリック、リトライ）を冪等性キーで防止し、前回の結果を返す
- 既存のテスト・ビルドを壊さない
- 依存方向 `actions → usecases → domain / infrastructure` を維持する

**Non-Goals**:

- 冪等性キーの TTL（自動期限切れ）
- 冪等性キーの手動クリーンアップ UI
- ペシミスティックロック（SELECT FOR UPDATE）
- 申請作成（createRequest）の冪等性

## Decisions

### D1: 楽観的ロック — integer version カラム

`requests` テーブルと `approval_steps` テーブルに `version integer NOT NULL DEFAULT 1` を追加する。

UPDATE 時に `WHERE ... AND version = :expectedVersion` を条件に含め、同時に `SET version = version + 1` でインクリメントする。更新行数が 0 の場合は楽観的ロック競合として扱う。

- **Rationale**: integer version は timestamp ベースより精度に依存せず確実。承認ワークフローの同時操作頻度は低く、楽観的ロックが最適。
- **Alternatives considered**:
  - `updatedAt` timestamp ベースの楽観的ロック — ミリ秒以下の同時更新で衝突を検出できないリスク。却下。
  - ペシミスティックロック（SELECT FOR UPDATE）— トランザクション保持時間が長くなりデッドロックリスク。却下。

### D2: 楽観的ロック競合時のエラーハンドリング

Repository の `updateStatus` が `null` を返す（更新行数 0）ことで楽観的ロック失敗を通知する。Usecase 層で `null` を検出し `{ ok: false, reason: "この申請は他のユーザーによって更新されました。画面を更新してください" }` を返す。

- **Rationale**: 既存のエラーパターン（Result 型）に合致する。専用の例外クラスを新設する必要がない。
- **Alternatives considered**:
  - 専用例外 `OptimisticLockError` を throw — usecase 層の catch で分岐が必要。既存パターンと一貫性がない。却下。

### D3: version フィールドの Repository 責務

`mapRow` 関数で DB 行からドメインモデルに `version` をマッピングする。version のインクリメント（`SET version = version + 1`）は Repository 内の SQL で行い、usecase が version の計算を行わない。

- **Rationale**: version 管理は永続化の関心事。ドメインモデルは version を「読み取り専用の楽観的ロックトークン」として保持するだけ。
- **Alternatives considered**:
  - Usecase で `version + 1` を計算して Repository に渡す — Repository の責務境界を超える。却下。

### D4: 冪等性キーを DB テーブルで管理

`idempotency_keys` テーブルを新設する。カラム: `id` (uuid PK), `key` (text, unique), `action` (text), `result` (jsonb), `organizationId` (FK), `createdAt` (timestamp)。

- **Rationale**: Redis 等の追加インフラ不要。デモ/初期段階では DB テーブルで十分。TTL は将来 cron で古いキーを削除する想定。
- **Alternatives considered**:
  - Redis — 追加インフラ依存。現時点では過剰。却下。
  - インメモリキャッシュ — プロセス再起動で失われる。却下。

### D5: 冪等性チェックの実行場所 — Server Actions 層

冪等性キーのチェック・保存は Server Actions 層（`requests.ts`）で行う。Usecase 層には冪等性の概念を持ち込まない。

Server Action の先頭で `idempotencyKeyRepository.findByKey(key)` を呼び、既存ならば保存済み result を即座に返す。存在しなければ usecase を実行し、結果を `idempotencyKeyRepository.create(key, action, result)` で保存する。

- **Rationale**: 冪等性はリクエスト重複検出というインフラ横断的関心事。Usecase はビジネスロジックに集中すべき。依存方向 `actions → usecases → infrastructure` を維持できる。
- **Alternatives considered**:
  - Usecase 層で冪等性チェック — usecase にインフラ的関心事が混入する。却下。
  - Middleware — Next.js Server Actions には middleware hook がない。却下。

### D6: 冪等性キーの生成場所 — クライアント側

UI コンポーネント（承認・却下・差し戻し・再申請ボタン）のクリック時に UUID v4 を生成し、hidden input で Server Action に渡す。ボタンの `disabled` 制御（submit 中は無効化）と併用する。

ページを Server Component から Client Component に部分的に切り出し、ボタン群を Client Component 化する。

- **Rationale**: 冪等性キーはクライアントが操作意図を一意に識別するもの。サーバー側で生成すると意味がない。
- **Alternatives considered**:
  - サーバー側で生成してフォームに埋め込む — ページリロードで新しいキーが付与され、二重クリック防止にならない。却下。

### D7: resetSteps の version 処理

`approvalStepRepository.resetSteps` は複数行を一括更新する関数であり、個別の version チェックは行わない。代わりに全対象行の `version` もインクリメントする（`SET version = version + 1`）。

- **Rationale**: resetSteps は resubmitRequest 内のトランザクションで呼ばれ、対象ステップは全て pending にリセットされる。個別の楽観的ロック検証は不要（resubmit 時の request 自体の version チェックで競合は検出される）。
- **Alternatives considered**:
  - resetSteps でも各行の version をチェック — 一括更新の複雑性が増す割に実質的なメリットがない。却下。

## Risks / Trade-offs

[Risk] 冪等性キーの蓄積によるテーブル肥大化
→ Mitigation: TTL はスコープ外だが、将来 cron ジョブで `createdAt < NOW() - INTERVAL '30 days'` のキーを削除する。テーブルには `createdAt` カラムがあるため対応可能。

[Risk] 楽観的ロック競合時の UX — ユーザーに「画面を更新してください」と表示するだけ
→ Mitigation: 承認ワークフローの同時操作頻度は低い。競合が発生した場合は最新データの再取得を促すことで十分。将来的にリアルタイム通知を導入する余地はある。

[Risk] Server Component → Client Component 切り出しによるバンドルサイズ増加
→ Mitigation: ボタン群のみを Client Component にし、ページ本体は Server Component のままにする。影響は軽微。

[Trade-off] 冪等性キーの結果保存で Server Action の戻り値全体を jsonb に格納する
→ 構造が変わった場合に古い結果との互換性の問題があるが、TTL で古いキーが削除される前提であれば問題ない。

## Open Questions

なし（architect の設計判断が全ての主要論点をカバー済み）。
