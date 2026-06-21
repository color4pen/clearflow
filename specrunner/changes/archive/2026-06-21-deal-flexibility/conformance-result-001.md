# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | yes | 全 T-01〜T-16 が [x] 完了。T-16 の重複 ID はタスクファイルの記述ミスだが実装に影響なし |
| design.md | yes | D1〜D5 の全設計判断が実装に反映されている |
| spec.md | yes | 全 Requirement の SHALL/MUST および全 Scenario が満たされている |
| request.md | yes | 全受け入れ基準を満たす。build/typecheck/test/lint 全フェーズ passed |

---

## 詳細

### tasks.md

全タスクが `[x]` 完了済み。

- T-01: `schema.ts:308-312` — inquiryId の `.notNull()` 削除、clientId NOT NULL FK 追加、unique 制約削除を確認
- T-02: `deal.ts:20-44` — `Deal.inquiryId: string | null`、`Deal.clientId: string`、`DealWithDetails` 型（旧 DealWithInquiry）を確認
- T-03: `dealTransition.ts` — `VALID_TRANSITIONS` マップなし、終端チェックのみの実装を確認
- T-04: `dealRepository.ts:30-64` — `create` に `clientId: string`（必須）、`inquiryId?: string`（optional）を確認
- T-05: `dealRepository.ts:80-106` — `innerJoin(clients, eq(deals.clientId, clients.id))` + `leftJoin(inquiries, ...)` + `DealWithDetails[]` 返却を確認
- T-06: `createDeal.ts` — パターン (a) 引き合いあり、パターン (b) 直接作成の両分岐を確認
- T-07: `updateInquiryStatus.ts:34-44` — clientId null チェックと `clientId: inquiry.clientId!` の渡しを確認
- T-08: `deals.ts` (actions) — inquiryId optional schema、clientId optional 追加、両方 null チェック、DealWithDetails 参照を確認
- T-09: `deals/page.tsx:37-39` — `/deals/new` への Link を PageToolbar に追加を確認
- T-10: `deals/new/page.tsx` + `NewDealForm.tsx` — inquiryId 有無で分岐、顧客選択 select、キャンセルリンク分岐を確認
- T-11: `deals/[id]/page.tsx:34,42,118` — inquiryId null ガード、clientId 直接参照、引き合いリンク条件付き表示を確認
- T-12: `listDeals.ts:2` — `DealWithDetails` 返却型を確認
- T-13: `seed.ts:750-821` — 既存5件に clientId 設定、引き合いなし案件1件（inquiryId なし）追加を確認
- T-14: `drizzle/0002_panoramic_leopardon.sql` — client_id 追加、inquiry_id NOT NULL 削除、unique 制約 DROP を確認
- T-15: `DealPhaseActions.tsx:59-64` — 現フェーズ除外の動的ボタン生成、終端状態での早期 return を確認
- T-16: `dealTransition.test.ts` — T-13（スキップ）・T-16（巻き戻し）の期待値 true、`dealManagement.test.ts` — DealWithDetails 型参照、clientId 必須チェックを確認

### design.md

| 決定 | 確認内容 |
|------|---------|
| D1: clientId 直接追加 | `schema.ts:310-312`、`dealRepository.ts:13,33`、`seed.ts` の全 deal 件 |
| D2: unique 制約削除 + アプリ層重複チェック | migration SQL の DROP CONSTRAINT、`createDeal.ts:41-43` で findByInquiryId 維持 |
| D3: VALID_TRANSITIONS 廃止 | `dealTransition.ts` に VALID_TRANSITIONS 定数なし、TERMINAL_PHASES のみ |
| D4: DealWithInquiry → DealWithDetails | 全参照ファイルで型名変更完了 |
| D5: inquiry.clientId null チェック | `createDeal.ts:46-48`、`updateInquiryStatus.ts:34-36` |

### spec.md

**Requirement: 引き合いなしで案件を作成できる**

- SHALL（clientId のみで作成）→ `createDeal.ts:51-63` パターン (b) ✅
- MUST（両方未指定でエラー）→ usecase + action の二重ガード ✅
- Scenario「clientId のみ」→ ok: true、inquiryId = null、clientId = 指定値 ✅
- Scenario「両方未指定で拒否」→ createDealAction がバリデーションエラーを返す ✅

**Requirement: 引き合い経由の案件作成で既存チェックを維持する**

- SHALL（存在確認・converted チェック・重複チェック）→ `createDeal.ts:32-44` ✅
- MUST（inquiry.clientId null → エラー）→ `createDeal.ts:46-48` ✅
- 全 Scenario が実装で満たされている ✅

**Requirement: 引き合いの案件化（converted 遷移）で clientId を渡す**

- MUST（clientId 渡し）→ `updateInquiryStatus.ts:44` で `clientId: inquiry.clientId!` ✅
- MUST（null → エラー）→ `updateInquiryStatus.ts:34-36` ✅
- 全 Scenario が実装で満たされている ✅

**Requirement: フェーズ遷移は終端状態からのみ拒否する**

- SHALL/MUST → `dealTransition.ts` の実装と `dealTransition.test.ts` の T-13・T-16 で検証済み ✅
- 全 Scenario の期待値（true/false）が実装と一致 ✅

**Requirement: 案件一覧に新規作成ボタンを表示する**

- SHALL → `deals/page.tsx:37-39` で `/deals/new` への Link を PageToolbar に追加 ✅

**Requirement: 案件作成ページで引き合いなし作成に対応する**

- MUST（inquiryId 有無で分岐）→ `new/page.tsx` + `NewDealForm.tsx` ✅
- Scenario「パラメータなし → 顧客選択プルダウン」→ `NewDealForm.tsx:30-44` ✅
- Scenario「inquiryId あり → 既存動作維持」→ `NewDealForm.tsx:25-27` で hidden field ✅

**Requirement: 案件詳細ページで引き合いなし案件に対応する**

- MUST（null ガード、clientId 直接参照）→ `deals/[id]/page.tsx:34,42` ✅
- Scenario「引き合いなし → リンク非表示」→ `page.tsx:118` の条件付き表示 ✅
- Scenario「引き合いあり → リンク表示」→ 条件 true の場合レンダリング ✅

### request.md（受け入れ基準）

| 基準 | 状態 |
|------|------|
| `bun run build` 成功 | passed（10.2s） |
| `bun test` 全件 green | 520 pass / 0 fail |
| deals.inquiryId nullable | schema.ts:308（.notNull() なし） |
| deals.clientId NOT NULL | schema.ts:310-312 |
| deals_inquiry_id_unique 制約なし | migration SQL + schema 確認 |
| inquiryId なし案件作成可 | createDeal パターン (b) |
| 既存チェック（converted + 重複）維持 | createDeal パターン (a) |
| proposal_prep → negotiation 許可 | canTransition + テスト T-13 |
| proposed → proposal_prep 許可 | canTransition + テスト T-16 |
| won からの遷移拒否 | canTransition + テスト T-09, T-10 |
| lost からの遷移拒否 | canTransition + テスト T-11, T-12 |
| 案件一覧に新規作成ボタン | deals/page.tsx:37-39 |
| inquiry.clientId null → エラー | updateInquiryStatus.ts:34-36 |
| マイグレーションファイル生成 | drizzle/0002_panoramic_leopardon.sql |
| 依存方向 actions → usecases → domain/infrastructure | 違反なし |
| typecheck green | passed（0.9s） |
