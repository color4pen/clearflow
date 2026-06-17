# Domain Invariants Review Result — webhook-retry-audit-export — iter 1

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Tenant isolation — defense-in-depth gap | `src/infrastructure/repositories/webhookDeliveryRepository.ts` | `findById(id: string)` にはorganizationIdフィルタが存在しない。テナント分離は呼び出し元の`retryWebhookDeliveryAction`が`webhookEndpointRepository.findById(delivery.endpointId, session.user.organizationId)`で間接的に行っており、現在の実装は安全。しかし将来`findById`が別コードパスから呼ばれたとき、org検証を忘れるとクロステナントアクセスが発生する。 | `findById(id: string, organizationId: string)` の形式にシグネチャを変更し、DBクエリにWHERE条件`eq(webhookEndpoints.organizationId, organizationId)`（エンドポイントJOIN経由）を追加する。または関数のdoc commentに「呼び出し元は必ず`webhookEndpointRepository.findById(endpointId, orgId)`で所有権を検証すること」を明記する。即時修正は必須ではないが次のイテレーションでの対応を推奨する。 |
| 2 | LOW | TOCTOU — attempts カウンタ競合 | `src/infrastructure/webhookDelivery.ts` (`deliverSingleAttempt`) | `deliverSingleAttempt`は`findById`でcurrentAttemptsを読み取り、後で`currentAttempts + 1`を書き込む。管理者がリトライボタンを素早く連打した場合、2つの並行呼び出しが同じcurrentAttemptsを読み取り、両方が`+1`にセットするため実際の試行回数が過少記録される。`resetForRetry`が`status: "pending"`に戻すだけであり、並行`deliverSingleAttempt`呼び出しを防がない。 | DBの`UPDATE ... SET attempts = attempts + 1`（インクリメント式）に変更するか、`resetForRetry`を`deliverSingleAttempt`内部に組み込んでアトミックな状態遷移にする。現状のシングルインスタンスデプロイ前提かつ管理者の意図的操作が必要なため、影響は試行回数の表示誤差のみ（機能破壊なし）。 |

## 検証詳細

### テナント分離の検証

| コードパス | organizationId強制 | 検証方法 |
|-----------|-------------------|---------|
| `auditLogRepository.findByOrganization` | ✅ 必須 | `conditions`配列の先頭に`eq(auditLogs.organizationId, organizationId)` — 削除不可 |
| `/api/audit-logs/export` GET | ✅ 必須 | `session.user.organizationId`を直接渡す |
| `/settings/audit-logs` page | ✅ 必須 | `session.user.organizationId`を直接渡す |
| `webhookDeliveryRepository.findByEndpointId` | ✅ 間接（endpoint JOIN） | endpointのorg一致を確認後にdeliveriesを返す |
| `retryWebhookDeliveryAction` | ✅ 間接（endpoint lookup） | `webhookEndpointRepository.findById(endpointId, session.user.organizationId)` |
| `webhookDeliveryRepository.findById` | ❌ なし（Finding #1） | org検証なし — 呼び出し元のアクション層に委ねている |

### 監査ログ完全性の検証

- `audit_logs`テーブルの`organizationId`カラムは`NOT NULL` + FK制約で定義されており、組織なしのログ書き込みはDBレベルで拒否される ✅
- 今回の変更で監査ログの**書き込みロジックは変更されていない**（`create`関数は未変更）✅
- 新規追加の`findByOrganization`は読み取り専用 — 書き込み不変条件に影響なし ✅
- 全読み取りパスに`organizationId`フィルタが付与されており、他テナントのログが混入しない ✅

### 承認ワークフロー不変条件の検証

- **認証チェック**: 全新規エンドポイント（Route Handler、Server Action、ページ）で`auth()`を先頭で呼び出し、未認証時は401/redirect ✅
- **adminロールチェック**: `retryWebhookDeliveryAction`、`/api/audit-logs/export`、`/settings/audit-logs`の全3箇所でrole === "admin"を強制 ✅
- **navigation guard**: `layout.tsx`の「監査ログ」リンクは`session.user.role === "admin"`条件ブロック内に追加されており、非adminには非表示 ✅
- **status guard**: `retryWebhookDeliveryAction`のstatus !== "failed"チェックはテナント検証の**後**に実行されており、他組織の配信レコードのstatus情報を漏洩しない ✅
- **依存方向**: `src/domain/`配下に`@/infrastructure`のimportなし（grep確認済み）✅
- **domain層不変**: `domain/models/webhookDelivery.ts`に追加された`nextRetryAt`フィールドは型定義のみ（副作用なし、永続化層への依存なし）✅

### エラーメッセージの情報秘匿

`retryWebhookDeliveryAction`において:
- 配信レコード不在: `"配信レコードが見つかりません"`
- 他組織のエンドポイント: `"配信レコードが見つかりません"` (同一メッセージ)

攻撃者はdelivery IDが存在するか否かと組織の不一致を区別できないため、情報秘匿が適切に実装されている ✅

### 総合判定

テナント分離・監査ログ完全性・承認ワークフロー不変条件の3つの不変条件はすべて維持されている。Finding #1は将来リスクであり現実装を破壊しない。Finding #2は試行回数の表示精度のみに影響し機能正確性には影響しない。**approved**。
