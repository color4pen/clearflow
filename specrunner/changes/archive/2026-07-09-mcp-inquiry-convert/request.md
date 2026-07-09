# MCP: 引合の「案件化」専用オペレーション

## Meta

- **type**: new-feature
- **slug**: mcp-inquiry-convert
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存の案件化ユースケースを MCP に専用オペレーションとして露出。新しい port/adapter・層構造の選択は無いため false -->

## 背景

issue #167 #11: 引合の「案件化」は UI ではボタン 1 つだが、MCP には専用オペレーションが無い。接続エージェントは `inquiries.update_status` の `converted` で代替する必要があり、しかも**案件化で自動生成された Deal がツール結果に返らない**ため、生成された案件を別途探す羽目になった。専用オペレーション化と挙動の明記が求められている。

## 現状コードの前提

- 変換は `src/application/usecases/updateInquiryStatus.ts` の `newStatus === "converted"` 経路:
  - clientId 必須（`inv-inquiry-convert-requires-client`。未設定なら拒否）。
  - 承認ポリシーを評価し、**該当なし**なら同一トランザクションで `dealRepository.create` により Deal を即時生成 → 引合を converted に更新 → 監査記録 → `inquiry.converted` イベント発行。**該当あり**なら承認リクエストを生成し Deal は承認後に生成。
  - Result 型は `{ ok: true; inquiry: Inquiry; pendingApproval?: { requestId } }`。**生成された Deal を返していない。**
- MCP `src/app/api/mcp/tools/inquiries.ts` の `update_status` ハンドラは `inquiry`（+ pendingApproval メッセージ）を返すが、Deal を返さない。
- 設計: `design/dynamic/inquiry-conversion.md`（承認ゲート付き案件化のシーケンス）、`inv-inquiry-convert-requires-client`、案件化の主体は `act-manager`。

## 設計要素引用

[[ent-inquiry]], [[ent-deal]], [[act-manager]], [[inv-inquiry-convert-requires-client]], [[mod-mcp]], [[mod-usecase]]

## 要件

1. **`updateInquiryStatus` の Result に、即時生成された Deal を加える**（追加的な `deal?: Deal`。ポリシー該当で承認ゲートされた場合は Deal 未生成＝`pendingApproval` を返す、従来どおり）。既存の Server Action は追加フィールドを無視できる（後方互換・破壊なし）。
2. **inquiries MCP ツールに専用オペレーション `convert` を追加する**: `{ operation: "convert", inquiryId }`。内部は既存の案件化経路（updateInquiryStatus converted 相当）を呼び、結果として **`{ inquiry, deal?, pendingApproval?, message }`** を返す。message は「案件を生成しました（dealId）」または「承認リクエストを作成しました。承認後に案件が生成されます」を明示する。認可（`canPerform(role, "inquiry", "convert")`）・レート制限・監査は `update_status: converted` と同一。
3. **describe に挙動を明記する**（[誤解防止]）: `convert` の説明に「引合を案件化し Deal を生成（承認ポリシー該当時は承認後に生成）」を書く。`update_status` の説明にも「`converted` も案件化を行う（後方互換）。案件化は `convert` の使用を推奨」と注記する。
4. **`update_status` の `converted` は後方互換のため残す**（既存クライアントを壊さない）。
5. 承認ゲート・clientId 必須不変条件（`inv-inquiry-convert-requires-client`）等の挙動は不変。

## スコープ外

- `update_status` から `converted` を削除すること（後方互換のため残す）。
- 「商談」の一級化・ドメイン再設計（#167 #6/#7、別 request）。

## 受け入れ基準

- [ ] `convert` が引合を案件化し、ポリシー非該当時に**生成された Deal（id 等）を返す**ことを behavioral テストで固定する。
- [ ] ポリシー該当時に `convert` が **pendingApproval を返し Deal を返さない**（承認後生成の既存フロー）ことを固定する。
- [ ] clientId 未設定の引合に対する `convert` が拒否される（`inv-inquiry-convert-requires-client`）ことを固定する。
- [ ] `convert` の認可・レート・監査が `update_status: converted` と同一判定であることを固定する。
- [ ] `update_status: converted` が従来どおり動作する（後方互換）ことを固定する。
- [ ] 既存の全テストが green（`updateInquiryStatus` の Result 追加で既存テストが壊れない）。`typecheck`/`lint`/`build` green。`aozu check` exit 0・architecture test green。
- [ ] mcp-conformance レビュワーの観点（スキーマ広告・describe の明確さ・テナント/認可）を満たす。

## 実装上の必須事項

1. **behavioral テスト**（実 transport で `convert` を実行し、戻り値の deal/pendingApproval・監査・認可を assert）。ソース文字列照合で代替しない。
2. **mock.module 汚染回避**（個別ファイル・`afterAll` 復元）。
3. **エラーで内部詳細を漏らさない**。
4. **成果物は単体で読めること**（会話文脈を含めない）。

## aozu 影響判定（起票前判定・必須）: **不要**

- **新モジュール(mod)**: なし（既存 mod-mcp / mod-usecase 内）。
- **新依存辺(deps)**: なし（mod-mcp → mod-usecase は既存。mod-mcp は update_status: converted で既に案件化ユースケースへ到達している）。
- **新ドメイン概念(term/ent/inv/act)**: なし（案件化は `act-manager`・`inv-inquiry-convert-requires-client`・`dynamic/inquiry-conversion.md` で既に設計済み）。
- **新シーケンス(seq)**: なし（案件化シーケンスは既存。本 request は同一フローへの MCP 入口を明確化するのみ。既存 MCP ツールが UI 中心の seq に対して追加入口である前例に倣う）。

既存要素の引用のみ。architecture test は緑のまま。
