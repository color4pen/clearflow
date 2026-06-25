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

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | アクセシビリティ | tasks.md / T-07 | `ClientContactsSection.tsx` の `<table>` を CSS grid に置換するが、ARIA 属性（`role="grid"`, `role="row"`, `role="columnheader"`, `role="cell"`）の付与が指定されていない。スクリーンリーダーは表形式データとして認識できなくなる。design.md D4 はカラム統合のための CSS grid 採用を rationale に挙げるが、アクセシビリティへの言及がない。 | grid 要素に適切な ARIA ロールを追加するか、本変更のアクセシビリティへの影響を設計上の許容リスクとして design.md Risks に明記する。実装者への情報提供が目的であり、ブロッカーではない。 |
| 2 | LOW | 情報提供 | tasks.md / T-01 | `MeetingAttendeesSection` の FormData に `registerContacts` を set する旨が記載されているが、`updateMeetingAction` が受け取るキー名は `registerContacts` ではなく `registerContactsRaw = formData.get("registerContacts")` として読まれる。キー名は一致しているため動作上の問題はないが、現行の `MeetingInfoSection.tsx` では `formData.set("registerContacts", ...)` という命名を使っており、整合している。実装者への確認として記録する。 | 実装時に `formData.set("registerContacts", ...)` のキー名が `updateMeetingAction` の `formData.get("registerContacts")` と一致することを確認する。現在の命名は一致しているため修正不要。 |

## Review Notes

### updateMeeting ユースケースの部分更新動作（D2 根拠確認）

`src/application/usecases/updateMeeting.ts` L28-29 を確認した。

```typescript
const effectiveType = data.type ?? existing.type;
const hearingData = effectiveType === "hearing"
  ? (data.hearingData !== undefined ? data.hearingData : existing.hearingData)
  : null;
```

`hearingData` は常に update payload に含まれ、`type` が `"hearing"` 以外の場合は自動的に `null` に強制される。design.md D2 が前提とする「部分更新対応」は正しく成立しており、`MeetingInfoSection`（type/date/location のみ保存）が type を `"hearing"` 以外に変更した場合でも `hearingData` が自動クリアされる。型変更時の data 整合性リスクは実装上解消済み。

### セキュリティレビュー（OWASP Top 10）

- **認証・認可**: 新規 Server Action なし。既存 `updateMeetingAction` の `canPerform(session.user.role, "meeting", "edit")` チェックは全コンポーネント（`MeetingInfoSection`, `MeetingAttendeesSection`, `MeetingHearingSection`）で共有される。追加の攻撃面なし。
- **入力バリデーション**: `updateMeetingSchema`（zod）が全フィールドをバリデーション。新コンポーネントは既存の Action を呼び出すのみで、バリデーション層に変更なし。
- **データ漏洩**: 顧客一覧の不要クエリ削除（T-05）はパフォーマンス改善であり、表示データは削減されるだけで機密性への影響なし。
- **その他 OWASP Top 10**: 純粋な UI レイアウト変更であり、注入・CSRF・IDOR 等の新たなリスクは発生しない。

### Spec 構造の健全性

- spec.md の 5 Requirement は全て Given/When/Then 形式の Scenario を持ち、SHALL normative keyword を含む（rules.md 準拠）。
- レイアウト比率変更（T-04, T-06）は CSS レベルの変更であり spec.md の Requirement としては記載されていないが、tasks.md の Acceptance Criteria でカバーされている。これは適切な分担。
- design.md の Decisions（D1-D5）は全て request.md の要件に対応し、却下案・Rationale が記載されており設計根拠が明確。
- tasks.md の T-01〜T-08 は request.md の受け入れ基準と 1:1 でトレースできる。
