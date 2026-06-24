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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | マイグレーション SQL バグ — データ損失リスク | `tasks.md` T-33 (e) attendees JSON 変換 SQL | `internal` 配列が空 (`[]`) のレコードで、内部参加者サブクエリの `SELECT jsonb_agg(...) FROM jsonb_array_elements_text(attendees->'internal')` が 0 行を返し `jsonb_agg` が NULL を返す。PostgreSQL では `NULL \|\| jsonb_value = NULL` のため、外部参加者が存在しても `attendees` 全体が NULL になる。meetings テーブルの `attendees` は `.notNull()` 制約があるため、internal が空の行では Migration が制約違反で失敗するか、attendees が NULL に書き換えられてデータ損失が発生する。 | 内部参加者サブクエリ全体を COALESCE でラップする: `COALESCE((SELECT jsonb_agg(jsonb_build_object('userId', null, 'contactId', null, 'name', elem, 'isExternal', false)) FROM jsonb_array_elements_text(attendees->'internal') AS elem), '[]'::jsonb)`. 外部参加者側はすでに COALESCE で保護されているが、同様の形式に統一すること。 |
| 2 | MEDIUM | スキーマ default 値の未更新 — 新旧フォーマット不整合 | `tasks.md` T-02 / `src/infrastructure/schema.ts` | meetings テーブルの `attendees` カラムは `jsonb("attendees").notNull().default({ internal: [], external: [] })` と定義されている。マイグレーション後、既存データは新配列形式 `MeetingAttendee[]` に変換されるが、schema.ts の Drizzle default は旧オブジェクト形式のまま。`attendees` を明示的に渡さない INSERT（シード・テスト等）が実行された場合、旧形式 `{ internal: [], external: [] }` が DB に書き込まれ、アプリケーション層の型と不整合を起こす。 | T-02 または T-32 のタスクに「`meetings` テーブルの `attendees` の Drizzle schema default を `[]` に変更する」チェックを追加する。spec.md の「新形式で商談を作成する」シナリオにこの動作を含めることを検討する。 |
| 3 | MEDIUM | isPrimary 自己再設定シナリオが未テスト | `spec.md` Requirement: isPrimary 重複チェック | `updateClientContactAction` の isPrimary 検証は「自身以外に isPrimary=true がいるかを確認する」（tasks.md T-27）という自己除外ロジックを必要とする。spec.md にはこのロジックをカバーするシナリオがない。具体的には「すでに isPrimary=true の contact-Y を isPrimary=true のまま更新する」ケース（エラーにならないこと）および「isPrimary=true の contact-X と contact-Y が存在するとき、contact-X が自分自身の isPrimary を更新する場合は contact-X のみをカウント除外すること」が仕様として明記されていない。実装者が自己除外の境界を誤ると、正当な更新をエラーとして弾く不具合が生じる。 | spec.md に以下のシナリオを追加する。(1) 「contact-X が既に isPrimary=true の状態で、contact-X の他フィールドを更新（isPrimary=true を維持）すると成功する」。(2) tasks.md T-27 に「自身の contactId を除外してカウントすること」を明示し、`validatePrimaryUniqueness` の呼び出し前に `existingPrimaryCount = contacts.filter(c => c.isPrimary && c.id !== contactId).length` とする旨を記載する。 |
| 4 | LOW | セキュリティ: findContactsByClientId に organizationId 保護なし | `src/infrastructure/repositories/clientRepository.ts:139` | `findContactsByClientId(clientId)` は organizationId を引数に取らず、clientId だけで照会する。現状のコメントに「呼び出し前に findById で clientId が organizationId に属することを確認すること」とあり、T-20（createClientContact usecase）および T-27（updateClientContactAction）はいずれも事前に `clientRepository.findById(clientId, organizationId)` を呼ぶ設計で、テナント分離は保たれる。しかし将来的に呼び出し元が増えるとこの前提が崩れやすい。 | spec.md / tasks.md の対応は現時点では不要だが、tasks.md の T-20 / T-27 の実装メモに「`findContactsByClientId` 呼び出し前に必ず `findById` でテナント検証を行うこと」を明記しておくことを推奨する。将来的には `findContactsByClientId(clientId, organizationId)` にシグネチャを変更することを検討する。 |
| 5 | LOW | InquirySource 型キャストが残存する | `src/infrastructure/repositories/inquiryRepository.ts:14` | `mapRow` で `source: row.source as InquirySource` と明示的キャストしている。T-01 で `source` を `inquirySourceEnum` に変更すると Drizzle の `$inferSelect` が自動的にユニオン型を推論するため、このキャストは不要（かつ型安全を低下させる）になる。tasks.md に削除の記載がない。 | tasks.md T-11（inquiryRepository 更新）に「`mapRow` の `source` フィールドのキャスト `as InquirySource` を削除し、Drizzle の推論型をそのまま使う」を追加する。 |
