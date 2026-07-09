# Tasks: MCP フィールドの用途・形式を describe に明記

## T-01: Markdown 対応フィールドの describe に形式情報を追加

UI binding（MarkdownTextarea コンポーネント）に基づいて特定された 4 フィールドの `.describe()` に Markdown/改行対応を明記する。`.describe()` は用途 + 形式の構成とする。

対象ファイルと変更内容:

- [x] `src/app/api/mcp/tools/inquiries.ts` — `createSchema` と `updateSchema` の `description` フィールド（引合の概要）に `.describe()` を追加。用途（引合の概要説明）と形式（Markdown 記法・改行が反映される）を含める。
- [x] `src/app/api/mcp/tools/inquiries.ts` — `createSchema` と `updateSchema` の `contactNote` フィールドの既存 `.describe("連絡メモ")` を更新し、用途（問い合わせ内容・連絡メモ）と形式（Markdown 記法・改行が反映される）を含める。
- [x] `src/app/api/mcp/tools/deals.ts` — `createSchema` と `updateSchema` の `notes` フィールドに `.describe()` を追加。用途（案件の備考・共有メモ）と形式（Markdown 記法・改行が反映される）を含める。
- [x] `src/app/api/mcp/tools/interactions.ts` — `createMeetingSchema` と `updateMeetingSchema` の `summary` フィールドの既存 `.describe("要約")` を更新し、用途（議事録・商談要約の本文）と形式（Markdown 記法・改行が反映される）を含める。

**注意事項**:
- `deals.description` は UI に表示されず MarkdownTextarea にバインドされていないため Markdown 対応の記述を付与しない
- `interactions.details` (record_contract_adjustment / record_invoice_adjustment) は MarkdownTextarea にバインドされていないため Markdown 対応の記述を付与しない
- スキーマの構造（型・バリデーション・optional/required）は変更しない

**Acceptance Criteria**:
- 上記 4 フィールドの `.describe()` に「Markdown」と「改行」の両方を含む文字列が設定されている
- スキーマの `type`・`enum`・`required` 構造に変更がない

## T-02: 用途不明フィールドの describe 補完

describe が欠落している、または用途が曖昧なフィールドに `.describe()` を追加・更新する。

対象ファイルと変更内容:

- [x] `src/app/api/mcp/tools/deals.ts` — `createSchema` と `updateSchema` の `description` フィールドに `.describe()` を追加。用途（案件の概要説明）を明記する。Markdown 非対応のため形式注記は付与しない。
- [x] `src/app/api/mcp/tools/interactions.ts` — `recordContractAdjustmentSchema` と `recordInvoiceAdjustmentSchema` の `summary` フィールドの `.describe("要約")` を更新し、用途（契約調整/請求調整の要約）をより具体的にする。
- [x] `src/app/api/mcp/tools/interactions.ts` — `recordContractAdjustmentSchema` と `recordInvoiceAdjustmentSchema` の `details` フィールドの `.describe("詳細")` を更新し、用途（補足・詳細情報）をより具体的にする。
- [x] `src/app/api/mcp/tools/interactions.ts` — `hearingDataSchema` の `notes` フィールドに `.describe()` を追加。用途（ヒアリングのメモ・補足事項）を明記する。

**注意事項**:
- `summary` が複数の operation スキーマに存在する（create_meeting / update_meeting / record_contract_adjustment / record_invoice_adjustment）。それぞれの operation の文脈に合った describe を付ける。`buildAdvertisementSchema` は description について先勝ちルール（最初に見つかった非 undefined を採用）であるため、広告スキーマに反映させたい description は `buildAdvertisementSchema` への入力順で先に来るスキーマ（`createMeetingSchema`）に設定する。
- `details` は record_contract_adjustment / record_invoice_adjustment にのみ存在し、meeting 系 operation には存在しない。
- スキーマの構造（型・バリデーション・optional/required）は変更しない

**Acceptance Criteria**:
- `deals.description` の describe が空でない
- `interactions.summary` の describe が「要約」単体ではなく、用途を判別できる文言になっている
- `interactions.details` の describe が「詳細」単体ではなく、用途を判別できる文言になっている
- `hearingData.notes` の describe が設定されている
- スキーマの `type`・`enum`・`required` 構造に変更がない

## T-03: describe 品質の behavioral テスト作成

`src/__tests__/mcp/mcpFieldDescribeContract.test.ts` を新規作成し、describe の内容を tools/list 経由の behavioral テストで固定する。

テスト設計:

- [x] テストセットアップ: `mcpInputSchemaAdvertisement.test.ts` と同様のパターンで `McpServer` を作成し全 19 ツールを登録する。`tools/list` を呼び出して全ツールの inputSchema を取得する。`@/infrastructure/rateLimit` を mock（DB 接続回避）。`afterAll` で復元。
- [x] **TC-FC-01: Markdown 対応フィールドの describe に「Markdown」を含む**: inquiries の `description`・`contactNote`、deals の `notes`、interactions の `summary` について、inputSchema.properties の description に「Markdown」を含むことを assert。
- [x] **TC-FC-02: Markdown 対応フィールドの describe に「改行」を含む**: 同上のフィールドについて、description に「改行」を含むことを assert。
- [x] **TC-FC-03: interactions.summary の describe が議事録用途を示す**: interactions の summary の description に議事録または要約の本文であることを示す文言が含まれることを assert。
- [x] **TC-FC-04: interactions.details の describe が補足用途を示す**: interactions の details の description に補足であることを示す文言が含まれることを assert。
- [x] **TC-FC-05: deals.description の describe が存在する**: deals の description の description が空でないことを assert。
- [x] **TC-FC-06: deals.notes の describe が存在する**: deals の notes の description が空でないことを assert。
- [x] **TC-FC-07: inquiries.description の describe が存在する**: inquiries の description の description が空でないことを assert。
- [x] **TC-FC-08: deals.description に「Markdown」を含まない**: deals.description は MarkdownTextarea 非対応のため、describe に「Markdown」を含まないことを assert する（誤った Markdown 広告の防止）。

**注意事項**:
- `description` フィールドは nullable/optional ラッパーで囲まれている場合がある。`buildAdvertisementSchema` が description を top-level に再適用するため、`properties.<field>.description` でアクセスできる。
- `hearingData.notes` は広告スキーマ上でネストされた位置にあり、フラットアクセスでは取得できない。テストでは `properties.hearingData` 経由か、本テストのスコープ外とし T-02 の実装確認に委ねる。
- ソース文字列照合（readFile + toContain）は使用しない。全て tools/list 経由の実行検証とする。
- mock.module でバレル（`@/application/usecases` 等）をモックしない。

**Acceptance Criteria**:
- 全テストケース（TC-FC-01〜TC-FC-08）が green
- テストはソース文字列照合を使用していない（tools/list 経由の実行検証のみ）
- 既存テスト（`mcpInputSchemaAdvertisement.test.ts`）に変更を加えていない

## T-04: 既存テスト・品質ゲート確認

既存テスト・ビルド・lint・型チェックが全て green であることを確認する。

- [x] `bun test` — 全テスト green（新規テスト含む）
- [x] `bun run typecheck` — 型エラーなし
- [x] `bun run lint` — lint エラーなし
- [x] `bun run build` — ビルド成功
- [x] `bunx aozu check` — exit 0（architecture test green）
- [x] `mcpInputSchemaAdvertisement.test.ts` の TC-001〜TC-020 が全て green（inputSchema 構造は不変）
- [x] `mcpToolDescriptions.test.ts` が全て green（description テストは不変）

**Acceptance Criteria**:
- 上記全コマンドが exit 0
- 既存テストに変更を加えていない
