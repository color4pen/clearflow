# Design: MCP ツール — 経理系（契約・請求・売上）

## Context

mcp-server-core（#158）で MCP サーバー基盤と第一弾ツール群（inquiries / deals / clients）が、mcp-tools-activity（#161）で第二弾ツール群（interactions / tasks / watches / notifications）が確立された。本変更は第三弾として、受注後の経理業務を構成する 4 リソースのツールを追加する。

現在の MCP ツール構成:

| ファイル | リソース | operation 数 |
|---|---|---|
| `tools/inquiries.ts` | 引合 | 5 |
| `tools/deals.ts` | 案件 | 6 |
| `tools/clients.ts` | 顧客 | 9 |
| `tools/interactions.ts` | 顧客接点 | 4 |
| `tools/tasks.ts` | タスク | 7 |
| `tools/watches.ts` | ウォッチ | 2 |
| `tools/notifications.ts` | 通知 | 2 |

対応する Server Action と usecase は全て実装済み:

- **contracts** — `createContract` / `updateContract` / `updateContractStatus` / `deleteContract` / `listContracts` / `getContract`。楽観的ロック（version）あり。
- **invoices** — `createInvoice` / `updateInvoice` / `updateInvoiceStatus` / `listInvoicesByContract` / `listInvoicesByOrganization` / `getInvoice`。楽観的ロック（version）あり。
- **revenue（読み取り）** — `getRevenueDashboard` / `getRevenueDetails` / `getRevenueForecast`。独自テーブルを持たず案件・契約・請求を横断集計する。
- **revenue_targets** — `setRevenueTarget` / `updateRevenueTarget` / `deleteRevenueTarget`。楽観的ロック（version）あり。

認可マトリクス（`domain/authorization.ts`）の該当部分:

| エンティティ | 操作 | 許可ロール |
|---|---|---|
| contract | list, view | ALL_ROLES |
| contract | create, edit, changeStatus | admin, manager, finance |
| contract | delete | admin |
| invoice | list, view | ALL_ROLES |
| invoice | create, edit, changeStatus | admin, finance |
| revenue | view | ALL_ROLES |
| revenue | setTarget | admin, manager |

## Goals / Non-Goals

**Goals**:

- 4 つの MCP ツール（contracts / invoices / revenue / revenue_targets）を追加し、経理業務の UI パリティを実現する
- 全ツールで mcp-server-core のパリティ規約を遵守する（usecase 共有・canPerform 認可・テナント分離・監査記録・レート制限）
- 楽観的ロック衝突を再取得を促すツールエラーとして明確に返す
- 実行検証（behavioral test）で全受け入れ基準を固定する
- `route.ts` にツール登録を追加するのみで、基盤コードの変更は不要

**Non-Goals**:

- 承認系・管理系ツール — 後続 request
- 請求書 PDF 生成・CSV エクスポート — ファイル応答は別途検討
- 新しい usecase や domain ロジックの追加 — 既存の usecase をそのまま呼ぶ
- 契約作成・解約の承認ゲート配線 — 現行の Server Action と同一挙動（未配線）

## Decisions

### D1: リソース単位 + operation 引数（集約方針の踏襲）

**決定**: mcp-server-core で確立した「1 リソース = 1 ツール、`operation` 引数で操作を切り替える」方針をそのまま踏襲する。contracts / invoices / revenue / revenue_targets の 4 ツール。

**Rationale**: 既に 7 ツールで定着しており、ツール発見性と一貫性を優先する。

### D2: contracts ツールの operation 設計

**決定**: `list` / `get` / `create` / `update` / `update_status` / `delete` の 6 operation。

**Rationale**: Server Action の 6 操作と 1:1 対応。`create` は `dealId` を必須とし、usecase 内で won 判定・金額検証・日付検証が行われる。`update_status` は `ContractStatus`（active → completed / cancelled）の遷移を usecase の `canContractTransition` に委ねる。

**Alternatives considered**:
- `list` にフィルタ引数を追加する → 現行の `listContracts` がフィルタなしなので不要
- `get` を省略する → 契約詳細（version 含む）を確認する手段が必要

### D3: invoices ツールの operation 設計

**決定**: `list` / `create` / `update` / `update_status` の 4 operation。

**Rationale**: request の仕様どおり。`list` は `contractId` の有無で `listInvoicesByContract` と `listInvoicesByOrganization` を切り替える。`listInvoicesByOrganization` は `status` / `paidAtFrom` / `paidAtTo` / `issueDateFrom` / `issueDateTo` のフィルタを公開する。`update_status` は `paidAt`（入金日）を optional 引数で受け取る。

**Alternatives considered**:
- `get` を追加する → request のスコープ外。list が全フィールドを返すため最低限カバーされる
- `delete` を追加する → request のスコープ外。admin のみの操作で後続 request に含める

### D4: revenue ツールの operation 設計（読み取り専用）

**決定**: `dashboard` / `details` / `forecast` の 3 operation。全て読み取り専用。

- `dashboard`: `getRevenueDashboard` を呼ぶ。引数なし（usecase 内で当月・過去 12 ヶ月を計算）
- `details`: `getRevenueDetails` を呼ぶ。`startDate`, `endDate`, `axis`（monthly / customer / deal）が必須
- `forecast`: `getRevenueForecast` を呼ぶ。`periodStart`, `periodEnd` が必須

**Rationale**: 人間の売上画面（`revenue/page.tsx`, `revenue/details/page.tsx`, `revenue/forecast/page.tsx`）と同一の usecase を共有する。売上は読み取り専用ドメイン（ADR-013）であり、書き込みは revenue_targets に限られる。

### D5: revenue_targets ツールの operation 設計

**決定**: `set` / `update` / `delete` の 3 operation。

**Rationale**: request の仕様どおり。`set` は新規作成、`update` は部分更新（version チェックあり）、`delete` は ID 指定削除。認可は全操作 `canPerform(role, "revenue", "setTarget")` で統一（Server Action と同一）。

**Alternatives considered**:
- `list` を追加する → request のスコープ外。目標一覧は `revenue` ツールの `forecast` で確認可能（`RevenueForecastItem.target` に `RevenueTarget` が含まれる）

### D6: 楽観的ロック衝突のエラー表現

**決定**: usecase が version 不一致で `{ ok: false, reason: "..." }` を返した場合、その reason をそのまま `toToolError` で返す。現行の usecase メッセージ（例: 「この契約は他のユーザーによって更新されました。画面を更新してください」）はエージェントにも十分理解可能であり、特別な変換は行わない。

**Rationale**: usecase のメッセージは業務文脈で制御されており、DB エラー等の内部詳細は含まれない。パリティ規約に従い usecase のメッセージをそのまま返す方が、MCP 層で独自のメッセージ変換ロジックを持つより保守性が高い。

**Alternatives considered**:
- usecase の reason を検査してバージョン衝突専用メッセージに変換する → メッセージ文字列への依存が脆弱。usecase 側のメッセージ変更に追従が必要になる

### D7: update 系ツールの undefined / null 区別

**決定**: mcp-server-core で確立した方針を踏襲する。update 系の optional フィールドは `undefined`（変更なし）と `null`（クリア）を区別する。Zod スキーマで `.nullable().optional()` を使用する。

**Rationale**: #158 の実装上の必須事項 4 に明記。contracts の `update` で contractType / endDate / paymentTerms / renewalCycle、invoices の `update` で issueDate / notes がクリア可能なフィールド。

### D8: テスト方針 — 実行検証を主軸とする

**決定**: 受け入れ基準のテストは全て `mock.module` で依存を差し替えてハンドラを実際に実行する behavioral test とする。ソース文字列照合テストは使用しない。

**Rationale**: #158 の実装上の必須事項 1 に明記。バレル（`@/application/usecases`）をモックせず個別ファイルをモックし、`afterAll` で復元する（必須事項 2）。

### D9: 承認ゲートの扱い

**決定**: 契約の create / update_status（解約）では承認ゲートを配線しない。現行の Server Action と同一挙動を採用する。

**Rationale**: request.md で明示的に注記されている。`contract.create` / `contract.cancel` は承認ポリシー定数に登録済みだが usecase 側で未配線。承認ゲート配線は後続 request の対象。

### D10: エラー変換で内部詳細を漏らさない

**決定**: usecase の `{ ok: false, reason }` は制御されたメッセージなので `toToolError(reason)` で返す。予期しない例外（DB エラー等）は `handleToolError(error)` で「内部エラーが発生しました」に変換する。usecase 内で exception が reason に混入する経路（`err.message`）はビジネスメッセージ（金額超過等）であり、DB 接続エラー等の技術詳細ではない。

**Rationale**: #158 の実装上の必須事項 3 に明記。既存ツール群と同一のエラー変換パターン。

## Risks / Trade-offs

**[Risk] usecase の version 衝突メッセージに「画面を更新してください」という UI 固有の文言が含まれる** → Mitigation: エージェントにとって意味は通じる（「最新データを取得して再試行」と解釈可能）。usecase のメッセージ統一は横断的な改善であり本 request のスコープ外。

**[Risk] invoices の list が organization 全体スキャンになりうる** → Mitigation: 既存の `listInvoicesByOrganization` usecase のパフォーマンス特性をそのまま引き継ぐ。フィルタ引数（status, 日付範囲）でスキャン量を制限できる。

**[Risk] revenue の dashboard / forecast が複数テーブルを横断集計する重いクエリ** → Mitigation: 既存の usecase がそのまま使われるため、パフォーマンス特性は UI と同一。改善は usecase レベルで行い MCP 固有の最適化はしない。

**[Risk] mock.module の汚染によるテスト間干渉** → Mitigation: バレル（`@/application/usecases`）をモックせず個別ファイルをモックする。`afterAll` で復元する。#158 の必須事項 2 に従う。

## Open Questions

なし。全ての設計判断は mcp-server-core の確立済み方針と request.md の明示的な注記に従う。
