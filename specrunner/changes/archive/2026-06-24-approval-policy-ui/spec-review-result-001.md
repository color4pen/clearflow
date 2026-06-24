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
| 1 | MEDIUM | Validation | tasks.md T-03 | Zod スキーマの `triggerAction` が `string, min(1)` のみで、許容値への制限がない。管理者が UI の select を迂回して任意の文字列を送信した場合、ポリシーが DB に保存されるが R04b の評価ロジックで一致しないサイレント障害が発生する。 | `z.enum(["inquiry.convert", "contract.create", "contract.cancel"])` に変更し、`TRIGGER_ACTION_OPTIONS` との整合を保つ。将来のトリガー追加時はここと `constants.ts` を同時に更新するよう設計メモに追記する。 |
| 2 | MEDIUM | Spec Completeness | tasks.md T-03 | `togglePolicyAction` の疑似コードに `findById` が null を返した場合の分岐が未定義。「findById で現在値取得 → !current.isActive」を逐語的に実装すると、ポリシーが見つからない場合に TypeError が発生し Server Action が例外終了する。 | T-03 の pseudocode に `if (!current) return { success: false as const, message: "ポリシーが見つかりません" }` の分岐を明記する（templates.ts のエラー応答パターンに従う）。 |
| 3 | MEDIUM | Testing | tasks.md T-08 | T-02 の acceptance criteria に `getTriggerActionLabel` / `formatCondition` のユニットテスト期待値が明示されているが、T-08 に対応するテストファイルの作成が含まれていない。既存の `src/__tests__/` の静的テストと同列に検証できる純粋関数であり、テスト追加コストが低い。 | T-08 に `src/__tests__/domain/policyHelpers.test.ts`（または相当ファイル）の作成を追加し、T-02 AC の各ケース（`getTriggerActionLabel("inquiry.convert")` → `"引合の案件化"` 等）をテストとして実装することを明示する。 |
| 4 | LOW | Validation | tasks.md T-03 | Zod スキーマのテキストフィールド（name, description, conditionField, conditionValue）に `max()` 制約が未指定。DB カラムの最大長（schema.ts の `varchar` 制限等）と合わせた制約がないため、過大入力が DB エラーになりうる。 | 各フィールドに `max(255)` 等の上限を追加する（schema.ts の定義と照合して適切な値を選択する）。 |
| 5 | LOW | Spec Completeness | tasks.md T-04 | 編集モード（`mode="edit"`）で `updatePolicyAction` に policyId を渡す手段として `<input type="hidden" name="id" value={policyId} />` の追加が明示されていない。TemplateForm では同パターンが使用されているが、T-04 の実装手順から参照が欠けている。 | T-04 に「編集モード時は `<input type="hidden" name="id" value={policyId} />` を form 内に追加する（TemplateForm の同パターンに準拠）」を明記する。 |

## Security Review

### Authentication & Authorization

- **Server Action の認証**: 全 Action（`listPoliciesAction`, `createPolicyAction`, `updatePolicyAction`, `togglePolicyAction`）で `auth()` による認証チェックを先頭に実施するよう T-03 に明記されており、既存の `templates.ts` パターンと一貫している。✓
- **認可チェック**: `canPerform(role, "approvalSettings", <operation>)` を使用するよう設計されており、`authorization.ts` の権限マトリクス（`listPolicies: ADMIN_MANAGER`, `createPolicy: ADMIN_ONLY`, `editPolicy: ADMIN_ONLY`）と整合している。✓
- **ページレベルのリダイレクト + Action レベルの認可**: 二重防御が設計に含まれている（D5）。✓

### テナント分離（IDOR 対策）

- `togglePolicyAction` で `findById(id, organizationId)` を先に呼び、セッションの `organizationId` で所有確認してから `updateById` を呼ぶ設計は正しい。ただしこれは finding #2 と連動しており、null ガードが必要。
- `updatePolicyAction` は `approvalPolicyRepository.updateById(id, organizationId, ...)` に `organizationId` を渡すため、他テナントのポリシーを更新できない。✓

### CSRF

- Next.js App Router の Server Actions は、実行に Next.js が生成するアクション ID と `Content-Type: application/x-www-form-urlencoded` または `multipart/form-data` を必須とするため、CSRF 保護が組み込み済み。✓

### OWASP Top 10 チェック

| # | 項目 | 評価 |
|---|------|------|
| A01 | Broken Access Control | ✓ ページ + Action の二重認可チェック、organizationId によるテナント分離 |
| A03 | Injection | ✓ Zod によるスキーマ検証。conditionValue は文字列として保存され評価ロジック（R04b）側で処理される |
| A07 | Identification and Authentication Failures | ✓ 全 Action で `auth()` を先頭呼び出し |
| A08 | Software and Data Integrity Failures | ✓ Server Actions の CSRF 保護が組み込み済み |

## 設計整合性チェック

| 項目 | 評価 |
|------|------|
| design.md D1 のディレクトリ構成と tasks.md の整合 | ✓ `[id]/edit/page.tsx` で統一（request.md の `[id]/page.tsx` 記述は design.md で上書き済み）|
| authorization.ts の permission 名称と tasks.md の整合 | ✓ `approvalSettings` / `listPolicies` / `createPolicy` / `editPolicy` で統一 |
| templates/ パターンとの一貫性 | ✓ ディレクトリ構成、useActionState、エラー応答形式、revalidatePath、インラインフォームパターンすべて参照済み |
| リポジトリ直接呼び出し（design.md D2） | architect 評価済みの設計判断として明記されており、リスクと将来の対処方針（usecase 抽出条件）も design.md に記載されている。✓ |
