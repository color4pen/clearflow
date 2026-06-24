# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: needs-discussion

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | MEDIUM | データ移行ロジック誤り | 要件 4「Meeting の Attendee 構造変更」マイグレーション仕様 | `src/app/actions/meetings.ts` を確認すると `internalAttendees` / `externalAttendees` は `z.array(z.string())` で受け付ける**名前文字列**（UUID ではない）。要件 4 の移行仕様 `internal の要素は { userId: value, name: value, isExternal: false }` は同じ文字列を `userId` と `name` の両方に設定するが、その文字列はユーザー名（人名）であり、UUID ではない。これを `userId` にセットすると型的には `string | null` を満たすが、意味的に誤った参照が格納される。 | マイグレーション仕様を `{ userId: null, name: value, isExternal: false }` に修正する。同様に external は `{ contactId: null, name: value, isExternal: true }` とする。新形式への移行後はユーザーが UI から正しい `userId` / `contactId` を紐付ける運用を前提にすること。 |
| 2 | MEDIUM | スコープ曖昧・アーキテクチャ不整合 | 要件 8「ClientContact の isPrimary 検証」 | `src/app/actions/clients.ts:245-295` を確認すると `updateClientContactAction` は use case を通らず `clientRepository.updateContact` を直接呼び出している（レイヤー違反）。さらに `addClientContactAction`（同ファイル 190-234 行）は `isPrimary` をフォームから受け取るが `createClientContact` use case に渡していない（use case 側の型定義に `isPrimary` パラメータが存在しない）。要件 8 は「作成・更新時に検証する関数を追加する」と述べるが、create パスでは `isPrimary` 自体が use case まで届いておらず、update パスでは use case 層が存在しないため、検証をどのレイヤーのどのファイルに置くか特定できない。 | 要件 8 のスコープを明確化する。最低限: (a) 検証ロジックを置くレイヤー（domain service / use case 関数 / server action のいずれか）を明示する。(b) `createClientContact` use case が `isPrimary` を受け取らない既存問題を本要件で合わせて修正するか、別リクエストに切り出すかを決める。(c) `updateClientContactAction` が use case を通らない既存問題に対して、本要件で `updateClientContact` use case を新設するか、検証をサーバーアクションに直接入れるかを指定する。 |
| 3 | LOW | 受け入れ基準の不足 | 要件 3「Meeting に inquiryId を追加」受け入れ基準 | `meetingRepository.ts:mapRow` は `dealId: row.dealId` を `string` として返しており、`Meeting` ドメインモデル型も `dealId: string`（non-nullable）。`dealId` を nullable に変更すると `mapRow`・`create`・`findAllByDeal` の型シグネチャおよび `createMeeting` use case の引数 `dealId: string` が壊れ、型エラーが発生する。これらの修正は実装者には自明だが、受け入れ基準に明示されていない。 | 受け入れ基準に「`meetingRepository` および `createMeeting` / `updateMeeting` use case が inquiryId / nullable dealId を受け付けるよう更新されていること」を追加する。 |
| 4 | LOW | 既存バグの放置 | `src/app/actions/clients.ts:217-226`（`addClientContactAction`） | `addClientContactAction` は `isPrimary: formData.get("isPrimary") === "on"` を解析するが、`createClientContact` use case 呼び出し時に `isPrimary` を渡していない。結果として UI で isPrimary にチェックしても常に `false` で登録される。要件 8 の検証を追加する前に、この既存バグが残っていると検証が機能しない（作成時は常に `isPrimary=false` になるため重複は発生しない）。 | 要件 8 の実装時に、合わせて `createClientContact` use case に `isPrimary` パラメータを追加し、`addClientContactAction` から正しく渡すよう修正することを明示する。または本バグを別リクエストとして追跡する。 |
