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

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | MEDIUM | testing | `src/__tests__/usecases/provisionOrganization.dynamic.test.ts` | TC-019（任意ステップ失敗時の全ロールバック）が未カバー。`state.throwCode = "23505"` モックは `db.transaction` コールバック実行前にエラーを throw するため、「org 作成後に userRepository.create が失敗する」中間失敗シナリオを検証していない。test-cases.md では must/integration に分類されている | `state` に `failAtUserCreate` フラグを追加し、`organizationRepository.create` 成功後に `userRepository.create` がエラーを throw するモックを組み、`orgCreateArgs != null && result.ok === false` を assert する | no |
| 2 | MEDIUM | testing | （テストファイル未作成） | TC-010〜TC-014（organizationRepository の integration テスト）が実装されていない。`create` の TX 参加（TC-011）・`findAll` の `createdAt` 降順（TC-013）はモック上位レイヤーからは観測できず、test-cases.md の must/integration 分類を満たしていない。ただし request-review-result および spec-review-result がいずれも「プロジェクト規約はモックベース」として承認済み | 将来の DB 統合テスト整備タスクとして記録する。現状はプロジェクト規約（watchDeal.dynamic, getNotifications.dynamic 等と同一パターン）に準拠しており、リリースブロッカーではない | no |
| 3 | LOW | performance | `src/app/(platform)/platform/page.tsx:5` | RSC（PlatformPage）から `listAllOrganizationsAction()` を呼び出しており、`(platform)/layout.tsx` が既に `isSuperAdmin` を検証済みにもかかわらず `auth() + isSuperAdmin` チェックを再実行している。1 リクエストあたり auth セッション取得が 2 回発生する | RSC 内では直接 `listAllOrganizations()` usecase を呼ぶか、layout から props / context でセッションを渡す。ただし現行は defense-in-depth として許容範囲 | no |
| 4 | LOW | UX | `src/app/(platform)/layout.tsx:16` | 認証済みだが非スーパー管理者のユーザーを `/login` にリダイレクトしている。既にログイン済みのユーザーが `/login` に誘導されると混乱しやすい。spec-review-result-001 所見 #2 と同一 | `/dashboard` または専用の 403 ページへのリダイレクトを検討する。セキュリティ上の欠陥ではなく UX 改善 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 10 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 9.05

## Summary

CRITICAL / HIGH の所見なし。全受け入れ基準を充足しており、マージ可能と判断する。

**正当な実装**

- `isSuperAdmin` は env を request ごとに評価する純関数として domain layer に正しく配置されている。単体テストが TC-001〜TC-008 全ケースを網羅している
- `organizationRepository.create` / `findAll` は既存パターンに準拠し、`findAll` は organizations テーブルのメタ情報（id / name / createdAt）のみを返してテナント分離を維持している
- `provisionOrganization` usecase は email 事前チェック → bcrypt ハッシュ（TX 外で計算、パフォーマンス上も正当）→ 同一トランザクションで org 作成 → user 作成 → audit ログ記録の順序が正しい。23505 キャッチがトランザクション外側の `try/catch` で処理されており、TOCTOU レースも含む全ケースを捕捉できる
- Server Action が `auth() + isSuperAdmin` を全 Action で二重チェックし、`organizationId` を入力から受け取らない設計はインジェクション経路を排除している。`canPerform`（組織内 RBAC）を使用していない点も仕様どおり
- `(platform)` ルートグループが `(dashboard)` と独立しており、organizationId に依存しないレイアウトを持つ

**テスト方針の補足**

request.md の「実 DB で検証」要件と tasks.md のモックベースアプローチの矛盾は spec-review-result-001 所見 #1 で MEDIUM 評価済み。プロジェクトの `.dynamic.test.ts` 規約（watchDeal / getNotifications）と整合しており、ビジネスロジック（引数受け渡し・監査ログ action 名・エラー分岐）はモックで十分に固定されている。所見 #1・#2 はリリース後の継続的テスト整備タスクとして扱うことを推奨する。

