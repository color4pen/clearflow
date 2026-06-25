# Design: design-deal

## Context

案件一覧・詳細画面を Claude Design の DEALS LIST / DEAL DETAIL セクションに合わせて更新する。

現状:
- **一覧**: フェーズタブ（Link ベース）でフィルタリング。5 カラム DataTable（フェーズ, 案件名, 顧客名, 想定金額, 担当者）。パイプラインサマリなし
- **詳細**: `grid-cols-2`（50:50）。DealInfoSection がフォーム形式で phase は select ドロップダウン。担当者は 4 カラムテーブル。契約セクションにデザイン指定の緑ヘッダーなし。商談記録はグリッド外の下部に配置。DealPhaseActions コンポーネントが存在するが未使用
- **モデル**: `Deal` 型に `expectedCloseDate` フィールドは存在しない

## Goals / Non-Goals

**Goals**:
- 一覧にパイプラインサマリ（6 カラム: 5 フェーズ + 合計）を追加する
- フィルタリングを 3 つの select ドロップダウン（フェーズ / 顧客 / 契約形態）に変更する
- 一覧テーブルカラムをデザインに合わせる（案件名, 顧客名, フェーズ, 契約形態, 想定金額）
- 詳細のレイアウトを 1.5fr:1fr / gap 24px に変更し、セクション配置をデザインに合わせる
- 基本情報を読み取り表示にし、編集ボタンでフォームモードに切り替える
- フェーズ変更を独立したボタン群セクションにする
- 担当者セクションを名前 + 役割の flex レイアウトに簡素化する
- 契約セクションのヘッダーに緑背景を適用する
- 商談記録を左カラムに移動する

**Non-Goals**:
- 案件登録フォームのデザイン変更
- ビジネスロジック・ユースケースの変更
- レスポンシブ対応
- DataTable コンポーネント自体のリファクタリング（既存 table 要素ベースを維持）
- `expectedCloseDate` フィールドの追加（モデルに存在しないため受注見込みカラムは省略）

## Decisions

### D1: 一覧のパイプラインサマリはダッシュボードと同一パターンを再利用する

SalesDashboard で使用されている `getPipelineSummary` usecase をそのまま呼び出す。レンダリングはダッシュボードの `grid-cols-6` パターンを踏襲し、セルクリックで `?phase=` パラメータを適用する。

**Rationale**: ダッシュボードと同じ usecase・同じスタイルを使うことで一貫性を保ち、新規コードを最小化する。
**Alternatives considered**: 専用の usecase を作る → `listDeals` と `getPipelineSummary` でデータ取得が重複するが、`getPipelineSummary` が内部で `listDeals` を呼ぶ構造のため、サマリ取得時に全案件も得られる。一覧ページでは `getPipelineSummary` のみ呼び出し、返却される `deals` をフィルタに利用することでクエリを 1 回に抑える。

### D2: フィルタは URL searchParams ベースの Server Component で実装する

3 つの select ドロップダウン（フェーズ / 顧客 / 契約形態）は `searchParams` で URL に反映する。フィルタ変更時は `router.push` で URL を更新し、Server Component で再レンダリングする。既存のフェーズタブが `searchParams` ベースのため、自然な拡張となる。

**Rationale**: 現在のフェーズタブが `?phase=` の Link ベースであるため、同じパターンに `?client=` と `?contractType=` を追加する。ブックマーク可能でブラウザバックとも整合する。
**Alternatives considered**: Client-side state でフィルタ → SSR の利点を失い、データ取得ロジックが複雑化する。

フィルタ UI は Client Component（`DealsFilter`）として分離する。select の onChange で `router.push` を呼び、Server Component 側で searchParams からフィルタを適用する。

### D3: DealInfoSection を表示/編集の 2 モード化する

`useState` の `isEditing` フラグで切り替える。表示モードは 90px ラベル + 1fr 値のグリッド（読み取り専用）。編集ボタンクリックでセクション全体がフォームに切り替わる。キャンセルボタンで表示モードに戻る。

**Rationale**: request.md で「クリックで編集のインライン方式ではなく、セクション全体をフォームに切り替える」と明記されている。現在の DealInfoSection のフォーム部分を編集モードとして残し、表示モードを新規追加する構成で既存コードの再利用度が高い。
**Alternatives considered**: モーダル編集 → デザインに記載なく、コンテキスト切り替えが大きい。フィールド単位インライン編集 → request.md で明示的に却下。

### D4: フェーズ変更は DealPhaseActions コンポーネントを改修して使用する

既存の DealPhaseActions は「現在フェーズ以外の全フェーズを遷移先ボタンとして表示」する設計。デザインでは「全フェーズをボタン表示し、現在フェーズをハイライト」する方式。DealPhaseActions を改修し、全非終端フェーズを表示 + 現在フェーズのハイライト表示にする。受注/失注ボタンはヘッダーに移動するため、DealPhaseActions からは除外する。

**Rationale**: 既存コンポーネントを活用し、変更を最小化する。受注/失注の確認ダイアログは既存の `updateDealPhaseAction` を呼ぶヘッダーボタンで再利用する。
**Alternatives considered**: DealPhaseActions を廃止して新コンポーネント → 既存ロジックの無駄な再実装。

### D5: 詳細ページのセクション配置をデザインに合わせて再構成する

デザインに従い、2 カラムグリッド内にセクションを配置する:
- **左カラム**: 基本情報（読み取り）→ 関連リンク → フェーズ変更ボタン群 → 商談記録
- **右カラム**: 契約（緑ヘッダー）→ 担当者（flex レイアウト）→ アクションアイテム

ヘッダーには パンくず + タイトル + サブテキスト + 受注/失注ボタン を配置する。備考（DealNotesSection）はグリッド外の下部に維持する。

**Rationale**: デザインに忠実に従う。商談記録の左カラム移動と契約の右カラム維持がデザインの主な変更点。
**Alternatives considered**: 現在の配置を維持 → デザインと乖離する。

### D6: 受注見込みカラムは省略する

Deal モデルに `expectedCloseDate` フィールドが存在しないことを確認済み。request.md の「存在しなければカラムを省略する」方針に従い、受注見込みカラムは実装しない。

**Rationale**: モデル変更はスコープ外（ビジネスロジックの変更に該当）。
**Alternatives considered**: `expectedCloseDate` をモデルに追加 → スコープ外。

## Risks / Trade-offs

- [Risk] getPipelineSummary が listDeals を内部で呼ぶため、一覧ページの初期表示で全案件を 2 回取得する可能性 → Mitigation: `getPipelineSummary` の返却値 `{ summary, deals }` から deals を直接使用し、`listDeals` の個別呼び出しを削除する
- [Risk] DealInfoSection の 2 モード化で、表示モードと編集モードのフィールドの不整合が発生しうる → Mitigation: 表示モードと編集モードで同じフィールドリスト（title, phase, estimatedAmount, dates, contractType）を使用する
- [Risk] フィルタの顧客/契約形態の選択肢生成に全案件データが必要 → Mitigation: `getPipelineSummary` で取得済みの deals から一意な値を抽出する

## Open Questions

（なし — 設計判断はすべて request.md の実装方針で解決済み）
