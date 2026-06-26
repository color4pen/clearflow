# Design: アクションアイテムのテーブル・モデル・リポジトリ・ユースケース新設

## Context

アクションアイテムは現在 `meetings.action_items` カラムに JSONB 配列として埋め込まれている（`src/infrastructure/schema.ts:358`）。型定義は `src/domain/models/meeting.ts:12-17` の `ActionItem` 型（`{ description, assignee (string), dueDate (string|null), done (boolean) }`）で、独自の ID や FK を持たない。

この構造には以下の制約がある:

- 案件（Deal）や引合（Inquiry）に直接紐づくアクションアイテムを作成できない（必ず Meeting 経由）
- 個人タスクとしてのアクションアイテム（Meeting/Deal/Inquiry 無関係）を作成できない
- アクションアイテム単体での CRUD、フィルタリング、担当者フィルタが困難
- `assignee` がユーザー名の文字列であり、ユーザー ID への FK を持たない

本変更では `action_items` テーブルを独立して新設し、モデル・リポジトリ・ユースケース・サーバーアクションのバックエンド部分を実装する。UI の切り替えは後続リクエストで行い、`meetings.action_items` カラムは削除しない。

確認済みの既存コード:

- `src/infrastructure/schema.ts` — meetings テーブルの `actionItems: jsonb("action_items")` (L358)
- `src/domain/models/meeting.ts` — `ActionItem` 型 (L12-17)
- `src/domain/authorization.ts` — `canPerform` 関数。`Entity` 型に `"actionItem"` は未定義
- `src/domain/models/dashboard.ts` — `DashboardActionItem` 型の `"action_item"` variant が meetings.actionItems を参照
- `src/application/usecases/getDashboardActions.ts` — meetings から actionItems を取得してダッシュボードに表示

## Goals / Non-Goals

**Goals**:

- `action_items` テーブルを新設し、独立したエンティティとしてアクションアイテムを管理できるようにする
- `ActionItem` ドメインモデル型を `src/domain/models/actionItem.ts` に定義する
- `actionItemRepository` で CRUD + フィルタ付き一覧取得を実装する
- ユースケース層で organizationId の一致検証を行う CRUD ユースケースを実装する
- サーバーアクション層で認可チェック（canPerform）と紐づけ先エンティティの ownership チェックを実装する
- 既存の `meetings.action_items` JSON データを新テーブルへ移行するマイグレーション SQL を作成する
- `authorization.ts` の Entity 型に `"actionItem"` を追加し、権限マトリクスを定義する

**Non-Goals**:

- UI の切り替え（MeetingActionItemsSection, DealActionItemsSection, ダッシュボード）
- `meetings.action_items` カラムの削除
- 引合詳細・個人タスク画面の新設
- `getDashboardActions` ユースケースの新テーブル対応（UI 切り替えリクエストで対応）

## Decisions

### D1: テーブル設計 — 全紐づけ先 nullable、CHECK 制約なし

`meeting_id`, `deal_id`, `inquiry_id` をすべて nullable FK とし、CHECK 制約を設けない。

**Rationale**: 個人タスク（どのエンティティにも紐づかない）を作成可能にする柔軟性を確保する。CHECK 制約で「いずれか 1 つは NOT NULL」としないことで、将来の拡張（例: プロジェクト単位のタスク）にも対応しやすい。architect 評価済みの設計判断。

**Alternatives considered**:
- CHECK 制約で少なくとも 1 FK を NOT NULL に強制 — 個人タスクが作れなくなるため却下
- ポリモーフィック FK（entity_type + entity_id 1 カラム）— 型安全性が低下し、DB レベルの FK 制約を設定できないため却下

### D2: assignee を userId FK として設計

新テーブルの `assignee_id` は `users.id` への FK とする。既存の meetings.action_items の `assignee`（名前文字列）はマイグレーション時に FK として解決できないため、`assignee_id = null` とし、description に `[担当: {assignee}]` を付記して情報を保持する。

**Rationale**: ユーザー名文字列では退職・改名時の追跡が不可能。FK にすることで担当者フィルタや通知の実装が将来可能になる。architect 評価済みの設計判断。

**Alternatives considered**:
- assignee を文字列のまま残す — FK 制約やフィルタの正確性が失われるため却下
- マイグレーション時に名前からユーザーを名寄せ — 同名ユーザーや退職者の問題があり、データ整合性を保証できないため却下

### D3: authorization に `"actionItem"` エンティティを追加

`src/domain/authorization.ts` の `Entity` union と `PERMISSION_MATRIX` に `"actionItem"` を追加する。権限は meeting と同等（create/edit: admin+manager+member、delete: admin+manager）とする。

**Rationale**: meeting と同じビジネスコンテキスト（商談活動）に属するため、同じ権限レベルが適切。

**Alternatives considered**:
- meeting エンティティの権限を流用（`canPerform(role, "meeting", "create")`）— 将来アクションアイテム固有の権限が必要になった場合に分離できなくなるため却下

### D4: マイグレーションは Drizzle generate + 手動データ移行 SQL の 2 段階

スキーマ変更は `drizzle-kit generate` で DDL を生成し、データ移行は別の SQL ファイル（`drizzle/0007_migrate_action_items_data.sql` 等）として手動作成する。

**Rationale**: Drizzle のマイグレーションは DDL のみ生成する。既存 JSON データの INSERT は Drizzle の生成対象外であり、手動 SQL が必要。2 つのファイルに分離することで、DDL 適用 → データ移行の順序を明確にし、ロールバック時の切り分けも容易にする。

**Alternatives considered**:
- seed スクリプトでデータ移行 — 本番デプロイ時に seed を実行するフローがないため却下
- 単一マイグレーションファイルに DDL + DML を混在 — Drizzle の生成ファイルに手動編集を加えると再生成時に上書きされるリスクがあるため却下

### D5: サーバーアクションは JSON body 形式で受け取る

既存の meeting サーバーアクションは FormData 形式だが、アクションアイテムのサーバーアクションは JSON body（`z.object` でパース）形式とする。UI からは `fetch` or Server Action の直接呼び出しで使用する。

**Rationale**: アクションアイテムの操作は個別フィールドの更新（toggle, description 変更等）が中心で、ファイルアップロードを伴わない。JSON の方がバリデーションが簡潔で、将来の API 化にも対応しやすい。

**Alternatives considered**:
- FormData 形式 — 既存の meetings.ts と統一感があるが、アクションアイテムの操作は単純な JSON で十分なため不採用

### D6: インデックス戦略

`action_items` テーブルに以下のインデックスを追加する:

- `(organization_id, done)` — 組織内のアクションアイテム一覧（done フィルタ付き）
- `(meeting_id)` — 商談に紐づくアクションアイテム取得
- `(deal_id)` — 案件に紐づくアクションアイテム取得

**Rationale**: 主要なクエリパターン（組織内一覧、商談別、案件別）に対応するインデックス。`inquiry_id` のインデックスは初期段階では省略し、利用パターンが確立してから追加する。

**Alternatives considered**:
- 全 FK カラムにインデックス — inquiry_id の利用頻度が未確定のため過剰。必要時に追加する

## Risks / Trade-offs

[Risk] マイグレーション中の meetings.action_items と action_items テーブルの二重管理 → UI 切り替えまでの過渡期、meetings.action_items への書き込みは既存の meeting CRUD 経由で継続する。新テーブルへの書き込みはサーバーアクション経由のみ。UI 切り替えリクエストで読み取り元を新テーブルに切り替え、meetings.action_items への書き込みを停止する。

[Risk] マイグレーション SQL でのデータ変換品質 → `jsonb_array_elements` で JSON 配列を展開するため、不正な JSON（空配列以外で壊れたデータ）があるとマイグレーションが失敗する可能性がある。マイグレーション SQL に `WHERE jsonb_typeof(action_items) = 'array' AND jsonb_array_length(action_items) > 0` のガードを入れる。

[Risk] `assignee_id` が nullable のまま残る移行データ → 後続リクエストで UI から assignee を userId に紐づける機能を提供するまで、移行データの assignee_id は null のまま。description に付記した `[担当: {assignee}]` で情報を保持する。

## Open Questions

なし
