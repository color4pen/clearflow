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
| tasks.md | ✅ yes | T-01〜T-15 全チェックボックス [x] 完了済み |
| design.md | ✅ yes | D1〜D6 すべての設計判断が実装に反映されている |
| spec.md | ✅ yes | 全 SHALL/MUST 要件・全 Scenario が実装済み |
| request.md | ✅ yes | 全受け入れ基準を充足。bun test 1028/0 green・build・typecheck 全件通過 |

---

## Detail

### 1. Task Completeness（tasks.md）

T-01〜T-15 のすべてのサブチェックボックスが `[x]` で完了済み。

| Task | 内容 | Status |
|------|------|--------|
| T-01 | schema.ts — contracts.version 追加 | ✅ |
| T-02 | Drizzle マイグレーション生成 | ✅ |
| T-03 | Contract ドメインモデル version 追加 | ✅ |
| T-04 | Invoice ドメインモデル version 追加 | ✅ |
| T-05 | contractRepository.mapRow version 追加 | ✅ |
| T-06 | invoiceRepository.mapRow version 追加 | ✅ |
| T-07 | contractRepository.update 楽観的ロック実装 | ✅ |
| T-08 | invoiceRepository.update 楽観的ロック実装 | ✅ |
| T-09 | invoiceRepository.updateStatus 楽観的ロック実装 | ✅ |
| T-10 | updateContract usecase 統合 | ✅ |
| T-11 | updateContractStatus usecase 統合 | ✅ |
| T-12 | updateInvoice usecase 統合（freshInvoice.version 非使用を含む） | ✅ |
| T-13 | updateInvoiceStatus usecase 統合 | ✅ |
| T-14 | 楽観的ロック静的解析テスト追加 | ✅ |
| T-15 | 全体検証（build / typecheck / test） | ✅ |

### 2. Design Decision Conformance（design.md）

| Decision | 要件 | 実装確認箇所 | Status |
|----------|------|-------------|--------|
| D1 | version(integer) による楽観的ロック | `schema.ts` に `integer("version").notNull().default(1)` | ✅ |
| D2 | 差分マイグレーション（ADD COLUMN のみ） | `drizzle/0009_contract_invoice_version.sql` — ALTER TABLE ADD COLUMN のみ / DROP なし | ✅ |
| D3 | `expectedVersion: number` を独立パラメータとして追加（data に混在しない） | `contractRepository.update(id, orgId, data, expectedVersion: number, tx?)` | ✅ |
| D4 | ロック失敗を `{ ok: false, reason: "..." }` で返す（例外送出なし） | 4 usecase すべてで `if (!updated) return { ok: false, reason: "..." }` | ✅ |
| D5 | エンティティ別メッセージ | 契約: "この契約は他のユーザーによって更新されました。画面を更新してください" / 請求: "この請求は..." | ✅ |
| D6 | create 経路の version 初期値は schema DEFAULT で保証 | `contractRepository.create` / `invoiceRepository.create` で version を明示指定せず DB DEFAULT 1 を適用 | ✅ |

### 3. Spec Requirements Conformance（spec.md）

| Requirement | SHALL/MUST | 実装確認 | Status |
|-------------|-----------|---------|--------|
| contracts テーブルに `version integer NOT NULL DEFAULT 1` | SHALL | `schema.ts` line 450 | ✅ |
| invoices テーブルに `version integer NOT NULL DEFAULT 1` | SHALL | `schema.ts` line 473 | ✅ |
| Contract 型に `version: number` | SHALL | `domain/models/contract.ts` line 21 | ✅ |
| Invoice 型に `version: number` | SHALL | `domain/models/invoice.ts` line 17 | ✅ |
| contractRepository.update — WHERE `eq(contracts.version, expectedVersion)` + SET `version + 1` + null 返却 | SHALL | `contractRepository.ts` lines 163–166 | ✅ |
| invoiceRepository.update — 同パターン | SHALL | `invoiceRepository.ts` lines 98–101 | ✅ |
| invoiceRepository.updateStatus — 同パターン | SHALL | `invoiceRepository.ts` lines 114–118 | ✅ |
| updateContract — ロック失敗時 MUST 返却メッセージ | SHALL/MUST | `updateContract.ts` line 82 | ✅ |
| updateContractStatus — ロック失敗時 MUST 返却メッセージ | SHALL/MUST | `updateContractStatus.ts` line 84 | ✅ |
| updateInvoice — ロック失敗時 MUST 返却メッセージ | SHALL/MUST | `updateInvoice.ts` line 96 | ✅ |
| updateInvoiceStatus — ロック失敗時 MUST 返却メッセージ | SHALL/MUST | `updateInvoiceStatus.ts` line 95 | ✅ |
| 作成時 version = 1 | SHALL | schema DEFAULT 1 → mapRow で version 取得 | ✅ |

**Scenario 確認（特記事項）**:

- version 一致 → 更新成功 / version+1 インクリメント: `eq(contracts.version, expectedVersion)` が一致した場合のみ `.returning()` が行を返す → `mapRow` 経由で version+1 の Contract/Invoice が返る ✅
- version 不一致 → null 返却: WHERE 不一致 → 更新行数 0 → `result[0]` が undefined → null 返却 ✅
- updateInvoice の freshInvoice.version 非使用: `invoice.version`（トランザクション開始前取得）を `expectedVersion` に渡す実装（`updateInvoice.ts` line 73）と、`expect(src).not.toContain("freshInvoice.version")` テストで二重検証済み ✅

### 4. Acceptance Criteria Conformance（request.md）

| 受け入れ基準 | 判定 | 根拠 |
|-------------|------|------|
| contracts / invoices テーブルに version カラム（差分マイグレーション、既存行は 1） | ✅ | `drizzle/0009_contract_invoice_version.sql` — ADD COLUMN のみ（DROP / テーブル再作成なし） |
| Contract 型・Invoice 型に `version: number` | ✅ | ドメインモデルファイル確認済み |
| version 不一致で更新が拒否されることを contracts / invoices 双方でテスト確認 | ✅ | `optimisticLock.test.ts` — WHERE 条件の存在を静的解析で検証 |
| version 一致で更新が成功し version がインクリメントされることをテスト確認 | ✅ | `version: sql\`version + 1\`` の存在を静的解析で検証 |
| ロック失敗時に統一メッセージの Result（ok: false）が返ることをテスト確認 | ✅ | 4 usecase のメッセージ含有を静的解析で検証 |
| 依存方向 actions → usecases → domain / infrastructure を遵守 | ✅ | domain layer からリポジトリ呼び出しなし / usecase が domain・infra を協調 |
| `bun test` 全件 green / typecheck green / `bun run build` 成功 | ✅ | verification-result.md — 1028 pass / 0 fail / build OK / typecheck clean |

---

## Observations（ブロッカーなし）

### O-01: ActionItemModal.tsx へのスコープ外変更（低リスク）

`src/app/(dashboard)/components/ActionItemModal.tsx` に `eslint-disable-next-line react-hooks/set-state-in-effect` コメント 1 行が追加されているが、action_items は本リクエストのスコープ外エンティティ。変更自体は無害（lint 警告抑制のみ）。code-review-001 でも severity=low / fix=no と判定済み。後続の action_items 横展開 PR での対応を推奨。

### O-02: マイグレーション journal の idx / ファイル名乖離

`drizzle/meta/_journal.json` の idx=8 が tag `0009_contract_invoice_version` を指している（idx と filename の数値が 1 ずれている）。main でマージされた migration 0008 が本ブランチに存在しない状態で drizzle-kit generate を実行したため、ファイル名が 0009_ になったものと考えられる。マイグレーション SQL の内容（ADD COLUMN のみ）は正しく機能的な問題はない。design.md のリスク項目に既知事項として記載済み。マージ時に番号衝突が発生した場合は design.md 記載の Mitigation（番号調整）で対応すること。
