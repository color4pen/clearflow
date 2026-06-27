# ADR-018: タスク紐づけ先ピッカーとピッカー経由単一紐づけセマンティクス

- **Status**: accepted
- **Date**: 2026-06-27
- **Change**: task-link-picker-modal
- **Deciders**: architect

---

## Context

ADR-016 でアクションアイテムを独立テーブル（`action_items`）として新設した際、`meeting_id` / `deal_id` / `inquiry_id` の 3 FK はすべて nullable・CHECK 制約なしと決定した（ADR-016 D1）。この設計は個人タスクや会議ページ（MeetingActionItemsSection）が `meetingId+dealId` を同時にセットするケースを許容するためのものだった。

一方、グローバルなタスク一覧（TaskList）の新規作成モーダルでは案件・引合を全件 `<select>` プルダウンで選択する実装になっており、以下の問題があった:

1. 案件・引合の件数が増えると探索不能
2. 会議はプルダウンに存在しない（選択不可）
3. 編集モーダル（ActionItemModal）に紐づけ先欄がない（作成後に変更不可）
4. タスク新規作成時に案件と引合を同時に選べるが、「案件と引合の両方に紐づく」という意味が曖昧

本変更では、案件・引合・会議をサーバー検索で絞り込んで 1 件選択できる再利用可能なピッカーモーダル（`LinkTargetPicker`）を新設し、タスクの新規作成・編集の双方で使えるようにした。

---

## Decisions

### D1: 単一紐づけはピッカー経由に限定し、呼び出し元（UI/Server Action）で FK マッピングを行う

**Decision**: ピッカー（LinkTargetPicker）経由でタスクを作成・更新する場合、選択した type に対応する FK のみをセットし、他 2 つの FK を null にする。この制約を usecase レイヤーには追加しない。FK マッピングはピッカーを使う呼び出し元（TaskList の createActionItemAction 呼び出し、ActionItemRow の updateActionItemAction 呼び出し）が行う。

**Rationale**:
- ピッカー UI は「案件/引合/会議のいずれか 1 つを選ぶ」という操作であり、選択した type の FK 以外を null にすることが自然
- usecase に「最大 1 FK」の不変条件を追加すると、MeetingActionItemsSection（meetingId+dealId を同時送信）が壊れる
- MeetingActionItemsSection が meetingId+dealId を保持することで、会議タスクが一覧で「親案件名」を表示できる（listActionItems の `dealId → meetingId → inquiryId` 優先ロジックによる）
- DB レベルの CHECK 制約も設けない。既存データへの影響リスクがあり、呼び出し元でのマッピングで十分

**呼び出し元の責任**:
- ピッカー経由の作成・更新では `linkTarget: { type, id, label } | null` を FK 3 本（`dealId` / `inquiryId` / `meetingId`）にマッピングする
- `linkTarget.type === "deal"` → `dealId = id, inquiryId = null, meetingId = null`
- `linkTarget.type === "inquiry"` → `dealId = null, inquiryId = id, meetingId = null`
- `linkTarget.type === "meeting"` → `dealId = null, inquiryId = null, meetingId = id`
- `linkTarget === null` → `dealId = null, inquiryId = null, meetingId = null`

#### Alternative 1: usecase に「最大 1 FK」の不変条件を強制する

| | |
|---|---|
| **Pros** | 単一紐づけがアプリケーション全経路で保証され、呼び出し元の慣習的遵守に依存しない |
| **Cons** | MeetingActionItemsSection は meetingId+dealId を同時送信するため、usecase でエラーになる。会議タスクの一覧「親案件名表示」（dealId → meetingId → inquiryId 優先ロジック）が失われる |
| **Why not** | 既存の MeetingActionItemsSection を壊し、会議タスクの親案件名表示というビジネス価値が失われるため |

#### Alternative 2: DB レベルの CHECK 制約（3 FK のうち最大 1 つが NOT NULL）を追加する

| | |
|---|---|
| **Pros** | DB レベルで単一紐づけを強制でき、不正データの挿入を防げる |
| **Cons** | 既存データに複数 FK が同時にセットされた行が存在する場合、マイグレーションで CHECK 制約違反が発生する。MeetingActionItemsSection（meetingId+dealId 同時送信）が INSERT エラーになる |
| **Why not** | 既存データへの影響リスクがあり、MeetingActionItemsSection のコンテキスト作成と矛盾するため。呼び出し元でのマッピングで十分 |

---

### D2: 再利用可能なピッカーコンポーネント（LinkTargetPicker）を新設する

**Decision**: `src/app/(dashboard)/components/LinkTargetPicker.tsx` として汎用モーダルコンポーネントを新設する。確定値は `{ type: "deal" | "inquiry" | "meeting", id: string, label: string } | null` の形式で親コンポーネントに返す。タスク新規作成（TaskList）と編集（ActionItemModal）の両方で再利用する。

**Rationale**:
- 同一ピッカーを TaskList と ActionItemModal の 2 箇所で再利用することで、UX と実装を統一できる
- 将来、他のエンティティ選択（例: 新しい関連エンティティ）でも同パターンを適用可能
- 外部ラッパーが `open=false` でコンポーネントをアンマウントすることで state リセットを自動化（explicit reset 不要）

**コンポーネント設計の原則**:
- 3 タブ（案件/引合/会議）で種別を分割し、横断統合検索は行わない
- 各タブに検索ボックスを持ち、入力をデバウンスして `searchLinkTargetsAction` を呼ぶ
- 「なし」ボタンで紐づけを外す（`null` を返す）
- 初期値（`defaultValue`）を受け取り、現在の選択状態を表示できる

#### Alternative 1: 3 種を 1 つの検索結果に混ぜる横断統合検索 UI にする

| | |
|---|---|
| **Pros** | 入力フォームが 1 つで済み、ユーザーがタブを意識しなくてよい |
| **Cons** | 案件・引合・会議で label フォーマットが異なるため結果一覧が混在して見づらい。種別が明確でないと誤選択しやすい |
| **Why not** | ユーザーが探す種別は明確であることが多く、タブで分割した方が UX が明快。label フォーマットの違いによる実装複雑度も増すため |

#### Alternative 2: TaskList・ActionItemModal それぞれに独立した選択 UI を実装する

| | |
|---|---|
| **Pros** | 各画面の要件に特化した UI を個別に最適化できる |
| **Cons** | 同じ UX パターン（タブ+サーバー検索+デバウンス）を 2 箇所で重複実装することになる。修正時に両方を更新する必要が生じる |
| **Why not** | 共通コンポーネントとして抽出することで、UX の一貫性を保ちつつ実装コストを削減できるため |

---

### D3: サーバー検索を採用し、クライアント全件ロードを廃止する

**Decision**: 各リポジトリ（dealRepository / inquiryRepository / meetingRepository）に検索メソッドを追加し、Server Action（`searchLinkTargetsAction`）経由でサーバー側検索を行う。TaskList ページからの全件ロード（`listDeals` / `listInquiries`）は除去する。検索結果は LINK_SEARCH_LIMIT（20）件に制限する。

**Rationale**:
- 案件/引合/会議の件数が増えてもスケールする（O(n) ロードを回避）
- Server Action を経由することでテナント分離（organizationId でのフィルタリング）を一元管理できる
- LIMIT 20 で DB 負荷を抑制。ページングは設けず、キーワードを絞り込んで先頭一致で十分

**リポジトリ検索メソッドの規約**:
- `dealRepository.searchByTitle(organizationId, query)` — `ilike '%query%'` で部分一致
- `inquiryRepository.searchByTitle(organizationId, query)` — `ilike '%query%'` で部分一致
- `meetingRepository.searchBySummary(organizationId, query)` — `summary IS NOT NULL AND ilike '%query%'`
- すべて `organizationId` フィルタを WHERE に含む（テナント分離必須）
- すべて `LIMIT LINK_SEARCH_LIMIT` を適用する

#### Alternative 1: 全件をクライアントへ渡してクライアント側で filter する

| | |
|---|---|
| **Pros** | Server Action を追加せずに済む。ネットワークリクエストなしでリアルタイムフィルタリングができる |
| **Cons** | 案件・引合・会議が増えると初期ロードが重くなり、既存のプルダウンと同じ探索不能問題が再発する |
| **Why not** | 大規模データでスケールしない。全件 props 渡し（`dealOptions` / `inquiryOptions`）という現状の問題を解決しないため |

#### Alternative 2: ページング付きの検索（cursor / offset pagination）を実装する

| | |
|---|---|
| **Pros** | 候補が多い場合でも全件参照できる |
| **Cons** | UI にページネーション or 無限スクロールの実装コストが加わる。検索キーワードを絞り込む UX では先頭 LIMIT 件で実用上十分 |
| **Why not** | 検索ボックスで絞り込む UX では LIMIT 20 の先頭一致で実用上十分であり、ページングの実装コストに見合わないため |

---

### D4: 会議は summary を検索対象とし、「日付+種別ラベル+親名」でラベル表示する

**Decision**: Meeting に `title` が無いため、検索対象は `summary` フィールドのみとし、`summary IS NULL` の会議は検索対象から除外する。ピッカーでの表示ラベルは `${formatDateJP(date)} ${meetingTypeLabels[type]}`、親の案件または引合がある場合は `（${parentName}）` を付記する。

**Rationale**:
- Meeting モデルに `title` が無いため、summary が最もユーザーにとって意味のある検索軸
- `listActionItems` の会議表示（日付ベース: `formatDateJP(meeting.date)`）と整合させることで、表示ロジックの二重実装を避ける
- `formatDateJP` を `src/lib/dateUtils.ts`、`meetingTypeLabels` を `src/lib/meetingLabels.ts` として共有ユーティリティに切り出し、`searchMeetings.ts` が `src/app/(dashboard)/` を参照しないアーキテクチャ境界を維持する

#### Alternative 1: date ベース検索（日付文字列の部分一致）を採用する

| | |
|---|---|
| **Pros** | 「2026/01/15」のような日付文字列で絞り込める |
| **Cons** | ユーザーが正確な日付フォーマットを把握している必要があり、部分入力と日付フォーマットの一致が煩雑。summary の方がユーザーにとって自然な検索軸 |
| **Why not** | 日付フォーマットの一致が煩雑で UX が低下するため。summary によるキーワード検索の方が自然 |

#### Alternative 2: Meeting モデルに title フィールドを追加する

| | |
|---|---|
| **Pros** | 案件・引合と同じ title ベースの検索・表示に統一でき、ピッカーの実装が均一になる |
| **Cons** | DB スキーマ変更（`meetings` テーブルへの `title` カラム追加）とデータ移行が必要。既存の会議作成 UI も title 入力欄の追加が必要になる |
| **Why not** | 本変更のスコープを大幅に超えるスキーマ変更が必要であり、既存の `listActionItems` の会議表示（日付ベース）との整合性を考慮すると summary 活用の方が現実的なため |

---

### D5: searchLinkTargetsAction を単一の Server Action として新設する

**Decision**: `src/app/actions/actionItems.ts` に `searchLinkTargetsAction({ type, query })` を追加し、`type` パラメータで deal / inquiry / meeting の usecase を呼び分ける。認証・テナント分離（organizationId の取得）はこの Action 内で行う。戻り値は統一形式 `{ id: string, label: string }[]`。

**Rationale**:
- 3 種別の検索を 1 つの Action にまとめることで、呼び出し元（LinkTargetPicker）のインターフェースを単純化
- 認証・organizationId 取得が 1 箇所に集約され、テナント分離の漏れを防ぎやすい
- 既存の `actionItems.ts` に追加することで、アクションアイテム関連の操作を 1 ファイルにまとめる

---

## Consequences

### Positive

- TaskList・ActionItemModal の双方でタスクの紐づけ先を案件/引合/会議から検索して選択・変更・クリアできるようになる
- ピッカー経由の操作では単一紐づけが保証され、「案件と引合の両方に紐づく」という曖昧な状態を新規作成・更新で発生させなくなる
- MeetingActionItemsSection からの作成（meetingId+dealId 同時保持）は引き続き動作し、会議タスク一覧の「親案件名表示」が維持される
- サーバー検索パターン（リポジトリの `searchBy*` メソッド + Server Action + LIMIT）が確立され、他エンティティでも踏襲できる
- `formatDateJP` / `meetingTypeLabels` が共有ユーティリティとして確立され、重複実装が解消される

### Negative / Trade-offs

- ピッカーを経由しないコンテキスト（MeetingActionItemsSection 等）は従来通り複数 FK を保持でき、「ピッカー経由のみ単一紐づけ」というルールは呼び出し元の慣習的遵守に依存する（usecase や DB での強制なし）
- 既存データに複数 FK が同時にセットされた行が存在する場合、ピッカーでの編集時に「どの FK を現在の紐づけとして表示するか」は `dealId → meetingId → inquiryId` の優先ロジックに従う（listActionItems と同じ）
- `ilike` による部分一致検索のパフォーマンスは organizationId インデックスに依存。大規模データでの全文検索は将来課題

### Constraints for future changes

- **新しいエンティティ選択 UI**: 同様の「エンティティ検索して 1 件選ぶ」UI を実装する場合は `LinkTargetPicker` を拡張・再利用することを検討すること。新しいエンティティ type を追加する場合はタブを追加し、対応する `searchLinkTargetsAction` のブランチと usecase を追加するパターンを踏襲すること
- **リポジトリ検索メソッド**: 他エンティティに検索メソッドを追加する際は `searchBy*(organizationId, query)` の規約に従い、organizationId フィルタと LINK_SEARCH_LIMIT を必ず適用すること。テナント分離の漏れを防ぐため、Server Action 内で organizationId をセッションから取得する
- **ピッカー経由の FK マッピング**: ピッカーを新たな画面で使う場合、呼び出し元が `linkTarget → (dealId / inquiryId / meetingId)` の FK マッピングを行い、選択 type 以外の FK を null にすること（D1 参照）
- **MeetingActionItemsSection の維持**: usecase レベルで「最大 1 FK」の不変条件を追加しないこと。追加した場合、meetingId+dealId 同時保持のコンテキスト作成が壊れる
- **会議の表示ラベル**: 会議を検索・表示する新たな箇所では `src/lib/dateUtils.ts` の `formatDateJP` と `src/lib/meetingLabels.ts` の `meetingTypeLabels` を使い、重複実装を避けること

---

## References

- `specrunner/changes/task-link-picker-modal/design.md` — 詳細設計（D1〜D7）
- `specrunner/changes/task-link-picker-modal/request.md` — 要件定義
- `specrunner/changes/task-link-picker-modal/review-feedback-001.md` — コードレビュー所見
- `ADR-016-action-items-independent-table.md` — アクションアイテム独立テーブル化（3 FK nullable・CHECK 制約なしの根拠）
- `src/app/(dashboard)/components/LinkTargetPicker.tsx` — ピッカーコンポーネント実装
- `src/app/actions/actionItems.ts` — `searchLinkTargetsAction` 実装
- `src/application/usecases/searchDeals.ts` — 案件検索 usecase
- `src/application/usecases/searchInquiries.ts` — 引合検索 usecase
- `src/application/usecases/searchMeetings.ts` — 会議検索 usecase
- `src/infrastructure/repositories/dealRepository.ts` — `searchByTitle` 実装
- `src/infrastructure/repositories/inquiryRepository.ts` — `searchByTitle` 実装
- `src/infrastructure/repositories/meetingRepository.ts` — `searchBySummary` 実装
- `src/lib/dateUtils.ts` — `formatDateJP` 共有ユーティリティ
- `src/lib/meetingLabels.ts` — `meetingTypeLabels` 共有ユーティリティ
