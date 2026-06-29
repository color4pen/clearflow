# Design: interaction-contract-invoice

## Context

Clearflow では顧客接点（Interaction）を `interactions` テーブルで統一管理している。前リクエストで `interaction_kind` enum に `contract_adjustment` / `invoice_adjustment` を追加し、`contract_id` / `invoice_id` FK も整備済。しかし、これらの kind を使って顧客接点を記録する usecase・Server Action・UI は未実装であり、契約詳細・請求詳細の画面にやり取り記録セクションが存在しない。

既存の商談記録（`kind=meeting`）は `createMeeting` usecase → `interactionRepository.create` → `recordAudit("interaction.create", { kind })` のパターンで実装されている。案件タイムライン（`getDealActivity`）は `interactionRepository.findAllByDeal` で案件直接紐づきの顧客接点を取得しているが、契約・請求経由の顧客接点は取得していない。

認可は `src/domain/authorization.ts` の `canPerform(role, entity, operation)` で管理される。顧客接点の記録は既存エンティティへの「操作」とは別概念。

## Goals / Non-Goals

**Goals**:

- 契約調整（`contract_adjustment`）の記録 usecase・Server Action・UI を追加する
- 請求調整（`invoice_adjustment`）の記録 usecase・Server Action・UI を追加する
- `interactionRepository` に `findAllByContract` / `findAllByInvoice` を追加する
- 契約詳細・請求詳細の画面にやり取り記録セクション（一覧＋記録フォーム）を配置する
- 認可に `interaction` エンティティの `recordContractAdjustment` / `recordInvoiceAdjustment` 操作を追加する
- 案件タイムライン（`getDealActivity`）に契約・請求経由の顧客接点を含める

**Non-Goals**:

- スキーマ変更（`interaction_kind` enum・FK は実装済）
- 電話・メール（`kind=call/email`）の記録 UI
- 消込・督促・回収（AR/債権管理）
- 顧客接点の編集・削除 UI（本リクエストは記録・表示のみ）

## Decisions

### D1: usecase を新規に作る（createMeeting を流用しない）

**決定**: `createContractAdjustment` と `createInvoiceAdjustment` を独立した usecase として新設する。

**Rationale**: `createMeeting` は `dealId | inquiryId` 必須チェック・`meetingType` 制御・`details` 強制 null 化など meeting 固有ロジックを含む。contract_adjustment / invoice_adjustment はそれぞれ `contractId` / `invoiceId` が必須で、`meetingType` / `attendees` / `actionItems` は不要。共通化すると条件分岐が増え可読性が下がる。

**Alternatives considered**: `createMeeting` に kind 分岐を追加 → meeting 固有ロジック（meetingType 制御、hearing details 強制 null）と混在し、関心の分離が崩れる。

### D2: 認可は `interaction` エンティティに操作を追加する

**決定**: `authorization.ts` の `Entity` 型に `"interaction"` を追加し、`recordContractAdjustment`（admin/manager/member）と `recordInvoiceAdjustment`（admin/manager/finance）を定義する。

**Rationale**: 顧客接点の「記録」は契約・請求エンティティへの「操作」とは別概念（architect 判断 #2）。`meeting` エンティティに既に `create` が定義されているため、同じパターンで `interaction` エンティティに記録操作を追加するのが自然。

**Alternatives considered**: `contract` / `invoice` エンティティに `recordInteraction` を追加 → 記録は契約/請求への操作ではなく顧客接点の行為なので意味的に不適切。

### D3: Server Action は `interactions.ts` に統合する

**決定**: 契約調整・請求調整の記録 action を新ファイル `src/app/actions/interactions.ts` にまとめる。

**Rationale**: 既存の `meetings.ts` は meeting 固有の構造（attendees、actionItems、hearingData）を前提としている。contract_adjustment / invoice_adjustment は summary + date + details のシンプルな構造のため、別ファイルにまとめる方が凝集度が高い。

**Alternatives considered**: `contracts.ts` / `invoices.ts` にそれぞれ追加 → 記録対象は interaction であり、契約/請求の操作ではないため不適切。

### D4: タイムライン統合は `getDealActivity` 内で `findAllByContract` / `findAllByInvoice` を呼ぶ

**決定**: `getDealActivity` で取得済みの contracts / invoices をループし、`interactionRepository.findAllByContract` / `findAllByInvoice` を並列呼び出しして targets に追加する。

**Rationale**: contracts / invoices は既に `getDealActivity` 内で取得済み。追加の repository 呼び出しは N+1 になるが、案件配下の契約・請求数は通常少数（1〜5 件）であり、`Promise.all` で並列化すれば実用上問題ない。`targetInfoMap` への顧客接点ラベル登録も同時に行う。

**Alternatives considered**: interactionRepository に `findAllByDealContracts(dealId)` のような結合クエリを追加 → クエリが複雑化し、既存の FK ベースの取得パターンから逸脱する。

### D5: UI コンポーネントはクライアントコンポーネントとして分離する

**決定**: 契約調整・請求調整のやり取りセクション（一覧表示＋記録フォーム）をそれぞれ `ContractInteractionSection.tsx` / `InvoiceInteractionSection.tsx` としてクライアントコンポーネントで実装する。データ取得は親 RSC で行い、props で渡す。

**Rationale**: フォーム送信（useActionState）を含むためクライアントコンポーネントが必要。一覧表示はフォーム送信後の revalidation で更新される。既存の `InvoiceSection` と同様のパターン。

## Risks / Trade-offs

[Risk] 案件タイムラインの N+1 クエリ増加 → **Mitigation**: 契約・請求数は通常少数。`Promise.all` で並列化。将来的にパフォーマンス問題が出た場合は結合クエリに切り替える。

[Risk] `interaction` エンティティの認可追加が既存の `meeting` エンティティの認可と二重管理になる → **Mitigation**: `meeting` エンティティは商談記録固有の操作（create/edit/delete）を担当し、`interaction` エンティティは kind 別の記録操作を担当する。役割が明確に分離されている。

## Open Questions

（なし — architect 評価済みの設計判断に基づき、未解決事項はない）
