# Design: MCP ツールの発見性向上（description / フィールド説明の充実）

## Context

MCP サーバーの全 19 ツールは `server.registerTool(name, { description, inputSchema }, handler)` で登録されている。クライアント（AI エージェント）はツールの `name` と `description`、および `inputSchema` 内のフィールド名・enum・`description` をもとにツールをランキング・選択する。

現状の description は全ツールで以下の均質パターンに揃っている:

> 「<リソース名（英語併記）>の<操作の列挙>を行います。operation 引数で操作を切り替えます。」

弱点:
1. **同義語・別名・意図語が無い** — 正式名のみで実務語での検索が外れる（例: 「取引先」→ `clients` は「顧客」のみ、「商談」→ `deals` は「案件」のみ、「問い合わせ」→ `inquiries` は「引合」のみ）
2. **全 19 ツールで末尾定型文が同一** — 「operation 引数で操作を切り替えます。」が全ツールに付与され識別情報に乏しい
3. **操作動詞の重複** — 集約設計ゆえ「一覧取得・作成・更新・削除」が多ツールで重複し、動詞検索では絞り込めない

inputSchema の `.describe()` は #165 で `inquiries` の `source`（"問い合わせ元"）と `budget`（"予算（整数）"）にのみ付与済み。残り 17 ツールの全フィールドおよび `inquiries` のその他フィールドには `.describe()` が無い。

本変更はメタデータ（`description` 文言と `.describe()` アノテーション）の充実のみを行い、`name`・スキーマ構造・検証・認可・usecase 委譲・戻り値は一切変更しない。

## Goals / Non-Goals

**Goals**:

- 全 19 ツールの `description` を発見性重視で書き直す（同義語・別名・意図語を含む）
- 全ツール共通の定型末尾を除去し、各ツールの description を相互に distinct にする
- 主要フィールドに `.describe()` を追加し、inputSchema 経由での検索・理解を改善する
- description / `.describe()` の品質をテストで固定する（distinctness・キーワード含有）

**Non-Goals**:

- `outputSchema` / `structuredContent` の付与（別 request）
- Prompts / Resources / Elicitation / tool annotations（別 request）
- ツール `name` の変更（互換性維持のため不可）
- スキーマ構造・検証ロジック・認可・usecase 委譲・戻り値の変更

## Decisions

### D1: description フォーマットの統一規約

**決定**: 全ツールの description を以下のフォーマットに統一する:

```
<リソース概要 — 何を扱うか、同義語・別名を含む1文>。<対象データの具体例や用途を示す補足>。operation: <operation値のカンマ区切りリスト>
```

例（contracts）:
```
契約管理。受注後の契約（Contract）の作成・変更・解約・一覧・詳細取得。契約書・受注・請負/準委任/SES など契約種別や金額・期間・更新条件を扱う。operation: list/get/create/update/update_status/delete
```

**Rationale**: クライアントの検索ランカーは description 内の語彙で絞り込む。正式名＋同義語＋英語意図語を含めることで、実務者がさまざまな言い回しで検索しても適切なツールがヒットする。operation リストは末尾に短縮形で残し、操作可能な範囲を一覧できるようにする。

**Alternatives considered**:
- *現状の定型パターンを維持* — 発見性の問題が解消されない。却下。
- *JSON 構造の description* — MCP プロトコルの description は自由形式テキスト。JSON はランカーの語彙マッチングに不利。却下。
- *operation ごとの description（ツール分割）* — ツール数の爆発を招き、#158 の集約方針に反する。却下。

### D2: `.describe()` 付与方針 — 検索語とフィールド理解の両方を兼ねる

**決定**: 以下のフィールド種別に `.describe()` を追加する:

1. **enum フィールド**: 各値の意味が自明でない場合に補足（例: `contractType` の `"quasi_delegation"` → 「準委任」）
2. **ID フィールド**: 何の ID かを明示（例: `dealId` → `"案件ID（UUID）"`）
3. **金額・数値フィールド**: 単位や制約を明示（例: `amount` → `"金額（正の整数、円）"`）
4. **日付フィールド**: 形式を明示（例: `startDate` → `"開始日（ISO 8601 / YYYY-MM-DD）"`）
5. **operation フィールド**: `buildAdvertisementSchema` 内で既に `"実行する操作"` が付与されており、これは維持する

**Rationale**: `.describe()` は SDK が `toJsonSchemaCompat` で JSON Schema の `description` に変換する。クライアントがフィールドの意味・型・制約を推測する主要情報源であり、正しい引数構築の助けになる。

**Alternatives considered**:
- *全フィールドに `.describe()` を付与* — `name` や `title` など自明なフィールドまで付与すると冗長。型名と同じ情報は不要。却下。
- *`.describe()` を付与せず description のみで対応* — description はツールレベルの情報。フィールドレベルの発見性には inputSchema の description が必要。却下。

### D3: approval_requests の既存補足テキストの扱い

**決定**: `approval_requests` の description に既に含まれる `【filter 引数の注意】` 補足テキストは、新 description に統合する形で残す。filter の挙動はクライアントが正しく呼び出すために必要な情報であり、削除するとリグレッションになる。

**Rationale**: この補足はツールの挙動に関する重要な注意事項を含んでおり、単なる定型文ではない。description を書き直す際に内容を損なわず統合する。

### D4: テスト方針 — tools/list 経由の実行検証

**決定**: description の品質を以下の 2 テストで固定する:

1. **distinctness テスト**: 全 19 ツールの description が互いに異なることを assert する
2. **keyword テスト**: 各ツールの description に、そのリソースの主要キーワードが含まれることを assert する（例: `clients` → "顧客", `inquiries` → "引合"）

テストは `tools/list` レスポンスから description を取得する実行検証とし、ソース文字列照合は使用しない。

**Rationale**: #165 の既存テスト（`mcpInputSchemaAdvertisement.test.ts`）と同じ方針。tools/list 経由で実際の登録値を検証する。

**Alternatives considered**:
- *ソース grep テスト* — リファクタリングに弱い。#165 の実装上の必須事項でも禁止されている。却下。
- *既存テストファイルに追加* — 既存テストは inputSchema 広告の検証。description は別の関心事であり、テストファイルを分離する方が保守しやすい。却下。

## Risks / Trade-offs

[Risk] **description の語彙選定が不適切だと発見性が改善しない** → Mitigation: 各ツールの description にリソースの正式名・同義語・英語名・実務語を含める具体的な語彙リストをタスクで定義する。レビューで語彙の網羅性を確認する。

[Risk] **`.describe()` の追加で JSON Schema のサイズが増加し、クライアントの初期化が遅くなる** → Mitigation: `.describe()` は短い説明文のみ（10〜30 文字程度）。19 ツール合計でも数 KB の増加であり、HTTP レスポンスサイズへの影響は無視できる。

[Risk] **既存テストの description 文字列に依存するテストがある場合に壊れる** → Mitigation: 既存テストを全文検索した結果、description の文字列に依存するテストは存在しない（inputSchema の properties / enum / type のみを検証している）。

[Trade-off] **description が長くなる**: 現状の 1 行から 2〜3 行に増える。これはクライアントのトークン消費をわずかに増やすが、発見精度の向上の方がユーザー体験への寄与が大きい。

## Open Questions

なし。変更はメタデータのみであり、設計上の不確実性はない。
