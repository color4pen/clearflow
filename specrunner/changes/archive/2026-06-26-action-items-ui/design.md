# Design: アクションアイテム UI の action_items テーブル切り替え

## Context

AI-a（PR #104）で action_items テーブル、ドメインモデル（`ActionItem`）、リポジトリ（`actionItemRepository`）、ユースケース（`createActionItem`, `toggleActionItemDone`, `listActionItemsByDeal`, `listActionItemsByMeeting`）、サーバーアクション（`createActionItemAction`, `toggleActionItemAction` 等）を新設済み。

現状の UI コンポーネントは全て `meetings.actionItems` JSON カラムを直接操作している:

- **DealActionItemsSection**: 案件に紐づく全商談の `actionItems` JSON を flat 展開し、完了切替は `updateMeetingAction` で JSON 全体を書き換える
- **MeetingActionItemsSection**: 商談の `actionItems` JSON を直接操作。追加・完了切替とも JSON 全体を書き換え
- **getDashboardActions**: 全 Meeting を取得し `meeting.actionItems` をループして未完了アクションを集約
- **SalesDashboard**: `DashboardActionItem` の `action_item` タイプが `assignee: string` と `dealId: string`（non-nullable）を前提としている

本変更では UI の読み書きを全て `action_items` テーブル（リポジトリ経由）に切り替える。`updateMeetingAction` 内の JSON 処理は後方互換のため残す。

## Goals / Non-Goals

**Goals**:

- DealActionItemsSection が `listActionItemsByDeal` 経由で action_items テーブルからデータを取得する
- MeetingActionItemsSection が `createActionItemAction` / `toggleActionItemAction` 経由で action_items テーブルに読み書きする
- getDashboardActions が `actionItemRepository.findByOrganization({ done: false })` でアクションアイテムを取得する
- SalesDashboard が新しい `DashboardActionItem` 型（`assigneeId`, nullable `dealId`）に対応する
- 案件詳細から商談に紐づかないアクションアイテムを直接追加できる

**Non-Goals**:

- `meetings.action_items` JSON カラムの削除
- `updateMeetingAction` 内の `actionItems` JSON 処理の削除（後方互換で残す）
- 引合詳細からのアクションアイテム追加
- 個人タスク管理画面

## Decisions

### D1: DealActionItemsSection の props を ActionItem[] ベースに変更する

DealActionItemsSection は現在 `FlatItem[]`（meetingId + index ベース）と `MeetingActionItems[]` を受け取り、JSON 配列内の index で完了切替を行っている。

新しい props は `ActionItem[]`（action_items テーブルのモデル）に変更する。完了切替は `toggleActionItemAction({ id })` を呼び出す。案件詳細ページ（`deals/[id]/page.tsx`）で `listActionItemsByDeal` を呼び出してデータを渡す。

**Rationale**: ActionItem モデルは id を持つため index ベースの操作が不要になり、コンポーネントがシンプルになる。商談のローカル JSON を走査する必要もなくなる。

**Alternatives considered**: 既存の FlatItem 型を維持して内部で ActionItem に変換する案 → 不必要な間接層が増えるため却下。

### D2: MeetingActionItemsSection の props を ActionItem[] ベースに変更する

MeetingActionItemsSection の `actionItems: ActionItem[]`（meeting モデルの JSON 由来）を `actionItems: ActionItem[]`（action_items テーブルのドメインモデル）に変更する。型名は同じだが import 先が `@/domain/models/meeting` から `@/domain/models/actionItem` に変わる。

追加は `createActionItemAction({ description, assigneeId, dueDate, meetingId, dealId })` を呼び出す。完了切替は `toggleActionItemAction({ id })` を呼び出す。商談詳細ページ（`meetings/[meetingId]/page.tsx`）で `listActionItemsByMeeting` を呼び出してデータを渡す。

**Rationale**: server action は既に実装済みで、UI から直接呼び出すだけで良い。

**Alternatives considered**: FormData ベースのサーバーアクション呼び出しを維持する案 → 既存のサーバーアクションが `data: unknown`（JSON オブジェクト）を受け取る設計のため、FormData を介す必要がない。

### D3: MeetingActionItemsSection の担当者入力を assigneeId（ユーザー選択）に変更する

現在は自由テキスト（`assignee: string`）で担当者名を入力している。action_items テーブルの `assigneeId` は users テーブルへの FK であるため、組織内ユーザーのセレクトボックスに変更する。

ページコンポーネントから `orgUsers: { id: string; name: string }[]` を props で渡す。商談詳細ページは既に `listOrganizationUsers` を呼び出しているため、追加のデータ取得は不要。

**Rationale**: assigneeId は UUID でなければバリデーションエラーになる。自由テキストのままでは action_items テーブルに保存できない。

**Alternatives considered**: assigneeId を optional にして未設定のまま作成する案 → 担当者なしのアクションアイテムは実用上の価値が低く、UX が劣る。ただし assigneeId は nullable なので、セレクトボックスに「未設定」の選択肢も用意する。

### D4: getDashboardActions の action_item タイプの型を変更する

`DashboardActionItem` の `action_item` バリアントを以下のように変更する:

- `dealId: string` → `dealId: string | null`（action_items テーブルでは dealId は nullable）
- `assignee: string` → `assigneeId: string | null`（自由テキストから FK に変更）
- `dealTitle: string` は維持する（ダッシュボード表示用。dealId が null の場合は空文字列）

getDashboardActions 内で `actionItemRepository.findByOrganization(organizationId, { done: false })` を使用し、dealTitleMap で dealTitle を解決する。

**Rationale**: ActionItem モデルのフィールドに合わせることで型の一貫性を保つ。

**Alternatives considered**: assignee 名を維持するために join やユーザー名解決を行う案 → ダッシュボードの usecase で名前解決すると責務が混在する。名前解決は表示層（SalesDashboard）で行う。

### D5: SalesDashboard で assigneeId からユーザー名を解決する

ダッシュボードページ（`dashboard/page.tsx`）で `listOrganizationUsers` を呼び出し、`userMap: Record<string, string>`（userId → userName）を SalesDashboard に渡す。SalesDashboard は `assigneeId` を `userMap` で名前に変換して表示する。

**Rationale**: 表示層でのみ必要な名前解決を usecase に混ぜない。ダッシュボードページは既にサーバーコンポーネントで複数のデータ取得を行っているため、追加の呼び出しは自然。

**Alternatives considered**: getDashboardActions 内で user 名を JOIN して返す案 → usecase の責務を超える。型にユーザー名を含めると、他のコンシューマーに不要なフィールドを押し付けることになる。

### D6: DealActionItemsSection に追加フォームを新設する

案件詳細から商談に紐づかないアクションアイテムを追加できるフォームを追加する。入力フィールドは description（必須）、assigneeId（セレクトボックス、任意）、dueDate（日付、任意）。`createActionItemAction({ description, assigneeId, dueDate, dealId })` を呼び出す。

案件詳細ページで `listOrganizationUsers` を呼び出し、`orgUsers` を DealActionItemsSection に渡す。

**Rationale**: MeetingActionItemsSection と同様のパターンで追加フォームを実装する。案件に直接紐づくアクションアイテムは商談を経由しない作業（社内タスク等）をカバーする。

**Alternatives considered**: 別コンポーネントとして追加フォームを切り出す案 → MeetingActionItemsSection と同じく section 内に inline で表示するパターンが一貫しており、コンポーネント分割は過剰。

## Risks / Trade-offs

- [Risk] 型変更（`DashboardActionItem`）がコンパイルエラーを引き起こす → Mitigation: 全ての消費者（SalesDashboard, dashboard/page.tsx）を同一タスクで更新し、typecheck を最終確認する
- [Risk] assigneeId を表示名に解決するための追加クエリがパフォーマンスに影響する → Mitigation: listOrganizationUsers は組織内ユーザー数が限定的（数十人規模）であり、1 回の呼び出しで十分。キャッシュも Next.js のリクエストデデュプで自然に効く
- [Risk] 既存の meeting.actionItems JSON データと action_items テーブルのデータが不整合になる → Mitigation: 本変更のスコープ外。JSON カラムの削除とデータ移行は別リクエストで対応する。UI は action_items テーブルのみを参照する

## Open Questions

なし。全ての設計判断は request.md の要件と architect 評価で解決済み。
