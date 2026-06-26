# Design: アクションアイテムの編集 UI・タスク一覧ページ・サイドバーメニュー追加

## Context

AI-a/AI-b で `action_items` テーブルと基本 UI（追加・完了切替）を実装済み。Server Actions（`createActionItemAction`, `toggleActionItemAction`, `updateActionItemAction`, `deleteActionItemAction`）および対応する usecase（`updateActionItem`, `deleteActionItem`）はバックエンドが完成しているが、フロントエンドで編集・削除を呼び出す UI がない。

現状の UI:
- `DealActionItemsSection` — 追加フォームと完了チェックボックスのみ
- `MeetingActionItemsSection` — 同上
- 横断的にアクションアイテムを閲覧する画面がない
- 個人タスク（紐づけ先なし）の作成手段がない

既存の共通コンポーネント:
- `ConfirmDialog` — 削除確認ダイアログとして利用可能
- `DataTable` — テーブル表示に利用可能
- `PageToolbar` — ページヘッダーに利用可能
- `SectionCard` — セクションラッパーに利用可能

権限:
- `actionItem.edit`: admin, manager, member
- `actionItem.delete`: admin, manager
- `actionItem.create`: admin, manager, member

## Goals / Non-Goals

**Goals**:
- `listActionItems` ユースケースを新設し、組織のアクションアイテムを紐づけ先情報付きで取得する
- `/tasks` にタスク一覧ページを新設する（未完了/完了のフィルタ切替、個人タスク新規作成）
- サイドバーに「タスク」メニューを追加する（「案件」と「契約」の間）
- `DealActionItemsSection` と `MeetingActionItemsSection` にインライン編集・削除 UI を追加する
- タスク一覧ページでも編集・削除を可能にする
- `actionItems.ts` Server Actions に `/tasks` の `revalidatePath` を追加する

**Non-Goals**:
- 引合詳細からのアクションアイテム追加
- リマインダー・優先度・カテゴリ
- ドラッグ&ドロップによる並び替え

## Decisions

### D1: インライン編集方式 — 行内で表示⇔編集モードを切り替える（architect 決定済み）

**決定**: アクションアイテムの編集は、モーダルではなく行内で編集モードに切り替える。「編集」ボタン押下で description / assigneeId / dueDate の入力フィールドに切り替わり、「保存」「キャンセル」ボタンで操作する。

**理由**: アクションアイテムは短いテキスト+担当者+期日の 3 フィールドなのでインラインで十分。モーダルは過剰。

**代替案**: モーダルダイアログで編集する案。フィールド数が少ないため UX 上の利点がなく、画面遷移のオーバーヘッドが増える。

### D2: タスク一覧のデータ取得 — `listActionItems` ユースケースを新設する（architect 決定済み）

**決定**: `/tasks/page.tsx`（Server Component）から `listActionItems` ユースケースを呼び出す。ユースケース内で `actionItemRepository.findByOrganization` を呼び出し、紐づけ先（案件名・商談日・引合名）の解決も行う。page.tsx から repository を直接呼ばない。

**理由**: F01a/F01b の方針に従い、依存方向 `actions/pages → usecases → repositories` を維持する。紐づけ先の名前解決は複数 repository にまたがるためユースケース層の責務。

**代替案**: page.tsx から repository を直接呼ぶ案。レイヤードアーキテクチャの方針に反する。

### D3: 紐づけ先情報の取得方法 — ユースケース内で関連テーブルを個別取得

**決定**: `listActionItems` ユースケース内で、取得したアクションアイテムの dealId / meetingId / inquiryId をもとに、対応する deal / meeting / inquiry を個別取得し、名前を解決する。返り値は `ActionItem` に紐づけ先表示名を付加した型（`ActionItemWithSource`）とする。

**理由**: Drizzle の既存リレーション定義を活用しつつ、findByOrganization の返却型を変更しない。紐づけ先は少数の entity 参照なので、N+1 問題は `Map` によるバッチ化で回避する。

**代替案**: Drizzle の `with` で JOIN する案。既存の `findByOrganization` のシグネチャ変更が必要になり影響範囲が大きい。

### D4: アクションアイテム行の共通コンポーネント抽出 — `ActionItemRow` を新設

**決定**: DealActionItemsSection / MeetingActionItemsSection / タスク一覧ページで共通する「表示モード ⇔ 編集モード」の行ロジックを `ActionItemRow` Client Component として抽出する。

**理由**: 3 箇所で同一の編集・削除ロジックを重複実装するのは DRY に反する。共通コンポーネントに抽出することで修正漏れを防ぐ。

**代替案**: 各セクションに個別実装する案。コードが重複し、保守性が低下する。

### D5: タスク一覧のフィルタ方式 — URL searchParams によるタブ切替

**決定**: 完了/未完了のフィルタは URL の `?status=done` / `?status=todo`（デフォルト: `todo`）で制御する。Server Component で searchParams を受け取り、`listActionItems` に `done` フィルタを渡す。

**理由**: 既存の DealsPage が searchParams でフィルタを実装するパターンを踏襲する。ブックマーク・共有が可能。

**代替案**: Client Component の state でフィルタする案。Server Component でのデータ取得が活かせず、ページ遷移のたびに全件取得になる。

### D6: revalidatePath の追加 — `/tasks` パスを追加

**決定**: 既存の `actionItems.ts` Server Actions（create / toggle / update / delete）の `revalidatePath` に `/tasks` を追加する。タスク一覧ページでの操作時にもキャッシュを無効化する。

**理由**: タスク一覧ページが新設されるため、アクションアイテムの変更がタスク一覧に反映される必要がある。

## Risks / Trade-offs

**[Risk] 紐づけ先の一括取得で N+1 問題が発生する可能性**
→ Mitigation: `listActionItems` ユースケース内で dealId / meetingId / inquiryId の一意集合を抽出し、各 repository で一括取得（`findByIds` 相当）する。ただし既存 repository に `findByIds` がない場合は、個別の `findById` を `Promise.all` で並列実行する。現時点で 1 組織あたりのアクションアイテム数は限定的であり、パフォーマンス問題は発生しにくい。

**[Risk] ActionItemRow の props インターフェースが肥大化する**
→ Mitigation: 編集に必要な orgUsers、各種コールバック（onUpdate, onDelete, onToggle）を明確に型定義する。紐づけ先表示は optional props とし、タスク一覧では表示、Deal/Meeting セクションでは非表示にする。

**[Trade-off] 共通コンポーネント抽出 vs. 各セクション個別実装**
→ 共通コンポーネントは初期実装コストが若干高いが、3 箇所での重複排除と将来の保守性を重視する。

## Open Questions

なし。architect 評価済みの設計判断により主要な論点は解決済み。
