# MCP Conformance Review — interaction-preparation-field — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <approved|needs-fix|escalation>`
- Valid verdict values: approved | needs-fix | escalation
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
-->

- **verdict**: approved

## Scope of Review

MCP 境界に固有の失敗クラスを対象とする。接続エージェントに対する API contract（name / description / inputSchema）の正しさ、MCP 特有の実装上の落とし穴、部分更新セマンティクスの契約精度を検証する。

調査ファイル:
- `src/app/api/mcp/tools/interactions.ts` — ツール登録・スキーマ・ハンドラ
- `src/app/api/mcp/schemaHelpers.ts` — `buildAdvertisementSchema` / `validateAndParse`
- `src/__tests__/mcp/mcpInteractionPreparation.dynamic.test.ts` — behavioral テスト (TA-01〜04)
- `src/application/usecases/createMeeting.ts` / `updateMeeting.ts` — usecase 受け渡し
- `src/infrastructure/repositories/interactionRepository.ts` — DB マッピング
- `specrunner/changes/interaction-preparation-field/spec.md` / `design.md`

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | schema contract 非対称（プレ既存パターン） | `src/app/api/mcp/tools/interactions.ts` | 広告スキーマ（`buildAdvertisementSchema` 経由）では `preparation` が nullable（`anyOf: [string, null]`）として公開されるが、`createMeetingSchema` 内では `z.string().optional()`（nullable でない）のため、エージェントが `create_meeting` に `preparation: null` を送信すると `validateAndParse` がエラーを返す。広告と discriminated union バリデーターの間に意味的な乖離がある。ただし `summary` も同じパターン（create では non-nullable、update では nullable、広告では nullable）を取っており、本変更で新たに導入された問題ではない。 | `createMeetingSchema` の `preparation` を `z.string().nullable().optional()` に変更し（create 時に null を許容して `?? null` フォールバックを維持）、広告と実バリデーターを一致させる。あるいは `buildAdvertisementSchema` が operation 別に create / update の nullable 差異を区別できるよう拡張する。いずれも本変更のスコープ外であり、blocking なし（プレ既存の設計トレードオフ）。 |

## Contract Verification

### 1. Tool name / description — 不変条件

| 観点 | 期待値 | 実装 | 判定 |
|------|--------|------|------|
| ツール名 | `interactions`（変更なし） | `registerInteractionsTools` で `"interactions"` ✓ | ✅ |
| ツール description | 既存テキスト維持 | 変更なし ✓ | ✅ |
| operation 名 | `create_meeting` / `update_meeting` 変更なし | 変更なし ✓ | ✅ |

### 2. `inputSchema` 広告 — `preparation` フィールド

`buildAdvertisementSchema` は `[createMeetingSchema, updateMeetingSchema, ...]` を走査し、以下の処理で `preparation` を広告する。

- `nullableFieldNames`: `updateMeetingSchema` で `z.string().nullable().optional()` のため `preparation` が集合に追加される
- `mergedDescriptions["preparation"]`: `createMeetingSchema`（先勝ち）から `"商談の事前準備メモ。Markdown 記法・改行が反映される"` を取得
- 最終フィールド: `wrapped.describe("商談の事前準備メモ。Markdown 記法・改行が反映される")` — description を最外ラッパーに再付与

| 観点 | 要件 | 実装 | 判定 |
|------|------|------|------|
| `preparation` が広告に存在 | `inputSchema.properties.preparation` が非 undefined | TA-04 で実 transport 経由で assert 済み（2029 pass） | ✅ |
| description に「事前準備」を含む | `description.includes("事前準備")` | "商談の事前準備メモ。Markdown 記法・改行が反映される" ✓ | ✅ |
| description に「Markdown」を含む | `description.includes("Markdown")` | 含む ✓ | ✅ |
| nullable フィールドとして公開 | update の null クリアを SDK に拒否させない | `nullableFieldNames` に追加 → nullable 広告 ✓ | ✅ |

TA-04 は `anyOf` 構造にも対応したフォールバック (`preparationProp?.anyOf?.find(...)`) を持ち、Zod v4 / JSON Schema 変換の実装差異に依存しない堅牢な検証になっている。

### 3. 部分更新セマンティクス（`undefined` / `null` / `string` 三値区別）

**`update_meeting` ハンドラ（interactions.ts:265）**:

```typescript
preparation: typedArgs.preparation,   // undefined/null/string をそのまま usecase へ
```

| 送信値 | Zod パース結果 | usecase 受け取り | updateMeeting 内スプレッド | 判定 |
|--------|---------------|-----------------|--------------------------|------|
| 省略（undefined） | `undefined` | `undefined` | `...(false)` → not included → 既存値保持 | ✅ |
| `null` | `null`（nullable.optional()） | `null` | `...(true && { preparation: null })` → クリア | ✅ |
| `"新メモ"` | `"新メモ"` | `"新メモ"` | `...(true && { preparation: "新メモ" })` → 更新 | ✅ |

**`create_meeting` ハンドラ（interactions.ts:191）**:

```typescript
preparation: typedArgs.preparation ?? null,
```

省略時: `undefined ?? null` → `null` を usecase に渡す ✓

### 4. 部分更新 behavioral テスト（実 transport 使用）

| テスト | 検証内容 | 実装方式 | 判定 |
|--------|---------|---------|------|
| TA-01a | create_meeting — preparation 渡り | MCP transport 経由で usecase への入力を assert | ✅ |
| TA-01b | create_meeting — 省略時 null | 同上 | ✅ |
| TA-02 | update_meeting — 省略で undefined | 同上 | ✅ |
| TA-03 | update_meeting — null でクリア | 同上 | ✅ |
| TA-04 | inputSchema 広告 | tools/list を実 transport で呼び出し、description を assert | ✅ |

モック設計: `mock.module` を個別ファイルで行い `afterAll` で実装に復元。ソース文字列照合は一切なし。spec.md の受け入れ基準を全て充足する。

### 5. 既存フィールド・認可・レート制限の不変確認

- `canPerform(role, "meeting", "create")` / `canPerform(role, "meeting", "edit")` — 変更なし ✓
- レート制限チェック — 変更なし ✓
- `summary` / `hearingData` / `attendees` / `actionItems` の受け渡しロジック — 変更なし ✓
- `validateAndParse` による discriminated union バリデーション — 変更なし ✓

## Summary

MCP 固有の観点（API contract / スキーマ広告 / 部分更新セマンティクス / behavioral テスト）はすべて要件を充足している。

`preparation` フィールドは `inputSchema` に正しく広告され、description は「事前準備」「Markdown」の両キーワードを含む。MCP ハンドラは `update_meeting` において `undefined`（変更なし）/ `null`（クリア）/ `string`（更新）の三値区別を正確に usecase へ伝達する。`create_meeting` は `?? null` で省略時を null に正規化しており contract 上の混乱がない。

TA-01〜04 のすべてが実 MCP transport (`WebStandardStreamableHTTPServerTransport`) 経由の behavioral テストであり、contract が生きたテストで固定されている。

Finding #1 は `buildAdvertisementSchema` の設計トレードオフ（全 operation を flat merge する際の nullable 非対称）であり、`summary` を含む既存フィールドと同一の既知パターン。本変更による退行ではなく、blocking に値しない。
