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
| 1 | LOW | Security | spec.md — Requirement: トークンエンドポイント / tasks.md T-06, T-18 | 認可コード交換時の `client_id` 不一致・`redirect_uri` 不一致を拒否する negative シナリオが spec.md に存在しない。T-06 の実装バリデーション（「clientId 一致」「redirectUri 一致」）は記述されているが、対応する spec シナリオ・T-18 のテストケース記載がなく、実装者が省略しても受け入れ基準を満たすと判断できてしまう。PKCE が主要な防御層として機能するため即時ブロッカーではないが、OAuth Security BCP §4.1 の多重防衛（defense-in-depth）として token exchange の client_id / redirect_uri 検証は明文化が望ましい。 | spec.md「トークンエンドポイント」要件に 2 つのシナリオを追加することを推奨: (1) **Given** 有効な認可コードが存在する / **When** 認可リクエストと異なる `client_id` でトークン交換を試みる / **Then** 400 + `error=invalid_client`。(2) **Given** 有効な認可コードが存在する / **When** 認可リクエストと異なる `redirect_uri` でトークン交換を試みる / **Then** 400 + `error=invalid_grant`。T-18 の oauthFlow.test.ts にも対応するテストケースを追加する。 |
| 2 | LOW | Security | tasks.md T-11 | 同意フォーム（POST `/api/oauth/authorize`）の CSRF 対策が Auth.js セッション Cookie の `SameSite=Lax` に暗黙依存しており、仕様内で明記されていない。Auth.js v5 のデフォルトは `SameSite=Lax` であり、cross-site POST リクエストはセッション Cookie を送信しないため実質的に安全だが、将来の Auth.js 設定変更やミドルウェア変更により保護が失われるリスクがある。 | T-11 または design.md（D7 セクション）に「同意エンドポイントの CSRF 対策は Auth.js セッション Cookie の `SameSite=Lax` により担保される。この前提が維持される限り、追加の CSRF トークンは不要」と注記することを推奨。explicit な CSRF トークンの実装は不要だが、前提条件の記録により将来の変更時のリスクが可視化される。 |
| 3 | LOW | Completeness | tasks.md T-18 | CORS プリフライトテストケースが T-18 のテストファイル一覧（oauthFlow / oauthConnections / oauthMetadata）に明示されていない。spec.md には CORS を SHALL 要件として 2 つのシナリオが追加されているが、T-18 の "src/__tests__/oauth/" 以下のどのファイルにも CORS 検証が割り当てられていない。T-10/T-12 の Acceptance Criteria に「OPTIONS プリフライトに 204 が返る」が含まれるため機能実装は担保されるが、統合テストとして回帰テスト化されない可能性がある。 | T-18 の `oauthMetadata.test.ts` の項目に「`/api/oauth/register` と `/api/oauth/token` への OPTIONS プリフライトが適切な CORS ヘッダ付きで 204 を返す」を追記することを推奨。これにより spec.md の CORS シナリオが T-18 を経由して統合テストとして固定される。 |
| 4 | LOW | Security | spec.md — Requirement: 動的クライアント登録 / tasks.md T-04 | `redirect_uri` のスキーム制限（非 localhost・非カスタムスキームは HTTPS 必須）が spec に記載されていない。T-04 は「redirectUris: 1 つ以上の有効な URL」とのみ記述しており、HTTP スキームの redirect_uri が許可されてしまう。RFC 9700 §8.4.2 は本番環境での HTTP redirect_uri（非 localhost）を禁止する。claude.ai は HTTPS を使用するため実運用への即時影響は低いが、HTTP の redirect_uri を持つ悪意あるクライアントが登録された場合、認可コードが平文で漏洩するリスクがある。 | T-04 の `redirectUris` バリデーション要件に「`http://` スキームは `localhost` および `127.0.0.1` のみ許容し、それ以外は `https://` を必須とする」を追記することを推奨。spec.md の動的クライアント登録 Requirement にも同条件を SHALL として追記する。 |

## 前回レビュー（spec-review-result-001）の対応確認

| # | 前回 Severity | 対応状況 | 確認内容 |
|---|--------------|---------|---------|
| 1 | HIGH | ✅ 解決 | spec.md に「構文上有効だが未登録の `redirect_uri` は 400 エラーページを返す」シナリオが追加され、Requirement 本文にも RFC 9700 §4.1.2.1 への準拠が明記された |
| 2 | HIGH | ✅ 解決 | spec.md の認可コードフロー要件に「`organizationId` は Auth.js セッションから取得する（SHALL）」が明記された。T-11 にも同記述が追加された |
| 3 | MEDIUM | ✅ 解決 | T-11 が「パラメータ一式はサーバーサイドセッションに保存する。URL パラメータ渡しは改ざんリスクがあるため禁止」と明記された |
| 4 | MEDIUM | ✅ 解決 | spec.md に「ブラウザ発 OAuth エンドポイントに CORS ヘッダを設定する」要件が SHALL として追加され、T-10/T-12 に OPTIONS ハンドラと CORS ヘッダの実装が明記された |
| 5 | LOW | ✅ 解決 | spec.md の「トークンエンドポイント」要件に「期限切れ認可コードを拒否する」シナリオが追加された。T-18 にもテストケースが追記された |
| 6 | LOW | ✅ 解決 | T-14 が「`/api/` 配下は既存 matcher で除外済みのため `/api/oauth/` の明示除外は不要、`/.well-known/` のみ追加が必要」と修正された |

## Summary

前回レビュー（spec-review-result-001）で指摘した HIGH 2 件・MEDIUM 2 件・LOW 2 件の全所見が適切に対応されている。今回の再レビューで新たに発見した所見は LOW 4 件のみで、いずれも仕様の根本的な欠陥ではなく、テスト網羅性の向上・セキュリティ前提条件の文書化・軽微な防衛強化に関するものである。

主要セキュリティ要件（PKCE S256 必須・リフレッシュトークンローテーション + 再利用検知・opaque トークン + ハッシュ保存・オープンリダイレクト防止・同意パラメータのサーバーサイド保持・CORS 設定）は仕様として適切に固定されており、実装上の重大なリスクはない。

本仕様は実装開始可能な水準に達している。LOW 所見の対応は実装フェーズ中のタスク調整として処理可能であり、仕様の再承認は不要。
