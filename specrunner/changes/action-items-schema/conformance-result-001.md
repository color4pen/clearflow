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
| tasks.md | yes | T-01〜T-09 全チェックボックスが [x] 完了 |
| design.md | yes | D1〜D6 全設計判断が実装に反映されている |
| spec.md | yes | 全 5 Requirements の SHALL/MUST と全シナリオを満たす |
| request.md | yes | 全 8 受け入れ基準が満たされている |

---

## J1: Tasks completion

tasks.md のすべてのチェックボックスが `[x]` 完了であることを確認した。

| タスク | 説明 | 状態 |
|--------|------|------|
| T-01 | Drizzle スキーマに action_items テーブルを追加 | ✓ 完了 |
| T-02 | ActionItem ドメインモデル型の定義 | ✓ 完了 |
| T-03 | authorization に actionItem エンティティを追加 | ✓ 完了 |
| T-04 | actionItemRepository の実装 | ✓ 完了 |
| T-05 | ユースケースの実装 | ✓ 完了 |
| T-06 | サーバーアクションの実装 | ✓ 完了 |
| T-07 | Drizzle マイグレーション生成 | ✓ 完了 |
| T-08 | 既存データのマイグレーション SQL 作成 | ✓ 完了 |
| T-09 | ビルド検証と型チェック | ✓ 完了 |

判定: **pass**

---

## J2: Design compliance

design.md の各設計判断に対する実装の適合性を確認した。

| 決定 | 内容 | 適合 |
|------|------|------|
| D1 | 全紐づけ先 nullable、CHECK 制約なし | ✓ DDL に meeting_id/deal_id/inquiry_id が nullable、CHECK 制約なし |
| D2 | assignee_id を users FK とし、移行時は description に付記 | ✓ assignee_id uuid FK (set null)、0008 SQL で `[担当: ...]` prefix 付記 |
| D3 | authorization.ts に "actionItem" エンティティを追加 | ✓ Entity union に "actionItem" 追加、PERMISSION_MATRIX に list/view/create/edit/toggle/delete 定義 |
| D4 | マイグレーションは DDL (0007) + 手動データ移行 SQL (0008) の 2 段階 | ✓ drizzle/0007_nice_lily_hollister.sql（DDL）+ drizzle/0008_migrate_action_items_data.sql（DML）|
| D5 | サーバーアクションは JSON body 形式（data: unknown + zod.safeParse） | ✓ 全 4 アクションが `data: unknown` を受け取り `safeParse(data)` パターンを採用 |
| D6 | インデックス戦略（org_done / meeting_id / deal_id の 3 つ） | ✓ 3 インデックスが DDL に含まれる |

判定: **pass**

---

## J3: Spec compliance

spec.md の各 Requirement（SHALL/MUST）とシナリオを確認した。

### Requirement: アクションアイテムのテナント分離

- **MUST**: リポジトリ層のすべてのクエリに `organization_id` 条件を含む
  - `findById`: `and(eq(id), eq(organizationId))` ✓
  - `findByOrganization`: `organizationId` を先頭条件に設定 ✓
  - `update`/`deleteById`: `and(eq(id), eq(organizationId))` ✓
  - `findByDeal`/`findByMeeting`: `and(eq(dealId), eq(organizationId))` ✓
- **MUST NOT**: ユースケース層はリクエストボディの organizationId を使用しない
  - 全サーバーアクションで `session.user.organizationId` を使用 ✓

シナリオ「組織 A のユーザーが組織 B のアクションアイテムを取得できない」→ `findByOrganization(orgAId)` は `WHERE organization_id = orgAId` のみ返す ✓  
シナリオ「他組織のアクションアイテムを ID で取得できない」→ `findById(itemId, orgAId)` で organizationId 不一致なら null ✓

### Requirement: 紐づけ先エンティティの ownership チェック

- **MUST**: サーバーアクションは create/update 時に紐づけ先の organizationId が一致することを検証
  - `createActionItem` usecase: dealId/meetingId/inquiryId の各 `findById(id, organizationId)` ✓
  - `updateActionItem` usecase: 変更がある場合のみ新しい紐づけ先を `findById(id, organizationId)` で確認 ✓

シナリオ「他組織の案件に紐づけられない」→ `dealRepository.findById(id, orgId)` が null → エラーリターン ✓  
シナリオ「自組織の案件に紐づけられる」→ `findById` で found → 作成成功 ✓

### Requirement: サーバーアクションでの認可チェック

- **MUST**: すべてのサーバーアクションで `canPerform` による認可チェックを実行
  - `createActionItemAction`: `canPerform(role, "actionItem", "create")` ✓
  - `toggleActionItemAction`: `canPerform(role, "actionItem", "toggle")` ✓
  - `updateActionItemAction`: `canPerform(role, "actionItem", "edit")` ✓
  - `deleteActionItemAction`: `canPerform(role, "actionItem", "delete")` ✓
- **MUST**: 権限なし → エラーメッセージと共に拒否
  - 全アクションで「この操作を実行する権限がありません」を返す ✓

シナリオ「member がアクションアイテムを作成できる」→ `canPerform("member","actionItem","create")` = true（ADMIN_MANAGER_MEMBER に member 含む）✓  
シナリオ「権限のないロールが削除できない」→ `canPerform(role,"actionItem","delete")` = false でエラー返却 ✓

### Requirement: done 状態トグル

- **MUST**: `done` フラグを反転する
  - `toggleActionItemDone`: `{ done: !existing.done }` でアップデート ✓
- **MUST**: 存在しない場合/組織不一致の場合はエラー
  - `findById(id, organizationId)` → null → `{ ok: false, reason: "..." }` ✓

シナリオ「未完了→完了」「完了→未完了」の両方: `!existing.done` による反転でカバー ✓

### Requirement: マイグレーションで既存データが保持される

- **MUST**: meetings.action_items JSON を action_items テーブルに移行
  - `0008_migrate_action_items_data.sql` に `INSERT ... SELECT ... FROM meetings, jsonb_array_elements(m.action_items)` ✓
- **MUST**: assignee 付き description を `[担当: {assignee}] {description}` に変換し、assignee_id = null
  - CASE 式で条件分岐、assignee_id に NULL 挿入 ✓
- **MUST NOT**: meetings.action_items カラムを削除しない
  - マイグレーション SQL に DROP COLUMN なし ✓

シナリオ「JSON 埋め込みのアクションアイテムがテーブルに移行される」✓  
シナリオ「assignee の名前が description に付記される」✓  
シナリオ「meetings.action_items カラムが残る」✓

### Requirement: revalidatePath の適切な呼び出し

- **MUST**: `/dashboard` を常に revalidate
  - 全 4 アクションで `revalidatePath("/dashboard")` ✓
- **MUST**: dealId がある場合 `/deals/[dealId]` を revalidate
  - create/toggle/update/delete 全アクションで対応 ✓
- **MUST**: meetingId がある場合 `/deals/[dealId]/meetings/[meetingId]` を revalidate
  - `meetingRepository.findById` で dealId を取得して revalidate ✓

シナリオ「dealId 付き作成時に deal ページ再検証」✓  
シナリオ「meetingId 付き作成時に meeting ページ再検証」✓

判定: **pass**

---

## J4: Acceptance criteria

request.md の受け入れ基準に対する適合性を確認した。

| 基準 | 確認内容 | 適合 |
|------|----------|------|
| action_items テーブルが存在する | drizzle/0007_nice_lily_hollister.sql に CREATE TABLE "action_items" あり | ✓ |
| ActionItem モデル型が定義されている | src/domain/models/actionItem.ts に export type ActionItem あり、domain/models/index.ts から re-export | ✓ |
| actionItemRepository の CRUD が実装されている | create/findById/findByOrganization/update/deleteById + findByDeal/findByMeeting 全実装、バレルファイルに export | ✓ |
| 各ユースケースが organizationId を検証する | 全 6 ユースケースで organizationId を findById 条件に使用 | ✓ |
| サーバーアクションに認可チェックと ownership チェックがある | 全 4 アクションで canPerform + usecase 内で ownership 検証 | ✓ |
| 既存データのマイグレーションが正常に完了する | 0008 SQL が jsonb_array_elements 展開、description 付記、assignee_id=null | ✓ |
| meetings.action_items カラムが残っている | マイグレーション SQL に DROP COLUMN なし | ✓ |
| `typecheck && test` が green | verification-result.md: build/typecheck/test/lint 全フェーズ passed (970 tests pass) | ✓ |

判定: **pass**

---

## 総合所見

実装はすべての判定項目を満たしており、conformance review を承認する。

- テナント分離が repository 層で徹底されており、organizationId が全クエリの条件に含まれる
- ownership チェックが usecase 層で実施され、サーバーアクションからリクエストボディの組織 ID を使わない設計が守られている
- authorization の PERMISSION_MATRIX に actionItem が正しく追加され、authorization.test.ts にも actionItem の describe ブロック（TC-007〜TC-010 含む）が追加されている
- revalidatePath のパスが spec 定義通りに設定されている
- DDL/DML の 2 段階マイグレーションが D4 に従い分離されており、meetings.action_items カラムの保持も確認済み

コードレビュー（review-feedback-001.md）の所見についての補足:
- finding #2（FormData vs JSON body）: 実際のコードは `data: unknown` + `safeParse(data)` を使う JSON body 形式であり、D5 と整合している
- finding #5（deleteById 命名ドリフト）: 機能上の問題はなく、conformance に影響しない
