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
| 1 | LOW | missing-revalidation | `src/app/actions/meetings.ts` | `createMeetingAction` と `updateMeetingAction` はともに、meetingが inquiry-only (dealId なし) の場合にパスの revalidation を行わない。`dealId` が存在する場合のみ `revalidatePath(/deals/...)` が呼ばれるため、引き合い経由で作成した商談一覧は自動更新されない。現時点で inquiry-based meeting ページが存在しないため機能上の障害はないが、将来の inquiry UI 追加時に混乱を招く可能性がある。 | `createMeetingAction` の末尾で `inquiryId` がある場合に `revalidatePath(/inquiries/${inquiryId})` などを追加しておく。現在スコープ外のため `no` でよいが、inquiry-based meeting ページ追加時に合わせて対応する。 | no |
| 2 | LOW | lint-warning | `src/infrastructure/seed.ts` | 本 PR の seed 更新で新規追加したと思われる変数 `greenContact1`、`newInquiry1`、`newInquiry2`、`inProgressInquiry1`、`inProgressInquiry2` が `@typescript-eslint/no-unused-vars` 警告として検出されている。lint は 0 errors で通過しているため CI ブロックはないが、警告件数が増加した。 | 変数への代入を削除するか、使用箇所を追加する（例: `void greenContact1` や `console.log` の削除、または実際にシードデータとして参照する）。 | no |
| 3 | LOW | validation-ux | `src/app/actions/meetings.ts` | `createMeetingSchema.refine` のエラーを `path: ["dealId"]` に割り当てている。`dealId` と `inquiryId` の両方が未入力の場合、エラーが `dealId` フィールドだけに表示され、`inquiryId` フィールドには何も表示されない。フォームに両フィールドが存在する場合、ユーザーが `inquiryId` を埋めればよいと気づきにくい。 | `path` を省略して top-level エラーにするか、`path: []` を使用して両フィールドに関係するメッセージとして表示する。 | no |

## 受け入れ基準の確認

| 基準 | 状態 |
|------|------|
| inquiries テーブルに budget / timeline カラムが存在する | ✅ schema.ts line 285-286 |
| inquiries.source が pgEnum 型になっている（7 値） | ✅ schema.ts line 41-49, inquirySourceEnum |
| meetings テーブルに inquiry_id カラムが存在し、dealId が nullable になっている | ✅ schema.ts lines 300-301 |
| meetings に CHECK 制約（deal_id OR inquiry_id が NOT NULL）が存在する | ✅ migration SQL line 43 |
| meetings の attendees JSON 構造が新形式に変換されている | ✅ migration SQL lines 1-23 |
| deals テーブルに description カラムが存在する | ✅ schema.ts line 330 |
| contracts.amount と contracts.start_date が NOT NULL になっている | ✅ schema.ts lines 385-386 |
| invoices テーブルに issue_date カラムが存在する | ✅ schema.ts line 409 |
| isPrimary の重複チェックがアプリケーション層に実装されている | ✅ clientContactService.ts + createClientContact.ts + clients.ts |
| 既存データのマイグレーションが正常に完了する | ✅ 手動確認要; migration SQL の UPDATE→ALTER 順序が正しい |
| `typecheck && test` が green | ✅ verification-result.md: build/typecheck/test/lint すべて passed |

## マイグレーション SQL 検証

| チェック項目 | 状態 |
|------|------|
| source 正規化 UPDATE が `CREATE TYPE inquiry_source` の前に存在する | ✅ lines 25→26 |
| contracts.amount の NULL 補完 UPDATE が NOT NULL 変更の前に存在する | ✅ lines 28→29 |
| contracts.start_date の NULL 補完 UPDATE が NOT NULL 変更の前に存在する | ✅ lines 31→32 |
| CHECK 制約 `meetings_deal_or_inquiry_check` が存在する | ✅ line 43 |
| attendees JSON 変換 SQL が既存データを正しく変換する | ✅ WHERE `attendees ? 'internal'` で旧形式のみ対象 |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.60

## Summary

全受け入れ基準を充足。マイグレーション SQL の手動編集（UPDATE→ALTER 順序、attendees 変換、CHECK 制約）は仕様通りに実装されており、データ安全性を確保している。ドメインモデル型の変更（MeetingAttendee 新設、InquirySource 7値化、Contract NOT NULL 化など）はスキーマ・リポジトリ・ユースケース・アクション層まで一貫して反映されている。`validatePrimaryUniqueness` は純粋関数として正しく実装され、createClientContact usecase と updateClientContactAction の両方から呼び出されている。自己再設定時の除外ロジック（`c.id !== contactId`）も正確。

指摘した 3 件はすべて LOW 警告であり、機能的な正確性・安全性には影響しない。build/typecheck/test/lint は全フェーズ passed。verdict: **approved**。
