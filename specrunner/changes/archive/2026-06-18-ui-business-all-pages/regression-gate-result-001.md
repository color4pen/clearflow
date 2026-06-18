# Regression Gate Result — iteration 001

- **verdict**: needs-fix
- **iteration**: 001

## Verification Summary

### Finding: TC-003 (BTN_DANGER) と TC-004 (BTN_SUBMIT) の unit テストが未実装

| Item | Status |
|------|--------|
| `styles.ts` に `BTN_DANGER = "text-[#c0392b] underline text-xs"` が定義されている | ✅ 確認済み |
| `styles.ts` に `BTN_SUBMIT = "bg-[#2980b9] text-white ... rounded-none"` が定義されている | ✅ 確認済み |
| `uiBusinessStyle.test.ts` に TC-003 (BTN_DANGER) のアサーションが存在する | ❌ **未修正** |
| `uiBusinessStyle.test.ts` に TC-004 (BTN_SUBMIT) のアサーションが存在する | ❌ **未修正** |

## Findings

| # | Severity | File | Description | Resolution |
|---|----------|------|-------------|------------|
| 1 | high | src/__tests__/static/uiBusinessStyle.test.ts | TC-003 (BTN_DANGER) と TC-004 (BTN_SUBMIT) のアサーションが依然として未実装。code-fixer コミット（4c26680）はイベントログ・state.json のみを変更しており、テストファイルへの追記が行われていない。`BTN_DANGER` が `text-[#c0392b]` と `underline` を含むこと、`BTN_SUBMIT` が `bg-[#2980b9]`・`text-white`・`rounded-none` を含むことのアサーションを `uiBusinessStyle.test.ts` に追加する必要がある。 | fixable |

## Details

`src/__tests__/static/uiBusinessStyle.test.ts` の現在の `describe` ブロック構成:
- TC-021 (RequestWithSteps型): 実装済み
- TC-022 (findAllWithStepsByOrganization): 実装済み
- TC-032 / TC-033 (BTN_PRIMARY_DISABLED / SELECT_BASE): 実装済み
- **TC-003 (BTN_DANGER): 未実装**
- **TC-004 (BTN_SUBMIT): 未実装**

`styles.ts` 側の定数値は正しく定義されているため、テストを追加するだけで green になる。
TC-032/TC-033 のパターン（`readSrc` → `toContain`）を踏襲すれば実装は容易。
