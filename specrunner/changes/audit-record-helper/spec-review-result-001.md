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
| 1 | MEDIUM | Task List Accuracy | tasks.md — T-03 | `createDeal.ts` が T-03 の「1 呼び出し（38 ファイル）」リストから脱落している。実コードを検証した結果、1 呼び出しを持つ usecase は 40 ファイル（rejectRequest=2、approveRequest=3、updateInquiryStatus=4 を除く）。また「2 呼び出し（2 ファイル）」ラベルも誤りで、実際に 2 呼び出しを持つのは `rejectRequest.ts` のみ（1 ファイル）。ラベルと実態の不一致が実装者の混乱を招く恐れがある。T-02 のガードテストが missed file を捕捉するため機能的影響は最小だが、実装前に訂正するのが望ましい。 | T-03 の「1 呼び出し（38 ファイル）」リストに `createDeal.ts` を追加し、カウントを「40 ファイル」に修正する。「2 呼び出し（2 ファイル）」を「2 呼び出し（1 ファイル）」に訂正する。 |
| 2 | MEDIUM | Spec Coverage Gap | spec.md — Requirement 3 | Requirement 3 の Scenario が `src/application/usecases/` 配下のみを検査対象として記述しており、`src/infrastructure/handlers/auditLogHandler.ts`（1 呼び出し）が Scenario のスコープに含まれていない。Requirement 本文は「`auditRecorder.ts` のみに限定される」と全体を指しているが、Scenario が部分的であることで test-case-gen が handler 側のガードを省略するリスクがある。tasks.md T-02 は両方のパスを正しく網羅しているため機能的リスクは低い。 | spec.md Requirement 3 に `infrastructure/handlers/` を含む Scenario（または既存 Scenario の Given 節の拡張）を追加し、全スコープを明示する。 |
| 3 | LOW | Spec Coverage | spec.md — Requirement 4 | 移行後の挙動不変を保証する Requirement 4 の Scenario が `toggleActionItemDone`（metadata 型強制が発生する唯一の action）のみで、複数呼び出しを持つ usecase（例: `approveRequest` の 3 呼び出し、`updateInquiryStatus` の 4 呼び出し）の不変性を確認するシナリオが存在しない。純粋なリファクタリングであり既存テストで保護されているため severity は LOW。 | Requirement 4 に複数呼び出しパターン（例: `approveRequest` が同一トランザクション内で 3 回 `recordAudit` を呼び出し、すべての記録が保持される）の Scenario を 1 件追加することを推奨。 |

## 検証メモ

### コードベース実態確認

- `src/domain/models/auditLog.ts`: `AuditAction` / `AuditTargetType` / `AuditMetadataMap`（`action_item.toggle: { done: boolean }` のみ登録）を確認済み。
- `auditLogRepository.create` の実呼び出しファイル数（usecase 限定）:
  - 1 呼び出し: **40 ファイル**（grep で検証）
  - 2 呼び出し: `rejectRequest.ts` — **1 ファイル**
  - 3 呼び出し: `approveRequest.ts` — 1 ファイル
  - 4 呼び出し: `updateInquiryStatus.ts` — 1 ファイル
  - 合計: 43 ファイル、49 呼び出し（design.md の記述と一致）
- `src/infrastructure/handlers/auditLogHandler.ts`: 1 呼び出し（design.md の記述と一致）
- `src/domain/events/dispatcher.ts`: コメント内のみ（実 call なし。design.md の記述と一致）
- `src/application/services/clientContactService.ts`: 1 ファイル確認済み。`auditRecorder.ts` の追加先として適切。

### 前回 request-review 指摘事項の spec への反映確認

前回 request-review-result-002.md で `approved` となった request.md の内容が design.md / tasks.md / spec.md に正しく引き継がれていることを確認：

| 項目 | 確認結果 |
|------|---------|
| ヘルパ配置: `src/application/services/` と明示 | ✅ design.md D1、tasks.md T-01 に明記 |
| `auditLogRepository.create(` 呼び出し構文の検査（コメント除外） | ✅ tasks.md T-02 test 3 で明記 |
| `AuditMetadataMap` 未登録 action の metadata 型 `Record<string, unknown> \| null \| undefined` | ✅ design.md D2、tasks.md T-01 の型定義に反映 |
| 既存静的テストを `recordAudit` 参照に更新（"無変更 green" ではない） | ✅ tasks.md T-05 で 7 ファイル・35 アサーションの更新方針を明記 |

### セキュリティレビュー

本変更は純粋な構造的リファクタリング（single entry point への集約）であり、新たな攻撃面を追加しない。以下の観点で確認：

- **認証・認可**: 変更なし（ヘルパは呼び出し元から actorId / organizationId を受け取るだけで、検証ロジックは追加しない）
- **入力バリデーション**: `AuditMetadataMap` に基づく型制約でコンパイル時に強制。ランタイムバリデーションは追加しないが、spec-change の挙動不変要件と整合する
- **監査ログの完全性**: 集約によりすべての記録が単一ヘルパを通るため、呼び出し漏れのリスクはむしろ低下する。T-02 ガードテストが実装後の逸脱を継続的に検出する
- **OWASP Top 10**: 該当なし（永続化・認証・入力処理の変更を伴わない）

### 総評

spec の構造要件（normative keywords, Given/When/Then format, Requirement ごとの Scenario）はすべて満たされている。design.md の意思決定（D1–D5）は合理的で、代替案の検討・リスクの明示が適切に行われている。MEDIUM 2 件はいずれも guard test による safety net で実害を防げる範囲だが、tasks.md の file list 誤りは実装前に訂正することを推奨する。CRITICAL / HIGH 案件はなし。
