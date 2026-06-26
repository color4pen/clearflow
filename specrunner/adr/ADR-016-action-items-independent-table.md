# ADR-016: アクションアイテムの独立テーブル化

- **Status**: accepted
- **Date**: 2026-06-26
- **Change**: action-items-schema
- **Deciders**: architect

---

## Context

アクションアイテムは `meetings.action_items` カラムに JSONB 配列として埋め込まれていた（`src/infrastructure/schema.ts`）。型定義は `ActionItem` 型（`{ description, assignee (string), dueDate (string|null), done (boolean) }`）で、独自の ID や FK を持たない構造だった。

この構造には以下の制約があった:

- 案件（Deal）や引合（Inquiry）に直接紐づくアクションアイテムを作成できない（必ず Meeting 経由）
- 個人タスクとしてのアクションアイテム（Meeting/Deal/Inquiry に紐づかない）を作成できない
- アクションアイテム単体での CRUD・フィルタリング・担当者フィルタが困難
- `assignee` がユーザー名の文字列であり、ユーザー ID への FK を持たないため、担当者変更・退職時の追跡が不可能

本変更では `action_items` テーブルを独立エンティティとして新設し、モデル・リポジトリ・ユースケース・サーバーアクションのバックエンドを実装する。UI の切り替えは後続リクエストで行い、`meetings.action_items` カラムは削除しない（過渡期の二重管理を許容する）。

---

## Decisions

### D1: テーブル設計 — 全紐づけ先 nullable、CHECK 制約なし

**Decision**: `meeting_id`, `deal_id`, `inquiry_id` をすべて nullable FK とし、CHECK 制約を設けない。

**Rationale**:
- 個人タスク（どのエンティティにも紐づかない）を作成可能にする柔軟性を確保する
- CHECK 制約で「いずれか 1 つは NOT NULL」としないことで、将来の拡張（プロジェクト単位のタスクなど）にも対応しやすい

#### Alternative 1: CHECK 制約で少なくとも 1 FK を NOT NULL に強制

| | |
|---|---|
| **Pros** | どのエンティティにも紐づかないゴミデータを防げる |
| **Cons** | 個人タスクが作れなくなる。将来の拡張で CHECK 制約の変更が必要になる |
| **Why not** | 個人タスクユースケースの実現が要件に含まれるため |

#### Alternative 2: ポリモーフィック FK（entity_type + entity_id 1 カラム）

| | |
|---|---|
| **Pros** | FK カラム数を減らせる |
| **Cons** | 型安全性が低下し、DB レベルの FK 制約を設定できない。JOIN が複雑になる |
| **Why not** | DB 整合性が犠牲になるため |

---

### D2: assignee_id を users テーブルへの FK として設計

**Decision**: 新テーブルの `assignee_id` は `users.id` への nullable FK とする。既存の `meetings.action_items` の `assignee`（名前文字列）はマイグレーション時に `assignee_id = null` で移行し、`description` に `[担当: {assignee}]` を付記して情報を保持する。

**Rationale**:
- ユーザー名文字列では退職・改名時の追跡が不可能。FK にすることで担当者フィルタや通知の実装が将来可能になる
- 既存データの `assignee` はユーザー名文字列であり、userId への名寄せは同名ユーザー・退職者の問題で整合性を保証できないため、description 付記で情報を保持する

#### Alternative 1: assignee を文字列のまま残す

| | |
|---|---|
| **Pros** | マイグレーションが単純 |
| **Cons** | FK 制約なし、担当者フィルタの正確性がない、退職・改名時の追跡が不可能 |
| **Why not** | 将来の担当者フィルタ・通知機能の実装を阻害するため |

#### Alternative 2: マイグレーション時に名前からユーザーを名寄せ

| | |
|---|---|
| **Pros** | 既存データも assignee_id に変換できる |
| **Cons** | 同名ユーザー・退職者の問題があり、データ整合性を保証できない |
| **Why not** | 不正確な名寄せは誤った担当者割り当てを生み出すため |

---

### D3: authorization.ts の Entity 型に `"actionItem"` を追加

**Decision**: `src/domain/authorization.ts` の `Entity` union と `PERMISSION_MATRIX` に `"actionItem"` を追加する。権限は meeting と同等（create/edit: admin+manager+member、delete: admin+manager）とする。

**Rationale**:
- meeting と同じビジネスコンテキスト（商談活動）に属するため、同じ権限レベルが適切
- 将来アクションアイテム固有の権限が必要になった場合に `"actionItem"` エンティティを独立して変更できる

#### Alternative 1: meeting エンティティの権限を流用

| | |
|---|---|
| **Pros** | 実装が簡単 |
| **Cons** | 将来アクションアイテム固有の権限が必要になった場合に分離できなくなる |
| **Why not** | 権限の独立性を確保するため |

---

### D4: マイグレーションは Drizzle generate + 手動データ移行 SQL の 2 段階

**Decision**: スキーマ変更は `drizzle-kit generate` で DDL を生成し、データ移行は別ファイル（`drizzle/0008_migrate_action_items_data.sql`）として手動作成する。

**Rationale**:
- Drizzle のマイグレーションは DDL のみ生成する。既存 JSON データの INSERT は Drizzle の生成対象外であり、手動 SQL が必要
- 2 ファイルに分離することで DDL 適用 → データ移行の順序を明確にし、ロールバック時の切り分けも容易にする
- データ移行 SQL に `WHERE jsonb_typeof(action_items) = 'array' AND jsonb_array_length(action_items) > 0` のガードを入れ、不正な JSON データによる失敗を防ぐ

#### Alternative 1: seed スクリプトでデータ移行

| | |
|---|---|
| **Pros** | TypeScript で記述できる |
| **Cons** | 本番デプロイ時に seed を実行するフローがない |
| **Why not** | デプロイフローに乗らないため |

#### Alternative 2: 単一マイグレーションファイルに DDL + DML を混在

| | |
|---|---|
| **Pros** | ファイル数が少ない |
| **Cons** | Drizzle の生成ファイルに手動編集を加えると、再生成時に上書きされるリスクがある |
| **Why not** | 再生成による上書きリスクを排除するため |

---

### D5: サーバーアクションは JSON body 形式で受け取る

**Decision**: アクションアイテムのサーバーアクションは JSON body（`z.object` でパース）形式とする。既存の meeting サーバーアクション（FormData 形式）とは異なる。

**Rationale**:
- アクションアイテムの操作は個別フィールドの更新（toggle、description 変更など）が中心で、ファイルアップロードを伴わない
- JSON の方がバリデーションが簡潔で、将来の API 化にも対応しやすい

**Trade-off**: 既存の meeting サーバーアクション（FormData 形式）と統一感がない。UI 実装時に呼び出し形式を合わせる必要がある（code review finding #2 として記録済み）。

#### Alternative 1: FormData 形式（既存 meeting サーバーアクションと統一）

| | |
|---|---|
| **Pros** | 既存の `meetings.ts` サーバーアクションとインタフェースが統一される。`useActionState` との親和性がある |
| **Cons** | アクションアイテムの操作はファイルアップロードを伴わない単純な更新が中心であり、FormData のオーバーヘッドが不要 |
| **Why not** | アクションアイテムの操作パターン（toggle、単一フィールド更新）には JSON の方が適切で、バリデーションも簡潔なため |

---

### D6: インデックス戦略

**Decision**: `action_items` テーブルに `(organization_id, done)`、`(meeting_id)`、`(deal_id)` のインデックスを追加する。`inquiry_id` のインデックスは初期段階では省略する。

**Rationale**:
- 主要なクエリパターン（組織内一覧、商談別、案件別）に対応するインデックスを優先する
- `inquiry_id` の利用パターンは引合詳細 UI が実装されるまで確定しないため、過剰投資を避ける

#### Alternative 1: 全 FK カラム（organization_id, meeting_id, deal_id, inquiry_id, assignee_id）にインデックスを追加

| | |
|---|---|
| **Pros** | どのクエリパターンにも対応できる。後から追加する手間がない |
| **Cons** | `inquiry_id` の利用頻度が初期段階では未確定。インデックスは書き込み性能を低下させるため、不要なインデックスはオーバーヘッドになる |
| **Why not** | 利用パターンが確立してから必要なインデックスを追加する方が合理的なため |

---

### D7: バックエンドと UI を分フェーズで実装

**Decision**: 本変更ではバックエンド（テーブル・モデル・リポジトリ・ユースケース・サーバーアクション）のみを実装し、UI の切り替えは後続リクエストで行う。`meetings.action_items` カラムは削除しない。

**Rationale**:
- スコープを縮小して spec-review を通しやすくし、段階的にリスクを低減する
- 過渡期は `meetings.action_items` への書き込みが既存 meeting CRUD 経由で継続し、新テーブルへの書き込みはサーバーアクション経由のみとなる

---

## Consequences

### Positive

- アクションアイテムが独立エンティティとなり、Deal・Inquiry への直接紐づけと個人タスクが実現できる
- `assignee_id` が FK になることで、担当者フィルタ・通知の実装基盤が整う
- `"actionItem"` エンティティが authorization.ts に追加され、将来の権限変更を独立して管理できる
- 2 段階マイグレーションで DDL とデータ移行の切り分けが明確になる

### Negative / Trade-offs

- UI 切り替えまでの過渡期、`meetings.action_items` と `action_items` テーブルの二重管理が発生する。既存の meeting CRUD が `meetings.action_items` に書き込み続けるため、新テーブルのデータが最新ではない状態が続く
- 移行データの `assignee_id` は null のまま残る。後続 UI リクエストで担当者を userId に紐づける機能を提供するまで、description の `[担当: ...]` 付記が唯一の情報源となる
- サーバーアクションの呼び出し形式（JSON body）が既存 meeting サーバーアクション（FormData）と異なる

### Constraints for future changes

- **UI 切り替えリクエスト**: `MeetingActionItemsSection`、`DealActionItemsSection`、ダッシュボードの読み取り元を新テーブルに切り替えた後、`meetings.action_items` への書き込みを停止すること。`meetings.action_items` カラムの削除はさらに後続のリクエストで行うこと
- **`meetings.action_items` カラムの削除**: カラムを削除する場合は、UI 切り替え完了後かつすべての読み取り・書き込みが新テーブルに移行済みであることを確認してから行うこと
- **inquiry_id インデックス**: 引合詳細 UI の利用パターンが確立したら `(inquiry_id)` インデックスの追加を検討すること
- **新たな紐づけ先の追加**: 新たなエンティティ（プロジェクトなど）に紐づくアクションアイテムを作成する場合、FK カラムを nullable で追加し、CHECK 制約は設けないパターン（D1）を踏襲すること
- **サーバーアクションの形式**: 後続の UI リクエストでは JSON body 形式（`z.object.safeParse`）でサーバーアクションを呼び出すこと。FormData 形式への変更は設計変更として design.md に記録すること

---

## References

- `specrunner/changes/action-items-schema/design.md` — 詳細設計（D1〜D6）
- `specrunner/changes/action-items-schema/request.md` — 要件定義
- `specrunner/changes/action-items-schema/review-feedback-001.md` — コードレビュー所見
- `drizzle/0007_nice_lily_hollister.sql` — action_items テーブル DDL
- `drizzle/0008_migrate_action_items_data.sql` — 既存 JSON データの移行 SQL
- `src/domain/models/actionItem.ts` — ActionItem ドメインモデル型
- `src/infrastructure/repositories/actionItemRepository.ts` — リポジトリ実装
- `src/application/usecases/createActionItem.ts` — ユースケース実装（ownership チェック含む）
- `src/app/actions/actionItems.ts` — サーバーアクション実装
- `src/domain/authorization.ts` — `"actionItem"` エンティティ追加
- `ADR-001-foundation-db-auth-domain.md` — ドメイン層の基本原則
- `ADR-012-authorization-centralization.md` — 認可チェックの一元化
