# ADR-024: 商談（Meeting）を顧客接点（Interaction）に一般化

- **Status**: accepted
- **Date**: 2026-06-30
- **Change**: interaction-generalization
- **Deciders**: architect

---

## Context

Clearflow のドメイン設計（`docs/design/01-domain-design.md` §4.3、`docs/design/06-data-model-design.md`、`docs/design/ユビキタス言語辞書.md`）では「顧客接点（Interaction）」を meeting / call / email / contract_adjustment / invoice_adjustment の 5 種を束ねる概念として定義しているが、実装では商談が `meetings` テーブル / `Meeting` 型として独立したエンティティになっており、設計とコードが乖離していた。

商談以外の顧客接点（電話・メール・契約調整・請求調整）を将来実装するには、`meetings` テーブルをそのまま拡張することはできず、設計上の `Interaction` エンティティを DB・ドメインモデル・リポジトリのレベルで実体化する必要があった。

同時に、既存の `meetings` データ・`action_items` の紐づき・監査ログは一切失ってはならないという不可侵制約があった。

---

## Decisions

### D1: テーブルリネーム + ADD COLUMN 方式（全コピー＆DROP 禁止）

**Decision**: 既存 `meetings` テーブルを `ALTER TABLE meetings RENAME TO interactions` でリネームし、新カラムを `ALTER TABLE ... ADD COLUMN` で追加する。新テーブルへのフルコピー + DROP は行わない。

**Rationale**:
- rename + ADD COLUMN は既存行を in-place で保持する唯一のデータ安全な方法
- フルコピー＆DROP はコピー中の障害でデータが失われるリスクがある。行数が増えるほどウィンドウが広がる
- `action_items.meeting_id` → `interaction_id` も同様に `ALTER TABLE ... RENAME COLUMN` で in-place 変更し、FK 値を維持する

**drizzle-kit の取り扱い**:
drizzle-kit のテーブルリネームは対話確認を伴い、非対話環境（CI 等）では drop+create に化ける恐れがある。そのため **マイグレーション SQL の生成・適用は本変更の実装スコープに含めず**、対話的に `drizzle-kit generate` を実行して出力 SQL が `ALTER TABLE ... RENAME` であって `DROP TABLE` / `DELETE FROM` / `TRUNCATE` を含まないことを人間が確認してから `db:migrate` で適用する。

#### Alternative 1: 新テーブル作成 + データコピー + 旧テーブル DROP

| | |
|---|---|
| **Pros** | スキーマ定義を完全にクリーンな状態で作れる |
| **Cons** | コピー中の障害でデータが失われるリスクがある。大量行ではコピーコストが高い |
| **Why not** | データ不可侵要件を満たせないため |

#### Alternative 2: `meetings` ビューを残してアプリ層で透過的に扱う

| | |
|---|---|
| **Pros** | 既存コードへの変更を最小化できる |
| **Cons** | drizzle-orm はビューの型推論が限定的で複雑性が増す。ビューを介した書き込みは制限が多い |
| **Why not** | 運用上の複雑性が高く、将来の kind 追加でも問題を先送りするだけ |

---

### D2: interaction_kind enum（5 種）

**Decision**: `pgEnum("interaction_kind", ["meeting", "call", "email", "contract_adjustment", "invoice_adjustment"])` を定義し、`kind` カラムを `DEFAULT 'meeting'` で追加する。既存行はすべて kind=meeting として in-place で保持する。

**Rationale**:
- 設計のユビキタス言語辞書に定義された 5 種を忠実に実装する
- enum により不正値を DB レベルで排除できる
- DEFAULT 'meeting' により既存行の値変換なしで種別が付与される

#### Alternative: text 型 + アプリ層バリデーション

| | |
|---|---|
| **Pros** | enum の追加・変更にマイグレーションが不要 |
| **Cons** | DB レベルの型安全性が失われる。不正値がアプリ層を通り抜けて永続化されるリスクがある |
| **Why not** | 設計上 kind は固定の列挙値であり、enum で型安全性を確保すべき |

---

### D3: ポリモーフィック関連先（nullable FK + CHECK）

**Decision**: 既存の `deal_id` / `inquiry_id` に加え `contract_id` / `invoice_id` / `client_id` を nullable FK として追加。CHECK 制約を「5 つの FK のうち少なくとも 1 つが NOT NULL」に一般化する（既存の `meetings_deal_or_inquiry_check` の拡張）。

**Rationale**:
- FK による参照整合性を保ちながら、kind ごとに異なる関連先を自然に表現できる
- CHECK 制約により「関連先なしの顧客接点」を DB レベルで防止できる
- 既存の nullable FK + CHECK パターンの素直な拡張であり、新たな設計上の負債を生まない

#### Alternative 1: STI (Single Table Inheritance) + discriminator FK

| | |
|---|---|
| **Pros** | kind 別に FK を条件付きで強制できる |
| **Cons** | PostgreSQL では kind 別の条件付き CHECK を実現するには部分インデックスと複雑な制約が必要。実装が煩雑 |
| **Why not** | nullable FK + CHECK の方がシンプルで既存パターンと一貫性がある |

#### Alternative 2: 関連テーブル分離（interaction_links）

| | |
|---|---|
| **Pros** | 関連先の追加が ALTER TABLE なしで行える |
| **Cons** | JOIN コストと実装複雑性が増す。関連先の数が 5 種で固定的なため過剰設計 |
| **Why not** | 現在の要件規模では nullable FK で十分 |

---

### D4: カラムリネーム戦略

**Decision**:

| 旧カラム | 新カラム | 理由 |
|----------|----------|------|
| `type` (meetingTypeEnum) | `meeting_type` | kind=meeting 固有の商談種別。一般化後は他 kind では意味が異なるため名前を明確化 |
| `hearing_data` (jsonb) | `details` (jsonb) | kind 固有の構造化データを汎用的に格納。kind=meeting では HearingData |
| `action_items` (jsonb, レガシー) | そのまま維持 | action_items テーブルに移行済みのレガシーフィールド。変更不要 |

`action_items` テーブルの `meeting_id` → `interaction_id`（FK 値は in-place で維持）。

**Rationale**: 各カラムの意味が一般化後も明確になるよう命名する。`details` は将来の kind 追加時にも kind 固有データの統一フィールドとして機能する。

#### Alternative 1: `type` カラム名を維持する

| | |
|---|---|
| **Pros** | カラムリネームのマイグレーション不要。既存クエリへの影響がない |
| **Cons** | kind=meeting 以外の interaction が追加された際、`type` が何の種別を指すか不明瞭になる。ドメイン的に「商談種別（meeting_type）」と「顧客接点種別（kind）」の混同を招く |
| **Why not** | 一般化後のモデルで意味が不明瞭なカラム名は将来の実装者を誤解させるため |

#### Alternative 2: `hearing_data` カラム名を維持する

| | |
|---|---|
| **Pros** | カラムリネームのマイグレーション不要 |
| **Cons** | kind=meeting（ヒアリング）以外の interaction では「hearing_data」という名前が不適切。kind=call 等で同フィールドを使う際に意味が通じない |
| **Why not** | `details` という汎用名にすることで、将来の kind 追加時も同じフィールドを自然に利用できるため |

---

### D5: 監査アクション移行（追記専用）

**Decision**: 新規の監査ログは `interaction.create` / `interaction.update`（targetType="interaction"、metadata に `{ kind: "meeting" }`）で記録する。既存の `meeting.*` 監査ログは書き換えない。

**Rationale**:
- 監査ログは追記専用（append-only）が鉄則。既存ログの targetType を UPDATE すると監査の信頼性が損なわれる
- metadata に kind を含めることで、将来 kind が増えた際にも監査ログから操作種別を判別できる

#### Alternative: 既存ログの targetType を "interaction" に UPDATE

| | |
|---|---|
| **Pros** | targetType の統一で queries がシンプルになる |
| **Cons** | append-only 原則に違反。監査証跡の改ざんに相当する |
| **Why not** | 監査ログの信頼性を損なうため絶対に許容できない |

---

### D6: タイムライン・通知の双方 targetType 戦略

**Decision**: `getDealActivity` と `getNotifications` の targets 配列に、各 interaction について `{ targetType: "interaction", targetId }` と `{ targetType: "meeting", targetId }` の**両方**を含める。`targetInfoMap` にも `interaction:<id>` と `meeting:<id>` の両キーに同じ表示情報を登録する。

**Rationale**:
- 既存の `meeting.create` / `meeting.update` 監査ログは `targetType="meeting"` で記録済み。`interaction` のみを引くと移行前の全履歴が消える
- 双方を含めることで移行前後のログを漏れなく取得でき、ユーザーに対してシームレスな移行を実現できる
- `findByTargets` は IN 句ベースのクエリであり、targets が 2 倍になっても商談数が数十件程度であれば性能影響は無視できる

#### Alternative: `findByTargets` 内部で targetType エイリアスを解決

| | |
|---|---|
| **Pros** | 呼び出し元がシンプルになる |
| **Cons** | リポジトリ層にドメイン知識（meeting ↔ interaction のエイリアス関係）が漏れる。関心の分離に反する |
| **Why not** | ドメイン知識はユースケース層で扱うべき |

---

### D7: 型衝突の解決（LegacyMeetingActionItem）

**Decision**: `src/domain/models/meeting.ts` のレガシー `ActionItem` 型（jsonb 構造）を `LegacyMeetingActionItem` に改名する。これにより `src/domain/models/actionItem.ts` の `ActionItem` エンティティとの同名衝突を解消する。

**Rationale**:
- 同一スコープで import した場合の名前衝突を防ぐ
- レガシーフィールド（action_items テーブルに移行済み）であることを型名で明示できる
- 既存コードが参照しているため完全削除は移行期間中はできないが、改名で意図を明確にする

#### Alternative: Interaction 型から export しない（非公開化）

| | |
|---|---|
| **Pros** | 外部から参照できなくなるため、レガシー型の誤用を防げる |
| **Cons** | 既存の `createMeeting` 引数型など複数箇所が参照しているため、移行期間中は export が必要。非公開化すると広範なコード変更が発生する |
| **Why not** | 移行期間中の安全な橋渡しとして `LegacyMeetingActionItem` という改名が最小変更かつ意図を明確にできるため |

---

### D8: kind フィルタは YAGNI（将来の TODO コメントで予約）

**Decision**: 現時点では全 interaction が kind=meeting のため、`findAllByDeal` 等に kind フィルタを追加しない。将来 kind が増えた際に kind=meeting フィルタを追加する旨の TODO コメントをリポジトリに残す。

**Rationale**:
- 全行が kind=meeting の現状では kind フィルタは無意味。YAGNI の原則に従い実装しない
- TODO コメントで将来の変更ポイントを明示することで、kind 追加時の改修漏れを防ぐ

#### Alternative: 初期から kind=meeting フィルタを付与する

| | |
|---|---|
| **Pros** | kind が増えた際に `listMeetings` が他 kind の interaction を誤返却するリスクを最初から排除できる |
| **Cons** | 現時点では全行が kind=meeting のため、フィルタは無意味なオーバーヘッドになる。テストの複雑性も上がる |
| **Why not** | YAGNI。全行が kind=meeting である間は実行コストのみ増えて恩恵がない。TODO コメントで追加タイミングを明示すれば改修漏れも防げる |

---

### D9: 認可エンティティ名を "meeting" のまま維持

**Decision**: `authorization.ts` の Entity 型 `"meeting"` は `"interaction"` に変更しない。Server Action の `canPerform` 呼び出しは引き続き `"meeting"` を使う。

**Rationale**:
- 認可マトリクスの Entity 名を変えると全 Server Action の呼び出し箇所に波及し、本変更のスコープを超える
- UI/日本語表記「商談」に対応する `"meeting"` をそのまま維持することが最小変更
- 将来他 kind の認可が必要になった時点で `"interaction"` への統合または kind 別認可を検討する

**Trade-off**: 内部モデル（Interaction 型）と認可マトリクス（"meeting" エンティティ）で名前が乖離するが、本変更のスコープ制限として明示的に許容する。

#### Alternative: Entity を "interaction" に変更する

| | |
|---|---|
| **Pros** | 内部モデル（Interaction）と認可エンティティ名が一致し、コードの一貫性が高まる |
| **Cons** | `canPerform(..., "meeting", ...)` の呼び出し箇所が全 Server Action に散在しており、一括更新が必要。`PERMISSION_MATRIX` の "meeting" キーも変更が必要。本変更のスコープを大幅に超える |
| **Why not** | 本変更は商談の振る舞いを変えないことを最優先とする。認可エンティティ名の統合は将来 kind を追加する際に改めて ADR を立てて行う |

---

## Consequences

### Positive

- `meetings` テーブルが `interactions` テーブルになり、設計ドキュメントとコードのドメインモデルが一致した
- `kind` + 5 関連先 nullable FK + CHECK 制約の構造により、将来の kind（call/email/contract_adjustment/invoice_adjustment）を型安全に追加する基盤が整った
- テーブルリネーム + ADD COLUMN 方式でデータ不可侵制約を満たした（DROP/DELETE/TRUNCATE を含まないマイグレーション）
- 双方 targetType 戦略により、移行前の `meeting.*` 監査ログがタイムライン・通知から消えず、ユーザー体験のシームレスな移行を実現した
- 監査ログに `metadata.kind` を含めることで、将来 kind 別の監査分析が可能になった

### Negative / Trade-offs

- `getDealActivity` / `getNotifications` の targets 配列に interaction 1 件につき 2 エントリが生成される。商談数が大幅に増加した場合は `findByTargets` の IN 句コストが増える
- 認可エンティティ名（"meeting"）と内部モデル名（Interaction）の乖離が残る。将来 kind を追加する際に整合させる必要がある
- drizzle-kit によるテーブルリネームは対話的に実施する必要があり、パイプライン自動適用ができない。リネームを含むマイグレーションには手動確認ステップが必要

### Constraints for future changes

- **新しい kind を追加するとき（call/email 等）**: `interactionRepository` の `findAllByDeal` 等に D8 の TODO コメントに従い kind=meeting フィルタを追加すること。新 kind 用の usecase/Server Action では `interaction.create`（targetType="interaction", metadata.kind=<kind>）で監査ログを記録すること
- **認可エンティティ名の統合**: 将来 kind=call 等の Server Action を実装する際は、`authorization.ts` の Entity を `"interaction"` に統合し、`canPerform` の呼び出し箇所を一括更新すること。その変更は ADR を記録すること
- **targets 配列の肥大化対策**: 商談数が数百件規模になった際は、`findByTargets` を targetType ごとの別クエリに分割するか、インデックス戦略を見直すこと
- **マイグレーション適用時**: 生成された SQL に `ALTER TABLE "meetings" RENAME TO "interactions"` が含まれ、`DROP TABLE` / `DELETE FROM` / `TRUNCATE` が含まれないことを必ず確認してから `db:migrate` を実行すること
- **kind 固有の details 構造追加**: 将来 kind=call 等で `details` フィールドに独自 JSON 構造を持たせる場合は、discriminated union または JSON Schema バリデーションで型安全性を確保すること。`details` の型を `any` のまま放置しないこと

---

## References

- `specrunner/changes/interaction-generalization/request.md` — 要件定義
- `specrunner/changes/interaction-generalization/design.md` — 詳細設計（D1〜D9）
- `specrunner/changes/interaction-generalization/spec.md` — ビヘイビア仕様
- `specrunner/changes/interaction-generalization/review-feedback-001.md` — コードレビュー所見（approved, score 8.80）
- `drizzle/0017_interaction_generalization.sql` — マイグレーション SQL（RENAME 方式、DROP/DELETE/TRUNCATE なし）
- `src/domain/models/interaction.ts` — Interaction ドメインモデル・InteractionKind enum
- `src/domain/models/meeting.ts` — Interaction への re-export（後方互換）
- `src/infrastructure/schema.ts` — interactions テーブル定義・interactionKindEnum
- `src/infrastructure/repositories/interactionRepository.ts` — create/findById/findAllByDeal/update 等
- `src/application/usecases/createMeeting.ts` — interaction.create 監査ログ（metadata.kind="meeting"）
- `src/application/usecases/getDealActivity.ts` — 双方 targetType 戦略（D6）
- `src/application/usecases/getNotifications.ts` — 双方 targetType 戦略（D6）
- `src/lib/activityConfig.ts` — TIMELINE_ACTIONS に interaction.create 追加
- `src/domain/models/notification.ts` — NOTIFICATION_ACTIONS に interaction.create 追加
- `src/domain/models/auditLog.ts` — AuditAction / AuditMetadataMap に interaction.* 追加
- `specrunner/adr/ADR-016-action-items-independent-table.md` — action_items テーブル化（meeting_id → interaction_id の背景）
- `specrunner/adr/ADR-019-deal-activity-timeline.md` — タイムライン実装の基盤
- `specrunner/adr/ADR-020-audit-action-type-catalog.md` — AuditAction カタログ
- `specrunner/adr/ADR-022-deal-watch-derived-notifications.md` — 通知導出の基盤
