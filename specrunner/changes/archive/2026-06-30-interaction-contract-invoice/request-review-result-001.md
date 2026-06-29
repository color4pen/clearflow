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
| 1 | LOW | Clarity | 要件1 — usecase シグネチャ `date?` | `date?` をオプションとしているが、`interactions.date` は `NOT NULL` 制約あり。usecase が date 未指定時に `new Date()`（実行時刻）をデフォルトにすることが自明ではない。 | 設計フェーズで「date 未指定時は当日時刻を使用する」旨を spec に明記すること。 |
| 2 | LOW | Test Clarity | 受け入れ基準「既存テスト無変更」 | `getDealActivity` を修正して `findAllByContract`/`findAllByInvoice` を呼ぶようになると、既存の `dealActivity.dynamic.test.ts` のモックが `findAllByDeal` しかスタブしていないためテスト失敗する。「既存テスト無変更」との表現と矛盾しうる。 | 受け入れ基準を「変更対象外のテストは無変更で green」と読み替え、spec に「`getDealActivity` のテストはモック更新を伴う」と明示する。 |
| 3 | LOW | Clarity | 要件5 — タイムライン targetInfoMap | `getDealActivity` の targets に契約/請求紐づきの interaction を追加する旨は記載があるが、タイムライン表示時の `targetInfoMap` エントリ（ラベル・href）の設計が未記載。商談詳細へのリンクは存在せず、契約/請求詳細ページへのリンクが適切。 | design ステップで `targetInfoMap` のラベル形式（例: `契約調整 YYYY/MM/DD`）と href（`/contracts/:id` または `/contracts/:id/invoices/:id`）を決定すること。 |

## Validation Notes

- **スキーマ確認済み**: `interaction_kind` enum に `contract_adjustment`/`invoice_adjustment` が含まれ、`interactions.contract_id`/`invoice_id` FK・インデックスが実装済みであることをコードで確認。スキーマ変更不要の前提は正確。
- **repository 確認済み**: `interactionRepository` に `findAllByContract`/`findAllByInvoice` が存在しないことを確認。「要追加」の記述は正確。
- **getDealActivity 確認済み**: 現在の実装は `findAllByDeal` のみで deal-linked interactions を取得しており、contract/invoice-linked interaction は targets に含まれていない。要件5の追加が必要な状況と一致。
- **UI 確認済み**: 契約詳細・請求詳細ページともにやり取り記録セクションは未実装。
- **認可確認済み**: `authorization.ts` に `interaction` エンティティは存在しない。追加が必要な状況と一致。認可ロール設計（contract_adjustment=admin/manager/member、invoice_adjustment=admin/manager/finance）は既存のロール定義と整合。
- **テストパターン確認済み**: `interactionManagement.dynamic.test.ts` の mock.module 方式を確認。本リクエストのテスト方針と一致しており、実装可能。
