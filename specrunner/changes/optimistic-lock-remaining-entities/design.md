# Design: 残りの更新系エンティティの楽観的ロック（会議・アクションアイテム・売上目標）

## Context

楽観的ロックは ADR-005 で設計パターンが確立され、requests / approval_steps / inquiries / deals / contracts / invoices の 6 エンティティに導入済み。パターンは統一されており、各エンティティで以下の構造を持つ:

1. **スキーマ**: `version integer NOT NULL DEFAULT 1` カラム
2. **ドメインモデル**: `version: number` フィールド
3. **リポジトリ mapRow**: `version: row.version` マッピング
4. **リポジトリ update**: WHERE に `eq(table.version, expectedVersion)` を追加し、SET で `version: sql\`version + 1\`` をインクリメント。更新行数 0 = ロック失敗（null 返却）
5. **usecase**: findById で取得した version を update に渡し、null 返却時に `{ ok: false, reason: "この<対象>は他のユーザーによって更新されました。画面を更新してください" }` を返す

update usecase を持つ残りの 3 エンティティ — meetings / action_items / revenue_targets — は未対応。同時更新で後勝ちにより変更が無言で失われるリスクがある。

### 現状の対象ファイル

| レイヤー | Meeting | ActionItem | RevenueTarget |
|----------|---------|------------|---------------|
| スキーマ | `meetings` — version なし | `action_items` — version なし | `revenue_targets` — version なし |
| モデル | `Meeting` 型 — version なし | `ActionItem` 型 — version なし | `RevenueTarget` 型 — version なし |
| リポジトリ | `meetingRepository.update` — id + orgId のみで WHERE | `actionItemRepository.update` — id + orgId のみで WHERE | `revenueTargetRepository.update` — id + orgId のみで WHERE |
| usecase | `updateMeeting` | `updateActionItem`, `toggleActionItemDone` | `updateRevenueTarget` |

action_items の特殊性: `updateActionItem` と `toggleActionItemDone` はいずれも `actionItemRepository.update` を経由するため、リポジトリの 1 メソッドを version 化すれば両 usecase をカバーできる。

## Goals / Non-Goals

**Goals**:

- meetings / action_items / revenue_targets に楽観的ロックを導入し、同時更新時の無言上書きを防止する
- 既存の楽観的ロックパターン（ADR-005）を忠実に踏襲し、実装の一貫性を維持する
- update usecase を持つ全エンティティに楽観的ロックを行き渡らせてロールアウトを完了する

**Non-Goals**:

- update usecase を持たないエンティティ（clients / client_contacts / deal_contacts 等）への適用
- version 衝突時の UI 側マージ・自動再取得
- クライアント側の version 持ち回り（別変更で対応）
- ペシミスティックロック

## Decisions

### D1: version(integer) カラムを使用する

**Rationale**: ADR-005 で確立済みのパターンと一致させる。updatedAt ベースの楽観的ロックは精度が低く（ミリ秒単位の衝突検出漏れ）、既存実装との一貫性も損なう。

**Alternatives considered**: `updatedAt` タイムスタンプ比較 — 却下。精度問題と既存パターンとの不一致。

### D2: 差分マイグレーション（ALTER TABLE ADD COLUMN）を使用する

**Rationale**: 既存データ保持が必須（DB リセット禁止）。`ALTER TABLE ... ADD COLUMN ... DEFAULT 1` により既存行に version = 1 が付与される。PostgreSQL ではこの操作はテーブルロックを最小限に抑える。

**Alternatives considered**: テーブル再作成 — 却下。データ消失リスク。

### D3: ロック失敗は Result の ok: false で返す

**Rationale**: プロジェクト規約で usecase は Result 型を返す。例外はインフラ障害に限定。既存の楽観的ロック実装（updateContract, updateInvoice 等）と同じパターン。

**Alternatives considered**: 例外送出（OptimisticLockException） — 却下。規約違反。

### D4: actionItemRepository.update の 1 メソッド version 化で updateActionItem と toggleActionItemDone の両方をカバーする

**Rationale**: 両 usecase は `actionItemRepository.update` を共有している。リポジトリの update メソッドに `expectedVersion` パラメータを追加するだけで、呼び出し元の両 usecase が自然に楽観的ロックを受ける。

**Alternatives considered**: usecase ごとに個別のリポジトリメソッドを作成 — 却下。冗長であり、update メソッドが 1 つしかない現状と矛盾する。

### D5: ロック失敗メッセージはエンティティ固有の日本語メッセージを使用する

**Rationale**: 既存実装の慣習に従う。`updateContract` は「この契約は他のユーザーによって更新されました。画面を更新してください」、`updateInvoice` は「この請求は…」のように対象を明示する。

- Meeting: 「この商談は他のユーザーによって更新されました。画面を更新してください」
- ActionItem: 「このアクションアイテムは他のユーザーによって更新されました。画面を更新してください」
- RevenueTarget: 「この売上目標は他のユーザーによって更新されました。画面を更新してください」

## Risks / Trade-offs

[Risk] 3 テーブル同時マイグレーションでの適用順序 → **Mitigation**: 1 つのマイグレーションファイルで 3 つの ALTER TABLE を実行。各文は独立しており順序依存なし。statement-breakpoint で区切る。

[Risk] actionItemRepository.update のシグネチャ変更が既存テスト・呼び出し元に影響 → **Mitigation**: `expectedVersion` を update メソッドの最後の位置引数として追加する（tx の前）。呼び出し元は updateActionItem と toggleActionItemDone の 2 箇所のみで、両方を同時に更新する。

[Risk] findById と update 間の TOCTOU ギャップ → **Mitigation**: 楽観的ロック自体がこの問題への対処。version 不一致で安全に拒否される。これは既存パターンと同じ許容済みの設計。

## Open Questions

なし。既存パターンの横展開であり、新規の設計判断は不要。

## Migration Plan

1. `drizzle/0010_remaining_entity_version.sql` を作成:
   - `ALTER TABLE "meetings" ADD COLUMN "version" integer DEFAULT 1 NOT NULL`
   - `ALTER TABLE "action_items" ADD COLUMN "version" integer DEFAULT 1 NOT NULL`
   - `ALTER TABLE "revenue_targets" ADD COLUMN "version" integer DEFAULT 1 NOT NULL`
2. `drizzle/meta/_journal.json` に新エントリを追加
3. `drizzle/meta/0009_snapshot.json` を生成（Drizzle Kit）
4. `bun run drizzle-kit generate` ではなく手動で SQL を書くことで意図を明確にする（既存の 0009 と同様のアプローチ）
5. ロールバック: `ALTER TABLE ... DROP COLUMN "version"` で version カラムを削除可能（データ損失なし）
