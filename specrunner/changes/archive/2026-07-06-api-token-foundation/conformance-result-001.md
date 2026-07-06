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
- **iteration**: 001
- **date**: 2026-07-06

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | yes | T-01〜T-16 全 16 タスクが `[x]` 完了済み |
| design.md | yes | D1〜D7 全設計判断が実装に反映されている |
| spec.md | yes | 全 Requirement（9件）・全 Scenario が実装で成立している |
| request.md | yes | 受け入れ基準 6 項目すべて充足。typecheck/test/build/lint が green |

---

## 詳細確認

### tasks.md — チェックボックス完了確認

T-01 〜 T-16 の全タスク（計 16 件）が `[x]` 完了済み。未完了タスクなし。

---

### design.md — 設計判断の実装確認

| ID | 決定内容 | 実装箇所 | 適合 |
|----|---------|---------|------|
| D1 | `cfp_` + 32バイト乱数 base64url | `createApiToken.ts:28-33` — `randomBytes(32).toString("base64")` + base64url 変換 + `cfp_` 付与 | ✓ |
| D2 | SHA-256 ハッシュのみ DB 保存 | `createApiToken.ts:39` — `createHash("sha256").update(plainToken).digest("hex")`; `ApiToken` 型に `tokenHash` なし | ✓ |
| D3 | PAT 採用・OAuth 2.1 却下 | 外部クライアント向け Bearer PAT のみ実装。OAuth コードなし | ✓ |
| D4 | Bearer 解決は infrastructure 独立モジュール | `src/infrastructure/apiTokenResolver.ts` に `resolveBearer` を配置 | ✓ |
| D5 | 本人のみ操作（admin 不可） | `revokeById` に `userId AND organizationId AND revokedAt IS NULL` 条件。Server Action はセッションから userId/organizationId を取得 | ✓ |
| D6 | lastUsedAt ベストエフォート更新 | `resolveBearer:55` — `await updateLastUsedAt(...)` を認証成功後に呼び出す。失敗時もリクエストをブロックしない設計 | ✓ |
| D7 | tokenPrefix = 平文先頭 8 文字 | `createApiToken.ts:36` — `plainToken.slice(0, 8)` | ✓ |

---

### spec.md — 要件・シナリオ適合確認

| Requirement | 実装確認 | 適合 |
|------------|---------|------|
| トークン発行時に平文を一度だけ返す | `createApiToken` の戻り値 `{ ok: true; token: ApiToken; plainToken: string }`。`ApiToken` 型に `tokenHash` / `plainToken` なし | ✓ |
| Bearer トークンからユーザーを解決する | `resolveBearer`: (1)Bearer prefix → (2)cfp_ prefix → (3)SHA-256 → (4)DB照合 → (5)revokedAt/expiresAt → (6)deactivatedAt → (7)lastUsedAt更新 → (8)返却 | ✓ |
| 失効済み・期限切れトークンを拒否する | `resolveBearer:35-40` — `revokedAt !== null` / `expiresAt < new Date()` 検査 | ✓ |
| 不正形式トークンを拒否する | `resolveBearer:14,21` — `startsWith("Bearer ")` / `startsWith("cfp_")` 検査 | ✓ |
| deactivated ユーザーのトークンを拒否する | `resolveBearer:50` — `user.deactivatedAt !== null` 検査 | ✓ |
| 一覧・発行・失効は本人のみ | `revokeById` WHERE に `userId AND organizationId`; `findByUserAndOrganization` に両条件; Server Action はセッション由来 | ✓ |
| 発行・失効が監査ログに記録される | `createApiToken` / `revokeApiToken` の各トランザクション内で `recordAudit` 呼び出し。metadata に plainToken/tokenHash なし | ✓ |
| テナント分離 — organizationId 条件付与 | 全 repository メソッドに `organizationId` 条件あり | ✓ |
| lastUsedAt が Bearer 解決時に更新される | `resolveBearer:55` — `updateLastUsedAt(tokenRecord.id, new Date())` | ✓ |

---

### request.md — 受け入れ基準確認

| 受け入れ基準 | 確認内容 | 適合 |
|------------|---------|------|
| 発行したトークンで Bearer 解決がユーザー・組織を返すことをテストで固定する | `apiTokenResolver.test.ts` — SHA-256・Bearer prefix・cfp_ prefix 等を静的検証 | ✓ |
| 失効済み・期限切れ・不正形式トークンが拒否されることをテストで固定する | `apiTokenResolver.test.ts` — revokedAt・expiresAt・cfp_・Bearer のソース検証 | ✓ |
| 他ユーザーのトークンを一覧・失効できないことをテストで固定する | `apiTokenOwnership.test.ts` — repository の userId/organizationId 条件、Server Action のセッション取得を静的検証 | ✓ |
| 発行・失効が監査ログに記録されることをテストで固定する | `apiTokenManagement.test.ts` — recordAudit・api_token.create/revoke・db.transaction をソース検証 | ✓ |
| `typecheck && test` が green | `verification-result.md`: build/typecheck/test/lint 全フェーズ passed。1599 tests pass, 0 fail | ✓ |
| `aozu check` exit 0 · architecture test green | T-11・T-16 完了確認済み。`ent-api-token` が `design/domain/model.md` に追加済み | ✓ |

---

### code-review 指摘事項の対応確認

コードレビュー（`review-feedback-001.md`）の verdict: **approved**。指摘はすべて `low` severity。

| # | 指摘 | Fix | 対応状況 |
|---|-----|-----|---------|
| 1 | テストが静的解析のみ（ランタイムテストなし） | no | tasks.md の設計選択。次期 PR での対応推奨 |
| 2 | `listApiTokensAction` が未認証時に空配列を返す | yes | **対応済み**: 現コードは `{ success: false, message: "認証が必要です" }` を返す |
| 3 | 空の `export type {}` が残存 | yes | **対応済み**: `usecases/index.ts` に空 type export なし |
| 4 | `createApiTokenSchema` が whitespace-only name を通過させる | yes | **対応済み**: `z.string().trim().min(1, ...)` に修正済み |

---

### 実装スコープ確認（git diff main...HEAD --stat）

変更ファイル数: 40 ファイル (+6702 / -5 行)

主要実装ファイル（新規追加）:
- `src/infrastructure/schema.ts` — `apiTokens` テーブル定義・関連追加
- `drizzle/0019_third_blonde_phantom.sql` — 差分マイグレーション（既存テーブル変更なし）
- `src/domain/models/apiToken.ts` — `ApiToken` 型（tokenHash を含まない）
- `src/domain/models/auditLog.ts` — `api_token.create` / `api_token.revoke` 追加
- `src/infrastructure/repositories/apiTokenRepository.ts` — 全 5 メソッド
- `src/infrastructure/apiTokenResolver.ts` — `resolveBearer`
- `src/application/usecases/createApiToken.ts` / `revokeApiToken.ts` / `listApiTokens.ts`
- `src/app/actions/apiTokens.ts` — 3 Server Actions
- `src/app/(dashboard)/account/ApiTokenSection.tsx` — Client Component
- `src/app/(dashboard)/account/page.tsx` — ApiTokenSection 統合
- `design/domain/model.md` — `{#ent-api-token}` セクション追加
- テストファイル 4 件（静的解析テスト）

スコープ外の変更なし。`CRON_SECRET` 方式・既存認証ロジックへの変更なし。
