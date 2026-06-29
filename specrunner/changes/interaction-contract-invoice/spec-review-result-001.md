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
| 1 | MEDIUM | Type Safety | tasks.md T-03/T-04/T-06 | T-06 の zod スキーマは `details: z.string().optional()` で文字列を受け取り、T-03/T-04 の usecase がそれを `interactionRepository.create({ details: details ?? null })` に渡す設計になっている。しかし `interactionRepository.create` の `details` パラメータ型は `HearingData \| null` であり、`string \| null` との型不一致により `bun run typecheck` が失敗する。受け入れ基準の「typecheck 成功」と矛盾する。 | usecase の入力から `details?` パラメータを除去し、repository 呼び出しでは常に `details: null` を渡す。「メモ」UI フィールドを完全に不要とするか、summary と合算する。あるいは `{ notes: string \| null }` 型を定義してキャストする（その場合は `Interaction.details` の型コメント更新も必要）。 |
| 2 | LOW | Consistency | tasks.md T-01 | T-01 で新設する `findAllByContract`/`findAllByInvoice` は `desc(interactions.date)` を指定しているが、既存の `findAllByDeal`/`findAllByInquiry` は `asc(interactions.date)` を使用している。UI 要件（「新しい順」）に合わせた意図的な divergence だが、仕様に明記されていないため実装者が誤って asc を使う可能性がある。 | T-01 の AC に「findAllByDeal 等の既存関数とは異なり desc（新しい順）を採用する。UI 要件上の意図的な選択」と 1 行注記を追加する。 |
| 3 | LOW | Specification Gap | tasks.md T-09 | T-09 に「kind のラベル + 日付」を `targetInfoMap` に登録するよう記載があるが、`contract_adjustment`/`invoice_adjustment` のラベル文字列（例: "契約調整"/"請求調整"）が未定義。`meetingTypeLabels` に相当するマッピングが存在せず、実装者が独自に定義する必要がある。 | tasks.md T-09 に `{ contract_adjustment: "契約調整", invoice_adjustment: "請求調整" }` のような label マッピングと、対応する href パターン（`/contracts/:id` / `/contracts/:id/invoices/:id`）を明記する。 |
| 4 | LOW | Test Clarity | tasks.md T-10 | T-09 が `getDealActivity.ts` を修正して `interactionRepository.findAllByContract`/`findAllByInvoice` を呼ぶようになると、既存 `dealActivity.dynamic.test.ts` のモックが `{ findAllByDeal: async () => state.meetings }` のみであるため、新規呼び出しが `undefined()` となり TypeError で既存テストが失敗する。T-10 はケース追加のみ言及しており、モック更新の必要性が明記されていない。 | T-10 に「`dealActivity.dynamic.test.ts` の `interactionRepository` モックに `findAllByContract: async () => []` / `findAllByInvoice: async () => []` の初期スタブを追加し、新設テストケース用の `state` プロパティを拡張する」と明示する。 |

## Validation Notes

### コードベース整合性確認

- **スキーマ**: `interaction_kind` enum に `contract_adjustment`/`invoice_adjustment` が含まれ、`interactions.contract_id`/`invoice_id` FK・インデックス (`interactions_org_contract_id_idx`, `interactions_org_invoice_id_idx`) が実装済みであることをコードで確認。スキーマ変更不要の前提は正確。
- **interactionRepository**: `findAllByContract`/`findAllByInvoice` が存在しないことを確認（`findAllByDeal`, `findAllByInquiry` は実装済み）。T-01 の「要追加」は正確。
- **authorization.ts**: `Entity` 型に `"interaction"` が存在しないことを確認。T-02 の追加が必要な状況と一致。ロール設計（contract_adjustment=admin/manager/member、invoice_adjustment=admin/manager/finance）は既存マトリクスのパターンと整合している。
- **getDealActivity.ts**: 現実装は `findAllByDeal` のみで deal 直紐づきの interactions を取得しており、contract/invoice 経由の interactions は targets に含まれていない。T-09 の拡張が必要な状況と一致。contracts/invoices は既に取得済みなので Promise.all 拡張の前提も正確。
- **UI**: 契約詳細・請求詳細ページともにやり取り記録セクションは未実装。T-07/T-08 の新設が必要な状況と一致。
- **createMeeting パターン**: `db.transaction` → `interactionRepository.create` → `recordAudit("interaction.create", { metadata: { kind } })` のパターンは実装済みであり、T-03/T-04 が同パターンを採用するのは適切。

### セキュリティ確認

- **マルチテナント分離**: `organizationId` はセッション由来（サーバーサイドで取得）。ユーザー入力の `contractId`/`invoiceId` はそれぞれ `contractRepository.findById(id, organizationId)` / `invoiceRepository.findById(id, organizationId)` でテナント帰属を検証するため IDOR を防止できている。
- **認可フロー**: action が auth 認証 → `canPerform` 認可 → zod 検証 → usecase の順序で処理。deny-by-default (`PERMISSION_MATRIX` に存在しない操作は false を返す) も確認済み。
- **入力検証**: `contractId`/`invoiceId` は `z.string().uuid()` で UUID 形式を強制。`summary` は `z.string().min(1)` で空文字を防止。XSS リスクは Next.js のデフォルト HTML エスケープで対応可能。
- **監査ログ**: `recordAudit("interaction.create", { metadata: { kind } })` で全記録操作が監査証跡に残る設計。
- **`recordInvoiceAdjustmentAction` の `contractId`**: ユーザー入力の `contractId` は `revalidatePath` のパス構築にのみ使用され、DB 書き込みには使用されない。`invoiceId` の所属検証は usecase 内で行われるため、不正な `contractId` が渡されてもデータ書き込みへの影響はない（LOW リスク）。

### 設計判断の評価

- **D1（独立 usecase）**: `createMeeting` の meeting 固有ロジック（meetingType 制御・hearing details 強制 null）との混在を避ける判断は妥当。
- **D2（`interaction` エンティティ認可）**: `meeting` エンティティとの役割分離（商談記録操作 vs 顧客接点記録操作）が明確で、既存パターンと整合。
- **D3（`interactions.ts` action ファイル新設）**: contract/invoice エンティティへの操作と混在させない判断は適切。
- **D4（N+1 / Promise.all）**: 契約・請求数は通常少数であり `Promise.all` による並列化で実用上問題なし。承認。
- **D5（クライアントコンポーネント分離）**: `useActionState` 使用のためクライアントコンポーネントが必須。既存 `InvoiceSection` と同パターン。適切。
