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
| 1 | MEDIUM | Security | spec.md / tasks.md T-02 | `requestIds` の入力バリデーションが「文字列であること」のチェックに留まり、UUID 形式検証が指定されていない。既存コードでは冪等性キー (`requests.ts` の `UUID_RE`) に UUID フォーマット検証を適用しており、同じセキュリティ原則を requestId にも適用すべきである。ORM のパラメータ化クエリで SQL インジェクションは防止されるが、不正形式 ID が repository に到達して不明瞭なエラーを引き起こす可能性があり、コードベース全体の防御一貫性が損なわれる。 | T-02 のバリデーションスキーマに `z.string().uuid()` を追加する（zod v3 組み込みの UUID 検証を利用）。spec.md の「各 requestId が文字列であること」シナリオに「かつ UUID 形式であること」を追記する。 |
| 2 | MEDIUM | Functional gap | request.md 要件3 / spec.md | `request.md` 要件3 では「レート制限を適用（1回の呼び出しで requestIds.length 分を消費）」が必須要件として記載されているが、`spec.md` にレート制限超過時の振る舞いシナリオが存在しない。`test-case-gen` は spec.md のシナリオからテストを生成するため、レート制限の受け入れ基準が未テストのまま実装される。加えて、コードベースにレート制限インフラ（ライブラリ・ストレージバックエンド・上限値）が存在せず、実装者が設計判断を独自に行う必要がある。 | spec.md に「レート制限クォータを超過した場合は `{ success: false, message: "..." }` を返す」シナリオを追加する。またはレート制限要件を「現時点では上限20件バリデーションで代替する。専用レート制限は別 request で対応」としてスコープ外に明示する。 |
| 3 | MEDIUM | Completeness | spec.md | 単件 `approveRequestAction` は冪等性キーによる二重処理防止を実装しているが、`bulkApproveAction` では冪等性の扱いが spec.md に一切言及されていない。`useTransition` による UI の disabled はクライアント側の二重送信を軽減するが、ネットワークリトライやプロキシによる再送の場合は2回目のリクエストが到達し、全件「既に承認済み」の部分失敗結果を返す可能性がある。ユーザーはエラー結果に混乱するが、データ整合性は `approveRequest` の状態遷移検証によって自動的に保護される。 | spec.md に「冪等性はアプリ層では保証せず、`approveRequest` の状態遷移検証（既承認申請は `{ ok: false }` を返す）によって自然にべき等になる。二重送信時は全件が失敗結果として返る」旨を明記するか、冪等性キーをスコープ外と明示する。どちらの選択肢であれ意図を spec に記録することで実装者の判断迷いを防ぐ。 |
| 4 | LOW | Completeness | spec.md vs tasks.md T-04 | `tasks.md` T-04 は「member ロールの場合はチェックボックスを非表示にする（`showBulkApproval` prop）」を実装要件として定義しているが、`spec.md` に対応するシナリオが存在しない。`test-case-gen` は spec.md から振る舞いテストを導出するため、この UI セキュリティ要件（defense-in-depth）はテストカバレッジから漏れる。T-08 の静的コード解析でファイル存在や `"use client"` は確認されるが、member ロール時の非表示挙動は静的解析では検証しにくい。 | spec.md に `### Requirement: member ロールのユーザーには一括承認 UI が表示されない` シナリオを追加する。サーバーサイドの認可チェックと組み合わせることで多層防御の意図を spec に記録できる。 |
| 5 | LOW | Clarity | spec.md | 「監査ログは個別に記録される」「Webhook は個別に配信される」の各 Requirement が、「既存の `approveRequest` が担当するため追加実装不要」という参照記述に留まっており、`bulkApprove` 経由で実際に動作することを Given/When/Then でアサートしていない。`bulkApprove` が `approveRequest` を呼び出さない実装（例: 一括 SQL 方式）にしてもこれらのシナリオは通過する。 | シナリオの Then 節を「3件の `bulkApprove` 後、`approveRequest` を3回呼び出したことと同等の監査ログ・Webhook が生成される」という能動的なアサーションに変更する。または、Layer-0 の継承動作として spec 対象外と注記し、`bulkApprove.ts` が `approveRequest` を import することを T-06 の静的テストで担保する方針を明示する。 |

## 総評

仕様の全体構造・依存方向遵守・テナント分離・アーキテクチャ整合性は良好である。`approveRequest` usecase を再利用する設計判断（D1）は既存の楽観的ロック・監査ログ・Webhook 配信の不変条件を自動的に継承し、重複実装リスクを排除している。partial success（D2）とリクエスト上限20件（D3）の設計根拠も明確に文書化されている。

CRITICAL / HIGH 相当の所見はなく、実装を阻止するブロッカーは存在しない。上記5件は実装品質・テストカバレッジ・セキュリティ一貫性に関わる改善提案であり、`approved` 判定を覆すものではない。
