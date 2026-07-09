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
| 1 | LOW | Scope clarity | 要件1 / `approvalPolicies.update` | `approvalPolicies.ts` handler の update case（line 205）で `description: typedArgs.description ?? null` が適用されており、description を省略すると null にクリアされる。`name`/`triggerAction`/`templateId` が必須フィールドのため PUT 的全置換が意図された設計の可能性もある。audit 対象には含まれているが、意図的 PUT 挙動なのかバグなのかが request.md から判断できない。 | 横断監査の判断結果（intentional PUT / PATCH 是正）を design.md か spec に明記し、後続フェーズでの判断ブレを防ぐ。 |
| 2 | LOW | Test infrastructure | 実装上の必須事項 / 受け入れ基準 | 「更新後に対象を再取得して未指定フィールドが保持されていることを assert」する behavioral テストは、既存の `.dynamic.test.ts` が usecase 層でモックする pattern（再取得時に永続化を経由しない）と相容れない。特に attendees 保持の検証では、update 後に「DB 上の外部参加者が残っている」ことを確認する必要があり、stateful repository mock か実 DB 接続が必要になる。 | test-case-gen 担当者は `findById` が `update` 後の状態を返す stateful in-memory mock を用意するか、DB 接続テストとして分離して対応する。どちらのアプローチを採用するかを test-cases.md に明示する。 |

## Review Notes

### バグ確認

`src/app/api/mcp/tools/interactions.ts` 200〜217 行の実コードを確認した。

```ts
let attendees: MeetingAttendee[] | undefined;
if (typedArgs.internalAttendees !== undefined || typedArgs.externalAttendees !== undefined) {
  attendees = [
    ...(typedArgs.internalAttendees ?? []).map(...),  // undefined なら [] になる
    ...(typedArgs.externalAttendees ?? []).map(...),  // undefined なら [] になる
  ];
}
```

`internalAttendees` のみ指定した場合、`externalAttendees ?? []` が `[]` に評価されるため、既存の外部参加者がすべて除去される。逆も同様。request.md に記載されたバグは **コード上で確認済み**。

### 他の update 系操作の監査結果（読み取り確認）

| 操作 | 未指定フィールドの扱い | 評価 |
|------|----------------------|------|
| `deals.update` | `args.xxx` を undefined のまま usecase に渡し、usecase 内で `...(x !== undefined && { x })` | ✅ 正常 |
| `clients.update` | `Partial<{...}>` でそのまま渡す | ✅ 正常 |
| `clients.update_contact` | `Partial<{...}>` でそのまま渡す（isPrimary も undefined 保持）| ✅ 正常 |
| `inquiries.update` | undefined のまま渡し、usecase 内で `if (x !== undefined)` build | ✅ 正常 |
| `contracts.update` | undefined のまま渡し、Drizzle `.set({...data})` が undefined をスキップ | ✅ 正常 |
| `invoices.update` | undefined のまま渡し、Drizzle `.set({...data})` が undefined をスキップ | ✅ 正常 |
| `tasks.update` | undefined のまま渡し、usecase 内で `if (x !== undefined)` build | ✅ 正常 |
| `revenueTargets.update` | undefined のまま渡し、Drizzle が undefined をスキップ | ✅ 正常 |
| `approval_templates.update` | undefined のまま渡す | ✅ 正常 |
| `approval_policies.update` | `description: typedArgs.description ?? null`（Finding #1）| ⚠️ 要確認 |
| `interactions.update_meeting` (attendees) | `internalAttendees ?? []` が反対側を消す | ❌ バグ確認済 |

### 受け入れ基準の妥当性

- behavioral テスト要件（実 transport 経由 + 更新後に再取得）：達成可能。ただし Finding #2 を参照。
- `null`（クリア）と `undefined`（変更なし）の区別：`updateMeetingSchema` で `internalAttendees: z.array(z.string()).nullable().optional()` になっているため、null 指定によるクリアのセマンティクスも検討が必要。request.md では「両方指定なら両方差し替え」とのみ言及しており、`null` 指定（参加者全クリア）の扱いは spec で明確化すること。
