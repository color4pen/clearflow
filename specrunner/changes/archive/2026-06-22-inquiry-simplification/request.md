# 引き合い簡素化と商談の案件専属化

## Meta

- **type**: refactoring
- **slug**: inquiry-simplification
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: ステータスの削減とFK削除。既存パターンの簡素化であり新しいアーキテクチャではない → false -->

## 背景

引き合いの `in_progress`（対応中）ステータスと、商談（Meeting）の引き合い紐づけ（`inquiryId`）を廃止する。

引き合いは受付メモであり、商談するほど進んだなら案件化すべき。引き合いのステータスは `new`（受付済み）→ `converted`（案件化済み）/ `declined`（見送り）の2択に簡素化する。商談は案件（Deal）にのみ紐づく。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/schema.ts:36-41` — `inquiryStatusEnum`: `["new", "in_progress", "converted", "declined"]`
- `src/infrastructure/schema.ts:291` — `meetings` テーブルに `inquiryId` カラム（nullable FK to inquiries）
- `src/infrastructure/schema.ts:626` — `inquiriesRelations` に `meetings: many(meetings)`
- `src/infrastructure/schema.ts:635-638` — `meetingsRelations` に `inquiry: one(inquiries)` 参照
- `src/infrastructure/schema.ts:714` — ファイル最終行
- `src/domain/models/inquiry.ts:1` — `InquiryStatus = "new" | "in_progress" | "converted" | "declined"`
- `src/domain/models/meeting.ts:28` — `Meeting` 型に `inquiryId: string | null`
- `src/domain/services/inquiryTransition.ts:1-11` — 遷移ルール: `new → [in_progress, declined]`, `in_progress → [converted, declined]`, `declined → [in_progress]`
- `src/infrastructure/repositories/meetingRepository.ts:76-86` — `findAllByInquiry` メソッド
- `src/infrastructure/repositories/meetingRepository.ts:107-130` — `findAllByInquiryOrDeal` メソッド（サブクエリで inquiryId 経由の deal 商談も取得）
- `src/application/usecases/createMeeting.ts:13` — `inquiryId` を引数で受け取り、line 22-25 で inquiryId/dealId いずれか必須チェック、line 28-33 で引き合い存在確認
- `src/application/usecases/updateInquiryStatus.ts:33-87` — converted 遷移で Deal 作成
- `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx:48-56` — 「対応開始」ボタン（new → in_progress）
- `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx:69-77` — 「対応再開」ボタン（declined → in_progress）
- `src/app/(dashboard)/inquiries/page.tsx:23,49` — in_progress フィルタカウントとリンク
- `src/app/(dashboard)/labels.ts:3` — `in_progress: "対応中"`
- `src/infrastructure/seed.ts:562-580` — in_progress の引き合いシード2件（`inProgressInquiry1`, `inProgressInquiry2`）
- `src/infrastructure/seed.ts:641-752` — inquiryId を持つ商談シード5件
- `src/__tests__/domain/inquiryTransition.test.ts` — in_progress 関連テスト: T-01(new→in_progress), T-03(in_progress→converted), T-04(in_progress→declined), T-07(declined→in_progress)
- `src/app/(dashboard)/inquiries/[id]/meetings/` — 引き合い経由の商談作成・詳細ルートが存在する
- `src/app/actions/meetings.ts:31,131-136,154-157,162,194-196` — inquiryId 関連処理

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

### A. スキーマ変更

1. **inquiryStatusEnum から `in_progress` を削除**: 値を `["new", "converted", "declined"]` に変更する
2. **meetings テーブルから `inquiryId` カラムを削除**: 商談は案件（Deal）にのみ紐づく。`dealId` は NOT NULL に変更する（商談は必ず案件に紐づく）
3. **inquiriesRelations から `meetings: many(meetings)` を削除**
4. **meetingsRelations から `inquiry: one(inquiries)` を削除**
5. **マイグレーションファイルを生成する**: 既存のマイグレーションファイルには触れない。`bunx drizzle-kit generate` で差分マイグレーションを追加する

### B. ドメインモデル変更

6. **InquiryStatus から `"in_progress"` を削除**: `"new" | "converted" | "declined"` の3値にする
7. **Meeting 型から `inquiryId` フィールドを削除**: `dealId` を `string`（not nullable）に変更する

### C. ドメインサービス変更

8. **inquiryTransition.ts の遷移ルール変更**: `new → [converted, declined]`, `declined → [new]`。`in_progress` への遷移と `in_progress` からの遷移を全て削除する。見送りからの復帰は `new` に戻す（`in_progress` ではなく）

### D. リポジトリ変更

9. **meetingRepository の修正**: `findAllByInquiry` メソッドを削除する。`findAllByInquiryOrDeal` メソッドを削除し、代わりに `findAllByDeal` のみにする（既に存在する）。`create` メソッドから `inquiryId` パラメータを削除する。`mapRow` から `inquiryId` のマッピングを削除する

### E. ユースケース変更

10. **createMeeting の修正**: `inquiryId` パラメータを削除する。`dealId` を必須にする。引き合い存在確認ロジックを削除する
11. **updateInquiryStatus の修正**: `in_progress` への遷移処理を削除する。converted 遷移は `new` からも直接許可する（`new → converted`）。見送りからの復帰は `declined → new` に変更する

### F. Server Actions 変更

12. **meetings.ts の修正**: createMeetingSchema から `inquiryId` を削除する。`dealId` を必須にする。revalidatePath の inquiryId 参照を削除する
13. **inquiries.ts の修正**: `updateInquiryStatusAction` で `in_progress` を受け付けないようにする（フロントから送られることはないが、安全のため）

### G. UI 変更

14. **InquiryActions.tsx の修正**: 「対応開始」ボタン（new → in_progress）を削除する。`new` 状態では「案件化」と「見送り」のみ。「対応再開」ボタン（declined → in_progress）を「再開」ボタン（declined → new）に変更する
15. **inquiries/page.tsx の修正**: `in_progress` フィルタカウントとリンクを削除する
16. **labels.ts の修正**: `statusLabels` から `in_progress: "対応中"` を削除する
17. **inquiries/[id]/meetings/ ディレクトリを削除**: 引き合い経由の商談作成・詳細ルートを撤去する。商談は案件詳細からのみ作成する
18. **引き合い詳細ページの修正**: 商談履歴セクションを削除する（商談は案件に紐づくため引き合い詳細には表示しない）

### H. シードデータ修正

19. **in_progress の引き合いを修正**: `inProgressInquiry1`, `inProgressInquiry2` のステータスを `new` または `converted` に変更する
20. **inquiryId を持つ商談を修正**: 全商談を `dealId` のみ紐づけに変更する。dealId を持たない引き合い直紐づき商談は、対応する案件に紐づけ直すか削除する

### I. テスト修正

21. **inquiryTransition.test.ts の修正**: `in_progress` 関連テスト（T-01, T-03, T-04, T-07）を削除または新しい遷移ルール（`new → converted`, `new → declined`, `declined → new`）に書き換える
22. **projectStructure.test.ts の修正**: meeting テナント分離テストの `inquiryId` 関連アサーションを削除する

## スコープ外

- 削除機能（引き合い・案件・契約）— Request 2 で対応
- フォームの非対称解消 — Request 2 で対応
- 編集履歴（監査ログへの変更前値記録）— Request 2 で対応

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `inquiryStatusEnum` に `in_progress` が含まれない
- [ ] `meetings` テーブルに `inquiryId` カラムが存在しない
- [ ] `meetings.dealId` が NOT NULL である
- [ ] `InquiryStatus` 型に `"in_progress"` が含まれない
- [ ] `Meeting` 型に `inquiryId` フィールドが存在しない
- [ ] `canTransition("new", "converted")` が true を返す
- [ ] `canTransition("new", "declined")` が true を返す
- [ ] `canTransition("declined", "new")` が true を返す
- [ ] `meetingRepository` に `findAllByInquiry` メソッドが存在しない
- [ ] `createMeeting` に `inquiryId` パラメータが存在しない
- [ ] InquiryActions に「対応開始」ボタンが存在しない
- [ ] 引き合い詳細ページに商談履歴セクションが存在しない
- [ ] `labels.ts` に `in_progress` が存在しない
- [ ] マイグレーションファイルが差分として追加されている（既存ファイルは変更しない）
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **in_progress 廃止を採用、維持を却下** — 引き合いは受付メモ。商談するほど進んだなら案件化すべき。中間状態は判断を先送りにするだけで管理価値がない
2. **meetings.inquiryId 削除を採用、nullable で残すを却下** — 商談は営業活動であり案件に対して行うもの。引き合い段階の情報収集は引き合いの description で十分。FK を残すと「引き合いに商談を紐づけるべきか案件に紐づけるべきか」の判断が永久に残る
3. **dealId を NOT NULL に変更を採用** — inquiryId を削除した後、商談は必ず案件に紐づく。nullable のままだと「どちらにも紐づかない商談」が作成可能になり、孤立データが発生する
4. **見送りからの復帰先を new にするを採用、in_progress を却下** — in_progress が廃止されるため、new に戻すのが唯一の選択肢。受付状態に戻ることで「改めて案件化するか見送るか」の判断を仕切り直す
