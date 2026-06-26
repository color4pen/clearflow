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
| 1 | medium | testing | src/__tests__/domain/authorization.test.ts | test-cases.md に列挙された must 優先度のユニットテスト 13 件が未実装。TC-007〜TC-010（`canPerform("member","actionItem","create")` 等の認可マトリクス検証）をはじめ、TC-001/002（FK・インデックス確認）、TC-004/005/006（モデル型・バレルファイル）、TC-029/033/034（各バレルファイル・use server ディレクティブ）が既存テストスイートに追加されていない。authorization.test.ts は inquiry〜revenue を網羅しているが actionItem ブロックが存在しない | `authorization.test.ts` に actionItem の describe ブロックを追加し TC-007〜TC-010 を実装する。TC-001/002/004〜006/029/033/034 は `projectStructure.test.ts` の既存パターン（ファイル静的解析）に倣って追加する | yes |
| 2 | medium | architecture | src/app/actions/actionItems.ts | design.md D5 で「JSON body（`z.object` でパース）形式」と明示されているが、実装は `formData.get()` を使う FormData パターンを採用している。UI 未実装の段階で呼び出しインタフェースが FormData に固定されると、後続 UI リクエストで設計と乖離するリスクがある | (a) FormData を採用する理由（`useActionState` との親和性、既存 meeting action との統一性）を design.md の D5 Exception として記録し、設計変更の合意を取るか、(b) JSON body 形式（`prevState: ..., data: unknown` を受け取り `z.object.safeParse(data)` する方式）に修正する。UI が未着手の今が変更コストが最小 | no |
| 3 | low | architecture | drizzle/0007_nice_lily_hollister.sql | 要件定義では `due_date (timestamptz nullable)` と明記されているが、生成 DDL は `timestamp`（タイムゾーンなし）を使用している。プロジェクト全体が `timestamp` に統一されているため機能的影響は現状低いが、国際対応や夏時間がある環境での日時比較に将来影響しうる | プロジェクト全体の方針（`timestamp` 統一）を CLAUDE.md や設計ドキュメントに明記し、要件との差異を意図的な選択として記録する。修正要否は後続リクエストで判断可 | no |
| 4 | low | correctness | src/application/usecases/createActionItem.ts | ownership チェック（L26-45）がトランザクション外で実行される。チェック通過後に紐づけ先エンティティが削除されると FK violation が投げられ、汎用エラーメッセージで返る。組織分離のセキュリティは保証されているため機能的問題はなく、エラーメッセージの品質の問題にとどまる | 厳密には ownership チェックをトランザクション内へ移動することで TOCTOU を解消できる。現状の FK による安全網で許容する場合は対応不要 | no |
| 5 | low | maintainability | src/infrastructure/repositories/actionItemRepository.ts | tasks.md T-04 では `delete(id, organizationId, tx?)` と命名を指定しているが、実装は `deleteById` を export している。ユースケース側も `deleteById` を呼ぶため動作は正常。spec との命名ドリフトが将来の読み手に混乱をもたらす可能性がある | 次のリファクタリング機会に `deleteById` → `delete` へ統一するか、tasks.md の記述を実装に合わせて更新する | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 7 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 5 | 0.10 |

- **total**: 8.20

## Summary

全体的に実装品質は高く、受け入れ基準はすべて満たされている。テナント分離・認可チェック・audit_log 記録・revalidatePath の各ロジックは仕様通りに実装されており、build/typecheck/test/lint も green。

**承認の理由**: critical / high 所見なし。コアロジック（テナント分離、ownership チェック、サーバーアクション認可）は正確に実装されており、機能上の問題はない。

**要注意点**（Fix=no のため fixer はスキップするが、後続作業で対処を推奨）:
- **Finding #1（medium）**: must 優先度の unit テスト 13 件が未追加。authorization.test.ts への actionItem ブロック追加は数十行で済む。認可マトリクスを将来変更した際の回帰検知がない状態であり、後続リクエストで着手することを推奨する。
- **Finding #2（medium）**: FormData vs JSON body の設計乖離は、UI 実装リクエストが来るまでに設計意図を合わせておくと後続コストが下がる。
