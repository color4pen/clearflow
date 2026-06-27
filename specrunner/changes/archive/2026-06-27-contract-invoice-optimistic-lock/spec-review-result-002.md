# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Design Consistency | tasks.md T-10〜T-13 / design.md | 既存の `updateDealPhase` パターン（ADR-005 踏襲）と同様に、`contractRepository.update` / `invoiceRepository.updateStatus` が null を返した場合（version 不一致）でも、トランザクション内の `auditLogRepository.create` と `dispatcher.dispatch` が先に実行されてコミットされる。audit log に実際には更新されなかったステータス変更が記録され、contract/invoice の財務エンティティとして誤解を招く可能性がある。ただし sync イベントハンドラーが contract/invoice 系イベントに登録されていないことを確認済みであり、async ハンドラーは `flushAsync()` が呼ばれないため実際には副作用なし。deals パターンと完全に一致した既存設計の踏襲であり新規の退行ではない。 | 今回の spec スコープ外。将来的に null チェックをトランザクション内の audit log 生成前に移動する（`if (!updatedContract) throw new OptimisticLockError()`スタイル → catch で ok: false）か、audit log 書き込みをトランザクション外に移す設計改善を別 request で検討する。 |
| 2 | LOW | Naming Consistency | tasks.md T-07〜T-09, design.md D3 | 既存実装（`dealRepository.updatePhase`, `inquiryRepository.updateStatus`）は `currentVersion` を使用しているが、本 spec は `expectedVersion` を採用している。`requestRepository.updateStatus` も `expectedVersion` を使用しており、本 spec はこちらと整合している。機能上の問題なし。review-001 から変更なし。 | blocking ではない。将来の横展開（meetings 等）では `expectedVersion` に統一する方針が design.md に一行あると実装者の混乱を防げる。 |

## Review Notes

### spec-review-result-001.md の HIGH 指摘確認

**#1 HIGH（T-12 freshInvoice.version 問題）: 修正確認 ✅**

前回指摘：T-12 が金額変更パスで `freshInvoice.version` を `expectedVersion` として使う指示をしており、トランザクション外で先に更新された User B の変更を上書きしてしまう。

現在の tasks.md T-12:
- 「金額検証で freshInvoice を再取得するパスでも、expectedVersion には必ずトランザクション開始前に取得した `invoice.version` を使用する。freshInvoice.version はトランザクション内の最新値であり、楽観的ロックの競合検出に使用してはならない」と明示修正済み
- Acceptance Criteria: 「`freshInvoice.version` は `expectedVersion` として使用しない（freshInvoice は金額検証にのみ使用する）」を追記済み

spec.md の該当 Requirement も `invoice.version`（findById 取得値）を使う記述のみであり一貫している。HIGH 指摘は完全に解消されている。

### 全 spec ファイルの妥当性確認

#### spec.md Requirement 確認

| Requirement | SHALL/MUST | Scenario(s) | 評価 |
|-------------|-----------|-------------|------|
| contracts テーブルに version カラム | SHALL | 既存行への DEFAULT 1 付与 | ✅ |
| invoices テーブルに version カラム | SHALL | 既存行への DEFAULT 1 付与 | ✅ |
| Contract 型に version フィールド | SHALL | version: number 参照 | ✅ |
| Invoice 型に version フィールド | SHALL | version: number 参照 | ✅ |
| contractRepository.update の楽観的ロック | SHALL | version 一致成功 / 不一致拒否 | ✅ |
| invoiceRepository.update の楽観的ロック | SHALL | version 一致成功 / 不一致拒否 | ✅ |
| invoiceRepository.updateStatus の楽観的ロック | SHALL | version 一致成功 / 不一致拒否 | ✅ |
| updateContract ロック失敗 Result | SHALL / MUST | 競合時 ok: false + 文言 | ✅ |
| updateContractStatus ロック失敗 Result | SHALL / MUST | 同上 | ✅ |
| updateInvoice ロック失敗 Result | SHALL / MUST | 同上 | ✅（`invoice.version` を使用と明記） |
| updateInvoiceStatus ロック失敗 Result | SHALL / MUST | 同上 | ✅ |
| 作成時 version=1 | SHALL | create 後の version 値 | ✅ |

#### design.md Decisions 確認

| Decision | 整合性 |
|----------|--------|
| D1: integer version / ADR-005 踏襲 | ✅ spec.md・tasks.md と一致 |
| D2: 差分マイグレーション ADD COLUMN DEFAULT 1 | ✅ T-01・T-02 と一致 |
| D3: シグネチャに expectedVersion 独立パラメータ | ✅ T-07〜T-09 と一致 |
| D4: ロック失敗は Result ok: false | ✅ T-10〜T-13 と一致 |
| D5: エンティティ別の文言調整 | ✅ spec.md / tasks.md の文言と一致 |
| D6: create 経路は schema DEFAULT で保証 | ✅ T-01 と一致 |

#### tasks.md 構成確認

| Task | 内容 | 評価 |
|------|------|------|
| T-01〜T-02 | schema + migration | ✅ |
| T-03〜T-04 | domain model | ✅ |
| T-05〜T-06 | mapRow | ✅ |
| T-07〜T-09 | repository 楽観的ロック | ✅ |
| T-10〜T-13 | usecase 統合 | ✅（T-12 HIGH 修正済み） |
| T-14 | 静的解析テスト（optimisticLock.test.ts 拡張） | ✅ |
| T-15 | 全体検証 | ✅ |

### 現状コードとの整合性確認

| 項目 | 前提記述 | 実コード確認 |
|------|---------|-------------|
| contracts テーブル（schema.ts:426-451） | version カラムなし | ✅ 一致（updatedAt で終端） |
| invoices テーブル（schema.ts:454-472） | version カラムなし | ✅ 一致 |
| Contract 型（domain/models/contract.ts） | version フィールドなし | ✅ 一致 |
| Invoice 型（domain/models/invoice.ts） | version フィールドなし | ✅ 一致 |
| contractRepository.update | id + organizationId のみ WHERE | ✅ 一致 |
| invoiceRepository.update | id + organizationId のみ WHERE | ✅ 一致 |
| invoiceRepository.updateStatus | id + organizationId のみ WHERE | ✅ 一致 |
| 4 usecase | version 保持・渡しなし | ✅ 一致 |
| 呼び出し側の網羅性 | — | ✅ contractRepository.update は updateContract / updateContractStatus の 2 箇所のみ。invoiceRepository.update は updateInvoice の 1 箇所のみ。invoiceRepository.updateStatus は updateInvoiceStatus の 1 箇所のみ。Server Actions は全て usecase 経由（直接リポジトリ呼び出しなし） |

### セキュリティレビュー（OWASP Top 10）

| 観点 | 評価 | 備考 |
|------|------|------|
| A01 Broken Access Control | ✅ 問題なし | organizationId フィルタは全更新パスで維持される。WHERE に version を追加しても organizationId チェックは保持される |
| A03 Injection | ✅ 問題なし | `sql\`version + 1\`` はユーザー入力を含まない固定 SQL フラグメント。Drizzle のパラメータ化クエリで他の WHERE 条件も安全 |
| A04 Insecure Design | ✅ 問題なし | version 値はサーバーサイドの `findById` から取得される。クライアント側からの version 入力はスコープ外（明示的に除外済み）。version スプーフィング攻撃の余地なし |
| A07 Auth/AuthZ | ✅ 問題なし | Server Actions レイヤーの認証チェックはこの変更で影響を受けない |
| A08 Software Integrity | ✅ 問題なし | version インクリメントは SQL レベルのアトミック操作（`version + 1`）。アプリケーション側の read-modify-write ではないため競合状態なし |
| A09 Logging | △ 低リスク | ロック失敗時に audit log が生成される（Finding #1 参照）。既存 deals パターンと同一であり、新規の退行ではない |

### T-12 ロジックの健全性確認

`updateInvoice` は SERIALIZABLE トランザクション + 楽観的ロックの 2 層防御:

- `invoice = findById(...)` — トランザクション外で version=V を取得
- SERIALIZABLE トランザクション開始
  - `freshInvoice = findById(...)` — 金額合計検証専用（version を楽観的ロックに使わない）
  - `invoiceRepository.update(... expectedVersion=V ...)` — WHERE version=V のみ
- ロック判定:
  - User B が version=V→V+1 でコミット済み（トランザクション前）→ WHERE version=V が 0 行マッチ → null → ロック失敗 ✅
  - SERIALIZABLE 分離が同一トランザクション内の write skew を防止 ✅
  - `freshInvoice.version` を `expectedVersion` に使わない → User B の変更を誤って上書きしない ✅

### 総合評価

HIGH 指摘（review-001 #1）は T-12 の大幅改訂により完全解消。spec.md・design.md・request.md は相互一貫しており、tasks.md の全タスクが spec に対応している。残存 finding は既存パターン踏襲の LOW のみ。実装に進める状態。
