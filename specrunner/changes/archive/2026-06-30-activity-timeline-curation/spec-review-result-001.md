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
| 1 | LOW | シナリオ欠落 | spec.md | Requirement「状態遷移アクションは変更前→変更後を表示」のシナリオとして `deal.updatePhase`・`contract.updateStatus` のみ記載されており、`invoice.update_status` の UI 表示シナリオが省略されている。要件テキストと T-09 では 3 アクション明記されているため機能的欠落ではないが、テストシナリオとして非対称。 | spec.md に「請求ステータス変更の遷移表示」シナリオを追加する（`metadata: { fromStatus: "scheduled", toStatus: "invoiced" }` → 「請求ステータスを変更：予定 → 請求済」）。実装時は T-09 の遷移表示テストで invoice も対象に含めること。 |
| 2 | LOW | 仕様の表現曖昧 | spec.md | Requirement「連続する状態遷移が正味の遷移に集約される」の散文部分（"the first entry's 'from' to the last entry's 'to'"）が、ログが新しい順（newest-first）で処理される文脈では「first = 最新」と誤読できる。付属シナリオとタスクの「最古エントリの from / 最新エントリの to」（T-04）で意図は確認できるが文書間で表現が不一致。 | spec.md の散文を「chronologically-first entry's 'from'（最古ログの from）から chronologically-last entry's 'to'（最新ログの to）」と明記する。実装者は T-04 の記述を優先すること。 |
| 3 | LOW | エッジケース未定義 | spec.md / tasks.md | 連続する状態遷移ログのうち一部だけ metadata を持つ場合（将来の移行期や将来アクション追加時）の集約動作が未定義。現行の対象アクションでは `deal.updatePhase`・`contract.updateStatus` は既に metadata を持ち、`invoice.update_status` は T-02 で同時対応するため実用上は発生しないが、仕様の完全性として欠落している。 | T-04 の集約ロジック記述に「連続グループ内に metadata なしエントリが混在する場合は `transition: null`（または「取得できる範囲で from/to を埋める」）」を明記する。実装時はどちらか一方に決定すること。 |
| 4 | LOW | タスク粒度曖昧 | tasks.md / T-08 | T-08 で「静的検証（readFile + toContain）のアサーションを新仕様の実装に合わせて更新する」と記述されているが、どのアサーションを残すか廃止するかが不明確。T-09 の動的テストで全振る舞いを網羅する方針と矛盾する静的テストが残存するリスクがある。 | T-08 の受け入れ基準に「T-09 で振る舞いとして検証済みの項目の静的テストを削除する」を明示し、残す静的テスト（ファイル構造上の不変条件など）と廃止するものを区別して記載する。 |

## Review Notes

### コードベース検証結果

**request.md との整合:**
- `getDealActivity.ts` の現状（action_item/deal_contact を取得対象に含み、DB 取得時に limit を適用）が要件記載と完全一致。
- `updateInvoiceStatus.ts` の `recordAudit` 呼び出しに metadata が未付与であることを確認。T-02 の対象として正確。
- `AuditMetadataMap` が `action_item.toggle`/`action_item.updateStatus` の 2 件のみであることを確認。T-01 の対象として正確。
- `auditLogRepository.findByTargets` が `includeActions` オプションを実装済み（`inArray` による Drizzle ORM パラメータ化クエリ）。D1 の前提が成立。

**design.md との整合:**
- D1（ホワイトリスト方式 + `includeActions`）: リポジトリ実装済みであり追加変更不要、正確。
- D2（`TimelineEntry` 型 + `aggregateTimeline` 純粋関数）: 依存方向（lib 層に配置し domain/infra を参照しない）を遵守できる設計。
- D3（limit を集約後に適用）: `findByTargets` の `limit` 引数は optional であり省略可能、実装可能。
- D5（`AuditMetadataMap` 追加 → `AuditRecordParams` の条件型制約が自動的に metadata 必須化）: `auditRecorder.ts` の型設計（`A extends keyof AuditMetadataMap ? { metadata: ... } : { metadata?: ... }`）を確認。既存の `updateDealPhase`・`updateContractStatus` は正しい metadata を渡しており型エラーは発生しない。

**spec.md の網羅性:**
- 7 要件すべてに Given/When/Then シナリオあり。受け入れ基準（request.md）の各項目と 1 対 1 対応を確認。
- 唯一の欠落は Finding #1 の `invoice.update_status` UI 表示シナリオ（LOW）。

**tasks.md の完全性:**
- T-01〜T-10 が論理的な依存順（型定義 → usecase → lib → UI → テスト → 検証）に並んでおり実装順序が妥当。
- T-04 の集約ロジックの記述（最古 from / 最新 to、キー名正規化 `fromPhase`/`toPhase` vs `fromStatus`/`toStatus`）が最も実装難度の高い箇所。仕様は十分だが、複数アクションのキー名分岐を `TRANSITION_ACTIONS` と組み合わせて処理するロジックを実装者が正しく書けるよう、T-04 完了後に `typecheck` を早期実行することを推奨。

**テスト方針:**
- `getNotifications.dynamic.test.ts` を参照実装として指定しており、`mock.module` パターンの具体例が既存コードに存在することを確認。T-09 の実装指針として十分。
- T-09 に「集約ロジック純粋関数テスト（`activityAggregator` 単体テスト）」が明記されており、`aggregateTimeline` の振る舞いを usecase から分離して検証できる。

### セキュリティレビュー（OWASP Top 10 観点）

| 観点 | 評価 |
|------|------|
| A01 アクセス制御 | 新規エンドポイントなし。`organizationId` による既存テナント分離を継承。`TIMELINE_ACTIONS` はサーバー側定数（ユーザー入力不可）。 |
| A03 インジェクション | `includeActions` は Drizzle ORM `inArray` により SQL パラメータ化される。`ACTIVITY_HIDDEN_ACTIONS` はカンマ分割後に `notInArray`（パラメータ化）へ渡される。注入リスクなし。 |
| A05 セキュリティ設定ミス | 新規環境変数の追加なし。`ACTIVITY_HIDDEN_ACTIONS` / `ACTIVITY_FEED_ENABLED` は既存。 |
| A07 認証・セッション | 認証レイヤー（Server Action / RSC）は変更なし。本変更は usecase/lib 層の読み取りロジックに閉じる。 |
| XSS | `transition.from`/`to` は DB 由来の固定値（フェーズ・ステータス enum）。React のデフォルトエスケープが適用される。 |

セキュリティ上のブロッキング所見はなし。

### 総合評価

仕様書セット全体（request / design / spec / tasks）の内部一貫性は高い。コードベース現状との乖離も正確に記述されており、実装者が迷う余地は限定的。発見された所見はすべて LOW であり、実装を阻害するものではない。Finding #1 の `invoice.update_status` 表示シナリオは T-09 実装時に補完可能。
