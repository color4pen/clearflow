# Design: UI動線改善

## Context

ドメインモデル再構築と承認フロー統合でバックエンドの構造は整ったが、UI の動線に改善すべき点が残っている。

現状のコードベース:
- `InquiryForm.tsx` の顧客選択は既存リストからの `Select` のみ。新規作成の動線がなく、先に顧客一覧で登録する必要がある
- `MeetingForm.tsx`/`DealMeetingForm.tsx` の外部参加者は `string[]`（氏名フリーテキスト）。`ClientContact` との紐づけ機能がない
- `deals/[id]/page.tsx` の商談履歴 DataTable は type, date, summary の3列のみ。引き合い詳細には location, attendees, actionItems, 詳細リンクの列がある
- `deal_contacts` テーブルと `dealContactRepository`（create, findByDeal, deleteByDealAndContact）は実装済みだが、管理UIがない
- `labels.ts` に `dealContactRoleLabels` がない
- `createClient` UC は独立関数として存在し、引き合い作成の Action 内から呼び出せる
- シードデータに `deal_contacts` は2件あるが、1案件に2ロールが紐づく形式ではない

## Goals / Non-Goals

**Goals**:
- 引き合い作成フォームから顧客を同時登録できるようにする
- 案件詳細の商談履歴を引き合い詳細と同等の情報量にする
- 案件担当者（deal_contacts）の一覧表示・追加・削除UIを提供する
- 商談記録時に外部参加者を顧客担当者（ClientContact）として登録できる動線を提供する
- `labels.ts` に `dealContactRoleLabels` を追加する
- シードデータで deal_contacts を1案件に複数ロールで紐づける

**Non-Goals**:
- 顧客の編集・削除 UI
- 引き合いの編集 UI
- 担当者の編集・削除 UI（deal_contacts の削除は含む）
- 商談の削除
- ページネーション・検索・ソート
- レスポンシブデザイン対応

## Decisions

### D1: 引き合い作成 Action 内で createClient UC を順次呼び出す（architect 決定済み）

**決定**: `createInquiryAction` で `newClientName` が指定されている場合、先に `createClient` UC を呼び出して顧客を作成し、得られた `clientId` で `createInquiry` UC を呼ぶ。2つの UC を Action 内で順次呼び出す。

**理由**: architect 評価済み。モーダルによる顧客登録は状態管理が複雑になり、サーバーコンポーネント中心の設計と合わない。Action → UC の依存方向に違反しない。

**代替案**: モーダルで顧客登録フォームを表示する案 — 状態管理の複雑さから却下。

### D2: 案件商談詳細ページの新設 — 引き合い側の構造を再利用

**決定**: `/deals/[id]/meetings/[meetingId]/page.tsx` を新設する。`meetingRepository.findById` で商談を取得し、引き合い側の商談詳細ページ（`inquiries/[id]/meetings/[meetingId]/page.tsx`）と同等の表示を行う。MeetingDetail Client Component は引き合い側と共有せず、まず表示のみの Server Component として実装する（編集は引き合い側のみ）。

**理由**: 案件詳細の商談テーブルから詳細リンクを提供するには、案件起点の商談詳細ページが必要。引き合い経由の商談は `/inquiries/${inquiryId}/meetings/${meetingId}` へリンクし、案件直紐づきの商談は `/deals/${dealId}/meetings/${meetingId}` へリンクする。

**代替案**: 全商談を引き合い側のパスにリダイレクトする案 — 案件直紐づき商談（inquiryId が null）では引き合い側のパスが構築できないため不可。

### D3: 案件担当者管理 — UC 層に addDealContact / removeDealContact を追加

**決定**: `addDealContact` UC と `removeDealContact` UC を新設する。それぞれ `dealContactRepository` のメソッドを呼び出し、`auditLogRepository` で監査ログを記録する。Server Actions（`addDealContactAction`, `removeDealContactAction`）から呼び出す。

**理由**: 依存方向 `actions → usecases → repositories` を維持するため、Action から repository を直接呼ばない。担当者の追加・削除は状態変更のため監査ログを記録する。

**代替案**: Action から直接 repository を呼ぶ案 — 依存方向に違反する。

### D4: 担当者登録を商談記録のチェックボックスで行う（architect 決定済み）

**決定**: `MeetingForm`/`DealMeetingForm` の外部参加者ごとに「顧客担当者として登録」チェックボックスを追加する。`clientId` を props で受け取り、チェックされた参加者は `createMeetingAction` 内で `createClientContact` UC を呼び出して `ClientContact` として登録する。

**理由**: architect 評価済み。担当者は商談で判明するもの。商談記録フロー内での登録が自然。

**代替案**: 独立した担当者登録フォーム — まずは商談起点の動線を優先。

### D5: createClientContact UC の新設 — 単一担当者の登録

**決定**: `createClientContact` UC を新設する。`clientId` の所有テナント検証、`clientRepository.createContact` による担当者作成、監査ログ記録を行う。`createMeetingAction` から商談作成成功後に呼び出す。

**理由**: `createClient` UC は顧客と担当者をまとめて作成するが、既存顧客への担当者追加は別の操作。UC 層でテナント検証と監査ログを担保する。

**代替案**: `createMeeting` UC を拡張して担当者登録も行う案 — 関心の分離の観点から、商談作成と担当者登録は別 UC とする。

### D6: 案件詳細での担当者表示 — ページ側でデータ結合

**決定**: `deals/[id]/page.tsx` で `dealContactRepository.findByDeal` と `clientRepository.findContactsByClientId` を別々に呼び出し、ページ側で `contactId` を基にデータを結合して表示する。

**理由**: `DealContact` 型は `contactId` のみを持ち、担当者の氏名・部署・役職は `ClientContact` に属する。案件詳細ページは単一案件の表示であり、担当者数も限定的なため、ページ側での結合が十分。新しい repository メソッド（JOIN 付き）の追加は不要。

**代替案**: `findByDealWithContacts` のような JOIN 付きメソッドを追加する案 — 小規模データで overengineering。

### D7: deal_contacts の削除に確認ダイアログ不要（architect 決定済み）

**決定**: 削除ボタンクリックで即座に `removeDealContactAction` を呼び出す。確認ダイアログは実装しない。

**理由**: architect 評価済み。再追加が容易であり、確認ダイアログの実装コストに見合わない。

### D8: 商談詳細リンクの分岐ロジック

**決定**: 商談テーブルの詳細リンクは、`meeting.inquiryId` が存在すれば `/inquiries/${meeting.inquiryId}/meetings/${meeting.id}`、そうでなければ `/deals/${deal.id}/meetings/${meeting.id}` へリンクする。

**理由**: `findAllByInquiryOrDeal` は引き合い経由の商談と案件直紐づき商談の両方を返す。引き合い経由の商談は引き合い側に既存の詳細ページがあり、そちらへリンクするのが自然。

## Risks / Trade-offs

**[Risk] createClient と createInquiry が別トランザクションで実行される**
→ Mitigation: `createClient` 成功後に `createInquiry` が失敗した場合、顧客は作成されるが引き合いには紐づかない。顧客は後から別の引き合いに紐づけ可能であり、致命的な不整合ではない。ユーザーにはエラーメッセージで引き合い作成の失敗を通知する。

**[Risk] 商談記録時の担当者登録が商談作成と独立して失敗する可能性**
→ Mitigation: 商談作成は成功するが担当者登録が失敗する場合、ユーザーには部分的な成功を通知する。担当者は後から顧客詳細や別の商談記録で追加可能。

**[Risk] clientId が null の場合の担当者関連機能**
→ Mitigation: 引き合いに顧客が紐づいていない場合（`clientId` が null）、担当者セクションの追加フォームを非表示にし、商談フォームの「顧客担当者として登録」チェックボックスも非表示にする。

## Open Questions

なし（architect 評価済みの設計判断により主要な論点は解決済み）。
