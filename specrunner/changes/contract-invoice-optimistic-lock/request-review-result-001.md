# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | LOW | Clarity | 要件 5 | 請求側のロック失敗メッセージが「文言を請求向けに調整」と曖昧に記述されており、`updateInvoice` と `updateInvoiceStatus` で期待する具体的な文字列が定義されていない。テストでのアサーション文字列が実装者の解釈に委ねられる。 | 既存パターン（「この案件は…」「この引き合いは…」）に倣い、`updateInvoice` 用・`updateInvoiceStatus` 用に期待メッセージ（例: 「この請求は他のユーザーによって更新されました。画面を更新してください」）を要件に明記することを推奨。実装には支障がない範囲のため blocking ではない。 |
| 2 | LOW | Clarity | 受け入れ基準 | `updateContractStatus` は `contractRepository.updateStatus` という独立関数ではなく `contractRepository.update` を直接呼ぶ設計だが、要件 4 の関数列挙と要件 5 の usecase 列挙の対応が黙示的。コードを参照しない限り、`contractRepository.update` の version 引数追加が `updateContractStatus` にも影響することが文面から読み取りにくい。 | 要件 5 に「`updateContractStatus` は `contractRepository.update` を呼ぶため、同一の version パラメータ追加で楽観的ロックが適用される」と一文補足すると実装者の誤解が防げる。既存コードから確認可能なため blocking ではない。 |

## Review Notes

### 現状コードの確認

request.md に記載された「現状コードの前提」をコードベースで全件確認した。

| 項目 | request.md の記述 | 確認結果 |
|------|-------------------|----------|
| `contracts` テーブル（schema.ts:426-451） | `version` カラムなし | ✅ 一致 |
| `invoices` テーブル（schema.ts:454-470） | `version` カラムなし | ✅ 一致 |
| `Contract` 型（domain/models/contract.ts） | `version` フィールドなし | ✅ 一致 |
| `Invoice` 型（domain/models/invoice.ts） | `version` フィールドなし | ✅ 一致 |
| `contractRepository.update`（l.142, l.162） | `id + organizationId` のみ WHERE | ✅ 一致 |
| `invoiceRepository.update`（l.81） | `id + organizationId` のみ WHERE | ✅ 一致 |
| `invoiceRepository.updateStatus`（l.102） | `id + organizationId` のみ WHERE | ✅ 一致 |
| usecases（4 件）| version を保持・渡す処理なし | ✅ 一致 |

### 既存パターンとの整合性

deals / inquiries の楽観的ロック実装（`dealRepository.updatePhase`、`inquiryRepository.updateStatus`）および ADR-005 の確立したパターンを確認した。

- **スキーマ**: `version integer NOT NULL DEFAULT 1` ✅
- **mapRow**: `version: row.version` でドメインモデルに射影 ✅
- **UPDATE WHERE**: `AND version = expectedVersion` + `SET version = version + 1` ✅
- **ロック失敗**: null 返却 → usecase で `{ ok: false, reason: "..." }` に変換 ✅
- **ADR-005 Constraints**: 「楽観的ロック対象テーブル追加時は `version integer NOT NULL DEFAULT 1` カラムと WHERE/SET パターンに従うこと」と明示されており、本 request はこの規律に完全準拠 ✅

### マイグレーション

差分マイグレーション（`ALTER TABLE ... ADD COLUMN version integer NOT NULL DEFAULT 1`）により既存行に 1 が付与されるアプローチは正しい。既存の numbered migration ファイル（`drizzle/0000〜0008`）の連番に続く形で新規ファイルを作成するのが規約に沿う。DB リセット禁止（プロジェクト規律）との整合性も問題なし。

### テスト要件

要件 7 は「version 不一致で拒否」「version 一致で成功かつインクリメント」を contracts / invoices 双方でテストすることを明示している。既存の `src/__tests__/usecases/optimisticLock.test.ts` はソースコード静的解析方式を採用しており、同ファイルへの追記または新規テストファイルどちらでも対応可能。受け入れ基準と整合している。

### 結論

- HIGH / decision-needed 相当の所見なし
- 現状コード記述が正確で実装者が安全に着手できる
- 設計判断は architect 評価済みであり、ADR-005 との一貫性も確認済み
- LOW 所見 2 件はいずれも明確化の提案であり、blocking 要因ではない
