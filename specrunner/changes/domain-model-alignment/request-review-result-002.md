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

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | MEDIUM | データ移行仕様誤り | 要件 4「Meeting の Attendee 構造変更」マイグレーション仕様 | 既存の `attendees` JSON は `{ internal: string[], external: string[] }` であり各要素は人名文字列（UUID ではない）。要件 4 のマイグレーション仕様「internal の要素は `{ userId: value, name: value, isExternal: false }` に」は `userId` フィールドに人名文字列をセットしており意味的に誤り。外部参加者の仕様 `{ name: value, isExternal: true }` も `userId` / `contactId` の扱い（null か undefined か）が未定義。コードで確認した通り、既存 internal/external の `value` は `z.array(z.string())` で受け取った人名文字列。 | 正しい変換は internal: `{ userId: null, contactId: null, name: value, isExternal: false }`、external: `{ userId: null, contactId: null, name: value, isExternal: true }` とする。移行後に正しい `userId`/`contactId` を紐付ける運用は別途行う前提を明記すること。実装者はコードと新型定義を照らして `null` で補完すること。 |
| 2 | MEDIUM | スコープ不明確・アーキテクチャ不整合 | 要件 8「ClientContact の isPrimary 検証」 | `createClientContact` use case（`src/application/usecases/createClientContact.ts`）は `isPrimary` パラメータを受け取らない。`addClientContactAction`（`src/app/actions/clients.ts:209`）は `isPrimary` を `formData` から解析するが use case へ渡していない。また `updateClientContactAction`（同ファイル 280 行）は use case を経由せず `clientRepository.updateContact` を直接呼ぶ。要件 8 は「アプリケーション層で検証する関数を追加する」とのみ述べるが、どのファイル/どのレイヤーに置くかは未定義。 | 実装時の判断方針: (a) `createClientContact` use case に `isPrimary` パラメータを追加し `addClientContactAction` から渡す。(b) `updateClientContactAction` に `updateClientContact` use case を新設してレイヤーを揃えるか、または server action 内に検証を直接置くかを実装者が選択する。いずれかを採用した上で同一 `clientId` 内の isPrimary 重複チェックをその層に実装すること。 |
| 3 | LOW | 受け入れ基準不足 | 要件 3「Meeting に inquiryId を追加」受け入れ基準 | `meetingRepository.ts:mapRow` の `dealId: row.dealId` は現状 `string`（non-nullable）。`deals.id` 参照 FK も `notNull()` で定義。`dealId` を nullable に変えると `Meeting` 型・`mapRow`・`create` 関数シグネチャ・`createMeeting` use case の `dealId: string` 引数・`findAllByDeal` クエリが連鎖的に変更を要する。受け入れ基準にこれらが含まれていない。 | 受け入れ基準に「`meetingRepository` および `createMeeting`/`updateMeeting` use case が `dealId: string \| null` を受け付けるよう更新されていること」を追加することを推奨。実装者は変更の波及を自律的に追うこと。 |
| 4 | LOW | 既存バグの放置 | `src/app/actions/clients.ts:209`（`addClientContactAction`） | `addClientContactAction` は `isPrimary: formData.get("isPrimary") === "on"` を解析するが `createClientContact` use case への呼び出し（217 行）に `isPrimary` を渡していない。現状、UI で isPrimary にチェックしても常に `false` で登録される。要件 8 の検証を追加しても作成時の重複チェックは常にパスするため機能しない。 | 要件 8 の実装時に合わせて `createClientContact` use case へ `isPrimary` を渡すよう修正する（上記 Finding 2 の (a) と同一対応）。 |
