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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Spec-Task Inconsistency | tasks.md T-12 | `updateInvoice` の金額変更パスで `freshInvoice.version` を `expectedVersion` として使う指示（T-12）が、spec.md の「エンティティ取得時の version を保持し invoiceRepository.update に渡す」要件と矛盾する。`freshInvoice` はトランザクション内で再取得した最新行なので、その version をそのまま WHERE に使うと「User B がトランザクション開始前に更新済み（version 3→4）」のケースでも WHERE version=4 がマッチして更新が成功し、User B の変更が無言で上書きされる。SERIALIZABLE 分離は同一スロット内の読み取り–書き込み依存を検出するが、User B がコミット後に User A のトランザクションが開始した場合（直列可能なシリアル順）はシリアライゼーションエラーにならないため、バックストップにならない。楽観的ロックの主目的（競合検出と user-friendly エラー）が金額変更パスで機能しない。 | T-12 の実装指示を「両パス（金額変更有無に関わらず）とも `invoice.version`（トランザクション外の初期 `findById` で取得した値）を `expectedVersion` として `invoiceRepository.update` に渡す」に修正する。`freshInvoice` は金額合計検証にのみ使い、version 追跡には使わない。Acceptance Criteria の `invoice.version`（または金額検証パスでは `freshInvoice.version`）の二択記述も `invoice.version` 一本に統一する。 |
| 2 | LOW | Naming Consistency | tasks.md T-07–T-09, design.md D3 | 既存の楽観的ロック実装（`dealRepository.updatePhase`、`inquiryRepository.updateStatus`）はパラメータ名を `currentVersion` としているが、本 spec は `expectedVersion` を採用する。コードベース内で 2 種類の命名が混在する。機能上の問題はないが、`requestRepository.updateStatus` が `expectedVersion` を採用しており、本 spec はそちらと整合している。 | 差し当たり blocking ではない。将来の横展開（meetings 等）では `expectedVersion` に統一する方針を設計判断として design.md に一行追記しておくと実装者の混乱を防げる。 |

## Review Notes

### spec.md の妥当性確認

spec.md の全 Requirement を確認した。

| Requirement | SHALL/MUST | Scenario(s) | 評価 |
|-------------|-----------|-------------|------|
| contracts テーブルに version カラム | SHALL | 既存行への DEFAULT 1 付与 | ✅ |
| invoices テーブルに version カラム | SHALL | 同上 | ✅ |
| Contract 型に version フィールド | SHALL | version: number 参照 | ✅ |
| Invoice 型に version フィールド | SHALL | version: number 参照 | ✅ |
| contractRepository.update の楽観的ロック | SHALL | version 一致成功 / 不一致拒否 | ✅ |
| invoiceRepository.update の楽観的ロック | SHALL | version 一致成功 / 不一致拒否 | ✅ |
| invoiceRepository.updateStatus の楽観的ロック | SHALL | version 一致成功 / 不一致拒否 | ✅ |
| updateContract ロック失敗メッセージ | SHALL / MUST | 競合時 ok: false + 文言 | ✅ |
| updateContractStatus ロック失敗メッセージ | SHALL / MUST | 同上 | ✅ |
| updateInvoice ロック失敗メッセージ | SHALL / MUST | 同上 | ✅（spec.md は正しく「エンティティ取得時の version」と記述） |
| updateInvoiceStatus ロック失敗メッセージ | SHALL / MUST | 同上 | ✅ |
| 作成時 version=1 | SHALL | create 後の version 値 | ✅ |

spec.md 自体に問題はない。**問題は tasks.md T-12 が spec.md の要件から逸脱している点のみ。**

### 現状コードとの整合性確認

request.md の「現状コードの前提」を全件検証した。

| 項目 | 前提記述 | 実コード確認 |
|------|---------|-------------|
| contracts テーブル（schema.ts:426-451） | version カラムなし | ✅ 一致 |
| invoices テーブル（schema.ts:454-472） | version カラムなし | ✅ 一致 |
| Contract 型（domain/models/contract.ts） | version フィールドなし | ✅ 一致 |
| Invoice 型（domain/models/invoice.ts） | version フィールドなし | ✅ 一致 |
| contractRepository.update（l.142–164） | id + organizationId のみ WHERE | ✅ 一致 |
| invoiceRepository.update（l.81–100） | id + organizationId のみ WHERE | ✅ 一致 |
| invoiceRepository.updateStatus（l.102–116） | id + organizationId のみ WHERE | ✅ 一致 |
| 4 usecase | version 保持・渡しなし | ✅ 一致 |

### 設計パターンの整合性確認

deals / inquiries の実装（`dealRepository.updatePhase`、`inquiryRepository.updateStatus`）と ADR-005 パターンを確認した。

- スキーマ: `integer("version").notNull().default(1)` ✅
- mapRow: `version: row.version` ✅
- UPDATE WHERE: `AND version = currentVersion/expectedVersion` ✅
- UPDATE SET: `version: sql\`version + 1\`` ✅
- ロック失敗: null 返却 → usecase で `{ ok: false, reason }` ✅

### セキュリティレビュー（OWASP Top 10）

| 観点 | 評価 | 備考 |
|------|------|------|
| A01 Broken Access Control | ✅ 問題なし | organizationId フィルタは全更新パスで維持される |
| A03 Injection | ✅ 問題なし | `sql\`version + 1\`` はユーザー入力を含まない固定 SQL フラグメント。その他の WHERE 条件は Drizzle のパラメータ化クエリ |
| A04 Insecure Design | ✅ 問題なし | version 値はサーバーサイドの `findById` から取得され、クライアント入力は受け取らない（クライアント側 version 持ち回りはスコープ外） |
| A07 Auth/AuthZ | ✅ 問題なし | Server Actions レイヤーの認証チェックはこの変更で影響を受けない |
| A08 Software Integrity | ✅ 問題なし | version インクリメントは SQL レベルのアトミック操作（`version + 1`）であり、アプリケーション側の read-modify-write ではない |
| A09 Logging | ✅ 問題なし | auditLogRepository.create 呼び出しは全 usecase で維持される |

### タスク構成の確認

T-01〜T-15 の構成は適切。既存の `optimisticLock.test.ts` を拡張する T-14 の静的解析アプローチは既存パターンと一致しており、受け入れ基準と整合している。

**要修正箇所は tasks.md T-12 のみ。** spec.md・design.md・request.md は一貫しており、T-12 の修正後は実装に進める状態になる。
