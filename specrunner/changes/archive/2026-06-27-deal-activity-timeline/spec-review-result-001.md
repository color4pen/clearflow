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
| 1 | MEDIUM | 防御的プログラミング | tasks.md — T-02 | `findByTargets` の `options.excludeActions` が空配列 `[]` で渡された場合、`notInArray(auditLogs.action, [])` が `WHERE action NOT IN ()` を生成し PostgreSQL 構文エラーになる。T-05 で usecase 側が空配列を渡さないようガードしているが、T-02 の repository 仕様にはそのガード条件が明記されておらず、repository を直接呼ぶ将来のコードが誤って空配列を渡す余地がある。 | T-02 の条件を「`options.excludeActions` が **非空の場合のみ** `notInArray` を追加する」と明示する。`excludeActions.length > 0` のチェックを repository 実装の必須条件として記載する。 |
| 2 | LOW | テストカバレッジ | tasks.md — T-11 | `activityConfig.test.ts` のテスト計画が「型の確認」のみ（配列かどうか、boolean かどうか）に留まり、`getHiddenActions()` の env パース挙動（カンマ分割・trim・未設定時の空配列返却）と `isActivityFeedEnabled()` の `"true"` 判定ロジックが実際の値で検証されない。純粋関数であり DB 依存がなく容易にユニットテスト可能。 | T-11 に具体値でのアサションを追加する。例: `process.env.ACTIVITY_HIDDEN_ACTIONS = "deal.view, meeting.view"` を設定して `getHiddenActions()` が `["deal.view", "meeting.view"]` を返すこと、未設定時が `[]` であること、`isActivityFeedEnabled()` が `"true"` で `true`・`"false"` で `false` を返すことを各テストケースで確認する。 |
| 3 | LOW | spec カバレッジ | spec.md | `findByTargets` の空 targets 配列ケース（即座に空配列を返す）が tasks.md T-02 では定義されているが、spec.md に対応する Scenario がない。spec は実装の入力であり、tasks で記述されたエッジケース挙動は spec に対応する振る舞い定義が必要。 | `Requirement: auditLogRepository の対象別取得がテナント分離される` 配下か新規 Requirement として、`targets` が空のとき空配列を返す Scenario を追加する。Given: targets が空配列、When: `findByTargets` が呼ばれる、Then: DB クエリを発行せず空配列を返す。 |

## Summary

全体的にスペックは整合的かつ完全であり、実装に進む水準を満たしている。

- **アーキテクチャ整合性**: `RSC/actions → usecases → domain/infrastructure` の依存方向が設計・タスク・spec に渡って一貫している。`lib/` へのユーティリティ配置も既存の `lib/dateUtils.ts`・`lib/meetingLabels.ts` と整合する。
- **テナント分離**: `organizationId` を `findByTargets` の必須パラメータとし、全クエリに AND 条件で付与する設計は正しい。案件詳細ページでの `session.user.organizationId` 取得パターンも既存コードと同様。
- **セキュリティ**: OWASP 観点で確認した。`ACTIVITY_HIDDEN_ACTIONS` はサーバー側 env var でありユーザー入力でないため injection リスクなし。Drizzle ORM がパラメータ化クエリを生成する。actor 名の未解決時フォールバック（UUID 先頭 8 文字）も情報漏洩リスクなし。フィーチャーフラグチェックが RSC で認証後に行われる設計は正しい。
- **`notInArray` 空配列問題 (Finding #1)**: 実質的リスクは T-05 のガードで軽減されているが、repository の契約として明示することで保守性が高まる。HIGH でなく MEDIUM と判定したのは、T-05 の呼び出し側ガードが仕様書に記載されており、実装者が両方を読めばリスクを認識できるため。
- **テスト方針**: 静的解析テスト（ソースファイル文字列検証）は既存 `projectStructure.test.ts` の確立パターンと一致する。純粋ユーティリティ (activityLabels, activityConfig) には T-10 で実値ユニットテストが計画されており、プロジェクトのテスト方針に従っている。
