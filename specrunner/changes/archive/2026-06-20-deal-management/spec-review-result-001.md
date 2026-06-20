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
| 1 | MEDIUM | Security — マルチテナント | tasks.md T-06, T-09 | `createDeal` と `updateDeal` usecase が受け取る `assigneeId` / `technicalLeadId` に対して、そのユーザーが同一 organizationId に所属するかの検証が未定義。管理者が他組織のユーザー UUID を指定してもエラーにならず、案件詳細ページで他組織のユーザー情報がレンダリングされる可能性がある。既存の inquiries/meetings でも同じパターンが踏襲されているため破滅的影響ではないが、multi-tenant SaaS として指摘に値する。 | `createDeal` / `updateDeal` 内で `assigneeId`/`technicalLeadId` が指定された場合に `userRepository.findById(id, organizationId)` などで組織帰属を確認し、不一致なら `{ ok: false, reason: ... }` を返す。または既存の同パターンを容認する旨を design.md の Risks/Trade-offs に追記して意図的妥協として記録する。 |
| 2 | LOW | Security — Rate limiting | request.md 要件7 / tasks.md T-10 | request.md は `deals.ts` 全体として「レート制限」を要件に挙げているが、T-10 では `createDealAction` にのみ `checkRateLimit()` が指定されている。`updateDealPhaseAction`（承認リクエスト自動作成を含む重い操作）と `updateDealAction` にはレート制限が記述されていない。 | T-10 の `updateDealPhaseAction` と `updateDealAction` にも `checkRateLimit()` 呼び出しを追記するか、意図的に省略している場合は T-10 の Acceptance Criteria に除外理由を明記する。`updateInquiryStatusAction` が rate limiting を持たない点との一貫性も考慮してよい。 |
| 3 | LOW | Spec 不整合 | tasks.md T-10 | request.md 要件7 は Server Actions 全般に「Zod バリデーション」を謳っているが、T-10 の `updateDealPhaseAction` には Zod スキーマが定義されておらず `newPhase` を文字列として取り出すだけになっている。既存の `updateInquiryStatusAction` も同様であり既存パターンとの一貫性はあるが、spec 内での記述の矛盾が実装者に混乱を与えうる。 | T-10 の `updateDealPhaseAction` に `newPhase` の Zod enum バリデーションを追加する（例: `z.enum(["proposal_prep","proposed","negotiation","internal_approval","won","lost"])`）か、または request.md の「Zod バリデーション」を `createDealAction` と `updateDealAction` のみに限定する記述に修正する。 |
| 4 | LOW | 実装曖昧性 | tasks.md T-13 | 「案件を作成」ボタンの実装を「案件作成フォームを表示するか、`/deals/new?inquiryId=${id}` へ遷移する」と二択で記述しているが、`/deals/new` ページに対応するタスクが定義されていない。実装者が後者を選択した場合、404 になるルートが生まれる。 | `/deals/new` ルートを採用するならタスクを追加する。採用しない場合は「インラインフォームを表示する」と一択に絞り、`createDealAction` を呼び出すパターンを明記する。 |
| 5 | LOW | 未使用定義 | tasks.md T-07 | `getDeal(id, organizationId)` usecase が T-07 で定義されているが、T-12（案件詳細ページ）は `dealRepository.findById` を直接呼び出しており、T-10 には `getDealAction` も存在しない。usecase が呼び出される経路がタスク上に存在しない。 | `getDeal` usecase を削除して `dealRepository.findById` を直接利用する既存パターンに統一するか、または `getDealAction` を T-10 に追加して usecase を活用するルートを明示する。 |
| 6 | LOW | Edge case 未定義 | tasks.md T-08 / spec.md | `updateDealPhase` で `internal_approval` に遷移する際、`deal.estimatedAmount` が null の場合に `filterStepsByCondition` へ渡す formData が `{ amount: { value: null, label: "想定金額" } }` となる。`evaluateStepCondition` は `value: null` を `Number(null) = 0` として評価するため、金額条件付きステップが意図せず除外または包含されうる。 | spec.md の `internal_approval` 遷移シナリオに「`estimatedAmount` が null の場合はステップ条件評価で 0 として扱われる」旨を補足するか、design.md の Risks/Trade-offs に記録して既知事項とする。実装上の修正は不要だが文書化により実装者の誤認を防げる。 |
