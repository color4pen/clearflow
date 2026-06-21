# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | correctness | src/application/usecases/removeDealContact.ts | `removeDealContact` UC がトランザクション外で監査ログを記録する。`deleteByDealAndContact` 成功後に `auditLogRepository.create` が例外を投げると、削除は確定しているが監査証跡が欠落する。`addDealContact` は同一トランザクション内で実行しており不整合がある。タスク仕様 T-06 では removeDealContact の「同一トランザクション内」は明記されていないが、監査ログの整合性観点で懸念がある。 | `addDealContact` と同様に `db.transaction()` でラップし、削除と監査ログ記録を原子的に実行する。 | no |
| 2 | low | maintainability | src/app/(dashboard)/deals/[id]/DealContactsSection.tsx | `addDealContactAction` / `removeDealContactAction` の戻り値 `{ success: false, message }` を form action ラッパーが受け取るが、UI への反映ロジックがない。重複追加エラー（"この担当者はすでに登録されています"）などが発生しても画面上に通知されず、ユーザーが失敗に気づけない。T-08 の受け入れ基準にエラー表示の要件がないためスコープ外とも解釈できる。 | `useActionState` パターンに切り替え、アクション結果をステートとして保持してエラーメッセージを表示する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 9 | 0.10 |

- **total**: 8.35

## Summary

全 9 件の受け入れ基準を満たしており、build / typecheck / test / lint の 4 フェーズも全件 passed。依存方向（actions → usecases → domain / infrastructure）の遵守は全新規ファイルで確認した。

主要実装の評価:

- `createInquiryAction`: `__new__` の clientId 除外と `newClientName` の空文字ガードが正しく実装されており、TC-006（clientId 指定時は newClientName を無視）にも対応している。
- `addDealContact` / `removeDealContact` UC: addDealContact は db.transaction() で原子性を保証。removeDealContact はトランザクションなし（F-001、low）。
- `createClientContact` UC: `findById` でテナント検証後に `createContact` を呼び出す設計（TC-019 の要件を満たす）。
- `DealContactsSection.tsx`: 追加済み担当者を `availableContacts` で除外する UI ロジックが適切。ただしアクションエラーの非表示（F-002、low）は UX 上の懸念として次イテレーション以降で対処推奨。
- `findContactsByClientId` のテナント前提条件: JSDoc に明記されており、呼び出し元（deals/[id]/page.tsx）で inquiry を organizationId 付き取得済みのため安全。
- シードデータ: wonDeal に key_person + technical の 2 ロール、proposedDeal に decision_maker の 1 ロールで合計 3 件（T-12 ✓）。

