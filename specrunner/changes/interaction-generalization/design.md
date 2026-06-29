# Design: 商談（Meeting）を顧客接点（Interaction）に一般化

## Context

設計ドキュメント（`docs/design/01-domain-design.md` &sect;4.3、`docs/design/06-data-model-design.md`）で定義された「顧客接点（Interaction）」概念を実装する。現在のコードベースでは商談が `meetings` テーブル / `Meeting` 型として独立したエンティティになっているが、設計上は meeting は Interaction の `kind` のひとつにすぎない。

### 現状

- `meetings` テーブル: `id`/`organization_id`/`deal_id`(nullable)/`inquiry_id`(nullable)/`type`(meetingTypeEnum)/`date`/`location`/`attendees`(jsonb)/`summary`/`action_items`(jsonb, レガシー)/`hearing_data`(jsonb)/`created_by_id`/`created_at`/`updated_at`/`version`。CHECK `(deal_id IS NOT NULL OR inquiry_id IS NOT NULL)`。
- `action_items` テーブル: `meeting_id` FK &rarr; meetings.id (ON DELETE SET NULL)。
- `meetingRepository`: create/findById/findAllByDeal/findAllByOrganization/findAllByInquiry/update/searchBySummary。
- 6 つの usecase: createMeeting/updateMeeting/getMeeting/listMeetings/listMeetingsByInquiry/searchMeetings + listActionItemsByMeeting。
- 監査: `meeting.create`/`meeting.update` (targetType="meeting")。
- タイムライン: `TIMELINE_ACTIONS` に `meeting.create`。`getDealActivity` が meetings を取得し targets に `{ targetType: "meeting", targetId }` を含める。
- 通知: `NOTIFICATION_ACTIONS` に `meeting.create`。`getNotifications` が同様に meetings を取得し targets に含める。
- 認可: `authorization.ts` の Entity 型に `"meeting"` が存在。
- UI: `src/app/actions/meetings.ts`、`src/app/(dashboard)/deals/[id]/meetings/**`、引合ページの商談セクション。

### 制約

- **データ不可侵**: 既存 `meetings` 行は 1 件も欠落させない。`action_items` の紐づけも維持する。
- **マイグレーションは本リクエスト外**: drizzle-kit のテーブルリネームは対話確認を伴い、非対話では drop+create に化ける恐れがあるため、マイグレーション SQL の生成・適用は本変更の実装スコープに含めない。スキーマ定義とコードを `interactions` 前提に変更し、振る舞い検証は mock ベースの `.dynamic.test.ts` で行う。
- **本リクエストで実体化するのは kind=meeting のみ**。他 kind の作成 UI は対象外。

## Goals / Non-Goals

**Goals**:

1. `meetings` テーブルを `interactions` テーブルにリネームし、`kind`(interaction_kind enum)・関連先 FK 3 列(`contract_id`/`invoice_id`/`client_id`)を追加してスキーマ定義を一般化する。
2. ドメインモデルを `Meeting` &rarr; `Interaction` に一般化し、`interactionRepository` を作成する。
3. 既存 usecase を kind=meeting の Interaction を扱うよう更新する（外部振る舞い不変）。
4. 監査アクションを `interaction.create`/`interaction.update`（metadata に kind）に切り替えつつ、既存 `meeting.*` 監査ログの参照を維持する。
5. タイムライン・通知の targets に `interaction` と `meeting` の両 targetType を含め、移行前の監査ログが消えないようにする。
6. UI/日本語表記「商談」を維持する。
7. `action_items.meeting_id` &rarr; `interaction_id` へのカラムリネームをスキーマ定義に反映する。

**Non-Goals**:

- 商談以外の kind（電話・メール・契約調整・請求調整）の作成 UI・導線。
- タイムライン表示ロジックの変更（R1 実装済）。
- 既存 meeting データの値変換・正規化。
- マイグレーション SQL の生成・適用（別途対話的に行う）。
- AR/債権管理。

## Decisions

### D1: テーブルリネーム + ADD COLUMN 方式

既存 `meetings` テーブルを `ALTER TABLE meetings RENAME TO interactions` でリネームし、新カラムを `ALTER TABLE ... ADD COLUMN` で追加する。全コピー＆drop や drop+create によるデータ欠落リスクを排除する。

**Rationale**: rename + ADD COLUMN は既存行を in-place で保持する最も安全なアプローチ。新テーブルへの INSERT + DROP は行欠落やトランザクション障害時のリスクが高い。

**Alternatives considered**:
- 新テーブル作成 + データコピー + 旧テーブル DROP: データ欠落リスクが高く、大量行のコピーコストがかかる。却下。
- ビュー方式（meetings ビューを残す）: drizzle-orm はビューの型推論が限定的で複雑性が増す。不要。

### D2: interaction_kind enum（meeting/call/email/contract_adjustment/invoice_adjustment）

`pgEnum("interaction_kind", ["meeting", "call", "email", "contract_adjustment", "invoice_adjustment"])` を定義。既存行には `DEFAULT 'meeting'` で kind を付与する。

**Rationale**: 設計ドキュメントのユビキタス言語辞書に定義された 5 種を忠実に実装。enum により不正値を DB レベルで排除。

**Alternatives considered**:
- text 型 + アプリ層バリデーション: DB レベルの型安全性が失われる。却下。

### D3: ポリモーフィック関連先（nullable FK + CHECK）

既存の `deal_id`/`inquiry_id` に加え `contract_id`/`invoice_id`/`client_id` を nullable FK として追加。CHECK 制約を「5 つのうち少なくとも 1 つが NOT NULL」に一般化する。

**Rationale**: 既存 `meetings_deal_or_inquiry_check` の自然な拡張。FK による参照整合性を保ちつつ、kind ごとに異なる関連先を持てる。

**Alternatives considered**:
- STI (Single Table Inheritance) + discriminator FK: FK 制約を kind 別に条件付きで定義する必要があり、PostgreSQL では CHECK 制約と nullable FK の組み合わせのほうがシンプル。却下。
- 関連テーブル分離（interaction_links）: ジョインコストと複雑性が増す。関連先の数が固定的なため nullable FK で十分。却下。

### D4: カラムリネーム戦略

| 旧カラム | 新カラム | 理由 |
|----------|----------|------|
| `type` (meetingTypeEnum) | `meeting_type` | kind=meeting 固有の商談種別。一般化後は kind により意味が異なるため名前を明確化 |
| `hearing_data` (jsonb) | `details` (jsonb) | kind 固有の構造化データを汎用的に格納。kind=meeting では HearingData |
| `action_items` (jsonb) | そのまま維持 | レガシーフィールド。action_items テーブルに移行済みのため変更不要 |

`action_items` テーブルの `meeting_id` は `interaction_id` にリネームする。

**Rationale**: 各カラムの意味が一般化後も明確になるよう命名。`details` は kind ごとの構造化データの統一フィールドとして機能する。

**Alternatives considered**:
- `type` を維持: kind=meeting 以外の interaction では意味が不明瞭になる。却下。
- `hearing_data` を維持: kind=meeting 以外の interaction では名前が不適切。却下。

### D5: 監査アクション移行（追記専用）

新規の監査ログは `interaction.create`/`interaction.update`（targetType="interaction"、metadata に `{ kind: "meeting" }`）で記録する。既存の `meeting.*` 監査ログは書き換えない。

**Rationale**: 監査ログは追記専用（append-only）が鉄則。既存ログの targetType を書き換えると監査の信頼性が損なわれる。

**Alternatives considered**:
- 既存ログの targetType を "interaction" に UPDATE: 追記専用原則に違反。却下。

### D6: タイムライン・通知の双方 targetType 戦略

`getDealActivity` と `getNotifications` の targets 配列に、各 interaction について `{ targetType: "interaction", targetId }` と `{ targetType: "meeting", targetId }` の**両方**を含める。`targetInfoMap` にも `interaction:<id>` と `meeting:<id>` の両キーに同じ表示情報を登録する。

**Rationale**: 既存の `meeting.create`/`meeting.update` 監査ログは `targetType="meeting"` で記録済み。`interaction` のみを引くと移行前の全履歴が消える。双方を含めることで移行前後のログを漏れなく取得できる。

**Alternatives considered**:
- 監査ログの targetType を一括 UPDATE: D5 で却下済み。
- `findByTargets` 内部で targetType エイリアスを解決: リポジトリ層にドメイン知識が漏れる。却下。

### D7: 型衝突の解決（LegacyMeetingActionItem）

`src/domain/models/meeting.ts` の `ActionItem` 型（jsonb 構造）は `src/domain/models/actionItem.ts` の `ActionItem` エンティティと同名衝突する。レガシー型を `LegacyMeetingActionItem` に改名する。

**Rationale**: 同一スコープで import した場合の名前衝突を防ぐ。レガシーフィールド（action_items テーブルに移行済み）であることを型名で明示する。

**Alternatives considered**:
- Interaction 型から export しない: 既存コード（createMeeting の引数型など）が参照しているため、移行期間中は export が必要。改名のほうが安全。

### D8: kind フィルタ方針

現時点では全 interaction が kind=meeting のため、`findAllByDeal` 等に kind フィルタを追加しない。将来 kind が増えた際に kind=meeting フィルタを追加する旨の TODO コメントを残す。

**Rationale**: 不要なフィルタは実行コストを増やし、テストの複雑性も上がる。全行が kind=meeting の現状では YAGNI。

**Alternatives considered**:
- 初期から kind フィルタを付与: 現時点では全行が meeting のため無意味なフィルタになる。却下。

### D9: 認可エンティティ名の維持

`authorization.ts` の Entity 型 `"meeting"` は `"interaction"` に変更**しない**。Server Action の `canPerform` 呼び出しは引き続き `"meeting"` を使う。将来他 kind の認可が必要になった時点で `"interaction"` への統合または kind 別認可を検討する。

**Rationale**: 認可マトリクスの Entity 名を変えると全 Server Action の呼び出し箇所に波及し、本リクエストのスコープを超える。UI 表記「商談」に対応する `"meeting"` をそのまま維持するのが最小変更。

**Alternatives considered**:
- Entity を `"interaction"` に変更: 全 Server Action の canPerform 呼び出しを更新する必要があり、スコープ超過。却下。

## Risks / Trade-offs

**[Risk] drizzle-kit が rename を drop+create として解釈する** &rarr; マイグレーション SQL を対話的に生成し、出力が `ALTER TABLE ... RENAME` であることを人間が確認してから適用する。本リクエストの CI/パイプラインでは `db:migrate` を実行しない。

**[Risk] 双方 targetType 戦略による targets 配列の肥大化** &rarr; interaction 1 件につき targets エントリが 2 件になるが、`findByTargets` は IN 句ベースのクエリであり、商談数が数十件程度であれば性能影響は無視できる。

**[Risk] 型名変更（Meeting &rarr; Interaction）による広範なコード変更** &rarr; 影響範囲は usecase 7 件、repository 1 件、Server Action 2 件、UI コンポーネント数件に限定される。re-export や型エイリアスで段階的に移行可能。

**[Trade-off] 認可エンティティ名を `"meeting"` のまま維持** &rarr; 内部モデルと認可マトリクスで名前が乖離するが、本リクエストのスコープ制限として許容。将来 kind 追加時に統合する。

## Open Questions

なし。architect 評価済みの設計判断 5 項目により主要な設計選択は確定している。
