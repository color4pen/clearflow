# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | yes | 全 19 タスク（T-01〜T-19）が `[x]` 完了済み |
| design.md | yes | D1〜D10 全設計決定が実装で忠実に再現されている |
| spec.md | yes | 全 Requirements（SHALL/MUST）と Scenarios が実装でカバーされている |
| request.md | yes | 全受け入れ基準を充足。build/typecheck/test/lint が全件 green |

---

## 1. Tasks Completion Check

全 19 タスク（T-01〜T-19）がすべて `[x]` で完了済み。未完了チェックボックスなし。

---

## 2. Design Decisions Traceability (D1〜D10)

| ID | 決定内容 | 実装確認 |
|----|---------|---------|
| D1 | 引き合いに 1:1 で紐づける | `createDeal.ts:35-38` で `findByInquiryId` 重複チェック。`schema.ts` で `unique("deals_inquiry_id_unique")` DB 制約（TOCTOU 対策）|
| D2 | estimatedAmount をフォームデータとして承認リクエストに渡す | `updateDealPhase.ts:47-49` で `{ amount: { value: deal.estimatedAmount, label: "想定金額" } }` を formData 構築 |
| D3 | フェーズ遷移をドメインサービスで管理 | `dealTransition.ts` に `VALID_TRANSITIONS` + `canTransition` 定義。`inquiryTransition.ts` と同一パターン |
| D4 | 案件ページをトップレベルルートに配置 | `/deals` と `/deals/[id]` を `(dashboard)` 直下に配置。ビルド出力で確認済み |
| D5 | assigneeId と technicalLeadId を分離 | `schema.ts` に両 FK あり。両ユースケースでテナント帰属検証も実施 |
| D6 | contractType を text カラムで管理 | `schema.ts` で `text("contract_type")` 定義。ドメインモデルで `ContractType` union 型制約 |
| D7 | updateDealPhase で直接 requestRepository を呼び出す | `updateDealPhase.ts:57-66` で直接呼び出し。`createRequest` usecase を経由しない |
| D8 | 作成・フェーズ変更は admin/manager のみ | `deals.ts:59-61`, `134-136` でロールチェック。`updateDealAction` はロールチェックなし（全ロール許可）|
| D9 | 案件作成時に inquiry.status が converted であることを検証 | `createDeal.ts:31-33` で `status !== "converted"` チェック |
| D10 | 楽観ロック用 version カラム | `schema.ts` で `version integer default 1`。`updateDealPhase.ts:92-94` でロック失敗時に `throw` してトランザクションをロールバック |

---

## 3. Spec Requirements & Scenarios Coverage

| Requirement | Scenario | 実装確認 |
|------------|---------|---------|
| dealPhaseEnum は 6 値 | スキーマに 6 値存在 | `schema.ts:49-56` |
| フェーズ遷移ルール | proposal_prep→proposed 許可 | `dealTransition.test.ts:T-01` |
| フェーズ遷移ルール | negotiation→internal_approval 許可 | `dealTransition.test.ts:T-05` |
| フェーズ遷移ルール | won は終端状態 | `dealTransition.test.ts:T-09,T-10` |
| フェーズ遷移ルール | lost は終端状態 | `dealTransition.test.ts:T-11,T-12` |
| フェーズ遷移ルール | 全フェーズから lost 許可 | `dealTransition.test.ts:T-15` |
| internal_approval 遷移時に見積承認リクエスト自動作成 | タイトル `"見積承認: ${deal.title}"` | `updateDealPhase.ts:59` |
| internal_approval 遷移時に見積承認リクエスト自動作成 | テンプレート未指定でエラー | `updateDealPhase.ts:35-37` + `dealManagement.test.ts:TC-008` |
| internal_approval 遷移時に見積承認リクエスト自動作成 | 存在しないテンプレートでエラー | `updateDealPhase.ts:39-45` |
| converted 検証 | converted 以外でエラー | `createDeal.ts:31-33` |
| 重複作成禁止 | 2 件目はエラー | `createDeal.ts:35-38` + DB unique 制約 |
| organizationId 条件 | 全 repo 関数に条件付与 | `projectStructure.test.ts` Tenant isolation — deal で 6 メソッド検証 |
| 監査ログ | 作成時 | `createDeal.ts:72-80` で `deal.create` |
| 監査ログ | フェーズ変更時 | `updateDealPhase.ts:96-110` で `deal.updatePhase`（fromPhase/toPhase 含む）|
| 監査ログ | 情報更新時 | `updateDeal.ts` で `deal.update`（changedFields metadata 含む）|
| admin/manager のみ作成・フェーズ変更 | member は拒否 | `deals.ts:59-61`, `134-136` |
| admin/manager のみ作成・フェーズ変更 | member は情報更新可 | `updateDealAction` にロールチェックなし |
| ヘッダーナビに「案件」リンク | 全ロールに表示 | `layout.tsx:43-48` |
| 引き合い詳細に案件セクション | 案件存在時リンク | `inquiries/[id]/page.tsx:131-163` |
| 引き合い詳細に案件セクション | converted で未作成時に作成ボタン | `inquiries/[id]/page.tsx:164-173` |
| 依存方向遵守 | infrastructure import なし | `projectStructure.test.ts` TC-031, TC-034 |

---

## 4. Acceptance Criteria Verification

| 受け入れ基準 | 結果 |
|------------|------|
| `bun run build` が成功する | passed（verification-result.md: 9.5s, exit 0）|
| `bun test` が全件 green | 488 pass, 0 fail |
| `deals` テーブルが `schema.ts` に定義されている | `schema.ts:307` 確認 |
| `dealPhaseEnum` が 6 値で定義されている | `schema.ts:49-56` 確認 |
| 全リポジトリ関数に `organizationId` 条件 | Tenant isolation テスト 6 件 green |
| フェーズ遷移テスト: proposal_prep→proposed 許可 | T-01 green |
| フェーズ遷移テスト: negotiation→internal_approval 許可 | T-05 green |
| フェーズ遷移テスト: won→proposal_prep 拒否 | T-09 green |
| フェーズ遷移テスト: lost→negotiation 拒否 | T-11 green |
| フェーズ遷移テスト: 全フェーズから lost 許可 | T-15 green |
| internal_approval 遷移時に見積承認リクエスト作成をテストで確認 | `dealManagement.test.ts:61-66` |
| converted でない引き合いへの案件作成でエラー | `createDeal.ts:31-33` |
| 同一引き合いへの 2 件目作成でエラー | `createDeal.ts:35-38` + DB unique 制約 |
| audit_logs にレコード記録 | 全 3 ユースケースで実装済み |
| 作成・フェーズ変更が admin/manager のみ | `deals.ts` ロールチェック確認 |
| ヘッダーに「案件」ナビリンク | `layout.tsx:43-48` 確認 |
| 引き合い詳細に案件セクション | `inquiries/[id]/page.tsx:131-177` 確認 |
| 依存方向遵守 | `projectStructure.test.ts` 静的検証 green |
| `typecheck` が green | tsc --noEmit exit 0 |

---

## 5. Regression Gate Findings (全件解決済み)

`regression-gate-result-001.md` で検出された 11 件のフィンディングはすべて現行ブランチで修正済み:

- **[HIGH]** deals.inquiry_id の TOCTOU: DB UNIQUE 制約追加で解決
- **[HIGH]** 楽観ロック失敗時の孤立承認リクエスト: トランザクション内 throw でロールバック保護
- **[HIGH]** TC-008 テスト欠如: `dealManagement.test.ts` に追加済み
- **[MEDIUM]** 一覧の担当者名表示: `DealWithInquiry` に `assigneeName` 追加、users テーブル LEFT JOIN
- **[MEDIUM]** assigneeId/technicalLeadId のテナント帰属検証欠如: `createDeal` / `updateDeal` で追加
- **[LOW]** lint 警告（0 errors, 3 warnings）は既存コードに起因、新規追加コードとは無関係
