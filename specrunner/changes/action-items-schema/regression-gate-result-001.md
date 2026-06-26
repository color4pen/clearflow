# Regression Gate Result — action-items-schema — iter 1

- **verdict**: approved
- **iteration**: 001

## Summary

7件の所見をすべて検証した。HIGH / MEDIUM の修正はコードに確実に反映されており、LOW の Fix=no 所見は original review の決定通り「受理・据え置き」状態を維持している。回帰・矛盾は検出されなかった。

## Findings Verification

### Finding 1 — [MEDIUM] must 優先度ユニットテスト 13 件未実装
- **File**: `src/__tests__/domain/authorization.test.ts`
- **Original Fix**: Fix=yes（フィクサーが対処）
- **Status**: ✅ VERIFIED FIXED
- **Evidence**: `describe("canPerform - アクションアイテム (actionItem)")` ブロックが追加され、TC-007（`create: member が許可される`）、TC-008（`delete: member が拒否される`）、TC-009（`create: finance が拒否される`）、TC-010（`delete: admin が許可される`）が実装済み。さらに create/edit/toggle/delete/list/view の全ロール網羅テストも追加されている。

### Finding 2 — [MEDIUM] design.md D5 違反: FormData を使用（JSON body 形式が指定）
- **File**: `src/app/actions/actionItems.ts`
- **Original Fix**: Fix=no（スキップ指示だったが実装時に修正）
- **Status**: ✅ VERIFIED FIXED
- **Evidence**: 全サーバーアクション（`createActionItemAction` / `toggleActionItemAction` / `updateActionItemAction` / `deleteActionItemAction`）が `data: unknown` 引数を受け取り `z.object.safeParse(data)` で検証するパターンを採用。`formData.get()` の呼び出しは一切ない。

### Finding 3 — [LOW] due_date が要件では timestamptz だがスキーマは timestamp
- **File**: `drizzle/0007_nice_lily_hollister.sql`
- **Original Fix**: Fix=no（プロジェクト全体の `timestamp` 統一方針として後続で判断）
- **Status**: ✅ ACCEPTED（回帰なし）
- **Evidence**: `"due_date" timestamp` のまま（変更なし）。Fix=no の original 決定通り。プロジェクト全体の `timestamp` 統一方針と整合している。機能的影響は現状なし。

### Finding 4 — [LOW] ownership チェックがトランザクション外で実行される（TOCTOU）
- **File**: `src/application/usecases/createActionItem.ts`
- **Original Fix**: Fix=no（機能的問題なしとして据え置き）
- **Status**: ✅ ACCEPTED（回帰なし）
- **Evidence**: `createActionItem.ts` L26-53・`updateActionItem.ts` L33-65 の ownership チェックが `db.transaction()` 開始前に実行される状態を維持。domain-invariants-result-002.md でも「持ち越し（LOW、機能上の問題なし）」として確認済み。セキュリティ上の保護は FK 制約が担保。

### Finding 5 — [LOW] リポジトリ関数名が spec（delete）と実装（deleteById）でドリフト
- **File**: `src/infrastructure/repositories/actionItemRepository.ts`
- **Original Fix**: Fix=no（次のリファクタリング機会に対処）
- **Status**: ✅ ACCEPTED（回帰なし）
- **Evidence**: `export async function deleteById(...)` のまま（変更なし）。`deleteActionItem.ts` も `actionItemRepository.deleteById(...)` を呼び出しており動作上の問題はない。Fix=no の original 決定通り。

### Finding 6 — [HIGH] assigneeId の組織帰属検証が欠落（createActionItem）
- **File**: `src/application/usecases/createActionItem.ts`
- **Original Fix**: domain-invariants HIGH 所見として修正必須
- **Status**: ✅ VERIFIED FIXED
- **Evidence**: L27-32 にチェックが追加されている:
  ```ts
  if (data.assigneeId) {
    const assignee = await userRepository.findById(data.assigneeId, data.organizationId);
    if (!assignee) {
      return { ok: false, reason: "担当者が見つかりません" };
    }
  }
  ```
  `userRepository.findById(id, organizationId)` は `eq(users.id, id) AND eq(users.organizationId, organizationId)` で org スコープ済み（`userRepository.ts:81` で確認）。クロステナント参照は不可能になった。

### Finding 7 — [HIGH] assigneeId の組織帰属検証が欠落（updateActionItem）
- **File**: `src/application/usecases/updateActionItem.ts`
- **Original Fix**: domain-invariants HIGH 所見として修正必須
- **Status**: ✅ VERIFIED FIXED
- **Evidence**: L33-38 にチェックが追加されている:
  ```ts
  if (data.assigneeId !== undefined && data.assigneeId !== null && data.assigneeId !== existing.assigneeId) {
    const assignee = await userRepository.findById(data.assigneeId, data.organizationId);
    if (!assignee) {
      return { ok: false, reason: "担当者が見つかりません" };
    }
  }
  ```
  `undefined`（未変更）・`null`（クリア）・同値（変更なし）の3ケースを正しく除外してチェックを実行。`existing` は org-scoped な `actionItemRepository.findById(id, organizationId)` で取得済みのため安全。

## Regression Check

| Finding | Severity | 修正要否 | 現状 | 判定 |
|---------|----------|---------|------|------|
| 1 — 認可テスト未実装 | MEDIUM | Fix=yes | TC-007〜TC-010 実装済み | ✅ |
| 2 — FormData / JSON body | MEDIUM | Fix=no | JSON body パターンに修正済み | ✅ |
| 3 — timestamp vs timestamptz | LOW | Fix=no | 据え置き（変更なし） | ✅ |
| 4 — TOCTOU | LOW | Fix=no | 据え置き（変更なし） | ✅ |
| 5 — deleteById 命名ドリフト | LOW | Fix=no | 据え置き（変更なし） | ✅ |
| 6 — createActionItem assigneeId | HIGH | 修正必須 | 修正済み | ✅ |
| 7 — updateActionItem assigneeId | HIGH | 修正必須 | 修正済み | ✅ |

**回帰**: なし  
**矛盾**: なし（Finding 6/7 の assigneeId チェック追加は Finding 4 の TOCTOU と同じトランザクション外パターンだが、Finding 4 は LOW として受理済みの設計であり矛盾なし）
