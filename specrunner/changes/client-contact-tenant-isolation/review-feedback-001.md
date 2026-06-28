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
| 1 | LOW | testing | `src/__tests__/infrastructure/clientContactTenantIsolation.test.ts` | TC-001〜TC-008（「自組織の担当者を返す」「他組織には空配列/null/false を返す」）が DB 統合テストではなく静的ソース検証で代替されている。SQL の実行時意味論（innerJoin/サブクエリが実際に機能するか）は静的テストでは検証できない。ただしプロジェクト全体が静的検証パターンを採用しており、spec-review でも LOW/許容範囲と評価済み。TypeScript strict モードと Drizzle ORM の型付きクエリビルダーが間接的に正しさを担保する。 | 現時点では許容範囲。DB 統合テスト環境を整備する場合は別リクエストで対応する。 | no |
| 2 | LOW | maintainability | `src/infrastructure/repositories/clientRepository.ts` L200, L229 | `updateContact` / `deleteContact` の org チェックサブクエリ内で `queryRunner` ではなく `db` を直接参照している。Drizzle ORM ではサブクエリは SQL フラグメントとして親クエリに埋め込まれ外側の `queryRunner.update/delete` によって実行されるため実動作上の問題はない。`findContactsByClientId` / `countContactsByClientIds` が innerJoin を用いるのに対し UPDATE/DELETE はサブクエリを採用しておりアプローチの非対称性があるが、Drizzle が UPDATE/DELETE の JOIN をネイティブサポートしないため設計上意図的（design.md D1 / tasks.md T-02・T-03）。 | 実害なし。JSDoc に「サブクエリは SQL フラグメントとして親クエリに埋め込まれるため `db` で可」と補足すると将来の読者に意図が伝わる（任意）。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 10 | 0.30 |
| security | 10 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 9.55

## Summary

### 受け入れ基準の充足確認

| 受け入れ基準 | 結果 |
|---|---|
| `findContactsByClientId` / `updateContact` / `deleteContact` / `countContactsByClientIds` が `organizationId` を受け取り、他組織には結果を返さない | ✅ 全 4 メソッドのシグネチャ確認。innerJoin（SELECT/COUNT）またはサブクエリ（UPDATE/DELETE）で org 条件を強制 |
| 全呼び出し元が `organizationId` を渡している（typecheck green） | ✅ 8 呼び出し元（4 RSC ページ・2 usecase・1 service・1 action）すべて更新済み。`bun run typecheck` exit 0 |
| 顧客担当者の追加・編集・削除・一覧の振る舞いが従来どおり | ✅ `bun test` 1262 pass / 0 fail |
| 依存方向 actions/RSC → usecases → domain / infrastructure を遵守 | ✅ RSC ページは usecase 経由。domain 層から infrastructure への逆依存なし |
| `bun test` green / `typecheck` green / `bun run build` 成功 | ✅ 全 phase 通過（build 23.3s / typecheck 3.6s / test 0.4s / lint 5.7s） |

### 実装の正しさ

**repository 層**: `findContactsByClientId` と `countContactsByClientIds` は `findAllContactsByOrganization` と同一の `innerJoin(clients, eq(clientContacts.clientId, clients.id)) + eq(clients.organizationId, organizationId)` パターンを採用。`updateContact` と `deleteContact` は Drizzle ORM の制約上 `inArray(clientContacts.clientId, db.select({id: clients.id}).from(clients).where(eq(clients.organizationId, organizationId)))` サブクエリで同等の絞り込みを実現しており、意味論的に正しい。

**多重防御（D2）**: `deleteClientContact` usecase は `findById(data.clientId, data.organizationId)` による親 client の事前検証を維持。`updateClientContactAction` も `findById(clientId, session.user.organizationId)` を維持。3 層防御（action → usecase → repository）が完全に維持されている。

**JSDoc 更新**: 4 メソッドすべてで caller 規約の記述が削除され、「repository 自身が organizationId で強制する」旨に更新されている。

**テスト**: 新規テスト 21 件がすべて pass。repository の 4 メソッドへの `organizationId` 追加（シグネチャ・クエリ構造）と、全 8 呼び出し元への `organizationId` 伝搬を静的に固定している。

### セキュリティ評価

本変更は OWASP A01（Broken Access Control）に対する直接の修正。caller 規約依存という単一障害点を排除し、repository 層がテナント分離の最終防衛線となった。`organizationId` は Auth.js session 由来でクライアント改ざん不可。Drizzle ORM の型安全 API により SQL インジェクションの懸念なし。

全受け入れ基準を充足。HIGH/CRITICAL 相当の問題なし。実装はリクエストの要件・設計判断（D1〜D5）・認可設計 §5（テナント分離はインフラストラクチャ層で強制する）と完全に整合している。
