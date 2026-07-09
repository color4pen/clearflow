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
| 1 | LOW | 実装明確性 | tasks.md — T-06 / T-07 | 作成フォーム（DealMeetingForm）の `formData.set("preparation", preparation)` は、`useState<string>("")` の初期値が空のとき `""` を送信する。Server Action 側の `createMeetingAction` で `formData.get("preparation")` をそのまま Zod に渡すと `""` が `parsed.data.preparation` に入り、`?? null` が効かず `""` が DB に格納される。既存の `summary` は `formData.get("summary") \|\| undefined` パターンで空文字を `undefined` に変換してから `?? null` で null 化している。preparation が `summary` と異なる挙動になるとコードの一貫性が損なわれる。 | `createMeetingAction` での preparation の取得を `formData.get("preparation") \|\| undefined` とし、既存 `summary` の処理パターンと揃える。これにより空フォーム送信時に `null` が DB に格納され一貫性が保たれる。T-06 の指示を「`formData.get("preparation") || undefined` で取得し、`preparation: parsed.data.preparation ?? null` を渡す」と明示することを推奨する（実装者が既存 summary パターンを参照すれば自然に気づける範囲のため blocking ではない）。 |
| 2 | LOW | セキュリティ（プレ既存） | tasks.md — T-08 / MeetingPreparationSection | `MarkdownTextarea` の `MarkdownPreview` は `a` タグの `href` を `react-markdown` からそのまま渡す（`<a href={href}>` ）。`javascript:` URI を含む Markdown リンクが XSS ベクタになりうる（例: `[click](javascript:alert(1))`）。これは既存の `MeetingSummarySection` / `summary` フィールドにも同様に存在するプレ既存の問題であり、今回の `preparation` フィールドはその挙動を踏襲するに過ぎない。同一組織の認証済みユーザーのみがコンテンツを入力・閲覧できる設計のため、クロステナント影響はなくセルフ XSS に限定される。 | `MarkdownPreview` の `a` コンポーネントで `href` が `javascript:` で始まる場合を除外する（例: `href={/^javascript:/i.test(href ?? "") ? "#" : href}` ）。ただしこれはプレ既存問題の修正であり本 request のスコープ外。本変更で新たなリスクを追加するものではないため今回 blocking なし。将来の専用 fix request で対応することを推奨する。 |
| 3 | LOW | 型定義の網羅性 | tasks.md — T-06 | `CreateMeetingState` および `UpdateMeetingState` の `errors` 型に `preparation` フィールドが追加されていない。これらの型は UI のエラー表示に使用されるが、`preparation` のバリデーション エラーが表示されない可能性がある。実際には `preparation` は `z.string().optional()` / `z.string().nullable().optional()` であり、バリデーションエラーが発生するケースはほとんどないため実害は小さい。 | T-06 の対象として `CreateMeetingState.errors` に `preparation?: string[]`、`UpdateMeetingState.errors` に `preparation?: string[]` の追加を明記する。型チェックで漏れを検出できる範囲のため blocking ではない。 |

## Summary

仕様全体を design.md / tasks.md / spec.md にわたって確認した結果、実装に進める水準を満たしている。

**アーキテクチャ整合性**: DB → ドメイン型 → リポジトリ → ユースケース → MCP / Server Action → UI の全層にわたる変更がタスクに明示されており、既存の依存方向（`actions → usecases → domain / repositories`）を維持している。既存フィールド（`summary`, HearingData 等）の不変条件を変えないことが requirements / tasks の両方で明記されている点も適切。

**セキュリティ（OWASP Top 10）**:
- **A01 アクセス制御**: `canPerform(role, "meeting", "create/edit")` チェックが MCP / Server Action 双方で維持される。`organizationId` は `authInfo.extra` から取得するため、ツール引数経由のテナント分離バイパスは既存の TC-020 テストで継続的に担保される。
- **A03 インジェクション（SQL）**: Drizzle ORM のパラメータ化クエリが使用される。`preparation` は新しい text カラムであり既存パターンと同一の扱いで SQL インジェクションリスクはない。
- **A03 インジェクション（XSS）**: `react-markdown` はデフォルトで生 HTML を無効化するため、Markdown ボディからの XSS は防止される。ただし `a` タグの `javascript:` href はプレ既存の問題（Finding #2 参照）。
- **A08 整合性**: マイグレーションは `ALTER TABLE ADD COLUMN` のみ（nullable, default なし）であり、既存データへの影響なし。加算的マイグレーションの要件を満たす。

**部分更新セマンティクス**: `updateMeeting` における `undefined`（変更なし）と `null`（明示クリア）の三値区別が spec.md のシナリオ・tasks.md の実装指示・MCP スキーマ（`z.string().nullable().optional()`）で一貫して記述されている。既存の `location` / `summary` と同等のパターン。

**テスト**: MCP behavioral テスト（create 永続化・update 部分更新・inputSchema 広告）の要件が spec.md の受け入れ基準・tasks.md T-10 に対応して明示されており、ソース文字列照合禁止・mock.module 個別ファイル制約も記載されている。

全 Finding が LOW であり、実装者が既存コードパターン（特に `createMeetingAction` の `summary` 処理）を参照すれば自然に対処できる範囲。
