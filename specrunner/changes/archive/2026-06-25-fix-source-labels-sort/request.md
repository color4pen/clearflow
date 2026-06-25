# 経路ラベル追加とテーブル並び順の修正

## Meta

- **type**: spec-change
- **slug**: fix-source-labels-sort
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: ラベル追加と orderBy 変更のみ → false -->

## 背景

R02（domain-model-alignment）で InquirySource enum を 7 値に拡張したが、UI のラベル定義と登録フォームの選択肢が 5 値のまま残っている。`email` と `agent_service` で引合を登録できない。また、全一覧テーブルが createdAt 昇順（古い順）で表示されており、新しい順がデフォルトとして適切。

## 現状コードの前提

- `src/infrastructure/schema.ts:265-273` — inquirySourceEnum は 7 値（web, phone, email, referral, agent_service, exhibition, other）
- `src/app/(dashboard)/labels.ts:7-13` — sourceLabels は 5 値のみ。`email` と `agent_service` が欠落
- `src/app/(dashboard)/inquiries/new/InquiryForm.tsx:15-22` — sourceOptions も 5 値のみ。`email` と `agent_service` が欠落
- `src/infrastructure/repositories/inquiryRepository.ts:77,92,169` — `.orderBy(inquiries.createdAt)` — 方向指定なし（暗黙の ASC）
- `src/infrastructure/repositories/dealRepository.ts:101,123` — `.orderBy(asc(deals.createdAt))`
- `src/infrastructure/repositories/contractRepository.ts:105,122` — `.orderBy(asc(contracts.createdAt))`
- `src/infrastructure/repositories/requestRepository.ts:116` — `.orderBy(requests.createdAt)` — 方向指定なし
- `src/infrastructure/repositories/clientRepository.ts:82` — `.orderBy(clients.createdAt)` — 方向指定なし

## 要件

1. **sourceLabels に 2 値追加**: `src/app/(dashboard)/labels.ts` の sourceLabels に `email: "メール"` と `agent_service: "仲介サービス"` を追加する
2. **InquiryForm の sourceOptions に 2 値追加**: `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` の sourceOptions に `{ value: "email", label: "メール" }` と `{ value: "agent_service", label: "仲介サービス" }` を追加する。順序は web, phone, email, referral, agent_service, exhibition, other
3. **一覧テーブルの並び順を降順に変更**: 以下のリポジトリの orderBy を `desc(createdAt)` に変更する。新しいレコードが先頭に表示されるようにする
   - `inquiryRepository.ts` の findAll, findByOrganization, findByClient（3 箇所）
   - `dealRepository.ts` の findAll, findByOrganization（2 箇所）
   - `contractRepository.ts` の findAll, findByOrganization（2 箇所）
   - `requestRepository.ts` の findAllWithStepsByOrganization（1 箇所。この関数が承認一覧ページの実際のデータソース）
   - `clientRepository.ts` の findAll（1 箇所）
4. **approvalSteps の orderBy は変更しない**: stepOrder による昇順は業務上正しい
5. **approvalPolicies の orderBy は変更しない**: ポリシー評価の決定的な順序（ASC）を維持する
6. **revenueRepository の orderBy は変更しない**: 月次集計・ランキングの並び順は既に適切

## スコープ外

- 引合の情報モデル変更（問い合わせ内容と概要の分離）
- UI 側のソート切替機能
- InquirySource の enum 値追加（スキーマは既に 7 値で定義済み）

## 受け入れ基準

- [ ] sourceLabels に email と agent_service が含まれる
- [ ] InquiryForm の sourceOptions に email と agent_service が含まれる
- [ ] 引合の経路ドロップダウンフィルタに「メール」と「仲介サービス」が表示される
- [ ] 引合一覧が登録日の新しい順で表示される
- [ ] 案件一覧が作成日の新しい順で表示される
- [ ] 契約一覧が作成日の新しい順で表示される
- [ ] 承認一覧が申請日の新しい順で表示される
- [ ] 顧客一覧が登録日の新しい順で表示される
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **sourceOptions を labels.ts から生成しない** — InquiryForm の sourceOptions は順序制御と「選択してください」プレースホルダーを含むため、labels.ts とは別に定義する。DRY よりも明示性を優先する
