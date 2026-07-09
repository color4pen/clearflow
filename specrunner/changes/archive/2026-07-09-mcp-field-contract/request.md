# MCP フィールドの用途・形式を describe に明記（Markdown/改行・用途）

## Meta

- **type**: spec-change
- **slug**: mcp-field-contract
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存 mod-mcp のフィールドメタデータ（describe）の充実。新しい port/adapter・層構造の選択は無いため false -->

## 背景

issue #167 #5 / #8: 「機能はあるのに MCP 契約に情報が無いため、接続エージェントが誤解する」。具体的には —

- **#5 改行/Markdown**: 商談要約・案件ノート・引合説明などは UI で `MarkdownTextarea`（`react-markdown` + `remark-breaks`。単一改行も反映）で描画され、**Markdown 記法と改行に対応済み**。だが MCP のフィールド describe にその旨が無いため、エージェントは Markdown/改行が使えると知らずベタ書きした。
- **#8 用途不明**: 議事録の置き場が `summary` / `details` / `notes` のどれか分からず取り違えた（最終的に `summary` と判明）。各フィールドの用途が describe に無い。

描画・保存は既に対応しているため、**実対応は「フィールド describe に用途と形式を明記する」こと**（契約明確化）。#166 が発見性（同義語・意図語）を入れたのに続き、本 request は**用途＋形式（Markdown/改行・日時・UUID）の精度**を足す。

## 現状コードの前提

- Markdown 描画されるフィールド（UI が `MarkdownTextarea` を使用）:
  - `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx`（引合の description / contactNote）
  - `src/app/(dashboard)/deals/[id]/DealNotesSection.tsx`（案件の notes）
  - `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingSummarySection.tsx`（商談の summary）
- 対応する MCP フィールドの describe は欠落 or 最小: `deals.ts` の description/notes（describe なし）、`inquiries.ts` の description（describe なし）、`interactions.ts` の summary（"要約"）/ details（"詳細"）/ notes（describe なし）等。
- describe はメタデータのみ。認可・検証・usecase・戻り値に影響しない。

## 設計要素引用

[[mod-mcp]]

## 要件

1. **Markdown/改行対応の明記**: MCP フィールドのうち、UI で `MarkdownTextarea` により描画されるフィールド（実装時に UI の binding を確認して特定する。少なくとも 引合 description / contactNote、案件 notes / description、商談 summary）の describe に「**Markdown 記法・改行が反映される**」旨を明記する。
2. **用途の明記（#8）**: 用途が曖昧なフィールドの describe に用途を書く。特に商談（interactions）の `summary`（議事録・要約の本文）/ `details`（補足・詳細）/ `notes`（メモ）の使い分けが読み取れるようにする。describe が欠落しているフィールド（deals description/notes、inquiries description、interactions notes 等）を補完する。
3. **挙動は不変**。`describe` の文言のみ変更し、フィールドの型・スキーマ構造・検証・戻り値・ツール名は変えない。

## スコープ外

- 保存/描画側の変更（Markdown は既に対応済み）。
- Markdown を新規に描画対応させること（別途）。
- 「商談」の一級化・事前準備/議事録の分離（#167 #6/#7、別 request = interaction-first-class）。本 request は既存フィールド構造のまま describe を充実させるに留める。

## 受け入れ基準

- [ ] Markdown 描画される MCP フィールド（引合 description/contactNote、案件 notes、商談 summary 等）の広告 describe に「Markdown」または「改行」を含むことを behavioral テストで固定する（tools/list で取得した inputSchema のフィールド description を assert）。
- [ ] 商談の summary/details/notes の describe が用途を判別できる文言を含むことを固定する。
- [ ] describe 変更後も #165 の広告テスト（operation enum・型）が無変更で green。
- [ ] 既存の全テストが green（挙動不変）。`typecheck`/`lint`/`build` green。`aozu check` exit 0・architecture test green。
- [ ] mcp-conformance レビュワーの「契約の明確さ」観点を満たす。

## 実装上の必須事項

1. **UI binding を確認して Markdown フィールドを正確に特定する**（推測で全 text フィールドに付けない）。`MarkdownTextarea` に渡されるフィールドのみ「Markdown 可」とする。
2. **behavioral テスト**（tools/list の inputSchema からフィールド description を取得して assert）。ソース文字列照合で代替しない。
3. **成果物は単体で読めること**（describe に会話文脈を含めない）。
4. **ツール名・スキーマ構造は不変**。

## aozu 影響判定（起票前判定・必須）: **不要**

- 新モジュール(mod): なし（既存 mod-mcp 内のメタデータ充実）。
- 新依存辺(deps): なし。
- 新ドメイン概念(term/ent/inv/act): なし（describe は検索/利用のための説明であり業務概念でない）。
- 新シーケンス(seq): なし。

既存 `[[mod-mcp]]` の引用のみ。architecture test は緑のまま。
