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

## 前回 (spec-review-result-001) からの変更確認

前回レビューで指摘した 4 件の HIGH/MEDIUM 所見はすべて修正済みであることを確認した。

| 前回 # | 前回 Severity | 解決状況 |
|--------|--------------|---------|
| 1 | HIGH — Migration Bug (jsonb_agg NULLケース) | ✅ T-04 Step 6 に `COALESCE(jsonb_agg(item), '[]'::jsonb)` が追加された |
| 2 | HIGH — Test Incompatibility (meetingManagement T-01) | ✅ T-08 に `not.toContain("inquiryId")` の削除・書き換え手順が追加された |
| 3 | HIGH — Requirement Gap (isPrimary 検証のフロー未接続) | ✅ T-08 に `updateClientContact` usecase 新設、T-09 に action 側の isPrimary 渡しが追加された |
| 4 | MEDIUM — Schema Inconsistency (attendees default 旧形式) | ✅ T-02 に `default([])` への変更手順が追加された |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Security / Defense-in-Depth | tasks.md T-08 (`updateClientContact` usecase) | `updateClientContact` usecase の仕様に `clientRepository.findById(data.clientId, data.organizationId)` によるテナント所属確認ステップが記述されていない。`clientRepository.findContactsByClientId` の関数コメントは「呼び出し前に findById でテナント確認すること」を前提とする。既存の `createClientContact.ts` は同様の確認を usecase 内で行っている（line 20）。`updateClientContactAction` が action 層で `findById` を呼んでいるため実際の脆弱性にはなっていないが、usecase 自体が独立してテナント分離を保証しないため、将来の他コンテキストからの呼び出しで問題が生じうる。 | T-08 の `updateClientContact` usecase 仕様先頭に「`clientRepository.findById(data.clientId, data.organizationId)` で clientId がテナントに属することを確認し、存在しない場合は `{ ok: false, reason: "顧客が見つかりません" }` を返す」ステップを追加する。`createClientContact.ts` の既存パターン（line 19-23）に合わせる。 |
| 2 | MEDIUM | Security / Race Condition | tasks.md T-07 (`validateIsPrimaryUniqueness`) | `validateIsPrimaryUniqueness` は Read-then-Write パターンであり、同一 clientId に対して isPrimary=true の作成/更新リクエストが並行した場合、両方が「既存 primary なし」と判断して通過し、複数の primary が生まれうる（TOCTOU）。設計判断 D4 でアプリ層検証を選択した理由（Drizzle の部分一意制約との相性）は妥当だが、リスクが spec 上で言及されていない。 | design.md の D4 セクションに「並行リクエストによる TOCTOU は理論上存在するが、同一 clientId への同時 isPrimary=true 操作は業務上まれであり許容する。将来の負荷増に備え DB 部分一意制約（`CREATE UNIQUE INDEX ... WHERE is_primary = true`）への移行を検討する」旨の注記を追加する（実装変更は不要）。 |
| 3 | LOW | Performance | tasks.md T-04 (migration) | `meetings.inquiry_id` カラムに対するインデックスが migration SQL に含まれていない。T-06 で新設する `findAllByInquiry(inquiryId, organizationId)` は `inquiry_id` と `organization_id` の両方で WHERE するが、インデックスなしでは全表スキャンになる。現状データ量では問題ないが将来リスクになる。 | T-04 migration の末尾に `CREATE INDEX "meetings_inquiry_id_idx" ON "meetings" ("inquiry_id");` を追加する（または T-11 の検証項目として「inquiry_id にインデックスが存在すること」を追記する）。 |
| 4 | LOW | Type Safety | tasks.md T-06 (`meetingRepository.ts`) | `row.attendees as MeetingAttendee[]` は実行時に型チェックされないキャストである。migration の Step 6 が `WHERE attendees ? 'internal'` で旧形式のみを対象とするため、マイグレーション失敗など想定外の経路で新形式と旧形式が混在した場合、型エラーが実行時にサイレントに発生しうる。 | 現状は許容範囲。将来的には zod や valibot で `MeetingAttendee[]` の実行時バリデーションを `mapRow` 内で行うことを検討する。今回のスコープでは要件なし。 |

## 総評

前回 HIGH 3 件・MEDIUM 1 件はすべて適切に対処された。今回の新規所見は MEDIUM 2 件・LOW 2 件であり、いずれも実装を阻害するバグではない。仕様書として実装着手可能な品質に達している。

MEDIUM #1（usecase のテナント確認欠落）は、実装者が `createClientContact.ts` の既存パターンを参照すれば自然に気づく可能性があるが、spec として明記されていないため実装ばらつきのリスクがある。tasks.md T-08 への追記を推奨するが、実装前に対応が間に合わない場合はコードレビュー段階で確認することを代替手段とする。
