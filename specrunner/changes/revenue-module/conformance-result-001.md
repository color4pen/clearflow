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
| tasks.md | ✅ | 全 15 タスク（T-01〜T-15）チェックボックスがすべて [x] |
| design.md | ✅ | D1〜D9 すべての設計決定が実装に反映されている |
| spec.md | ✅ | 全 Requirements (SHALL/MUST) と Scenarios が実装に適合 |
| request.md | ✅ | 全受け入れ基準を満たす（typecheck/test/lint/build 全 pass 含む） |

---

## Detail

### 1. tasks.md — 全タスク完了

全 15 タスクのチェックボックスが `[x]` でマーク済み。verification-result.md にて build / typecheck / test / lint のすべてが exit 0 で完了していることを確認。

### 2. design.md — 設計決定 D1〜D9 の適合

| # | 決定事項 | 確認内容 |
|---|---------|---------|
| D1 | 売上は読み取り専用ドメイン | `revenueRepository` は SELECT のみ。INSERT/UPDATE なし |
| D2 | revenueRepository を集計専用で新設 | `revenueRepository.ts` 新設、既存リポジトリ不変 |
| D3 | パイプライン対象フェーズ = 非終端 | `inArray(deals.phase, ['proposal_prep','proposed','negotiation'])` |
| D4 | estimatedAmount NULL = 0 | `COALESCE(estimated_amount, 0)` を適用 |
| D5 | setTarget は admin/manager 限定 | `ADMIN_MANAGER` 定数を使用 |
| D6 | revenue_targets に updatedAt | DDL と schema.ts に `updated_at NOT NULL` |
| D7 | CSV は Route Handler | `src/app/api/revenue/export/route.ts` |
| D8 | 集計基準日 = paidAt | `gte/lte(invoices.paidAt, ...)` |
| D9 | revenueTargetRepository は CRUD 専用で分離 | `revenueTargetRepository.ts` を独立ファイルで実装 |

### 3. spec.md — Requirements / Scenarios の適合

- **Monthly revenue**: `status="paid"` AND `paidAt IS NOT NULL` AND BETWEEN フィルタ、`DATE_TRUNC('month')` GROUP BY、`TO_CHAR` で YYYY-MM 形式 — 適合
- **Customer revenue**: invoices→contracts→clients JOIN、amount DESC ソート、limit 対応 — 適合
- **Deal revenue**: invoices→contracts→deals JOIN — 適合
- **Pipeline aggregation**: 非終端フェーズのみ (`won`/`lost` 除外)、COALESCE NULL→0 — 適合
- **Dashboard page**: 今月合計・12 ヶ月推移・パイプライン予測・顧客ランキング Top 10 を表示 — 適合
- **Details page**: 期間フィルタ・軸切替・DataTable 表示・CSV エクスポートボタン — 適合
- **CSV export**: 401/403 認可ガード、BOM 付き UTF-8、`escapeCsvValue` によるインジェクション対策 — 適合
- **Forecast page**: 目標・実績・進捗率・着地予測を表示。admin/manager のみ設定フォームを表示 — 適合
- **revenue_targets table**: id/organizationId/periodStart/periodEnd/targetAmount/createdAt/updatedAt NOT NULL、FK 設定 — 適合
- **Navigation**: `layout.tsx` に「売上」リンクを「契約」直後・「申請一覧」前に追加、全ロールに表示 — 適合
- **RBAC**: `canPerform("finance","revenue","setTarget")=false`、`canPerform("finance","revenue","export")=true` など全パターン適合

### 4. request.md — 受け入れ基準の適合

| 基準 | 結果 |
|------|------|
| `/revenue` に売上ダッシュボードが表示される | ✅ |
| 今月の入金確認済み合計が正しく計算される | ✅ |
| 月次推移データが過去 12 ヶ月分取得できる | ✅ |
| パイプライン売上予測が案件フェーズ × 想定金額で算出される | ✅ |
| `/revenue/details` で期間・集計軸を指定して明細が表示される | ✅ |
| CSV エクスポートが正常に動作する | ✅ |
| `/revenue/forecast` で目標金額の設定と進捗表示ができる | ✅ |
| ナビゲーションに売上リンクが表示される | ✅ |
| `typecheck && test` が green | ✅ |

### Findings

特記事項なし。すべての判断項目で適合を確認した。
