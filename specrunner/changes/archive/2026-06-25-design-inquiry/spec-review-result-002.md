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
| 1 | MEDIUM | タスク実装ガイダンスの不足 | tasks.md — T-09 | T-09 はパンくず・バナー・2カラムグリッドの構造を記述しているが、`InquiryStatusBanner` に渡す `dealId`/`dealTitle`、および `InquiryMeetingSection` に渡す `dealId`/`dealMeetingNewPath` の導出方法を明記していない。既存 `page.tsx` はすでに `dealRepository.findByInquiryId(id, organizationId)` を呼び出して `deal` 変数を持っているため実装は可能だが、T-09 の「Props の調整」が `InquiryInfoDisplay` / `InquiryCustomerSection` のみに言及しており、新規コンポーネントへの prop 供給が漏れている。 | T-09 の「ステータスバナー」チェックリスト項目に `dealId: deal?.id ?? null, dealTitle: deal?.title ?? null` を渡す旨を追記する。「2カラムグリッド — 右カラム」項目に `InquiryMeetingSection` へ `dealId: deal?.id ?? null, dealMeetingNewPath: deal ? \`/deals/${deal.id}/meetings/new\` : null` を渡す旨を追記する。 |

## spec-review-001 からの修正確認

前回の `needs-fix` 指摘はすべて解消されている:

| 前回 # | 前回 Severity | 内容 | 解消確認 |
|---------|--------------|------|---------|
| 1 | HIGH | T-02 `InquiryRow.createdAt` が `Date` 型だったため Server→Client 境界で typecheck 失敗 | ✅ `createdAt: string; // toISOString() で変換済み` に修正済み |
| 2 | MEDIUM | T-05 `InquiryInfoDisplay` Props に不要な `clients`/`clientName`/`clientLinkId` が含まれていた | ✅ T-05 Props から削除済み（`inquiry` + `editable` のみ） |
| 3 | LOW | spec.md — `status=new` で「+ 商談を追加」disabled 状態のシナリオが欠落 | ✅ `Scenario: status=new（deal なし）の引合で追加ボタンが disabled になる` が追加済み |

## 検証メモ

**コードベース確認事項:**

- `dealRepository.findByInquiryId(inquiryId, organizationId)` — 存在確認済み（`src/infrastructure/repositories/dealRepository.ts:127`）。返却型 `Deal | null`。`Deal.id`（dealId）と `Deal.title`（dealTitle）の両方が含まれる。
- 既存 `inquiries/[id]/page.tsx` — すでに `dealRepository.findByInquiryId` を `Promise.all` 内で呼び出し、`deal` 変数として保持。T-09 はこの既存コードを修正するため、`deal` は実装時に利用可能。
- `requestRepository.findByOriginTriggerEntity` — 存在確認済み。`status: inArray(["draft","pending"])` 条件でフィルタ。`Request | null` を返す。T-09 の `hasPendingApproval: pendingRequest !== null` は正確。
- `dealRepository.findAllByOrganization(organizationId)` — 存在確認済み。T-03 の `inquiryId → dealId` マッピング構築に利用可能（`DealWithDetails.inquiryId` が存在）。
- `InquiryStatus` 型 — `"new" | "converted" | "declined"` として定義済み（`src/domain/models/inquiry.ts`）。T-01 の `InquiryStatusBadge` で利用可能。

**型・設計の整合性:**

- T-02 の `InquiryRow.createdAt: string` と T-03 の `toISOString()` 変換が一致。
- T-05 `InquiryInfoDisplay` と T-06 `InquiryCustomerSection` の props 分担が T-09 の呼び出し構造と整合。
- T-07 が `InquiryInfoSection` から顧客 UI を除去し、T-10 が `InquiryInfoDisplay` 内での呼び出し整合を確保する流れが論理的に一貫している。
- D7 の「`DataTable` 不使用・CSS Grid 直接実装」は T-02 の `grid-template-columns` 指定要件と整合。

**セキュリティレビュー（OWASP Top 10）:**

本変更は UI レイアウトの変更であり、新規 Server Actions・API Route・認可境界の追加はない。

- **認証・認可（A01）**: `auth()` セッションから取得した `organizationId` で全リポジトリ呼び出しをスコープ限定。`editable` フラグは Server Component でロール判定（`admin` / `manager`）して Client Component に渡す既存パターンと同様。新たな認可バイパス経路なし。
- **入力バリデーション・インジェクション（A03）**: `InquiryFilterBar` の検索・フィルタはクライアントサイド `useMemo` で in-memory 処理。サーバーへのユーザー入力送信なし。インジェクションリスクなし。
- **XSS（A03）**: React の JSX エスケープによりテキスト表示は安全。動的 href (`dealId`、`inquiryId`、`meetingId`) はすべてサーバー取得値（UUID フォーマット）であり、クライアント供給の任意文字列が URL に入ることはない。
- **CSRF（A01）**: 既存 Server Actions を再利用。新規フォームなし。
- **情報露出（A02）**: `dealRepository.findAllByOrganization` は `organizationId` スコープ内に限定。Client Component には表示に必要な最小限の値（`dealId`）のみ渡す設計。

セキュリティ上の懸念事項: **なし**。
