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
| 1 | MEDIUM | Security | `tasks.md` T-06 / T-07 | `passed` を Zod enum（T-07）と `isTerminalPhase` 判定（T-06）の両方に追加するタスクが独立しており、実装順序の制約が明示されていない。仮に T-07（enum 拡張）を先に適用し T-06（isTerminalPhase 更新）を後回しにすると、member ロールが `passed` を closePhase 権限なしに設定できるウィンドウが生じる。T-15 の権限テストで事後検出はできるが、PR レビュー前の一時的なバイパスリスクがある。 | tasks.md に「T-06 と T-07 は必ず同一 commit または連続 commit で実装する（Zod enum 拡張と isTerminalPhase 更新を分離しない）」という実装順序注記を追加する。 |
| 2 | MEDIUM | Completeness | `tasks.md` T-12 | `passed` 遷移の ConfirmDialog `message` 文言が未定義。T-12 は `variant`（default/primary）と `title`（"フェーズ変更: 見送り"）を指定するが、`message` props が不明。既存 won/lost のメッセージは「フェーズを「受注」に変更しますか？確定後はフェーズを戻せません。」の形式であり、`passed` でも同形式にするか別文言にするかが揺れる。 | T-12 に `message` の文言例を追記する（例: `「見送り」に変更しますか？確定後はフェーズを戻せません。`）。 |
| 3 | MEDIUM | Completeness | `tasks.md` T-15 | `updateDealPhase` で `passed` 遷移時に `deal.passed` イベントが発火することを検証するテストについて、「新規または既存テスト」とのみ記載され、配置先ファイルが不明。`src/__tests__/domain/domainEvents.test.ts` に相当コードはあるが、usecase 層のテストファイル（`updateDealPhase.test.ts`）は現時点で存在しない。 | T-15 に「`src/__tests__/usecases/updateDealPhase.test.ts` を新規作成して検証する」と明示するか、既存テストファイル（`domainEvents.test.ts` 等）への追加先を指定する。 |
| 4 | LOW | Completeness | `spec.md` | Spec シナリオに `hearing → proposal_prep`（PIPELINE 内前進遷移）の明示的な Given/When/Then がない。T-03 では `canTransition("hearing", "proposal_prep")` が true を返すと受け入れ基準に明記されているが、spec.md のシナリオには対応する記述がない。 | spec.md の "passed SHALL be a terminal phase" セクションに `hearing → proposal_prep が許可されること` シナリオを追加するか、T-03 の受け入れ基準で担保されていることを spec.md に注記する。 |
| 5 | LOW | Clarity | `tasks.md` T-12 | ConfirmDialog の `variant` が `"default (または primary)"` と代替形式で記述されており、実装者の判断に委ねられている。`"default"` は ConfirmDialog コンポーネントの有効な variant 値かどうかが spec.md から確認できない。 | T-12 で `variant` を一意に決定する（例: `variant="default"` または `variant="primary"`）。ConfirmDialog コンポーネントの受理する variant 値を参照して確定させる。 |
| 6 | LOW | Maintainability | `src/infrastructure/repositories/revenueRepository.ts` | `getPipelineSummary` 関数の JSDoc コメント（L149-150）が「対象フェーズ: proposal_prep, proposed, negotiation (won, lost を除外)」とハードコードされており、`hearing` 追加後に陳腐化する。T-08 のタスク本文には記述されていない。 | T-08 に「`getPipelineSummary` のコメントを `hearing, proposal_prep, proposed, negotiation（非終端・能動フェーズのみ）` に更新する」を追加する。 |

## レビュー所見（非 blocking）

### 仕様整合性の確認

**設計決定（D1–D7）とタスク・spec のマッピング**

| 設計決定 | 対応タスク | spec.md シナリオ | 整合性 |
|---------|-----------|----------------|-------|
| D1: 型再作成パターン | T-02 | — (インフラ実装詳細) | ✅ 前例 0018 と整合 |
| D2: column default=hearing | T-01, T-02 | "直接作成の案件が hearing 起点" | ✅ dealRepository.create が phase を指定しない実装と整合 |
| D3: deal.passed 独立イベント | T-04, T-05 | "deal.passed イベントが発火する" | ✅ won/lost との対称性が保たれている |
| D4: 停滞フィルタ | T-09 | "passed が停滞リストに含まれない" | ✅ dashboard/page.tsx の既存フィルタ条件と整合 |
| D5: 見送りボタン | T-12 | "見送りにするボタンが表示される" | ✅ |
| D6: activePhases に hearing | T-08 | "hearing が含まれ passed が除外" | ✅ |
| D7: grid-cols-8 | T-11 | — (レイアウト実装詳細) | ✅ 7フェーズ+合計=8列は正しい |

### セキュリティ評価（OWASP Top 10）

**A01 Broken Access Control（最重要）**

`passed` は closePhase 権限（admin/manager）を要する終端遷移である。セキュリティ境界は 2 箇所：
- `src/app/actions/deals.ts` の `updateDealPhaseAction`（L178）および `updateDealAction`（L259）の `isTerminalPhase` 判定
- `src/app/api/mcp/tools/deals.ts` の `update_phase` ケース（L248）の `isTerminalPhase` 判定

両者とも現在は `newPhase === "won" || newPhase === "lost"` であり、`passed` 追加後に更新しないと member ロールが closePhase 権限なしで passed を設定できる。T-06・T-07 がこれを明示的にカバーしており、T-15 の権限テスト（`passed` への遷移に closePhase 権限が必要なこと）で実装検証される。Finding #1 の実装順序制約を守れば問題なし。

**A03 Injection**

Drizzle ORM を使用、入力は Zod schema で検証。`inArray(deals.phase, activePhases)` は `as const` 配列からパラメータ化される。マイグレーション SQL は実装者が手書きするが、ユーザー入力を含まない。リスクなし。

**A08 Software and Data Integrity**

型再作成パターンのマイグレーションは Drizzle の `--> statement-breakpoint` を使いステートメント分割で実行される。既存値（proposal_prep 等）は新 enum にも存在するため、`USING phase::text::"deal_phase_new"` キャストで無損失移行できる。設計 D1 のリスク欄に「ロールバックには逆方向マイグレーションが必要」と記載済みであり、認識されている。

### silent-drop サイト網羅性確認

request.md に列挙された 20+ サイトのうち、主要箇所を突合確認：

| サイト | 現状 | タスク | 確認 |
|------|------|-------|------|
| `DealPhase` union | 5値 | T-01 | ✅ |
| `dealPhaseEnum` | `["proposal_prep"…"lost"]` | T-01 | ✅ |
| `deals.phase` default | `"proposal_prep"` | T-01, T-02 | ✅ |
| `dealTransition.ts` `ALL_PHASES` | 5値配列 | T-03 | ✅ |
| `dealTransition.ts` `TERMINAL_PHASES` | `["won","lost"]` | T-03 | ✅ |
| `updateDealPhase.ts` won/lost 分岐 | else→phase_changed | T-05 | ✅ |
| `events/types.ts` union | DealWon/DealLost | T-04 | ✅ |
| `webhookEvent.ts` WEBHOOK_EVENT_TYPES | deal.won, deal.lost | T-04 | ✅ |
| `webhookHandler.ts` case | deal.won / deal.lost | T-05 | ✅（never guard が強制） |
| `handlers/index.ts` allEventTypes | deal.won, deal.lost | T-05 | ✅ |
| `getPipelineSummary.ts` ALL_PHASES | 5値 | T-08 | ✅ |
| `revenueRepository.ts` activePhases | 3値 | T-08 | ✅ |
| `dashboard/page.tsx` 停滞フィルタ | won/lost 除外のみ | T-09 | ✅ |
| `actions/deals.ts` isTerminalPhase（2箇所） | won/lost のみ | T-06 | ✅ |
| `mcp/tools/deals.ts` z.enum | 5値 | T-07 | ✅ |
| `mcp/tools/deals.ts` isTerminalPhase | won/lost のみ | T-06, T-07 | ✅ |
| `labels.ts` phaseLabels | 5値 | T-10 | ✅ |
| `DealsFilter.tsx` allPhases | 5値 | T-10 | ✅ |
| `deals/page.tsx` grid-cols-6 | 6列 | T-11 | ✅ |
| `SalesDashboard.tsx` grid-cols-6 | 6列 | T-11 | ✅ |
| `DealPhaseStepper.tsx` PIPELINE/isTerminal | 3値/won-lost | T-12 | ✅ |
| `seed.ts` | 5フェーズサンプル | T-13 | ✅ |
| aozu 設計層 | 旧フェーズ記述 | T-14 | ✅ |

全 20+ サイトがタスクにマッピングされており、silent-drop 漏れは spec レベルで確認されない。

### 総合評価

設計書・仕様・タスクリストの三者が高い整合性を持ち、セキュリティ上の要点（isTerminalPhase の二重更新、enum の境界検証）も明示的にカバーされている。Finding #1（実装順序）は spec への注記追加で対処できる MEDIUM 課題であり、承認を阻止する高度なリスクではない。Finding #2-3 は実装者の迷いを減らす補足事項。
