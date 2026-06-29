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
| 1 | MEDIUM | テスト整合性 | request.md vs tasks.md T-10/T-11 | request.md のテスト方針（必須）は「実 DB に対して usecase / repository を実行し、DB 状態・監査ログを assert する」と明記する。しかし tasks.md の T-10・T-11 はいずれも `mock.module` によるモジュールモックを採用しており、実 DB は使用しない。プロジェクト内の既存 `.dynamic.test.ts`（watchDeal.dynamic, getNotifications.dynamic）も同様にモジュールモックを使用しており、プロジェクト規約とは tasks.md が一致しているが、request.md の要件とは矛盾している | 実装は tasks.md に従いモジュールモックで進めてよい（プロジェクト規約に適合）。ただし request.md のテスト方針の「実 DB」という表現が誤解を生むため、「モジュールモックによりビジネスロジックを検証し、実 DB へのアクセスは統合テストの対象外とする」旨に修正することを推奨 |
| 2 | MEDIUM | 仕様曖昧性 | tasks.md T-08 | 非スーパー管理者が `/platform` レイアウトに到達した際の拒否動作が「リダイレクトまたは 403 相当表示」と二択を残している。実装者がどちらを選択するかによりテスト内容（T-12）が変わる可能性がある | どちらか一方を明示する。既存の `(dashboard)/layout.tsx` パターン（認証なし → `/login` へ redirect）と統一するなら「スーパー管理者でない認証済みユーザーは `/dashboard` または `/login` にリダイレクトする」と明記することを推奨 |
| 3 | LOW | データ整合性 | spec.md Requirement: 組織プロビジョニング | `organizations.name` に UNIQUE 制約がないため（schema.ts 確認済み）、同一名の組織を複数作成できる。これが意図的な設計かどうかが spec 上で明示されていない | 意図的であれば spec に「組織名の一意性は担保しない（運用上の管理で対応）」と明記する。一意性が必要なら T-03 に UNIQUE 制約または重複チェックを追加する |
| 4 | LOW | セキュリティ | tasks.md T-07 | 初期 admin パスワードの zod バリデーションが `z.string().min(8)` のみで、複雑性要件（大文字・小文字・数字・記号の組み合わせ）が規定されていない。スーパー管理者が生成する初期パスワードのため直接のリスクは低いが、ポリシーとして記録する | スコープ外として記録するか、`adminPassword: z.string().min(8).regex(...)` 等でパスワードポリシーを追加する |
| 5 | LOW | パフォーマンス | tasks.md T-03 / T-05 | `organizationRepository.findAll()` はページネーションなしで全組織を返す。現状の用途（スーパー管理者のみ）では問題ないが、組織数が大規模になった場合のリスクとして記録する | 現状スコープでは許容範囲。将来のリスクとして設計メモに記録することを推奨 |

## Review Notes

### 仕様の整合性検証

#### コードベース確認（spec.md の前提条件）

request.md に記載された前提条件をコードで確認済み：

- `organizations` テーブル: `id / name / created_at` の 3 カラム、UNIQUE 制約なし ✅（スキーマ変更不要）
- `organizationRepository.ts`: `findById` / `update` のみ。`create` / `findAll` は存在しない ✅（T-03 で追加）
- `userRepository.create(data, tx?)`: 存在し、トランザクション対応済み ✅
- `auditLog.ts AuditAction`: `"organization.update"` は存在するが `"organization.create"` は存在しない ✅（T-02 で追加）
- `auditLog.ts AuditTargetType`: `"organization"` は追加済み ✅
- `authorization.ts canPerform`: 組織内 RBAC のみ。組織横断権限なし ✅

#### セキュリティレビュー（OWASP Top 10）

**A01 – Broken Access Control**: 二重ゲート設計を確認。
- `(platform)/layout.tsx` でのレイアウトゲート（T-08）
- Server Action 全件での `auth()` + `isSuperAdmin` 二重チェック（T-07）
- `isSuperAdmin` 判定は純関数で `process.env.SUPER_ADMIN_EMAILS` を request ごとに評価するため、env 更新が即時反映される ✅
- Server Action が `organizationId` を入力から受け取らない設計（T-07 の AC に明記）はインジェクション経路を排除する ✅

**A03 – Injection**: Drizzle ORM のパラメータ化クエリを使用。Zod によるスキーマ検証（T-07）。`bcrypt.hash(password, 12)` によるパスワードハッシュ化（T-04）。SQL インジェクションリスクなし ✅

**A07 – 認証の欠陥**: `auth()` による Auth.js v5 JWT 認証。`session.user.email` は DB 登録時の email（`findByEmailForAuth` 経由で設定）。`email` フィールドは `userRepository` に update メソッドが存在せず、メールアドレス変更経路がないため session hijack による email 偽装は困難 ✅

**FK 制約の懸念（設計 D3 の検証）**: `auditLogs.actorId → users.id`（org スコープなし）、`auditLogs.organizationId → organizations.id`（独立）。スーパー管理者の `actorId`（自組織の user.id）と `organizationId`（新組織の id）の組み合わせは FK 制約を満たす ✅（request-review-result-001 の分析と一致）

**テナント分離**: 新規追加の `organizationRepository.create` / `findAll` 以外に非スコープクエリは spec 上存在しない。`findAll` の返却値が `organizations` テーブルのメタ情報のみ（id / name / createdAt）に限定されている点が spec.md の MUST NOT 要件を満たす ✅

#### 設計整合性

- design.md D1〜D7 の各決定は tasks.md の T-01〜T-08 に正確に対応している ✅
- アーキテクチャ依存方向（actions → usecases → domain / infrastructure）が全タスクで遵守されている ✅
- `isSuperAdmin` の配置（`src/domain/services/superAdmin.ts`）は domain layer に純関数を置く既存パターンに合致 ✅
- `(platform)` と `(dashboard)` の独立ルートグループ設計（D5）は、`(dashboard)/layout.tsx` が持つ `organizationId` 依存のサイドバー構造を正しく回避している ✅

#### 受け入れ基準の充足確認

| AC | 対応タスク | 充足評価 |
|---|---|---|
| isSuperAdmin のみ /platform アクセス可 | T-07, T-08, T-12 | ✅ Server Action + レイアウトで二重保護 |
| 組織＋初期 admin 作成・role=admin 確認 | T-04, T-10 | ✅ usecase + モックテストで検証 |
| organization.create 監査ログ記録 | T-02, T-04, T-10 | ✅ AuditAction 追加 + recordAudit + テスト |
| テナント横断経路なし | 設計制約（spec.md レビュー） | ✅ 新規コードが organizations メタ以外を横断しない |
| 依存方向遵守 | 全タスク | ✅ |
| typecheck / build / test green | T-13 | ✅ 最終検証タスクで担保 |

### 総評

CRITICAL / HIGH の所見なし。セキュリティ上の欠陥、テナント分離の破壊、依存関係の逆転はいずれも設計・仕様レベルで適切に対処されている。MEDIUM 2件（テスト方針の用語矛盾・アクセス拒否動作の曖昧性）は実装を阻害しない。実装はタスクの定義どおりに進めてよい。
