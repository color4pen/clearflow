# ADR-005: 楽観的ロックと冪等性キーによる並行制御

- **Status**: accepted
- **Date**: 2026-06-18
- **Change**: optimistic-lock-idempotency
- **Deciders**: architect

---

## Context

Clearflow の承認ワークフローでは、同一承認ステップに対して2人の admin が同時に承認操作を行うと両方が成功し、ステップが二重承認される可能性があった。またネットワーク遅延によるユーザーの二重クリックでも同じ操作が2回実行されるリスクがあった。

本変更以前の問題点:

- `requestRepository.updateStatus` / `approvalStepRepository.updateStatus` は `id + organizationId` のみで WHERE し、競合検出がない
- `approveRequest` usecase はトランザクション内で再取得しているが、楽観的ロックによる競合検出がない
- Server Actions に冪等性キーの仕組みがなく、同一リクエストの再送を検出できない

本変更では2つの独立したメカニズムを導入する:

1. **楽観的ロック**: `requests` / `approval_steps` テーブルへの integer `version` カラム追加と、UPDATE 時の `WHERE version = expectedVersion` による競合検出
2. **冪等性キー**: `idempotency_keys` テーブル新設と、Server Actions 層での重複リクエスト検出

---

## Decisions

### D1: 楽観的ロック — integer version カラムを採用

**Decision**: `requests` テーブルと `approval_steps` テーブルに `version integer NOT NULL DEFAULT 1` を追加する。UPDATE 時に `WHERE ... AND version = :expectedVersion` を条件に含め、同時に `SET version = version + 1` でインクリメントする。更新行数が 0 の場合は楽観的ロック競合として扱う。

**Rationale**: integer version は timestamp ベースより精度に依存せず確実。承認ワークフローの同時操作頻度は低く、ロック取得コストなしに競合を検出できる楽観的ロックが最適。

#### Alternative 1: `updatedAt` timestamp ベースの楽観的ロック

| | |
|---|---|
| **Pros** | 既存の `updatedAt` カラムを流用でき、スキーマ変更が最小限 |
| **Cons** | ミリ秒以下の精度で同時更新が発生すると衝突を検出できない。DB サーバーのクロック精度に依存する |
| **Why not** | 信頼性が精度に依存するため、確実性を求める並行制御には不適切 |

#### Alternative 2: ペシミスティックロック（SELECT FOR UPDATE）

| | |
|---|---|
| **Pros** | 競合が確実に回避できる。衝突発生時のリトライ実装が不要 |
| **Cons** | トランザクション保持時間が長くなり、デッドロックリスクが増加する。並行リクエスト数が増えるとスループットが低下する |
| **Why not** | 承認ワークフローの同時操作頻度は低く、ペシミスティックロックのコストを正当化しない |

---

### D2: 楽観的ロック競合の通知 — null 返却パターン

**Decision**: Repository の `updateStatus` が更新行数 0 の場合に `null` を返すことで楽観的ロック失敗を通知する。Usecase 層で `null` を検出し `{ ok: false, reason: "この申請は他のユーザーによって更新されました。画面を更新してください" }` を返す。

**Rationale**: 既存のエラーパターン（Result 型）に合致する。専用の例外クラスを新設する必要がなく、usecase の catch ロジックをシンプルに保てる。

#### Alternative 1: 専用例外 `OptimisticLockError` を throw

| | |
|---|---|
| **Pros** | エラーの意図が型で明示されるため、呼び出し元での分岐が型安全になる |
| **Cons** | usecase 層に新しい catch 分岐が必要。既存の Result 型パターンと一貫性がない |
| **Why not** | 既存パターンとの一貫性を優先し、例外クラスの新設コストを避ける |

---

### D3: version 管理は Repository の責務

**Decision**: `mapRow` 関数で DB 行からドメインモデルに `version` をマッピングする。version のインクリメント（`SET version = version + 1`）は Repository 内の SQL で行い、usecase は version の計算を行わない。

**Rationale**: version 管理は永続化の関心事。ドメインモデルは version を「読み取り専用の楽観的ロックトークン」として保持するだけにすることで、usecase の責務を明確に保てる。

#### Alternative 1: Usecase で `version + 1` を計算して Repository に渡す

| | |
|---|---|
| **Pros** | Repository のインターフェースがシンプルになる |
| **Cons** | usecase が永続化実装の詳細（version インクリメント）を知る必要がある。Repository の責務境界を超える |
| **Why not** | 永続化の詳細はインフラ層に閉じるべきであるため |

---

### D4: 冪等性キーを DB テーブルで管理

**Decision**: `idempotency_keys` テーブルを新設する。カラム: `id` (uuid PK)、`key` (text, unique)、`action` (text)、`result` (jsonb)、`organizationId` (FK)、`createdAt` (timestamp)。TTL は将来 cron で古いキーを削除する想定。

**Rationale**: Redis 等の追加インフラ不要。デモ/初期段階では DB テーブルで十分。`createdAt` カラムを保持しているため、将来 `createdAt < NOW() - INTERVAL '30 days'` 条件で cron 削除を実装できる。

#### Alternative 1: Redis によるキー管理

| | |
|---|---|
| **Pros** | TTL をネイティブに設定できる。高速なキールックアップ |
| **Cons** | 追加インフラ依存。デモ/初期段階では過剰投資 |
| **Why not** | 現時点の規模では DB テーブルで十分なパフォーマンスが得られる |

#### Alternative 2: インメモリキャッシュ

| | |
|---|---|
| **Pros** | 実装が最もシンプル |
| **Cons** | プロセス再起動でキャッシュが失われる。複数インスタンス構成では機能しない |
| **Why not** | 冪等性保証が持続性を必要とするため、永続化ストレージが必須 |

---

### D5: 冪等性チェックの実行場所 — Server Actions 層

**Decision**: 冪等性キーのチェック・保存は Server Actions 層（`requests.ts`）で行う。Usecase 層には冪等性の概念を持ち込まない。Server Action の先頭で `idempotencyKeyRepository.findByKey(key)` を呼び、既存ならば保存済み result を即座に返す。存在しなければ usecase を実行し、結果を `idempotencyKeyRepository.create(key, action, result)` で保存する。

**Rationale**: 冪等性はリクエスト重複検出というインフラ横断的関心事。Usecase はビジネスロジックに集中すべきであり、依存方向 `actions → usecases → domain / infrastructure` を維持できる。

#### Alternative 1: Usecase 層で冪等性チェック

| | |
|---|---|
| **Pros** | ビジネスロジックと冪等性保証が同じ層に集約される |
| **Cons** | usecase にインフラ的関心事（リクエスト重複検出）が混入する。依存方向の原則が崩れる |
| **Why not** | usecase の責務境界を汚染し、テスト容易性が低下するため |

#### Alternative 2: Middleware による横断的実装

| | |
|---|---|
| **Pros** | Server Actions と完全に分離された横断的関心事として管理できる |
| **Cons** | Next.js Server Actions には middleware hook が存在しない。実現不可能 |
| **Why not** | 技術的に実現できないため |

---

### D6: 冪等性キーの生成場所 — クライアント側

**Decision**: UI コンポーネント（承認・却下・差し戻し・再申請ボタン）のクリック時に `crypto.randomUUID()` で冪等性キーを生成し、hidden input で Server Action に渡す。`useFormStatus` による送信中の disabled 制御と併用する。ページ詳細の Action ボタン群を Server Component から Client Component に切り出す。

**Rationale**: 冪等性キーはクライアントの操作意図を一意に識別するもの。サーバー側で生成すると、ページリロードごとに新しいキーが付与されてしまい二重クリック防止の目的を果たせない。

#### Alternative 1: サーバー側で生成してフォームに埋め込む

| | |
|---|---|
| **Pros** | クライアント JavaScript なしで冪等性キーを生成できる |
| **Cons** | ページリロードで新しいキーが付与される。二重クリック（再送ではなく同一フォーム送信）を防止できない |
| **Why not** | 冪等性の目的（同一操作意図の識別）を達成できないため |

---

### D7: `resetSteps` の version 処理 — 個別チェックなし

**Decision**: `approvalStepRepository.resetSteps` は複数行を一括更新する関数であり、個別の version チェックは行わない。全対象行の `version` をインクリメントする（`SET version = version + 1`）。

**Rationale**: `resetSteps` は `resubmitRequest` 内のトランザクションで呼ばれ、対象ステップは全て pending にリセットされる。`resubmitRequest` 自体の request version チェックで競合は検出されるため、個別ステップの楽観的ロック検証は不要。

#### Alternative 1: `resetSteps` でも各行の version をチェック

| | |
|---|---|
| **Pros** | より厳密な競合検出が可能 |
| **Cons** | 一括更新の実装が複雑化する割に、実質的なメリットがない。外側の request version チェックで競合は既に検出されている |
| **Why not** | 複雑性のコストが検出精度の向上を正当化しないため |

---

## Consequences

### Positive

- 同一リソースへの並行更新を version カラムで検出し、後着の更新を安全に拒否できる
- 同一操作の重複実行（二重クリック、TCP 再送等）を冪等性キーで防止し、前回の結果を返せる
- 依存方向 `actions → usecases → domain / infrastructure` を維持したまま冪等性保証を実装できた
- usecase 層には冪等性の概念が混入せず、テスト容易性が保たれる

### Negative / Trade-offs

- `idempotency_keys` テーブルの蓄積によるストレージ増加（TTL がスコープ外のため）
- 楽観的ロック競合時は「画面を更新してください」というメッセージをユーザーに表示するのみ（自動リトライなし）
- ページ詳細の Action ボタン群を Client Component に切り出すことによる軽微なバンドルサイズ増加
- 冪等性キーの `result` を jsonb で保存するため、Server Action の戻り値スキーマが変わった場合に古いキャッシュとの互換性問題が発生し得る（TTL 導入前は古いキーが蓄積する）

### Constraints for future changes

- **TTL 実装時**: `idempotency_keys` テーブルの `createdAt` カラムを条件に `createdAt < NOW() - INTERVAL '30 days'` などで cron 削除を実装すること
- **新規状態変更操作追加時**: 承認・却下・差し戻し・再申請以外の状態変更操作を追加する場合、Server Action に `idempotencyKey` パラメータを追加し、同様のチェック・保存パターンに従うこと
- **楽観的ロック対象テーブル追加時**: 新規テーブルに楽観的ロックを適用する場合、`version integer NOT NULL DEFAULT 1` カラムと `WHERE version = expectedVersion AND SET version = version + 1` パターンに従うこと
- **スケールアウト時**: 冪等性キーの INSERT が並行した場合、PostgreSQL の unique constraint 違反（`code: '23505'`）を catch し、`findByKey` で既存結果を返すか `INSERT ... ON CONFLICT DO NOTHING` パターンを採用すること

### Known Design Debt

- 冪等性キーの TTL（自動期限切れ）が未実装。テーブル肥大化の対策として将来 cron ジョブの実装が必要（`idempotency_keys.createdAt` で対応可能）

---

## References

- `specrunner/changes/optimistic-lock-idempotency/design.md` — 詳細設計（D1〜D7）
- `specrunner/changes/optimistic-lock-idempotency/spec.md` — ビヘイビア仕様
- `specrunner/changes/optimistic-lock-idempotency/request.md` — 要件定義
- `src/infrastructure/schema.ts` — `requests` / `approval_steps` の `version` カラム、`idempotencyKeys` テーブル定義
- `src/domain/models/request.ts` — `Request` 型への `version: number` 追加
- `src/domain/models/approvalStep.ts` — `ApprovalStep` 型への `version: number` 追加
- `src/infrastructure/repositories/requestRepository.ts` — `updateStatus` の楽観的ロック実装
- `src/infrastructure/repositories/approvalStepRepository.ts` — `updateStatus` / `resetSteps` の楽観的ロック実装
- `src/infrastructure/repositories/idempotencyKeyRepository.ts` — 冪等性キー CRUD 実装
- `src/app/actions/requests.ts` — `idempotencyKey` パラメータ追加と冪等性チェック実装
- `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` — クライアント側冪等性キー生成と disabled 制御
