# Domain Invariants Review — api-token-foundation — iter 1

## Summary

- **verdict**: approved
- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **scope**: 37 ファイル変更（全て新規追加または既存への追加のみ。既存ロジックの変更なし）

---

## 検証結果

### INV-1: [[inv-all-tenant-scoped]] — テナント分離

**判定: OK ✓**

| 検査対象 | 条件 | 判定 |
|---|---|---|
| `api_tokens` テーブル定義 | `organizationId NOT NULL` + FK to organizations | ✓ |
| `api_tokens` テーブル定義 | `userId NOT NULL` + FK to users | ✓ |
| `findByUserAndOrganization` | `userId AND organizationId` の両条件 WHERE | ✓ |
| `revokeById` | `id AND userId AND organizationId AND revokedAt IS NULL` の全条件 WHERE | ✓ |
| Server Actions (全3件) | `userId` / `organizationId` をセッションから取得。`formData` からは受け取らない | ✓ |
| `resolveBearer` | トークンレコード取得後、`userRepository.findById(userId, organizationId)` で組織所属を二重検証 | ✓ |

**設計上の例外（合理的）**:

`findByTokenHash` は `organizationId` 条件を持たない。これは `tokenHash` にグローバルユニーク制約が設定されており、ハッシュで一意識別できるため（tasks.md T-04 に設計根拠が明記されている）。`resolveBearer` はその後 `userRepository.findById(userId, organizationId)` でテナント所属を検証してから認証結果を返す。情報漏洩のリスクはない。

spec.md の「api_tokens テーブルに対する全クエリは organizationId を WHERE 条件に含めなければならない」という記述はこの例外を網羅していない表現上の不一致だが、design.md と tasks.md に設計根拠が文書化されており実装判断として妥当。

---

### INV-2: [[inv-audit-log-append-only]] — 監査ログの完全性

**判定: OK ✓**

| 検査対象 | 判定 |
|---|---|
| `auditLogRepository` に UPDATE / DELETE 操作がない | ✓（INSERT のみ） |
| `createApiToken` 内で `api_token.create` を同一トランザクション内で記録 | ✓ |
| `revokeApiToken` 内で `api_token.revoke` を同一トランザクション内で記録 | ✓ |
| 失効失敗時（他人のトークン・失効済み・存在しない）は監査ログを記録しない | ✓（revokeById が null → return { ok: false } で正しく分岐） |
| 監査ログの metadata に平文トークン・ハッシュを含まない | ✓（recordAudit 呼び出しで metadata を渡していない） |
| 全ての監査ログエントリに `organizationId` が含まれる | ✓ |
| `AuditAction` への追加が既存エントリを変更していない | ✓（`"api_token.create"` / `"api_token.revoke"` を末尾追加のみ） |
| `AuditTargetType` への追加が既存エントリを変更していない | ✓（`"api_token"` を末尾追加のみ） |

---

### INV-3: 承認ワークフローの不変条件

**判定: OK ✓**

| 検査対象 | 判定 |
|---|---|
| `src/domain/authorization.ts` への変更なし | ✓ |
| 承認ワークフロー関連 usecase（approve / reject / resubmit 等）への変更なし | ✓ |
| `requests` / `approval_steps` / `approval_policies` テーブル定義への変更なし | ✓ |
| `schema.ts` への変更が `apiTokens` 追加と relations 追加のみ | ✓ |
| 全 1599 テストが合格（verification-result.md にて確認） | ✓ |

---

## 所見

### [INFO] updateLastUsedAt の WHERE 条件

`updateLastUsedAt` は `id` のみの WHERE 条件で更新する。`organizationId` / `userId` 条件は含まない。ただし:
- この関数は `resolveBearer` 内からのみ呼ばれ、その時点で既にテナント検証済みのトークン ID を渡している
- `lastUsedAt` は認証制御に影響せず管理画面の表示用データ（design.md D6 に明記）
- id が UUID でグローバルにユニークであり、スコープ漏れのリスクはない

修正不要。

---

## 結論

全ての主要ドメイン不変条件が正しく実装されていることを確認した。

- **テナント分離**: 全クエリ・全アクションにわたってテナントスコープが担保されている
- **監査ログ完全性**: create / revoke の両操作が同一トランザクション内で確実に記録され、append-only が維持されている
- **承認ワークフロー不変条件**: 既存のワークフロー関連コードへの変更はなく、不変条件は破壊されていない

- **verdict**: approved
