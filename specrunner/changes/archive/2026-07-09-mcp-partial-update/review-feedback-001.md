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
| 1 | LOW | Testing | `src/app/api/mcp/tools/approvalPolicies.ts` | TC-039（should 優先度）「conditionField を明示指定したとき conditionOperator/conditionValue が必須となりバリデーションエラーになる」を固定するテストが存在しない。`superRefine` の実装は正しく、TC-038（conditionField 省略時にエラーなし）は T-04 テストで間接検証済みだが、逆パターンの防御テストがない。 | T-04 の `approval_policies.update` テストブロックに `{ conditionField: "amount" }` のみ指定してエラーが返ることを assert するケースを追加する。 | no |
| 2 | LOW | Maintainability | `src/application/usecases/updateMeeting.ts` | `details` フィールドが常に repository update オブジェクトに含まれる（`...(x !== undefined && { x })` パターンではない）。hearing 以外の meetingType では `details = null` が無条件に渡されるため、他フィールドだけを変更したリクエストでも `details` カラムが必ず更新される。「hearing 以外では details を null に強制する」ビジネスルールの意図的な実装だが、純粋な PATCH パターンからの逸脱として追跡しておく価値がある。 | 現状の意図的な動作であれば変更不要。将来 details のみを対象とする監査や競合検出が必要になった際に `...(details !== undefined && { details })` パターンへの移行を検討する。 | no |
| 3 | LOW | Documentation | `src/application/usecases/updateMeeting.ts` | `internalAttendees?: MeetingAttendee[]` / `externalAttendees?: MeetingAttendee[]` の JSDoc が「null を指定すると〇側をクリアする」と記述しているが、型は `MeetingAttendee[] \| undefined` であり null を受け付けない。handler が null → `[]` に変換するため usecase が受け取る際は空配列になる。 | JSDoc を「空配列 `[]` を指定すると〇側をクリアする（MCP handler で null → [] に変換済み）」と修正することで型と説明が一致する。動作への影響はない。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 9 | 0.10 |

- **total**: 8.80

## Summary

### 実装の正確性

3 箇所のバグ（attendees 全再構築・approvalPolicies PUT セマンティクス・inquiries nullable 欠落）がいずれも正確に修正されている。

**T-01 — `update_meeting` attendees 部分更新**: handler が `undefined` → `undefined` / `null` → `[]` / `string[]` → `MeetingAttendee[]` を正確に変換し、usecase のマージロジックは片側指定時に `existingAttendees` から反対側を保持する。Server Action 経由の `attendees` 全置換後方互換は維持される。`internalAttendees` / `externalAttendees` の describe にセマンティクスが明記されている（TC-011 ✅）。

**T-02 — `approvalPolicies.update` PATCH 化**: `updateSchema` の全フィールドが `.optional()` / `.nullable().optional()` に変更され、`?? null` フォールバックが handler から除去された。`superRefine` は `conditionField !== undefined && !== null && .trim() !== ""` のときのみ conditionOperator/conditionValue を要求する。`updatePolicy.ts` では `...(x !== undefined && { x })` パターンで PATCH 更新を実装し、`templateId` 検証は `!== undefined` 時のみ実行される。

**T-03 — `inquiries.update` nullable 追加**: 6 フィールドに `.nullable()` が追加され、usecase の変更なしで null クリアが可能になった。

**`schemaHelpers.ts` の advertisement スキーマ nullable 伝播**: `isNullable()` が全 operation スキーマを走査して nullable フィールドを特定し、advertisement スキーマでも nullable として広告することで SDK レベルでの null 拒否を防いでいる。`approvalPolicies` のように `createSchema` が non-nullable・`updateSchema` が nullable という混在ケースも正しく処理される。

### テストカバレッジ

must 優先度 23 件すべてカバー済み。should 優先度は TC-039 を除く 16/17 件をカバー。テストは handler→usecase 境界（T-04/T-05/T-06）と usecase 単体（T-06/T-07）の 2 層構成で、mock.module パターンは `afterAll` 復元を含む既存パターンに準拠している。

### 品質ゲート

build / typecheck / test（1996 pass 0 fail）/ lint すべて green（verification-result.md 確認済み）。

### セキュリティ

認可チェック・エラーメッセージの安全性・クロステナント分離・入力バリデーションに変更または劣化なし。attendees マージは `findById(meetingId, organizationId)` で取得した既存レコードを使うためテナント境界を越えない。

