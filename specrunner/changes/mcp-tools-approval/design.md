# Design: MCP ツール — 承認系（申請・承認・委任・テンプレート・ポリシー）

## Context

mcp-server-core（#158）で MCP サーバー基盤とコア CRM ツール群が、mcp-tools-activity（#161）で第二弾、mcp-tools-finance（#163）で第三弾が確立された。本変更は第四弾として、承認ワークフローを構成する 4 リソースのツールを追加する。

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
| `tools/contracts.ts` | 契約 | 6 |
| `tools/invoices.ts` | 請求 | 4 |
| `tools/revenue.ts` | 売上 | 3 |
| `tools/revenueTargets.ts` | 売上目標 | 3 |

対応する Server Action と usecase は全て実装済み:

- **approval_requests** — `listRequests` / `getRequest` / `getApprovalSteps` / `createRequest` / `submitRequest` / `approveRequest` / `rejectRequest` / `bulkApprove` / `resubmitRequest`。楽観的ロック（version）あり。承認ステップの順序制約・承認者資格・委任を含む。
- **delegations** — `createDelegation` / `deactivateDelegation` / `listDelegations`。
- **approval_templates** — `listApprovalTemplates`（repository 直接） / `createTemplate` / `updateTemplate` / `deleteTemplate`。
- **approval_policies** — `listPolicies`（repository 直接） / `createPolicy` / `updatePolicy` / `togglePolicy`。

認可マトリクス（`domain/authorization.ts`）の該当部分:

| エンティティ | 操作 | 許可ロール |
|---|---|---|
| approval | listRequests, viewRequest, submit | ALL_ROLES |
| approval | approve, reject | admin, manager, finance |
| approvalSettings | listPolicies, listTemplates | admin, manager |
| approvalSettings | createPolicy, editPolicy, createTemplate, editTemplate, deleteTemplate | admin |
| approvalSettings | listDelegations | ALL_ROLES |
| approvalSettings | createDelegation, deactivateDelegation | admin, manager, finance |

承認リクエストの `list` にはフロントエンドで2つのフィルタリングビューがある:
- **action-required**: status=pending かつ現在ユーザーのロールに該当する pending ステップがあるもの（委任は未考慮、ロール一致のみ）
- **my-requests**: creatorId=自分のもの

## Goals / Non-Goals

**Goals**:

- 4 つの MCP ツール（approval_requests / delegations / approval_templates / approval_policies）を追加し、承認ワークフローの UI パリティを実現する
- approval_requests の `get` でシステム連動承認の影響（triggerAction / 対象エンティティ）が分かる情報を返す
- approval_requests の `list` で `filter` 引数により「自分が承認すべき」「自分の申請」の絞り込みを MCP 側で行えるようにする
- 全ツールで mcp-server-core のパリティ規約を遵守する（usecase 共有・canPerform 認可・テナント分離・監査記録・レート制限）
- 実行検証（behavioral test）で全受け入れ基準を固定する
- `route.ts` にツール登録を追加するのみで、基盤コードの変更は不要

**Non-Goals**:

- 管理系ツール（組織・ユーザー・Webhook） — 後続 request
- 承認期限のリマインド通知 — 既存バッチのまま
- 新しい usecase や domain ロジックの追加 — 既存の usecase・repository をそのまま呼ぶ
- 委任を考慮した「自分が承認すべき」リストの完全な再現 — UI もロール一致のみでフィルタしており、委任の反映は UI/MCP 共通の将来課題

## Decisions

### D1: リソース単位 + operation 引数（集約方針の踏襲）

**決定**: mcp-server-core で確立した「1 リソース = 1 ツール、`operation` 引数で操作を切り替える」方針をそのまま踏襲する。approval_requests / delegations / approval_templates / approval_policies の 4 ツール。

**Rationale**: 既に 11 ツールで定着しており、ツール発見性と一貫性を優先する。承認の CRUD 操作群と設定系（テンプレート・ポリシー・委任）は別リソースとして分離する方が operation 数が適度に収まる。

**Alternatives considered**:
- 全承認操作を 1 ツールに統合 → operation 数が 19 に達し inputSchema が肥大化する
- templates / policies / delegations を 1 つの `approval_settings` ツールに統合 → 認可チェックのエンティティが異なるため分離する方が明確

### D2: approval_requests ツールの operation 設計

**決定**: `list` / `get` / `create` / `submit` / `approve` / `reject` / `bulk_approve` / `resubmit` の 8 operation。

**Rationale**: Server Action の 8 操作（`createRequest`, `listTemplatesForRequest`, `submitRequest`, `approveRequest`, `rejectRequest`, `bulkApprove`, `resubmitRequest`, `getApprovalSteps`）と対応する。ただし MCP 側は入口を整理する:
- `listTemplatesForRequest` は approval_templates の `list` で代替可能（同一 repository 呼び出し）
- `getApprovalSteps` は `get` operation の結果にステップ情報を含める形で統合する
- `list` は `listRequests` usecase をベースに、MCP ツールレイヤーで `filter` によるクライアントサイドフィルタリングを行う

**list の filter 設計**:
- `filter: "action_required"` — status=pending かつ現在ユーザーのロールに該当する pending ステップがあるもの（UI の action-required タブと同一ロジック）
- `filter: "my_requests"` — creatorId=自分のもの
- `filter: "all"` — 全件（admin/manager のみ。権限なしの場合は空配列を返す）
- `statusFilter` — optional。特定ステータスで追加絞り込み

**Alternatives considered**:
- filter をクライアント（エージェント）に委ねる → 全件を返すと不要なデータ量が増え、エージェントの判断負荷が高い
- 新しい usecase を作る → 既存の listRequests がステップ付きで全件返すため、フィルタリングは薄いアダプタ層の責務

### D3: approval_requests の `get` でシステム連動承認の影響情報を返す

**決定**: `get` の結果に `originType`, `originTriggerAction`, `originTriggerEntityId` を含め、`originType === "system"` の場合にエージェントが「この承認で何が起きるか」を説明できるようにする。

具体的には、`getRequest` usecase が返す `Request` オブジェクトに既にこれらのフィールドが含まれている。加えて `getApprovalSteps` usecase でステップ情報を取得し、両方を統合した結果を返す。

**Rationale**: request.md の固有判断「承認の影響をツール結果で説明可能にする」に対応する。追加情報の返却であり、既存の usecase 呼び出しの組み合わせで実現できる。

### D4: approval_requests の `create` における formData のハンドリング

**決定**: MCP の `create` はテンプレートの fields 定義に基づいた formData を JSON オブジェクトとして受け取る。Server Action では FormData からフィールドを抽出・検証しているが、MCP では JSON 入力なので `formData` 引数として `Record<string, unknown>` を直接受け取る。

テンプレートの fields 定義に基づくバリデーション（required チェック、型チェック、select の options チェック）は MCP ツールレイヤーで行い、Server Action と同等の検証を確保する。バリデーション通過後、`{ value, label }` 構造に変換して `createRequest` usecase に渡す。

**Rationale**: Server Action は FormData → 抽出 → 検証 → `{ value, label }` 変換 → usecase という流れ。MCP は JSON → 検証 → `{ value, label }` 変換 → usecase。検証ロジックは共通化すべきだが、入力形式の違いから完全な共有は困難。パリティは検証項目の一致で担保する。

**Alternatives considered**:
- formData の検証を省略する → テンプレートの required 制約違反が usecase に到達する。Server Action と非対称になる
- 検証ロジックを共有関数に切り出す → 本 request のスコープ外のリファクタリングが必要。将来課題

### D5: delegations ツールの `create` における自分以外の委任作成制限

**決定**: Server Action と同一の制限を MCP ツールレイヤーで再現する。admin 以外は `fromUserId` が自分自身の場合のみ委任を作成できる。admin は任意のユーザー間の委任を作成できる。

**Rationale**: Server Action の `createDelegationAction` が `session.user.role !== "admin" && parsed.data.fromUserId !== session.user.id` をチェックしている。MCP でも同一の制約を適用する。

### D6: approval_templates ツールの update での undefined / null 区別

**決定**: mcp-server-core で確立した方針を踏襲する。update の `name`, `steps`, `fields` は全て optional。省略された引数は「変更なし」として扱い、usecase に `undefined` を渡す。

**Rationale**: #158 の実装上の必須事項 4 に従う。`updateTemplate` usecase は既に `name?`, `steps?`, `fields?` を受け取る設計。

### D7: approval_policies ツールの update と toggle の分離

**決定**: `update` と `toggle` を別 operation として提供する。`update` はポリシーの内容（name, triggerAction, condition, templateId 等）を変更する。`toggle` はポリシーの有効/無効を切り替える。

**Rationale**: Server Action が `updatePolicyAction` と `togglePolicyAction` を分離している。1 つの update に統合すると `isActive` の undefined/false 区別が必要になり、toggle の意図が不明瞭になる。

### D8: reject operation の targetStatus 引数

**決定**: reject operation に `targetStatus` 引数（optional、`"rejected"` | `"revision"`）を含める。デフォルトは `"rejected"`。`"revision"` は差し戻し（再提出可能）を意味する。

`comment` 引数（optional）も含める。差し戻し時のコメントとして `rejectRequest` usecase に渡す。

**Rationale**: Server Action の `rejectRequestAction` が `targetStatus` と `comment` を FormData から取得している。MCP でも同一の引数を提供する。

### D9: bulk_approve の上限

**決定**: Server Action と同一の上限 20 件を MCP ツールレイヤーで適用する。

**Rationale**: `bulkApproveAction` が `BULK_APPROVE_MAX = 20` を使用している。パリティ規約に従い同一制限を適用する。

### D10: エラー変換で内部詳細を漏らさない

**決定**: mcp-tools-finance の D10 と同一方針。usecase が catch ブロックで `err.message` を reason に設定する経路がある場合、DB エラー詳細がクライアントに露出するリスクがある。承認系 usecase（`approveRequest`, `rejectRequest`, `submitRequest`, `resubmitRequest`）は catch ブロックで `err instanceof Error ? err.message : "Fixed message"` パターンを使用しているが、throw されるのは業務エラー（楽観的ロック衝突、期限切れ等）のみであり、DB 例外は throw 前の `requestRepository.updateStatus` が null を返す形で処理されるため、`err.message` に DB エラーが混入するリスクは低い。

ただし安全策として、MCP ツールの外側 catch で `handleToolError(error)` を使用し、予期しない例外は「内部エラーが発生しました」に変換する。

### D11: テスト方針 — 実行検証を主軸とする

**決定**: 受け入れ基準のテストは全て `mock.module` で依存を差し替えてハンドラを実際に実行する behavioral test とする。ソース文字列照合テストは使用しない。バレル（`@/application/usecases`）をモックせず個別ファイルをモックし、`afterAll` で復元する。

**Rationale**: #158 の実装上の必須事項 1, 2 に従う。

## Risks / Trade-offs

**[Risk] approval_requests の list でのフィルタリングがツールレイヤーで行われる** — `listRequests` usecase は全件を返し、ツールレイヤーでフィルタする。データ量が大きい場合にパフォーマンスへ影響する。
→ Mitigation: 既存の UI も同一の全件取得 + クライアントフィルタパターン。組織内の承認リクエスト数が爆発的に増えることは当面想定しない。改善は listRequests usecase のフィルタリング対応として横断的に行う。

**[Risk] formData バリデーションの二重実装** — Server Action と MCP でテンプレートフィールドのバリデーションロジックが別々に実装される。
→ Mitigation: バリデーション項目（required, 型, select options）を Server Action と 1:1 で対応させ、テストで固定する。将来的な共通化はリファクタリング課題。

**[Risk] action_required フィルタが委任を考慮しない** — UI の action-required タブもロール一致のみでフィルタしており、委任による代理承認対象は含まれない。
→ Mitigation: UI パリティとして現行動作を踏襲する。委任対応は UI/MCP 共通の改善として後続で検討する。

**[Risk] mock.module の汚染によるテスト間干渉** → Mitigation: バレルをモックせず個別ファイルをモックする。`afterAll` で復元する。#158 の必須事項 2 に従う。

## Open Questions

なし。全ての設計判断は mcp-server-core の確立済み方針と request.md の明示的な注記に従う。
