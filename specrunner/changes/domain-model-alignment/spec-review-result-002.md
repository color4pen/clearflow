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
| 1 | MEDIUM | 仕様曖昧性 — amount > 0 バリデーション層が不明確 | `tasks.md` T-25 | T-19 は createContract usecase が `amount ≤ 0` を拒否することを明記している（"amount が null / 0 以下の場合 `{ ok: false, reason: '契約金額は必須です' }` を返す"）。一方 T-25 は action schema の変更を"`.nonnegative()` を `.positive()` に変更、または usecase 側のバリデーションに委ねる"と「または」で曖昧に記述している。action が `.nonnegative()` のままの場合、amount=0 は action を素通りして usecase でエラーになり、エラーメッセージ「契約金額は必須です」は「必須フィールドが未入力」と誤解される。実装者が双方を独立に判断すると、action は 0 を許容し usecase は拒否する一貫性のない防御層が生まれる。 | T-25 の記述を「`createContractSchema` の `amount` バリデーションを `.nonnegative()` から `.positive()` に変更して 0 を action レイヤーで拒否する」に一本化し、"または" 分岐を削除すること。これにより action 層と usecase 層の両方で一貫して 0 を拒否する二重防御が明確になる。 |
| 2 | MEDIUM | マイグレーション — CHECK 制約 SQL の配置位置が未指定 | `tasks.md` T-33 (d) | T-33(d) は `ALTER TABLE "meetings" ADD CONSTRAINT "meetings_deal_or_inquiry_check" CHECK ("deal_id" IS NOT NULL OR "inquiry_id" IS NOT NULL)` の手動追加を指示しているが、生成された migration ファイル内のどこに挿入するかを明示していない。この CHECK 制約は `inquiry_id` カラムの ADD COLUMN DDL および `deal_id` の NOT NULL 解除 DDL の後に配置しなければならない。もし前に置いた場合、`inquiry_id` が存在しないため migration が失敗する。T-33 の末尾には "UPDATE → ALTER の順" という注記があるが、CHECK 制約の配置順は明示されていない。 | T-33 に「(d) の CHECK 制約 SQL は Drizzle Kit が自動生成した meetings テーブルへの DDL（ADD COLUMN inquiry_id、ALTER COLUMN deal_id DROP NOT NULL）の後に追加すること」という注釈を加えること。 |
| 3 | MEDIUM | データ整合性 — isPrimary バリデーションの TOCTOU 競合 | `tasks.md` T-20, T-27 | T-20（createClientContact usecase）および T-27（updateClientContactAction）の isPrimary 検証は「既存 isPrimary カウント取得 → validatePrimaryUniqueness 呼び出し → INSERT/UPDATE」の順で実行されるが、この3ステップを包むトランザクション境界が指定されていない。高並行時に2つのリクエストが同時に既存カウント 0 を取得し、両方が OK として通過し、2 つの isPrimary=true を作成することがある。spec.md は「同一顧客に isPrimary=true の担当者が既に存在する場合 ... エラーを返さなければならない（MUST）」と定めており、この MUST 要件は並行アクセス下では保証されない。 | CRM 用途の現実的な並行度では発生確率が低く、既存アーキテクチャの許容トレードオフとして継続するならば、spec.md の MUST 要件に「ベストエフォートによる重複防止（厳密なトランザクション保証は提供しない）」と注釈を加えること。厳密に保証するには、T-20 の `findContactsByClientId` + `createContact` を同一トランザクション内で実行するか、DB ユニーク部分インデックス (`WHERE is_primary = true`) を追加すること。 |
| 4 | LOW | 監査ログ欠如（既存問題） | `src/app/actions/clients.ts` `updateClientContactAction` | `updateClientContactAction` は usecase をバイパスして `clientRepository.updateContact` を直接呼び出すため、isPrimary 変更を含む contact 更新に監査ログが残らない。spec では「usecase バイパス構造を維持」と明示しており、この問題は本リクエストのスコープ外と認識されている。しかし isPrimary 変更はビジネス上重要なイベント（主担当者の変更）であり、監査ログの欠如は将来の問題追跡を困難にする。 | 本リクエストのスコープ外で問題なし。ただし tasks.md T-27 に「contact 更新の監査ログ記録は別途フォローアップ対象」と明記し、認識済み負債として記録することを推奨する。 |
| 5 | LOW | ドキュメント不整合 — request.md 要件4の内部参加者 userId 記述 | `specrunner/changes/domain-model-alignment/request.md` (要件4) | request.md 要件4は内部参加者の変換形式を `{ userId: value, name: value, isExternal: false }` と記述しており、`userId: value` は name 文字列（人名）が userId に設定されることを示唆する。ユーザーリクエスト本文の追記（「既存の internal 要素は人名文字列であり UUID ではないため、userId には null を設定する」）は request.md に取り込まれていない。設計書（design.md D3）・spec.md シナリオ・tasks.md T-33(e) SQL はいずれも `userId: null` と正しく記述しているため、実装への影響は軽微。 | request.md 要件4の記述を `{ userId: null, contactId: null, name: value, isExternal: false }` に修正することを推奨するが、後続ドキュメントで正しく補正されているため必須ではない。 |

## レビュー概要

### 正常に確認された事項

- **テナント分離**: 新規追加される `findAllByInquiry`（T-12）は `organizationId` を引数に含み WHERE 条件にも付与されている。`createMeeting` の inquiryId 存在確認（T-18）も `inquiryRepository.findById(inquiryId, data.organizationId)` を使い正しくスコープされている。`findContactsByClientId` は organizationId を引数に持たないが、呼び出し元（T-20 usecase の事前 `findById`、T-27 action の事前 `findById`）でテナント検証済みとなっており、ドキュメントに前提条件が明記されている。
- **監査ログ完全性**: `createClientContact` usecase（T-20）への isPrimary 追加は既存の監査ログ記録パスを維持する。`createMeeting` usecase（T-18）の inquiryId 対応も既存の transaction + auditLog パターンを維持する。
- **マイグレーション SQL**: T-33(e) の attendees JSON 変換 SQL は internal・external の両サブクエリに `COALESCE(jsonb_agg(...), '[]'::jsonb)` が適用されており、空配列の場合も正しく `'[]'::jsonb` を返す。NULL 連結（`NULL || jsonb`）によるデータ損失は発生しない。`WHERE attendees ? 'internal'` 条件により新形式の行は変換対象外となり、migration の冪等性も確保されている。
- **isPrimary シナリオ網羅**: spec.md に「別の担当者を isPrimary=true に更新する→エラー」「自身を isPrimary=true のまま更新する→成功」の両シナリオが記述されており、自己除外ロジックの仕様が明確化されている。
- **schema.ts attendees default 更新**: T-02 の Acceptance Criteria に「meetings テーブルの attendees の schema default が `[]`（空配列）である」が含まれており、Drizzle の default 値と migration 後の新形式が一致する。
- **pgEnum 型安全性**: inquirySourceEnum を pgEnum として定義することで、DB レベルで不正値の混入が防止され、承認ポリシーの条件評価が信頼可能になる。セキュリティ観点での改善。
- **OWASP Top 10**: A01（認可）はテナント分離で対処済み。A03（インジェクション）は Drizzle ORM のパラメタライズドクエリで防止。A07（認証）は全 Server Action が session チェックを維持。A08（データ整合性）はマイグレーション前の UPDATE により既存データを保護。特段の新規リスクなし。
