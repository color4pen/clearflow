# Design: MCP フィールドの用途・形式を describe に明記

## Context

MCP サーバーのフィールド describe（`.describe()` による JSON Schema `description`）は、接続エージェントがフィールドの意味・用途・形式を把握する唯一の情報源である。

現状、以下の問題がある:

1. **Markdown/改行対応の未広告**: UI 上で `MarkdownTextarea` コンポーネントにより Markdown 記法・改行が反映されるフィールドが存在するが、MCP の describe にその旨が記載されていない。エージェントは Markdown が使えることを知らず、ベタ書きしてしまう。
2. **用途の不明確さ**: 複数の自由テキストフィールドがある場合（例: interactions の `summary` vs `details`）、それぞれの使い分けが describe から読み取れない。

UI binding の確認結果に基づく **Markdown 対応フィールドの正確な一覧**:

| ツール | フィールド | UI コンポーネント | 現状 describe |
|--------|-----------|------------------|--------------|
| inquiries | `description` | `InquiryInfoSection.tsx` → `MarkdownTextarea` | なし |
| inquiries | `contactNote` | `InquiryInfoSection.tsx` → `MarkdownTextarea` | "連絡メモ" |
| deals | `notes` | `DealNotesSection.tsx` → `MarkdownTextarea` | なし |
| interactions | `summary` (create_meeting / update_meeting) | `MeetingSummarySection.tsx` → `MarkdownTextarea` | "要約" |

**Markdown 非対応のフィールド** (request.md の候補から除外):

- `deals.description` — `DealInfoSection.tsx` には description フィールドの表示・入力 UI が存在しない。`MarkdownTextarea` で描画されない。
- `interactions.details` — `recordContractAdjustmentSchema` / `recordInvoiceAdjustmentSchema` の補足テキスト。UI で `MarkdownTextarea` を使用していない。
- `hearingData.notes` — `hearingDataSchema` のネストフィールド。広告スキーマ上では `hearingData` オブジェクト内部にあり、`MarkdownTextarea` で描画されない。

本変更は `describe` の文言のみを変更する。フィールドの型・スキーマ構造・検証・認可・usecase 委譲・戻り値は一切変更しない。

## Goals / Non-Goals

**Goals**:

- Markdown/改行に対応する MCP フィールドの describe に「Markdown 記法・改行が反映される」旨を明記する
- 用途が曖昧なフィールド（interactions の summary / details、deals の description / notes）の describe に用途を明記する
- describe が欠落しているフィールド（deals description / notes、inquiries description）を補完する
- 上記の品質を behavioral テスト（tools/list 経由）で固定する

**Non-Goals**:

- 保存/描画側の変更（Markdown は既に対応済み）
- Markdown を新規に描画対応させること
- ツール名・スキーマ構造・検証ロジック・戻り値の変更
- 全フィールドへの一律 describe 追加（対象は Markdown フィールドと用途不明フィールドのみ）

## Decisions

### D1: Markdown 対応フィールドの特定方針 — UI binding に基づく正確な特定

**決定**: `MarkdownTextarea` コンポーネントに実際にバインドされているフィールドのみを「Markdown 対応」とする。推測で全テキストフィールドに付与しない。

対象フィールド:
- `inquiries.description` — 引合の概要
- `inquiries.contactNote` — 引合の問い合わせ内容
- `deals.notes` — 案件の備考
- `interactions.summary` (create_meeting / update_meeting) — 商談の議事録

除外フィールド:
- `deals.description` — UI に表示されず、MarkdownTextarea にバインドされていない
- `interactions.details` (record_contract_adjustment / record_invoice_adjustment) — MarkdownTextarea にバインドされていない
- `hearingData.notes` — ネストフィールドで MarkdownTextarea にバインドされていない

**Rationale**: request.md の「§実装上の必須事項1」に「UI binding を確認して Markdown フィールドを正確に特定する（推測で全 text フィールドに付けない）」と明記されている。`deals.description` は `DealInfoSection.tsx` に表示・入力 UI 自体が存在しないため、Markdown 対応とは言えない。

**Alternatives considered**:
- *全テキストフィールドに Markdown 可と付与* — 実際に Markdown 描画されないフィールドに付けるとエージェントが Markdown を書き込み、ユーザーが生の Markdown テキストを見ることになる。却下。
- *deals.description を Markdown 対応に含める* — UI に表示されていないフィールドに Markdown 対応を広告するのは契約として不正確。却下。

### D2: describe 文言の方針 — 用途 + 形式を端的に記述

**決定**: describe は以下の構成で記述する:

1. **用途**: そのフィールドが何に使われるかを 1 文で示す（例: "議事録・商談要約の本文"）
2. **形式注記** (Markdown 対応フィールドのみ): 末尾に「Markdown 記法・改行が反映される」を付記する

例:
- `interactions.summary` → `"議事録・商談要約の本文。Markdown 記法・改行が反映される"`
- `deals.notes` → `"案件の備考・共有メモ。Markdown 記法・改行が反映される"`
- `interactions.details` (record_contract_adjustment) → `"契約調整の補足・詳細情報"`

**Rationale**: describe は接続エージェントがフィールドの使い分けを判断する情報源。用途と形式の両方を含めることで、「どのフィールドに何を書くべきか」と「どう書くべきか」の両方が伝わる。

**Alternatives considered**:
- *形式のみ記述（"Markdown 対応"）* — 用途の判別（summary vs details vs notes）が解決しない。却下。
- *用途のみ記述* — Markdown/改行が使えることが伝わらず、#5 の問題が解決しない。却下。

### D3: テスト方針 — tools/list 経由の behavioral テスト

**決定**: 新規テストファイルを作成し、tools/list レスポンスの inputSchema からフィールドの description を取得して assert する。ソース文字列照合は使用しない。

テスト観点:
1. Markdown 対応フィールドの description に「Markdown」または「改行」を含むことを assert
2. interactions の summary / details の description が用途を判別できる文言を含むことを assert
3. 既存テスト（`mcpInputSchemaAdvertisement.test.ts` の TC-001〜TC-020）が無変更で green

**Rationale**: request.md の「§実装上の必須事項2」に「behavioral テスト（tools/list の inputSchema からフィールド description を取得して assert）。ソース文字列照合で代替しない」と明記されている。

**Alternatives considered**:
- *ソースコード grep テスト* — request.md で明示的に禁止。リファクタリングに弱い。却下。
- *既存テストファイルに追加* — 既存テストは inputSchema の構造（type/enum/properties の有無）検証。describe の内容品質は別の関心事であり、テストファイルを分離する方が保守しやすい。却下。

### D4: hearingData.notes の扱い — 広告スキーマのネスト構造を考慮

**決定**: `hearingData.notes` は `hearingDataSchema` のネストフィールドであり、広告スキーマ上では `properties.hearingData` オブジェクト内部の `properties.notes` として公開される。トップレベルの `properties.notes` ではアクセスできない。

describe を付与する場合は `hearingDataSchema` 内の `notes` フィールドに `.describe()` を追加する。テストでは `hearingData` オブジェクトへのネスト traversal を行って検証する。

**Rationale**: request-review で指摘された通り（Finding #2）、`hearingData.notes` はフラットアクセスでは取得できない。テスト設計でこの構造を考慮する必要がある。

## Risks / Trade-offs

[Risk] **deals.description の Markdown 非対応が request.md の期待と異なる** → Mitigation: request.md の「§実装上の必須事項1」に「UI binding を確認して正確に特定する」と明記されており、実装時の自己修正を前提としている。request-review（Finding #1）でもこの差異は LOW として報告済みで、「§実装上の必須事項1 が正しく制御する」と結論されている。

[Risk] **describe 変更で既存テストが壊れる** → Mitigation: 既存テスト（`mcpInputSchemaAdvertisement.test.ts`）は description 文字列に依存せず、type/enum/properties 構造のみを検証している。describe の文言変更では既存テストは壊れない。

[Trade-off] **describe が長くなる**: 「Markdown 記法・改行が反映される」の追記により、一部フィールドの description が長くなる。ただし JSON Schema の description に長さ制限はなく、エージェントの理解精度向上の方が重要。

## Open Questions

なし。変更はメタデータ（describe 文言）のみであり、設計上の不確実性はない。
