# Regression Gate Result — iteration 001

- **verdict**: approved
- **iteration**: 001

## Summary

Findings Ledger 2 件を検証した。Finding 1（MEDIUM）は修正済みを確認。Finding 2（LOW）はレビュー時点で Fix=no（スコープ外）と判定されており、現コードにも修正は存在しないが、これはリグレッションではなく既知の受け入れ済み事項である。クリティカル・HIGH のリグレッションは存在しない。

## Verification Results

### Finding 1 [MEDIUM] — activityConfig の振る舞いテストが未実装（env 変数操作）

- **File**: `src/__tests__/lib/activityConfig.test.ts`
- **Status**: ✅ FIXED — 修正済み・リグレッションなし

**確認内容**:

`activityConfig.test.ts` に TC-026〜TC-031 が全件実装されていることを確認した。

| TC | 内容 | 実装行 |
|----|------|--------|
| TC-026 | `ACTIVITY_HIDDEN_ACTIONS` 未設定 → 空配列 | L23–26 |
| TC-027 | カンマ区切り文字列 → 正しく分割された配列 | L29–32 |
| TC-028 | 各要素の trim 動作 | L35–38 |
| TC-029 | `ACTIVITY_FEED_ENABLED="true"` → true | L53–56 |
| TC-030 | `ACTIVITY_FEED_ENABLED` 未設定 → false | L59–62 |
| TC-031 | `ACTIVITY_FEED_ENABLED="false"` → false | L65–68 |

`afterEach` で env 変数を元の値に復元するクリーンアップも正しく実装されており、テスト間の干渉を防いでいる。

---

### Finding 2 [LOW] — タイムライン行の表示テキストに目的語の重複がある

- **File**: `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx`
- **Status**: ⚠️ NOT FIXED — ただしリグレッションではない（Fix=no / 受け入れ済み）

**確認内容**:

`DealActivitySection.tsx` のフォーマットは引き続き `{actorName} が {targetLabel} を {actionLabel}` であり、actionLabel（例: "案件を更新"）に目的語が内包されているため "John が 案件 を 案件を更新" のような重複表現が発生する状態のまま。

ただし、`review-feedback-001.md` の Findings テーブルにおいて本指摘は Fix 列が `no`（スコープ外・修正対象外）と明示されており、レビュー verdict は `approved` である。修正が行われていないこと自体は想定通りの結果であり、リグレッション（一度修正されたものが壊れた）には該当しない。

**判定**: 既知の受け入れ済み LOW 指摘。後続イテレーションでの対応を推奨（actionLabel を動詞のみに変更するか、targetLabel の重複表示を除去する）。

---

## Conclusion

| Finding | Severity | Fixed? | Regression? |
|---------|----------|--------|-------------|
| activityConfig 振る舞いテスト未実装 | MEDIUM | ✅ Yes | No |
| タイムライン行の目的語重複 | LOW | ❌ No (Fix=no) | No — 受け入れ済み |

クリティカル・HIGH のリグレッションは存在しない。verdict: **approved**。
