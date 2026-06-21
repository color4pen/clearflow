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
| tasks.md | yes | T-01〜T-20 全チェックボックスが [x] |
| design.md | yes | D1〜D8 全設計判断が実装に反映されている |
| spec.md | yes | 全 Requirement (SHALL/MUST) と Scenario が実装でカバーされている |
| request.md | yes | 全受け入れ基準を充足。build/typecheck/test 全パス |

---

## 1. Tasks Completion

T-01〜T-20 の全チェックボックスが `[x]`。未完了タスクなし。

---

## 2. Spec Requirements

| Requirement | Status | Evidence |
|---|---|---|
| Contract 作成は Deal が won の場合のみ (SHALL) | 充足 | `createContract.ts:29` — `deal.phase !== "won"` でエラー返却 |
| 同一 Deal に2件目の Contract 作成不可 (MUST) | 充足 | `createContract.ts:33-35` — `findByDealId` で既存チェック後エラー返却 |
| ステータス遷移 active → completed/cancelled のみ (SHALL) | 充足 | `contractTransition.ts` — TERMINAL_STATUSES からの遷移を全て false、自己遷移も false |
| 契約操作は admin/manager のみ (SHALL) | 充足 | `contracts.ts:46-48,112-114,168-170` — create/update/updateStatus にロールガードあり |
| テナント分離 — 全クエリに organizationId (SHALL) | 充足 | `contractRepository.ts` — 全5メソッドに organizationId 条件あり |
| 監査ログを同一 TX 内で記録 (MUST) | 充足 | `createContract.ts`, `updateContract.ts`, `updateContractStatus.ts` — `db.transaction` 内で `auditLogRepository.create` を呼び出し |
| 案件詳細に契約セクション表示 (SHALL) | 充足 | `deals/[id]/page.tsx:170-206` — `deal.phase === "won"` ガード付きで条件分岐 |

---

## 3. Design Decisions

| Decision | Status | Evidence |
|---|---|---|
| D1: 1 Deal = 1 Contract（unique 制約） | 充足 | `schema.ts:384` — `unique("contracts_deal_id_unique").on(table.dealId)` |
| D2: Contract に clientId を直接保持 | 充足 | `schema.ts:369-371` — `clientId` uuid NOT NULL FK to clients |
| D3: contractType を text 型で管理 | 充足 | `schema.ts:373` — `text("contract_type")` nullable |
| D4: renewalType を enum で管理 | 充足 | `schema.ts:61,378` — `renewalTypeEnum` 定義・適用済み |
| D5: ステータス遷移を domain service で管理 | 充足 | `domain/services/contractTransition.ts` — `canContractTransition` として re-export |
| D6: createContract で Deal 情報を初期値として引き継ぎ | 充足 | `createContract.ts:39-44` — title/contractType/amount/startDate/endDate/clientId を Deal から取得し明示値で上書き |
| D7: 契約操作は admin/manager のみ | 充足 | `contracts.ts` — 書き込み3 Actions にロールガードあり、list/get は全ロール公開 |
| D8: 契約一覧で clients を JOIN | 充足 | `contractRepository.ts:100` — `innerJoin(clients, eq(contracts.clientId, clients.id))` |

---

## 4. Acceptance Criteria (request.md)

| Criterion | Status |
|---|---|
| `bun run build` 成功 | 充足 — build passed (10.5s, exit 0) |
| `bun test` 全件 green | 充足 — 526 pass, 0 fail |
| `contracts` テーブルが schema.ts に定義 | 充足 — `schema.ts:359-385` |
| `contractStatusEnum` が ["active", "completed", "cancelled"] | 充足 — `schema.ts:56-60` |
| `renewalTypeEnum` が ["one_time", "recurring"] | 充足 — `schema.ts:61` |
| Deal not won → エラー | 充足 — `createContract.ts:29-31` |
| 同一 Deal 2件目 → エラー | 充足 — `createContract.ts:33-36` |
| Deal 情報（title/contractType/estimatedAmount 等）が引き継がれる | 充足 — `createContract.ts:39-44` |
| active → completed 許可 | 充足 — `contractTransition.ts` — TERMINAL_STATUSES に active なし |
| active → cancelled 許可 | 充足 — 同上 |
| completed → active 拒否 | 充足 — `contractTransition.ts:12-14` — TERMINAL_STATUSES.includes(from) → false |
| 全クエリに organizationId 条件 | 充足 — contractRepository 全メソッド確認済み |
| 監査ログ記録（create/update/updateStatus） | 充足 — 各 usecase でトランザクション内記録 |
| ダッシュボードヘッダーに「契約」リンク | 充足 — `layout.tsx:43-48` — 「案件」後・「申請一覧」前に配置、全ロール表示 |
| 案件詳細に契約セクション（won 時: ボタン/リンク） | 充足 — `deals/[id]/page.tsx:170-206` |
| マイグレーションファイル生成 | 充足 — `drizzle/0003_magenta_red_ghost.sql` — CREATE TYPE/TABLE 含む |
| 依存方向 actions → usecases → domain/infrastructure 遵守 | 充足 — 各レイヤーの import に逆方向参照なし |
| typecheck green | 充足 — typecheck passed (0.9s, exit 0) |

---

## 5. Additional Notes

- lint は 7 warnings（errors なし）。`deals/[id]/page.tsx` の `DealEditForm` 未使用 import は本変更前から存在する pre-existing 警告であり、本 PR の変更に起因しない。
- `contractTransition.ts` のロジック: TERMINAL_STATUSES からの遷移を全て false、自己遷移も false とすることで `active` → `completed`/`cancelled` のみ通過する。`ContractStatus` が3値固定のため網羅性に問題なし。
- `dealsRelations` で `contract: one(contracts)` を fields/references なしで宣言（Drizzle の逆引き推論パターン）。FK は `contracts.dealId` 側にあるため正しい宣言形式。
- シードデータの truncation 順序: `dealContacts` 削除後・`deals` 削除前に `contracts` を削除しており、FK 制約の順序として正しい。
