# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | maintainability | `src/infrastructure/repositories/dealRepository.ts`, `inquiryRepository.ts`, `meetingRepository.ts` | `LINK_SEARCH_LIMIT = 20` 定数が最初の `import` 文の直後、残りの `import` 群の前に配置されている（import 間への `const` 挿入）。TypeScript 的にはエラーにならないが、全 import の後に定数を置くのが慣習であり、コードの可読性と一貫性を損なう | 各ファイルで `const LINK_SEARCH_LIMIT = 20;` を最後の `import` 文より後の行に移動する | yes |
| 2 | low | security | `src/app/actions/actionItems.ts` | `searchLinkTargetsAction` の `checkRateLimit` が `canPerform` より前に実行されている。既存の `createActionItemAction` は `canPerform` → `checkRateLimit` の順だが、本アクションでは逆順（`checkRateLimit` → `canPerform`）になっており、T-03 の「既存パターンと同じ」という仕様記述と一致しない。権限のない認証済みユーザーがレートリミット枠を消費してから拒否される（影響は自ユーザーのみ） | `canPerform` チェックを `checkRateLimit` 呼び出しの前に移動し、`createActionItemAction` と同じ順序（auth → canPerform → rateLimit → parse）にする | yes |
| 3 | low | testing | `src/__tests__/usecases/linkTargetSearch.test.ts` | TC-024 対応の検索対象フィールドテストが `meetings.summary` の出現を確認するが、`isNotNull(meetings.summary)` の存在は明示的に検証していない。実装には正しく含まれており機能的影響はないが、テストケース仕様（TC-024）との網羅性に軽微な乖離がある | `meetingRepository.ts` の `searchBySummary` 本体スライスに `"isNotNull"` の `toContain` アサーションを追加する | yes |
| 4 | low | performance | `src/app/(dashboard)/components/LinkTargetPicker.tsx` | コンポーネント初回マウント時およびタブ切り替え時に `query=""` でサーバー検索が即時発火し、`ilike '%%'` が最大 20 件を返す。結果が存在する場合は UI に表示されるため、ユーザーがキーワードを入力していない段階でリストが出る。仕様には空クエリ時の動作が明記されておらずデフォルト一覧として意図的な可能性もあるが、不要なサーバーリクエストを避けたいなら `if (!query.trim())` のガードを検討 | `setTimeout` コールバック内の先頭に `if (!query.trim()) { setResults([]); setIsSearching(false); return; }` を追加して空クエリ時の検索を抑制する（仕様確認後に対応） | no |
| 5 | low | performance | `src/app/(dashboard)/components/LinkTargetPicker.tsx` | デバウンスの `clearTimeout` はタイマーをキャンセルするが、発行済みの `searchLinkTargetsAction` フェッチはキャンセルされない。高速入力時に複数リクエストが並行した場合、後発リクエストより前発リクエストの応答が遅れると stale な結果が上書きされる可能性がある | `AbortController` またはリクエスト ID ガードパターンで in-flight リクエストをキャンセルする（リスクは低いが再利用時に注意） | no |
| 6 | low | testing | `specrunner/changes/task-link-picker-modal/test-cases.md` | TC-038 のシナリオが `type="kickoff"` を使用しているが、`MeetingType` の定義は `"hearing" \| "proposal" \| "negotiation" \| "closing" \| "followup"` であり `"kickoff"` は存在しない。自動テストへの影響はないがテストケース仕様書のバグ | TC-038 の `type` を有効な `MeetingType` 値（例: `"hearing"`）に修正する | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.55

## Summary

受け入れ基準 8 項目すべてを充足。ビルド・型検査・Lint・テスト（1079 pass / 0 fail）が全 green。

### 良い点

- **アーキテクチャ境界の遵守**: `formatDateJP` を `src/lib/dateUtils.ts`、`meetingTypeLabels` を `src/lib/meetingLabels.ts` に切り出し、`searchMeetings.ts` が `src/app/(dashboard)/` を参照しないことを静的テストで検証している。依存方向が正しく保たれている
- **テナント分離**: `searchLinkTargetsAction` は `organizationId` をセッションから取得し、リポジトリ層でも全検索メソッドが `eq(table.organizationId, organizationId)` を WHERE に含んでいる
- **単一紐づけセマンティクス**: usecase を変更せずに呼び出し元（TaskList・ActionItemRow）で FK マッピングを実装し、MeetingActionItemsSection の `meetingId+dealId` 同時保持を保護している（D1 設計判断の正確な実装）
- **LinkTargetPicker の設計**: 外部ラッパーが `open=false` でコンポーネントをアンマウントすることで state リセットを自動化している点が清潔
- **デバウンス cleanup**: `useEffect` の return で `clearTimeout` を確実に呼び、アンマウント時・クエリ変更時のタイマーキャンセルを実装している

### 要修正（fix=yes の findings）

- **F-01**: 3 ファイルの `LINK_SEARCH_LIMIT` 定数を import ブロックの後に移動（1 行ずつ移動するだけ）
- **F-02**: `searchLinkTargetsAction` で `canPerform` を `checkRateLimit` の前に移動（既存パターンへの統一）
- **F-03**: `searchBySummary` テストに `isNotNull` の `toContain` を追加（TC-024 仕様との整合）
- **F-06**: `test-cases.md` TC-038 の `type="kickoff"` を有効な MeetingType 値に修正
