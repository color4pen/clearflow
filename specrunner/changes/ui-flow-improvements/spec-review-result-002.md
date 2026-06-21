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
| 1 | MEDIUM | 権限制御 — 設計記録欠落 | design.md | 担当者管理（addDealContactAction/removeDealContactAction）の操作可能ロールが設計に記録されていない。既存の商談作成は全認証ユーザーに開放されているが、担当者管理を同じ方針とするか admin/manager 限定にするかの明示的判断がない。 | design.md の Decisions に D9 として「担当者管理は全認証ユーザーに開放する（createMeeting と同等）」または「admin/manager 限定」の判断と理由を追記する。 |
| 2 | MEDIUM | 仕様—実装乖離リスク | design.md Risks / tasks.md T-10 | design.md の Risk セクションに「担当者登録失敗時、ユーザーには部分的な成功を通知する」と記載があるが、T-10 は「商談作成の成功レスポンスを返す」のみで通知手段を指定していない。実装者がユーザー通知を省略しても仕様に反しない状態になっている。 | T-10 に「担当者登録が一部失敗した場合は `message` フィールドに警告メッセージを含めて返す（商談作成は成功扱いのまま）」を追記し、design.md Risk の Mitigation 記述と整合させる。または Mitigation 記述を「通知は省略し best-effort のみ」に修正する。 |
| 3 | MEDIUM | トランザクション非対称 | tasks.md T-06 | `addDealContact` UC は「同一トランザクション内で実行する」と明記されているが、`removeDealContact` UC は同等の記述がなく、`deleteByDealAndContact` 成功後に `auditLogRepository.create` が失敗した場合、削除操作の監査ログが欠落する。 | T-06 の `removeDealContact` の説明に「`deleteByDealAndContact` と `auditLogRepository.create` を同一トランザクション内で実行する（`deleteByDealAndContact` は `tx?` 引数を受け取るため対応可能）」を追記する。 |
| 4 | LOW | 型安全性 | tasks.md T-08 | T-08 で `clientRepository.findContactsByClientId(inquiry?.clientId)` を `Promise.all` 内で呼び出すと指定しているが、`findContactsByClientId` のシグネチャは `clientId: string`（null 不可）であり、`inquiry?.clientId` は `string | null | undefined` になりうる。TypeScript strict モードでコンパイルエラーになる。 | T-08 に「`inquiry?.clientId` が null/undefined の場合は `Promise.resolve([])` を使用する: `inquiry?.clientId ? clientRepository.findContactsByClientId(inquiry.clientId) : Promise.resolve([])`」を明記する。 |
| 5 | LOW | コード規約 | tasks.md T-12 | T-12 のログメッセージ `"✅ Created deal contacts (3 total)"` に絵文字を含む。code-common.md の「絵文字禁止」ルールと形式的に矛盾する。既存シードの全ログが同形式のため実態との整合はあるが、規約と不整合な記述を仕様に残すことで実装者が迷う。 | T-12 のログメッセージを `"Created deal contacts (3 total)"` に変更する、またはシード全体の絵文字ログを実装者の判断に明示的に委ねる旨を記載する。 |

## 検証メモ

### 前回レビュー（001）からの対応状況

| 001 Finding | 対応状況 |
|-------------|---------|
| #1 MEDIUM — `removeDealContactAction` の `contactId` UUID バリデーション不足 | T-07 に `contactId: z.string().uuid()` が明記された。✅ 解決 |
| #2 MEDIUM — 新設 Action への `checkRateLimit` 適用漏れ | T-07 に両 Action への `checkRateLimit` 適用が明記された。✅ 解決 |
| #3 MEDIUM — 案件商談詳細ページのリソース帰属検証欠落 | T-05 に `meeting.dealId !== id` → `notFound()` が追記された。✅ 解決 |
| #4 MEDIUM — 担当者管理のロール制限ポリシー未記録 | design.md に D9 追加なし。⚠️ 未対応（本レビュー Finding #1 として継続） |
| #5 MEDIUM — 重複追加時エラーメッセージ未定義 | T-06 に `{ ok: false, reason: "この担当者はすでに登録されています" }` が追記された。✅ 解決 |
| #6 LOW — `meetingTypeLabels` 二重定義 | T-05 に既存ページのローカル定義削除が追記された。✅ 解決 |
| #7 LOW — 絵文字付きログメッセージ | T-12 に `"✅ Created deal contacts (3 total)"` のまま。⚠️ 未対応（本レビュー Finding #5 として継続） |

### design.md

- Context セクションの現状コード記述はコードベースの実態と一致していることを確認（labels.ts に dealContactRoleLabels なし、createClient UC は独立関数として存在、deal_contacts テーブル/リポジトリ実装済み）。
- D1〜D8 はすべて request.md の設計判断と整合している。
- D2（案件商談詳細ページ新設）の判断と D8（詳細リンク分岐ロジック）の記述は、meetingRepository.findById が organizationId でテナント分離し、T-05 で dealId 帰属も検証する設計と整合している。
- D6 の「findContactsByClientId のテナント分離前提」コメントは clientRepository.ts:139 に実装されており、deals/[id]/page.tsx での clientId 取得経路（inquiryRepository.findById(deal.inquiryId, organizationId) → inquiry.clientId）によりテナント検証が担保されている。
- deals.inquiryId は schema.ts:315 で `.notNull()` であり、D8 の「inquiryId が存在すれば」分岐は deals の新規商談（案件直紐づき meetings）を指すことに注意。ドメインモデル（deal.ts:29）の型定義 `inquiryId: string`（非 null）と矛盾しない。

### tasks.md

- T-01〜T-14 の実装範囲は design.md の Decisions と対応しており漏れなし。
- T-03 の `__new__` sentinel 値は `createInquirySchema` の `clientId: z.string().uuid().optional()` によって UUID バリデーションで除外されるため、Action 側で特別処理が不要。問題なし。
- T-05 は `meetingTypeLabels` のローカル定義削除も含んでおり、001 Finding #6 を解決している。
- T-06 の `addDealContact` トランザクション設計は `dealContactRepository.create` が `tx?: Transaction` を受け取ることを確認（dealContactRepository.ts:21-51）。実装可能。
- T-12 のシードデータ修正: 現行 seed.ts で `鈴木 花子` の insert に `.returning()` がなく変数が取得されていない（seed.ts:431-439）。T-12 の「returning() を追加して contactId を取得」指示は現状コードに基づいており正確。

### spec.md

- 要件とシナリオが design.md・tasks.md と整合している。
- `clientId が null` のシナリオが明示されており、T-08・T-11 とも対応している。
- spec.md の受け入れシナリオは受け入れ基準（request.md）とも整合している。

### セキュリティ総評

- **テナント分離**: dealContactRepository.create/findByDeal/deleteByDealAndContact はすべて organizationId を使った二重検証を実装済みであり、IDOR リスクは低い。
- **認証**: 新設 Action はすべて冒頭で `await auth()` を実行する設計（T-07 明記）。
- **入力バリデーション**: addDealContactAction は `contactId: z.string().uuid()`、role: enum によるバリデーションが指定されている。removeDealContactAction も `contactId: z.string().uuid()` が明記された。
- **CSRF**: Next.js Server Actions の組み込み CSRF 保護により担保。
- **レート制限**: 両 Action に `checkRateLimit` 適用が明記された（T-07）。
- **XSS**: React 自動エスケープにより担保。`newClientName` は `z.string().min(1)` で最小長のみ検証（最大長なし）だが、既存コードと一貫したパターン。
- **OWASP A01（アクセス制御不備）**: 担当者管理のロールベース制限が未定義（Finding #1）。機能的には全認証ユーザーに開放されると推定されるが、明示的設計判断の記録が欠ける。

CRITICAL/HIGH の検出なし。
