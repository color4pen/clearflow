# Design: 契約・請求画面のデザイン適用

## Context

Claude Design（`docs/design/Clearflow.dc.html`）で定義された CONTRACTS LIST / CONTRACT DETAIL / INVOICE DETAIL セクションのデザインと、現行の契約・請求画面には差分がある。

**契約一覧（現状）**: 5 カラム（契約名, 顧客名, 契約種別, 金額, ステータス）。案件名・期間カラムなし。行ハイライト機能なし。

**契約詳細（現状）**: `grid-cols-2`（均等 2 カラム）。左に契約情報フォーム + ステータス表示、右に関連情報（案件・顧客リンク）。ステータス変更は別 SectionCard。請求セクションは 2 カラムの外、下段に独立配置。請求サマリは grid-cols-3 の数値ブロック。

**請求詳細（現状）**: `grid-cols-2`（均等 2 カラム）。左に請求情報 dl、右に関連情報 + ステータス操作。全幅表示。パンくずは「契約一覧 > 契約詳細 > 請求詳細」。

**一覧の型**: `ContractWithClient`（`Contract & { clientName: string }`）。dealId は持っているが案件名（dealTitle）を持たない。

**DataTable コンポーネント**: `rowClass` prop で行ごとの CSS クラスを動的に適用可能。

## Goals / Non-Goals

**Goals**:

- 契約一覧を 7 カラム（契約名, 顧客名, 案件名, 契約種別, 金額, 期間, ステータス）に拡張し、終了日 30 日以内の行をハイライト
- 契約詳細を 2 カラム（左 1.5fr / 右 1fr）に再構成。左に基本情報 + ステータス操作 + リンク、右に請求リスト + サマリ + 請求作成
- 請求詳細を max-width 560px の狭幅センタリングレイアウトに変更
- 承認待ちバナー表示（承認フロー該当時）

**Non-Goals**:

- 契約・請求の登録フォームのデザイン変更
- ビジネスロジックの変更
- DB スキーマの変更

## Decisions

### D1: ContractWithClient 型に dealTitle を追加

契約一覧で案件名カラムを表示するため、`ContractWithClient` 型に `dealTitle: string` フィールドを追加する。repository の `findAllByOrganization` クエリで deals テーブルを JOIN して取得する。

- **Rationale**: contracts テーブルには `dealId` FK が必須カラムとして存在するため、deals テーブルとの JOIN は確実。新規カラム追加や migration 不要。
- **Alternatives considered**: 別途 deal を個別取得 → N+1 になるため却下。

### D2: 終了日 30 日以内のハイライトは DataTable の rowClass で実装

DataTable は既に `rowClass` prop をサポートしている。契約一覧ページで `rowClass` に「endDate が今日から 30 日以内の場合にハイライトクラスを返す」関数を渡す。ハイライト色は Tailwind の `bg-warning/10`（薄い警告色）を使用する。

- **Rationale**: DataTable 側の変更不要。表示ロジックをページコンポーネントに閉じ込められる。
- **Alternatives considered**: DataTable にハイライト機能を組み込む → 汎用コンポーネントに特定ドメインロジックが入るため却下。

### D3: 契約詳細の 2 カラム構成を grid-cols-[1.5fr_1fr] で実現

現在の均等 `grid-cols-2` を `grid-cols-[3fr_2fr]`（≒1.5fr:1fr）に変更。左カラムに基本情報（ContractInfoSection）+ ステータス操作（ContractStatusActions）+ リンク（案件・顧客）を統合。右カラムに InvoiceSection（請求リスト + サマリ + 請求作成ボタン）を配置。

- **Rationale**: デザイン仕様の 1.5fr:1fr 比率に従う。Tailwind の arbitrary grid で対応可能。
- **Alternatives considered**: CSS Grid の名前付きエリア → Tailwind との親和性が低いため却下。

### D4: 請求サマリのプログレスバーは単発契約（one_time）のみ表示

InvoiceSection の既存サマリ（grid-cols-3 の数値ブロック）をプログレスバー風のスタック表示に置き換える。単発契約（`renewalType === "one_time"`）の場合のみ、契約金額を母数として「入金済 / 請求済 / 残り」をバー表示する。定期契約はサマリ数値のみ表示。

- **Rationale**: 定期契約は契約金額が期間分の累計を表さないため、プログレスバーが意味をなさない。
- **Alternatives considered**: 全契約タイプにバー表示 → 定期契約での母数が不明確なため却下。

### D5: 請求詳細を 1 カラム・max-width 560px に変更

現在の grid-cols-2 レイアウトを廃止し、`max-w-[560px] mx-auto` の 1 カラムレイアウトに変更。dl の各行を `grid grid-cols-[90px_1fr]` に統一。ステータス操作ボタンは情報セクションの下に配置。

- **Rationale**: 請求詳細は情報量が少なく、2 カラムだと右側がスカスカになる。560px に制限することで読みやすさを確保（architect 評価済み）。
- **Alternatives considered**: 現行 2 カラム維持 → 右カラムの情報量が少なく不均衡なため却下。

### D6: 承認待ちバナーは既存の承認フロー連携から取得

契約に紐づく承認リクエスト（`originTriggerEntityId` で紐付き、status が `pending`）が存在する場合、契約詳細ページの上部にバナーを表示する。バナーはインフォメーション的なスタイル（`bg-warning/10 border-warning`）。

- **Rationale**: 既存の Request モデルに originTriggerEntityId があり、追加の DB 変更なしで実現可能。
- **Alternatives considered**: Contract モデルに approvalStatus を追加 → ビジネスロジック変更がスコープ外のため却下。

### D7: InvoiceSection に contractAmount と renewalType を渡す

プログレスバー表示のため、InvoiceSection コンポーネントに `contractAmount` と `renewalType` props を追加する。親の ContractDetailPage から渡す。

- **Rationale**: InvoiceSection は現在 contractId 経由で自前で invoice データを取得しているが、contract の金額情報は持っていない。親から props で渡すのが最小変更。
- **Alternatives considered**: InvoiceSection 内で contract を再取得 → 親で既に取得済みのデータの重複取得になるため却下。

## Risks / Trade-offs

**[Risk]** 案件名の JOIN 追加により一覧クエリが若干遅くなる可能性  
→ **Mitigation**: deals テーブルとの INNER JOIN は契約テーブルの dealId が NOT NULL なため確実。インデックスも FK 制約で存在。データ量がこの SaaS の想定規模では問題にならない。

**[Risk]** プログレスバーの母数（契約金額）と請求合計が一致しない場合の表示  
→ **Mitigation**: 請求合計 > 契約金額の場合はバーを 100% 表示（溢れない）。不一致はビジネス上許容される（部分請求など）。

**[Risk]** 承認待ちバナー表示のための追加クエリ  
→ **Mitigation**: requestRepository の既存メソッドで検索可能。表示は optional なので取得失敗時はバナー非表示で degradation。

## Open Questions

（なし）
