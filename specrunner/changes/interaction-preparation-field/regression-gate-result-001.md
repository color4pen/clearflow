# Regression Gate Result — iteration 001

- **verdict**: approved
- **iteration**: 001

## Verification Summary

`git diff main...HEAD` を確認し、台帳の 3 件それぞれについて現在のコードを精査した。

---

### Finding 1: design.md D5 と実装の齟齬（Textarea vs MarkdownTextarea）

**Status: 未修正（意図的な据え置き）**

- `specrunner/changes/interaction-preparation-field/design.md` D5 は依然として「作成フォームでは `MarkdownTextarea` ではなく通常の `Textarea` を使用する」と記述している。
- `DealMeetingForm.tsx` の実装は `MarkdownTextarea` を使用している（`git diff` 確認済み）。
- `review-feedback-001.md` Finding #1 の `Fix: no` により、レビュアーが当イテレーションでの修正を明示的に据え置いた。
- **回帰ではない**（元から修正されていない）。

---

### Finding 2: CreateMeetingState.errors / UpdateMeetingState.errors に preparation フィールドが未追加

**Status: 未修正（意図的な据え置き）**

- `src/app/actions/meetings.ts` の `CreateMeetingState.errors`（47–59 行）および `UpdateMeetingState.errors`（240–252 行）に `preparation?: string[]` が追加されていない。
- `review-feedback-001.md` Finding #2 の `Fix: no` により据え置き。
- **回帰ではない**（元から修正されていない）。

---

### Finding 3: updateMeetingAction の空文字 preparation が null に正規化されない

**Status: 未修正（意図的な据え置き）**

- `src/app/actions/meetings.ts` 327 行: `preparation: preparationRaw !== null ? preparationRaw : undefined`
- 空文字（`""`）は null に変換されず、そのまま usecase に渡される。
- `createMeetingAction` の `formData.get("preparation") || undefined` → `?? null` とは動作が異なる。
- `review-feedback-001.md` Finding #3 の `Fix: no` により据え置き。
- **回帰ではない**（元から修正されていない）。

---

## Conclusion

台帳の 3 件はいずれも `review-feedback-001.md` で `Fix: no`（当イテレーション修正不要）と判定されており、現コードにおいても未修正のまま残っている。修正を行っていないため「修正が戻った（回帰）」ではなく、「意図的に据え置かれた既知の LOW 所見」である。HIGH/CRITICAL の回帰は存在しない。
