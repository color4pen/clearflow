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
| 1 | MEDIUM | Scope ambiguity | 要件3 手動リトライ | 手動リトライが「1回のみ試行」なのか「再び最大3回の exponential backoff を実行する」のかが未定義。受け入れ基準はアクセス制御しか検証していない。 | spec 生成時に明示化すること。標準的なUXとして「1回のみ試行」が妥当であり、`attempts` は既存の値に加算して更新する形とすることを推奨する。 |
| 2 | MEDIUM | Scope ambiguity | 要件3 手動リトライ + 要件2 nextRetryAt | 手動リトライ実行後の `nextRetryAt` の扱いが未定義。succeeded すれば自然に `null` になるが、failed した場合に再び `nextRetryAt` を設定するのか否か不明。 | 手動リトライは auto-retry を伴わない単発試行と定義し、失敗後の `nextRetryAt` は `null` に設定する旨を spec に記述すること。 |
| 3 | LOW | Clarity | 要件1 リトライロジック | バックオフ式 `baseDelay * 4^attempt` の `attempt` の起点（0 始まり vs 1 始まり）が不明確。例示（1s, 4s, 16s）で意図は伝わるが、実装時の混乱を防ぐため式を例示と合わせて明示することが望ましい。 | 例: 「リトライ番号 n = 1,2,3 に対して `1 * 4^(n-1)` 秒待機（1s, 4s, 16s）」と記述する。 |
| 4 | LOW | Recommended addition | 要件2 + schema.ts | `nextRetryAt` カラム追加には Drizzle migration ファイル（`drizzle/0002_*.sql`）が必要。また `WebhookDelivery` ドメインモデル（`src/domain/models/webhookDelivery.ts`）と `webhookDeliveryRepository.updateStatus` の引数型も拡張が必要。これらは実装上の当然の帰結だが、明示的な言及がない。 | 受け入れ基準に「Drizzle スキーマと domain モデルの `nextRetryAt` 定義が一致している」を追加するか、tasks.md 生成時に明示的なタスクとして分解すること。 |
| 5 | LOW | Clarity | 要件5 CSV エクスポート | 「ストリーミング出力」という表現が、ReadableStream による真のチャンク転送なのか、単に `text/csv` Content-Type で Response を返すだけなのかが曖昧。DB 全件ロード後のシリアライズと区別できない。 | デモ用途であれば全件取得後の `new Response(csv, { headers: { 'Content-Type': 'text/csv' } })` で十分。spec には「全件取得後に CSV 文字列を生成して返す」と明記することを推奨する。 |

## 検証メモ

- `src/infrastructure/webhookDelivery.ts:14-61` — 現状コードは要件の記述と完全に一致。`AbortSignal.timeout(5000)` / 単発試行 / `status:"failed", attempts:1` を確認。
- `src/infrastructure/schema.ts:134-146` — `webhook_deliveries` テーブルに `nextRetryAt` カラムが**存在しない**ことを確認。追加が必要。
- `src/infrastructure/repositories/webhookDeliveryRepository.ts` — `updateStatus` 関数に `nextRetryAt` パラメータが**ない**ことを確認。拡張が必要。
- `src/infrastructure/repositories/auditLogRepository.ts` — `create` 関数のみで `findByOrganization` が**存在しない**ことを確認。要件と整合。
- `src/infrastructure/schema.ts:73-87` — `audit_logs` テーブルに action, targetType, targetId, actorId, organizationId, metadata, createdAt が存在することを確認。CSV カラム定義と整合。
- `src/app/(dashboard)/settings/webhooks/[id]/deliveries/page.tsx` — 配信ログ画面が存在し、手動リトライボタンの追加先として適切。
- アーキテクチャ: 既存コードで `listWebhookDeliveriesAction` が直接 repository を呼んでいるが、手動リトライ（状態変更）は usecase を経由させることで受け入れ基準「依存方向遵守」を達成できる。
- `bun:test` ベースのテストが `src/__tests__/` に存在し、静的解析パターンで実装を検証する方式を確認。リトライのバックオフ間隔テストは実行可能（`bun:test` の `mock(Date, ...)` や実際の sleep を用いたタイムアウトテストで対応可能）。
