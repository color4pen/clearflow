# MCP ツールの発見性向上（description / フィールド説明の充実）

## Meta

- **type**: spec-change
- **slug**: mcp-tool-descriptions
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存 mod-mcp 内のツールメタデータ（description / describe）の充実。新しい port/adapter・層構造の選択は無いため false -->

## 背景

MCP クライアント（接続する AI エージェント）は、どのツールを使うかを **ツールの name と description**（および inputSchema 内のフィールド名・enum・説明）でランキングして発見・選択する。現状 19 ツールの description は次の均質なパターンに揃っている:

> 「<リソース名（英語併記）>の<操作の列挙>を行います。operation 引数で操作を切り替えます。」

このため発見性が低く、意図ベースの検索でクライアントが適切なツールを拾えない事象が報告された。具体的な弱点:

1. **同義語・別名・意図語が無い**。正式名しか含まないため、実務語や英語意図語での検索が外れる（例: 「取引先／クライアント／customer」→ `clients` は「顧客」のみ、「問い合わせ／見込み／リード／lead」→ `inquiries` は「引合」のみ、「請求書／インボイス／billing」→ `invoices` は「請求」のみ、「商談／opportunity」→ `deals` は「案件」のみ）。
2. **全 19 ツールで末尾の定型文が同一**（「operation 引数で操作を切り替えます。」）で識別情報に乏しく、ランカーから見て似通う。
3. **operation 集約設計ゆえ操作動詞（作成・更新・削除…）が多ツールで重複**し、動詞検索では絞り込めない。効く識別語がリソース名だけになっている。

先行の #165（inputSchema 広告修正）で「呼び出し（引数の型）」は解決済み。本 request は残る「**発見（検索でヒット・絞り込みできるか）**」を、ツールメタデータの充実で改善する。

## 現状コードの前提

- `src/app/api/mcp/tools/*.ts`（19 ファイル）: 各 `server.registerTool(name, { description, inputSchema }, handler)` の `description` が上記パターン。ツール名（`name`）は claude.ai コネクタ等が参照する識別子であり**変更しない**。
- 各 operation スキーマ・フィールドの `.describe()` は #165 で一部付与済みだが、薄い箇所が残る。
- description・`.describe()` は**メタデータのみ**で、認可・検証・usecase 委譲・戻り値には影響しない。

## 設計要素引用

[[mod-mcp]]

mod-mcp の責務「ツール登録」の範囲内でのメタデータ充実であり、新モジュール・新依存辺・新ドメイン概念・新シーケンスを導入しない（下記「aozu 影響判定」参照）。

## 要件

1. **全 19 ツールの `description` を発見性重視で充実させる。** 各 description は最低限:
   - リソースの**正式名（日本語＋英語併記）**に加え、実務で使われる**同義語・別名（日本語＋英語）**を含める。
   - その道具が**何を扱うか／いつ使うか**を端的に示す 1 文を含める。
   - 対応する **operation 群**を検索可能な形で残す（例: `operation: list/create/update/...`）。
   - 例（契約）: 「契約管理。受注後の契約（Contract）の作成・変更・解約・一覧・詳細取得。契約書・受注・請負/準委任/SES など契約種別や金額・期間・更新条件を扱う。operation: list/get/create/update/update_status/delete」
2. **全ツール同一の定型末尾を除去または短縮**し、各ツールの description が相互に十分**区別可能（distinct）**になるようにする。
3. **operation・主要フィールドの `.describe()` を補強**する（#165 で広告される inputSchema に検索語・説明として乗るため、発見性と正しい呼び出しの両方に効く）。値の意味・単位・enum の選択肢意図を簡潔に記す。
4. **挙動は不変**。`description` / `.describe()` の文言のみを変更し、`name`・スキーマ構造・検証・認可・usecase 委譲・戻り値は一切変えない。

## スコープ外（follow-up）

- `outputSchema` / `structuredContent`（応答の構造化。別 request）
- Prompts / Resources / Elicitation / tool annotations（別 request）
- ツール `name` の変更（互換性維持のため不可）

## 受け入れ基準

- [ ] 全 19 ツールの `description` が空でなく、**相互に distinct**（全ツールが同一の定型文のみ、という状態が無い）であることをテストで固定する。
- [ ] 各ツールの `description` に、そのリソースの主要キーワード（正式名）が含まれることをテストで固定する（例: `clients` の description に「顧客」、`inquiries` に「引合」等）。
- [ ] `description` 変更後も #165 の inputSchema 広告テストが green（`operation` enum・型広告は不変）であることを確認する。
- [ ] 既存の全テストが**無変更で green**（挙動不変）。`typecheck` / `lint` / `build` green。
- [ ] `aozu check` exit 0・architecture test green（設計層は不変）。

## 実装上の必須事項

1. **成果物は単体で読めること**。description に会話の文脈・経緯（「報告された」「レビューで指摘」等）を含めない。ツールが何であるかだけを記述する。
2. **name は不変**。コネクタが参照する識別子のため変更しない。
3. **behavioral 変更ゼロ**。文言のみ。既存テスト・#165 テストが無変更で通ることで担保する。
4. テストは実行検証で固定する（登録された tool 定義の description を tools/list 相当で取得して assert。ソース文字列 grep で代替しない）。

## aozu 影響判定（起票前判定・必須）

**判定: 不要。** 理由:
- **新モジュール(mod)**: なし。既存 `mod-mcp`（責務に「ツール登録」を含む）内のメタデータ充実。
- **新依存辺(deps)**: なし。import 追加なし。
- **新ドメイン概念(term/ent/inv/act)**: なし。description は業務概念でなく検索用メタデータ。
- **新シーケンス(seq)**: なし。呼び出しフロー不変。

よって設計要素の新規追加は不要で、既存 `[[mod-mcp]]` の引用のみ。architecture test は緑のまま維持される。
