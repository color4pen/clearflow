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
| 1 | MEDIUM | Spec-Tasks Consistency | tasks.md | T-09 の `approveRequestAction` / `rejectRequestAction` の実装ステップは「`auth()` で認証チェック → usecase を呼び出す」とのみ記述されており、spec.md の `Requirement: 申請の承認・却下は admin ロールのみが実行できなければならない` が要求する admin ロールチェックが明示されていない。実装者が T-09 を文字通りに実装すると認可チェックを省略するリスクがある。spec が authority ではあるが、tasks との乖離は実装ミスの温床になる。 | tasks.md T-09 の該当 action 記述を `auth()` で認証チェック **かつ role === 'admin' を確認** → usecase を呼び出す」に更新する。同様に `src/app/actions/requests.ts` の Acceptance Criteria に「`approveRequestAction` / `rejectRequestAction` が role !== 'admin' の場合に認可エラーを返す」を追記する。 |
| 2 | LOW | Spec Format | spec.md | `### Requirement: 依存方向はレイヤードアーキテクチャの規約に従わなければならない` に `#### Scenario:` が1つも存在しない。rules.md は「各 Requirement は少なくとも1つの `#### Scenario:` を含むこと」を必須としており、現状は形式違反である。また本文に「ビルド検証タスク（T-17）の受け入れ基準として静的に確認する」とある通り Layer-0（import 構造が強制する内容）に相当し、Layer-1 振る舞い spec として不適切。Round 1 で同じ指摘（#5 LOW）がなされたが未解消。 | この Requirement を spec.md から削除するか、Layer-1 振る舞いに書き換える。例: `#### Scenario: domain サービスが DB を直接参照しない` として「Given: domain service 関数を呼び出す / When: 関数が状態遷移バリデーションを実行する / Then: Drizzle の db インスタンスへのアクセスが発生しない」という形式に変換する。静的検査としての制約は tasks.md T-17 の Acceptance Criteria に既に記載されているため、spec.md への重複は不要。 |

## Summary

Round 1 で指摘した全所見の解消状況:

| Round 1 # | Severity | 解消状況 |
|-----------|----------|----------|
| #1 HIGH: RBAC 未規定（member が自身の申請を承認可能） | HIGH | ✅ 解消。`Requirement: 申請の承認・却下は admin ロールのみが実行できなければならない` が3つの Scenario とともに追加された |
| #2 MEDIUM: 書き込み系テナント分離の未規定 | MEDIUM | ✅ 解消。`Scenario: 申請作成時に organizationId はセッションから取得される` が追加された |
| #3 MEDIUM: 申請却下の監査ログ Scenario 欠落 | MEDIUM | ✅ 解消。`Scenario: 申請却下時に監査ログが作成される` が追加された |
| #4 LOW: セッション内容の Scenario 欠落 | LOW | ✅ 解消。`Scenario: ログイン成功後のセッションに必要なフィールドが含まれる` が追加された |
| #5 LOW: 依存方向 Requirement に Scenario なし（Layer-0） | LOW | ⚠️ 未解消。Requirement は残存し、Scenario は依然ゼロ |

セキュリティ観点（OWASP Top 10）の評価:

- **A01 Broken Access Control**: RBAC Requirement（admin のみ承認/却下）が明示され、テナント分離も読み取り・書き込み双方で規定されている。organizationId はセッション由来を要求しており、フォームからの偽装が仕様上防止される。
- **A02 Cryptographic Failures**: bcryptjs によるパスワードハッシュが design.md D5 に明記されており、平文保存は設計上排除されている。
- **A03 Injection**: Drizzle ORM のパラメータ化クエリを使用するため SQL インジェクションリスクは低い。Server Actions は zod でバリデーションされている。
- **A07 Identification and Authentication Failures**: Auth.js v5 + Credentials provider による認証、AUTH_SECRET 必須、JWT セッション戦略が規定されている。
- **CSRF**: Auth.js v5 は Next.js Server Actions のリクエスト検証に組み込まれており、追加規定は不要。

ブロッキング所見はゼロ。Round 1 の HIGH 1件・MEDIUM 2件はすべて解消された。残存する所見は MEDIUM 1件（tasks-spec 整合性）と LOW 1件（Requirement 形式違反）のみ。spec.md 自体は要件・シナリオの網羅性・normative keyword の使用・レイヤードアーキテクチャの制約として十分な品質に達しており、実装フェーズへの移行を承認する。
