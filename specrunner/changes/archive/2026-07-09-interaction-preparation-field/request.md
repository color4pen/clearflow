# 商談（interaction）に汎用「事前準備」フィールドを追加

## Meta

- **type**: new-feature
- **slug**: interaction-preparation-field
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存 ent-interaction への属性追加。新しい port/adapter・層構造の選択は無いため false -->

## 背景

商談（顧客接点 interaction、kind=meeting）には、`summary`（議事録・要約）と `details`（HearingData＝ヒアリングで判明した課題・予算・決裁者・時期・競合。meetingType=hearing 限定の構造化データ）はあるが、**「その商談に向けて事前に準備すること」を書く枠が存在しない**。HearingData は「聞き出した結果」であり準備ではない。どの商談種別（hearing/proposal/negotiation/closing/followup）でも事前準備は必要なので、**全商談で使える汎用の事前準備フィールドを 1 つ追加する**。

## 決定事項（設計合意済み）

1. フィールド名 **`preparation`**（日本語ラベル「事前準備」）。
2. **フリーテキスト（Markdown 記法・改行対応）・nullable**。構造化しない。
3. **interaction 全体の汎用フィールド**（meetingType で出し分けない。将来 call/email 等にも効く）。
4. `summary`（議事録）・`details`（HearingData）とは役割が別。**HearingData は温存**。
5. **kind・エンティティ構造・createMeeting の不変条件（deal または inquiry 必須）・ツール名は一切変えない。追加のみ。**

## 現状コードの前提

- スキーマ: `src/infrastructure/schema.ts` の `interactions` テーブル（370 行〜。`summary` は `text("summary")`）。
- ドメイン型: `src/domain/models/interaction.ts` の `Interaction`（summary/details/notes 等を持つ）。
- リポジトリ: `src/infrastructure/repositories/interactionRepository.ts`（row↔domain マップ、insert/update）。
- ユースケース: `src/application/usecases/createMeeting.ts` / `updateMeeting.ts`（updateMeeting は `...(data.X !== undefined && {X})` の部分更新済み）。
- MCP: `src/app/api/mcp/tools/interactions.ts`（create_meeting / update_meeting スキーマ・ハンドラ。`summary` は describe「議事録・商談要約の本文。Markdown 記法・改行が反映される」）。
- UI: 作成 `src/app/(dashboard)/deals/[id]/meetings/new/DealMeetingForm.tsx`、表示 `.../meetings/[meetingId]/`（MeetingSummarySection / MeetingHearingSection / MeetingInfoSection 等のセクション構成）、Server Action `src/app/actions/meetings.ts`。Markdown 描画は `MarkdownTextarea`（react-markdown + remark-breaks）。
- 設計: `design/domain/model.md` の `ent-interaction`（フィールドを文章で記述）。

## 設計要素引用

[[ent-interaction]], [[mod-mcp]], [[mod-usecase]], [[mod-repo]]

## 要件

1. **DB**: `interactions` テーブルに `preparation`（nullable text）カラムを追加。
2. **移行**: 新規マイグレーションで **`ALTER TABLE "interactions" ADD COLUMN "preparation" text`**（加算的・無損失・既存行は NULL・**リセット禁止/差分のみ**）。default 不要。
3. **ドメイン型**: `Interaction` に `preparation: string | null` を追加。
4. **リポジトリ**: row↔domain マップと insert/update に `preparation` を通す。
5. **ユースケース**: `createMeeting` に `preparation?: string | null` を追加して永続化。`updateMeeting` に `preparation?: string | null` を追加し、**部分更新（undefined=変更なし / null=クリア）**を維持。契約調整・請求調整（kind=note）系は変更不要（カラムは NULL のまま）。
6. **MCP**: `create_meeting` / `update_meeting` スキーマに `preparation` を追加し、describe「**商談の事前準備メモ。Markdown 記法・改行が反映される**」を付与。ハンドラで usecase へ受け渡す。update は undefined/null を区別。
7. **UI**: 作成フォーム（DealMeetingForm）に事前準備の入力（`MarkdownTextarea`）を追加。商談詳細に事前準備の表示/編集セクションを追加（Markdown 描画）。Server Action で受け渡す。
8. **aozu**: `design/domain/model.md` の `ent-interaction` の記述に「事前準備（preparation）」を追記し、設計と実装を整合させる。
9. **挙動不変（追加以外）**: 既存フィールド・不変条件・認可・監査・kind・meetingType・HearingData は変えない。

## スコープ外

- HearingData の一般化・変更（温存）。
- meetingType 別の準備テンプレート（型駆動は不採用。汎用 1 フィールド）。
- 引合からの商談作成 UI（商談は案件の hearing フェーズから作成する。別件）。
- prep 内容の構造化。

## 受け入れ基準

- [ ] `preparation` を指定した商談作成で値が永続化・取得できることを behavioral テストで固定する。
- [ ] `updateMeeting` で `preparation` を省略した更新が既存値を保持し、null 指定でクリアされることを固定する（部分更新）。
- [ ] MCP `create_meeting`/`update_meeting` が `preparation` を受理し、広告 inputSchema の `preparation` の describe に「Markdown」または「事前準備」を含むことを固定する（tools/list から取得）。
- [ ] 既存の全テストが更新後 green（既存フィールドの挙動不変）。`typecheck`/`lint`/`build` green。
- [ ] `aozu check` exit 0・architecture test green。
- [ ] mcp-conformance レビュワー（スキーマ広告・契約明確さ・部分更新）を満たす。

## 実装上の必須事項

1. **移行は差分のみ**。既存データ破壊なし（ADD COLUMN・NULL 許容）。
2. **behavioral テスト**（実 transport で MCP create/update を叩き、preparation の保存・部分更新・広告を assert）。ソース文字列照合で代替しない。
3. **mock.module 汚染回避**（個別ファイル・afterAll 復元）。
4. **成果物は単体で読めること**（describe・設計に会話文脈を含めない）。
5. **ツール名・kind・エンティティ構造は不変**。

## aozu 影響判定（起票前判定・必須）: **要（軽微）**

- **新モジュール(mod)**: なし。
- **新依存辺(deps)**: なし（既存 mod-mcp→mod-usecase→mod-repo の範囲）。
- **新ドメイン概念(term/ent/inv/act)**: なし（既存 `ent-interaction` への**属性追加**であり、新エンティティ・不変条件・アクターではない）。
- **新シーケンス(seq)**: なし。

→ 新しい設計要素は増えないが、**`ent-interaction` の記述に preparation を追記**して設計と実装を整合させる（本 request に含める）。architecture test は緑のまま。
