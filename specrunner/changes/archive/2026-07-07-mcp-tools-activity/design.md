# Design: MCP ツール — 活動系（顧客接点・タスク・ウォッチ・通知）

## Context

mcp-server-core（#158）で MCP サーバー基盤（`/api/mcp`、Bearer 認証、ツール登録パターン、パリティ規約、エラー変換）と第一弾ツール群（inquiries / deals / clients）が確立された。本変更はその第二弾として、日常の営業活動を構成する 4 リソースのツールを追加する。

現在の MCP ツール構成:

| ファイル | リソース | operation 数 |
|---|---|---|
| `tools/inquiries.ts` | 引合 | 5 (list/create/update/update_status/delete) |
| `tools/deals.ts` | 案件 | 6 (list/get/create/update/update_phase/delete) |
| `tools/clients.ts` | 顧客 | 9 (list/get/create/update/add_contact/update_contact/delete_contact/add_deal_contact/remove_deal_contact) |

対応する Server Action と usecase は全て実装済み:

- **interactions** — `createMeeting` / `updateMeeting`（商談）、`createContractAdjustment` / `createInvoiceAdjustment`（調整記録）
- **tasks** — `createActionItem` / `updateActionItem` / `updateActionItemStatus` / `toggleActionItemDone` / `deleteActionItem` / `listActionItems` / `searchDeals` / `searchInquiries` / `searchMeetings`
- **watches** — `watchDeal` / `unwatchDeal`
- **notifications** — `getNotifications` / `markNotificationsAsRead`

## Goals / Non-Goals

**Goals**:

- 4 つの MCP ツール（interactions / tasks / watches / notifications）を追加し、UI パリティを実現する
- 全ツールで mcp-server-core のパリティ規約を遵守する（usecase 共有・canPerform 認可・テナント分離・監査記録・レート制限）
- 実行検証（behavioral test）で受け入れ基準を固定する
- `route.ts` にツール登録を追加するのみで、基盤コードの変更は不要

**Non-Goals**:

- 経理系（契約・請求・売上）・承認系・管理系ツール — 後続 request
- 通知のプッシュ配信（サーバー起点通知）— MCP は pull のみ
- 新しい usecase や domain ロジックの追加 — 既存の usecase をそのまま呼ぶ

## Decisions

### D1: リソース単位 + operation 引数（集約方針の踏襲）

**決定**: mcp-server-core で確立した「1 リソース = 1 ツール、`operation` 引数で操作を切り替える」方針をそのまま踏襲する。

**Rationale**: 既に inquiries / deals / clients で定着しており、ツール発見性と一貫性を優先する。operation ごとにツールを分割する案はツール数の爆発を招く。

### D2: interactions ツールの operation 設計

**決定**: `create_meeting` / `update_meeting` / `record_contract_adjustment` / `record_invoice_adjustment` の 4 operation。

**Rationale**: Server Action 側が meetings.ts と interactions.ts に分かれているが、ドメインモデル上は全て Interaction エンティティである。MCP ツールでは統一的に `interactions` として公開する。operation 名は usecase の意味を反映する。

**Alternatives considered**:
- meetings / interactions で 2 ツールに分ける → Interaction エンティティは単一なので不要な分割
- 全て `create` operation に統一して kind で分岐 → 引数構造が大きく異なるため discriminated union にした方が型安全

### D3: tasks ツールの operation 設計

**決定**: `list` / `create` / `update` / `update_status` / `toggle` / `delete` / `search_link_targets` の 7 operation。

**Rationale**: Server Action の 6 操作 + searchLinkTargets を全て公開する。タスクはエージェントが最も頻繁に操作するリソースであり、操作の欠落は利便性を損なう。

### D4: watches ツールの operation 設計

**決定**: `watch` / `unwatch` の 2 operation。

**Rationale**: 現在の Server Action（watchDealAction / unwatchDealAction）のパリティ。認可チェックは Server Action 側に明示的にないが（全ロールが暗黙的に可能）、MCP ツール側でも認可チェックを省略する（既存動作の忠実な再現）。案件のテナント所有権は usecase（watchDeal）内で検証される。

### D5: notifications ツールの operation 設計

**決定**: `list` / `mark_as_read` の 2 operation。

**Rationale**: `getNotifications`（一覧取得）と `markNotificationsAsRead`（既読化）の 2 usecase に対応する。一覧取得には `notificationsLastSeenAt` が必要だが、これはユーザーレコードから取得するためツール引数には含めない（authInfo の userId から解決する）。

### D6: update 系ツールの undefined / null 区別

**決定**: mcp-server-core で確立した方針を踏襲する。update 系の optional フィールドは `undefined`（変更なし） と `null`（クリア）を区別する。Zod スキーマで `.nullable().optional()` を使用する。

**Rationale**: #158 の実装上の必須事項 4 に明記されている。interactions の update_meeting でも同様の方針が必要（hearingData / location / summary 等）。

### D7: テスト方針 — 実行検証を主軸とする

**決定**: 受け入れ基準のテストは全て `mock.module` で依存を差し替えてハンドラを実際に実行する behavioral test とする。ソース文字列照合テストは補助的にのみ使用する。

**Rationale**: #158 の実装上の必須事項 1 に明記。`mcpHandlerAuthz.dynamic.test.ts` のパターンを踏襲する。

### D8: notifications の一覧取得でユーザーの notificationsLastSeenAt を取得する方法

**決定**: `getNotifications` usecase に渡す `notificationsLastSeenAt` を、ハンドラ内で `userRepository.findById` を呼んで取得する。

**Rationale**: `getNotifications` usecase はこの値を引数で受け取る設計になっている。Server Action 側では `session.user` から取得しているが、MCP 側では authInfo に含まれないため、ハンドラ内で user レコードを参照する必要がある。usecase を変更するのは避ける（パリティ規約に反する）。

## Risks / Trade-offs

**[Risk] interactions ツールが 4 operation に分かれ、引数構造が operation ごとに大きく異なる** → Mitigation: `z.discriminatedUnion("operation", [...])` で型安全に分岐する。mcp-server-core の deals / clients と同じパターン。

**[Risk] notifications の list が重い処理（watch 対象の全案件を走査）** → Mitigation: 既存の `getNotifications` usecase がそのまま使われるため、パフォーマンス特性は UI と同一。改善は usecase レベルで行い MCP 固有の最適化はしない。

**[Risk] mock.module の汚染によるテスト間干渉** → Mitigation: バレル（`@/application/usecases`）をモックせず個別ファイルをモックする。`afterAll` で復元する。#158 の必須事項 2 に従う。

## Open Questions

なし。全ての設計判断は mcp-server-core の確立済み方針に従う。
