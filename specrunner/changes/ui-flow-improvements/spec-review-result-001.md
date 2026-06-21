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
| 1 | MEDIUM | セキュリティ — 入力バリデーション | tasks.md T-07 / `app/actions/dealContacts.ts` | `removeDealContactAction` の `contactId` に zod バリデーションが指定されていない。`addDealContactAction` に UUID 必須バリデーションが書かれている一方、`removeDealContactAction` は「`contactId` を FormData から取得」のみ。非 UUID 文字列が渡ると UC → repository で DB エラーが raw throw される。 | T-07 に「`contactId: z.string().uuid()` で zod バリデーションを行う」を追記し、`addDealContactAction` と対称なバリデーション実装を指示する。 |
| 2 | MEDIUM | セキュリティ — レート制限 | tasks.md T-07 / `app/actions/dealContacts.ts` | 新設する `addDealContactAction` / `removeDealContactAction` にレート制限の記述がない。既存の `createInquiryAction` / `createMeetingAction` はすべて `checkRateLimit` を適用しているが、新 Action では言及なし。 | T-07 に「既存 Action と同様に `checkRateLimit` を適用する」を追記する。 |
| 3 | MEDIUM | セキュリティ — リソース帰属検証 | tasks.md T-05 / `app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx` | `meetingRepository.findById(meetingId, organizationId)` はテナント（org）分離を保証するが、取得した meeting が URL の `dealId` に属するかを検証しない。別の案件の `meetingId` を URL に指定すると、組織内の他案件の商談詳細が表示される。 | T-05 に「取得した `meeting.dealId !== id` の場合は `notFound()` を返す」を追記する。引き合い商談詳細も同様のパターンであり、今回の新規実装で踏襲するなら修正の機会として明示する。 |
| 4 | MEDIUM | 権限制御 | tasks.md T-07 / `app/actions/dealContacts.ts` | 担当者の追加・削除に対するロールチェックが設計に含まれていない。商談記録（`createMeetingAction`）は全認証ユーザーに開放されているため同等の判断であれば問題ないが、明示的な設計判断として記録がない。意図せず一般ユーザーが担当者を操作できる状態になる。 | design.md の Decisions セクションに「担当者管理のロール制限は不要（全認証ユーザーに開放）」または「admin/manager 限定」の判断を D9 として明記する。 |
| 5 | MEDIUM | エラーハンドリング | tasks.md T-06 / `app/application/usecases/addDealContact.ts` | `deal_contacts` テーブルには `(dealId, contactId)` の unique 制約があるが、重複追加時のユーザー向けエラーメッセージが仕様化されていない。DB の unique 制約エラーが `catch` で拾われて `{ ok: false, reason: DB エラー文字列 }` になるが、日本語の分かりやすいメッセージに変換する旨が書かれていない。 | T-06 に「重複追加時（unique 制約違反）は `{ ok: false, reason: "この担当者はすでに登録されています" }` を返す」を追記する。 |
| 6 | LOW | コード一貫性 | tasks.md T-05 / `app/(dashboard)/inquiries/[id]/meetings/[meetingId]/page.tsx` | T-05 では新設する案件商談詳細ページで `meetingTypeLabels` を `labels.ts` から import するよう指示しているが、既存の引き合い商談詳細ページのローカル定義（`const meetingTypeLabels = {...}`）を削除・置換するタスクが含まれていない。両ページで定義が並存する状態になる。 | T-05 に「`inquiries/[id]/meetings/[meetingId]/page.tsx` のローカル `meetingTypeLabels` 定義を削除し `labels.ts` からの import に統一する」を追記するか、別タスクとして切り出す。 |
| 7 | LOW | 仕様記述の揺れ | tasks.md T-12 / `src/infrastructure/seed.ts` | T-12 のログメッセージ `"✅ Created deal contacts (3 total)"` は絵文字を含む。既存シードのログも同形式のため実態との整合はあるが、code-common.md の「絵文字禁止」ルールと形式的に矛盾する。 | ログ文字列は実装時の判断に委ねる（LOW影響）。明示するなら T-12 のログメッセージを `"Created deal contacts (3 total)"` に変更する。 |

## 検証メモ

### design.md

- Decisions D1〜D8 は request.md の architect 評価済み設計判断と整合しており、代替案・却下理由の記録も適切。
- D2（案件商談詳細ページ新設）は request-review で指摘された「詳細リンクが 404 になる」問題への明示的な解答として機能している。
- D6（ページ側でデータ結合）は `findContactsByClientId` に「テナント分離の前提: 呼び出し前に findById で clientId が organizationId に属することを確認すること」というコメントがある。ページ側では `inquiryRepository.findById(deal.inquiryId, organizationId)` 経由で `clientId` を取得しているためテナント検証は担保されており、設計は妥当。
- Risks セクションで createClient / createInquiry の別トランザクション問題と担当者登録の best-effort を明記しており、実装者への伝達が適切。

### tasks.md

- T-01〜T-14 の実装範囲は design.md の Decisions と 1:1 対応しており漏れなし。
- T-03 の `__new__` という sentinel 値の扱い（Action 側で UUID バリデーションに失敗して除外される）は `createInquirySchema` の `clientId: z.string().uuid().optional()` で正しく処理される。問題なし。
- T-10 での `contactRegistrations` の FormData → JSON.parse → zod バリデーションの流れは `internalAttendees` と同一パターンであり実装可能。ただし T-10 のスキーマ追加記述と実際の JSON パース処理の分離は既存コードと同一パターンのため実装者が混乱しない範囲。
- T-13 の静的テストは依存方向・テナント分離・監査ログの3点をカバーしており適切。

### spec.md

- 要件記述と受け入れ基準（シナリオ）の対応が明確。
- `clientId が null` のケースが明示されており（T-08、spec.md シナリオ「顧客未紐づけ時の追加フォーム非表示」）、エッジケースが担保されている。
- request-review-result-001.md で指摘された MEDIUM 3件のうち、「DealMeetingForm 対称性」は tasks.md T-11 で解決、「詳細リンク 404」は design.md D2 で解決、「clientId が null のチェックボックス」は spec.md / T-08 で解決済み。

### セキュリティ総評

- テナント分離: `dealContactRepository.create` / `findByDeal` / `deleteByDealAndContact` はすべて organizationId を使った二次検証を実装しており、IDOR リスクは低い。
- 認証: 新設 Action はすべて `await auth()` を冒頭で実行する設計（T-07 明記）。
- CSRF: Next.js Server Actions の組み込み CSRF 保護により担保。
- XSS: React の自動エスケープにより担保。
- Mass Assignment: zod による明示的フィールド指定で防止。
- 主要リスクは Finding #1〜#5（バリデーション・レート制限・帰属検証・権限・エラーハンドリング）であり、CRITICAL/HIGH は検出されなかった。
