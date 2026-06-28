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
| 1 | LOW | 実装詳細 | tasks.md / T-02・T-03 | `updateContact` / `deleteContact` の WHERE 条件への org 条件追加を「サブクエリ or exists」と記述しているが具体例がない。Drizzle ORM で UPDATE/DELETE に innerJoin が使えない点は正しく指摘されているが、実装者が迷う余地がある（inArray サブクエリ か exists どちらを使うか）。 | 許容範囲。acceptance criteria（他 org の担当者は更新/削除されない）が明確なため、実装者に委ねてよい。補足したければ design.md の D1 に「`exists(db.select().from(clients).where(and(eq(clients.id, clientContacts.clientId), eq(clients.organizationId, organizationId))))` を where に追加する」等の例を付記する程度で可。 |
| 2 | LOW | テスト戦略 | tasks.md / T-11 | spec.md の受け入れシナリオ（他 org の contactId を渡すと null/false/空が返る）を静的解析テストのみで固定している。実際のクエリ意味論（SQL の EXISTS が期待通り動くか）は静的検証では検証できない。ただし既存テスト群も同様の静的検証パターンを採用しており、プロジェクト方針と一致している。 | 許容範囲。プロジェクト全体の静的テスト方針に沿っており、TypeScript strict モードとの組み合わせで十分なセーフティネットが形成される。行動テストが必要な場合は別 request で DB 統合テスト環境の整備を検討する。 |
| 3 | LOW | スコープ外リスク | design.md | `updateClientContactAction` では `validatePrimaryUniqueness` と `updateContact` をトランザクション外で逐次呼び出しており、isPrimary 一意性に関する TOCTOU が潜在する（`createClientContact` はトランザクション済み）。本リクエストのスコープ外だが、設計者に認識されていない可能性がある。 | 本リクエストは tenant isolation のみを対象としており修正不要。design.md の Risks/Trade-offs セクションに「updateClientContactAction の isPrimary TOCTOU は別リクエストで対処」と記載することを推奨（任意）。 |

## レビュー概要

### コードベース照合結果

仕様が記述する「現状コードの前提」をすべて実ソースと照合した。

| 仕様の主張 | 実コード | 一致 |
|---|---|---|
| `findContactsByClientId` が `organizationId` なし | clientRepository.ts:139 — `eq(clientContacts.clientId, clientId)` のみ | ✅ |
| `updateContact` が `organizationId` なし | clientRepository.ts:174 — `and(eq(id), eq(clientId))` のみ | ✅ |
| `deleteContact` が `organizationId` なし | clientRepository.ts:200 — `and(eq(id), eq(clientId))` のみ | ✅ |
| `countContactsByClientIds` が `organizationId` なし | clientRepository.ts:155 — `inArray(clientId)` のみ | ✅ |
| `findAllContactsByOrganization` が innerJoin 済み | clientRepository.ts:222 — `innerJoin(clients).where(eq(clients.organizationId))` | ✅ |
| `clientContacts` テーブルに `organization_id` カラムなし | schema.ts:313-325 — 確認 | ✅ |
| `listClientContacts` が `organizationId` を渡さない | listClientContacts.ts:5 — `findContactsByClientId(clientId)` のみ | ✅ |
| `deleteClientContact` が `deleteContact` に `organizationId` を渡さない | deleteClientContact.ts:22 — `deleteContact(data.contactId, data.clientId)` | ✅ |
| `createClientContact` の `validatePrimaryUniqueness` に `organizationId` なし | createClientContact.ts:34 — `validatePrimaryUniqueness(data.clientId, null, isPrimary, tx)` | ✅ |
| `validatePrimaryUniqueness` が `findContactsByClientId(clientId, tx)` を呼ぶ（org なし）| clientContactService.ts:26 | ✅ |
| `updateClientContactAction` が `validatePrimaryUniqueness` / `updateContact` に `organizationId` なし | clients.ts:292,297 — 両呼び出し共に org なし | ✅ |
| RSC 4 ページが `listClientContacts` に `organizationId` を渡さない | clients/[id]/page.tsx:24, deals/[id]/page.tsx:53, meetings/new:22, meetings/[id]:34 — すべて確認 | ✅ |

### セキュリティ評価（OWASP Top 10 観点）

- **A01 Broken Access Control**: 本変更の直接の対象。現状はリポジトリ層が tenant isolation の最終防衛線として機能しておらず、caller の規約違反で cross-tenant アクセスが可能になるリスクがある。4 メソッドへの `organizationId` + innerJoin 追加により repository 自身が最終防衛線となり、A01 リスクを排除する。**重要な改善**。
- **A04 Insecure Design**: 現在の「caller 規約依存」はインセキュアデザインの典型であり、本変更が修正する。3 層防御（action → usecase → repository）の一貫性が担保される。
- **A03 Injection**: Drizzle ORM の型安全 API を使用しており、SQL インジェクションの懸念なし。`organizationId` は Auth.js session 由来（サーバー管理）であり改ざん不可。
- **入力バリデーション**: `organizationId` は `session.user.organizationId` から取得し、クライアント入力を経由しない。セーフ。

### 設計の妥当性評価

- **D1（join 方式）**: `findAllContactsByOrganization` と同一パターンへの統一は合理的。スキーマ変更なしにテナント分離を達成できる。✅
- **D2（多重防御）**: usecase の事前検証を残す方針は 3 層防御の観点から正しい。✅
- **D3（organizationId 引数伝搬）**: `validatePrimaryUniqueness` への引数追加は依存方向に沿った自然な設計。✅
- **D4（呼び出し元なしでも修正）**: 将来のリグレッション予防のため呼び出し元不在の `countContactsByClientIds` も修正する判断は妥当。✅
- **D5（RSC から usecase 経由）**: レイヤードアーキテクチャの依存方向を守っており正しい。✅

### 網羅性評価

タスク T-01〜T-12 がすべての変更対象（repository 4 メソッド、service 1 件、usecase 2 件、action 1 件、RSC 4 ページ）を網羅していることを確認した。TypeScript strict モードにより引数変更の呼び出し元漏れはコンパイル時に検出されるため、漏れのリスクは低い。

### 結論

仕様は技術的に正確・完全であり、コードベースの現状と整合している。設計判断は認可設計 docs/design/03-authorization-design.md §5（「テナント分離はインフラストラクチャ層で強制する」）と完全に一致する。指摘事項はすべて LOW（情報提供・任意対応）であり、実装を妨げる問題はない。
