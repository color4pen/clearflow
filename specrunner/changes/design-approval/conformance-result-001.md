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
| tasks.md | ✅ yes | T-01〜T-09 全チェックボックスが `[x]` で完了 |
| design.md | ✅ yes | D1〜D7 全設計判断を実装が準拠している（詳細は下記）|
| spec.md | ✅ yes | 全 Requirements (SHALL) と全シナリオを実装が充足している |
| request.md | ✅ yes | 全 7 件の受け入れ基準を充足。`typecheck && test` green 確認済み |

---

## 詳細: tasks.md チェックボックス確認

tasks.md の T-01〜T-09 全タスク・全チェックボックスが `[x]` で完了している。

| タスク | 状態 |
|--------|------|
| T-01: getInquiry ユースケース作成 | ✅ |
| T-02: RequestTabs コンポーネント作成 | ✅ |
| T-03: 一覧ページ タブフィルタリング・認可制御 | ✅ |
| T-04: 一覧テーブル 5 カラム化 | ✅ |
| T-05: ApprovalStepper コンポーネント作成 | ✅ |
| T-06: SystemOriginBanner コンポーネント作成 | ✅ |
| T-07: ActionButtons 承認者限定化 | ✅ |
| T-08: 詳細ページ再構成 | ✅ |
| T-09: 最終検証（build/typecheck/test）| ✅ |

---

## 詳細: design.md 設計判断（D1〜D7）準拠確認

| # | 設計判断 | 判定 | 根拠 |
|---|----------|------|------|
| D1 | タブ切替は URL searchParams で制御し Server Component でフィルタリング | ✅ | `requests/page.tsx` で `searchParams` を受け取り `effectiveTab` を算出してサーバーサイドでフィルタ済みデータを渡している |
| D2 | タブ認可はサイレントフォールバック方式 | ✅ | `rawTab === "all"` かつ非 admin/manager の場合 `defaultTab` にフォールバックし 403 を返さない |
| D3 | 「要対応」タブは `approvalSteps[].approverRole` で判定 | ✅ | `r.approvalSteps.some(s => s.status === "pending" && s.approverRole === role)` で role ベースフィルタを実装。`approvalSteps` 空のレガシー申請は通過させる |
| D4 | DataTable → 縦ステッパー UI へ変更 | ✅ | `ApprovalStepper.tsx` を新規作成し `stepOrder` 昇順で縦並び、縦線コネクタ、状態アイコン（承認済み=緑✓、却下=赤✕、現在=青ボーダー、待機=グレー）を実装 |
| D5 | システム連動バナーのエンティティ取得はユースケース経由 | ✅ | `SystemOriginBanner.tsx` が `getInquiry`・`getContract`（`@/application/usecases` 経由）を使用し repository を直接参照していない |
| D6 | `isCurrentApprover` は `canApproveWithDelegation` で Server Component が判定 | ✅ | `[id]/page.tsx` が `getActiveDelegationsForUser` で委任データを取得し `canApproveWithDelegation(currentStep, role, delegations).allowed` から `isCurrentApprover` を算出して `ActionButtons` に渡している |
| D7 | 承認コメントは UI のみ実装、approve への送信保留 | ✅ | `ActionButtons.tsx` で `comment` を controlled state で管理し承認フォームには hidden input で値を含めるが `approveRequestAction` は使用しない。却下フォームは `rejectAction` に comment を送信 |

---

## 詳細: spec.md Requirements・シナリオ準拠確認

### Requirement: 一覧ページにタブ切替を提供する

| シナリオ | 判定 | 根拠 |
|----------|------|------|
| デフォルトタブがロールに応じて決定される | ✅ | `defaultTab = role === "member" ? "my-requests" : "action-required"` |
| 「すべて」タブが admin/manager のみに表示される | ✅ | `showAllTab = role === "admin" \|\| role === "manager"` で条件分岐 |
| 認可されていないタブへの URL 直打ちがフォールバックする | ✅ | `rawTab === "all"` かつ非 admin/manager → `defaultTab` へフォールバック |

### Requirement: 「要対応」タブはユーザーの role に一致する pending ステップを持つリクエストを表示する

| シナリオ | 判定 | 根拠 |
|----------|------|------|
| 自分の role が承認者の pending リクエストが表示される | ✅ | `approvalSteps.some(s => s.status === "pending" && s.approverRole === role)` |
| 承認済みリクエストは「要対応」タブに表示されない | ✅ | `r.status !== "pending"` のものはフィルタで除外される |

### Requirement: 「自分の申請」タブは自分が作成したリクエストを表示する

| シナリオ | 判定 | 根拠 |
|----------|------|------|
| 自分が作成したリクエストのみ表示される | ✅ | `requests.filter(r => r.creatorId === userId)` |

### Requirement: 一覧テーブルが 5 カラムで表示される

| シナリオ | 判定 | 根拠 |
|----------|------|------|
| 5 カラムのヘッダーが表示される | ✅ | `BulkApprovalPanel.tsx` のヘッダー: 件名・申請者・ステータス・種別・申請日 |
| 手動/自動ラベルが originType に応じて表示される | ✅ | `OriginTypeLabel` コンポーネントで `"system"` → 「自動」 |
| 手動ラベルが表示される | ✅ | `OriginTypeLabel` で `"system"` 以外 → 「手動」 |

### Requirement: 詳細ページにステータスバッジ付きヘッダーを表示する

| シナリオ | 判定 | 根拠 |
|----------|------|------|
| ヘッダーにステータスバッジが表示される | ✅ | `[id]/page.tsx` で `statusBadgeClass` + `statusLabel` を使い `rounded-full px-2 py-0.5 text-xs border` スタイルのバッジを件名横に表示 |

### Requirement: system origin のリクエストにシステム連動バナーを表示する

| シナリオ | 判定 | 根拠 |
|----------|------|------|
| inquiry.convert のシステム連動バナーが表示される | ✅ | `getInquiry` で引合取得 → 「この承認は引合「{title}」の案件化に必要です」+ `/inquiries/{id}` リンクを表示 |
| manual origin ではバナーが表示されない | ✅ | `originType !== "system"` → `null` を返す |
| エンティティが取得できない場合はバナーを非表示 | ✅ | `!inquiry → return null`、かつ try-catch でエラー時も `null` を返す |

### Requirement: 承認ステップを縦ステッパー UI で表示する

| シナリオ | 判定 | 根拠 |
|----------|------|------|
| 各ステップの状態アイコンが正しく表示される | ✅ | `StepIcon` コンポーネントで approved=緑✓、rejected=赤✕、current pending=青ボーダー、その他=グレー丸 |
| 現在のステップがハイライトされる | ✅ | `isCurrent` 時に `bg-blue-50 border border-blue-200` クラスを適用 |
| 却下されたステップが区別して表示される | ✅ | `rejected` ステータスで赤背景の✕アイコンを表示 |
| ステップのコメントと日時が表示される | ✅ | `step.comment` と `step.approvedAt` を条件付きで表示 |

### Requirement: 承認/却下ボタンは該当ステップの承認者にのみ表示する

| シナリオ | 判定 | 根拠 |
|----------|------|------|
| 承認者に操作ボタンが表示される | ✅ | `requestStatus === "pending" && isCurrentApprover` の分岐で「承認する」「却下する」ボタンを表示 |
| 承認者でないユーザーには操作ボタンが表示されない | ✅ | `isCurrentApprover === false` の場合 pending 分岐に入らないため非表示 |
| 承認/却下操作にコメントフィールドが表示される | ✅ | `FormField label="コメント（任意）"` + `Textarea` が承認操作セクション内に配置 |

### Requirement: エンティティ取得はユースケース経由で行う

| シナリオ | 判定 | 根拠 |
|----------|------|------|
| システム連動バナーの引合名取得が usecase 経由で行われる | ✅ | `SystemOriginBanner.tsx` は `getInquiry`（`@/application/usecases`）を使用し `inquiryRepository` を直接参照していない |

---

## 詳細: request.md 受け入れ基準確認

| 基準 | 判定 |
|------|------|
| 一覧にタブ切替（要対応/自分の申請/すべて）がある | ✅ |
| テーブルが 5 カラムで手動/自動ラベルが表示される | ✅ |
| 詳細にステータスバッジ付きヘッダーがある | ✅ |
| system origin の場合にシステム連動バナーが表示される | ✅ |
| ステップ進捗が縦ステッパー UI で表示される | ✅ |
| 承認/却下ボタンが該当承認者にのみ表示される | ✅ |
| `typecheck && test` が green | ✅（build/typecheck/test/lint すべて exit 0、929 tests pass / 0 fail）|

---

## 検証結果サマリー

verification-result.md（iter 1）より:

| Phase | Status |
|-------|--------|
| build | passed (exit 0) |
| typecheck | passed (exit 0) |
| test | passed (929 pass / 0 fail) |
| lint | 警告 10 件、エラー 0 件 |

コードレビュー（review-feedback-002.md）判定: **approved**

残存する `low` 指摘 2 件（未使用インポート `statusClass`、`<col>` 要素への `1.9fr` 無効値）はいずれも機能影響なく、ブロッカーではない。
