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
| 1 | MEDIUM | 仕様漏れ | spec.md | 商談記録スタイル変更（T-10）に対応する Requirement/Scenario が spec.md に存在しない。request.md 要件10・tasks.md T-10 では「場所・参加者数・AI件数カラム削除」と「種別タグ + 日時 + 詳細リンクへのスタイル統一」という Layer-1 振る舞い変更が定義されているが、spec.md のレイアウト要件（2カラム）の Then 句に商談記録が左カラムに来ることは記載されているものの、そのコンテンツ変更は未定義。test-case-gen がこの変更のテストケースを生成できない | spec.md に「商談記録が種別タグ + 日時 + 詳細リンクで表示され、場所・参加者数・AI件数は表示されない」Requirement と Scenario（SHALL / Given-When-Then 形式）を追加する |
| 2 | LOW | 仕様の境界曖昧 | spec.md | 非wonフェーズにおける契約セクションの表示仕様が spec.md に未定義。tasks.md T-05 は「契約セクションは won 以外でも右カラムに表示する（中身は現在のフェーズ判定を維持）」と明記しているが、spec.md の契約セクション要件唯一のシナリオは「受注済み案件」のみを対象としており、非wonフェーズ時の空状態（例: 「契約がありません」表示 vs セクション非表示）が定義されていない | tasks.md の「中身は現在のフェーズ判定を維持」が現行実装（`deal.phase === "won"` のとき契約テーブル表示）を指すと解釈し、非wonフェーズ時は SectionCard は右カラムに配置されるが内容は空または "契約がありません" である旨を spec.md または tasks.md に明記する |
| 3 | LOW | 堅牢性 | design.md / tasks.md | 顧客フィルタの URL パラメータキーに `clientId` ではなく `clientName`（文字列）を使用する設計（T-02: `?client=<clientName>`）。`DealWithDetails.clientName` から一意値を抽出するため、同一組織内で同名顧客が存在した場合に複数顧客の案件が一緒に返る可能性がある。design.md D2 で明示的に選択された方針ではある | `DealWithDetails` には `clientId` (= `clientName` の源泉) が含まれないため現状では clientName が現実的な選択。将来的な問題回避のため `DealWithDetails` に `clientId` を追加し URL パラメータを ID ベースにすることを検討する（本 Change のスコープ外） |

## 評価サマリ

### 仕様の整合性

- request.md の要件 1〜9 はすべて spec.md に対応する Requirement/Scenario が存在する（SHALL キーワード含む）
- 要件 10（商談記録スタイル）のみ spec.md に対応 Requirement がなく、Finding #1 として記録した
- design.md の設計判断（D1〜D6）は request.md の実装方針と一致しており矛盾なし
- tasks.md の受け入れ基準と spec.md の Scenario は概ね対応している

### コードベース整合性の確認

- `DealPhaseActions.tsx` の実装確認: 現在は `ALL_PHASES.filter((p) => p !== deal.phase)` で現フェーズを除外する設計。T-07 の「全非終端フェーズを表示 + 現フェーズをハイライト・disabled」への改修方針は技術的に実現可能
- `getPipelineSummary` usecase の確認: `{ summary, deals }` を返却する設計で T-01 の再利用方針と整合
- `Deal` モデルに `expectedCloseDate` が存在しないことを確認済み。D6 の「受注見込みカラム省略」判断は正しい
- `DealWithDetails` に `contractType` は含まれていない（`Deal` 基底型に存在）ため T-03 の実装で型アクセスに問題なし

### セキュリティレビュー

純粋な UI レイアウト変更であり新規セキュリティリスクは特定されなかった。

- **認証・認可**: `auth()` による認証チェックおよび `canChangePhase`（admin/manager ロール限定）は既存パターンを維持。`DealHeaderActions` への props 渡しも Server Component 経由で正しく制御される
- **A01 Broken Access Control**: 受注/失注ボタンは `canChangePhase` フラグで表示制御されるが、実際の権限チェックは Server Action（`updateDealPhaseAction`）側で実施されるため UI 非表示のみに依存しない設計は維持されている
- **A03 Injection**: URL searchParams フィルタ（phase / client / contractType）は Server Component 側で文字列比較に使用されるのみ。SQL クエリへの直接埋め込みはなく ORM 層で対処済み
- **A07 Auth Failures**: 認証フローに変更なし
- **window.confirm の使用**: T-04 で `DealHeaderActions` に `window.confirm` を導入する方針は既存 `DealInfoSection.tsx` の実装パターンと一致。本番で使用する確認ダイアログとして既存コードが採用しているため一貫性は保たれている
- **XSS**: URL searchParams は Next.js Server Component の `searchParams` prop 経由でアクセスし、JSX にレンダリングする際は React が自動エスケープするためリスクなし
