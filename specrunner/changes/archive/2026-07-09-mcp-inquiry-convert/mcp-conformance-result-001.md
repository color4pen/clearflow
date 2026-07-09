# MCP Conformance Review — mcp-inquiry-convert — iteration 001

- **verdict**: approved
- **iteration**: 001
- **reviewer**: mcp-conformance

## 観点と判定基準

MCP 境界に固有の失敗クラスを検出する。
- **スキーマ広告**: `tools/list` で `inputSchema` に正しく型・enum・description が広告されているか
- **description の明確さ**: 接続エージェントが操作の意味・戻り値・承認ゲート挙動を契約から読み取れるか
- **テナント隔離 / 認可**: `organizationId` がクライアント非指定か。`canPerform` の呼び出し順序・対象が正しいか
- **MCP 固有の落とし穴**: エラー内部詳細漏洩、レート制限キー共有・迂回可能性、スキーマ先勝ちマージの副作用

---

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | contract | `src/app/api/mcp/tools/inquiries.ts` | `convertSchema.operation.describe("引合を案件化し Deal を生成する...")` に記述された挙動説明（承認ゲートで pendingApproval / Deal 生成）は `buildAdvertisementSchema` 内で `z.enum(operations).describe("実行する操作")` に上書きされ、`tools/list` の inputSchema には広告されない。エージェントは `convert` の操作 description を見られないが、ツールレベル description に `convert` が列挙されており、`update_status.newStatus` の describe に「案件化には convert の使用を推奨」が含まれるため機能的な誤用は生じにくい。これは `buildAdvertisementSchema` 全体に共通する構造上の制約であり本 change で新たに生まれた問題ではない。 | ツールレベル description に `convert` の戻り値構造（deal または pendingApproval）を簡潔に記載するか、`buildAdvertisementSchema` が per-operation describe を保持する仕組み（例: `operation` の anyOf 形式）に将来的に移行することで完全対処できる。本 change の優先度内では必須ではない。 | no |
| 2 | low | contract | `src/app/api/mcp/tools/inquiries.ts` | `case "convert"` の即時成功パスで `message: \`案件を生成しました（dealId: ${result.deal?.id ?? ""}）\`` とオプショナルチェーンを使っている。usecase の直接生成経路では `deal` は必ず存在するが、型は `deal?: Deal`（optional）のため、仮に `deal` が undefined になった場合 `"案件を生成しました（dealId: ）"` という不完全メッセージがエージェントに返る。エージェントが dealId を使って後続処理を組む場合、空文字で誤動作する可能性がある。 | `if (!result.deal)` ガードを追加して `toToolError(...)` を返すか、TypeScript の型ナローイングで `deal` の存在を保証する。または message を `result.deal ? \`案件を生成しました（dealId: ${result.deal.id}）\` : "案件を生成しました"` と分岐する。 | no |

---

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| contract-advertisement | 9 | 0.35 |
| authorization-tenant | 10 | 0.30 |
| error-containment | 10 | 0.15 |
| rate-limit | 10 | 0.10 |
| test-coverage | 9 | 0.10 |

- **total**: 9.65

---

## 詳細評価

### スキーマ広告

`convertSchema` を `inquiriesInputSchema`（discriminatedUnion）と `inquiriesAdvertisementSchema`（buildAdvertisementSchema 引数）の両方に追加している。`tools/list` で取得できる inputSchema には以下が正しく広告される。

- `operation` enum: `["list","create","update","update_status","convert","delete"]` ✓  
- `inquiryId` フィールド: `string` 型・description `"引合ID（UUID）"` ✓  
- `update_status.newStatus` の describe に `"案件化には convert オペレーションの使用を推奨"` ✓  

`mcpInputSchemaAdvertisement.test.ts` TC-019 の `expectedOperations.inquiries` に `"convert"` が追加されており、`tools/list` の enum 整合性がリグレッションとして固定されている。`mcpInquiryConvert.dynamic.test.ts` TC-11/TC-15 でも実 transport 経由で `operation` enum と `inquiryId` フィールドを assert している。

Finding 1 は `buildAdvertisementSchema` の先勝ちマージが `operation` フィールドの description を `"実行する操作"` に統一することで、`convertSchema.operation.describe(...)` の詳細説明がエージェントに届かない点だが、ツール description に `convert` が operation 一覧として列挙されており、`update_status.newStatus` 経由で推奨案内も届く。Critical とはならない。

### description の明確さ

ツールレベル description: `"...operation: list/create/update/update_status/convert/delete"` — `convert` が有効操作として認識可能。  
`convertSchema.operation.describe(...)`: 承認ポリシー該当時の挙動（pendingApproval）が明記されている（実 validation schema 側では参照可能）。  
`updateStatusSchema.newStatus.describe(...)`: 後方互換 `converted` は残すが `convert` 推奨である旨を注記 ✓  

エージェントが `tools/list` だけを参照する場合、`convert` の戻り値構造（`{ inquiry, deal }` vs `{ inquiry, pendingApproval }`）を schema から直接読み取れない点が残課題だが、Finding 1 として low で記録済み。

### テナント隔離 / 認可

`organizationId` は `getAuthInfo(extra)` 経由でトークン由来の値を使用し、クライアントが input で指定不可 ✓  
`actorId` も同様に `userId` から取得 ✓  
認可チェック `canPerform(role, "inquiry", "convert")` はレート制限チェックおよび usecase 呼び出しより**前**に実行される ✓（member ロール拒否を TC-06 behavioral テストで固定）  
`manager` ロールが通過することを TC-21 で確認 ✓  

### レート制限キー共有

`convert` と `update_status: converted` が同一キー `mcp:updateInquiryStatus:${userId}` を使用し、バケットを共有している。2 operation を交互に呼び出す迂回攻撃を構造的に封じている ✓  
TC-17 で共有バケット動作を確認 ✓

### エラー内部詳細漏洩

`toToolError(result.reason)` で渡される reason は usecase 内の日本語業務メッセージ（「案件化するには顧客の登録が必要です」等）に限られ、スタックトレース・SQL・内部パスが漏洩する経路がない ✓  
`handleToolError(error)` による例外捕捉も `toToolError` 経由でラップされる ✓  

### テストカバレッジ（MCP conformance 観点）

全テストケースは実 `McpServer` + `WebStandardStreamableHTTPServerTransport` 経由の behavioral テストとして実装されており、ソース文字列照合は使用していない ✓  
`mock.module` は個別ファイルモック（`@/application/usecases/updateInquiryStatus`）で `afterAll` 復元あり ✓  
verification-result.md: build/typecheck/test(2009 pass)/lint 全フェーズ green ✓

---

## Summary

MCP conformance 観点での必須要件はすべて満たされている。

- スキーマ広告: `convert` が `tools/list` の operation enum に正しく露出し、behavioral テストで固定されている
- description: ツールレベルで `convert` が列挙され、`update_status.newStatus` に推奨注記が含まれる
- テナント隔離・認可: `organizationId` はトークン由来、`canPerform` がレート制限前に実行
- エラー封じ込め: 内部詳細漏洩なし
- レート制限: `convert` と `update_status: converted` が同一バケットを共有し迂回不可

2 件の low finding はいずれも pre-existing 制約または防御的型安全性の向上提案であり、blocking 要因ではない。
