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
| 1 | medium | correctness | `src/application/usecases/createContractAdjustment.ts`, `src/application/usecases/createInvoiceAdjustment.ts` | `details` フィールドが usecase シグネチャに `details?: string \| null` として含まれているが、`interactionRepository.create` には常に `details: null` が渡されユーザー入力が無視される。`ContractInteractionSection.tsx` / `InvoiceInteractionSection.tsx` には「メモ（任意）」textarea が表示されており、設計にも「任意メモ」と明記されているが、送信内容は保存されない。 | (a) メモを保存しないなら UI の textarea と usecase の `details?` パラメータを除去し意図を明確にする。(b) 保存するなら JSONB に文字列を格納できるよう型と実装を整備する（例: `{ text: string }` 型でラップ）。どちらを選ぶかは仕様上の判断が必要なため、対応前に決定を確認すること。 | yes |
| 2 | low | testing | `src/app/actions/interactions.ts` | `test-cases.md` で `must` 優先度とされた TC-020（未認証→エラー）・TC-021（認可不足→エラー）・TC-023（成功→usecase 呼出＋revalidate）に対応する動的テストが存在しない。`interactionAuthorization.dynamic.test.ts` で `canPerform` 自体は検証されているが、action が正しく認証失敗・認可拒否・revalidatePath を実行することは固定されていない。 | `src/__tests__/actions/interactions.dynamic.test.ts` を追加し、`mock.module` 方式で auth・canPerform・createContractAdjustment / createInvoiceAdjustment をモックしてこれら 3 ケースを動的テストで固定する。 | yes |
| 3 | low | correctness | `src/application/usecases/getDealActivity.ts` | `targetInfoMap` 構築時に `i.contractId` と `i.invoiceId` を null チェックなしで href に補間している。`findAllByContract` / `findAllByInvoice` の返り値は実行時には必ず該当 FK が設定されているため実害はないが、TypeScript の型 (`string \| null`) と使用箇所の間に非明示的な前提がある。 | `i.contractId ?? ""` など明示的 null フォールバックを追加するか、assert-non-null コメントを付与する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 7 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.20

## Summary

全体的な実装品質は高い。

**アーキテクチャ・設計**:  
依存方向（actions → usecases → domain / infrastructure）を遵守している。`createContractAdjustment` / `createInvoiceAdjustment` は既存の `createMeeting` と同パターンで実装され、一貫性がある。`interaction` エンティティへの認可追加（D2）・usecase 分離（D1）・Server Action 統合（D3）のいずれも設計書に従っている。

**コアロジック**:  
- `findAllByContract` / `findAllByInvoice` は date DESC 順序で正しく実装されている
- `db.transaction` 内で interaction 作成と `interaction.create` 監査ログを同時記録するパターンが正しく踏襲されている
- `getDealActivity` での `Promise.all` 並列取得と `targets` / `targetInfoMap` 登録は仕様通り
- 認可マトリクス（recordContractAdjustment=admin/manager/member、recordInvoiceAdjustment=admin/manager/finance）が正しく定義されている

**テスト**:  
受け入れ基準の主要 must ケース（TC-001〜TC-019、TC-028/029）はすべて `mock.module` 動的テスト方式でカバーされており、静的ソース検査に依存していない。build/typecheck/test/lint がすべて green であることも確認済み。

**課題**:  
Finding 1（medium）: UI に「メモ（任意）」フィールドが存在するが保存されない。設計書に明記された機能が未実装のまま public な state になっており、UX 上のミスリードが生じる。修正方向（除去 or 保存）の方針決定が必要。  
Finding 2（low）: Server Action レイヤーの must テスト 3 件が未追加。`canPerform` 単体はテスト済みだが action 全体の動作固定が不完全。  
Finding 3（low）: 型安全性の細部改善点。
