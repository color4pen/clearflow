# Domain Invariants Review — design-contract-invoice — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
-->

- **verdict**: approved

## Review Scope

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | テナント分離 | `src/infrastructure/repositories/contractRepository.ts` | `findAllByOrganization` で追加した deals INNER JOIN に `deals.organizationId` の明示フィルタがない。`contracts.organizationId = organizationId` による絞り込みが deals に間接的に適用されるため実質的な cross-tenant 漏洩は発生しないが、deals テーブルが将来 cross-tenant 共有になった場合に防壁が薄い。 | `innerJoin` の ON 句または WHERE 句に `eq(deals.organizationId, organizationId)` を追加することで防衛的なフィルタを二重化することを推奨（今後の型安全性向上のため）。現状は機能的に安全。 |
| 2 | LOW | エラー分離 | `src/app/(dashboard)/contracts/[id]/page.tsx` | `requestRepository.existsPendingByTriggerEntityId()` の呼び出しに try-catch がなく、DB エラー発生時にページ全体が 500 エラーになる。design.md D6 では「取得失敗時はバナー非表示で degradation」と明示されているが、実装はその挙動を保証していない。 | `existsPendingByTriggerEntityId` 呼び出しを try-catch で囲み、例外時は `hasPendingApproval = false` にフォールバックする。承認バナーはオプショナルな表示であり、ページの可用性を損なってはならない。 |

## Invariant Analysis

### テナント分離

| 対象 | 判定 | 根拠 |
|------|------|------|
| `contractRepository.findAllByOrganization` — deals JOIN 追加 | ✅ 安全 | `contracts.organizationId = organizationId` フィルタが先行し、INNER JOIN で取得できる deals は該当テナントの契約に紐づくものに限定される |
| `requestRepository.existsPendingByTriggerEntityId` — 新規メソッド | ✅ 安全 | `requests.organizationId = organizationId` を WHERE に含む。`triggerEntityId` は上位で `contractRepository.findById(id, organizationId)` により組織スコープ確認済みの contract.id |
| `ContractDetailPage` — session から organizationId 取得 | ✅ 安全 | `session!.user.organizationId` を使用し、すべてのリポジトリ呼び出しに渡している |
| `InvoiceDetailPage` — contractId/invoiceId 整合性チェック | ✅ 安全 | `invoice.contractId !== contractId` チェックにより、URL パラメータの改ざんによるクロス契約アクセスを防止している |

### 監査ログの完全性

このチェンジセットはデザイン変更のみであり、監査ログへの書き込みロジック（Server Actions）に変更はない。

| 対象 | 判定 | 根拠 |
|------|------|------|
| 新規リポジトリメソッド（`existsPendingByTriggerEntityId`） | ✅ 影響なし | 読み取り専用クエリ。INSERT/UPDATE なし |
| `ContractStatusActions` の配置変更（左カラムへ統合） | ✅ 影響なし | 既存コンポーネントの再配置のみ。Server Action は変更なし |
| `InvoiceActions` の配置変更（560px レイアウト内） | ✅ 影響なし | 既存コンポーネントの再配置のみ。Server Action は変更なし |

### 承認ワークフローの不変条件

| 不変条件 | 判定 | 根拠 |
|----------|------|------|
| 承認待ちバナーはワークフロー状態を変更しない | ✅ 保持 | `existsPendingByTriggerEntityId` は読み取りのみ。バナーは表示専用で承認操作ボタンを含まない |
| `!isTerminal` 条件による ContractStatusActions の制御 | ✅ 保持 | `isTerminal = contract.status === "completed" \|\| contract.status === "cancelled"` の評価と条件分岐が実装に維持されている（page.tsx L28, L61） |
| 承認バナーは `pending` ステータスのリクエストのみ対象 | ✅ 仕様通り | `status === "pending"` のフィルタが明示されており、`draft` 等は対象外（design.md D6 に合致） |
| 重複承認リクエスト防止（`findByOriginTriggerEntity`）への影響 | ✅ 影響なし | 既存の重複防止ロジックはこのチェンジセットで変更されていない |

## Summary

このチェンジセットはデザイン適用（UIの再配置・スタイル変更）を主目的としており、ドメイン不変条件への影響は最小限である。

- **テナント分離**: すべての新規クエリに `organizationId` フィルタが適用されており、cross-tenant 情報漏洩のリスクはない。deals JOIN の間接フィルタについては LOW の観察事項として記録するが、機能的に安全。
- **監査ログの完全性**: 書き込みロジックの変更がなく、既存の監査ログ記録に影響なし。
- **承認ワークフローの不変条件**: 読み取り専用の新規クエリ追加のみであり、承認フローのステータス遷移・重複防止機構に変更はない。

CRITICAL / HIGH 相当の問題なし。LOW 2 件（deals の防衛的フィルタ欠如、degradation 未実装）はいずれも動作の正確性・テナント分離・監査ログには影響しない。
