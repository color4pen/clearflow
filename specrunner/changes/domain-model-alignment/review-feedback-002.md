# Code Review Feedback — iteration 002

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
- **iteration**: 002

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | maintainability | `src/application/usecases/updateClientContact.ts` | （iter 001 Finding 3 未修正）`clientRepository.updateContact` と `auditLogRepository.create` が `db.transaction` で囲まれていない。更新成功後に監査ログ書き込みが失敗した場合、更新は確定されるが監査ログが欠落する。同プロジェクトの `createMeeting` / `updateDeal` はトランザクションを使用しており一貫性が損なわれている。 | `db.transaction(async (tx) => { ... })` で `updateContact` と `auditLogRepository.create` の両呼び出しを囲む。`clientRepository.updateContact` がトランザクションを受け取れるシグネチャになっているか確認する。 | yes |
| 2 | low | testing | `src/infrastructure/seed.ts` | （iter 001 Finding 4 未修正）seed に `inquiryId` のみを持つ商談（引合段階の商談）のデモデータが存在しない。8 件すべての商談が `dealId` に紐づいており、新機能（`Meeting.inquiryId` / `dealId` nullable + CHECK 制約）の動作を seed 環境で確認できない。L804 のコメント「inquiryId 廃止により対応する案件に紐づけ直し」は新機能の趣旨（引合段階の商談を記録できるようにする）と逆の方向を示唆している。 | 引合段階の商談を 1 件追加する（例: `newInquiry1` または `inProgressInquiry1` に紐づき `dealId: null`、`inquiryId: <inquiryId>` の商談）。L804 のコメントも削除または書き換える。 | yes |
| 3 | low | correctness | `src/app/actions/inquiries.ts` | `updateInquiryAction` で `budget: parsed.data.budget ?? null` および `timeline: parsed.data.timeline ?? null` が `usecase` に渡される。FormData に "budget" キーが存在しない場合（`budgetRaw === null`）、raw.budget → undefined → parsed.data.budget → undefined → `?? null` で null に変換され、usecase の `if (data.budget !== undefined)` ガードを通過してしまう。結果として budget が意図せず null に更新される。現在の UI フォームは常に budget フィールドを送信するため実害はないが、プログラマティックな呼び出し（フィールドなし FormData）で不整合が発生する。 | `updateInquiry` 呼び出しを `budget: parsed.data.budget` / `timeline: parsed.data.timeline` と `?? null` を付けずに渡す。`z.coerce.number().int().nullable().optional()` は undefined を undefined のまま通過させるため、型的にも問題ない。 | yes |
| 4 | low | maintainability | `src/infrastructure/seed.ts` | 4 変数（`newInquiry1`, `newInquiry2`, `inProgressInquiry1`, `inProgressInquiry2`）および `greenContact1` が `.returning()` で受け取られているが後続コードで参照されず、lint が `@typescript-eslint/no-unused-vars` 警告を 5 件出力している。verification-result.md の lint フェーズで確認済み（10 problems, 0 errors, 10 warnings のうち 5 件が seed.ts 由来）。 | 後続で参照しない場合は `.returning()` を省略するか、`void` キャストする（例: `void await db.insert(...).values(...)`）。あるいは Finding 2 の対応で inquiryId のみの商談 seed を追加する際に `newInquiry1` / `inProgressInquiry1` を利用すれば自然に解消される。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.25

## Summary

iter 001 で報告した 2 件の High 指摘（`createInquiryAction` / `updateInquiryAction` で budget/timeline が FormData から読み取られない）はともに修正済みで確認した。`updateInquiryAction` では `budgetRaw` / `timelineRaw` を FormData から正しく取得し、空文字列 → null / null（フィールドなし）→ undefined と適切に区別している点も評価できる。

受け入れ基準はすべて達成されている。スキーマ（inquirySourceEnum pgEnum・budget/timeline・inquiryId/dealId nullable + CHECK 制約・attendees 新形式・description）、ドメインモデル型、リポジトリ、usecase、Server Action の各レイヤーは設計通りに実装されており、ビルド・型チェック・テスト・lint（エラーなし）も green。migration SQL の順序（データフォールバック → 型変換 → CHECK 制約 → attendees データ変換）も安全。`validateIsPrimaryUniqueness` の domain service および `updateClientContact` usecase も仕様どおりに動作する。

残課題は 4 件すべて low 止まり。Finding 1（updateClientContact.ts トランザクション）と Finding 2（seed に inquiryId のみの商談なし）は iter 001 から持ち越しで未修正。Finding 3（`?? null` で undefined が null に変換され usecase ガードを迂回）は iter 001 の修正に伴う副産物だが現 UI では実害なし。Finding 4（seed.ts の unused-vars 警告）は seed 拡張時の整理漏れ。いずれも機能的なブロッカーではなく、次イテレーション以降での対応で問題ない。
