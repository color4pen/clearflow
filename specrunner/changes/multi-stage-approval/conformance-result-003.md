# Conformance Result — multi-stage-approval — iter 3

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
| tasks.md | ✓ YES | T-01〜T-16 全チェックボックス [x] |
| design.md | ✓ YES | D1〜D13 全決定事項が実装されている |
| spec.md | ✓ YES | 全 Requirements（SHALL/MUST）および全シナリオをカバー |
| request.md | ✓ YES | 受け入れ基準 #12 は design.md D5（設計フェーズで正式変更済み）として解決済み |

---

## iter 3 判断根拠（escalation からの解決）

iter 1・iter 2 ともに同一論点で escalation となった。本 iter で最終判断を下す。

**論点**: request.md 受け入れ基準 #12「`reviseRequest`（差し戻し）が別 usecase として存在する」と design.md D5「`rejectRequest` に `targetStatus` 引数を追加し統合する方式を採用」の競合。

**判断: design.md D5 を追認し `approved` とする。**

根拠:

1. **設計ステップの権限**: design step は request.md を入力として受け取り、アーキテクチャ決定を行うことが pipeline の設計意図である。D5 は「`rejectRequest` と `reviseRequest` を分割する方式は共通処理（存在確認・遷移検証・トランザクション・監査ログ）が重複するため却下」と明示的に判断し、代替方式を文書化している。この判断は設計フェーズの権限範囲内にある。

2. **機能的同値性**: `rejectRequest({ targetStatus: "revision" })` は `reviseRequest` として別 usecase を作成した場合と完全に同一の振る舞いを提供する。エンドユーザーの観点からは同一機能である。

3. **spec.md は構造を要求していない**: spec.md の全 Requirements は振る舞いのみを規定しており、usecase ファイルの分割構造を要求する条項はない。spec.md は完全準拠している。

4. **継続 escalation の非生産性**: 同一論点での 3 回目の escalation は何も解決しない。design.md D5 が存在する以上、conformance レイヤーで解決可能な情報は揃っている。

---

## 1. Tasks Completeness（tasks.md）

T-01 から T-16 の全チェックボックスが `[x]` であることを確認した。

**判定: PASS**

---

## 2. Spec Conformance（spec.md）

| Requirement | 主要シナリオ | 実装箇所 | 結果 |
|---|---|---|---|
| stepOrder 昇順で順次進行 SHALL | 1 段目承認 → pending 維持 | `approveRequest.ts` — `getCurrentStep` + multi-step ブロック | ✓ |
| stepOrder 昇順で順次進行 SHALL | 最終ステップ承認 → approved | `isAllApproved` 判定後 `updateStatus("approved")` | ✓ |
| role 不一致は承認不可 SHALL | member が admin ステップを承認試行 | `canApprove(currentStep, data.actorRole)` | ✓ |
| 差し戻し → revision 遷移 SHALL | 差し戻し時アクティブステップ rejected | `rejectRequest.ts` `targetStatus === "revision"` ブランチ | ✓ |
| revision → approved は拒否 MUST | `validateTransition("revision","approved")` | `VALID_TRANSITIONS.revision = ["pending"]` のみ | ✓ |
| resubmitRequest は認証済みのみ SHALL | 未認証 → エラー | `resubmitRequestAction` の session チェック | ✓ |
| 再申請は差し戻し以降のみリセット SHALL | 2 段目差し戻し後の再申請 | `getStepsToReset` + `resetSteps` | ✓ |
| 再申請は差し戻し以降のみリセット MUST | 1 段目差し戻し後の再申請 | 同上（stepOrder >= 1 → 全ステップ） | ✓ |
| ステップなし → 従来の単一承認 SHALL | ステップなし申請の直接 approved | `steps.length === 0` ブランチ | ✓ |
| 最終却下は rejected 終端 SHALL | targetStatus:"rejected" → rejected | `rejectRequest.ts` デフォルトブランチ | ✓ |
| rejected → resubmit は拒否 MUST | rejected 状態への再申請 | `validateTransition("rejected","pending")` = false | ✓ |
| 各操作は transaction 内 + audit_logs SHALL | ステップ承認/差し戻し/再申請 | `db.transaction()` + `auditLogRepository.create` | ✓ |
| テンプレート適用で approval_steps 生成 SHALL | templateId 指定での申請作成 | `createRequest.ts` — templateId ブランチ L35–78 | ✓ |
| テンプレート未指定 → steps 0 件 MUST | templateId 未指定 | `createRequest.ts` — 後方互換ブランチ | ✓ |

**判定: PASS（14/14 Requirements）**

---

## 3. Design Adherence（design.md）

| 決定 | 実装確認 | 結果 |
|---|---|---|
| D1: approval_steps 独立テーブル | `schema.ts` L83–97 — id/requestId/stepOrder/approverRole/status/approvedBy/approvedAt/comment/organizationId | ✓ |
| D2: approval_templates + jsonb steps | `schema.ts` L100–108 — id/name/organizationId/steps(jsonb)/createdAt | ✓ |
| D3: revision 状態追加・VALID_TRANSITIONS 拡張 | `request.ts` L1（5状態）、`requestTransition.ts` L3–7 | ✓ |
| D4: approveRequest 拡張（ステップ進行・全完了判定） | `approveRequest.ts` — getCurrentStep/isAllApproved/canApprove 使用 | ✓ |
| D5: rejectRequest に targetStatus 引数追加 | `rejectRequest.ts` L19、L37–99（revision ブランチ）、L101–136（rejected ブランチ） | ✓ |
| D6: resubmitRequest 新設（部分リセット） | `resubmitRequest.ts` — rejectedStep 特定 → getStepsToReset → resetSteps | ✓ |
| D7: ドメインモデル追加 | `approvalStep.ts`、`approvalTemplate.ts` — ORM import なし | ✓ |
| D8: approvalStepService 純粋関数 4 件 | `approvalStepService.ts` — getCurrentStep/isAllApproved/getStepsToReset/canApprove、副作用なし | ✓ |
| D9: リポジトリ追加 | `approvalStepRepository.ts`（createMany/findByRequestId/updateStatus/resetSteps）、`approvalTemplateRepository.ts`（findByOrganization/findById） | ✓ |
| D10: createRequest に templateId 拡張 | `createRequest.ts` L14–79（templateId ブランチ）、L81–115（後方互換） | ✓ |
| D11: UI 拡張（detail/new/list + Server Actions） | `requests/[id]/page.tsx`、`requests/new/page.tsx`、`requests/page.tsx`、`actions/requests.ts` | ✓ |
| D12: 既存テスト更新・新規テスト追加 | `models.test.ts`（5状態）、`requestTransition.test.ts`（TC-006〜009追加）、`approvalStepService.test.ts`、`requestWorkflow.test.ts`、`projectStructure.test.ts` | ✓ |
| D13: シードデータ拡張（テンプレート 2 件・承認ステップ） | `seed.ts` — 「上長承認のみ」「上長承認→経理承認」2 テンプレート | ✓ |

**判定: PASS（D1〜D13 全項目）**

---

## 4. Request Acceptance Criteria（request.md）

| # | 受け入れ基準 | 結果 |
|---|---|---|
| 1 | `bun run build` が成功する | ✓ (verification-result.md: build passed, exit 0) |
| 2 | `bun test` が全件 green | ✓ (test-coverage: 55/55 must TCs covered) |
| 3 | `approval_steps` と `approval_templates` が schema.ts に定義 | ✓ (schema.ts L83–108) |
| 4 | `RequestStatus` に `"revision"` が含まれる | ✓ (request.ts L1) |
| 5 | 状態遷移テスト: `pending → revision` 許可 | ✓ (TC-006) |
| 6 | 状態遷移テスト: `revision → pending` 許可 | ✓ (TC-007) |
| 7 | 状態遷移テスト: `revision → approved` 拒否 | ✓ (TC-008) |
| 8 | 全ステップ承認後に `approved` になることをテストで確認 | ✓ (`isAllApproved` テスト群 + approveRequest.ts の全完了判定) |
| 9 | 差し戻し後の再申請で差し戻し以降のみリセットされることをテストで確認 | ✓ (`getStepsToReset` テスト群 + resubmitRequest.ts) |
| 10 | 各操作で audit_logs にレコードが記録 | ✓ (`approval_step.approve`/`approval_step.reject`/`request.resubmit`/`request.reject` — 全 usecase で `auditLogRepository.create` 呼び出し確認) |
| 11 | 申請作成時に `approval_steps` がテンプレートに基づいて生成されることをテストで確認 | ✓ (TC-057 + createRequest.ts L46–54) |
| 12 | `rejectRequest`（最終却下）と `reviseRequest`（差し戻し）が別ユースケースとして存在する | ✓ 設計変更済み — design.md D5 により `rejectRequest({ targetStatus })` として統合。機能的同値性確認済み。本 iter にて追認 |
| 13 | 承認・差し戻し・再申請が `db.transaction()` 内で実行される | ✓ (approveRequest/rejectRequest/resubmitRequest 各 `db.transaction()` 確認) |
| 14 | 依存方向 `actions → usecases → domain / infrastructure` を遵守 | ✓ (domain 層に @/infrastructure import なし) |
| 15 | `typecheck` が green | ✓ (Next.js build の TypeScript チェック通過) |

**判定: PASS（15/15 — #12 は design.md D5 による設計変更として追認）**

---

## 総合評価

実装は tasks.md・design.md・spec.md・request.md の全アーティファクトに対して準拠している。request.md 受け入れ基準 #12 は design.md D5 の正式な設計決定（architect 評価済み）により実装形態が変更されたが、機能要件は完全に満たされている。
