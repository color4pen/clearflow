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
| 1 | HIGH | 型定義の矛盾（typecheck 失敗） | tasks.md — T-02 と T-03 | T-02 の `InquiryRow` 型では `createdAt: Date` と定義しているが、T-03 では「Date オブジェクトはシリアライゼーション境界を超えられないため `toISOString()` で string に変換して渡す」と指示している。Server Component → `"use client"` の `InquiryListView` への props では `Date` を渡せないため、T-02 の型定義のまま実装すると `typecheck` が失敗する。 | T-02 の `InquiryRow.createdAt` の型を `string` に変更する（`createdAt: string; // ISO 8601`）。T-03 の変換指示（`toISOString()`）はそのまま維持し、`InquiryListView` 内で `new Date(createdAt).toLocaleDateString("ja-JP")` で表示フォーマットする旨を T-02 に追記する。 |
| 2 | MEDIUM | 不要な prop 定義（実装混乱リスク） | tasks.md — T-05 と T-07/T-10 | T-05 の `InquiryInfoDisplay` Props に `clients: Array<{id, name}>`, `clientName: string \| null`, `clientLinkId: string \| null` が含まれている。T-07 で `InquiryInfoSection`（編集モード）から顧客 UI を削除し、T-10 でそれら props を `InquiryInfoSection` 呼び出しから除去するため、`InquiryInfoDisplay` はこれらを受け取っても使い道がない。`page.tsx` 実装者が混乱し、不要な props を渡すか、型エラーで悩む可能性がある。 | T-05 の `InquiryInfoDisplay` Props 定義から `clients`, `clientName`, `clientLinkId` を削除する。これらは `InquiryCustomerSection`（T-06）が直接 `page.tsx` から受け取る設計に統一する。T-09 の props 分配説明も合わせて修正する。 |
| 3 | LOW | spec シナリオ欠落 | spec.md — 詳細の商談記録セクション | design.md D5 および tasks.md T-08 では `status=new`（deal なし）の引合では「+ 商談を追加」ボタンを disabled（クリック不可）にすると規定しているが、spec.md にこの状態のシナリオが存在しない。案件化済みの場合のリンク有効シナリオのみ記述されており、disabled 状態の振る舞いが検証対象から外れる。 | spec.md の「詳細の商談記録セクション」に以下のシナリオを追加する: **Scenario: 未案件化の引合で追加ボタンが無効化される** — Given status=new の引合 / When 引合詳細ページを開く / Then 「+ 商談を追加」ボタンが disabled 状態で表示される（リンクにならない）。 |

## 検証メモ

**型・API の事前確認:**

- `meetingRepository.findAllByInquiry(inquiryId, organizationId)` — 存在確認済み。戻り値は `Promise<Meeting[]>`、`Meeting.date` は `Date` 型。T-08 の `MeetingRow.date: Date` は正確。
- `dealRepository.findAllByOrganization(organizationId)` — 存在確認済み。戻り値は `Promise<DealWithDetails[]>`、各エントリに `inquiryId: string | null` および `id: string` を含む。T-03 が要求する `inquiryId → dealId` マッピングの構築に使用可能。
- `requestRepository.findByOriginTriggerEntity` — request-review 段階で存在確認済み。T-04/T-09 の承認待ち検出ロジックは正確。
- `InquiryStatus` 型 — `src/domain/models/inquiry.ts` で `"new" | "converted" | "declined"` として定義済み。T-01 の `InquiryStatusBadge` で利用可能。
- `InquiryWithClient` 型 — `dealId` フィールドを含まない（確認済み）。D1 の設計（deals を別途取得）は正しい前提に基づく。

**セキュリティレビュー（OWASP Top 10 適用）:**

本変更は UI レイアウトの変更であり、新規 Server Actions・API Route の追加はない。以下の点を確認した:

- **認証・認可**: `auth()` セッションから取得した `organizationId` を全リポジトリ呼び出しに使用 → テナント分離維持。`editable` フラグは Server Component でロール判定して Client Component に渡す既存パターンと同様。新たな認可バイパス経路なし。
- **入力バリデーション**: `InquiryFilterBar` の検索・フィルタはクライアントサイド `useMemo` で in-memory 処理。サーバーへのユーザー入力送信なし → インジェクションリスクなし。
- **XSS**: React の JSX エスケープによりテキスト表示は安全。動的 href は `dealId`・`inquiryId`・`meetingId` がすべてサーバー取得値（UUIDフォーマット）のため、クライアント供給の任意文字列が URL に入ることはない。
- **CSRF**: 既存 Server Actions を再利用。新規フォームなし。
- **情報露出**: `dealRepository.findAllByOrganization` が全案件を取得するが、`organizationId` スコープ内に限定。Client Component には `dealId` のみ渡す設計。

セキュリティ上の懸念事項: **なし**。
