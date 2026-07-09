# Design: 商談（interaction）に汎用「事前準備」フィールドを追加

## Context

商談（interaction, kind=meeting）は `summary`（議事録）と `details`（HearingData: meetingType=hearing 限定の構造化データ）を持つが、商談に向けた事前準備を記録するフィールドが存在しない。HearingData は「ヒアリング結果」であり準備とは役割が異なる。事前準備はすべての meetingType（hearing / proposal / negotiation / closing / followup）で必要なため、商談種別に依存しない汎用フィールドとして追加する。

現状のレイヤー構造:
- **DB**: `interactions` テーブル（`src/infrastructure/schema.ts`）— `summary` は `text("summary")`
- **ドメイン型**: `Interaction` 型（`src/domain/models/interaction.ts`）— summary / details / attendees 等を保持
- **リポジトリ**: `interactionRepository`（`src/infrastructure/repositories/interactionRepository.ts`）— row↔domain マップ・insert/update
- **ユースケース**: `createMeeting` / `updateMeeting` — updateMeeting は `...(data.X !== undefined && {X})` パターンで部分更新
- **MCP**: `interactions` ツール（`src/app/api/mcp/tools/interactions.ts`）— create_meeting / update_meeting スキーマ・ハンドラ
- **UI**: 作成フォーム `DealMeetingForm.tsx`、詳細表示 `MeetingSummarySection` / `MeetingHearingSection` 等のセクション構成
- **Server Action**: `src/app/actions/meetings.ts` — createMeetingAction / updateMeetingAction
- **設計ドキュメント**: `design/domain/model.md` の `ent-interaction`

## Goals / Non-Goals

**Goals**:

- `interactions` テーブルに nullable text の `preparation` カラムを差分マイグレーションで追加する
- レイヤー全層（ドメイン型 → リポジトリ → ユースケース → MCP → Server Action → UI）で `preparation` を受け渡す
- MCP の `create_meeting` / `update_meeting` で `preparation` を受理し、用途・形式を describe に明示する
- `updateMeeting` で部分更新の慣習（undefined=変更なし / null=クリア）を維持する
- 商談作成フォームに事前準備の入力欄を追加し、商談詳細に表示/編集セクションを追加する
- `design/domain/model.md` の `ent-interaction` 記述を整合させる
- behavioral テストで preparation の永続化・部分更新・MCP スキーマ広告を固定する

**Non-Goals**:

- HearingData の構造変更・一般化（温存する）
- meetingType 別の準備テンプレート（型駆動は不採用）
- preparation の内容の構造化（フリーテキストのみ）
- 引合からの商談作成 UI（別件）
- kind・エンティティ構造・createMeeting の不変条件・ツール名の変更

## Decisions

### D1: `preparation` は interaction テーブルの汎用カラムとして追加する

**Rationale**: preparation は全 meetingType で必要であり、将来 call / email 等に interaction が拡張されても利用可能。JSONB サブフィールドや別テーブルではなく、`summary` と同レベルの text カラムとする。`summary`（事後の議事録）と `preparation`（事前の準備メモ）は時間軸上で対になる概念であり、同じ粒度で扱うのが自然。

**Alternatives considered**:
- details JSONB に preparation キーを埋め込む → meetingType=hearing 以外では details が null のため不適切。details は kind 固有データの器。
- 別テーブル `interaction_preparations` → 1:1 で不要な正規化。カラム追加で十分。

### D2: マイグレーションは `ALTER TABLE ADD COLUMN` のみ（nullable, default なし）

**Rationale**: 既存行は NULL のまま。加算的・無損失で、ロールバックも `DROP COLUMN` で安全。DB リセット禁止の制約を満たす。

**Alternatives considered**:
- default 値を空文字にする → null と空文字の二重表現が生まれるため nullable + default なしが明快。

### D3: MCP の `preparation` describe は「商談の事前準備メモ。Markdown 記法・改行が反映される」とする

**Rationale**: `summary` の describe パターン（「議事録・商談要約の本文。Markdown 記法・改行が反映される」）に倣い、用途と形式を明示する。mcp-conformance レビュワーのフィールド describe 要件を満たす。

**Alternatives considered**:
- 簡素な「事前準備」のみ → 形式（Markdown 対応）が伝わらず、エージェントが適切にフォーマットできない。

### D4: UI 配置は summary（議事録）の前に preparation セクションを置く

**Rationale**: 事前準備は商談の前に書くもの、議事録は商談の後に書くもの。時系列順に「準備 → 議事録」と並べるのが意味的に自然。request-review-result の Finding #2 でも「summary の前が自然」と指摘されている。

**Alternatives considered**:
- summary の後に配置 → 時系列と逆順になり認知的に不自然。

### D5: 作成フォームでは `MarkdownTextarea` ではなく通常の `Textarea` を使用する

**Rationale**: 既存の作成フォーム（`DealMeetingForm.tsx`）では `summary` も通常の `Textarea` を使用しており、`MarkdownTextarea`（プレビュー付き）は詳細表示のインライン編集セクションで使用されている。作成フォームでは入力のみを担当するため、既存パターンに合わせて `Textarea` を使用する。

**Alternatives considered**:
- 作成フォームで `MarkdownTextarea` を使用 → 既存の summary と異なる UX になり一貫性を損なう。

### D6: 詳細表示セクションは `MeetingSummarySection` パターンに倣い `MeetingPreparationSection` を新設する

**Rationale**: 既存のセクション構成（`MeetingInfoSection` / `MeetingSummarySection` / `MeetingHearingSection` 等）に倣い、独立したコンポーネントとする。preparation はインライン編集可能で、`MarkdownTextarea` で Markdown プレビューと編集を提供する。

**Alternatives considered**:
- `MeetingSummarySection` に preparation を統合 → 責務が異なるため分離が適切。

## Risks / Trade-offs

[Risk] 既存テストの `Interaction` 型インスタンスに `preparation` が欠落し型エラーになる → **Mitigation**: request-review Finding #3 の通り、各テストファイルの mock オブジェクトに `preparation: null` を追加する。`bun run typecheck` で漏れなく検出可能。

[Risk] マイグレーション番号の衝突（他ブランチとの並行開発）→ **Mitigation**: Drizzle の `db:generate` でマイグレーションを生成し、番号はツールが自動採番する。衝突時は merge 時点で手動リナンバリング。

## Open Questions

なし。設計判断は request で合意済み。
