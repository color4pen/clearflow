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
| 1 | LOW | Spec coverage | spec.md | 「全多フィールド update は未指定フィールドを保持する」Requirement は 11 操作すべてを対象として列挙しているが、Scenario が deals / approval_policies / inquiries の 3 操作のみ明示されている。残り 8 操作（clients / update_contact / contracts / invoices / tasks / revenueTargets / approval_templates + 両方の組み合わせ）は design で「正常」と判定済みだが Scenario がない。test-case-gen は tasks.md T-04 の操作列挙を見て補完する必要がある。 | 必須ではないが、各操作の最低 1 Scenario を spec.md に追記するか、tasks.md T-04 の "Acceptance Criteria" に「T-04 の全 11 操作を spec シナリオとして読み替えてよい」旨を明記することで test-case-gen の迷いを除ける。 |
| 2 | LOW | Edge case | tasks.md | `approval_policies.update` の PATCH 化後、フィールドを一切指定しない呼び出しでは Drizzle `.set({})` が空 SET 句になる可能性がある（Drizzle は undefined キーをスキップする）。spec/tasks いずれも「全省略時の挙動」を規定していない。実用上ほぼ発生しないが仕様として未定義の状態。 | tasks.md T-02 AC に「全フィールドを省略した場合は更新を行わず既存値を返す（no-op）か、入力バリデーションで最低 1 フィールド必須とする」旨を追記し、実装方針を明確にする。 |

## Review Notes

### バグ確認

#### interactions `update_meeting` attendees（設計の主バグ）

`src/app/api/mcp/tools/interactions.ts:200-217` を実コードで確認した。

```ts
if (typedArgs.internalAttendees !== undefined || typedArgs.externalAttendees !== undefined) {
  attendees = [
    ...(typedArgs.internalAttendees ?? []).map(...),   // undefined → [] に潰れる
    ...(typedArgs.externalAttendees ?? []).map(...),   // undefined → [] に潰れる
  ];
}
```

`internalAttendees` のみ指定した場合、`externalAttendees ?? []` が `[]` に評価されるため、既存の外部参加者が全削除される。逆も同様。**バグはコード上で確認済み**。

#### approvalPolicies `update`（PUT セマンティクス）

`src/app/api/mcp/tools/approvalPolicies.ts:65-100` の `updateSchema` で `name`・`triggerAction`・`templateId` が必須フィールドになっており、PUT 的全置換を強制している。ハンドラ（198-218 行）で `description: typedArgs.description ?? null` の `?? null` が省略時クリアを引き起こす。**バグはコード上で確認済み**。

`src/application/usecases/updatePolicy.ts` では `approvalTemplateRepository.findById(data.templateId, ...)` が必ず実行されるため、PATCH 化後は `templateId !== undefined` ガードが必要。tasks.md T-02 にその旨が明記されており問題ない。

`approvalPolicyRepository.updateById` は `Partial<{...}>` + Drizzle `.set(data)` で undefined キーを SQL の SET 句から除外するため、repository 側の変更は不要。設計の判断は正しい。

#### inquiries `update` nullable 欠落

`src/app/api/mcp/tools/inquiries.ts:47-60` の `updateSchema` で `description`・`contactNote`・`budget`・`timeline`・`clientId`・`assigneeId` に `.nullable()` がなく、null 指定が Zod により型エラーになる。usecase は `string | null` を受け付けるため、スキーマへの `.nullable()` 追加のみで完結する。**設計の判断は正しい**。

### 設計妥当性

| 決定 | 評価 |
|------|------|
| D1: attendees マージを usecase 層に配置 | `findById` は usecase が既に実行しているため追加 DB アクセスなし。handler が repository に依存しないため層違反なし。正しい選択。 |
| D1: `null` → `[]` 変換を handler で行い、usecase は `MeetingAttendee[] \| undefined` を受ける | handler→usecase 境界でセマンティクスが明確に分離される。型も一貫。正しい。 |
| D2: approvalPolicies の PATCH 化 | 他の全 update が PATCH セマンティクスであり一貫性が取れる。既存呼び出し（全フィールド指定）は同じ結果になるため後方互換あり。 |
| D3: inquiries にのみ `.nullable()` 追加 | usecase がすでに null を受容しており最小変更で完結する。 |
| D4: handler→usecase 境界テスト + usecase 単体テスト の 2 層 | 既存の `.dynamic.test.ts` パターンに準拠。`mcpInteractions.dynamic.test.ts` に TC-005/TC-006 として同種テストが実装済みで実績あり。 |

### セキュリティ確認（要請に基づく全項目確認）

**認証・認可**: 変更対象の 3 操作すべてで `canPerform(role, ...)` チェックが維持される。本変更でチェックは削除・変更されない。

**エラー内部詳細の漏洩**: interactions ハンドラは `if (!result.ok) { return toToolError("商談の更新に失敗しました"); }` と固定文言を使用し、`result.reason`（usecase の内部メッセージ）を MCP クライアントに返さない。approvalPolicies ハンドラは `toToolError(result.reason)` を使うが、`updatePolicy.ts` の catch 節は `return { ok: false, reason: "ポリシーの更新に失敗しました" }` と安全なメッセージを返す。現状の MCP 経路では内部詳細は漏れない。

**入力バリデーション**: Zod スキーマが型・形式・enumを検証。変更後も同等の検証が維持される。`superRefine` の `conditionField` + `conditionOperator` バリデーションは PATCH 化後も同一ロジック（`data.conditionField && data.conditionField.trim() !== ""`）が維持されるため、条件フィールドを指定しつつ演算子を省略した場合のバリデーションは引き続き機能する。

**クロステナント分離**: attendees マージは `findById(meetingId, organizationId)` で取得した `existing.attendees` を使うため、テナント境界を越えない。

**OWASP Top 10**: 本変更は PATCH セマンティクスへの是正であり、新しい権限モデル・認証パス・外部入力を持たない。注入・認証バイパス・アクセス制御の変化なし。

### 受け入れ基準の妥当性

| 受け入れ基準 | 評価 |
|-------------|------|
| 各多フィールド update で省略フィールドが既存値を保持 | spec Scenario + tasks T-04 で固定可能 ✓ |
| null 指定がクリアされること（undefined 区別） | spec Scenario + tasks T-05 で固定可能 ✓ |
| internalAttendees のみ指定で外部参加者が保持される | spec Scenario + tasks T-06 で固定可能 ✓ |
| 既存テストが green / typecheck / lint / build green | tasks T-08 で確認 ✓ |
| mcp-conformance 「部分更新」観点 | 全 update 操作が undefined 保持に統一されることで満たされる ✓ |

### 結論

仕様・設計・タスクは一貫しており、確認済みバグへの対処方針も正しい。Spec のフォーマット（`### Requirement:` / `#### Scenario:` / SHALL キーワード / Given/When/Then）も規則に適合している。Findings はいずれも LOW であり、test-case-gen フェーズで tasks.md を参照することで補完可能。実装フェーズへの移行を承認する。
