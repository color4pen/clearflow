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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Spec contradiction — single-link enforcement location | `design.md` D1 vs `request.md` 要件4 | design.md の Goals と D1 は「3 FK のうち最大1つが非 null の不変条件を usecase で保証する」と明記している。一方 request.md 要件4は「usecase には不変条件は入れない（会議ページ等は meetingId+dealId を同時送信するため）」と明示的に否定している。実装者がどちらに従うべきか判断できない。 | design.md D1 と Goals の「usecase で保証する」という記述を request.md 要件4 の決定（"ピッカー経由のみ、UI 側で単一化する"）と一致するよう書き直す。design.md は request.md の architect 評価済み判断 #1 を反映した最新状態に更新が必要。 |
| 2 | HIGH | Spec contradiction — T-04 breaks accepted MeetingActionItemsSection behavior | `tasks.md` T-04 vs `request.md` 受け入れ基準 | T-04 は createActionItem usecase に「meetingId が指定された場合 dealId=null にする」優先ロジックを追加する。しかし MeetingActionItemsSection は `createActionItemAction({ meetingId, dealId })` を同時に送信しており（実コード確認済み）、T-04 を適用すると dealId が null に上書きされる。その結果 listActionItems の優先判定（dealId → meetingId の順）が変わり、会議タスクのグローバルタスク一覧での表示が「案件名」→「会議日付」に変わる。これは request.md 受け入れ基準「会議ページからのタスク作成が従来通り meetingId+dealId を保持して動作し、一覧で親案件名表示が維持される」を満たさない。 | request.md 要件4の決定に従い、T-04 の usecase 変更を削除する（createActionItem と updateActionItem に FK 優先ロジックを追加しない）。単一紐づけはピッカー経由の送信時（T-07 ActionItemRow、T-08 TaskList）のみ FK マッピングを行う。T-04 は「usecase 変更なし」として記述を差し替えるか、タスク自体を削除する。 |
| 3 | HIGH | Spec contradiction — spec.md の単一紐づけ Requirement が usecase を対象にしている | `spec.md` "Requirement: 単一紐づけ" vs `request.md` 要件4 | spec.md の "Requirement: 単一紐づけ" は「createActionItem usecase and updateActionItem usecase SHALL enforce that at most one of `dealId`, `inquiryId`, `meetingId` is non-null」と記述している。これは request.md 要件4の「usecase には不変条件は入れない」と直接矛盾する。spec.md のシナリオ（例：「案件を選択すると inquiryId と meetingId が null になる」）も usecase をテスト対象としているように読める。 | spec.md の "Requirement: 単一紐づけ" の SHALL 文と各シナリオを、「ピッカー経由の送信時（TaskList の handleAdd、ActionItemRow の handleSave）において FK マッピングが単一化される」という UI-layer の振る舞いに書き直す。usecase が対象ではなく、Server Action への入力として渡される時点で単一化が保証されることを明確にする。 |
| 4 | HIGH | spec.md に MeetingActionItemsSection 保護シナリオが欠落している | `spec.md` vs `request.md` 受け入れ基準 | request.md の受け入れ基準に「会議ページからのタスク作成（MeetingActionItemsSection）が従来通り meetingId+dealId を保持して動作し、一覧で親案件名表示が維持される」が含まれる。しかし spec.md にはこれに対応するシナリオが存在しない。テストで検証されない重要なリグレッション防止要件が宙に浮いており、実装時に見落とされる可能性がある。 | spec.md に以下のシナリオを追加する：「Scenario: 会議ページからのタスク作成では dealId と meetingId が両方保持される / Given MeetingActionItemsSection が meetingId=M1, dealId=D1 を送信する / When createActionItem が呼ばれる / Then 作成された ActionItem の meetingId=M1 かつ dealId=D1 が両方 non-null である」。T-09 のテストケースにもこの保護を静的検証として追加する（createActionItem.ts に"meetingId が有る場合に dealId を null にするロジック"が存在しないことを確認）。 |
| 5 | MEDIUM | tasks.md T-02 が formatDateJP 重複実装を指示しており request.md 要件2 と矛盾 | `tasks.md` T-02 vs `request.md` 要件2 | request.md 要件2は「formatDateJP は listActionItems.ts の private 関数を `src/lib/dateUtils.ts` へ切り出して両所で import する（重複実装を避ける）」と明記する。しかし tasks.md T-02 は「スコープ内では各ファイル内にヘルパーとして定義する」と重複実装を許容している。2ファイル内に同一ロジックが生まれると将来の日付フォーマット変更時に片方を修正し忘れるリスクがある。 | tasks.md T-02 の formatDateJP に関する指示を request.md 要件2 の決定（`src/lib/dateUtils.ts` に共通化）に合わせて書き直す。T-01 か T-02 の前に「`src/lib/dateUtils.ts` を新規作成し `formatDateJP` を定義する、`listActionItems.ts` のプライベート定義を削除して import に切り替える」ステップを追加する。 |
| 6 | MEDIUM | searchLinkTargetsAction にレートリミットがなく、エンティティ列挙攻撃に無防備 | `tasks.md` T-03 / `src/app/actions/actionItems.ts` | 既存の createActionItemAction・toggleActionItemAction・updateActionItemAction・deleteActionItemAction はすべて `checkRateLimit` を呼び出している。T-03 の searchLinkTargetsAction には rate limit の記述が一切ない。検索エンドポイントは部分一致クエリを総当たりすることでテナント内のエンティティ名を列挙できるため、連続呼び出しへの防御が必要。 | T-03 に `checkRateLimit` 呼び出しを追加する記述を加える。リミット値は検索の特性（読み取り専用・ユーザー操作起点）を考慮し、例えば `RATE_LIMITS.search` 定数を新設して既存の createRequest リミットよりも緩めに設定することが望ましい（例: 60req/分）。 |
| 7 | MEDIUM | searchMeetings usecase が UI 層ファイル（labels.ts）を import しアーキテクチャ違反 | `tasks.md` T-02 / `src/application/usecases/searchMeetings.ts`（新設予定） | tasks.md T-02 は「meetingTypeLabels は `src/app/(dashboard)/labels.ts` からインポートする」と指示する。`src/app/(dashboard)/` は Next.js のルートグループ（UI 層）であり、`application/usecases/` 層がここを import すると依存方向「actions → usecases → domain/infrastructure」が逆流する。request-review-result-002 でも LOW として指摘されたが tasks.md に反映されていない。 | `meetingTypeLabels` を `src/lib/meetingLabels.ts`（または `src/domain/models/meeting.ts` 内の定数）に移動し、`labels.ts` からは再 export する形にする。searchMeetings usecase は `src/lib/meetingLabels.ts` を import する。この移動は T-02 の前提タスクとして明記する。 |
| 8 | MEDIUM | T-04 と T-07 で update 時の単一紐づけ適用層が矛盾している | `tasks.md` T-04 vs T-07 | T-04 の Acceptance Criteria は「updateActionItem でも同様の保証がある」と usecase レベルの保証を謳う。しかし T-04 の実装指示は「updateActionItem のシグネチャは既存のまま、呼び出し元（Server Action）で FK マッピングを行う」と書き、実際のマッピングは T-07 で ActionItemRow（UI コンポーネント）が行う。create（usecase の優先ロジック）と update（UI コンポーネントのマッピング）で適用層が食い違っており、どちらが正として意図されているのかが不明瞭。 | #2 の修正（T-04 の usecase 変更を削除）に合わせて T-04 の Acceptance Criteria を「update 時の FK 単一化は ActionItemRow（T-07）の呼び出し元マッピングで行われる」と一致させる。usecase に「保証がある」という記述を削除し、「ActionItemRow → updateActionItemAction に渡す時点でピッカー選択の type に応じて FK を単一化する」と記述を統一する。 |
| 9 | LOW | T-05 のデバウンス実装にアンマウント時のクリーンアップ記述がない | `tasks.md` T-05 | T-05 は「setTimeout/clearTimeout でデバウンスを実装する（外部ライブラリ不使用）」と記述するが、コンポーネントアンマウント時に進行中のタイマーをクリアする `useEffect` cleanup の記述がない。モーダルを素早く開閉した場合、アンマウント後に searchLinkTargetsAction が呼ばれ React の「state update on unmounted component」警告が生じる可能性がある。 | T-05 の実装指示に「デバウンスの useEffect は cleanup 関数で `clearTimeout(timer)` を返す」旨を追記する。例：`useEffect(() => { const timer = setTimeout(...); return () => clearTimeout(timer); }, [query, activeTab]);` |
| 10 | LOW | T-09 に MeetingActionItemsSection の dealId 保持テストが欠落 | `tasks.md` T-09 | #4 と対応。T-09 の静的解析テストは createActionItem の「3 FK 排他ロジック」の存在確認を行うが、MeetingActionItemsSection が meetingId+dealId を同時に渡した場合に dealId が保持されることを検証するテストが存在しない。T-04 の変更が正しく削除されたかの退行防止として有用。 | T-09 に「`createActionItem.ts` に `meetingId` が指定された場合に `dealId` を null にするコードが存在しない（priority overwrite がない）」を確認する静的テストを追加する。具体的には createActionItem.ts の内容に `dealId = null` などの FK 強制書き換えコードが含まれないことを assert する。 |
