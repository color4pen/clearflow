# Tasks: 引合画面のデザイン適用

## T-01: InquiryStatusBadge 共通コンポーネントの作成

一覧・詳細の両方で使用するステータスバッジコンポーネントを作成する。

- [ ] `src/app/(dashboard)/inquiries/InquiryStatusBadge.tsx` を作成する
- [ ] props: `status: InquiryStatus` を受け取る
- [ ] `statusLabels` を使用してラベルを表示する
- [ ] スタイル: `inline-block`, `padding: 1px 7px`, `border-radius: 3px`, 背景 `#f5f5f5`, ボーダー `1px solid #e0e0e0`
- [ ] Tailwind CSS クラスで実装する（`inline-block px-[7px] py-[1px] rounded-[3px] bg-[#f5f5f5] border border-[#e0e0e0] text-xs`）

**Acceptance Criteria**:
- `InquiryStatusBadge` が `InquiryStatus` の各値（new, converted, declined）に対して正しいラベルとスタイルで描画される

---

## T-02: 一覧ページの InquiryListView Client Component 作成

フィルタ + テーブル描画を担当する Client Component を作成する。

- [ ] `src/app/(dashboard)/inquiries/InquiryListView.tsx` を `"use client"` で作成する
- [ ] Props 型を定義する:
  ```ts
  type InquiryRow = {
    id: string;
    title: string;
    clientName: string | null;
    source: string;
    status: InquiryStatus;
    createdAt: Date;
    dealId: string | null;  // Server Component で構築した dealId マッピング結果
  };
  type Props = {
    inquiries: InquiryRow[];
    sources: Array<{ value: string; label: string }>;
  };
  ```
- [ ] **フィルタ状態管理**: `useState` で以下を管理する
  - `activeTab`: `"all" | "new" | "converted" | "declined"` （デフォルト: `"all"`）
  - `sourceFilter`: `string` （デフォルト: `""`（全て））
  - `searchQuery`: `string` （デフォルト: `""`）
- [ ] **フィルタバー UI**:
  - ステータスタブボタン: 全て / 新規 / 案件化済み / 見送り。アクティブタブにスタイル区別
  - 経路ドロップダウン: `<select>` で「全ての経路」+ `sourceLabels` の各エントリ
  - 検索入力: `<input>` placeholder=「顧客名・件名で検索」、右寄せ配置
- [ ] **フィルタロジック**: `useMemo` で 3 つのフィルタを AND 適用する
  - ステータスタブ: `activeTab === "all"` なら全件、それ以外は `status === activeTab`
  - 経路: `sourceFilter === ""` なら全件、それ以外は `source === sourceFilter`
  - 検索: `searchQuery === ""` なら全件、それ以外は `title` または `clientName` に対して大文字小文字無視の部分一致
- [ ] **テーブル描画**: CSS Grid で直接実装する（`DataTable` は使用しない）
  - ヘッダー行: `grid-template-columns: 1.7fr 1fr 110px 160px 110px`
  - データ行: 同じカラム定義。padding `10px 14px`。ストライプ背景。hover 効果
  - カラム: 件名（`/inquiries/[id]` リンク）、顧客名、経路（`sourceLabels` 変換）、ステータス（`InquiryStatusBadge` + converted 時 `→ 案件` リンク）、登録日（右寄せ `font-mono`）
  - `converted` 行のステータスセル: `InquiryStatusBadge` の横に `<Link href="/deals/[dealId]">→ 案件</Link>` を表示（`dealId` が存在する場合のみ）
- [ ] **フッター**: `{filtered.length} 件` を表示
- [ ] **空状態**: フィルタ結果が 0 件の場合「該当する引合はありません」を表示

**Acceptance Criteria**:
- ステータスタブ切り替えでリストがフィルタされる
- 経路ドロップダウンでリストがフィルタされる
- 検索入力で件名・顧客名が部分一致フィルタされる
- 3 フィルタが AND 条件で動作する
- カラム順が 件名, 顧客名, 経路, ステータス, 登録日
- converted 行にステータスバッジ + 「→ 案件」リンクが表示される
- 登録日が右寄せ mono で表示される

---

## T-03: 一覧ページ (page.tsx) のリファクタリング

Server Component としてデータ取得と InquiryListView への props 渡しを行う。

- [ ] `src/app/(dashboard)/inquiries/page.tsx` を修正する
- [ ] `dealRepository` を import し、`dealRepository.findAllByOrganization(organizationId)` で全 deals を取得する（`Promise.all` で `listInquiries` と並列実行）
- [ ] `inquiryId` → `dealId` の `Map` を構築する: `deals.filter(d => d.inquiryId).reduce(...)` で `Map<string, string>` を作成
- [ ] `allInquiries` を `InquiryRow[]` 型にマッピングする: 各 inquiry に `dealId: dealMap.get(inquiry.id) ?? null` を追加
- [ ] `sourceLabels` を `{ value, label }[]` 配列に変換して props として渡す
- [ ] `PageToolbar` の title を維持し、フィルタ表示部分は削除する（`InquiryListView` 内に移動するため）
- [ ] `InquiryListView` を描画し、`inquiries` と `sources` を props で渡す
- [ ] 既存のフィルタロジック（`searchParams.status`、`filterLinkClass`、各 count）を削除する
- [ ] `Date` オブジェクトはシリアライゼーション境界を超えられないため、`createdAt` を `string`（`toISOString()`）に変換して渡し、Client Component 側で表示フォーマットする

**Acceptance Criteria**:
- ページが Server Component として動作する
- deals の取得が `listInquiries` と並列で行われる
- `InquiryListView` に正しい props が渡される
- `typecheck` が通る

---

## T-04: InquiryStatusBanner コンポーネントの作成

詳細ページ用のステータスバナーコンポーネントを作成する。

- [ ] `src/app/(dashboard)/inquiries/[id]/InquiryStatusBanner.tsx` を作成する（Server Component）
- [ ] Props 型:
  ```ts
  type Props = {
    status: InquiryStatus;
    dealId: string | null;
    dealTitle: string | null;
    hasPendingApproval: boolean;
  };
  ```
- [ ] **承認待ちバナー**: `status === "new" && hasPendingApproval` の場合に表示
  - テキスト: 「案件化の承認待ちです」
  - スタイル: 背景 `#eef5fb`（bg-info）、左ボーダー 3px `#2980b9`（primary）、padding、text-sm
- [ ] **案件化済みバナー**: `status === "converted" && dealId` の場合に表示
  - テキスト: 「案件化済み」+ 案件名リンク
  - スタイル: 背景 `#eef7f1`（bg-success-light）、左ボーダー 3px `#cde6d8`（border-success-light）
  - `/deals/[dealId]` へのリンクを含む
- [ ] 条件に該当しない場合は `null` を返す

**Acceptance Criteria**:
- 承認待ちの場合に青いバナーが表示される
- 案件化済みの場合に緑バナー + 案件リンクが表示される
- どちらにも該当しない場合はバナーなし

---

## T-05: InquiryInfoDisplay コンポーネントの作成

基本情報の読み取り表示コンポーネントを作成する。

- [ ] `src/app/(dashboard)/inquiries/[id]/InquiryInfoDisplay.tsx` を `"use client"` で作成する
- [ ] Props 型:
  ```ts
  type Props = {
    inquiry: {
      id: string;
      title: string;
      source: string;
      description: string | null;
      clientId: string | null;
      assigneeId: string | null;
      status: string;
    };
    editable: boolean;
    clients: Array<{ id: string; name: string }>;
    clientName: string | null;
    clientLinkId: string | null;
  };
  ```
- [ ] **表示モード**（デフォルト）: ラベル + 値のグリッドレイアウト（`grid-template-columns: 90px 1fr`）
  - 件名: テキスト表示
  - 経路: `sourceLabels` 変換表示
  - 内容: テキスト表示（Markdown の場合はそのまま plain text）
  - 作成日は `page.tsx` 側で表示する（InquiryInfoDisplay のスコープ外）
- [ ] **編集ボタン**: `editable === true` の場合にヘッダー右に「編集」ボタンを表示
- [ ] **編集モード**: ボタンクリックで `useState` を切り替え、既存の `InquiryInfoSection`（フォーム）を表示する
  - `InquiryInfoSection` は既存コンポーネントをそのまま利用する。ただし顧客セクションは独立化するため、`InquiryInfoSection` からは顧客関連 UI を削除する
- [ ] 表示モードに戻る手段を提供する（「キャンセル」ボタン or フォーム保存後に自動切替）

**Acceptance Criteria**:
- デフォルトでラベル + 値のグリッド読み取り表示になる
- 「編集」ボタンでフォーム表示に切り替わる
- グリッドのラベル幅が 90px

---

## T-06: InquiryCustomerSection コンポーネントの作成

顧客セクションを独立コンポーネントとして作成する。

- [ ] `src/app/(dashboard)/inquiries/[id]/InquiryCustomerSection.tsx` を `"use client"` で作成する
- [ ] Props 型:
  ```ts
  type Props = {
    inquiryId: string;
    clientId: string | null;
    clientName: string | null;
    clientLinkId: string | null;
    clients: Array<{ id: string; name: string }>;
    editable: boolean;
  };
  ```
- [ ] **顧客設定済み**: 顧客名を `/clients/[clientLinkId]` へのリンクとして表示
- [ ] **顧客未設定 + 編集可能**: 「顧客が設定されていません」のエラーメッセージ + 顧客選択 `<select>` + 保存ボタン
  - 顧客選択は既存の `InquiryInfoSection` 内のロジック（既存顧客選択 / 新規作成）を移植する
  - 保存は `updateInquiryAction` を使用する
- [ ] **顧客未設定 + 編集不可**: 「顧客が設定されていません」のメッセージのみ
- [ ] セクションヘッダー: 「顧客」

**Acceptance Criteria**:
- 顧客設定済みで顧客名リンクが表示される
- 顧客未設定で選択 UI またはエラーメッセージが表示される
- 顧客セクションが基本情報セクションと独立している

---

## T-07: InquiryInfoSection の修正（顧客 UI の除去）

既存の `InquiryInfoSection` から顧客関連 UI を削除する（T-06 で独立化したため）。

- [ ] `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx` を修正する
- [ ] 顧客セクション（`<dt>顧客</dt>` の `<div>` ブロック全体）を削除する
- [ ] `clientMode` state と関連ロジックを削除する
- [ ] Props 型から `clients`, `clientName`, `clientLinkId` を削除する（不要になるため）
- [ ] **注意**: `InquiryInfoDisplay` の編集モードから呼び出されるため、フォーム機能自体は維持する

**Acceptance Criteria**:
- `InquiryInfoSection` が顧客関連 UI を含まない
- フォームの件名、経路、内容の編集機能が維持される
- `typecheck` が通る

---

## T-08: 詳細ページの商談記録セクション

引合に紐づく商談一覧と追加ボタンを右カラムに表示する。

- [ ] `src/app/(dashboard)/inquiries/[id]/InquiryMeetingSection.tsx` を作成する（Server-friendly, props 受け取り）
- [ ] Props 型:
  ```ts
  type MeetingRow = {
    id: string;
    type: string;
    date: Date;
    summary: string | null;
    dealId: string | null;
  };
  type Props = {
    meetings: MeetingRow[];
    dealId: string | null;
    dealMeetingNewPath: string | null; // deal がある場合は "/deals/[dealId]/meetings/new"
  };
  ```
- [ ] セクションヘッダー: 「商談記録」+ 右に「+ 商談を追加」ボタン
  - `dealMeetingNewPath` が存在する場合: `<Link>` として表示
  - `dealMeetingNewPath` が null の場合: disabled 表示（`cursor-not-allowed`, `text-text-disabled`）
- [ ] 商談リスト: 各行に 種別（`meetingTypeLabels` 変換）+ 日時 + 要旨 を表示
  - `dealId` が存在する行: `/deals/[dealId]/meetings/[meetingId]` へのリンク
  - `dealId` が null の行: リンクなし
  - 要旨は 40 文字を超える場合に切り詰め
- [ ] 空状態: 商談が 0 件の場合「商談記録がありません」を表示

**Acceptance Criteria**:
- 引合に紐づく商談がリスト表示される
- 追加ボタンが表示される（deal がある場合はリンク、ない場合は disabled）
- 商談行の dealId 有無でリンク/非リンクが切り替わる

---

## T-09: 詳細ページ (page.tsx) の 2 カラムレイアウト化

詳細ページを 2 カラムグリッドに再構成する。

- [ ] `src/app/(dashboard)/inquiries/[id]/page.tsx` を修正する
- [ ] **追加 import**:
  - `meetingRepository` — 商談取得用
  - `requestRepository` — 承認待ち検出用
  - `InquiryStatusBadge` (T-01)
  - `InquiryStatusBanner` (T-04)
  - `InquiryInfoDisplay` (T-05)
  - `InquiryCustomerSection` (T-06)
  - `InquiryMeetingSection` (T-08)
- [ ] **データ取得追加**: 既存の `Promise.all` に以下を追加する
  - `meetingRepository.findAllByInquiry(id, organizationId)` — 引合紐づき商談
  - `requestRepository.findByOriginTriggerEntity(organizationId, "inquiry.convert", id)` — 承認待ちチェック
- [ ] **パンくず**: ヘッダー部分を変更する
  - 「引合一覧」（`/inquiries` リンク）+ 「/」+ 引合タイトル のパンくず表示
  - タイトルの横に `InquiryStatusBadge` を表示
- [ ] **ステータスバナー**: パンくず下に `InquiryStatusBanner` を配置する
  - `hasPendingApproval`: `pendingRequest !== null` で判定
- [ ] **2 カラムグリッド**: `<div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>` で左右を配置
  - 左カラム:
    1. `InquiryInfoDisplay` — 基本情報の読み取り表示 + 編集切替
    2. `InquiryCustomerSection` — 顧客セクション
    3. 操作セクション（既存の `InquiryActions` + `DeleteInquiryButton` を `SectionCard` 内に配置）
  - 右カラム:
    1. `InquiryMeetingSection` — 商談記録
- [ ] 既存の縦積み `SectionCard` レイアウトを削除する
- [ ] `InquiryInfoSection` の呼び出しを `InquiryInfoDisplay` に置き換える
- [ ] Props の調整: `InquiryInfoDisplay` と `InquiryCustomerSection` に既存 props を分配する

**Acceptance Criteria**:
- 詳細ページが 2 カラムグリッド（1.5fr 1fr、gap 24px）で表示される
- 左カラムに基本情報・顧客・操作の 3 セクション
- 右カラムに商談記録セクション
- パンくず「引合一覧 / {引合名}」が表示される
- タイトル横にステータスバッジが表示される
- 承認待ち時に青バナー、案件化済み時に緑バナーが表示される
- `typecheck` が通る

---

## T-10: InquiryInfoSection の props 修正（呼び出し元の更新）

T-07 で `InquiryInfoSection` の props から顧客関連を削除したため、T-05 の `InquiryInfoDisplay` 内での呼び出しを整合させる。

- [ ] `InquiryInfoDisplay.tsx` 内で `InquiryInfoSection` を import し、編集モード時に描画する
- [ ] `InquiryInfoSection` に渡す props から `clients`, `clientName`, `clientLinkId` を削除する
- [ ] 保存成功時に `InquiryInfoDisplay` の表示モードに戻すコールバックを実装する

**Acceptance Criteria**:
- 編集モード ↔ 表示モードの切り替えが正常に動作する
- `InquiryInfoSection` の props が T-07 の修正後の型と一致する
- `typecheck` が通る

---

## T-11: テスト・型チェックの確認と修正

全変更後にビルドとテストを通す。

- [ ] `bun run build` を実行し、型エラーを修正する
- [ ] 既存テスト（`bun test`）を実行し、失敗するテストを修正する
- [ ] `bun run lint` を実行し、lint エラーを修正する
- [ ] 特に以下の点を確認する:
  - `InquiryInfoSection` の props 変更により、呼び出し元で型エラーが発生していないか
  - `Date` のシリアライゼーション（Server → Client コンポーネント境界）が正しく処理されているか
  - 新規コンポーネントの import パスが正しいか

**Acceptance Criteria**:
- `typecheck && test` が green
- `lint` が green
- ビルドが成功する
