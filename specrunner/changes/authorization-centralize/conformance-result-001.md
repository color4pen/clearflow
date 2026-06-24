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
| tasks.md | ✅ Yes | 全 13 タスクのチェックボックスが [x] で完了。T-01〜T-13 の各 Acceptance Criteria を実装が満たしている |
| design.md | ✅ Yes | D1〜D7 の全設計判断が実装に反映されている。delegations.ts に残る `session.user.role !== "admin"` 比較は D4 が明示する「自身のみ」オーナーシップ制約のアクション層実装であり、canPerform 置換対象外として意図的 |
| spec.md | ✅ Yes | 全 Requirements (SHALL/MUST) とすべての Scenario が実装で充足されている |
| request.md | ✅ Yes | 受け入れ基準 12 項目すべて充足。`typecheck && test` は 596 pass / 0 fail で green |

## Judgment Details

### 1. tasks.md — タスク完了状況

- 全 13 タスク (T-01〜T-13) のチェックボックスが `[x]` で完了済み。
- `src/domain/authorization.ts` が新設され、全 9 ドメインの権限マトリクスをオブジェクトリテラルで定義 (T-01)。
- `src/__tests__/domain/authorization.test.ts` が全 9 ドメイン × 全ロール × 全操作を網羅的にテスト (T-02)。
- contracts / invoices / deals / inquiries / clients / delegations / templates / users / meetings / webhooks の全 10 アクションファイルが `canPerform` に置換済み (T-03〜T-12)。
- `roleCheck.test.ts` が静的パターンマッチからの `canPerform` 検出に更新済み (T-13)。

### 2. design.md — 設計整合性

| 設計判断 | 実装の状態 |
|---------|----------|
| D1: 宣言的権限マトリクスをドメイン層に配置 | `PERMISSION_MATRIX` をオブジェクトリテラルで定義し、`canPerform` が参照する。deny-by-default 実装済み |
| D2: 認可チェックはアクション層で呼び出す | 全アクションファイルで `canPerform` をセッション取得直後に呼び出し、usecase 層に認可ロジックなし |
| D3: 認可失敗時メッセージの統一 | 全アクションで `"この操作を実行する権限がありません"` を使用 |
| D4: 委任の「自身のみ」制約をアクション層で検証 | `createDelegationAction` / `deactivateDelegationAction` に `fromUserId === session.user.id` チェックを実装。`delegations.ts` 残存の `session.user.role !== "admin"` 比較はオーナーシップ判定であり意図的 |
| D5: 案件フェーズ変更を `changePhase` / `closePhase` に分離 | `updateDealPhaseAction` と `updateDealAction` 双方でフェーズ値により操作名を分岐 |
| D6: 引合 `declined` への遷移に認可チェックを追加 | `updateInquiryStatusAction` で `declined` 遷移に `canPerform(..., "decline")` を追加 |
| D7: 商談記録の作成に認可チェックを追加 | `createMeetingAction` に `canPerform(..., "meeting", "create")` を追加 |

### 3. spec.md — 仕様適合性

主要 Requirements ごとの検証結果:

- **canPerform 権限マトリクス判定**: 全 9 ドメインの操作が正確に実装。`deny-by-default` で未定義操作は `false` 返却。✅
- **finance ロールで契約操作**: `ADMIN_MANAGER_FINANCE` で `create/edit/changeStatus` を定義。✅
- **請求を admin + finance のみ**: `ADMIN_FINANCE` で `create/edit/changeStatus` を定義。manager は `false` 返却。✅
- **member が案件編集・通常フェーズ変更可**: `edit/changePhase` は `ADMIN_MANAGER_MEMBER`。`closePhase` は `ADMIN_MANAGER`。✅
- **member が引合編集可**: `edit` は `ADMIN_MANAGER_MEMBER`。`convert/decline` は `ADMIN_MANAGER`。✅
- **削除が admin のみ**: inquiry/deal/contract の `delete` が `ADMIN_ONLY`。✅
- **委任操作が admin/manager/finance**: `createDelegation/deactivateDelegation` が `ADMIN_MANAGER_FINANCE`。自身のみ制約をアクション層で実装。✅
- **listTemplates / listUsers が manager に開放**: `ADMIN_MANAGER` で定義。✅
- **updateDealAction でのフェーズ権限追加検証**: `phase` フィールド有無を確認し `closePhase/changePhase` を追加チェック。✅
- **declined 遷移に認可追加**: `updateInquiryStatusAction` で `declined` ケースに権限チェックを新規追加。✅
- **商談記録の作成が member に許可**: `ADMIN_MANAGER_MEMBER` で定義。`createMeetingAction` に追加。✅

### 4. request.md — 受け入れ基準

| 受け入れ基準 | 充足 |
|------------|------|
| `src/domain/authorization.ts` に認可ポリシーが定義されている | ✅ |
| 全アクションファイルのインライン認可チェックが `canPerform` 呼び出しに置換されている | ✅ |
| finance ロールで契約の作成・編集・ステータス変更ができる | ✅ |
| finance ロールで請求の作成・編集・発行・入金確認ができる | ✅ |
| manager ロールで請求操作ができない | ✅ |
| member ロールで案件の編集・フェーズ変更（非終端）ができる | ✅ |
| member ロールで引合の編集ができる | ✅ |
| member ロールで案件の受注・失注ができない | ✅ |
| admin 以外のロールで削除操作ができない | ✅ |
| manager / finance ロールで自身の委任を作成できる | ✅ |
| manager ロールでテンプレート一覧・ユーザー一覧を閲覧できる | ✅ |
| `typecheck && test` が green | ✅ (596 pass / 0 fail) |

## Scope Note

- `src/app/actions/delegations.ts` に残存する `session.user.role !== "admin"` 比較は、tasks T-08 / design D4 が明示する「自身のみ」オーナーシップ制約の実装であり、`canPerform` 置換の対象ではない。不適合ではない。
- lint は 10 warnings / 0 errors。警告はすべて本変更と無関係の既存コードに起因し、conformance に影響しない。
