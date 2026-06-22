# 削除機能とフォーム整備

## Meta

- **type**: new-feature
- **slug**: delete-and-form-fixes
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存パターンの拡充（削除UC追加、フォームフィールド追加）。新しいアーキテクチャではない → false -->

## 背景

各エンティティ（引き合い・案件・契約）に削除機能がなく、間違えて作成した場合に対処できない。また、案件作成フォームで担当者を入力できない、商談の編集UIがない、ヒアリングデータの入力フォームがないなど、作成と編集のフォーム非対称が残っている。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/repositories/inquiryRepository.ts` — delete メソッドが存在しない
- `src/infrastructure/repositories/dealRepository.ts` — delete メソッドが存在しない
- `src/infrastructure/repositories/contractRepository.ts` — delete メソッドが存在しない
- `src/infrastructure/schema.ts:312-313` — `deals.inquiryId` が inquiries を FK 参照（nullable, onDelete 指定なし）
- `src/infrastructure/schema.ts:289` — `meetings.dealId` が deals を FK 参照（NOT NULL, onDelete 指定なし）
- `src/infrastructure/schema.ts:342-343` — `dealContacts.dealId` が deals を FK 参照（NOT NULL, onDelete 指定なし）
- `src/infrastructure/schema.ts:364-365` — `contracts.dealId` が deals を FK 参照（NOT NULL, onDelete 指定なし）
- `src/infrastructure/schema.ts:391-392` — `invoices.contractId` が contracts を FK 参照（NOT NULL, onDelete 指定なし）
- `src/app/(dashboard)/deals/new/NewDealForm.tsx` — 作成フォームに `assigneeId` と `technicalLeadId` のフィールドがない。`estimatedStartDate`, `estimatedEndDate`, `contractType`, `notes` は追加済み
- `src/app/(dashboard)/deals/[id]/DealEditForm.tsx` — 編集フォームにも `assigneeId` と `technicalLeadId` のフィールドがない
- `src/app/(dashboard)/deals/[id]/meetings/new/DealMeetingForm.tsx` — ヒアリングデータ入力フィールドがない。バックエンドは `hearingData` を受け付ける
- 商談の編集UI — 存在しない。バックエンドに `updateMeetingAction` と `updateMeeting` UC は存在する
- `src/infrastructure/schema.ts:706` — ファイル最終行
- `src/application/usecases/index.ts:43` — 最終行
- `src/infrastructure/repositories/index.ts:18` — 最終行
- `src/__tests__/static/projectStructure.test.ts:1305` — 最終行

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

### A. 削除機能

1. **引き合い削除**: `inquiryRepository` に `deleteById(id, organizationId)` メソッドを追加する。`deleteInquiry` ユースケースを追加する: `dealRepository.findByInquiryId` で案件の存在を確認し、存在する場合はエラー「案件が紐づいている引き合いは削除できません」を返す。存在しない場合は削除 + 監査ログ記録。Server Action `deleteInquiryAction` を追加（admin / manager のみ）。引き合い詳細ページに削除ボタンを追加する（案件が紐づいていない場合のみ表示）。削除後は `/inquiries` にリダイレクトする
2. **案件削除**: `dealRepository` に `deleteById(id, organizationId)` メソッドを追加する。`deleteDeal` ユースケースを追加する: `meetingRepository.findAllByDeal` で商談の存在を確認し、存在する場合はエラー。`contractRepository.findAllByDealId` で契約の存在を確認し、存在する場合はエラー。`dealContactRepository.findByDeal` で担当者の存在を確認し、存在する場合は担当者を全て削除する（担当者は案件に従属するため）。引き合い経由の案件の場合は引き合いのステータスを `new` に戻す。削除 + 監査ログ記録。Server Action `deleteDealAction` を追加（admin / manager のみ）。案件詳細ページに削除ボタンを追加する（商談・契約が0件の場合のみ表示）。削除後は `/deals` にリダイレクトする。削除時に確認ダイアログを表示する
3. **契約削除**: `contractRepository` に `deleteById(id, organizationId)` メソッドを追加する。`deleteContract` ユースケースを追加する: `invoiceRepository.findAllByContract` で請求の存在を確認し、存在する場合はエラー「請求が紐づいている契約は削除できません」を返す。存在しない場合は削除 + 監査ログ記録。Server Action `deleteContractAction` を追加（admin / manager のみ）。契約詳細ページに削除ボタンを追加する（請求が0件の場合のみ表示）。削除後は `/contracts` にリダイレクトする。削除時に確認ダイアログを表示する

### B. フォーム非対称の解消

4. **案件作成・編集フォームに担当者フィールドを追加**: `assigneeId`（営業担当）と `technicalLeadId`（技術担当）の選択プルダウンを追加する。選択肢は組織内のユーザー一覧（`listOrganizationUsers` を使用）。作成ページと編集ページの両方に追加する。Server Component でユーザー一覧を取得し、フォームに渡す
5. **商談作成フォームにヒアリングデータを追加**: `DealMeetingForm.tsx` で種別が `hearing` の場合にヒアリング専用フィールド（challenge, budget, decisionMaker, timeline, competitors, notes）を表示する。バックエンドは既に `hearingData` を受け付けるため、フロント側のフォームとFormData 送信を追加する
6. **商談編集ページを追加**: `/deals/[id]/meetings/[meetingId]/edit/page.tsx` と `EditMeetingForm.tsx` を作成する。編集フィールド: type, date, location, summary, actionItems（追加・削除・内容変更・完了トグル）, internalAttendees, externalAttendees, hearingData（hearing の場合）。`updateMeetingAction` を呼び出す。商談詳細ページに編集リンクを追加する

### C. テスト

7. **削除ユースケースのテスト**: 各削除ユースケース（deleteInquiry, deleteDeal, deleteContract）の静的テストを `projectStructure.test.ts` に追加する。テナント分離（organizationId 条件）を検証する
8. **マイグレーション**: スキーマ変更がない場合は不要。deleteById はアプリケーション層の変更のみ

## スコープ外

- 編集履歴（監査ログへの変更前値記録）— 全エンティティの update に影響するため別リクエスト
- 金額入力のカンマ区切り表示
- 関連情報のフロー表示（ステップインジケーター）
- 顧客の担当者編集・削除

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] 案件が紐づいている引き合いを削除しようとするとエラーが返る
- [ ] 案件が紐づいていない引き合いを削除できる
- [ ] 商談・契約が紐づいている案件を削除しようとするとエラーが返る
- [ ] 商談・契約が紐づいていない案件を削除できる
- [ ] 案件削除時に引き合い経由の場合、引き合いのステータスが new に戻る
- [ ] 案件削除時に担当者（deal_contacts）が自動削除される
- [ ] 請求が紐づいている契約を削除しようとするとエラーが返る
- [ ] 請求が紐づいていない契約を削除できる
- [ ] 案件作成・編集フォームに営業担当・技術担当の選択がある
- [ ] 種別が hearing の商談作成時にヒアリング項目を入力できる
- [ ] 商談詳細ページに編集リンクがある
- [ ] 商談編集ページで議事録・参加者・アクションアイテムを変更できる
- [ ] 削除操作で監査ログが記録される
- [ ] 削除は admin / manager のみ実行可能
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **案件削除時に担当者（deal_contacts）を自動削除を採用、削除ブロックを却下** — 担当者は案件に従属するデータであり、案件がなくなれば担当者も不要。商談・契約のようにユーザーが独立して作成したデータとは性質が異なる
2. **案件削除時に引き合いのステータスを new に戻すを採用、converted のままにするを却下** — 案件が削除されたなら案件化の事実もなくなる。引き合いが converted のまま残ると「案件化済みだが案件が存在しない」不整合が生じる
3. **deleteById をリポジトリに直接実装を採用、soft delete（is_deleted フラグ）を却下** — 削除は「間違えて作った」ケースに限定されるため、物理削除で十分。soft delete はクエリの全箇所に条件追加が必要になり複雑さが増す
4. **商談編集で actionItems の追加・削除・内容変更を許可を採用、完了トグルのみを却下** — 現在の MeetingDetail が完了トグルのみで不十分という指摘に対応。アクションアイテムは商談の核心情報であり、完全な編集が必要
