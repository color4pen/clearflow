# 商談・顧客画面のデザイン適用

## Meta

- **type**: spec-change
- **slug**: design-meeting-client
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: UI レイアウトの変更のみ → false -->

## 背景

Claude Design（docs/design/Clearflow.dc.html の MEETING DETAIL / CLIENT DETAIL / CLIENTS LIST セクション）に合わせて商談詳細・顧客一覧・顧客詳細画面のレイアウトを更新する。

## 現状コードの前提

- `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx:55` — 商談詳細。gridTemplateColumns `1fr 2fr`。左: MeetingInfoSection（フォーム形式、ヒアリング情報含む）。右: MeetingSummarySection + MeetingActionItemsSection
- `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingInfoSection.tsx` — 基本情報・出席者・ヒアリング情報がフォーム内に統合
- `src/app/(dashboard)/clients/page.tsx:60-109` — 顧客一覧。DataTable で 7 カラム（企業名, 業種, 規模, 担当者数, 引き合い数, 案件数, 登録日）
- `src/app/(dashboard)/clients/[id]/page.tsx:44` — 顧客詳細。grid-cols-2（等分）+ 下部にフルワイズの ContactsSection + 関連エンティティ
- `src/app/(dashboard)/clients/[id]/ClientContactsSection.tsx:96-136` — 担当者テーブル 7 カラム（氏名, 部署, 役職, メール, 電話, 主担当, 削除）
- `docs/design/Clearflow.dc.html:490-533` — デザインの商談詳細: `1.6fr 1fr`。左: 議事録（編集/プレビュー切替）+ ヒアリング情報（100px ラベル grid）。右: 出席者（社内/外部）+ アクションアイテム
- `docs/design/Clearflow.dc.html:535-579` — デザインの顧客詳細: `1.5fr 1fr`。左: 企業情報（80px ラベル grid）+ 担当者（4カラム grid）。右: 関連引合 + 関連案件
- `docs/design/Clearflow.dc.html:912-930` — デザインの顧客一覧: 4 カラム（企業名, 業種, 関連案件, 登録日）

## 要件

1. **商談詳細 — カラム比率変更**: `1fr 2fr` を `1.6fr 1fr` に変更。gap を 24px に
2. **商談詳細 — 左カラム再構成**: 議事録セクション（Markdown 編集/プレビュー切替）を左カラムに移動する。ヒアリング情報（hearing の場合のみ）を左カラムの議事録の下に独立セクションとして配置する（100px ラベル + 1fr 値の grid）
3. **商談詳細 — 右カラム再構成**: 出席者セクション（社内/外部をサブセクションで分離）を右カラムに移動する。アクションアイテムセクションを出席者の下に配置する
4. **商談詳細 — MeetingInfoSection の分割**: 基本情報（日時、種別）はヘッダー部分に表示する。出席者とヒアリング情報は独立コンポーネントに分離する
5. **顧客一覧 — カラム削減**: 7 カラムから 4 カラム（企業名, 業種, 関連案件数, 登録日）に変更する。grid-template-columns: `1.8fr 1fr 100px 110px`。規模、担当者数、引き合い数カラムを削除する
6. **顧客詳細 — カラム比率変更**: grid-cols-2 を `1.5fr 1fr; gap: 24px` に変更する
7. **顧客詳細 — レイアウト再構成**: 左カラムに企業情報（80px ラベル grid）+ 担当者リスト。右カラムに関連引合 + 関連案件。現在のフルワイズ配置から 2 カラム内に収める
8. **顧客詳細 — 担当者テーブル簡素化**: 7 カラムから 4 カラム（名前, 部署・役職, 連絡先, アクション）に変更する。grid-template-columns: `1.2fr 1fr 1.4fr 120px`。部署と役職を 1 カラムに統合。メールと電話を連絡先として 1 カラムに統合する

## スコープ外

- 商談登録フォームのデザイン変更
- 顧客登録フォームのデザイン変更
- ビジネスロジックの変更

## 受け入れ基準

- [ ] 商談詳細のカラム比率が 1.6fr:1fr になっている
- [ ] 議事録が左カラム、出席者が右カラムに配置されている
- [ ] ヒアリング情報が hearing タイプの場合のみ左カラムに表示される
- [ ] 顧客一覧が 4 カラム（企業名, 業種, 関連案件数, 登録日）になっている
- [ ] 顧客詳細のカラム比率が 1.5fr:1fr になっている
- [ ] 担当者テーブルが 4 カラムに簡素化されている
- [ ] 関連引合・関連案件が右カラムに配置されている
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **MeetingInfoSection を分割** — 現在 1 コンポーネントに基本情報・出席者・ヒアリング情報が統合されているが、デザインでは左右カラムに分かれるため分割が必要。却下案: 1 コンポーネント維持 — 左右カラムへの配置ができない
2. **顧客一覧のカラム削減** — デザインが 4 カラムで情報密度を絞っている。詳細な数値（担当者数、引き合い数）は詳細画面で確認する。却下案: 7 カラム維持 — デザインと乖離する
