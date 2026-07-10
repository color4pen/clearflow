# MCP Conformance Review — interaction-external-attendee-contact — iter 1

- **reviewer**: mcp-conformance
- **verdict**: approved

## 観点と判定

MCP 境界に固有の失敗クラス（inputSchema 広告の正確さ・description の契約明確さ・部分更新意味論・behavioral テストの実 transport 経由化）を検査した。

---

## 1. inputSchema 広告の正確さ

### 1-1. `externalContactIds` の広告

`createMeetingSchema` および `updateMeetingSchema` の両方に `externalContactIds`（UUID 配列）が定義されており、`buildAdvertisementSchema` が生成するフラット広告スキーマにも正しく含まれる。

`buildAdvertisementSchema` は「先勝ち（first-win）」でフィールドをマージするため、広告上の `externalContactIds` の description は `createMeetingSchema` が採用される。その description は update 側の意味論（省略=保持・null=クリア）を同一フィールドに含めており、接続エージェントが広告スキーマのみを参照しても両 operation の挙動を把握できる。

```
// src/app/api/mcp/tools/interactions.ts — createMeetingSchema
externalContactIds: z.array(z.string().uuid()).optional().describe(
  "社外参加者の顧客担当者ID（UUID）リスト。顧客に登録済みの担当者IDを指定する。未登録IDはエラー。
   氏名はサーバ側で解決される。create_meeting では dealId/inquiryId に紐づく顧客の担当者IDを指定すること。
   update_meeting では省略時は既存の外部参加者を保持する（null を指定するとクリア）。"
)
```

**判定**: ✅ 合格

### 1-2. 旧 `externalAttendees` の除去

`src/app/api/mcp/tools/interactions.ts` 全体を検索した結果、スキーマの shape に `externalAttendees` は存在しない。`externalAttendees` という名前が出てくるのはハンドラ内のローカル変数（usecase に渡す `MeetingAttendee[]`）のみであり、inputSchema として広告されない。

behavioral テスト `mcpExternalContactIds.dynamic.test.ts` が実 `tools/list` レスポンスで `hasExternalAttendees` を `false` として assert しており、これが合格している（verification-result.md: test 2237 pass）。

**判定**: ✅ 合格

---

## 2. description の契約明確さ

spec.md が要求する description 要件を検証した。

| 要件 | description 文言 | 判定 |
|------|-----------------|------|
| 「顧客に登録済みの担当者ID」の制約 | "顧客に登録済みの担当者IDを指定する" | ✅ |
| 「未登録IDはエラー」の明記 | "未登録IDはエラー" | ✅ |
| 「氏名はサーバ側で解決」の明記 | "氏名はサーバ側で解決される" | ✅ |
| 省略=保持の意味論 | "update_meeting では省略時は既存の外部参加者を保持する" | ✅ |
| null=クリアの意味論 | "null を指定するとクリア" | ✅ |

behavioral テスト（tools/list describe 検証）:
- "登録済みの担当者ID" が description に含まれることを assert → ✅
- "省略時は既存の外部参加者を保持する" が description に含まれることを assert → ✅

**判定**: ✅ 合格

---

## 3. 部分更新意味論の実装正確さ（update_meeting）

`externalContactIds` の三値意味論が正しく実装されている。

| 入力値 | 内部変数 `externalAttendees` | usecase に渡る値 | 効果 |
|-------|---------------------------|-----------------|------|
| 省略（undefined） | `undefined` | `undefined` | 既存社外参加者を保持 |
| `null` | `[]` | `[]`（空配列） | 社外参加者をクリア |
| `[]`（空配列） | `[]` | `[]`（空配列） | 社外参加者をクリア（null と同効果） |
| `[uuid, ...]` | `MeetingAttendee[]`（解決済み） | `MeetingAttendee[]` | 社外参加者を差し替え |

`internalAttendees` と `externalContactIds` は完全に独立して部分更新される（同一 update_meeting コールで片方のみ指定した場合、他方は undefined のまま usecase に渡る）。

```typescript
// interactions.ts — update_meeting ハンドラの三値分岐
if (typedArgs.externalContactIds === undefined) {
  externalAttendees = undefined;
} else if (typedArgs.externalContactIds === null) {
  externalAttendees = [];
} else if (typedArgs.externalContactIds.length === 0) {
  externalAttendees = [];
} else {
  // contactId 解決 → MeetingAttendee[]
  externalAttendees = ...;
}
```

**補足**: 空配列 `[]` は `null` と同じクリア効果だが、この挙動は description に明示されていない。使用頻度・エージェント誤用リスクともに低いため許容範囲内。

**判定**: ✅ 合格

---

## 4. 懸垂参照（snapshot）の保護

氏名は `MeetingAttendee.name` にスナップショットとして保存される。read 経路で `listClientContacts` を呼ばない設計が正しく実装されている。

behavioral テスト（TC-020）:
- `externalContactIds` を省略した `update_meeting` では `listClientContacts` が呼ばれないことを `listClientContactsCallCount === 0` で assert → ✅
- `externalContactIds: null` でも `listClientContacts` が呼ばれないことを assert → ✅

**判定**: ✅ 合格

---

## 5. エラー応答の agent 可読性

| エラー条件 | メッセージ |
|-----------|-----------|
| 未登録 contactId | "未登録の担当者IDが含まれています: &lt;id&gt;, ..." | ✅ 具体的 ID を含む |
| clientId 未解決 | "社外参加者を追加するには顧客の設定が必要です" | ✅ 状況説明あり |
| 商談が見つからない（update） | "商談が見つかりません" | ✅ |

いずれも `isError: true` として返るため、エージェントは明確に失敗を検知できる。

**判定**: ✅ 合格

---

## 6. behavioral テストの品質

### 実 MCP transport 経由

両テストファイル（`mcpExternalContactIds.dynamic.test.ts`、`mcpPartialUpdate.dynamic.test.ts`）は `WebStandardStreamableHTTPServerTransport` + `handleRequest` で実際の JSON-RPC 2.0 リクエストを送受信しており、ソース文字列照合を使用していない。

### モック戦略

- 個別 usecase ファイルをモック（`mock.module("@/application/usecases/createMeeting", ...)`）
- `afterAll` で実装を復元
- `interactionRepository`・`dealRepository`・`inquiryRepository` もモックされており、DB 接続なしで完結する

### カバレッジ確認

| シナリオ | テストあり |
|---------|-----------|
| create_meeting: 登録済み contactId → attendees に contactId + 氏名スナップショット | ✅ |
| create_meeting: 未登録 contactId → isError:true | ✅ |
| create_meeting: externalContactIds なし → 社外参加者なし | ✅ |
| create_meeting: internalAttendees と externalContactIds の両指定 | ✅ |
| update_meeting: externalContactIds 省略 → externalAttendees: undefined | ✅ |
| update_meeting: externalContactIds: null → externalAttendees: [] | ✅ |
| update_meeting: externalContactIds: [...] → 解決済み MeetingAttendee[] | ✅ |
| update_meeting: externalContactIds: [未登録] → isError:true | ✅ |
| update_meeting: internalAttendees のみ → externalAttendees: undefined | ✅ |
| tools/list: externalContactIds が inputSchema に存在する | ✅ |
| tools/list: externalAttendees が inputSchema に存在しない | ✅ |
| tools/list: description に "登録済みの担当者ID" が含まれる | ✅ |
| tools/list: description に "省略時は既存の外部参加者を保持する" が含まれる | ✅ |
| 懸垂参照: snapshot 保持時に listClientContacts を呼ばない | ✅ |

**判定**: ✅ 合格

---

## 7. まとめ

| 観点 | 結果 |
|------|------|
| inputSchema 広告（externalContactIds 存在） | ✅ |
| inputSchema 広告（externalAttendees 不存在） | ✅ |
| description の制約明確さ（登録済み・エラー・サーバ解決・部分更新） | ✅ |
| 部分更新意味論（三値: undefined/null/配列） | ✅ |
| internalAttendees との独立性 | ✅ |
| 懸垂参照 snapshot の保護 | ✅ |
| エラー応答の agent 可読性 | ✅ |
| behavioral テスト（実 transport・ソース文字列照合なし） | ✅ |
| mock.module 汚染回避（個別ファイルモック + afterAll 復元） | ✅ |

MCP 境界に固有の失敗クラスはいずれも検出されなかった。inputSchema の広告内容・description の契約・部分更新意味論・behavioral テストのすべてが仕様要件を満たしている。
