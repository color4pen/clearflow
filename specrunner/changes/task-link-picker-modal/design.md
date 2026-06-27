# Design: タスク紐づけ先の検索選択モーダル（案件・引合・会議）

## Context

タスク（アクションアイテム）は `dealId` / `inquiryId` / `meetingId` の 3 つの FK で紐づけ先を持つ。現状の UI には以下の問題がある:

1. **TaskList 新規作成モーダル**: 案件・引合を `<select>` 全件プルダウンで選択。件数増加で探索不能。会議は選択不可
2. **ActionItemModal（編集モーダル）**: 紐づけ先の欄が存在しない。一度作成したタスクの紐づけを変更できない
3. **リポジトリ**: `dealRepository.findAllByOrganization` / `inquiryRepository.findAllWithClientByOrganization` / `meetingRepository.findAllByOrganization` は検索パラメータを持たず全件返す
4. **セマンティクス**: 3 つの FK は独立しており、理論上は案件と引合に同時紐づけ可能（意味的に不明確）

Meeting モデルには `title` が無く、`type`（列挙）/ `date` / `summary` を持つ。既存の `listActionItems` では会議を `formatDateJP(meeting.date)` で表示している。

### 対象ファイル

| レイヤー | ファイル | 現状 |
|----------|---------|------|
| リポジトリ | `dealRepository.ts` | `findAllByOrganization` — 検索なし全件返却 |
| リポジトリ | `inquiryRepository.ts` | `findAllWithClientByOrganization` — 検索なし全件返却 |
| リポジトリ | `meetingRepository.ts` | `findAllByOrganization` — 検索なし全件返却 |
| usecase | `createActionItem.ts` | 3 FK を独立に受け入れ（排他制約なし） |
| usecase | `updateActionItem.ts` | 3 FK を独立に受け入れ（排他制約なし） |
| Server Action | `actionItems.ts` | create / update で 3 FK を独立に受け取る |
| UI | `TaskList.tsx` | 案件・引合を全件 `<select>` で選択。会議選択なし |
| UI | `ActionItemModal.tsx` | 内容・担当者・期日のみ。紐づけ先の欄なし |
| UI | `ActionItemRow.tsx` | 編集時に ActionItemModal を開くが紐づけ先を渡していない |
| ページ | `tasks/page.tsx` | `listDeals` / `listInquiries` で全件取得して props に渡す |

## Goals / Non-Goals

**Goals**:

- 案件・引合・会議をサーバー検索（部分一致、上限 20 件）で絞り込める再利用可能なピッカーモーダルを新設する
- タスクの新規作成・編集の双方でピッカーを使い、紐づけ先を選択・変更・クリアできるようにする
- 単一紐づけセマンティクスを導入し、3 FK のうち最大 1 つだけが非 null であることを usecase で保証する
- 既存の全件 `<select>` プルダウンを廃止し、`TaskList` ページからの全件ロード（`listDeals` / `listInquiries`）を除去する

**Non-Goals**:

- 案件ページ（DealActionItemsSection）・会議ページ（MeetingActionItemsSection）のタスク作成への影響（従来通り自動紐づけ）
- 複数同時紐づけの維持（単一紐づけに統一）
- 検索の高度機能（ファセット・並び替え・ページング・あいまい検索）
- ピッカー内からの紐づけ先エンティティ新規作成
- 会議の検索対象拡張（summary のみ）

## Decisions

### D1: 単一紐づけに統一し、3 FK のうち最大 1 つが非 null である不変条件を usecase で保証する

**Rationale**: ピッカーで「案件/引合/会議のいずれか 1 つを選ぶ」という UI が明快であり、会議は案件/引合に属するため親も辿れる。usecase レイヤー（createActionItem / updateActionItem）で、選択された type の FK のみセットし他 2 つを null にすることで不変条件を強制する。

**Alternatives considered**: 現状の独立した複数 FK 維持 — 却下。UI が煩雑で「案件と引合の両方に紐づく」意味が曖昧。DB スキーマの CHECK 制約追加 — 却下。既存データへの影響リスクがあり、usecase での保証で十分。

### D2: サーバー検索を採用し、クライアント全件ロードを廃止する

**Rationale**: 案件/引合/会議の件数が増えてもスケールする。各リポジトリに検索パラメータ（`query?: string`）を追加し、Drizzle の `ilike` で部分一致検索、`limit` で LINK_SEARCH_LIMIT（20）件に制限する。Server Action を経由することでテナント分離を維持する。

**Alternatives considered**: 全件をクライアントへ渡して filter — 却下。大規模で重く、既存のプルダウンと同じ問題が残る。

### D3: 種別タブ（案件/引合/会議）で分割し、横断統合検索を却下する

**Rationale**: ユーザーが探す種別は明確で、タブで分割すると実装も単純。Server Action は `type` パラメータで呼び分ける。

**Alternatives considered**: 3 種を 1 つの検索結果に混ぜる — 却下。種別の区別が付きにくく、label フォーマットも異なる。

### D4: 会議の検索は summary の部分一致、表示は「日付＋種別ラベル（＋親名）」

**Rationale**: Meeting に `title` が無いため、検索対象は summary（null の会議は除外）。表示ラベルは `${formatDateJP(date)} ${meetingTypeLabels[type]}`。親の案件/引合名があれば `（${parentName}）` を併記する。`listActionItems` の会議表示（日付ベース）と整合する。

**Alternatives considered**: date ベース検索 — 却下。日付フォーマットの一致が煩雑で、summary の方がユーザーにとって自然な検索軸。

### D5: 検索結果は LINK_SEARCH_LIMIT（20）件上限

**Rationale**: 曖昧検索の結果が膨大になるのを防ぎ、DB 負荷を抑制する。ページングは設けず、先頭一致で十分とする。

### D6: LinkTargetPicker は汎用モーダルコンポーネントとして新設する

**Rationale**: タスク新規作成（TaskList）と編集（ActionItemModal）の両方で再利用する。確定値は `{ type: "deal"|"inquiry"|"meeting", id: string, label: string } | null` の形式で、親コンポーネントに返す。「紐づけを外す（なし）」操作も提供する。

### D7: searchLinkTargetsAction を単一の Server Action として新設する

**Rationale**: 3 種別の検索を 1 つの Action にまとめ、`type` パラメータで分岐する。各種別の usecase（`searchDeals` / `searchInquiries` / `searchMeetings`）を内部で呼び分け、統一された `{ id, label }[]` 形式で返す。認証・テナント分離はこの Action 内で行う。

## Risks / Trade-offs

[Risk] 単一紐づけへの移行で、既存データに複数 FK が同時にセットされた行が存在する可能性 → **Mitigation**: usecase の不変条件は新規作成・更新時のみ適用する。既存データの一括クリーンアップはスコープ外とし、表示時は既存の `listActionItems` の優先ロジック（`dealId → meetingId → inquiryId`）で 1 つだけ表示される。

[Risk] `ilike` による部分一致検索のパフォーマンス → **Mitigation**: LIMIT 20 で結果を制限し、organizationId のインデックスでテナント絞り込みが先に効く。大量データでの `ilike` 性能問題はスコープ外の将来課題とする。

[Risk] ActionItemModal のインターフェース変更が DealActionItemsSection / MeetingActionItemsSection に影響 → **Mitigation**: ActionItemModal の `defaultValues` に `linkTarget` をオプショナルで追加するだけで後方互換。Deal/Meeting ページからの利用では紐づけ欄の表示を省略するか、渡さなければ従来動作のままにする。ただし要件として Deal/Meeting ページのタスク作成はスコープ外なので、ActionItemModal への紐づけ欄追加はグローバルタスク一覧の編集モーダル用途に限定する。

## Open Questions

なし。architect 評価済みの設計判断がすべての論点をカバーしている。
