# Tasks: 商談（interaction）に汎用「事前準備」フィールドを追加

## T-01: DB スキーマ・マイグレーション

- [x] `src/infrastructure/schema.ts` の `interactions` テーブル定義に `preparation: text("preparation")` を追加する（`summary` の直後が自然な位置）
- [x] `bun run db:generate` でマイグレーション SQL を生成する（`ALTER TABLE "interactions" ADD COLUMN "preparation" text` の形式になることを確認）
- [x] 生成されたマイグレーション SQL が加算的（ADD COLUMN のみ）で、既存データを破壊しないことを確認する

**Acceptance Criteria**:
- `interactions` テーブルに `preparation` カラム（nullable text, default なし）が定義されている
- マイグレーション SQL が `ALTER TABLE ... ADD COLUMN` のみで構成されている
- `bun run db:migrate` が成功する

## T-02: ドメイン型の更新

- [x] `src/domain/models/interaction.ts` の `Interaction` 型に `preparation: string | null` を追加する（`summary` の近くに配置）

**Acceptance Criteria**:
- `Interaction` 型が `preparation: string | null` を持つ
- `bun run typecheck` が通る（既存の Interaction インスタンスの型エラーは T-08 で対応）

## T-03: リポジトリの更新

- [x] `src/infrastructure/repositories/interactionRepository.ts` の `mapRow` 関数に `preparation: row.preparation ?? null` を追加する
- [x] `create` 関数の引数型に `preparation?: string | null` を追加し、`.values()` に `preparation: data.preparation ?? null` を渡す
- [x] `update` 関数の `data` 引数の `Partial` 型に `preparation: string | null` を追加する

**Acceptance Criteria**:
- `mapRow` が DB 行から `preparation` をドメイン型にマッピングする
- `create` が `preparation` を DB に書き込む
- `update` が `preparation` を部分更新で DB に書き込む（Partial なので undefined 時はセットに含まれない）

## T-04: ユースケースの更新

- [x] `src/application/usecases/createMeeting.ts` の `createMeeting` 関数の引数型に `preparation?: string | null` を追加する
- [x] `interactionRepository.create` 呼び出しに `preparation: data.preparation` を渡す（undefined の場合はリポジトリ側で null にフォールバック）
- [x] `src/application/usecases/updateMeeting.ts` の `updateMeeting` 関数の引数型に `preparation?: string | null` を追加する
- [x] `interactionRepository.update` 呼び出しのスプレッド構文に `...(data.preparation !== undefined && { preparation: data.preparation })` を追加する（部分更新パターンの維持）

**Acceptance Criteria**:
- `createMeeting` が `preparation` を受け取りリポジトリに渡す
- `updateMeeting` が `preparation` を `undefined`（変更なし）と `null`（クリア）で区別してリポジトリに渡す
- 既存の引数・ロジック（deal/inquiry 検証、details の meetingType 制約、attendees 解決等）は変更なし

## T-05: MCP ツールスキーマ・ハンドラの更新

- [x] `src/app/api/mcp/tools/interactions.ts` の `createMeetingSchema` に `preparation: z.string().optional().describe("商談の事前準備メモ。Markdown 記法・改行が反映される")` を追加する
- [x] `updateMeetingSchema` に `preparation: z.string().nullable().optional().describe("商談の事前準備メモ。Markdown 記法・改行が反映される")` を追加する（nullable.optional で undefined/null を区別）
- [x] `create_meeting` ハンドラで `preparation: typedArgs.preparation ?? null` を `createMeeting` usecase に渡す
- [x] `update_meeting` ハンドラで `preparation: typedArgs.preparation` を `updateMeeting` usecase に渡す（undefined はそのまま undefined として渡り、null はクリアとして渡る）

**Acceptance Criteria**:
- `tools/list` で返る `inputSchema` の `properties` に `preparation` が含まれ、description に「事前準備」と「Markdown」が含まれる
- `create_meeting` で `preparation` が usecase に渡る
- `update_meeting` で `preparation` が undefined/null を区別して usecase に渡る
- 既存フィールド・ツール名・認可・レート制限は変更なし

## T-06: Server Action の更新

- [x] `src/app/actions/meetings.ts` の `createMeetingSchema` に `preparation: z.string().optional()` を追加する
- [x] `createMeetingAction` で `formData.get("preparation")` を取得し、パース対象に含める
- [x] `createMeeting` usecase 呼び出しに `preparation: parsed.data.preparation ?? null` を渡す
- [x] `updateMeetingSchema` に `preparation: z.string().nullable().optional()` を追加する
- [x] `updateMeetingAction` で `formData.get("preparation")` を取得し、パース対象に含める（undefined/null の区別は `formData.get` の結果から `?? undefined` で行う）
- [x] `updateMeeting` usecase 呼び出しに `preparation: parsed.data.preparation` を渡す

**Acceptance Criteria**:
- `createMeetingAction` が FormData から `preparation` を受け取り usecase に渡す
- `updateMeetingAction` が FormData から `preparation` を受け取り usecase に渡す
- 既存のバリデーション・認可・レート制限は変更なし

## T-07: UI — 商談作成フォーム

- [x] `src/app/(dashboard)/deals/[id]/meetings/new/DealMeetingForm.tsx` に `preparation` の state を追加する（`useState<string>("")`）
- [x] 議事録（`summary`）の `FormField` の**前**に、事前準備の `FormField`（label「事前準備」、`MarkdownTextarea`、placeholder「商談に向けた事前準備メモ（Markdown 記法可）」）を追加する
- [x] `formAction` 内で `formData.set("preparation", preparation)` を設定する（空文字の場合は送信しない、または空文字のまま渡して Server Action 側で optional として処理）

**Acceptance Criteria**:
- 作成フォームに「事前準備」の入力欄が議事録の前に表示される
- 入力した preparation が FormData 経由で Server Action に渡される

## T-08: UI — 商談詳細の事前準備セクション

- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingPreparationSection.tsx` を新規作成する。`MeetingSummarySection` と同じパターン（インライン編集・`MarkdownTextarea`・保存ボタン）で実装する
- [x] Props: `meetingId: string`, `dealId: string`, `preparation: string | null`, `editable: boolean`
- [x] 保存時は `updateMeetingAction` を呼び出し、`formData.set("preparation", value)` で送信する
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx` で `MeetingPreparationSection` を import し、左カラムの `MeetingSummarySection` の**前**に配置する
- [x] `MeetingPreparationSection` に `meeting.preparation` を渡す

**Acceptance Criteria**:
- 商談詳細ページに「事前準備」セクションが議事録セクションの前に表示される
- Markdown プレビュー付きのインライン編集が可能
- 保存が `updateMeetingAction` 経由で永続化される

## T-09: aozu 設計ドキュメント更新

- [x] `design/domain/model.md` の `ent-interaction`（`## 顧客接点 {#ent-interaction}`）の記述に「事前準備（preparation）」を追記する
- [x] 追記内容: 既存の説明文に「事前準備（preparation: フリーテキスト、Markdown 対応）を全種別共通で保持する。」を自然に組み込む

**Acceptance Criteria**:
- `design/domain/model.md` の `ent-interaction` セクションに preparation の記述が含まれる
- `bun run aozu check` が exit 0

## T-10: テスト — behavioral テスト

- [x] 既存テストファイル内の `Interaction` 型 mock オブジェクトに `preparation: null` を追加し、型エラーを解消する（`bun run typecheck` で対象を検出）
- [x] MCP behavioral テスト: `create_meeting` に `preparation` を指定した呼び出しで usecase に `preparation` が渡ることを検証する
- [x] MCP behavioral テスト: `update_meeting` で `preparation` を省略した呼び出しで usecase に `preparation: undefined` が渡ることを検証する（部分更新: 既存値保持）
- [x] MCP behavioral テスト: `update_meeting` で `preparation: null` を指定した呼び出しで usecase に `preparation: null` が渡ることを検証する（クリア）
- [x] MCP inputSchema 広告テスト: `tools/list` の `interactions` ツールの `inputSchema.properties.preparation` の description に「事前準備」と「Markdown」が含まれることを検証する
- [x] テストは実 MCP transport 経由（behavioral）で実施する。ソース文字列照合で代替しない
- [x] `mock.module` は個別ファイルをモックし、`afterAll` で復元する

**Acceptance Criteria**:
- `preparation` 付き create_meeting の永続化テストが green
- `preparation` の部分更新テスト（省略=保持 / null=クリア）が green
- MCP inputSchema の `preparation` 広告テストが green
- 既存の全テストが green
- `bun run typecheck` / `bun run lint` / `bun run build` が green
