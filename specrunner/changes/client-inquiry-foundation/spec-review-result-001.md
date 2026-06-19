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
| 1 | MEDIUM | Security | tasks.md (T-11) | `updateInquiryStatusAction` にレート制限が仕様化されていない。`createClientAction`・`createInquiryAction` や既存のすべての状態変更 Server Action（`submitRequestAction` 等）と異なり、`checkRateLimit()` 呼び出しが仕様から省かれている。`converted` 遷移は terminal state のため単一引き合いへの繰り返し適用は防がれるが、`in_progress` 遷移など全ロールに許可されたステータス変更を高速に繰り返すことができる。また `converted` 時は承認リクエストを自動作成するため、既存の rate-limited `createInquiry` の上限まで引き合いを作成してから連続変換することで多数の Request を短時間に生成できる。 | T-11 の `updateInquiryStatusAction` 仕様に `checkRateLimit()` 呼び出しを追加する（例: `key: "statusChange:${session.user.id}"`、RATE_LIMITS に `statusChange: { limit: 20, windowMs: 60_000 }` を追加）。 |
| 2 | MEDIUM | Security | tasks.md (T-11) | `updateInquiryStatusAction` に Zod 入力バリデーションが仕様化されていない。`newStatus`（InquiryStatus 列挙値であることの確認）・`inquiryId`（UUID 形式の確認）・`templateId`（UUID 形式の確認）のスキーマ検証が記述されておらず、不正値がそのままユースケース／リポジトリ層へ渡される。既存の `submitRequestAction(requestId, formData)` も同様だが、新規コードでは明示的に仕様化すべき。無効 UUID が `inquiryRepository.findById` へ渡るとDB例外が発生し、エラーメッセージに内部詳細が漏洩するリスクがある。 | T-11 に `updateInquiryStatusAction` 用の Zod スキーマを追加する。`newStatus: z.enum(["new","in_progress","converted","declined"])`、`templateId: z.string().uuid().optional()`。`inquiryId` は関数引数のため `z.string().uuid()` で早期バリデーションを行う。バリデーション失敗時は `{ success: false, message: "入力が不正です" }` を返す。 |
| 3 | MEDIUM | DataIntegrity | tasks.md (T-08) | `createInquiry` ユースケースが `clientId` の存在確認（`clientRepository.findById(clientId, organizationId)`）のみを行い、`contactId` が指定 `clientId` に属するかどうかを検証していない。UI は顧客選択に応じた担当者ドロップダウンを表示するが、サーバーサイドではクライアント A に属する連絡先をクライアント B の引き合いに紐づけることが可能になり、同一組織内のデータ整合性が崩れる（引き合い詳細ページで誤った担当者情報が表示される）。 | T-08 の仕様に検証ステップを追加する。「`contactId` が提供された場合、`clientRepository.findContactsByClientId(clientId, tx)` の結果に `contactId` が含まれることを確認する。含まれない場合は `{ ok: false, reason: "指定された担当者は顧客に属していません" }` を返す。」 |
| 4 | LOW | Validation | tasks.md (T-11) | `createClientAction` の contacts 配列 Zod スキーマで `email` フィールドが `optional()` のみであり、形式検証（`z.string().email()`）が含まれていない。無効なメールアドレス文字列が `client_contacts` テーブルに保存される可能性がある。 | `contacts` 配列要素の `email` を `z.string().email("メールアドレスの形式が正しくありません").optional()` に変更する。 |
| 5 | LOW | Validation | tasks.md (T-11, T-13) | `name`、`notes`、`description`、`title` 等のフリーテキストフィールドに最大長制限が仕様化されていない（`min(1)` のみ）。PostgreSQL の `text` 型は上限なしのため、意図的に長大な文字列を送信してストレージ/レンダリングに影響を与えることができる。 | 各テキストフィールドに `max()` を追加する（例: `name: z.string().min(1).max(255)`、`description: z.string().max(2000).optional()`、`title: z.string().min(1).max(255)`）。値は既存 `createRequest` の Zod スキーマと揃える。 |

## Summary

仕様全体の構造・整合性・セキュリティ設計は堅実。以下の点を確認した。

- **テナント分離**: `organizationId` をセッションから取得し全クエリに付与する要件が request.md・tasks.md・spec.md で一貫して仕様化されている
- **認証**: 全 Server Action に `auth()` チェックが明記されており、既存パターンと整合している
- **権限制御**: `converted` 遷移のみ admin/manager に制限する設計（D9）は、ビジネス要件と整合しており Server Action 層で適切に実装される
- **IDOR 防止**: `clientId` の組織所有確認は仕様化されている。UUID v4 ランダム性により他組織の ID 推測攻撃は実質不可能
- **依存方向**: domain 層が infrastructure を知らないことが spec.md・tasks.md で一貫して要求されている
- **SQL インジェクション**: Drizzle ORM のパラメータ化クエリにより防止されている
- **CSRF**: Next.js Server Actions のフレームワーク機能で保護されている
- **監査ログ**: 顧客作成・引き合い作成・ステータス変更すべてでトランザクション内ログが要求されている
- **楽観ロック**: 新テーブルに `version` カラムを追加しない設計は D1〜D10 で明示的に判断済みであり、引き合いの更新頻度・並行性要件から妥当

MEDIUM 所見 3 件はいずれもデータ整合性・防御的コーディングに関するものであり、機能的破綻や cross-tenant 漏洩を引き起こさない。`approved` とするが、実装時に上記 5 件の対処を推奨する。
