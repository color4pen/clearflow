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
| 1 | HIGH | Security | spec.md — Requirement: 認可コードフロー + PKCE | `redirect_uri` が登録済みリストに一致しない場合の挙動がシナリオとして存在しない。RFC 9700 §4.1.2.1 は、redirect_uri が未登録・不一致の場合にサーバーが当該 URI へリダイレクトすることを MUST NOT と規定する。現仕様は「redirect_uri 自体が不正な場合は 400 エラーページ」を tasks 内（T-11）に記述するのみで、「構文上は有効だが未登録の redirect_uri」を spec.md のシナリオとして扱っていない。実装者がこのケースを誤って `redirect_uri` へのリダイレクト（open redirect）で処理した場合、OWASP A01（Broken Access Control）に分類される脆弱性となる。 | spec.md の「認可コードフロー + PKCE」要件に Scenario を追加する: **Given** 登録済みでない `redirect_uri` を指定してリクエストを送信する / **When** GET /api/oauth/authorize を呼ぶ / **Then** `redirect_uri` へのリダイレクトを行わず、400 エラーページを返す（RFC 9700 §4.1.2.1 準拠）。T-11 のタスク記述も「未登録 redirect_uri → 400 エラーページ（リダイレクト不可）」と明記する。 |
| 2 | HIGH | Functional | spec.md — Requirement: 認可コードフロー + PKCE / tasks.md T-05, T-11 | マルチ組織ユーザーにおける `organizationId` の決定方法が仕様として未定義。T-05 の `authorizeOAuthClient` ユースケースは `{ userId, organizationId }` を入力として受け取るが、T-11 の authorize route / 同意画面はどこから `organizationId` を取得するかを規定していない。ユーザーが複数組織に所属する場合、どの組織の権限がトークンに紐づくかが実装者の判断に委ねられ、テナント分離の保証が曖昧になる。 | spec.md の「ログイン済みユーザーに同意画面が表示される」シナリオの Then 節に「Auth.js セッションが保持する現在の組織コンテキスト（organizationId）がトークンに紐づく」旨を明記する。T-11 にも「organizationId は Auth.js セッションの organization コンテキストから取得する」と記載する。ユーザーが単一組織に所属することが設計上の前提であれば、その旨を design.md の Context または Constraints に記載する。 |
| 3 | MEDIUM | Security | tasks.md T-11 | 同意フローにおける OAuth リクエストパラメータの完全性が未保証。T-11 は「パラメータ一式を同意画面 → POST 間で受け渡す（URL パラメータまたはセッション一時保存）」と記載するが、URL パラメータで受け渡す場合、ユーザーがブラウザで `code_challenge`・`redirect_uri`・`client_id` 等を改ざんして POST できる。改ざんされたパラメータで認可コードが発行されると、攻撃者が用意した `redirect_uri` に認可コードが漏洩する可能性がある（OAuth Security BCP §4.1）。 | T-11 の記述を「パラメータ一式はサーバーサイドセッション（Auth.js セッションまたは一時的なサーバーサイドストア）に保存する。同意画面には参照用表示データのみを渡し、POST 時はセッションからパラメータを復元してバリデーションする」に修正する。URL パラメータ渡しの選択肢を削除する。 |
| 4 | MEDIUM | Functional | tasks.md T-09, T-10, T-12 | ブラウザから呼ばれる OAuth エンドポイントに CORS 設定が記述されていない。claude.ai custom connector は、ブラウザから `/api/oauth/register`（動的クライアント登録）および `/api/oauth/token`（トークン取得）に cross-origin リクエストを送信する。CORS ヘッダ（`Access-Control-Allow-Origin`・`Access-Control-Allow-Methods`・`Access-Control-Allow-Headers`）を設定しない場合、ブラウザのプリフライトチェックが失敗し、claude.ai からの接続が一切機能しない。本要件の主目的が claude.ai 接続の実現である以上、これは機能的ブロッカーとなる。 | T-10 と T-12 に「`OPTIONS` メソッドハンドラを追加し、適切な CORS ヘッダを返す」旨を追加する。`/api/oauth/register` と `/api/oauth/token` のレスポンスに `Access-Control-Allow-Origin: *`（または claude.ai の origin）、`Access-Control-Allow-Methods: POST, OPTIONS`、`Access-Control-Allow-Headers: Content-Type` を付与する。spec.md の動的クライアント登録・トークンエンドポイントの Requirement にも CORS 対応を SHALL 要件として明記する。 |
| 5 | LOW | Completeness | spec.md — Requirement: トークンエンドポイント | 期限切れ認可コードの拒否シナリオが spec.md に存在しない。D10 で認可コードの有効期限を 10 分と定義し、T-06 で「未期限切れ検証」を実施すると記述しているが、対応する Scenario（期限切れ認可コード → 400 invalid_grant）が spec.md に含まれていない。T-18 の受け入れ基準にも記載がなく、テストケースとして固定されない。 | spec.md の「トークンエンドポイント」要件に以下の Scenario を追加する: **Given** 認可コードの有効期限（10 分）が過ぎている / **When** 期限切れのコードで POST /api/oauth/token に送信する / **Then** ステータス 400 が返り、`error=invalid_grant` が含まれる。T-18 の acceptance criteria にもこのケースを追加する。 |
| 6 | LOW | Accuracy | tasks.md T-14 | T-14 が `/api/oauth/` を proxy 除外対象として追加するよう指示しているが、既存の `proxy.ts` の matcher 設定 `/((?!api|_next/static|_next/image|favicon.ico).*)` により `/api/` 配下のパスはすでに middleware の対象外となっている。`/api/oauth/` の除外は冗長であり、実装者が混乱する可能性がある。一方、`/.well-known/` は matcher の対象内であり、除外が必要（この点は正しい）。 | T-14 の記述を「`src/proxy.ts` の除外ロジックに `pathname.startsWith("/.well-known/")` を追加する（`/api/` 配下は既存 matcher で除外済み）」に修正し、`/api/oauth/` への言及を削除する。必要であれば matcher 文字列に `well-known` を追加する方法も選択肢として記載する。 |

## Summary

spec.md のシナリオ網羅・RFC 準拠意識・テスト受け入れ基準は全体として水準が高く、PKCE・リフレッシュトークンローテーション・再利用検知の主要セキュリティ要件は適切に仕様化されている。

ただし 2 件の HIGH 所見（open redirect リスク・organizationId 決定の仕様欠如）がブロッカーとなる。特に #1（未登録 redirect_uri へのリダイレクト禁止）は明示的なシナリオなしで実装に委ねると OAuth Security BCP 違反となり得るため、spec.md へのシナリオ追加が必要。MEDIUM #4（CORS）は本機能の目的達成（claude.ai 接続）に直結する機能的ブロッカーであり、タスク内での対処が必要。

spec-fixer は HIGH 2 件・MEDIUM 2 件・LOW 2 件の修正を行い、再レビューを受けること。
