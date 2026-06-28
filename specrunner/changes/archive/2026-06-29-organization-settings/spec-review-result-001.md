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
| 1 | MEDIUM | 監査ログ品質 | tasks.md / T-04 | `updateOrganization` usecase の `recordAudit` が `metadata: { name }` (新名称のみ) を記録する。既存の `updateUserRole` は `{ oldRole, newRole }` の両値を記録しており、変更前後を追跡できる。組織名変更の場合、「変更前の名称が何だったか」が監査ログから読み取れないため、インシデント調査・コンプライアンス対応で情報量が不足する可能性がある。 | usecase 内で `organizationRepository.update` を呼ぶ前に現在の組織データを `findById` で取得し、`metadata: { oldName: current.name, newName: name }` として記録するよう spec を更新する。`updateUserRole` の実装パターンに揃える。 |
| 2 | LOW | アーキテクチャ | tasks.md / T-05 | `getOrganizationAction` が `organizationRepository.findById()` を action 層から直接呼び出す（usecase 層を経由しない）。依存方向規約 `actions → usecases → repositories` の厳密な解釈では逸脱となる。一方、既存の `listUsersAction` も同様に `userRepository.findByOrganization()` を直接呼んでおり、読み取り専用操作ではこのパターンが慣行として定着している。 | 既存パターンとの一貫性を優先するなら現状仕様で問題なし。将来的に usecase 経由に統一するなら `getOrganization` usecase を追加して経由させる。本リクエストでは既存慣行に合わせる方針で進める。 |
| 3 | LOW | 冗長防御 | tasks.md / T-06 | `settings/organization/page.tsx` に `auth()` + admin チェック + リダイレクトを記述する仕様だが、`settings/layout.tsx` が既に `role !== "admin"` をガードしている。page.tsx の追加チェックは多層防御として安全だが、コードが二重になる。 | 現状仕様を維持する（多層防御として許容）。将来的に layout の保護が変わったときのフェイルセーフとして有効。実装者は layout ガードが存在することをコメントで明示するとよい。 |
| 4 | LOW | 仕様の明確さ | tasks.md / T-03 | 受け入れ基準に「WHERE 条件に `organizationId` が含まれる（テナント分離）」と記載されているが、`organizations` テーブルには `organizationId` 列が存在せず、主キー `id` のみ。WHERE 句は `eq(organizations.id, id) AND eq(organizations.id, organizationId)` となり、両条件が同一列 `organizations.id` を参照する（既存 `findById` と同一パターン）。記述が実装者を混乱させる可能性がある。 | 受け入れ基準を「WHERE 条件が `organizations.id = organizationId` を含む（呼び出し元は必ず `id` と `organizationId` に同値を渡す。`findById` と同パターン）」等、テーブル構造を踏まえた表現に修正する。機能的な影響はない。 |

## Review Notes

### セキュリティ評価

- **認証**: `auth()` による session 検証が全 Server Action で最初に実行される ✓
- **認可**: `canPerform(role, "organization", "updateOrganization")` で ADMIN_ONLY を強制 ✓
- **テナント分離**: `organizationId` / `actorId` が session 由来であり formData から取得しないことが spec.md の Requirement として明示され、T-05 AC でも確認される ✓
- **入力検証**: zod で `min(1)` / `max(100)` を強制。DB 側は `name NOT NULL` 制約が最終防衛 ✓
- **トランザクション原子性**: `db.transaction` 内で更新と監査記録を同居。`recordAudit` 失敗で更新もロールバックされる仕様 ✓
- **CSRF**: Next.js App Router の Server Actions は Same-Origin ポリシーおよび Content-Type 制約により CSRF を構造的に排除 ✓
- **OWASP A01（アクセス制御不備）**: session 由来の organizationId / actorId + ADMIN_ONLY 認可で対策済み ✓
- **OWASP A03（インジェクション）**: Drizzle ORM のパラメータバインドにより SQL インジェクションを排除 ✓

### 全体評価

仕様は既存パターン（`updateUserRole` / `createUser` / 設定画面群）に忠実に沿っており、設計一貫性・セキュリティ・テスト方針のいずれも許容レベルを満たしている。CRITICAL / HIGH の指摘事項は無し。見つかった MEDIUM 1 件（監査メタデータの完全性）は実装品質向上の観点から推奨するが、ブロッカーではなく仕様全体の整合性も維持されているため `approved` と判断する。
