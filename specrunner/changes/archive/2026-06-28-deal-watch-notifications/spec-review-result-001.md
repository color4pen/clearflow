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
| 1 | MEDIUM | Security (OWASP A01) | tasks.md — T-08, T-11 | `watchDealAction(dealId)` は dealId をクライアントから受け取り、`watchDeal` usecase は `watchRepository.create` を呼ぶだけで deal の org 帰属を検証しない。`watches` テーブルの `dealId` FK は `deals.id` のみを参照し `organizationId` を含まないため、悪意あるユーザーが他テナントの dealId を知っていれば `{ userId: 自分, dealId: 他テナント案件, organizationId: 自分のOrg }` のレコードを作成できる。通知クエリは `organizationId` でスコープされるため他テナントデータは漏洩しないが、不正な watch レコードが存在する状態になる。 | T-08 または T-11 に「`watchDeal` usecase は `dealId` が `organizationId` 配下に存在することを `dealRepository.findById(dealId, organizationId)` で確認してから watch を作成する」旨を追記する。 |
| 2 | MEDIUM | Completeness | tasks.md — T-09 | design.md のリスク欄に「v1 では通知取得に limit を設ける」と明記されているが、T-09 の `auditLogRepository.findByTargets` 呼び出しに `limit` オプションの指定がない。watch 数が多いユーザーでクエリが無制限になり得る。 | T-09 の `findByTargets` 呼び出しオプションに `limit: NOTIFICATION_LIMIT`（新定数）を追加し、上限を定義することを明記する。 |
| 3 | LOW | Documentation | design.md — D8 | `getDealActivity` は invoice（`invoice.create` 等）も追跡するが、通知対象アクション（D8）から invoice イベントが除外されている。意図的な除外であることがコードを書く人に伝わりにくい。 | D8 の Rationale 末尾に「invoice は契約（contract）経由の派生エンティティであり v1 では通知対象外とする」を一文加える。 |
| 4 | LOW | Performance | tasks.md — T-13, spec.md | `NotificationBell` を Server Component として `layout.tsx` に配置すると、全ダッシュボードページのナビゲーション毎に `getNotifications`（watch 数に比例するクエリ）が実行される。spec に許容レイテンシやキャッシュ方針の記述がなく、実装者が考慮を省略するリスクがある。 | T-13 に「Next.js の `cache()` または `unstable_cache` でラップするか、Suspense + streaming で初期 HTML を遅延させる」方針を一文追記する。v1 では watch 数の上限（設計 Risks 参照）と組み合わせて許容可能な範囲を明示する。 |

## Review Notes

### 前回 request-review 指摘事項の対応確認

request-review-result-001.md の MEDIUM 指摘はいずれも設計・タスクで適切に対処されている。

- **Finding 1（UNIQUE 制約）**: design.md D2 で `(user_id, deal_id)` UNIQUE 制約を明示。T-01 でスキーマに追加、T-04 で `create` を `ON CONFLICT DO NOTHING` とする方針を明記。対応済み ✓
- **Finding 2（afterDate フィルタ）**: design.md D7 で `findByTargets` に `afterDate?` / `excludeActorId?` / `includeActions?` を optional パラメータとして追加する方針を明記。T-05 で実装手順が具体化されている。対応済み ✓
- **Finding 3（UI 形式）**: design.md D6 でドロップダウン方式を選択し、NotificationBell（Server Component）+ NotificationPanel（Client Component）の構成を明記。T-13 で実装手順が具体化されている。対応済み ✓
- **Finding 4（invoice.create 除外）**: design.md D8 で通知対象アクションを明示列挙することで暗黙的に除外。ただし除外理由の記述が不足（Findings #3 参照）。

### 仕様の品質評価

- **テナント分離**: 全 `watchRepository` 関数の `organizationId` 必須は spec.md 末尾の要件とシナリオで明示されており実装ガイドとして十分 ✓
- **MUST/SHALL 規約**: 全 Requirement に MUST が含まれ spec 記法準拠 ✓
- **シナリオ網羅**: 本人除外・watch 開始前除外・通知対象外アクション・既読後の未読管理など主要シナリオが Given/When/Then で具体化されている ✓
- **派生方式の整合性**: spec.md の「通知テーブルを使わず都度導出すること」は MUST で明記され、テスト固定の観点でも tasks.md T-14 に反映されている ✓
- **自動 watch の冪等性**: T-04 の `ON CONFLICT DO NOTHING` と T-07 の冪等性確認が整合している ✓
