# UI動線改善

## Meta

- **type**: spec-change
- **slug**: ui-flow-improvements
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: UI の動線改善と表示の拡充。アーキテクチャ変更を伴わない → false -->

## 背景

ドメインモデル再構築（Request 1）と承認フロー統合（Request 2）でバックエンドの構造は整ったが、UI の動線にまだ改善すべき点が残っている。

1. 引き合い作成時に新規顧客をその場で登録できない（先に顧客一覧で登録する必要がある）
2. 商談記録の外部参加者が氏名のフリーテキストだけで、顧客担当者（ClientContact）との紐づけがない
3. 案件詳細の商談履歴が引き合い詳細と比べて情報が少ない（場所・参加者数・AI件数・詳細リンクが欠落）
4. 案件の担当者管理（deal_contacts）の UI がない

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/app/(dashboard)/inquiries/new/InquiryForm.tsx:52` — 顧客選択は既存リストからの `Select` のみ。先頭に `<option value="">未定</option>` あり。新規作成の動線なし
- `src/app/(dashboard)/inquiries/new/page.tsx:1-20` — Server Component。`listClients(organizationId)` で顧客一覧を取得し `InquiryForm` に渡す
- `src/app/(dashboard)/inquiries/[id]/meetings/new/MeetingForm.tsx:187-215` — 外部参加者は `string[]`（氏名のフリーテキスト）。部署・役職・メール・電話のフィールドなし。ClientContact との紐づけ機能なし
- `src/app/(dashboard)/deals/[id]/page.tsx:161-202` — 商談履歴セクションあり。DataTable の columns は type(種別), date(日時), summary(概要) のみ。場所・参加者数・AI件数・詳細リンクが欠落
- `src/app/(dashboard)/deals/[id]/page.tsx:34-37` — `meetingRepository.findAllByInquiryOrDeal` で統合取得済み
- `src/app/(dashboard)/inquiries/[id]/page.tsx:161-214` — 引き合い詳細の商談履歴 DataTable は type, date, location, attendees(参加者数), actionItems(AI件数), 詳細リンク を含む
- `src/app/actions/clients.ts:40-43` — `createClientAction` は FormData 経由。別の Action から呼ぶには FormData を組み立てる必要があり不自然
- `src/application/usecases/createClient.ts` — UC 層で `createClient` が独立関数として存在。引き合い作成の UC 内から直接呼べる
- `src/infrastructure/schema.ts` — `deal_contacts` テーブルが定義済み（dealId + contactId + role + unique 制約）
- `src/infrastructure/repositories/dealContactRepository.ts` — create, findByDeal, deleteByDealAndContact が実装済み
- `src/domain/models/deal.ts:11` — `DealContactRole = "key_person" | "decision_maker" | "technical" | "other"`
- `src/app/(dashboard)/labels.ts:1-38` — statusLabels, sourceLabels, meetingTypeLabels, phaseLabels, contractTypeLabels が集約済み
- `src/app/(dashboard)/clients/[id]/page.tsx:131-166` — 案件一覧セクション追加済み
- `src/app/(dashboard)/layout.tsx:25-48` — ナビ順序: 顧客 > 引き合い > 案件 > 申請一覧（修正済み）

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

1. **引き合い作成時の顧客同時登録**: `InquiryForm.tsx` の顧客選択に「新規登録」オプションを追加する。選択すると企業名の入力フィールドが表示される。`createInquiryAction` の中で、新規顧客名が指定されている場合は `createClient` ユースケースを呼び出して顧客を作成し、その `clientId` を引き合いに紐づける。新規顧客の industry/size/address/notes は引き合い作成時には入力しない（後から顧客詳細で編集）
2. **案件詳細の商談履歴を引き合い詳細と同等にする**: `deals/[id]/page.tsx` の商談履歴 DataTable に location(場所)、attendees(参加者数 = internal + external)、actionItems(AI件数)、詳細リンク(`/inquiries/${meeting.inquiryId}/meetings/${meeting.id}` または `/deals/${deal.id}/meetings/${meeting.id}`) の列を追加する
3. **案件担当者（deal_contacts）管理 UI**: `deals/[id]/page.tsx` に「担当者」セクションを追加する。現在の担当者一覧（名前・部署・役職・ロール）を表示する。追加フォーム: 顧客の担当者（ClientContact）をプルダウンで選択し、ロール（キーマン・決裁者・技術担当・その他）を選択して追加する。削除ボタン（確認なし、即時削除）。データ取得は `dealContactRepository.findByDeal` + `clientRepository.findContactsByClientId` を使用する
4. **商談記録時の担当者登録動線**: `MeetingForm.tsx` の外部参加者セクションを拡張する。既存の氏名フリーテキストに加えて、「顧客担当者として登録」チェックボックスを各参加者に追加する。チェックされた参加者は `clientRepository.createContact` で ClientContact として登録する。登録には引き合いまたは案件に紐づく顧客の `clientId` が必要なため、`MeetingForm` に `clientId` を props で渡す
5. **labels.ts に DealContactRole のラベルを追加**: `dealContactRoleLabels = { key_person: "キーマン", decision_maker: "決裁者", technical: "技術担当", other: "その他" }` を追加する
6. **シードデータの確認と修正**: `deal_contacts` のシードデータが存在しない場合は追加する（最低2件: 1つの案件に key_person と technical のロールで担当者を紐づける）

## スコープ外

- 顧客の編集・削除 UI
- 引き合いの編集 UI
- 担当者の編集・削除 UI（deal_contacts の削除は含む）
- 商談の削除
- ページネーション・検索・ソート
- レスポンシブデザイン対応

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] 引き合い作成フォームで「新規登録」を選択すると企業名入力フィールドが表示される
- [ ] 新規顧客名を入力して引き合いを作成すると、顧客と引き合いが同時に作成される
- [ ] 案件詳細の商談履歴に場所・参加者数・AI件数・詳細リンクが表示される
- [ ] 案件詳細に「担当者」セクションが表示される
- [ ] 担当者セクションから ClientContact を選択してロールを指定して追加できる
- [ ] 担当者セクションから担当者を削除できる
- [ ] labels.ts に `dealContactRoleLabels` が定義されている
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **引き合い作成の Server Action 内で createClient UC を呼ぶを採用、別画面でモーダルで顧客登録を却下** — モーダルは状態管理が複雑になり、サーバーコンポーネント中心の設計と合わない。Action 内で UC を呼ぶのは依存方向に違反しない（actions → usecases）
2. **担当者登録を商談記録のチェックボックスで行うを採用、独立した担当者登録フォームを却下** — 担当者は商談で判明していくもの。商談記録のフローの中で登録できるのが自然。独立フォームは別途作ってもよいが、まずは商談起点の動線を優先する
3. **deal_contacts の削除に確認ダイアログを不要とするを採用** — 削除は即座に反映されるが、再追加も容易。確認ダイアログの実装コストに見合わない
