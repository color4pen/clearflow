# Regression Gate Result — Iteration 1

- **change**: mcp-partial-update
- **iteration**: 1
- **verdict**: needs-fix

## Summary

Ledger に記録された 1 件の finding を検証した結果、修正が不完全であることを確認した。

---

## Finding 検証結果

### [HIGH] internalAttendees / externalAttendees の describe が advertised inputSchema に到達しない（未修正）

- **severity**: high
- **resolution**: fixable
- **file**: src/app/api/mcp/schemaHelpers.ts, src/app/api/mcp/tools/interactions.ts

#### 原因分析

元の finding が指摘した問題の本質は「`buildAdvertisementSchema` の first-win ロジックにより、同名フィールドを持つ後続スキーマの description が無視される」ことにある。

今回のブランチで施された修正内容：

1. `schemaHelpers.ts` — `extractDescription()` 関数を追加し、`.nullable().optional()` ラッピング後に description が anyOf 内部に埋もれる問題を回避。ラッピング前に description を退避し `.describe()` を再適用するよう変更。
2. `interactions.ts (updateMeetingSchema)` — `internalAttendees` / `externalAttendees` に `.describe("...")` を追加。

#### 問題が残る理由

`interactionsAdvertisementSchema` は以下の順序で構築される：

```ts
buildAdvertisementSchema([
  createMeetingSchema,      // internalAttendees: z.array(z.string()).optional() ← describe なし
  updateMeetingSchema,      // internalAttendees: z.array(z.string()).nullable().optional().describe("...") ← describe あり
  ...
])
```

マージループは `if (!(key in mergedFields))` による first-win で動作するため：

1. `createMeetingSchema.internalAttendees`（describe なし）が最初に処理される
   → `extractDescription()` は `undefined` を返す
   → `mergedFields["internalAttendees"]` が description なしで登録される
2. `updateMeetingSchema.internalAttendees`（describe あり）は `key` が既に存在するためスキップされる
   → describe の内容が advertised schema に反映されない

`extractDescription()` の追加はラッピング後の description 損失を防ぐ修正として正しいが、「先行スキーマの description が undefined で後続スキーマに description がある」ケースには機能しない。`createMeetingSchema.internalAttendees` に `.describe()` が追加されていない限り、finding の根本原因は解消されない。

#### 必要な修正（いずれか）

**Option A（推奨・最小変更）**: `createMeetingSchema` の `internalAttendees` / `externalAttendees` に `.describe()` を追加する

```ts
// createMeetingSchema 内
internalAttendees: z.array(z.string()).optional().describe(
  "社内参加者の名前リスト"
),
externalAttendees: z.array(z.string()).optional().describe(
  "社外参加者の名前リスト"
),
```

**Option B**: `buildAdvertisementSchema` の description マージロジックを「type/shape は first-win、description は最初に見つかった非 undefined 値を採用」に変更する

```ts
// 現在（first-win）:
if (!(key in mergedFields)) { ... }

// 変更後（description のみ後勝ちを許容）:
if (!(key in mergedFields)) {
  // type/shape を登録
} else if (!descriptionOf(mergedFields[key]) && extractDescription(value)) {
  // description のみ後から補完
}
```

---

## 検証ファイル一覧

| ファイル | 確認内容 |
|---|---|
| `src/app/api/mcp/schemaHelpers.ts` | `extractDescription()` 追加・ラッピング後の `.describe()` 再適用 — 実装済み |
| `src/app/api/mcp/tools/interactions.ts` | `updateMeetingSchema` の describe 追加 — 実装済み |
| `src/app/api/mcp/tools/interactions.ts` | `createMeetingSchema.internalAttendees` / `externalAttendees` への describe 追加 — **未実施** |
| `buildAdvertisementSchema` merge ロジック | description first-non-undefined ロジックへの変更 — **未実施** |
