# Design: 契約・請求の楽観的ロック

## Context

楽観的ロック（version カラムによる競合検出）は requests / approval_steps / deals / inquiries に導入済みだが、金額を扱う contracts / invoices は未対応。2人の担当者が同じ契約・請求を同時に更新した場合、後勝ちで一方の変更が無言で失われる。ADR-005 で確立済みのパターンを横展開し、財務エンティティの同時更新競合を検出してフィードバックする。

### 既存パターン（参照先）

- `deals.version` — `dealRepository.updatePhase` で `eq(deals.version, currentVersion)` + `version: sql\`version + 1\`` を使用。`updateDealPhase` usecase で `deal.version` を保持し、更新行数 0 で `{ ok: false }` を返す。
- `inquiries.version` — `inquiryRepository.updateStatus` で同パターン。
- `requests.version` / `approvalSteps.version` — 同パターン。

### 現状

- `contracts` テーブルに version カラムがない（`updatedAt` のみ）
- `invoices` テーブルに version カラムがない
- `Contract` / `Invoice` 型に version フィールドがない
- `contractRepository.update` は `id + organizationId` で WHERE し version チェックなし
- `invoiceRepository.update` / `updateStatus` とも version チェックなし
- 4 つの更新 usecase（`updateContract` / `updateContractStatus` / `updateInvoice` / `updateInvoiceStatus`）は findById → update の流れで version を保持しない

## Goals / Non-Goals

**Goals**:

- contracts / invoices テーブルに `version integer NOT NULL DEFAULT 1` を差分マイグレーションで追加する
- Contract 型 / Invoice 型に `version: number` を追加する
- 全更新経路（contractRepository.update / invoiceRepository.update / invoiceRepository.updateStatus）の WHERE 条件に `version = expectedVersion` を追加し、SET で `version + 1` する
- 4 usecase（updateContract / updateContractStatus / updateInvoice / updateInvoiceStatus）でロック失敗時に `{ ok: false, reason: "..." }` を返す
- 作成時に version が 1 で始まることを保証する
- 既存テスト・ビルド・型チェックが壊れないことを確認する

**Non-Goals**:

- meetings / clients / action_items 等の他エンティティへの横展開
- version 衝突時の UI 側マージ・自動再取得 UX
- クライアント側での version 持ち回り（hidden field 等）
- ペシミスティックロック（SELECT FOR UPDATE）
- 冪等性キー

## Decisions

### D1: version(integer) による楽観的ロックを踏襲する

**Rationale**: ADR-005 と同一根拠。timestamp ベースはミリ秒以下の同時更新で精度に依存し信頼性が低い。既存の requests / approval_steps / deals / inquiries と一貫した方式にする。

**Alternatives considered**: `updatedAt` ベースの楽観的ロック → ミリ秒精度の衝突リスクがあるため却下。

### D2: 差分マイグレーション（ADD COLUMN ... DEFAULT 1）を採用する

**Rationale**: 既存データの保持が必須（プロジェクト規律: DB リセット禁止）。`DEFAULT 1` で既存行に安全に version を付与できる。Drizzle `generate` でマイグレーション SQL を生成し、手書きと同じ `ALTER TABLE ADD COLUMN` になることを確認する。

**Alternatives considered**: テーブル再作成 → 既存データが失われるため却下。

### D3: リポジトリの update 関数のシグネチャに `expectedVersion: number` を追加する

**Rationale**: deals の `updatePhase` パターンと異なり、contracts / invoices は汎用 `update` 関数 1 つで全フィールド更新を処理する。シグネチャに `expectedVersion` を独立パラメータとして追加し、WHERE 条件に含める。`data` の Partial 内に混ぜない（version は呼び出し元が意図的に渡すべき制御パラメータであり、更新対象フィールドではないため）。

**Alternatives considered**: data オブジェクト内に `version` を含める → 更新対象データと制御パラメータが混在し、Partial で optional になってしまうため却下。

### D4: ロック失敗は Result の `ok: false` で返す

**Rationale**: usecase の戻り値は Result 型が規約。例外はインフラ障害に限定する。既存の updateDealPhase が `{ ok: false, reason: "この案件は他のユーザーによって更新されました" }` を返すパターンを踏襲する。

**Alternatives considered**: 専用の OptimisticLockError 例外を throw → プロジェクト規約違反のため却下。

### D5: 楽観的ロックの文言は entities に応じて調整する

**Rationale**: contracts では「この契約は他のユーザーによって更新されました。画面を更新してください」、invoices では「この請求は...」とする。deals の既存パターン（「この案件は他のユーザーによって更新されました」）と同じ構造で entity 名のみ変更する。

### D6: create 経路の version 初期値は schema の DEFAULT で保証する

**Rationale**: `contracts` / `invoices` テーブルの schema 定義に `integer("version").notNull().default(1)` を追加する。`contractRepository.create` / `invoiceRepository.create` の insert で明示的に version を指定しない場合、DB のデフォルト値 1 が適用される。ドメインモデルの mapRow で `version: row.version` をマッピングすれば create の戻り値にも version が含まれる。

## Risks / Trade-offs

[Risk] **既存テストの version フィールド未考慮** → mapRow に version を追加すると、テストでモック等を使っている場合に型エラーが発生する可能性がある。  
Mitigation: 型エラーがあれば修正する。既存テストは主に静的コード解析（optimisticLock.test.ts）やドメインロジック単体テストであり、Contract / Invoice 型のモックは限定的。

[Risk] **マイグレーションの適用順序** → Drizzle generate で生成されるマイグレーションファイルの番号（0009）が他の並行作業と衝突する可能性がある。  
Mitigation: マージ時に番号を調整する。schema.ts のソースオブトゥルースは衝突しにくい（追加的変更のみ）。

## Open Questions

なし。ADR-005 で確立済みのパターンの横展開であり、新規の設計判断は不要。
