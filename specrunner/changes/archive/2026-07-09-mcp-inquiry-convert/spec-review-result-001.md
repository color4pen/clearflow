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
| 1 | MEDIUM | tasks 不完全 | `tasks.md` T-02 / T-08 | T-02 で `convertSchema` を `inquiriesAdvertisementSchema` に追加すると、`mcpInputSchemaAdvertisement.test.ts` TC-019 の後方チェック（`予期しない "${op}" が含まれている`）が `"convert"` に対して失敗する。T-08 は「全テスト green」を要求しているが、TC-019 の更新タスクが明示されていないため、実装者が予期しない検証失敗に遭遇する可能性がある。 | T-02 または T-08 の acceptance criteria に「`mcpInputSchemaAdvertisement.test.ts` TC-019 の `expectedOperations.inquiries` 配列に `"convert"` を追加する」を明記する。 |
| 2 | LOW | レスポンス構造の非対称 | `tasks.md` T-03 / `spec.md` | T-03 で `update_status: converted` のレスポンスは、`deal` あり → `{ inquiry, deal }` (オブジェクト包み)、`deal` なし → `result.inquiry` 直返し、という非対称構造になる。`convert` オペレーションは常に `{ inquiry, deal?, ... }` を返すため、同一操作の2経路でクライアントのパース方法が変わりうる。後方互換上は問題ないが、将来クライアントが両経路を同一パターンで処理しようとした際に混乱が生じるリスクがある。 | 任意対応。`update_status: converted` の成功レスポンスを `deal` 有無によらず常に `{ inquiry, deal? }` で統一するか、spec にこの非対称性を明示的に文書化するかを検討すること。 |

## Review Summary

### 仕様の整合性

**request.md → spec.md の整合**:
全5要件（usecase Result に deal 追加、convert operation 追加、description 明記、update_status 後方互換、不変条件維持）が spec.md の Requirements に対応しており、矛盾なし。

**spec.md → tasks.md の整合**:
全8タスク（T-01〜T-08）が spec の Requirements を網羅している。T-01 が Req 1、T-02+T-04 が Req 2+3、T-03 が Req 5 の一部、T-05〜T-07 が受け入れ基準のテスト固定化、T-08 が品質ゲートに対応する。

### コード照合による実現可能性検証

**T-01（usecase Result 型拡張）**: `updateInquiryStatus.ts` 行 241 で `return { ok: true, inquiry: updatedInquiry }` となっており、`deal` 変数はトランザクション内（行 187）に存在するが返り値に含まれていない。`deal` をトランザクションの戻り値として引き出す実装変更が必要だが、技術的に直截。`UpdateInquiryStatusResult` のオプショナル追加は後方互換。

**T-02（convert operation 追加）**: `inquiries.ts` の `discriminatedUnion` への `convertSchema` 追加・`buildAdvertisementSchema` 引数追加・`switch` への `case "convert"` 追加は既存パターンに沿った追加実装。認可 (`canPerform(role, "inquiry", "convert")`) は `authorization.ts` 行 34 で `ADMIN_MANAGER` に定義済み。レート制限キー `mcp:updateInquiryStatus:${userId}` は `update_status` ハンドラ（行 210）と共有可能。

**T-03（update_status response に deal 追加）**: `update_status` ハンドラの非 pendingApproval 経路（行 238: `toToolSuccess(result.inquiry)`）を `deal` の有無で条件分岐させる実装。既存 `mcpApproval.test.ts` TC-012 のモックは `deal` を返さないため、条件分岐で deal なしパスを通り `toToolSuccess(result.inquiry)` のままとなり既存テストは壊れない。

**T-05（behavioral テスト）**: `mcpInputSchemaAdvertisement.test.ts` が `@/application/usecases/createInquiry` を個別ファイルモックして動作することが確認済み（TC-007）。T-05 の `@/application/usecases/updateInquiryStatus` 個別モックも同一パターンで機能する。

### セキュリティ分析（OWASP Top 10 観点）

- **A01 Broken Access Control**: `canPerform(role, "inquiry", "convert")` をユースケース呼び出し前に強制。`member` ロールは拒否される。テナント隔離は `organizationId` を usecase に渡すことで既存パターンどおり維持。
- **A03 Injection**: 入力は `{ inquiryId: z.string().uuid() }` のみ。UUID 検証により不正入力は Zod レイヤーで遮断される。
- **A07 Authentication Failures**: MCP 認証層（`getAuthInfo`）は既存インフラを流用。`auth` が null の場合は即エラー返却。
- **A09 Logging & Monitoring**: 監査ログは usecase 内で記録済み（`inquiry.updateStatus` + `dealId` metadata）。MCP ハンドラ側での追加監査は不要かつ禁止（spec.md 明記）。
- **レート制限の設計安全性（正評価）**: `convert` と `update_status: converted` が同一レート制限キー `mcp:updateInquiryStatus:${userId}` を共有することで、2つの operation を交互呼び出しすることによるレート制限回避攻撃を設計上防止している（design.md D3）。

### Finding #1 の根拠詳細

`mcpInputSchemaAdvertisement.test.ts` TC-019（行 580-633）は、`expectedOperations.inquiries = ["list", "create", "update", "update_status", "delete"]` を定義し、以下の**両方向チェック**を実行する:
1. expected の各値が actual に含まれること
2. actual の各値が expected に含まれること（行 629: `予期しない "${op}" が含まれている`）

T-02 で `convert` を discriminated union に追加すると actual enum が `["list", "create", "update", "update_status", "delete", "convert"]` となり、チェック 2 が `"convert"` に対して失敗する。T-08 の「全テスト green」は通らない。当該テストの更新は tasks に明示すべき。

### 総評

spec の構造（Requirement/Scenario/SHALL/MUST）、design の設計決定（D1-D5 の理由付けと代替案比較）、tasks の粒度はいずれも実装可能な品質に達している。Finding #1 は predictable な実装失敗点だが verification gate（T-08）で発覚可能かつ修正は trivial。CRITICAL/HIGH 所見なし。
