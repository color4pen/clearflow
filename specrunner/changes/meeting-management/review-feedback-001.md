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
| 1 | medium | security | `src/app/actions/meetings.ts` | `updateMeetingAction` にレート制限がない。要件7では `meetings.ts` ファイル全体に「レート制限」を明記しているが、`createMeetingAction` のみ `checkRateLimit` を呼び出しており `updateMeetingAction` は未保護。`toggleActionItemDone` を含む全更新呼び出しが繰り返し実行可能な状態。 | `updateMeetingAction` の認証チェック直後に `createMeetingAction` と同パターンで `checkRateLimit` を追加する。`key` は `updateMeeting:${session.user.id}`、`limit`/`windowMs` は `RATE_LIMITS.createRequest` を流用でよい。 | yes |
| 2 | low | maintainability | `src/app/(dashboard)/inquiries/[id]/meetings/[meetingId]/MeetingDetail.tsx` | 編集フォームのヒアリング項目表示条件が `meeting.type === "hearing"`（DBの現在値）に固定されている。非 hearing の商談を編集で `hearing` type に変更した場合、入力フィールドが現れないため hearingData は全 null で保存される。作成フォーム（`MeetingForm.tsx`）は `selectedType` state で正しく動的表示しているため、編集フォームとの挙動不一致が生じる。 | `editMode` 中の `Select` の `onChange` で `selectedEditType` state を管理し、ヒアリング項目の表示条件を `selectedEditType === "hearing" \|\| (!selectedEditType && meeting.type === "hearing")` に変える。 | yes |
| 3 | low | maintainability | `src/app/(dashboard)/inquiries/[id]/meetings/[meetingId]/MeetingDetail.tsx` | `toggleActionItemDone`（line 59–73）が `setActionItems(updated)` による楽観更新後にサーバー呼び出しを fire-and-forget で行っており、サーバー側エラー時の UI ロールバックがない。`router.refresh()` は成功時のみ呼ばれるため、失敗すると UI と DB の状態が乖離したままになる。 | `updateMeetingAction` の戻り値を確認し、`result.message` が存在する場合は `setActionItems(actionItems)` で元の状態に戻すか、少なくともエラーメッセージを表示する。 | yes |
| 4 | low | maintainability | `src/app/actions/meetings.ts` | `createMeetingAction` の `internalAttendees`/`externalAttendees` の JSON パース失敗時に `return { errors: {} }` を返す（line 78–80）。フォームにエラーメッセージが表示されず、ユーザーは何が起きたか分からない。 | `{ errors: { internalAttendees: ["参加者データの形式が不正です"] } }` のように具体的なエラーメッセージを含める。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 8 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 9 | 0.10 |

- **total**: 8.90

## Summary

全受け入れ基準を確認した。`bun run build` / `tsc --noEmit` / `bun test`（455件 green）がすべて通過しており、主要な機能要件はすべて実装されている。

**要件チェック結果（must 全件確認）:**

- meetings テーブル・meetingTypeEnum の schema 定義：正しく実装（schema.ts L42–48, L274–296）
- 全リポジトリ関数の organizationId 条件：`create`/`findById`/`findAllByInquiry`/`findAllByOrganization`/`update` の全 5 メソッドに存在を確認
- type=hearing のみ hearingData 保存：`createMeeting.ts` L28 と `updateMeeting.ts` L29 で正しく制御
- 存在しない inquiryId でエラー：`inquiryRepository.findById` → `{ ok: false }` 返却を確認
- 監査ログ：create・update 両ユースケースで `db.transaction` 内に `auditLogRepository.create` が存在
- 引き合い詳細ページの商談履歴セクション：`SectionCard` 内の `DataTable` で時系列表示、「商談を記録」リンクあり
- hearing 選択時のヒアリングフォーム条件付き表示：`MeetingForm.tsx` L274 の `selectedType === "hearing"` で正しく制御
- アクションアイテム done 更新：`toggleActionItemDone` で実装済み
- 依存方向（actions → usecases → domain/infrastructure）：domain/models/meeting.ts に ORM import なし、usecase が repository 呼び出し
- Relations 定義：`meetingsRelations`（inquiry/organization/createdBy）、`inquiriesRelations`/`organizationsRelations`/`usersRelations` への `meetings: many(meetings)` 追記を確認
- seed の truncation 順序：`meetings` が `inquiries` の前（seed.ts L37–39）

**アーキテクチャ:** 既存の Result 型・mapRow パターン・テナント分離パターン・監査ログパターンを一貫して踏襲しており、設計判断（jsonb 固定構造・引き合い紐づけ・ネストルート）も要件通り実装されている。

**主な懸念:** `updateMeetingAction` のレート制限漏れ（finding #1）は要件の明示的な記述に対する実装漏れであり、修正を推奨する。その他はいずれも low severity の UX・保守性改善であり、承認を妨げない。
