# Regression Gate Result — Iteration 1

- **change**: approval-flow-integration
- **iteration**: 1
- **verdict**: needs-fix

## Findings Summary

| # | Severity | Status | Finding |
|---|----------|--------|---------|
| 1 | HIGH | fixed | runPostApprovalLinkage の例外が ok: false を漏出させる |
| 2 | MEDIUM | fixed | TC-011 / TC-005 のテストが欠落 |
| 3 | LOW | regression | TC-014 / TC-016 のテストが欠落 |

---

## Finding 1 (HIGH) — runPostApprovalLinkage の例外が ok: false を漏出させる

**Status**: fixed

`runPostApprovalLinkage`（`src/application/usecases/approveRequest.ts` L28–L125）内の各 catch ブロックで、`auditLogRepository.create` の呼び出しをさらに try-catch で二重ネストしている（L60–L75, L107–L122）。
どちらの `catch {}` も例外を完全に破棄するため、`runPostApprovalLinkage` 自体は呼び出し元に例外を伝播しない。

no-steps フロー（L191）・multi-step フロー（L389）ともにアウター try-catch 内から呼んでいる点は変わっていないが、`runPostApprovalLinkage` が非スローであることが保証されており、アウター catch への伝播は発生しない。設計判断 D3 および「連動処理失敗時も承認を成功させる」要件は充足されている。

---

## Finding 2 (MEDIUM) — TC-011 / TC-005 のテストが欠落

**Status**: fixed

`src/__tests__/usecases/approvalFlowIntegration.test.ts` に以下が追加されている。

- **TC-011**（L221–L232）: `steps.length === 0` ブロック内に `runPostApprovalLinkage` の呼び出しが存在することを静的解析で確認している。
- **TC-005**（L239–L258）: `mapRow` 関数内に `sourceType: row.sourceType` および `sourceId: row.sourceId` のマッピングが存在することを静的解析で確認している。

---

## Finding 3 (LOW) — TC-014 / TC-016 のテストが欠落

**Status**: regression
- **severity**: low
- **resolution**: fixable

`runPostApprovalLinkage` L34 に先頭ガード `if (!sourceType || !sourceId) return;` が実装されているが、このガードの存在を確認するテストが追加されていない。テストファイル全体（259 行）を確認したところ、TC-014・TC-016 に対応するテストケースは存在しない。

**必要な修正**:
`src/__tests__/usecases/approvalFlowIntegration.test.ts` に以下の 2 テストを追加する。

- **TC-014**: `runPostApprovalLinkage` 先頭に `!sourceType || !sourceId` ガードが存在し、`sourceType が null` の場合は連動処理を実行しないことを静的解析で確認する
- **TC-016**: ガード通過後に `"inquiry"` / `"deal"` 以外の `sourceType` が渡された場合は何も実行されない（`if (sourceType === "inquiry")` / `if (sourceType === "deal")` 以外の分岐がないこと）を静的解析で確認する

修正方法はいずれも静的解析（`readSrc` + `expect(src).toContain(...)`）で対応可能。
