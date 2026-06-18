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
| 1 | medium | correctness | `src/app/actions/templates.ts` | `JSON.parse(rawSteps as string)` がネストされた try-catch なしで呼ばれている（lines 54, 113）。不正な JSON 文字列が送られると `SyntaxError` がスローされ、Server Action が未ハンドル例外で終了する。admin ガード通過後のコードパスなので攻撃対象は限定的だが、クライアントバグや curl 操作で発生しうる | `JSON.parse` を try-catch で囲み、parse 失敗時は `{ success: false, message: "ステップデータの形式が不正です" }` を返す | yes |
| 2 | medium | correctness | `src/app/(dashboard)/settings/templates/TemplateForm.tsx` | `router.push("/settings/templates")` がレンダー本体（line 64–66）で直接呼ばれている。`useEffect` の外で副作用を実行するのは React の規約違反であり、React 18 Strict Mode では二重レンダーにより2回呼ばれる。本番では問題は出にくいが、開発環境でのダブルナビゲーションや将来の Concurrent Mode 対応時に問題になりうる | `useEffect(() => { if (state?.success) router.push("/settings/templates"); }, [state, router])` に変更する | yes |
| 3 | low | maintainability | `src/infrastructure/repositories/approvalTemplateRepository.ts` | `findByOrganizationForAmount` の JSDoc コメント（lines 47–56）が `create` 関数の直前に置かれており、`create` が誤った説明を継承している。`findByOrganizationForAmount` 関数（line 127）には JSDoc がない | JSDoc コメントを `findByOrganizationForAmount` の直前（line 127 の前）に移動する | yes |
| 4 | low | maintainability | `src/app/(dashboard)/settings/templates/page.tsx` | inline server function `handleDelete` が `deleteTemplateAction` の戻り値を無視しており、使用中テンプレートの削除エラーメッセージが UI に表示されない。T-10 タスクに「削除エラー時のメッセージ表示を考慮する」とあるが未対応 | Client Component ラッパーで `useActionState` か `startTransition` + state 管理を使い、エラーメッセージをページに表示する（TC-043 は priority: could のため次イテレーションでも可） | yes |
| 5 | low | testing | `src/__tests__/static/projectStructure.test.ts` | `bun test` で 1 件失敗（TC-025: `.env.example` not found）。ただしこのテストは本 PR より前から存在する pre-existing failure であり、本変更で追加された 69 行には含まれない。新規テスト（templateManagement / userManagement / Tenant isolation）は全件 pass | `.env.example` を作成する（本 PR スコープ外） | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.30

## Summary

実装は要件をおおむね正確に満たしている。admin ガード・organizationId のセッション取得・自己ロール変更禁止・pending リクエスト確認済み削除の全セキュリティ要件が実装されており、layered architecture の依存方向も維持されている。ビルド・lint は通過し、新規テスト（180件）は全件 green。

medium 所見は2件: `JSON.parse` の未保護呼び出しと `router.push` のレンダー内副作用。前者は admin ガード後のコードパスゆえ攻撃対象が限定されるが、実装の堅牢性のため修正を推奨する。後者は本番では動作するが React の規約に反する。low 所見2件（JSDoc 誤配置・削除エラー未表示）は次イテレーションで対応できる。

pre-existing な `.env.example` テスト失敗は本 PR のスコープ外。
