# アクションアイテムのテーブル・モデル・リポジトリ・ユースケース新設

## Meta

- **type**: new-feature
- **slug**: action-items-schema
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新テーブル追加、JSON 埋め込みからの構造変更 → true -->

## 背景

アクションアイテムを meetings.action_items の JSON 埋め込みから独立テーブルに切り出す。本リクエストではテーブル・モデル・リポジトリ・ユースケース・サーバーアクションのバックエンドのみを実装する。UI の切り替えは後続リクエストで行う。

## 現状コードの前提

- `src/infrastructure/schema.ts:358` — meetings テーブルの `action_items jsonb NOT NULL DEFAULT '[]'`
- `src/domain/models/meeting.ts:12-17` — ActionItem 型: `{ description, assignee (string), dueDate (string|null), done (boolean) }`

## 要件

1. **action_items テーブルの新設**: id (uuid PK), organization_id (FK → organizations), description (text NOT NULL), assignee_id (uuid nullable FK → users), due_date (timestamptz nullable), done (boolean NOT NULL DEFAULT false), meeting_id (uuid nullable FK → meetings), deal_id (uuid nullable FK → deals), inquiry_id (uuid nullable FK → inquiries), created_by_id (uuid NOT NULL FK → users), created_at (timestamptz NOT NULL DEFAULT now()), updated_at (timestamptz NOT NULL DEFAULT now())。全紐づけ先は nullable
2. **ActionItem モデル型**: `src/domain/models/actionItem.ts` を新設。id, organizationId, description, assigneeId (string|null), dueDate (Date|null), done, meetingId (string|null), dealId (string|null), inquiryId (string|null), createdById, createdAt, updatedAt
3. **actionItemRepository**: create, findById, findByOrganization(organizationId, filters?: { done?, assigneeId?, dealId?, meetingId? }), update, delete を実装
4. **ユースケース**: createActionItem, toggleActionItemDone, updateActionItem, deleteActionItem, listActionItemsByDeal, listActionItemsByMeeting を実装。各ユースケースで organizationId の一致を検証する
5. **サーバーアクション**: `src/app/actions/actionItems.ts` に createActionItemAction, toggleActionItemAction, updateActionItemAction, deleteActionItemAction を実装する。各アクションで認可チェック（canPerform）と、紐づけ先エンティティの organizationId 検証（ownership チェック）を行う。revalidatePath は `/dashboard` を常に含め、dealId があれば `/deals/[dealId]`、meetingId があれば `/deals/[dealId]/meetings/[meetingId]` も再検証する
6. **既存データのマイグレーション**: meetings.action_items の JSON データを action_items テーブルに移行する SQL を作成する。assignee（名前文字列）は assignee_id = null で移行し、description に「[担当: {assignee}] {description}」として付記する。meetings.action_items カラムは残す

## スコープ外

- UI の切り替え（MeetingActionItemsSection, DealActionItemsSection, ダッシュボード）— 後続リクエスト
- meetings.action_items カラムの削除
- 引合詳細・個人タスク画面の新設

## 受け入れ基準

- [ ] action_items テーブルが存在する
- [ ] ActionItem モデル型が定義されている
- [ ] actionItemRepository の CRUD が実装されている
- [ ] 各ユースケースが organizationId を検証する
- [ ] サーバーアクションに認可チェックと ownership チェックがある
- [ ] 既存データのマイグレーションが正常に完了する
- [ ] meetings.action_items カラムが残っている
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **バックエンドと UI を分離** — スコープを縮小して spec-review を通しやすくする。UI の切り替えは独立したリクエストで行う
2. **全紐づけ先を nullable、CHECK 制約なし** — 個人タスクも作れる柔軟性を確保する
3. **マイグレーションで assignee を description に付記** — assignee は名前文字列で userId ではないため、FK として移行できない。情報を失わないよう description に含める
