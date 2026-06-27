# タスク紐づけ先の検索選択モーダル（案件・引合・会議）

## Meta

- **type**: new-feature
- **slug**: task-link-picker-modal
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 再利用可能なエンティティ選択ピッカーという新 UI パターンの追加と、アクションアイテムの紐づけを「単一紐づけ（選択した種別の FK のみ保持し他をクリア）」に変える振る舞い変更を含むため true -->

## 背景

タスク（アクションアイテム）の紐づけ先選択が貧弱。グローバルなタスク一覧（TaskList）の新規作成モーダルは案件・引合を全件 `<select>` プルダウンで出すだけで、件数が増えると探せず、会議は選べない。編集モーダル（ActionItemModal）には紐づけ先欄が一切無い。案件・引合・会議をサーバー検索で絞り込んで1件選べるピッカーモーダルを新設し、タスクの新規・編集の双方で使えるようにして、既存のプルダウンを置き換える。

## 現状コードの前提

- src/app/(dashboard)/tasks/TaskList.tsx — 新規作成モーダルで案件(dealId)・引合(inquiryId)を `dealOptions`/`inquiryOptions` 全件の `<select>` で選択。会議の紐づけは無い
- src/app/(dashboard)/components/ActionItemModal.tsx — 内容・担当者・期日のみ。紐づけ先の欄が無い
- src/app/actions/actionItems.ts — createActionItemAction:38 / updateActionItemAction:189 は meetingId/dealId/inquiryId を zod 検証で受け、それぞれ独立に設定できる
- src/infrastructure/repositories/dealRepository.ts:83 findAllByOrganization / inquiryRepository.ts:84 findAllWithClientByOrganization / meetingRepository.ts:92 findAllByOrganization — title 等の検索パラメータが無く全件返す
- src/application/usecases/listActionItems.ts — 紐づけ表示 sourceName は dealId→meetingId→inquiryId の優先で構築。会議は title が無く `formatDateJP(meeting.date)` で表示
- src/domain/models/meeting.ts — Meeting に title は無い。`type`(列挙) / `date` / `location` / `summary` を持つ

## 定数

- LINK_SEARCH_LIMIT: 20   # 各タブのサーバー検索が返す最大候補数。曖昧さと負荷の抑制

## 要件

1. **サーバー検索の追加**: 案件・引合・会議の組織横断取得に検索パラメータを追加する。案件＝deal.title 部分一致、引合＝inquiry.title 部分一致、会議＝meeting.summary の部分一致（summary が null の会議は対象外）。すべて organizationId で絞り、LINK_SEARCH_LIMIT 件まで。リポジトリ（dealRepository/inquiryRepository/meetingRepository）に検索引数を足し、usecase 経由で公開する
2. **検索 Server Action**: `searchLinkTargetsAction({ type: "deal"|"inquiry"|"meeting", query })` を新設し、候補 `{ id, label }[]` を返す。label は 案件＝title、引合＝title、会議＝`${formatDateJP(date)} ${種別ラベル}`（親の案件/引合名があれば併記）。認証・テナント分離必須。会議ラベルの日付整形は listActionItems.ts のモジュール private な `formatDateJP` を共有ユーティリティ（例: src/lib/dateUtils.ts）へ切り出して両所で import する（重複実装を避ける）
3. **紐づけ先ピッカー Modal コンポーネント**: 再利用可能な `LinkTargetPicker` を新設（src/app/(dashboard)/components）。案件/引合/会議の3タブ、各タブに検索ボックス（入力をデバウンスして searchLinkTargetsAction を呼ぶ）、結果一覧から1件クリックで確定。確定値は `{ type, id, label }`。「紐づけを外す（なし）」操作も提供する
4. **単一紐づけのセマンティクス（ピッカー経由のみ）**: ピッカーで紐づけ先を選んだ場合、選んだ type の FK をセットし、他2つの FK は null にする。この単一化はピッカーを使う経路（TaskList の新規作成・ActionItemModal の編集）の送信時に行う。usecase には「3 FK のうち最大1つが非 null」を強制する不変条件は入れない（会議ページ等のコンテキスト作成は従来通り meetingId と dealId を同時に送るため、複数 FK の同時設定を引き続き許容する）。会議に紐づくタスクが一覧で親案件名で表示される挙動は維持する
5. **編集モーダルへの統合**: ActionItemModal に「紐づけ先」欄を追加する。現在の紐づけ先の label を表示し、「変更」で LinkTargetPicker を開く。保存時に単一紐づけを updateActionItemAction へ渡す。ActionItemRow から渡す defaultValues に現在の紐づけ `{ type, id, label }` を含める
6. **新規作成への統合**: TaskList 新規作成モーダルの案件・引合の `<select>` 2つを LinkTargetPicker 1つに置換する。会議も選べるようにし、`dealOptions`/`inquiryOptions` の全件受け渡しは廃止する
7. **テスト**: 検索が organizationId で絞られること（テナント分離）、単一紐づけ（ある type を選ぶと他 FK が null になること）、各タブ（deal/inquiry/meeting）の検索が対象フィールドで絞ること、を確認する

## スコープ外

- 案件ページ(DealActionItemsSection)・会議ページ(MeetingActionItemsSection)からのタスク作成は、従来通りそのコンテキストへ自動紐づけ（ピッカーは出さない）
- 複数同時紐づけの維持（単一紐づけに統一する）
- 検索の高度機能（ファセット・並び替え・ページング・あいまい検索）。部分一致と先頭 LINK_SEARCH_LIMIT 件のみ
- ピッカー内からの紐づけ先エンティティ新規作成（案件/引合/会議の作成導線は設けない）
- 会議の検索対象拡張（summary のみ。種別や参加者での検索はしない）

## 受け入れ基準

- [ ] 案件・引合・会議の取得に検索パラメータがあり、organizationId で絞られ LINK_SEARCH_LIMIT 件までであることをテストで確認する
- [ ] searchLinkTargetsAction が type 別に対象フィールドで検索し `{ id, label }[]` を返す
- [ ] LinkTargetPicker が3タブ・サーバー検索で候補を出し、1件選択で `{ type, id, label }` を確定でき、「なし」にもできる
- [ ] タスク作成（ピッカー経由）: ピッカーで選んだ単一紐づけが保存され、他2つの FK が null である
- [ ] 会議ページからのタスク作成（MeetingActionItemsSection）が従来通り meetingId+dealId を保持して動作し、一覧で親案件名表示が維持される
- [ ] タスク編集: ActionItemModal で紐づけ先を変更・クリアできる
- [ ] TaskList から旧 `dealOptions`/`inquiryOptions` の `<select>` が無くなっている
- [ ] 依存方向 actions → usecases → domain / infrastructure を遵守し、テナント分離を維持する
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **単一紐づけはピッカー経由のみ（usecase での強制は却下）** — ピッカーで選ぶときだけ単一紐づけ（選んだ FK のみ、他はクリア）。会議/案件ページからのコンテキスト作成は従来通り meetingId+dealId を保持し、一覧での親案件名表示を維持する。会議は案件が前提のためこれが自然。却下案: usecase で「最大1 FK」を不変条件として強制 — 既存の MeetingActionItemsSection（meetingId+dealId を送信）が壊れ、会議タスクの一覧表示が「案件名」→「会議日付」に変わる
2. **サーバー検索を採用、クライアント全件ロードを却下** — 案件/引合/会議が増えてもスケールする。却下案: 全件をクライアントへ渡して filter — 大規模で重くプルダウンと同じ問題が残る
3. **種別タブで分割、横断統合検索を却下** — 種別が明確で実装も単純（ユーザー指定）。却下案: 3種を1つの検索結果に混ぜる — 種別の区別が付きにくい
4. **会議は summary を検索し「日付＋種別＋親名」で表示** — Meeting に title が無いため。listActionItems の会議表示（日付ベース）と整合させ表示ロジックの二重実装を避ける
5. **検索結果は LINK_SEARCH_LIMIT 件上限** — 曖昧さと負荷の抑制。ページングは不要（先頭一致で十分）
