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
| 1 | MEDIUM | Security | tasks.md (T-08) | `updateMeetingAction` にレート制限（`checkRateLimit()`）の記述がない。`createMeetingAction` には明記されているが、`updateMeetingAction` に対する記述が欠落している。actionItems の done フラグ更新が UI から頻繁にトリガーされるユースケースを考えると、レート制限の除外が意図的な設計か記述漏れか判断できない。既存の `updateInquiryStatusAction` にもレート制限がなく、プロジェクト慣習との整合である可能性もあるが、仕様として明示されていない。 | `updateMeetingAction` に `checkRateLimit()` を追加するか、「既存の update 系 Action と同様にレート制限なし」と T-08 の Acceptance Criteria に明記して意図を明示する。 |
| 2 | MEDIUM | Input Validation | tasks.md (T-08) | Zod スキーマに文字列長の上限が未定義。`summary`、`location`、`actionItems[].description`、`actionItems[].assignee`、`internalAttendees`/`externalAttendees` の各要素、`hearingData` の各フィールドに `z.string().max(N)` がない。jsonb カラムへの大ペイロード送信を制限する手段が Server Action 層にない。既存の `createInquirySchema` にも同様の欠落があり、プロジェクト全体の慣習からの継承である可能性はあるが、jsonb を3カラム持つ本テーブルは影響が大きい。 | 各フィールドに適切な上限を追加する（例: `summary` は 5000 文字、`location` は 500 文字、`description`/`assignee` は 500 文字/100 文字、attendee 名は 100 文字）。既存スキーマとの整合を考慮して一括方針として決めてもよい。 |
| 3 | LOW | Specification clarity | tasks.md (T-08) | request-review で指摘された「type が `hearing` 以外の場合に hearingData を送信した際の Zod レベルの動作が未定義」が T-08 の Acceptance Criteria に反映されていない。usecase 層（T-05/T-07）での null 強制は明記されているが、Server Action の Zod スキーマは hearingData を optional として受け付けたまま（バリデーションエラーとしない）であることが Acceptance Criteria から読み取れない。 | T-08 の Acceptance Criteria に「type が `hearing` 以外の場合、hearingData を送信しても Zod バリデーションエラーとしない（usecase 側で null 強制）」を追記して実装者への指示を明確にする。 |
| 4 | LOW | Specification completeness | tasks.md (T-04), design.md | `meetingRepository.findAllByOrganization` の呼び出し元が spec/design/tasks のいずれにも記載されていない。request-review でも LOW として指摘された継続課題。実装時に「呼び出されないメソッド」として unmapped 警告が出る可能性がある。 | T-04 または design.md に「将来の組織内商談一覧ダッシュボード向けプレースホルダーとして定義する」など用途を一言明記する。 |

## Review Summary

### spec.md 整合性確認

全 Requirement に `### Requirement:` ヘッダー、Given/When/Then Scenario、normative keyword（MUST/SHALL）が揃っており、spec 記法に準拠している。hearingData の null 制御は hearing タイプ・proposal タイプ・その他3タイプの計3シナリオでカバーされており、受け入れ基準と一致している。依存方向チェック（TC-034 パターン）の Scenario も domain model ファイルへの ORM import 禁止として正しく記述されている。

### design.md 整合性確認

D1〜D8 の全決定が tasks.md の実装タスクに反映されている。D7（hearingData の null 強制をアプリケーション層で行う）は T-05/T-07 に、D8（done 更新は updateMeeting usecase 経由）は T-11 に対応している。リスク・トレードオフ節で jsonb 3カラムの設計上の懸念と将来的な正規化の可能性が明記されており、設計意思決定の透明性は十分。

### tasks.md 実装可能性確認

- T-01（schema.ts）: Auth.js adapter テーブルの前への配置指示、FK 参照先（organizations/inquiries/users）が明確。
- T-02（Relations）: 双方向 relations の追加先（inquiriesRelations、organizationsRelations、usersRelations）が具体的に指定されている。
- T-04（meetingRepository）: `findAllByInquiry`/`findAllByOrganization` を `tx?` 対象から除外している点が Acceptance Criteria に明記されており、既存 inquiryRepository のパターンと整合している。
- T-09（page.tsx 直接 repository 呼び出し）: 既存の `/inquiries/[id]/page.tsx` が `inquiryRepository.findById` を直接呼ぶパターンと同一であり、依存方向違反ではなく確立済みのプロジェクト慣習に従っている。
- T-12（seed truncation 順序）: `meetings → inquiries` の FK 依存を正しく反映している。
- T-15（静的検証テスト）: hearingData null 制御コードの静的検証が createMeeting・updateMeeting 両方で指定されており、仕様担保のカバレッジとして適切。

### セキュリティ確認（OWASP Top 10）

- **認証（A07）**: createMeetingAction・updateMeetingAction 両方に `auth()` チェックが明記されている。商談詳細ページ（T-11）にも `auth()` が指定されている。
- **認可・テナント分離（A01）**: 全リポジトリ関数に `organizationId` 条件が必須とされており、T-14 の静的テストで検証される。IDOR は `findById(meetingId, organizationId)` の組み合わせ条件で防止される。
- **インジェクション（A03）**: Drizzle ORM のパラメータ化クエリを踏襲。Zod による入力バリデーションがある。
- **XSS（A03）**: React/Next.js による自動エスケープが適用され、`dangerouslySetInnerHTML` の使用は spec に含まれない。

HIGH/CRITICAL の欠陥なし。MEDIUM 2件はいずれも実装ブロックとならない品質・セキュリティ上の改善事項であり、承認を妨げない。
