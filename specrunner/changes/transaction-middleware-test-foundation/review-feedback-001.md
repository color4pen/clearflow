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
| 1 | medium | testing | `src/__tests__/static/projectStructure.test.ts` | 新規 must TC の多くに静的テスト実装がない。TC-003 (db.transaction がユースケースで呼ばれている), TC-007 (userRepository に findByEmail が存在しない), TC-013 (Transaction 型が db.ts から export), TC-014/015 (updateStatus・create に tx? 引数), TC-011 (DATABASE_URL ガードコード存在確認), TC-019/020 (rejectRequestAction/submitRequestAction の認証失敗レスポンス形式), TC-025 (createRequestAction の戻り値型が ActionResult に変わっていない), TC-026 (src/middleware.ts が存在しない) が未実装。既存テストはすべてソースファイルの静的テキスト検索で構成されているため、これらも同じアプローチで容易に追加できる。 | `projectStructure.test.ts` またはトランザクション専用の新規テストファイルに、各 TC の GIVEN/THEN に対応するファイル読み取り + `expect(content).toContain(...)` / `expect(content).not.toContain(...)` テストを追加する。integration TC (TC-001/002/016/017) は実 DB 不要のため今回対象外。 | yes |
| 2 | low | testing | `package.json` | `"test"` スクリプトが package.json に存在しないため、verification フェーズで `bun test` が skipped になり受け入れ基準「bun test が全件 green」が CI 上で検証されていない。 | `package.json` の `scripts` に `"test": "bun test"` を追加する。 | yes |
| 3 | low | architecture | `src/infrastructure/db.ts` | spec.md TC-011 の "When: `db.ts` モジュールが読み込まれる → Then: Error が throw される" という記述と実装が乖離している。実装は Proxy による遅延初期化であり、DATABASE_URL 未設定時に Error が throw されるのは最初の DB 操作呼び出し時であって、モジュール import 時ではない。設計決定 (design.md L29: "The DATABASE_URL check is deferred…") では Next.js ビルド時の page data collection 対策として意図的に採用されており実装は正しいが、spec.md の Scenario 記述が実際の動作を正確に反映していない。 | spec.md TC-011 の Scenario の "When" を "When: DB 操作が最初に呼ばれる" に修正するか、spec.md のコメントでビルド互換性のための遅延初期化である旨を明記する（spec は code-review step では read-only のため、次 iteration の spec-fixer に委ねるか design.md の Risks セクションに補足する）。コードの修正は不要。 | no |
| 4 | low | maintainability | `src/app/(dashboard)/requests/[id]/page.tsx` | 各アクションのバインド後に `as unknown as (formData: FormData) => Promise<void>` でダブルキャストしており、ActionResult の戻り値型が完全に捨てられている（L46-54）。UI でエラーメッセージを表示できない状態のまま。UI 変更はスコープ外のため意図的な選択であり、設計の Risks セクションでも言及済み。 | 将来の UI 対応 PR で `useFormState` / `startTransition` を用いたエラー表示に切り替える際に型キャストを除去する。今 PR では対応不要。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 8 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 6 | 0.10 |

- **total**: 8.25

## Summary

実装の核となる5つの要件（トランザクション、findByEmailForAuth リネーム、Server Actions エラーレスポンス統一、DATABASE_URL ガード、proxy.ts 維持）はすべて正しく実装されている。

**良い点**:
- `db.transaction()` の導入が3つのユースケース（approve/reject/submit）で一貫して適用されており、`validateTransition` がトランザクション外に維持されている設計が正しい（T-03 AC 準拠）。
- リポジトリ関数への `tx?: Transaction` 省略可能引数追加が既存の呼び出し元を壊さない後方互換設計になっている。
- `db.ts` の Proxy ベース遅延初期化は Next.js ビルド時（page data collection）で `DATABASE_URL` 未設定でもビルドが通るよう設計されており、verification 結果でもビルド成功が確認されている。
- `ActionResult` 型の統一と `createRequestAction` の型維持がスコープ通りに実装されている。
- ビルド・lint ともに成功（typecheck は TS 検証として build フェーズ内で通過）。
- D2 判断（proxy.ts 維持）は Next.js 16 の file convention に基づく正しい設計であり、build 出力の "ƒ Proxy (Middleware)" 表示でも機能確認されている。

**要対応**:
- Finding 1（medium）: test-cases.md に定義された must TC の多くが静的テストとして実装されていない。追加コスト低く、全て `expect(content).toContain(...)` 形式で実装可能。
- Finding 2（low）: `package.json` に test スクリプトがないため CI でテストが実行されない。`"test": "bun test"` 1行追加で解決する。

Finding 3（low）は spec 記述の不正確さであり、コードは正しい。Finding 4（info）は次回 UI PR での対応事項として記録する。
