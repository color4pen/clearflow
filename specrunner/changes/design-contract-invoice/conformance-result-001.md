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
| tasks.md | ✅ | T-01〜T-08 の全チェックボックスが `[x]` 完了 |
| design.md | ✅ | D1〜D7 の全設計判断が実装に反映されている |
| spec.md | ✅ | 全 5 Requirements（SHALL/MUST）と全 Scenarios が実装を満たす |
| request.md | ✅ | 全 6 件の受け入れ基準が充足。build/typecheck/test が green |

---

## 詳細所見

### tasks.md — 全タスク完了

| Task | 判定 |
|------|------|
| T-01: ContractWithClient 型に dealTitle 追加・リポジトリ更新 | ✅ |
| T-02: 契約一覧 7 カラム化 | ✅ |
| T-03: 終了日 30 日以内ハイライト | ✅ |
| T-04: 契約詳細 2 カラムレイアウト | ✅ |
| T-05: InvoiceSection プログレスバー風サマリ | ✅ |
| T-06: 承認待ちバナー | ✅ |
| T-07: 請求詳細 560px 狭幅レイアウト | ✅ |
| T-08: typecheck & test 確認 | ✅ |

### design.md — 設計判断 D1〜D7

**D1: ContractWithClient 型に dealTitle 追加**
- `src/domain/models/contract.ts`: `ContractWithClient = Contract & { clientName: string; dealTitle: string }` ✅
- `contractRepository.findAllByOrganization`: deals テーブルを INNER JOIN し `dealTitle` を取得 ✅

**D2: DataTable rowClass でハイライト**
- `contracts/page.tsx`: `rowClass={(row) => isExpiringWithin30Days(row) ? "bg-amber-50" : undefined}` ✅
- `bg-warning/10` のフォールバックとして tasks.md が明示許可した `bg-amber-50` を使用 ✅
- ハイライト判定は `src/domain/services/contractHighlight.ts` に domain service として切り出し ✅

**D3: grid-cols-[3fr_2fr] 2 カラム**
- `<div className="grid grid-cols-[3fr_2fr] gap-3">` ✅
- 左: ContractInfoSection + ステータス表示 + ContractStatusActions + 関連情報 + DeleteContractButton ✅
- 右: InvoiceSection ✅

**D4: 単発契約のみプログレスバー**
- `isOneTime ? <ProgressBarSummary /> : <div className="grid grid-cols-3 ...">` ✅

**D5: max-width 560px・1 カラム**
- `<div className="max-w-[560px] mx-auto">` ✅
- dl: `grid grid-cols-[90px_1fr] gap-y-1 text-xs` ✅

**D6: 承認待ちバナー**
- `requestRepository.existsPendingByTriggerEntityId(organizationId, id)` ✅
- バナースタイル・テキストが design.md 指定と一致 ✅
- エラー時は try/catch で degradation（バナー非表示）✅

**D7: InvoiceSection に contractAmount・renewalType を渡す**
- 親ページから `contractAmount={contract.amount}` `renewalType={contract.renewalType}` ✅

### spec.md — Requirements 適合

**Requirement: 契約一覧は 7 カラムで表示する**
- カラム順（契約名, 顧客名, 案件名, 契約種別, 金額, 期間, ステータス）✅
- 期間表示: `${start} 〜 ${end}` / `${start} 〜`（endDate null 時）✅

**Requirement: 終了日が 30 日以内の active 契約行をハイライトする**
- `endDate <= thirtyDaysLater` かつ `status === "active"` ✅
- 30 日後ちょうど・過去日（期限超過）もハイライト対象、completed / cancelled は対象外 ✅
- テスト TC-005〜TC-009 で Scenario 全網羅 ✅

**Requirement: 契約詳細は左右 2 カラムレイアウトで表示する**
- 3fr:2fr グリッド、左右カラムの構成が Scenario と一致 ✅

**Requirement: 単発契約の請求サマリにプログレスバー風表示を行う**
- `ProgressBarSummary`: 入金済（green）/ 請求済（blue）/ 残り（gray）スタックバー ✅
- 100% キャップ: `invoicedPct = clamp(..., 0, 100 - paidPct)` ✅
- 残り = `Math.max(contractAmount - paidTotal - invoicedTotal - scheduledTotal, 0)` ✅
- Scenario の数値（paid=300K, invoiced=200K, scheduled=300K → 残り 200K）をテスト TC-012 で検証 ✅

**Requirement: 請求詳細は max-width 560px の狭幅レイアウトで表示する**
- `max-w-[560px] mx-auto` ✅
- パンくず: `契約一覧 > {contract.title} > 請求詳細` ✅

**Requirement: 承認待ちバナーは該当時のみ表示する**
- `originTriggerEntityId = contractId AND status = "pending"` ✅
- pending なし → バナー非表示（条件レンダリング）✅

### request.md — 受け入れ基準

| 受け入れ基準 | 判定 |
|-------------|------|
| 契約一覧が 7 カラムになっている | ✅ |
| 終了日 30 日以内の行がハイライトされている | ✅ |
| 契約詳細が 2 カラムレイアウトになっている | ✅ |
| 請求サマリにプログレスバー風の表示がある（単発契約） | ✅ |
| 請求詳細が max-width 560px の狭幅レイアウトになっている | ✅ |
| `typecheck && test` が green | ✅ build passed / typecheck passed / test 928 pass 0 fail / lint 0 errors |

---

## 総評

全設計判断（D1〜D7）、全 Spec Requirements（5 件・15 Scenarios）、全受け入れ基準（6 件）、全タスク（T-01〜T-08）が適合。verification では build / typecheck / test（928 pass / 0 fail）/ lint（0 errors）が全 passed。lint warnings はいずれも本変更より前から存在する既存 warning のみであり、本変更に起因する新規 warning は含まれていない。スコープ外の変更（フォーム変更・ビジネスロジック変更）もなし。
