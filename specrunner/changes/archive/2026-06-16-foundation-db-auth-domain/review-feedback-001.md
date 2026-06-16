# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: needs-fix
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | high | testing | `package.json` | `test`・`typecheck`・`db:generate`・`db:migrate`・`db:seed` の 5 スクリプトが未追加。T-01 の acceptance criteria（scripts 追加）が未達成。verification フェーズで typecheck・test が「skipped — script not found」となり、29 件の自動テストが一度も実行されていない。受け入れ基準「typecheck && test が green」の検証が不可能な状態。 | `"test": "bun test"`, `"typecheck": "tsc --noEmit"`, `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`, `"db:seed": "bun run src/infrastructure/seed.ts"` を scripts に追加する。 | yes |
| 2 | medium | maintainability | `package.json` | `zod` が直接 import されているが（`src/app/actions/auth.ts:3`、`src/app/actions/requests.ts:3`）、`package.json` の `dependencies` / `devDependencies` に宣言されていない。現在は `eslint-plugin-react-hooks` 経由の間接依存として解決されており、next-auth の将来バージョンで依存が外れると無宣言の import が runtime エラーになる。 | `bun add zod` を実行して `dependencies` に追加する。 | yes |
| 3 | low | correctness | `src/app/actions/requests.ts` | `submitRequestAction`（L57）・`approveRequestAction`（L74）・`rejectRequestAction`（L92）が `Promise<void>` を返し、ユースケースの `{ ok: false, reason }` 結果を握り潰している。不正な状態遷移（例: 既に approved な申請を再承認）や DB エラー発生時にユーザーへのフィードバックが一切ない。`createRequestAction` は `CreateRequestState` を返して適切にエラーを伝播しており、一貫性がない。 | 各アクションに `ActionResult` 型（`{ ok: true } \| { ok: false; message: string }`）を導入し、usecase の `ok: false` 時にエラーメッセージを返す。UI 側ではフォームの `action` から `useActionState` に切り替えてエラー表示を行う。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 6 | 0.10 |

- **total**: 8.10

## Summary

実装全体の完成度は高い。ドメイン層の純粋性（ORM 非依存の型定義）、依存方向（actions → usecases → domain / infrastructure）、テナント分離（全クエリへの organizationId 付与）、認証フロー（Auth.js v5 Credentials + JWT session）のいずれも設計通りに実装されており、`bun run build` と lint は共に成功している。

一方で以下の 3 点の修正が必要：

**[高] スクリプト未追加（最重要）**  
tasks.md T-01 に `✅` が付いているにもかかわらず `db:generate` / `db:migrate` / `db:seed` / `test` / `typecheck` の 5 スクリプトが package.json に存在しない。verification フェーズでテストが実行されず、29 件の自動テスト（TC-001〜TC-023 等をカバー）の合否が未検証のままとなっている。受け入れ基準「typecheck && test が green」を満たすためにまず解消が必要。

**[中] zod 未宣言依存**  
Server Actions で `zod` を直接 import しているが、package.json に宣言がない。間接依存として現在動作しているが、依存グラフの変化で壊れるリスクがある。

**[低] submit/approve/reject のエラー握り潰し**  
state-transition 失敗や DB エラーが発生した場合にユーザーへのフィードバックがない。spec に明示要件はないが、`createRequestAction` との一貫性のためにも対処が望ましい。

セキュリティ面では role=admin チェック・テナント分離・bcryptjs によるパスワード照合・zod バリデーションがすべて適切に実装されており、大きな懸念はない。
