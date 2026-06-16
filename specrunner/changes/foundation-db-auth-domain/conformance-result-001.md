# Conformance Result — foundation-db-auth-domain — iter 001

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
| tasks.md | ✅ | T-01〜T-17 全チェックボックスが [x] 済み |
| design.md | ✅ | D1〜D11 全設計判断が実装済み |
| spec.md | ✅ | 全 7 Requirements (状態遷移/テナント分離/監査ログ/Server Actions/admin 認可/認証/初期 status) が適合 |
| request.md | ✅ | 全受け入れ基準が充足（build/lint/typecheck/test すべて green） |

---

## 1. Tasks Completeness

**Result: PASS**

T-01 〜 T-17 のすべてのチェックボックスが `[x]` でマーク済み。未完了タスクなし。

---

## 2. Design Decisions (D1〜D11)

| ID | Decision | Status | Notes |
|----|----------|--------|-------|
| D1 | Drizzle ORM 採用 | ✅ | `drizzle-orm ^0.45.2`, `drizzle-kit ^0.31.10` |
| D2 | postgres.js + `drizzle-orm/postgres-js` | ✅ | `src/infrastructure/db.ts` で `drizzle-orm/postgres-js` を使用 |
| D3 | Auth.js v5 Credentials provider | ✅ | `next-auth ^5.0.0-beta.31`, bcryptjs.compare でパスワード検証 |
| D4 | Auth 設定を `src/infrastructure/auth.ts` に配置 | ✅ | route handler は `src/app/api/auth/[...nextauth]/route.ts` |
| D5 | bcryptjs 採用 | ✅ | `bcryptjs ^3.0.3`, seed.ts で `bcrypt.hash("password123", 12)` |
| D6 | スキーマを infrastructure 層、domain は ORM 非依存 | ✅ | `src/domain/models/` に Drizzle import なし (grep 確認済み) |
| D7 | audit_logs を独立テーブルとして設計 | ✅ | `src/infrastructure/schema.ts` に `auditLogs` テーブル定義 |
| D8 | 状態遷移ルールを domain 層で管理 | ✅ | `src/domain/services/requestTransition.ts` に `VALID_TRANSITIONS` + `validateTransition` |
| D9 | `src/proxy.ts` + `proxy` 関数名 | ✅ | export 関数名 `proxy`, matcher 設定あり |
| D10 | ルートグループ `(auth)` / `(dashboard)` | ✅ | `src/app/(auth)/login/`, `src/app/(dashboard)/requests/` 等 |
| D11 | リポジトリ全メソッドに organizationId を付与 | ✅ | `requestRepository.findById`, `findAllByOrganization`, `updateStatus` すべてに `organizationId` WHERE 条件あり |

---

## 3. Spec Requirements

### Req-1: 申請の状態遷移は定義済みルールに従わなければならない

**Result: PASS**

`src/domain/services/requestTransition.ts` に `VALID_TRANSITIONS = { draft: ["pending"], pending: ["approved", "rejected"] }` が定義されている。`validateTransition` 関数は許可外の遷移に対して `{ ok: false, reason: "..." }` を返す。

- `draft → pending`: ✅ allowed
- `pending → approved`: ✅ allowed
- `pending → rejected`: ✅ allowed
- `draft → approved`: ✅ rejected (`VALID_TRANSITIONS["draft"]` に "approved" なし)
- `approved → pending`: ✅ rejected (終端状態 — `VALID_TRANSITIONS["approved"]` は undefined)

### Req-2: すべてのデータアクセスはテナント分離されなければならない

**Result: PASS**

- `requestRepository.findById(id, organizationId)` — `and(eq(requests.id, id), eq(requests.organizationId, organizationId))` ✅
- `requestRepository.findAllByOrganization(organizationId)` — `where(eq(requests.organizationId, organizationId))` ✅
- `requestRepository.updateStatus(id, organizationId, ...)` — `and(eq(requests.id, id), eq(requests.organizationId, organizationId))` ✅
- `createRequestAction` で `organizationId` は `session.user.organizationId` から取得 — リクエストボディからの organizationId 受け入れなし ✅

### Req-3: 状態変更時に監査ログが記録されなければならない

**Result: PASS**

- `approveRequest` — `action: "request.approve"` で audit log 挿入 ✅
- `rejectRequest` — `action: "request.reject"` で audit log 挿入 ✅
- `submitRequest` — `action: "request.submit"` で audit log 挿入 ✅

### Req-4: Server Actions は入力バリデーションと認証チェックを行わなければならない

**Result: PASS**

- `createRequestAction`: `auth()` → zod (`createRequestSchema`) → usecase の順 ✅
- `submitRequestAction`, `approveRequestAction`, `rejectRequestAction`: `auth()` チェックあり ✅
- `loginAction`: `loginSchema` (email + password) で zod バリデーション ✅
- すべての Server Action に `"use server"` ディレクティブあり ✅

### Req-5: 申請の承認・却下は admin ロールのみが実行できなければならない

**Result: PASS**

`approveRequestAction` (L84) と `rejectRequestAction` (L106) の両方で `if (session.user.role !== "admin") return;` によるロールチェックが実施されている。

### Req-6: Credentials provider でメール/パスワード認証が機能しなければならない

**Result: PASS**

- `findByEmail(email)` でユーザー取得 → `bcrypt.compare(password, user.hashedPassword)` でパスワード照合 ✅
- `callbacks.jwt` で `userId`, `organizationId`, `role` を JWT に付与 ✅
- `callbacks.session` でセッションに `userId`, `organizationId`, `role` を付与 ✅
- `src/types/next-auth.d.ts` で `Session`, `User`, `JWT` の型拡張済み ✅

### Req-7: 申請作成時の初期ステータスは draft でなければならない

**Result: PASS**

`requestRepository.create` で `status: "draft"` を固定値として挿入 (`src/infrastructure/repositories/requestRepository.ts:L27`)。usecase や action が status を受け取る引数を持たない。

---

## 4. Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `bun run build` が成功する | ✅ | verification-result.md: build passed, exit 0 |
| Drizzle schema から migration を生成できる | ✅ | `drizzle.config.ts` に schema/out/dialect/dbCredentials 設定済み |
| シードスクリプト実行後のフロー操作が可能 | ✅ | `src/infrastructure/seed.ts` で org/users/requests を生成、UI フローも実装済み |
| 状態遷移ルールに従い不正な遷移を拒否する | ✅ | `validateTransition` が usecase で呼び出され、失敗時は Error を throw |
| audit_logs テーブルに状態変更が記録される | ✅ | submit/approve/reject 各 usecase で audit log 挿入 |
| Server Actions に zod バリデーションが適用されている | ✅ | `createRequestSchema`, `loginSchema` が適用済み |
| 依存方向 `actions → usecases → domain / infrastructure` を遵守 | ✅ | `grep -r "from.*@/infrastructure" src/domain/` = 0 件 |
| `.env.example` に `DATABASE_URL`, `AUTH_SECRET` が記載されている | ✅ | `.env.example` に両変数あり |
| `bun run lint` がエラーなし | ✅ | verification-result.md: lint passed (warnings 3 件、errors 0 件) |
| `typecheck && test` が green | ✅ | review-feedback-002.md: typecheck exit 0, bun test 51/51 pass |

---

## 5. Notable Findings

### F-1 [low / 既知] void 戻り値によるエラー握り潰し

- **対象**: `src/app/actions/requests.ts` — `submitRequestAction`, `approveRequestAction`, `rejectRequestAction`
- **内容**: 3 アクションが `Promise<void>` を返し、usecase が `{ ok: false, reason }` を返した場合に `throw new Error(result.reason)` で re-throw している。`useActionState` を使ったユーザーへの構造化フィードバックはなく、`createRequestAction` との一貫性がない。
- **spec 適合性**: spec に `approveRequest`/`rejectRequest` の戻り値型要件は明示されていない。エラー時に Error を throw する動作は「拒否する」要件を満たす。機能的には spec 準拠。
- **影響**: UX と保守性の観点での low 課題。code-review-002 にて verdict approved 済み。conformance には影響しない。

---

## Summary

全タスク完了 [x]、設計判断 D1〜D11 すべて実装済み、spec Requirements 7 件すべて適合、受け入れ基準 10 件すべて達成。継続中の F-1 は low 重要度の UX 課題であり、spec および受け入れ基準への不適合はない。
