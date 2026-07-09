# Test Cases: MCP 引合「案件化」専用オペレーション

## Summary

- **Total**: 22 cases
- **Automated** (unit/integration): 21
- **Manual**: 1
- **Priority**: must: 12, should: 8, could: 2

---

## Scenario 由来テストケース（spec.md）

### TC-001: ポリシー非該当で即時案件化した場合に Deal が返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: usecase は即時案件化時に生成された Deal を Result に含める > Scenario: ポリシー非該当で即時案件化した場合に Deal が返る

---

### TC-002: ポリシー該当で承認ゲートが発動した場合に Deal は返らない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: usecase は即時案件化時に生成された Deal を Result に含める > Scenario: ポリシー該当で承認ゲートが発動した場合に Deal は返らない

---

### TC-003: convert オペレーションで即時案件化し Deal を含む結果を返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP inquiries ツールに convert オペレーションが存在する > Scenario: convert オペレーションで即時案件化し Deal を含む結果を返す

---

### TC-004: convert オペレーションで承認ゲートが発動した場合

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP inquiries ツールに convert オペレーションが存在する > Scenario: convert オペレーションで承認ゲートが発動した場合

---

### TC-005: clientId 未設定の引合に対する convert の拒否

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: convert は clientId 未設定の引合を拒否する > Scenario: clientId 未設定の引合に対する convert の拒否

---

### TC-006: member ロールによる convert の拒否

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: convert の認可は inquiry:convert と同一である > Scenario: member ロールによる convert の拒否

---

### TC-007: admin ロールによる convert の許可

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: convert の認可は inquiry:convert と同一である > Scenario: admin ロールによる convert の許可

---

### TC-008: レート制限超過時の拒否

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: convert にレート制限が適用される > Scenario: レート制限超過時の拒否

---

### TC-009: update_status converted が従来どおり動作する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: update_status converted は後方互換で動作する > Scenario: update_status converted が従来どおり動作する

---

### TC-010: update_status converted のレスポンスに Deal が含まれる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: update_status converted は後方互換で動作する > Scenario: update_status converted のレスポンスに Deal が含まれる

---

### TC-011: tools/list で convert が広告される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: convert オペレーションが tools/list のスキーマ広告に含まれる > Scenario: tools/list で convert が広告される

---

### TC-012: convert の description に案件化と承認ポリシーの説明が含まれる

**Category**: integration
**Priority**: could
**Source**: spec.md > Requirement: description は convert の挙動を明記し update_status に推奨注記を含む > Scenario: convert の description に案件化と承認ポリシーの説明が含まれる

---

### TC-013: convert 経由の案件化で監査ログが記録される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 監査ログは usecase 内で記録される（MCP ハンドラ追加不要）> Scenario: convert 経由の案件化で監査ログが記録される

---

## 非 Scenario 由来テストケース（design.md / tasks.md）

### TC-014: convert が updateInquiryStatus に正しい引数を渡す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05（behavioral テスト — usecase 呼び出し引数検証）

**GIVEN** admin ロールの認証済みユーザーが MCP 経由で接続しており、有効な inquiryId がある
**WHEN** `inquiries` ツールを `{ operation: "convert", inquiryId: "<uuid>" }` で呼び出す
**THEN** `updateInquiryStatus` が `{ inquiryId, organizationId, actorId: userId, newStatus: "converted" }` の引数で呼び出されたことをモック呼び出し記録で確認できる

---

### TC-015: tools/list で inquiryId フィールドが properties に型情報を持つ

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06（スキーマ広告テスト — inquiryId フィールド）

**GIVEN** MCP サーバーが起動している
**WHEN** `tools/list` リクエストを実 transport 経由で送信する
**THEN** `inquiries` ツールの inputSchema の `properties` に `inquiryId` フィールドが存在し、型情報（type: "string"）が含まれる

---

### TC-016: update_status の newStatus description に convert 推奨注記が含まれる

**Category**: integration
**Priority**: could
**Source**: tasks.md > T-04（description の更新 — update_status 注記）

**GIVEN** MCP サーバーが起動している
**WHEN** `tools/list` で `inquiries` ツールの情報を取得する
**THEN** `update_status` スキーマの `newStatus` フィールドの description に、`converted` は後方互換であり `convert` オペレーションの使用を推奨する旨が含まれる

---

### TC-017: convert と update_status:converted がレート制限バケットを共有する

**Category**: integration
**Priority**: should
**Source**: design.md > D3（レート制限キーの共有）

**GIVEN** `update_status: converted` の呼び出しによってレート制限バケット `mcp:updateInquiryStatus:<userId>` が上限に達している
**WHEN** 同一ユーザーが `{ operation: "convert", inquiryId: "<id>" }` を呼び出す
**THEN** ツール結果は `isError: true` でレート制限超過を示すメッセージを返す（別バケットで通過しない）

---

### TC-018: UpdateInquiryStatusResult の型変更が既存コードを壊さない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01（usecase Result 型拡張の後方互換）

**GIVEN** `UpdateInquiryStatusResult` の成功ケースに `deal?: Deal` がオプショナルフィールドとして追加されている
**WHEN** `bun run typecheck` を実行する
**THEN** 既存の Server Action（`src/app/actions/inquiries.ts`）および既存テストファイルが型エラーを出さず、`deal` フィールドを参照しないコードが変更なしで通過する

---

### TC-019: convert エラー時に内部詳細が漏洩しない

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-02（エラー時の内部詳細漏洩防止）

**GIVEN** `updateInquiryStatus` usecase が `{ ok: false, reason: "<内部エラー文字列>" }` を返す状態で、admin ロールのユーザーが接続している
**WHEN** `{ operation: "convert", inquiryId: "<id>" }` を呼び出す
**THEN** MCP レスポンスの `isError: true` メッセージに、スタックトレース・ファイルパス・SQL クエリ等の内部実装詳細が含まれない

---

### TC-020: update_status converted 承認ゲートパスのレスポンスが変更されない

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03（update_status 承認ゲートパスの不変）

**GIVEN** `update_status: converted` の呼び出しで usecase が `{ ok: true, inquiry, pendingApproval: { requestId } }` を返す（deal なし）
**WHEN** MCP が結果を整形して返す
**THEN** レスポンスに `inquiry` と `pendingApproval` および承認待ちを示す `message` が含まれ、`deal` フィールドは含まれない（既存の動作を維持）

---

### TC-021: manager ロールによる convert の許可

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: convert の認可は inquiry:convert と同一である（Requirement 本文 — Only admin and manager roles are permitted）

**GIVEN** `manager` ロールの認証済みユーザーが MCP 経由で接続しており、有効な inquiryId がある
**WHEN** `inquiries` ツールを `{ operation: "convert", inquiryId: "<id>" }` で呼び出す
**THEN** `canPerform(role, "inquiry", "convert")` の認可チェックを通過し、`updateInquiryStatus` usecase が呼び出される

---

### TC-022: typecheck / lint / build / test の全品質ゲートが green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08（全体検証）

**GIVEN** T-01〜T-07 の実装が完了している
**WHEN** `bun run typecheck && bun run lint && bun run build && bun test` を順に実行する
**THEN** すべてのコマンドが exit 0 で終了し、既存テスト（`mcpApproval.test.ts` 等）を含むすべてのテストが green である

---

## Result

```yaml
result: completed
total: 22
automated: 21
manual: 1
must: 12
should: 8
could: 2
blocked_reasons: []
```
