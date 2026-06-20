# Domain Invariants Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    all domain invariants are intact
  - needs-fix:   one or more invariants broken or unprotected — must fix before merge
  - escalation:  structural conflict requiring human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
-->

Reviewer: domain-invariants
Purpose: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
Iteration: 1

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | ドメイン不変条件 — 1:1制約 | `src/infrastructure/schema.ts` / `drizzle/0010_deal_management.sql` | `deals.inquiry_id` に UNIQUE 制約がない。要件「1つの引き合いに対して作成できる案件は1件のみ」は `createDeal.ts` の `findByInquiryId` チェック（アプリケーション層）のみで保証されている。並行リクエスト時に両リクエストが同時に重複チェック（トランザクション外）を通過し、2件の案件を同一 `inquiryId` で作成できる（TOCTOU）。DBレベルの安全網がないため、不変条件が破壊される。 | `schema.ts` の `deals` テーブル定義に `uniqueIndex("deals_inquiry_id_unique", [deals.inquiryId])` を追加し、対応するマイグレーションを生成する。あわせて `createDeal.ts` の `findByInquiryId` チェックをトランザクション内に移動するか、DB が返す unique 違反エラーを適切なユーザーメッセージに変換する。 |
| 2 | HIGH | 承認ワークフロー不変条件 — 楽観ロック失敗時の孤立レコード | `src/application/usecases/updateDealPhase.ts:54-124` | `internal_approval` 遷移の `db.transaction` 内で `requestRepository.create` / `approvalStepRepository.createMany` を実行した後、`dealRepository.updatePhase` が楽観ロック失敗（バージョン不一致）で `null` を返す場合、トランザクション内で例外がスローされないためトランザクションはコミットされる。結果として承認リクエスト・承認ステップ・監査ログが DBに書き込まれるが `deals.estimateRequestId` は更新されず孤立レコードが生じる。案件は旧フェーズのまま、実行不能な承認リクエストが残存する。 | `dealRepository.updatePhase` の戻り値が `null` の場合にトランザクション内で例外をスローする: `if (!updated) { throw new Error("楽観ロック失敗: 案件が他のユーザーによって更新されました"); }` — これによりトランザクション全体がロールバックされ、孤立レコードが生成されない。呼び出し元の `catch` ブロックで `{ ok: false, reason: "この案件は他のユーザーによって更新されました" }` に変換する。 |
| 3 | MEDIUM | テナント分離 — 担当者帰属未検証 | `src/application/usecases/createDeal.ts` / `src/application/usecases/updateDeal.ts` | `assigneeId` / `technicalLeadId` に渡されたユーザー UUID が `session.user.organizationId` と同一組織に属するかを検証していない。管理者が他組織のユーザー UUID を指定した場合、案件の担当者として登録され、詳細ページで他組織ユーザー情報が参照される可能性がある。※ spec-review-result-001 でも同旨の指摘あり。 | `createDeal` / `updateDeal` 内で `assigneeId` / `technicalLeadId` が指定された場合に `userRepository.findById(id, organizationId)` で組織帰属を確認し、不一致なら `{ ok: false, reason: "指定された担当者が見つかりません" }` を返す。または design.md の Risks に意図的妥協として記録する。 |
| 4 | LOW | 監査ログ完全性 — updateDeal のメタデータ欠如 | `src/application/usecases/updateDeal.ts:45-54` | `updateDeal` の `auditLogRepository.create` 呼び出しに `metadata` フィールドがなく、何が更新されたか（変更前後の値）が記録されない。`deal.updatePhase` には `fromPhase` / `toPhase` が記録されているのに対し `deal.update` は操作の証跡のみで内容が追跡不可能。 | `auditLogRepository.create` の `metadata` に変更フィールド名と更新後の値（または変更前後の差分）を含める。例: `metadata: { updatedFields: Object.keys(updatePayload) }`。監査ログの粒度ポリシーが定まっていない場合は design.md に記載して意図的判断とする。 |

## 確認済み不変条件（問題なし）

- **テナント分離**: `dealRepository` の全6関数（`create`, `findById`, `findAllByOrganization`, `findByInquiryId`, `update`, `updatePhase`）が `organizationId` 条件を持つ。`approvalTemplateRepository.findById` も `organizationId` で絞り込む。Server Action は `session.user.organizationId` を使用する。テナント分離テストが `projectStructure.test.ts` に追加されている。
- **フェーズ遷移ルール**: `VALID_TRANSITIONS` マップが要件通り（`proposal_prep→proposed|lost`, `proposed→negotiation|lost`, `negotiation→internal_approval|lost`, `internal_approval→won|lost`）。終端状態（`won`, `lost`）はマップに含まれず常に `false`。全フェーズから `lost` への遷移を許可。遷移テストが網羅的。
- **ロールチェック**: `createDealAction` / `updateDealPhaseAction` は admin/manager のみ許可。`updateDealAction` は全ロール（要件通り）。
- **承認リクエスト作成パターン**: `internal_approval` 遷移時に `templateId` 未指定ガード、テンプレートのテナント検証、フォームデータとして `estimatedAmount` を渡す、タイトル `"見積承認: ${deal.title}"` — いずれも要件通り実装。
- **`estimateRequestId` の onDelete**: `ON DELETE set null` が正しく設定されており、承認リクエスト削除時に案件レコードが保持される。
- **楽観ロック正常系**: `updatePhase` が `version = sql\`version + 1\`` でインクリメントし、WHERE 条件に `eq(deals.version, currentVersion)` を含む。
- **監査ログ**: `createDeal` / `updateDealPhase`（両パス）/ `updateDeal` の全ユースケースで記録。`internal_approval` 遷移時は `deal.updatePhase` と `request.create` の2件を記録。
- **1:1重複チェック（アプリ層）**: `createDeal` で `inquiry.status === "converted"` チェックと `findByInquiryId` 重複チェックが両方実装されている。
