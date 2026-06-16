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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Security / Access Control (OWASP A01) | spec.md | `role (admin \| member)` フィールドが schema に存在するにもかかわらず、承認・却下操作を誰が実行できるかを規定する Requirement が spec.md に存在しない。現状の Server Actions 要件（Requirement: Server Actions は入力バリデーションと認証チェック）は認証（ログイン済みか）のみを確認し、認可（どのロールが承認可能か）を問わない。その結果、組織内の任意のメンバーが自身の申請を自身で承認・却下できる状態が仕様として成立してしまう。承認ワークフローの用途上、これはシステムの根幹機能の破綻（Broken Access Control）である。 | `Requirement: 申請の承認・却下は権限を持つユーザーのみが実行できなければならない` を spec.md に追加する。最低限 "approveRequest / rejectRequest MUST reject actors whose role is not `admin`" または "MUST reject when actorId equals creatorId" のいずれかを normative keyword で規定し、対応する Scenario（admin が承認できる・member が承認を試みて拒否される）を追加する。design.md / tasks.md との整合も更新する。 |
| 2 | MEDIUM | Security / Input Trust (OWASP A01) | spec.md | Requirement「すべてのデータアクセスはテナント分離されなければならない」は申請一覧取得と申請詳細取得（読み取り系）の Scenario のみを定義しており、書き込み系（申請作成・ステータス更新）でのテナント分離が spec として規定されていない。フォームから organizationId を偽装して送信された場合、Server Action がセッション由来の organizationId で上書きすることを spec が要求していないため、実装者がユーザー入力の organizationId をそのまま usecase に渡す実装を行っても spec 違反とならない。 | 既存 Requirement に Scenario を追加する。「申請作成時の organizationId はセッションから取得されなければならない（リクエストボディの organizationId は無視される）」を MUST で規定し、Given: ユーザーが別の organizationId を含む申請作成リクエストを送信した場合 / Then: セッションの organizationId で申請が作成されることを Scenario として追加する。 |
| 3 | MEDIUM | Spec Coverage | spec.md | Requirement「状態変更時に監査ログが記録されなければならない」のシナリオカバレッジが不完全。申請提出（draft→pending）と申請承認（pending→approved）の Scenario は存在するが、申請却下（pending→rejected）の監査ログ Scenario が欠落している。tasks.md T-08 では `rejectRequest` が `request.reject` アクションを audit_log に記録することを要件としており、spec との乖離がある。 | `Scenario: 申請却下時に監査ログが作成される` を追加する。Given: 認証済み admin ユーザーが pending 状態の申請を持つ / When: admin が申請を却下する（pending → rejected）/ Then: audit_logs に action=`request.reject`, targetType=`request`, targetId=申請ID, actorId=adminユーザーID のレコードが挿入される。 |
| 4 | LOW | Spec Coverage | spec.md | Requirement「Credentials provider でメール/パスワード認証が機能しなければならない」の本文に「セッションには userId, organizationId, role を含める」と記載されているが、これを検証する Scenario が存在しない。下位レイヤーの usecase・Server Action がセッションから organizationId や role を取得することに依存しているため、この情報がセッションに含まれることを spec として固定しないと、JWT callbacks の実装漏れが typecheck では検出できない。 | Scenario を追加する。Given: シードユーザー（admin@example.com / password123）が存在する / When: 正しい認証情報でログインする / Then: 取得できるセッションに userId, organizationId, role が含まれる。 |
| 5 | LOW | Spec Structure | spec.md | Requirement「依存方向はレイヤードアーキテクチャの規約に従わなければならない」の Scenario が `grep -r "from.*@/infrastructure" src/domain/` というビルド時静的解析チェックとして記述されており、Given/When/Then の「Then」が「import 文が存在しない」という否定的静的事実になっている。これは実行時の Layer-1 振る舞いではなく、rules.md が除外する Layer-0（型・FS 構造が強制する内容）に相当し、spec.md の記法指針に沿っていない。 | この制約は tasks.md T-17 の受け入れ基準（`grep` コマンド）として既に適切に配置されている。spec.md からこの Requirement を削除するか、Layer-1 視点で「domain サービスが DB に直接アクセスしないことを確認する」などの振る舞い表現に書き換える。 |

## Summary

spec.md の形式要件（`### Requirement:` / `#### Scenario:` / SHALL・MUST keyword）はすべて満たしている。状態遷移バリデーション・テナント分離（読み取り系）・入力バリデーション・初期ステータスの各 Requirement は明確に記述されており、概ねレビュー可能な品質。

ブロッキング所見が 1 件（HIGH）ある。ロールベースアクセス制御（RBAC）が spec に存在せず、承認ワークフローの本質的な認可要件が未規定の状態で実装フェーズに進んだ場合、任意のメンバーが自身の申請を承認できる Broken Access Control (OWASP A01) を含む実装が spec 準拠として通過してしまう。request.md にも RBAC の明示はなく、spec-fixer が design.md / tasks.md と合わせて補完する必要がある。

MEDIUM 2 件（書き込み系テナント分離の未規定、却下の監査ログ Scenario 欠落）は機能上の空白であり、高に次ぐ優先度で修正が必要。LOW 2 件（セッション内容の Scenario 欠落、静的解析 Scenario のレイヤー違反）は実装品質への影響は限定的だが、spec の完全性向上のため修正を推奨する。
