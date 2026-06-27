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
| 1 | LOW | Test methodology gap | spec.md / tasks.md > T-09 | spec.md の BDD シナリオは「version 一致で成功し version がインクリメントされる」などのランタイム動作を記述しているが、T-09 の実装は静的コード解析（readFile + toContain）で間接的に検証する。これはプロジェクトの確立済み規約（既存 optimisticLock.test.ts と同一方式）に則っており機能上の問題はないが、spec とテスト手法の乖離がある。 | 既存プロジェクト規約の範囲内であり修正不要。実装者は静的解析が spec シナリオのランタイム保証の代替である点を認識しておくこと。 |

## Review Notes

### spec-review-001 所見の解消確認

**Finding #1 (HIGH → 解消)**: `updateRevenueTarget` トランザクション内で `auditLogRepository.create` が null チェック前に呼ばれるファントム audit log 問題。

T-08 が以下のとおり修正済み:
> "トランザクション内で `result` が null の場合（version 不一致）、`auditLogRepository.create` を実行する前に null を return する（参照実装 `updateContract.ts` の `if (!updatedContract) { return null; }` パターンに倣い、`update` 直後・`auditLogRepository.create` より前に配置する）"

`updateContract.ts` のパターンと完全に一致しており、version 不一致時には audit log が作成されない。✓

**Finding #2 (MEDIUM → 解消)**: `drizzle/meta/0009_snapshot.json` がタスクから欠落。

T-01 が以下を追加済み:
> "`drizzle/meta/0009_snapshot.json` を作成する（`drizzle/meta/0008_snapshot.json` をベースに、meetings / action_items / revenue_targets 各テーブル定義の columns に version カラムエントリを追加した内容にする）"

✓

### 全体検証サマリ

**request.md**: 要件・受け入れ基準・アーキテクト評価済み設計判断が揃っており一貫性あり。スコープ外（クライアント側 version 持ち回り、UI マージ、ペシミスティックロック）も明示されている。

**design.md**: D1〜D5 の設計判断が ADR-005 パターンを忠実に踏襲。`updateRevenueTarget` の audit log 順序問題（Finding #1）の参照実装 `updateContract.ts` パターンも design.md の時点で明記されている（D3）。Migration Plan の statement-breakpoint 配置（最後の文なし）は `0009_contract_invoice_version.sql` の既存パターンと一致。

**spec.md**: 3 エンティティ × 2 シナリオ（version 一致・不一致）＋マイグレーション＋mapRow の合計 8 シナリオ。SHALL キーワードを含む。エラーメッセージが「この商談は…」「このアクションアイテムは…」「この売上目標は…」と設計の D5 と一致。

**tasks.md**: T-01〜T-10 の構成が完全。journal の次エントリ（idx=9, tag=`0010_remaining_entity_version`）は既存 journal 最終エントリ（idx=8, tag=`0009_contract_invoice_version`）と整合。

### セキュリティ確認

- version は常にサーバー側 `findById` から取得。クライアント入力からは受け取らないため改ざんリスクなし。
- `eq(table.version, expectedVersion)` は Drizzle ORM のパラメータ化クエリで実行される。SQL インジェクションリスクなし。
- `organizationId` によるテナント分離 WHERE 条件は楽観的ロック条件追加後も維持される。
- 新規公開 API・Server Actions・エンドポイントなし。影響範囲はサーバー側 usecase + リポジトリのみ。

### usecase パターン整合性確認

4 usecase の変更パターンを `updateContract.ts` の参照実装と照合:

| usecase | 現在の null 処理 | 変更後 | 整合 |
|---------|----------------|-------|------|
| updateMeeting | tx 内で `throw new Error` → catch で ok:false | tx 内で `return null` → tx 結果 null チェックで ok:false | ✓ |
| updateActionItem | tx 内で `throw new Error` → catch で ok:false | tx 内で `return null` → tx 結果 null チェックで ok:false | ✓ |
| toggleActionItemDone | tx 内で `throw new Error` → catch で ok:false | tx 内で `return null` → tx 結果 null チェックで ok:false | ✓ |
| updateRevenueTarget | tx 外で `if (!updated)` → 汎用メッセージ | tx 内で null 早期 return → tx 外で楽観的ロックメッセージ | ✓ |

全 usecase で `updateContract.ts` のパターン（version 不一致時にトランザクションから null を返し、audit log を作成しない）を踏襲することが明示されている。
