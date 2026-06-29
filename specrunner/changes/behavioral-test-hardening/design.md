# Design: behavioral-test-hardening

## Context

管理者ロックアウト防止・ユーザー作成・パスワード変更・無効化/再有効化の振る舞いは、既存テスト（`userManagement.test.ts`, `accountSettings.test.ts`）で `readSrc` + `toContain` による静的検査でカバーされている。これはソースコード上に特定の文字列が存在するかを確認するのみで、ロジックを実行して検証していない。

プロジェクトには `provisionOrganization.dynamic.test.ts` で確立された `.dynamic.test.ts` パターンがあり、`mock.module` で repository/db をモックし usecase を実行して戻り値・呼び出し引数・監査を assert する方式で behavioral テストを実現している。

本変更は、4 つの usecase（`updateUserRole`, `deactivateUser`, `reactivateUser`, `createUser`, `changeOwnPassword`）に対して同方式の behavioral テストを追加し、回帰検知の安全網を強化する。実装コードへの変更は一切行わない。

## Goals / Non-Goals

**Goals**:

- `updateUserRole` の自己降格ガード・最後の admin 降格ガード・成功パスを behavioral テストで固定する
- `deactivateUser` の自己無効化ガード・最後の admin 無効化ガード・成功パスを固定する
- `reactivateUser` の成功パス・既に有効なユーザーへの拒否を固定する
- `createUser` の email 重複拒否・23505 フォールバック・成功パス（bcrypt ハッシュ + 監査）を固定する
- `changeOwnPassword` の現在パスワード不一致拒否・成功パス（bcrypt hash + 監査）を固定する
- 全テストが既存の `.dynamic.test.ts` 作法に準拠する

**Non-Goals**:

- 実装コード（usecase / repository / UI）への変更
- A1 テナント分離の検証（repository クエリ構築は mock ベースで固定困難）
- 新しいテストインフラの導入（既存の `bun:test` + `mock.module` を使用）
- 既存の静的テスト（`userManagement.test.ts`, `accountSettings.test.ts`）の削除（behavioral 版が追加されれば静的の残置は許容）

## Decisions

### D1: usecase ごとに独立した `.dynamic.test.ts` ファイルを作成する

**Rationale**: `provisionOrganization.dynamic.test.ts` の確立パターンに従う。`mock.module` はファイルスコープで作用するため、テストファイル間のモック汚染を防ぐには独立ファイルが最も安全。`deactivateUser` と `reactivateUser` は同じ repository 関数群をモックするが、ガード条件・監査 action が異なるためファイルを分離する。

**Alternatives**: (a) 1 ファイルに全 usecase をまとめる — モック状態の競合リスクが高い。(b) `deactivateUser` と `reactivateUser` を 1 ファイルにまとめる — 可能だが、他の dynamic test が 1 usecase = 1 ファイルで統一されているため不整合になる。

### D2: 個別ファイルモック（バレル `@/infrastructure/repositories` はモックしない）

**Rationale**: `provisionOrganization.dynamic.test.ts` の確立パターン。バレルをモックすると全 repository の実装が上書きされ、他テストとのモック汚染リスクがある。個別ファイル（`@/infrastructure/repositories/userRepository` 等）をモックすることで、必要最小限のスタブに留める。

**Alternatives**: バレルをモック — `watchDeal.dynamic.test.ts` はバレルをモックしているが、これは異なる repository（`dealRepository`, `watchRepository`）を使うため。本変更の対象 usecase は全て `userRepository` を使い、`provisionOrganization` と同じモック構成になるため個別ファイルモックが適切。

### D3: `bcryptjs` のモックは compare/hash の戻り値を state で制御する

**Rationale**: `changeOwnPassword` と `createUser` は `bcrypt.compare` / `bcrypt.hash` を使う。`provisionOrganization.dynamic.test.ts` では `hash` を固定値返却でモックしている。`changeOwnPassword` のテストでは `compare` の戻り値を true/false で切り替える必要があるため、`state.bcryptCompareResult` で制御する。

**Alternatives**: bcrypt をモックせず実際にハッシュ — テスト実行時間が増加し、ハッシュ値の assert が困難になる。

### D4: 既存の静的テストは変更しない

**Rationale**: 要件 #5 で「置換または整理してよい（重複の残置も可）」とあるが、静的テストは別の観点（ソース構造の契約）を提供しており、削除のリスク（将来の refactor で静的チェックが有用になる可能性）に対してメリットが薄い。behavioral テストの追加のみで受け入れ基準を満たす。

**Alternatives**: 静的テストを削除 — 不要な変更範囲の拡大。静的テストの一部を behavioral に移行 — 可能だが、本変更のスコープを超える。

## Risks / Trade-offs

[Risk] `mock.module` の評価順序に依存するテストが壊れやすい → Mitigation: 各テストファイルで `mock.module` を静的 import より前に配置する確立パターンに厳密に従う。`beforeEach` で state をリセットする。

[Risk] usecase の内部実装変更（例: ガード順序の入れ替え）でテストが通り続ける可能性 → Mitigation: behavioral テストは戻り値と副作用（repository 呼び出し引数・監査 action）を検証するため、内部実装の詳細には依存しない。振る舞いが変わればテストが検知する。

## Open Questions

なし。設計判断は architect 評価済み。
