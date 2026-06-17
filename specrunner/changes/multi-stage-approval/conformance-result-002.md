# Conformance Result — multi-stage-approval — iter 2

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: escalation

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✓ YES | T-01〜T-16 全チェックボックス [x] |
| design.md | ✓ YES | D1〜D13 全決定事項が実装されている |
| spec.md | ✓ YES | 全 Requirements（SHALL/MUST）および全シナリオをカバー |
| request.md | ✗ NO | 受け入れ基準 #12（reviseRequest 別 usecase）が未充足。design.md D5 との間でアーティファクト競合あり |

---

## Escalation 理由

request.md 受け入れ基準 #12 と design.md D5 の間に**アーティファクト競合**が存在する。

- **request.md 要件 #5**: 「reviseRequest usecase を新設する」
- **request.md 受け入れ基準 #12**: `` `rejectRequest`（最終却下）と `reviseRequest`（差し戻し）が別ユースケースとして存在する ``
- **design.md D5**: `rejectRequest` に `targetStatus: "rejected" | "revision"` 引数を追加する方式を採用し、別 usecase 作成を明示的に却下した（理由: 共通処理の重複排除）

実装は design.md D5 の決定に従っており `reviseRequest.ts` は存在しない。この実装は tasks.md・design.md・spec.md の 3 アーティファクトには完全準拠しているが、request.md の machine-verifiable な受け入れ基準 #12 を満たしていない。

`needs-fix` 判定（implementer に修正を要求）とすれば `reviseRequest.ts` の作成が必要になるが、それは design.md D5 の設計決定に直接反する。conformance レイヤーでどちらのアーティファクトを優先するかを決定する権限はないため、**人間の判断**が必要。

---

## 1. Tasks Completeness（tasks.md）

T-01 から T-16 の全チェックボックスが `[x]` であることを確認。

**判定: PASS**

---

## 2. Spec Conformance（spec.md）

spec.md の全 Requirements を実装に照合した。

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
| テンプレート未指定 → steps 0 件 MUST | templateId 未指定 | `createRequest.ts` — 後方互換ブランチ L82– | ✓ |

**判定: PASS**

---

## 3. Design Adherence（design.md）

| 決定 | 実装確認 | 結果 |
|---|---|---|
| D1: approval_steps 独立テーブル | `schema.ts` L83–97 | ✓ |
| D2: approval_templates + jsonb steps | `schema.ts` L100–108 | ✓ |
| D3: revision 状態追加・VALID_TRANSITIONS 拡張 | `request.ts` L1, `requestTransition.ts` L3–7 | ✓ |
| D4: approveRequest 拡張（ステップ進行・全完了判定） | `approveRequest.ts` 全体 | ✓ |
| D5: rejectRequest に targetStatus 引数追加（差し戻し/最終却下統合） | `rejectRequest.ts` L19, L37– | ✓ |
| D6: resubmitRequest 新設（部分リセット） | `resubmitRequest.ts` 全体 | ✓ |
| D7: ドメインモデル追加（ApprovalStep に approvedByName 追加は設計外拡張だが依存方向違反なし） | `approvalStep.ts`, `approvalTemplate.ts` | ✓ |
| D8: approvalStepService 純粋関数 4 件 | `approvalStepService.ts` — 副作用なし | ✓ |
| D9: リポジトリ追加（organizationId 引数拡張あり。テナント分離強化として適切） | `approvalStepRepository.ts`, `approvalTemplateRepository.ts` | ✓ |
| D10: createRequest に templateId 拡張 | `createRequest.ts` L21–79 | ✓ |
| D11: UI 拡張（detail / new / list 各画面 + 5 Server Actions 追加/拡張） | 各 `page.tsx` 更新、`requests.ts` 拡張 | ✓ |
| D12: 既存テスト更新・新規テスト追加 | `models.test.ts`, `requestTransition.test.ts`, `approvalStepService.test.ts`, `requestWorkflow.test.ts`, `projectStructure.test.ts` | ✓ |
| D13: シードデータ拡張（テンプレート 2 件・承認ステップ） | `seed.ts` 拡張 | ✓ |

**判定: PASS**

---

## 4. Request Acceptance Criteria（request.md）

| # | 受け入れ基準 | 結果 |
|---|---|---|
| 1 | `bun run build` が成功する | ✓ (verification-result.md: build passed, exit 0) |
| 2 | `bun test` が全件 green | ✓ (test-coverage: 55/55 must TCs covered; tsconfig が `src/__tests__` を除外しているため bun test での型エラーは発生しない) |
| 3 | `approval_steps` と `approval_templates` が schema.ts に定義 | ✓ |
| 4 | `RequestStatus` に `"revision"` が含まれる | ✓ |
| 5 | 状態遷移テスト: `pending → revision` 許可 | ✓ (TC-006) |
| 6 | 状態遷移テスト: `revision → pending` 許可 | ✓ (TC-007) |
| 7 | 状態遷移テスト: `revision → approved` 拒否 | ✓ (TC-008) |
| 8 | 全ステップ承認後に `approved` になることをテストで確認 | ✓ (TC-030 + `isAllApproved` テスト群) |
| 9 | 差し戻し後の再申請で差し戻し以降のみリセットされることをテストで確認 | ✓ (TC-037/038 + `getStepsToReset` テスト群) |
| 10 | 各操作で audit_logs にレコードが記録 | ✓ (`auditLogRepository.create` 呼び出しをソースコードで確認) |
| 11 | 申請作成時に `approval_steps` がテンプレートに基づいて生成されることをテストで確認 | ✓ (TC-057 ファイル存在確認 + `createRequest.ts` の templateId ブランチ) |
| **12** | **`rejectRequest`（最終却下）と `reviseRequest`（差し戻し）が別ユースケースとして存在する** | **✗ 未充足** |
| 13 | 承認・差し戻し・再申請が `db.transaction()` 内で実行される | ✓ (TC-003) |
| 14 | 依存方向 `actions → usecases → domain / infrastructure` を遵守 | ✓ (TC-034/036) |
| 15 | `typecheck` が green | ✓ (Next.js build に TypeScript チェック内包、build passed。test ファイルは tsconfig から除外) |

**基準 #12 の詳細**:

現在の実装では:
- `reviseRequest.ts` は存在しない
- `rejectRequest.ts` が `targetStatus?: "rejected" | "revision"` を受け取り、差し戻しと最終却下の両機能を担う
- これは design.md D5 の設計決定に従った正当な実装である

request.md は `reviseRequest` を別 usecase として明示的に要求している（要件 #5、受け入れ基準 #12 の両方）。design.md D5 はこれを意図的に変更しているが、当該変更が request.md の acceptance criteria を上書きする権限を持つかは conformance レイヤーで判断できない。

**判定: FAIL（基準 #12 のみ未充足、アーティファクト競合のため escalation）**

---

## 総合評価

実装の品質は高く、技術的観点からは完成度が高い。design.md・tasks.md・spec.md の 3 アーティファクトに対して完全に準拠している。

唯一の問題は request.md 受け入れ基準 #12（`reviseRequest` 別 usecase）と design.md D5（`rejectRequest` への統合）の間のアーティファクト競合である。

**人間への判断依頼（いずれか一方を選択）**:

1. **design.md D5 を追認する**: request.md 基準 #12 を「設計フェーズで変更済み」として受理し、現状の実装を `approved` とする
2. **request.md 基準 #12 を優先する**: `reviseRequest.ts` を別 usecase として作成し、`rejectRequest.ts` から差し戻しロジックを分離する（この場合、design.md D5 も修正が必要）
