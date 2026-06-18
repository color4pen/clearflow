# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Architecture | tasks.md: T-12, T-06 | 編集ページ（T-12）が `approvalTemplateRepository.findById` をページコンポーネントから直接呼び出している。T-10（`listTemplatesAction`）や T-13（`listUsersAction`）は全て actions 層を経由しているにもかかわらず、T-12 だけが repository を直接呼ぶ設計になっており、ページは「UI のみ」とするアーキテクチャ原則、および受け入れ基準の「依存方向 `actions → usecases → domain / infrastructure` を遵守」と矛盾する。セキュリティ上の問題（admin ガード・organizationId のセッション取得）はページ側で確保されており、実害は限定的だが、同一フィーチャ内で二重基準になる。 | T-06 に `getTemplateAction(id: string)` を追加し、セッション取得・admin ガード・organizationId スコープ付き `approvalTemplateRepository.findById` 呼び出しをカプセル化する。T-12 の編集ページは repository 直接呼び出しを `getTemplateAction(id)` に置き換える。 |
| 2 | LOW | Spec gap | tasks.md: T-11 | `ApprovalTemplateStep` 型の `stepOrder: number` フィールドの扱いがフォーム仕様（T-11）に記載されていない。フォーム UI で手動入力させるのか、配列インデックス+1 で自動付与するのかが未定義であり、実装者によって解釈が分かれるリスクがある。 | T-11 に「stepOrder は配列の順番から 1-indexed で自動付与する（UI で入力不要）」と一行追記する。 |
| 3 | LOW | Security | tasks.md: T-03 | `existsPendingByTemplateId` は `audit_logs.targetId`（schema 定義: `text` 型）と `requests.id`（`uuid` 型）を JOIN する。PostgreSQL は暗黙キャストで動作するが、型不一致によりインデックスが使われない場合があり、audit_logs が大量行になった際にパフォーマンス劣化するリスクがある。T-03 は JSDoc 追加を求めているが、この型差異については言及していない。 | T-03 の JSDoc 要件に「`audit_logs.targetId` は `text` 型、`requests.id` は `uuid` 型のため JOIN 時に `::uuid` キャストを適用してインデックス利用を確保する」を追記する。 |
| 4 | LOW | Spec gap | tasks.md: T-08 | アクティブナビゲーションリンクのスタイル実装が「`usePathname()` は使えないため、…方式を検討する」と曖昧なままになっており、具体的な実装方針が未定義。実装者によって別々のアプローチが選ばれ、一貫性が失われる可能性がある。 | T-08 に具体的なパターンを指定する。推奨: `NavLink.tsx` という Client Component を作成し、`usePathname()` で現在パスを取得してアクティブスタイルを適用する。Server Component のレイアウトはこの Client Component を利用する形に明記する。 |

## Review Notes

**セキュリティ評価（OWASP Top 10 観点）**

- **Broken Access Control**: admin ガードが settings レイアウト（T-08）・各ページ・各 Server Action の 3 層で適用されており、二重防護以上の構成になっている。Server Action レベルのガードが主たる保護であり、他は深層防御として機能する。適切。
- **テナント分離**: `organizationId` は全 repository メソッドの引数に含まれ、全 Server Action でセッションから取得している（T-06 AC / T-07 AC に明記）。T-16 の静的解析テストが自動検証を担保する。適切。
- **Injection**: Drizzle ORM のパラメータ化クエリを使用しているため SQL インジェクションリスクなし。T-03 の `jsonb` 演算子（`->>`）も Drizzle/drizzle-orm の SQL テンプレートリテラル経由であれば安全。
- **自己降格防止**: D4 が `actorId === targetUserId` チェックで admin の自己降格を禁止している。admin が他の admin を降格させた後に自分だけが残る形になる場合（ "last admin" シナリオ）は認識されており、自己降格禁止により少なくとも操作者自身は admin のままに留まるため、組織内に最低 1 名の admin が常に存在する保証がある。architect 評価済みの設計判断として許容範囲内。
- **入力バリデーション**: テンプレートフォームに zod スキーマ（name 必須・steps 1件以上・minAmount ≤ maxAmount refine）、ユーザーロール変更に role enum バリデーションが指定されており適切。`organizationId` はリクエストボディから受け取らないことが明記されている。

**仕様間の一貫性**

request.md → design.md → tasks.md → spec.md のトレーサビリティは全体として高い。`audit_logs` 経由の使用中チェック（D1 / T-03）は request-review でも論点になったが、design.md のリスク欄（[Risk] audit_logs 経由のテンプレート使用中チェックは間接参照）で明示的に認識・対処されている。T-14/T-15/T-16 の静的解析テストは既存プロジェクトのテストパターン（`projectStructure.test.ts`）と一致しており、採用方針として一貫している。
