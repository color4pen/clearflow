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
| 1 | LOW | request.md 要件との差分（情報提供） | `design.md:D2` | request.md 要件2（middleware.ts 作成・proxy.ts 削除・TC-021/044/048 更新）を設計段階で覆す判断がなされている。node_modules/next/dist/docs の実ドキュメントで確認した通り Next.js 16 では `middleware` file convention は deprecated であり `proxy.ts` が正規名称のため、design.md D2 の「proxy.ts を維持する」判断は技術的に正しい。ただし承認済み request.md の要件2が未実装になることは実装者が認識しておく必要がある。 | 実装者は D2 を根拠に proxy.ts をそのまま維持すること。本 LOW は情報提供であり修正不要。 |
| 2 | LOW | spec.md のシナリオカバレッジ | `spec.md` | 「approve/reject/submit Server Actions は構造化エラーレスポンスを返す」Requirement のシナリオが `approveRequestAction` のみ明示され、`rejectRequestAction` / `submitRequestAction` の具体シナリオが存在しない。Requirement 本文は3アクションを対象と明記しているため実装上の影響は軽微だが、テストケース生成者がシナリオを参照して approve のみに注目するリスクがある。 | 実装・テスト生成時は Requirement 本文「approveRequestAction, rejectRequestAction, submitRequestAction」を根拠として3アクションすべてを対象とすること。spec.md の修正は任意。 |

## 設計レビュー詳細

### D1: db.transaction() + tx? 引数パターン

設計は技術的に健全。Drizzle の `db.transaction(async (tx) => {...})` コールバックに `tx` を渡し、リポジトリ関数の末尾に省略可能引数 `tx?: Transaction` を追加する方式。既存の非トランザクション呼び出し（`createRequest` usecase 等）は引数なしで従来通り動作する後方互換性が確保されている。`Transaction` 型を `Parameters<Parameters<typeof db.transaction>[0]>[0]` で export する設計は Drizzle の型システムを正しく活用している。

`validateTransition` と `findById` をトランザクション外に置く判断も適切。読み取り専用の操作をトランザクション外に出すことで不必要なロック保持時間を最小化している。TC-039/TC-040（validateTransition → updateStatus の順序チェック）はトランザクション追加後も `validateTransition` がソースコード上で先行するため green を維持する。

### D2: proxy.ts 維持（middleware.ts 作成を却下）

node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md を直接確認済み。同ドキュメントに "The `middleware` file convention is deprecated and has been renamed to `proxy`" と明記されており、version history でも "v16.0.0: Middleware is deprecated and renamed to Proxy" と記載されている。現在の `src/proxy.ts` は Next.js 16 の正規 file convention に準拠しており、認証ガードは正しく機能している。middleware.ts を作成すると Next.js 16 に認識されず逆に認証ガードが機能しなくなる。D2 の判断は正しい。

なお同ドキュメントには「Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone」との注記がある。本変更後も Server Actions は `await auth()` + セッション検証を維持するため、多層防御の観点で問題はない。

### D3: findByEmailForAuth リネーム

`findByEmail` を使用する呼び出し元は `src/infrastructure/auth.ts:7,36` の1箇所のみ（コード確認済み）。テストに `findByEmail` を直接参照するケースはなく、TypeScript の型チェックが変更漏れを検出する。Auth.js の `authorize` コールバックが login 時点で organizationId を知らないため organizationId 条件を付与できない事実は正確であり、命名変更で用途を限定する判断は妥当。

`src/infrastructure/repositories/index.ts` は `export * as userRepository from "./userRepository"` を使用しているため、関数リネーム後は自動的に `userRepository.findByEmailForAuth` として公開される。手動更新不要。

### D4: ActionResult 型と createRequestAction の扱い

`createRequestAction` が `useActionState` 連携のために `CreateRequestState`（フィールドレベル errors を含む）を維持する判断は正しい。UI 変更をスコープ外とする前提で一貫している。`ActionResult = { success: boolean; message?: string }` は approve/reject/submit の3アクションに適用される最小限の型で適切。

`throw new Error(result.reason)` を `return { success: false, message: result.reason }` に変更する点について：現在も内部 reason 文字列がクライアントに到達する経路があったが、変更後は Server Actions の戻り値として明示的に返す形になる。エラー情報の開示レベルに変化はなく、セキュリティ影響はない。

### D5: DATABASE_URL ガード

エラーメッセージ `"DATABASE_URL environment variable is not set"` を受け入れ基準に明記済み。non-null assertion (`!`) 削除後のガード実装は `if (!databaseUrl) { throw new Error(...) }` → `postgres(databaseUrl)` の順序で正しい。TC-029 は `export const db`, `drizzle-orm/postgres-js`, `schema` の存在を確認するため、ガード追加後も green を維持する。

### セキュリティ評価（OWASP Top 10）

| カテゴリ | 評価 |
|---------|------|
| A01 Broken Access Control | proxy.ts の認証ガードは維持。Server Actions は独立して auth チェック済み。変更なし。 |
| A02 Cryptographic Failures | 変更対象外。bcryptjs によるパスワードハッシュは auth.ts で維持。 |
| A03 Injection | Drizzle ORM のパラメータ化クエリを使用。tx 引数追加はクエリ構築を変更しない。 |
| A05 Security Misconfiguration | DATABASE_URL ガード追加により環境変数未設定時の不明瞭なエラーが解消される（改善）。 |
| A07 Identification and Authentication Failures | 多層防御を維持（proxy レベル + Server Action レベルの二重チェック）。findByEmailForAuth リネームは naming のみ。 |
| A09 Security Logging and Monitoring Failures | トランザクション導入により監査ログの原子性が保証される（改善）。ステータス更新と監査ログが必ず対になる。 |

## テスト整合性の確認

| テストケース | 変更後の状態 |
|------------|------------|
| TC-029（db.ts の export 確認） | `export const db`, `drizzle-orm/postgres-js`, `schema` は維持されるため green |
| TC-036（usecase 依存方向） | approveRequest.ts に `@/infrastructure/db` import が追加されるが infrastructure 層からの import であり依存方向に適合。green |
| TC-039/040（validateTransition → updateStatus 順序） | validateTransition はトランザクション外で先行するためソースコード上の indexOf 比較は維持。green |
| TC-011/012/013（auditLogRepository の存在） | auditLogRepository の import と呼び出しはトランザクション内に移動するが存在は維持。green |
| TC-021/044/048（proxy.ts 参照） | proxy.ts は維持されるため変更不要。green |
