# Domain Invariants Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    invariants are upheld; change is safe to merge
  - needs-fix:   one or more invariants are violated; must be corrected
  - escalation:  ambiguous or requires human judgment before proceeding
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: invariant violation causing data loss, tenant leakage, or audit gap
  - HIGH:     functional invariant broken, no workaround — blocks approval
  - MEDIUM:   quality or future-risk concern; does not block but should be tracked
  - LOW:      informational; style or minor improvement
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Type assertion risk (accepted) | `src/infrastructure/repositories/auditLogRepository.ts` | `findByOrganization` / `findByTargets` の読み取りパスで `row.action as AuditAction` / `row.targetType as AuditTargetType` の型アサーションを使用している。DB に歴史的にカタログ外の値が存在した場合、TypeScript の型と実際の値が乖離する。ただしこれは D6 の設計決定として意図的に選択されており、`getActionLabel` のフォールバック処理が実害を吸収する設計になっている。| 設計決定として受容済み（D6）。将来的に Drizzle の pgEnum への移行または入力時バリデーションの追加でアサーションを排除できる。現時点では修正不要。|

## 検証サマリー

### テナント分離の確認

| 確認項目 | 判定 | 備考 |
|----------|------|------|
| `auditLogRepository.create` の `organizationId` 必須化 | ✅ 維持 | 型変更後も `organizationId: string` は必須フィールドとして残る |
| `createInvoice.ts` — `organizationId` を create に渡す | ✅ 確認 | `organizationId: data.organizationId` でテナントスコープを明示 |
| `approveRequest.ts` — `organizationId` を create に渡す | ✅ 確認 | 単純承認・多段承認いずれも `organizationId: data.organizationId` |
| `auditLogHandler.ts` — `organizationId` を create に渡す | ✅ 確認 | `organizationId: event.organizationId` |
| `findByOrganization` — `organizationId` フィルタ条件 | ✅ 維持 | `eq(auditLogs.organizationId, organizationId)` |
| `findByTargets` — `organizationId` フィルタ条件 | ✅ 維持 | `eq(auditLogs.organizationId, organizationId)` |
| フィルタパラメータ（`options.action` / `options.targetType`）| ✅ 維持 | `string` のまま。外部入力を受け取る read パスとして適切 |

テナント分離の実装パターンは変更前後で完全に同一。本変更はコンパイル時型制約の追加であり、ランタイムの organizationId フィルタには一切影響しない。

### 監査ログの完全性確認

| 確認項目 | 判定 | 備考 |
|----------|------|------|
| `AuditAction` が全記録サイトの action を網羅（48 種） | ✅ 確認 | spec-review-002 でコード走査済み。`request.submit`（handler）を含む |
| `AuditTargetType` が全 targetType を網羅（15 種） | ✅ 確認 | `approvalPolicy` を含む 15 種 |
| `auditLogRepository.create` がカタログ外の値をコンパイル拒否 | ✅ 達成 | `action: AuditAction` / `targetType: AuditTargetType` に変更済み |
| typecheck（`tsc --noEmit`）が全記録サイトで通過 | ✅ 通過 | verification-result.md より typecheck passed（exit 0） |
| 記録される文字列値がランタイムで不変 | ✅ 確認 | 型アサーションのみの変更。既存テスト 1115 件全通過 |

本変更により、カタログ外の action / targetType がコンパイル時に検出されるようになり、監査ログの完全性が**強化**された。既存の記録挙動は完全に不変。

### 承認ワークフローの不変条件確認

| 確認項目 | 判定 | 備考 |
|----------|------|------|
| `request.approve` / `request.reject` / `request.submit` がカタログに存在 | ✅ 確認 | AuditAction に明示的に含まれる |
| `approval_step.approve` / `approval_step.reject` がカタログに存在 | ✅ 確認 | AuditAction に明示的に含まれる |
| `approveRequest` usecase — `db.transaction` 内で audit log を記録 | ✅ 維持 | 承認とログ記録のアトミック性は変更なし |
| `rejectRequest` usecase — `db.transaction` 内で audit log を記録 | ✅ 維持 | 静的検証テスト TC-003 で固定済み |
| `submitRequest` usecase — `db.transaction` 内で audit log を記録 | ✅ 維持 | 静的検証テスト TC-003 で固定済み |
| 多段承認フロー — `approval_step.approve` + `request.approve` の二重記録 | ✅ 維持 | `approveRequest.ts` で確認。全ステップ完了時のみ `request.approve` を追加記録する条件分岐も不変 |
| 委任承認 — metadata への `delegatedFrom` 記録 | ✅ 維持 | `approveRequest.ts` 内の `auditMetadata.delegatedFrom` パターンは変更なし |
| `request.expire` がカタログに存在 | ✅ 確認 | `/api/cron/expire-requests` ルートが記録する action として含まれる |

承認ワークフローに関与する全 action がカタログに含まれており、ワークフローの不変条件は維持されている。

### ビルド・テスト検証（verification-result.md より）

| フェーズ | 結果 |
|---------|------|
| build | ✅ passed（35.4s） |
| typecheck | ✅ passed（全記録サイト適合） |
| test | ✅ passed（1115 pass, 0 fail） |
| lint | ✅ passed |

### 設計上のリスク確認（design.md Risks 節）

| リスク | 対応状況 |
|-------|---------|
| 型アサーション（`as AuditAction`）の安全性 | 書き込みパスがカタログ型で制約されているため、DB に格納される値は常にカタログ内の値。歴史的不整合は `getActionLabel` のフォールバックが吸収する。設計として合理的 |
| 新 action 追加時の手順増加 | カタログへの追加漏れはコンパイルエラーとして即座に検出される。Finding #1（LOW）として記録するが機能的リスクはない |
| metadata の部分的型化 | `action_item.toggle` のみ型化。残りは `Record<string, unknown> | null`。段階的拡張が可能な設計であり、現状のスコープとして適切 |

## 総合評価

本変更はコンパイル時型制約の追加のみであり、テナント分離・監査ログの完全性・承認ワークフローの不変条件はいずれも維持されている。

- テナント分離：`organizationId` の必須フィールドとしての位置づけは変更なし
- 監査ログの完全性：48 種 action / 15 種 targetType がカタログに網羅され、コンパイル時に強制される（改善）
- 承認ワークフローの不変条件：全関連 action がカタログに含まれ、トランザクション境界も不変
- ランタイム挙動：ビルド・typecheck・テスト・lint が全て通過し、既存の動作が完全に保全されている
