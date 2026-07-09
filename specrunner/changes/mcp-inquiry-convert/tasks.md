# Tasks: MCP 引合「案件化」専用オペレーション

## T-01: usecase の Result 型に `deal?: Deal` を追加し、即時生成経路で Deal をセットする

- [ ] `src/application/usecases/updateInquiryStatus.ts` の `UpdateInquiryStatusResult` 成功ケースに `deal?: Deal` を追加する（`import type { Deal }` を追加）
- [ ] 即時案件化経路（ポリシー非合致のトランザクション内）で `dealRepository.create` の戻り値を変数に保持し、`return { ok: true, inquiry: updatedInquiry, deal }` として返す
- [ ] 承認ゲート経路は変更なし（`deal` は undefined のまま `{ ok: true, inquiry, pendingApproval }` を返す）
- [ ] `UpdateInquiryStatusResult` 型を `usecases/index.ts` から re-export する（MCP ハンドラでの型参照用）

**Acceptance Criteria**:
- `UpdateInquiryStatusResult` の成功ケースが `deal?: Deal` を含む
- 即時案件化時に Result の `deal` に生成された Deal オブジェクト（id, title 等）がセットされている
- 承認ゲート時の Result に `deal` が含まれない（undefined）
- 既存の Server Action（`src/app/actions/inquiries.ts`）が `result.deal` を参照しないため、型エラー・動作変更なし
- `bun run typecheck` green

## T-02: MCP inquiries ツールに `convert` オペレーションを追加する

- [ ] `src/app/api/mcp/tools/inquiries.ts` に `convertSchema` を定義: `z.object({ operation: z.literal("convert"), inquiryId: z.string().uuid().describe("引合ID（UUID）") })`
- [ ] `inquiriesInputSchema` の discriminatedUnion に `convertSchema` を追加する
- [ ] `inquiriesAdvertisementSchema` の `buildAdvertisementSchema` 引数に `convertSchema` を追加する
- [ ] `switch` 文に `case "convert"` を追加する。ハンドラ実装:
  1. `canPerform(role, "inquiry", "convert")` で認可チェック（失敗時 `toToolError("権限がありません")`）
  2. `checkRateLimit({ key: "mcp:updateInquiryStatus:${userId}", ... })` でレート制限（`update_status: converted` と同一キー）
  3. `updateInquiryStatus({ inquiryId, organizationId, actorId: userId, newStatus: "converted" })` を呼び出す
  4. `result.ok === false` の場合 `toToolError(result.reason)`
  5. `result.pendingApproval` がある場合: `toToolSuccess({ inquiry, pendingApproval, message: "承認リクエストを作成しました。承認後に案件が自動生成されます。" })`
  6. それ以外（即時生成）: `toToolSuccess({ inquiry, deal: result.deal, message: "案件を生成しました" })` — deal の id を message に含める

**Acceptance Criteria**:
- `convert` オペレーションが `inquiries` ツールから呼び出せる
- 認可チェック `canPerform(role, "inquiry", "convert")` が usecase 呼び出し前に実行される
- レート制限キーが `mcp:updateInquiryStatus:${userId}` で `update_status: converted` と共有される
- 即時案件化の結果に `inquiry`, `deal`, `message` が含まれる
- 承認ゲートの結果に `inquiry`, `pendingApproval`, `message` が含まれ `deal` は含まれない
- エラー時に内部詳細が漏洩しない

## T-03: `update_status: converted` のレスポンスに Deal を含める（後方互換拡張）

- [ ] `src/app/api/mcp/tools/inquiries.ts` の `case "update_status"` 内、即時案件化成功パス（`pendingApproval` なし）のレスポンスを変更: `result.deal` が存在すれば `toToolSuccess({ inquiry: result.inquiry, deal: result.deal })` を返す（Deal がない場合は従来どおり `toToolSuccess(result.inquiry)`）
- [ ] 承認ゲートパス（`pendingApproval` あり）は変更なし

**Acceptance Criteria**:
- `update_status: converted` で即時案件化した場合、レスポンスに `deal` フィールドが含まれる
- `update_status: converted` で承認ゲートが発動した場合、レスポンスは従来どおり（`inquiry`, `pendingApproval`, `message`）
- 既存の `update_status` テスト（`mcpApproval.test.ts`）が green（モック戻り値に `deal` がないケースでも動作する）

## T-04: description の更新

- [ ] ツール全体の `description` 文字列を更新: operation 一覧に `convert` を追加（例: `operation: list/create/update/update_status/convert/delete`）
- [ ] `convertSchema` の `operation` フィールドまたはスキーマ自体に、案件化と承認ポリシーの挙動を説明する describe を付与する（例: `z.literal("convert").describe("引合を案件化し Deal を生成する。承認ポリシー該当時は承認後に生成。convert を推奨")` ）
- [ ] `updateStatusSchema` の `newStatus` の describe に、`converted` は後方互換で案件化を行うが `convert` の使用を推奨する旨を追記する

**Acceptance Criteria**:
- `tools/list` の `inquiries` ツール description に `convert` が operation 一覧として含まれる
- `convert` の挙動（案件化・承認ポリシー）が description から読み取れる
- `update_status` の `newStatus` description に `convert` 推奨の注記が含まれる

## T-05: behavioral テスト — `convert` オペレーション

- [ ] テストファイル `src/__tests__/mcp/mcpInquiryConvert.dynamic.test.ts` を新規作成する
- [ ] mock.module で `@/application/usecases` の `updateInquiryStatus` を個別ファイルモック（`@/application/usecases/updateInquiryStatus` をモック）。モック状態でレスポンスを切り替え可能にする（即時生成 / 承認ゲート / clientId 未設定拒否）
- [ ] mock.module で `@/infrastructure/rateLimit` をモック（`checkRateLimit` が `{ allowed: true }` を返す。レート制限テスト時は `{ allowed: false }` に切り替え）
- [ ] `afterAll` でモック復元
- [ ] テストケース:
  1. **即時案件化で Deal を返す**: admin auth で `{ operation: "convert", inquiryId }` を送信。usecase が `{ ok: true, inquiry, deal }` を返す。レスポンスに `inquiry`, `deal`, `message` が含まれることを assert
  2. **承認ゲートで pendingApproval を返す**: usecase が `{ ok: true, inquiry, pendingApproval }` を返す。レスポンスに `inquiry`, `pendingApproval`, `message` が含まれ `deal` がないことを assert
  3. **clientId 未設定で拒否**: usecase が `{ ok: false, reason: "案件化するには顧客の登録が必要です" }` を返す。レスポンスが `isError: true` で適切なメッセージを含むことを assert
  4. **member ロールで認可拒否**: member auth で `{ operation: "convert", inquiryId }` を送信。usecase が呼ばれず `isError: true` で「権限がありません」を返すことを assert
  5. **レート制限超過**: `checkRateLimit` が `{ allowed: false }` を返す。`isError: true` で「レート制限超過」を含むことを assert
  6. **usecase の呼び出し引数検証**: `convert` が `updateInquiryStatus` に `{ inquiryId, organizationId, actorId, newStatus: "converted" }` を渡すことをモック呼び出し記録で assert
- [ ] 全テストケースは実 transport（`McpServer` + `WebStandardStreamableHTTPServerTransport`）経由で `tools/call` を実行する behavioral テスト

**Acceptance Criteria**:
- 全 6 テストケースが green
- ソース文字列照合（readFile + toContain）を使用していない
- mock.module は個別ファイルモックで `afterAll` 復元あり
- `bun test` で既存テストを含め全テスト green

## T-06: スキーマ広告テスト — `convert` が tools/list に含まれる

- [ ] `src/__tests__/mcp/mcpInquiryConvert.dynamic.test.ts`（T-05 と同一ファイル）または `mcpInputSchemaAdvertisement.test.ts` に追加
- [ ] 実 transport 経由で `tools/list` を呼び出し、`inquiries` ツールの inputSchema を取得する
- [ ] `operation` の enum に `"convert"` が含まれることを assert
- [ ] `inquiryId` フィールドが properties に存在し、型情報を持つことを assert

**Acceptance Criteria**:
- `tools/list` の inputSchema で `convert` が広告されている
- `inquiryId` フィールドが非空の properties に含まれる

## T-07: 後方互換テスト — `update_status: converted` が従来どおり動作する

- [ ] `src/__tests__/mcp/mcpInquiryConvert.dynamic.test.ts`（T-05 と同一ファイル）に追加
- [ ] テストケース:
  1. **update_status converted が動作する**: admin auth で `{ operation: "update_status", inquiryId, newStatus: "converted" }` を送信。usecase が呼ばれ結果が返ることを assert
  2. **update_status converted のレスポンスに Deal が含まれる**: usecase が `{ ok: true, inquiry, deal }` を返す場合、レスポンスに `deal` が含まれることを assert

**Acceptance Criteria**:
- `update_status: converted` が従来どおり動作する
- Deal が usecase Result に含まれる場合、MCP レスポンスにも含まれる

## T-08: 全体検証

- [ ] `bun run typecheck` が green
- [ ] `bun run lint` が green
- [ ] `bun run build` が green
- [ ] `bun test` が全テスト green（既存テスト含む）

**Acceptance Criteria**:
- typecheck / lint / build / test の全ゲートが green
- 既存テスト（`mcpApproval.test.ts` 等）が壊れていない
