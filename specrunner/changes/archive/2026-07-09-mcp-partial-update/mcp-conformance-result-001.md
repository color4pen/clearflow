# MCP Conformance Review — mcp-partial-update — iter 1

- **reviewer**: mcp-conformance
- **verdict**: needs-fix
- **date**: 2026-07-09

---

## 観点サマリー

MCP における API contract（name / description / inputSchema）の正しさと、MCP 固有の実装上の落とし穴を検証する。エージェントが `tools/list` で受け取る advertised `inputSchema` に、実際の挙動が正確に表れているかを中心に審査した。

---

## 調査範囲

変更対象:
- `src/app/api/mcp/tools/interactions.ts`（`update_meeting` handler と `updateMeetingSchema`）
- `src/app/api/mcp/tools/approvalPolicies.ts`（`updateSchema` PATCH 化）
- `src/app/api/mcp/tools/inquiries.ts`（`updateSchema` nullable 化）
- `src/app/api/mcp/schemaHelpers.ts`（`buildAdvertisementSchema`）
- `src/application/usecases/updateMeeting.ts`（attendees マージロジック）
- `src/application/usecases/updatePolicy.ts`（PATCH セマンティクス）
- `src/__tests__/mcp/mcpPartialUpdate.dynamic.test.ts`
- `src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts`
- `src/__tests__/usecases/updatePolicyPartial.dynamic.test.ts`

---

## 確認済み（問題なし）

### ✅ null / undefined 透過性（interactions, approvalPolicies, inquiries）

`updateMeetingSchema` の `internalAttendees` / `externalAttendees` を `.nullable().optional()` に変更し、handler 内で `typedArgs.internalAttendees === undefined ? undefined : ...` のガードを設けている。null が空配列変換、undefined が保持として usecase に正しく透過する。

### ✅ `buildAdvertisementSchema` の nullable 検出と広告

`buildAdvertisementSchema` は全 operation スキーマを走査して nullable フィールドを `nullableFieldNames` に収集し、advertised schema でも `.nullable().optional()` を保持する。エージェントが null を送信しても SDK に拒否されない。`internalAttendees` / `externalAttendees` は nullable として正しく広告される。

### ✅ `approvalPolicies.update` PATCH 化

`updateSchema` の `name` / `triggerAction` / `templateId` を `.optional()` に変更し、`description` / condition 系を `.nullable().optional()` に変更した。`updatePolicy` usecase は `...(x !== undefined && { x })` パターンで未指定フィールドを repository に渡さない。design D2 の意図通り。

### ✅ `inquiries.update` nullable 化

`description` / `contactNote` / `budget` / `timeline` / `clientId` / `assigneeId` に `.nullable()` を追加。handler は `typedArgs.xxx` を直接 usecase に透過させており、null / undefined が正しく伝わる。

### ✅ `updateMeeting` usecase の attendees マージロジック

`internalAttendees` / `externalAttendees` のいずれかが指定された場合に既存 attendees から反対側を保持して結合する実装が正確。「両方 undefined → attendees 変更なし」「null → 空配列（クリア）」「既存の `attendees` 全置換（Server Action）との後方互換」もすべて正しく処理されている。

### ✅ エラー情報の隠蔽

`updatePolicy` usecase は catch ブロックで `console.error` に内部詳細を書き、クライアントには "ポリシーの更新に失敗しました" のみ返す。内部 DB エラー等の漏洩なし。

### ✅ behavioral テストの充実度

`mcpPartialUpdate.dynamic.test.ts` が実 MCP transport 経由で全 11 操作の「省略 = undefined 保持」と「null = クリア」を網羅的にテストしている。`updateMeetingPartialAttendees.dynamic.test.ts` と `updatePolicyPartial.dynamic.test.ts` が usecase 層の動作を独立して固定している。mock.module + afterAll 復元パターンも既存規約に準拠しており汚染リスクなし。

---

## 指摘事項

### F-01: `internalAttendees` / `externalAttendees` の describe が advertised inputSchema に到達しない

**severity**: MEDIUM
**category**: inputSchema contract（エージェントへの契約不備）

#### 問題の詳細

`updateMeetingSchema` の `internalAttendees` に以下の describe が追加された（T-01 対応）。

```typescript
// updateMeetingSchema
internalAttendees: z
  .array(z.string())
  .nullable()
  .optional()
  .describe(
    "社内参加者の名前リスト。指定した場合のみ内部参加者を差し替える。省略時は既存の内部参加者を保持する（externalAttendees とは独立して部分更新される）。null を指定すると内部参加者をクリアする。"
  ),
```

しかし `buildAdvertisementSchema` は **first-win ロジック**（同名フィールドは最初に登場したスキーマの定義を採用）で動作しており、`interactionsAdvertisementSchema` を構築する際のスキーマ配列は:

```typescript
buildAdvertisementSchema([
  createMeetingSchema,   // ← 先着。internalAttendees に .describe() なし
  updateMeetingSchema,   // ← 後着。internalAttendees に .describe() あり（無視される）
  ...
])
```

`createMeetingSchema.shape.internalAttendees` は `z.array(z.string()).optional()`（describe なし）のため、first-win によってこのフィールドが選ばれ、`updateMeetingSchema` の describe は **advertised schema に反映されない**。

エージェントが `tools/list` で取得する `interactions.inputSchema.properties.internalAttendees` は以下の形になる：

```json
{
  "anyOf": [
    { "type": "array", "items": { "type": "string" } },
    { "type": "null" }
  ]
}
```

**description フィールドが存在しない**。

#### 影響

spec.md に "attendees フィールドの describe がセマンティクスを明記する"（SHALL）と明記されており、design.md D1 / request.md 要件 2 にも「採用したセマンティクスをフィールド describe に明記する」と記載されている。`updateMeetingSchema` 内の describe は実装されているが、エージェントが受け取る contract には届いていない。

エージェントは advertised `inputSchema` のみを参照してツールを使用する。describe がなければ:
- `internalAttendees` のみを指定すれば外部参加者が保持されることを知る手段がない
- `null` でその側だけをクリアできることを知る手段がない
- 誤って `internalAttendees` + `externalAttendees` を常に両方指定したり、逆に片側だけで全参加者が差し替えられると誤解する可能性がある

MCP の原則「機能が実装されていても contract に表れなければ誤用される」に直接抵触する。

#### 修正案

**推奨: `buildAdvertisementSchema` の description merge ロジックを改善する。**

現状の first-win はフィールドの型定義には有効だが、description については「説明を持つ最初のスキーマのものを採用する」ロジックに変更する。具体的には:

```typescript
// mergedFields にない場合に追加するとき
if (!(key in mergedFields)) {
  // 現状: この時点の value から description を取得する（createMeetingSchema が先着）
  // 改善: 全スキーマからこのフィールドの description を探し、最初に見つかったものを使う
  let description = extractDescription(fieldType);
  if (!description) {
    // 後続スキーマから description を探す
    for (const otherSchema of operationSchemas) {
      const otherField = otherSchema.shape[key];
      if (otherField) {
        const otherDesc = extractDescription(otherField as z.ZodTypeAny);
        if (otherDesc) { description = otherDesc; break; }
      }
    }
  }
  ...
}
```

または `createMeetingSchema.internalAttendees` / `externalAttendees` にも create 用の describe（「作成時の社内参加者リスト」等）を追加する。

---

### F-02: advertised schema の describe 伝搬を検証するテストが存在しない

**severity**: LOW
**category**: テストカバレッジ gap

test-cases.md TC-011「updateMeetingSchema の internalAttendees describe にセマンティクスが記載されている」は priority: should で定義されているが、対応する実装が見当たらない。また **advertised schema**（`tools/list` レスポンス）の describe 伝搬を検証するテストも存在しない。

F-01 の修正後に、以下のようなテストを `mcpInputSchemaAdvertisement.test.ts` か `mcpToolDescriptions.test.ts` に追加することが望ましい：

```typescript
it("interactions.internalAttendees の description に部分更新セマンティクスが含まれる", async () => {
  const schemas = await listToolSchemas();
  const prop = schemas["interactions"]?.properties?.internalAttendees;
  expect(prop?.description).toBeDefined();
  expect(prop?.description).toContain("省略時は既存の内部参加者を保持する");
});
```

---

## 判定根拠まとめ

| 観点 | 判定 |
|------|------|
| tool name の正しさ | ✅ 変更なし |
| tool description の正しさ | ✅ 既存のまま適切 |
| advertised inputSchema の nullable 透過 | ✅ 正しく nullable 広告 |
| advertised inputSchema の optional 透過 | ✅ 正しく optional 広告 |
| `internalAttendees` / `externalAttendees` describe 伝搬 | ❌ F-01: first-win により未到達 |
| 部分更新ロジック（handler → usecase 境界） | ✅ 正確 |
| null / undefined 区別の伝搬 | ✅ 正確 |
| エラー情報の漏洩防止 | ✅ 問題なし |
| behavioral テストの網羅性 | ✅ 十分 |
| describe テストの存在 | ⚠️ F-02: 広告スキーマ level のテストなし |

---

## 結論

機能実装（部分更新ロジック・null/undefined 区別・usecase 層の PATCH 化）は正確であり、behavioral テストも充実している。単一の contract 欠陥（F-01）として、エージェントが受け取る advertised `inputSchema` に `internalAttendees` / `externalAttendees` の partial-update セマンティクスが含まれない点が spec 要件（SHALL）に抵触する。

修正は `buildAdvertisementSchema` の description 探索ロジック変更のみで完結する（小規模）。

- **verdict**: needs-fix
