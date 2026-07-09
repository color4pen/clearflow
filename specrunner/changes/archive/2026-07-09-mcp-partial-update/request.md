# MCP update 系ツールの部分更新を是正（未指定フィールドの保持）

## Meta

- **type**: spec-change
- **slug**: mcp-partial-update
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存 mod-mcp/mod-usecase の update 挙動の是正。新しい port/adapter・層構造の選択は無いため false -->

## 背景

issue #167 #4（優先度 HIGH・データ破壊）: MCP の update 系ツールで、渡さなかった項目が既定値でリセットされる（「参加者を直すと details が消え、details を直すと参加者が消える」）。未指定フィールドは保持する PATCH 的挙動が期待されている。

調査結果:
- 多くの update usecase（`updateDeal` / `updateMeeting`）と interactions ハンドラは、スカラー項目について既に **undefined（変更なし）/ null（クリア）を区別**し `...(X !== undefined && { X })` の部分更新を実装している。
- **残る具体バグは interactions `update_meeting` の attendees**: `internalAttendees`（または `externalAttendees`）だけを指定すると、`attendees` が「指定した側 + 空の反対側」で全再構築され、**反対側の参加者が無言で消える**（`src/app/api/mcp/tools/interactions.ts:200-217`。undefined でなく空配列に潰れる）。
- 他の多フィールド update オペレーションも同じ規律で書けているか、横断監査が必要。

## 現状コードの前提

- **部分更新監査の対象（多フィールド update）**: `update`（approvalPolicies / approvalTemplates / clients / deals / inquiries / invoices / contracts / organization / tasks / revenueTargets）、`update_contact`（clients）、`update_meeting`（interactions）。
- **対象外（単一フィールド遷移＝部分更新の概念なし）**: `update_status` / `update_phase` / `update_role`。
- usecase: `src/application/usecases/update*.ts`。`updateDeal` / `updateMeeting` は `...(X !== undefined && { X })` 済み。他は要確認。
- 具体バグ箇所: `src/app/api/mcp/tools/interactions.ts:200-217`（attendees 内外の相互上書き）。`updateMeeting` usecase 自体は attendees を full-replace で受ける（`attendees?: MeetingAttendee[]`）。

## 設計要素引用

[[mod-mcp]], [[mod-usecase]]

## 要件

1. **すべての多フィールド update オペレーションが、未指定（undefined）フィールドを保持する。** 既定値（false / null / 空配列）で上書きしない。クリアが意味を持つ項目では **null（明示クリア）と undefined（変更なし）を区別**する。各ツールハンドラと対応 usecase を横断監査し、逸脱を是正する。
2. **interactions `update_meeting` の attendees を修正する。** `internalAttendees` / `externalAttendees` の片方だけ指定したとき、指定しなかった側を消さない。推奨セマンティクス: 内部/外部を独立した部分更新として扱う——片方のみ指定なら**その側だけ差し替え、反対側は既存を保持**（既存 attendees を取得し `isExternal` が対象外の要素を残す）。両方指定なら両方差し替え。採用したセマンティクスをフィールド describe に明記する（フィールド説明で用途・形式を誤解なく示す）。
3. **データ破壊の是正以外は挙動不変**。認可・監査・レート制限・戻り値は変えない。

## スコープ外

- 単一フィールド遷移（`update_status` / `update_phase` / `update_role`）。
- 「商談」の一級化・事前準備/議事録の分離（#167 #6/#7、別 request）。
- フィールド用途/形式の describe 全面整備（#167 #5/#8、別 request。ただし attendees セマンティクスの明記は本 request で行う）。

## 受け入れ基準

- [ ] 各多フィールド update ツールについて、**あるフィールドを省略した更新が既存値を保持する**ことを behavioral テストで固定する（省略＝リセットにならない）。
- [ ] クリアが有効な項目で、null 指定が実際にクリアすることをテストで固定する（undefined と区別）。
- [ ] interactions: `internalAttendees` のみ指定した更新が既存の外部参加者を保持すること（およびその逆）をテストで固定する。
- [ ] 既存の全テストが green（挙動不変）。`typecheck` / `lint` / `build` green。`aozu check` exit 0・architecture test green。
- [ ] mcp-conformance レビュワーの「部分更新」観点を満たす。

## 実装上の必須事項

1. **behavioral テスト**（実 transport で `tools/call` の update を実行し、更新後に対象を再取得して未指定フィールドが保持されていることを assert）。ソース文字列照合で代替しない。
2. **mock.module 汚染回避**（個別ファイル・`afterAll` 復元）。
3. **エラーで内部詳細を漏らさない**。
4. **成果物は単体で読めること**（会話文脈を含めない）。

## aozu 影響判定（起票前判定・必須）: **不要**

- 新モジュール(mod): なし（既存 mod-mcp / mod-usecase 内の挙動是正）。
- 新依存辺(deps): なし。
- 新ドメイン概念(term/ent/inv/act): なし（部分更新は実装挙動であり業務概念でない）。
- 新シーケンス(seq): なし。

既存 `[[mod-mcp]]` / `[[mod-usecase]]` の引用のみ。architecture test は緑のまま。
