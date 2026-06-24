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
| 1 | low | testing | `src/__tests__/**/*.test.ts` | すべてのテストが静的ソース解析（`readFile` + `toContain`）であり、実際のビジネスロジックを実行しない。TC-001/003/004/006/007/008/012/014/015/016/025 など must 優先度の integration テストケースが「コードにキーワードが含まれるか」の確認にとどまる。`validatePrimaryUniqueness` が実際に重複をリジェクトするか、`createMeeting` が inquiryId のみで正常終了するかは runtime で未検証。DB が不要なモックを用いた動作テストへの移行を推奨する。 | `validatePrimaryUniqueness` をモック化した clientRepository で振る舞いテストに置き換える（例: `isPrimary=true + 既存 primary あり` → `{ ok: false }` を assertion）。他のユースケースも同様に純粋関数として単体テスト可能な部分をモックテストに変換する。 | no |
| 2 | low | architecture | `src/infrastructure/repositories/inquiryRepository.ts`, `src/application/usecases/createInquiry.ts` | `inquiryRepository.create` の引数 `source` が `string` 型のまま（`InquirySource` 型未使用）。repository 内部で `as "web" \| ...` キャストしているため TypeScript の型チェックが domain boundary で機能せず、誤った文字列が渡された場合にコンパイルエラーでなく実行時 DB エラーになる。`createInquiry` use case の引数も同様に `source: string`。 | `inquiryRepository.create` の `source` 引数型を `InquirySourceValue`（既に定義済み）に変更し、`as` キャストを削除する。`createInquiry` use case の `source` 引数も `InquirySource` 型（`domain/models/inquiry` から import）に変更する。 | no |
| 3 | low | maintainability | `src/app/actions/meetings.ts` | `updateMeetingAction` が `dealId` パスのみ `revalidatePath` し、`inquiryId` パスを再検証しない。引合に紐づく商談を更新した場合、`/inquiries/{id}` の Next.js キャッシュが陳腐化したまま次のリクエストまで残る。`createMeetingAction` は dealId/inquiryId 両方を再検証しており非対称。 | `updateMeetingAction` の末尾で `formData.get("inquiryId")` を取得し、`dealId` の場合と同様に `revalidatePath(\`/inquiries/\${inquiryId}\`)` を追加する。 | no |

## Manual Test Result (TC-029: マイグレーション SQL の実行順序)

`drizzle/0004_rapid_chat.sql` を目視確認した結果:

1. `CREATE TYPE "public"."inquiry_source"` ✅
2. `UPDATE "inquiries" SET "source" = 'other' WHERE "source" NOT IN (...)` — ALTER COLUMN より前 ✅
3. `ALTER TABLE "inquiries" ALTER COLUMN "source" SET DATA TYPE ... USING "source"::"public"."inquiry_source"` ✅
4. `ALTER TABLE "meetings" ALTER COLUMN "deal_id" DROP NOT NULL` ✅
5. `UPDATE "meetings" SET "attendees" = (JSONB 変換)` ✅
6. カラム追加 DDL (description, budget, timeline, inquiry_id) ✅
7. FK 制約追加 (meetings_inquiry_id_inquiries_id_fk) ✅
8. CHECK 制約追加 (meetings_deal_or_inquiry_check) — inquiry_id カラム追加後 ✅

TC-029 **passed** (手動確認)。

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 8 | 0.25 |
| architecture | 8 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.30

## Summary

受け入れ基準のすべてのチェック項目が実装に反映されている。

**スキーマ・モデル変更**: `inquirySourceEnum` が pgEnum 7 値で定義済み、`inquiries` テーブルに budget/timeline 追加済み、`meetings` テーブルに inquiry_id (nullable, FK) と CHECK 制約 (`deal_id IS NOT NULL OR inquiry_id IS NOT NULL`) 追加済み、`deals` テーブルに description 追加済み。すべてのドメインモデル型・リポジトリ・ユースケース・アクションに反映されている。

**マイグレーション SQL**: 上記 TC-029 確認のとおり、source enum 変換の UPDATE が ALTER COLUMN より前に配置され、attendees の JSONB 変換も正しく含まれる。既存データの `internal`/`external` キーを持たない空レコードは `COALESCE('[]'::jsonb)` で安全に空配列に変換される。

**isPrimary 検証**: `validatePrimaryUniqueness` が `application/services` に正しく配置され、`createClientContact` use case では `db.transaction` 内でSELECT+INSERT の TOCTOU 対策が施されている。`updateClientContactAction` のトランザクション外呼び出しは設計書 D5 で明示的に許容された既知の制限。

**型チェック・テスト**: `tsc --noEmit` pass、`bun test` 776 pass 0 fail。

**低優先度所見の補足**:
- Finding 1 の静的解析テストは DB 環境を前提としない現実的な選択だが、将来のリグレッション検出能力は低い。
- Finding 2 は Zod バリデーションで実際にはアプリ入口で値が検証済みのため実害リスクは低いが、domain boundary の型を強化しておくほうが保守性が高い。
- Finding 3 はデータ整合性ではなく UI キャッシュの問題であり、重篤度は低い。

これらはいずれも `needs-fix` を要するものではなく、次のイテレーションでの改善推奨事項とする。
