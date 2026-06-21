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
| tasks.md | yes | 全 14 タスク（T-01〜T-14）チェックボックス完了 |
| design.md | yes | D1〜D8 全決定を実装が反映している |
| spec.md | yes | 全 7 Requirement・全 Scenario 実装済み |
| request.md | yes | 全 23 件の受け入れ基準を満たしている |

---

## 1. Tasks Completeness

全 14 タスク（T-01〜T-14）のチェックボックスが `[x]` で完了している。未完了タスクなし。

---

## 2. Spec Requirements

### R1: 引き合いは顧客未確定で作成できる（SHALL）
- `schema.ts`: `clientId: uuid("client_id").references(() => clients.id)` — `.notNull()` 削除済み
- `Inquiry` 型: `clientId: string | null`
- `createInquiry`: `clientId?: string | null`、指定時のみ存在確認
- `InquiryForm.tsx`: `<option value="">未定</option>`、`required` 属性なし

### R2: 商談は引き合いまたは案件のどちらか一方に必ず紐づく（MUST）
- `createMeeting.ts`: 両方 null のガード節 → `{ ok: false, reason: "引き合いまたは案件のどちらかを指定してください" }`
- `createMeetingAction`: 同一バリデーション
- `meetings` テーブル: `inquiryId`・`dealId` ともに nullable

### R3: 案件化への遷移は「案件化」という用語で統一される（SHALL）
- `updateInquiryStatus.ts`: 承認タイトル `"案件化承認: ${inquiry.title}"`
- `createDeal.ts`: エラーメッセージ `"案件化済みの引き合いにのみ案件を作成できます"`
- `InquiryActions.tsx`: ボタン `"案件化"`、送信 `"案件化する"`
- `labels.ts`: `statusLabels.converted = "案件化済"`

### R4: 見積承認フェーズへの遷移はテンプレートが必要（MUST）
- `updateDealPhase.ts`: `estimate_approval` 遷移時に `templateId` 必須チェック、エラーメッセージ `"見積承認フェーズへの遷移にはテンプレートの指定が必要です"`

### R5: 案件更新は admin と manager のみが実行できる（MUST）
- `actions/deals.ts`: `updateDealAction` に `session.user.role !== "admin" && session.user.role !== "manager"` ガード → `{ success: false, message: "権限がありません" }`

### R6: 案件ごとの担当者と役割を管理できる（SHALL）
- `schema.ts`: `dealContacts` テーブル定義、`unique("deal_contacts_deal_contact_unique").on(dealId, contactId)`
- `dealContactRepository.ts`: `create`・`findByDeal`・`deleteByDealAndContact` 実装、全メソッドに `organizationId` テナント検証
- `DealContact`・`DealContactRole` 型: `domain/models/deal.ts` に追加、`index.ts` から export

### R7: UIラベルは単一ソースから供給される（SHALL）
- `src/app/(dashboard)/labels.ts` 新設: `statusLabels`・`sourceLabels`・`meetingTypeLabels`・`phaseLabels`・`contractTypeLabels` 定義
- 全ページ（inquiries/page.tsx、inquiries/[id]/page.tsx、clients/[id]/page.tsx、deals/page.tsx、deals/[id]/page.tsx）がローカル定義を削除し `labels.ts` から import

---

## 3. Design Decisions

| 決定 | 確認 |
|------|------|
| D1: inquiries.clientId nullable | `schema.ts` の `.notNull()` 削除済み |
| D2: inquiries.contactId 削除 | スキーマ・ドメインモデル・リポジトリから完全削除 |
| D3: meetings に dealId 追加、inquiryId nullable 化、アプリ層バリデーション | 実装済み |
| D4: deal_contacts 中間テーブル追加 | 定義・リポジトリ・シードデータ |
| D5: ラベル集約 | labels.ts に集約 |
| D6: internal_approval → estimate_approval | enum・型・遷移マップ・usecase・UI 全変更 |
| D7: contract → fixed_price | ContractType 型・contractTypeLabels 変更 |
| D8: updateDealAction ロールチェック | admin/manager ガード追加 |

---

## 4. Acceptance Criteria

| 基準 | 結果 |
|------|------|
| `bun run build` 成功 | verification-result.md: build passed |
| `bun test` 全件 green | 502 pass / 0 fail |
| `inquiries.clientId` が nullable | `.notNull()` なし |
| `inquiries` に `contactId` カラムなし | 削除済み |
| `inquiries` の FK 名が `conversionRequestId` | `conversion_request_id` |
| `meetings` に `dealId` カラム（nullable FK） | 追加済み |
| `meetings.inquiryId` が nullable | `.notNull()` なし |
| `deal_contacts` テーブルが schema.ts に定義 | 追加済み |
| `dealPhaseEnum` に `estimate_approval` のみ（`internal_approval` なし） | 確認済み |
| `ContractType` に `fixed_price` のみ（`contract` なし） | 確認済み |
| Meeting 作成時 両方 null でエラー | createMeeting バリデーション |
| Meeting 作成時 `dealId` のみで成功 | createMeeting・createMeetingAction 実装 |
| ステータスラベルが labels.ts に集約 | 確認済み |
| `converted` ラベルが「案件化済」 | labels.ts |
| `estimate_approval` ラベルが「見積承認中」 | labels.ts |
| ナビゲーション順序「顧客 > 引き合い > 案件 > 申請一覧」 | layout.tsx |
| 案件詳細ページに商談履歴セクション | deals/[id]/page.tsx |
| 顧客詳細ページに案件一覧セクション | clients/[id]/page.tsx |
| `updateDealAction` が admin/manager のみ | actions/deals.ts |
| 新規クエリに `organizationId` 条件 | リポジトリ全メソッドで確認 |
| 承認タイトルが `"案件化承認: ..."` | updateInquiryStatus.ts |
| シードデータの変数名と status 一致 | `inProgressInquiry` → `status: "in_progress"` |
| 依存方向 `actions → usecases → domain / infrastructure` | import 構造確認済み |
| `typecheck` green | verification-result.md: typecheck passed |

---

## 5. Observations

**軽微な懸念（修正不要）**

`dealContactRepository.ts` に ESLint warning `'organizationId' is defined but never used (line 43)` が残る。lint は warning のみで error なし。`data.organizationId` として所有確認クエリで使用されており機能上問題なし。許容範囲内。

**スコープ外変更なし**

request.md のスコープ外（承認リクエスト初期ステータス変更・承認完了後の自動フェーズ進行・顧客同時登録 UI・担当者登録 UI）に踏み込んだ変更は確認されていない。
