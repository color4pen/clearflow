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

- **verdict**: needs-fix
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | high | correctness | `src/app/actions/inquiries.ts` | `updateInquiryAction` の `raw` オブジェクトに `budget` と `timeline` が含まれていない。`updateInquirySchema` には両フィールドが定義されているが、FormData から読み取られないため `parsed.data.budget = undefined`。アクションは `budget: parsed.data.budget ?? null` → `null` を usecase に渡す。usecase は `data.budget !== undefined` でガードしているが `null` は通過するため、フォーム送信のたびに既存の budget/timeline が null にリセットされる（データ消失）。 | `raw` に `budget: formData.get("budget") ? parseInt(String(formData.get("budget"))) : undefined` および `timeline: formData.get("timeline") \|\| undefined` を追加する。usecase 呼び出しでは `budget: parsed.data.budget` (null かつ undefined の区別を維持)、`timeline: parsed.data.timeline` と渡し、`?? null` で undefined を null に変換しない。 | yes |
| 2 | high | correctness | `src/app/actions/inquiries.ts` | `createInquiryAction` の `safeParse` 呼び出しに `budget` と `timeline` が渡されていない。スキーマ・モデル・リポジトリ・usecase のすべてで正しく実装されているが、Server Action の入り口で FormData から読み取られないため、UI 経由で budget/timeline を設定することが不可能。作成時は常に null が保存される。 | `safeParse` の引数に `budget` と `timeline` を追加する。FormData からの取得は整数解析のガード込みで行う（例: `budget: formData.get("budget") ? parseInt(String(formData.get("budget"))) : undefined`）。 | yes |
| 3 | low | maintainability | `src/application/usecases/updateClientContact.ts` | `clientRepository.updateContact` と `auditLogRepository.create` が `db.transaction` で囲まれていない。更新成功後に監査ログ書き込みが失敗した場合、更新は確定されるが監査ログが欠落する。同プロジェクト内の `createMeeting` や `updateDeal` はトランザクションを使用しており、一貫性が損なわれている。 | `db.transaction(async (tx) => { ... })` で両呼び出しを囲み、`updateContact` と `auditLogRepository.create` にトランザクションを渡す（`clientRepository.updateContact(id, clientId, data, tx)` のシグネチャが tx を受け取れることを確認する）。 | yes |
| 4 | low | testing | `src/infrastructure/seed.ts` | seed に inquiryId のみを持つ商談（引合段階の商談）のデモデータが存在しない。すべての商談が dealId に紐づいており、新機能（Meeting.inquiryId / dealId nullable + CHECK 制約）の動作を seed 環境で確認できない。コメント「inquiryId 廃止により対応する案件に紐づけ直し」は新機能の趣旨と逆の方向を示唆している。 | 引合段階の商談を少なくとも 1 件 seed に追加する（例: `newInquiry1` または `inProgressInquiry1` に紐づき `dealId: null`、`inquiryId: <inquiryId>` の商談）。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 6 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 7.60

## Summary

スキーマ・モデル・リポジトリ・usecase・migration の各レイヤーの実装は概ね良好。inquirySourceEnum の pgEnum 化、meetings の inquiryId 追加と CHECK 制約、attendees JSON 構造変換、validateIsPrimaryUniqueness の domain service 実装、updateClientContact usecase の新設はいずれも設計通りに実装されている。migration SQL の順序（CHECK 制約 → attendees 変換）も既存行が deal_id IS NOT NULL を保持しているため安全。ビルド・型チェック・テストもすべて green。

ただし Server Action レイヤーに 2 件の High 指摘がある。`updateInquiryAction` では budget/timeline が FormData から読み取られないまま null として usecase に渡され、フォーム更新のたびに既存の budget/timeline データが消失する（Finding 1）。`createInquiryAction` でも同様に budget/timeline が読み取られないため UI から設定不可能（Finding 2）。スキーマ・型・usecase の実装は正しいだけに、Server Action の入り口での読み取り漏れが惜しい。修正は軽微。

