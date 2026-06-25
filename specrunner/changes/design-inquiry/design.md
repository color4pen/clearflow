# Design: 引合画面のデザイン適用

## Context

引合一覧・詳細画面のレイアウトを Claude Design（`docs/design/screens/inquiry.md`）に合わせて更新する。

### 現状

- **一覧ページ** (`inquiries/page.tsx`): `PageToolbar` + `DataTable` の Server Component。ステータスフィルタは URL `?status=` の Link ベース。カラム順: ステータス → 件名 → 顧客名 → 流入経路 → 作成日。検索・経路フィルタなし。
- **詳細ページ** (`inquiries/[id]/page.tsx`): 縦積み `SectionCard` レイアウト。`InquiryInfoSection`（フォーム形式、顧客セクション統合）、`InquiryActions`（ステータス操作）、`DeleteInquiryButton`。商談記録なし（`MeetingTable.tsx` は存在するが未使用）。
- **データ型**: `InquiryWithClient` = `Inquiry & { clientName }` — `dealId` フィールドなし。
- **Meeting 基盤**: `meetingRepository.findAllByInquiry(inquiryId, orgId)` で引合紐づき商談取得可能。`createMeeting` / `createMeetingAction` は `inquiryId` 単独での商談作成に対応済み。
- **承認待ち検出**: `requestRepository.findByOriginTriggerEntity(orgId, "inquiry.convert", inquiryId)` で pending の承認リクエスト存在をチェック可能。

### 制約

- `listInquiries` の返却型（`InquiryWithClient`）は変更しない（スコープ外）。
- ビジネスロジック変更なし。
- 引合向け商談ルート（`/inquiries/[id]/meetings/new` 等）の新設はスコープ外。
- 引合登録フォーム（`InquiryForm.tsx`）のデザイン変更はスコープ外。

## Goals / Non-Goals

**Goals**:

- 一覧のカラム順・フィルタ UI・ステータスバッジをデザインに合わせる
- 詳細を 2 カラムレイアウトに変更し、左に基本情報・顧客・操作、右に商談記録を配置する
- 承認待ち / 案件化済みのステータスバナーを表示する
- パンくずとタイトル横ステータスバッジを追加する

**Non-Goals**:

- `listInquiries` 返却型の変更
- サーバーサイド検索 API の新設
- 引合向け商談作成ルートの新設
- 引合登録フォームのデザイン変更

## Decisions

### D1: 一覧の converted 行の dealId 取得方法

一覧ページの Server Component 内で `dealRepository.findAllByOrganization(organizationId)` を呼び出し、`inquiryId` → `dealId` のマッピングを構築する。`listInquiries` の返却型は変更しない。

**Rationale**: `InquiryWithClient` 型変更はスコープ外と明示されている。一覧ページは Server Component であり、deals の別途取得はサーバーサイドで完結する。deals テーブルは `inquiryId` を持つため、全件取得後にクライアント側で Map を構築すればよい。

**Alternative considered**: `findAllWithClientByOrganization` に deals LEFT JOIN を追加する → 返却型変更がスコープ外のため却下。

### D2: フィルタ UI のアーキテクチャ（Client Component 分離）

フィルタバー（ステータスタブ + 経路ドロップダウン + 検索入力）を `InquiryFilterBar` Client Component として分離する。一覧データは Server Component が全件取得し、props で Client Component に渡す。フィルタリングは `useState` + `useMemo` でクライアントサイドで行う。

**Rationale**: 既存の `listInquiries` がフィルタパラメータを受け付けないため、サーバーサイドフィルタは新設が必要でスコープ外。全件取得 + クライアントフィルタは既存データ量で十分実用的。

**Alternative considered**: URL search params ベースのサーバーサイドフィルタ → ユースケース・リポジトリ変更が必要になりスコープ外。

### D3: 基本情報表示の読み取り専用化

現在の `InquiryInfoSection`（フォーム形式）を、ラベル + 値のグリッド表示に変更する。`90px` 幅のラベル列 + `1fr` 値列の `display: grid` レイアウト。値をクリック / 編集ボタンでインライン編集モードに切り替える。

**Rationale**: デザインに合わせた変更。architect 評価済み判断（D1）。

**Implementation detail**: 既存の `InquiryInfoSection` を新しい `InquiryInfoDisplay` コンポーネントに置き換える。編集機能は「編集」ボタンで既存の `InquiryInfoSection`（フォーム）に切り替える形で維持する。

**Alternative considered**: フォーム形式を維持 → デザインと乖離するため却下（architect 却下済み）。

### D4: 顧客セクションの独立化

現在 `InquiryInfoSection` 内に統合されている顧客表示を、独立した `InquiryCustomerSection` として分離する。顧客が設定済みの場合はリンク表示、未設定の場合はエラーメッセージ + 選択ボタン。

**Rationale**: デザインが基本情報と顧客を独立セクションとして定義している。

### D5: 商談追加ボタンの遷移先

引合詳細の右カラムに「+ 商談を追加」ボタンを配置する。案件化済み（deal あり）の場合は `/deals/[dealId]/meetings/new` にリンクする。案件未作成の場合はボタンを無効化し、ツールチップ等で案件化が必要な旨を表示する。

**Rationale**: 既存の商談作成フォーム（`/deals/[dealId]/meetings/new`）は `dealId` を URL パラメータとして要求し、`DealMeetingForm` も `dealId` を必須 prop とする。引合専用の商談作成ルート新設はスコープ外。`createMeeting` ユースケースは `inquiryId` 単独対応済みだが、UI ルートが存在しない。

**Known limitation**: `status=new` の引合に対して商談追加ができない。引合フェーズでのヒアリング記録には、将来的に `/inquiries/[id]/meetings/new` の新設が必要。

**Alternative considered**: 既存フォームに `inquiryId` クエリパラメータを追加 → DealMeetingForm ページが `dealId` を必須とする設計のため、軽微な改修では済まず、スコープ外。

### D6: 商談行のリンク先

商談リスト内の各行について、`dealId` を持つ商談は `/deals/[dealId]/meetings/[meetingId]` にリンクする。`dealId` がない商談（引合フェーズのみ）はリンクなし（クリック不可）。

**Rationale**: 現在のルーティングでは商談詳細は `deals/[dealId]/meetings/[meetingId]` のみ。引合単独の商談詳細ルートはスコープ外。

### D7: 一覧ページのコンポーネント構成

一覧ページを以下のように再構成する:
- `page.tsx` (Server Component): データ取得 + deals マッピング構築 + props 渡し
- `InquiryListView.tsx` (Client Component): フィルタ + テーブル描画を担当。`"use client"` ディレクティブ

テーブルは既存の `DataTable` を使わず、要件固有のグリッドレイアウト（`grid-template-columns: 1.7fr 1fr 110px 160px 110px`）で直接実装する。

**Rationale**: `DataTable` は `<table>` ベースで `grid-template-columns` 指定に対応していない。カスタムスタイリング（ステータスバッジ、deal リンク、mono 日付）の要件が多く、汎用テーブルより専用実装のほうが見通しがよい。

## Risks / Trade-offs

**[Risk] クライアントサイドフィルタのパフォーマンス** → 引合件数が数百件程度であれば問題ない。`useMemo` + `debounce`（検索入力）で対応。数千件規模になった場合はサーバーサイド検索への移行が必要。

**[Risk] 詳細ページのデータ取得増加** → 商談リスト（`meetingRepository.findAllByInquiry`）と承認リクエストチェック（`requestRepository.findByOriginTriggerEntity`）の 2 つの追加クエリが発生する。`Promise.all` で既存クエリと並列実行し、レイテンシ影響を最小化する。

**[Risk] `status=new` の引合で商談追加不可** → デザインは引合フェーズでの商談記録を想定しているが、本スコープでは商談作成ルートが未対応。将来リクエストで対応する。

**[Trade-off] `DataTable` 不使用** → 一覧テーブルを直接実装するため、`DataTable` の行クリック・ストライプ等の汎用機能を再実装する必要がある。ただし要件固有のスタイリングが多いため、汎用コンポーネントへの無理な適合より保守性が高い。

## Open Questions

なし（request-review の指摘は本設計で解決済み）。
