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
| 1 | MEDIUM | Task description accuracy | `tasks.md` T-11 / `src/__tests__/usecases/meetingManagement.test.ts` | `meetingManagement.test.ts` は `mock.module` を使わない純粋静的解析テスト（`readSrc`/`toContain`）であり、T-11 の「`meetingRepository` のモックを `interactionRepository` に変更する」という記述は実態と噛み合わない。T-03 で `meetingRepository.ts` が削除されるため、`readSrc("infrastructure/repositories/meetingRepository.ts")` は実行時に FileNotFound になる。`bun test` で自然に顕在化するが、実装者が誤って mock.module 追加を試みてテスト構造を破壊するリスクがある。 | T-11 の当該ファイルに関する記述を「`readSrc` の対象パスを `interactionRepository.ts` に変更し、`Meeting` 型を `Interaction` 型に更新する。静的 assert の対象メソッド名（`findAllByInquiry` 等）は `interactionRepository` が同名で提供するため記述内容は維持でよい」と具体化する。 |
| 2 | LOW | Spec coverage gap | `spec.md` / `tasks.md` T-07, T-12 | `createActionItem` usecase が `interactionId` パラメータを受け取るよう変更される（T-07）が、spec.md に対応する Requirement/Scenario が存在しない。T-12 はテストを作成するが、spec の裏付けなしにテストを定義することになる。 | spec.md に `### Requirement: createActionItem が interactionId で顧客接点に紐づく` シナリオを 1 件追加する。または T-12 の `createActionItem テスト` を `listActionItemsByMeeting` Requirement の既存 Scenario に統合し説明を補足する。 |
| 3 | LOW | Implementation ambiguity | `tasks.md` T-05 / T-08 | `hearingData → details` のパラメータ変換ポイントが曖昧。T-08 は「Server Action が `hearingData` を維持し、usecase 受け渡し時に `details` として渡す（usecase 側で mapping）」と述べるが、T-05 は `createMeeting.ts` 更新において `hearingData` → `details` のリネームを明示しない。usecase の公開シグネチャが `hearingData` を保持するのか `details` に変わるのかが不明確。TypeScript 型チェックが最終的に整合性を保証するが、実装の迷いを生む。 | T-05 の `createMeeting.ts` 更新タスクに「`hearingData` パラメータ名をそのまま usecase 引数として維持し、`interactionRepository.create` への受け渡し時に `details` キーとして渡す」または「usecase パラメータ名を `details` にリネームし、Server Action 側で変換する」のいずれかを明示する。 |
| 4 | LOW | Spec-code consistency | `spec.md` — TIMELINE_ACTIONS/NOTIFICATION_ACTIONS Scenario | spec.md の「TIMELINE_ACTIONS が interaction.create を含む」および「NOTIFICATION_ACTIONS が interaction.create を含む」の Scenario は Given/When/Then 形式で記述されているが、当該 Scenario は設定ファイルの静的内容確認（`toContain` 相当）と等価であり、動的実行テストによる振る舞い固定の精神（request.md テスト方針）からは外れる。誤読で静的検査テストに変換されるリスクがある。 | Scenario を「getDealActivity を呼び出したとき findByTargets に `interaction.create` を含む includeActions が渡される」に書き直し、TIMELINE_ACTIONS の内容確認ではなく usecase 呼び出しの動的 assert として表現する。または注記で「この Scenario は activityConfig を import して値を参照する軽量動的テストで確認する」と明示する。 |

## Review Summary

### 検証対象

`request.md` / `design.md` / `spec.md` / `tasks.md` の 4 ファイル、および参照コードベースを照合した。

---

### spec.md の完全性・整合性

**Requirement 網羅性（verified）**

request.md の要件 #1〜#6 がそれぞれ spec.md の Requirement に対応していることを確認した。

- 要件 #1（interactions テーブル化）→ "Interaction スキーマ定義が interactions テーブルとして定義される" + "action_items の meeting_id が interaction_id にリネームされる"
- 要件 #2（ドメインモデル / リポジトリ）→ "Interaction ドメインモデルが kind と関連先を持つ" + 各 CRUD Requirement
- 要件 #3（監査）→ "商談の作成が interaction.create として記録される" + "商談の更新が interaction.update 監査ログを記録する"
- 要件 #4（タイムライン整合）→ "getDealActivity が interaction と meeting の両 targetType を targets に含める"
- 要件 #5（通知整合）→ "getNotifications が interaction と meeting の両 targetType を targets に含める"
- 要件 #6（UI）→ CRUD Requirement の "外部から見た商談の作成振る舞いは不変" で包含

**SHALL/MUST normative keyword（verified）**

全 10 Requirement に英語の SHALL が含まれていることを確認した。

**Scenario の Given/When/Then 形式（verified）**

全 Scenario が Given/When/Then 形式で記述されており、実行テストによる assert に直接マッピング可能。

---

### design.md の判断妥当性

**D1（テーブルリネーム + ADD COLUMN）**: rename + ADD COLUMN 方式の選択は妥当。全コピー＆drop によるデータ欠落リスクを排除している。drizzle-kit 対話確認の問題と CI パイプライン非適用の判断も適切。

**D2（interaction_kind enum）**: DB レベルの型安全性を保つ enum 選択は設計ドキュメントのユビキタス言語辞書と一致。将来 kind 追加時の拡張も enum ADD VALUE で対応可能。

**D3（nullable FK + CHECK）**: 既存の `meetings_deal_or_inquiry_check` を自然に一般化した設計。FK による参照整合性を保持しつつ 5 種の関連先を許容できる。

**D4（カラムリネーム戦略）**: `type → meeting_type`、`hearing_data → details` のリネームは一般化後の意味明確性を高める。`action_items` jsonb は変更不要の判断も合理的。

**D5〜D6（監査ログの追記専用 + 双方 targetType 戦略）**: 既存 `meeting.*` 監査ログを書き換えず、新規は `interaction.*` で記録する方針は監査ログの append-only 原則に正しく従っている。`getDealActivity` / `getNotifications` の targets に両 targetType を含める D6 戦略により、移行前後の履歴を漏れなく表示できる。

**D7（LegacyMeetingActionItem 改名）**: `src/domain/models/meeting.ts` の `ActionItem`（jsonb 構造）と `src/domain/models/actionItem.ts` の `ActionItem`（エンティティ）の名前衝突は実在することをコードベースで確認。改名方針は妥当。

**D8（kind フィルタ方針）**: 現時点では全 interaction が kind=meeting のため kind フィルタ不要の判断は YAGNI として適切。TODO コメントによる将来への橋渡しも明確。

**D9（認可エンティティ名の維持）**: `"meeting"` エンティティ名の維持はスコープ制限として合理的。本リクエストの変更範囲を超える波及を防ぐ。

---

### tasks.md の実装カバレッジ

T-01〜T-13 が以下のすべてをカバーしていることを確認した。

- スキーマ定義の一般化（T-01）
- ドメインモデル・監査型の追加（T-02）
- interactionRepository の作成・meetingRepository 削除（T-03）
- actionItemRepository の migration_id 更新（T-04）
- 全 usecase の interactionRepository 切り替え（T-05〜T-07）
- Server Action の更新（T-08）
- UI コンポーネントの型更新（T-09）
- usecase index 整合（T-10）
- 既存テストの更新（T-11）
- 新規 dynamic テストの作成（T-12）
- ビルド・型・lint 全通過確認（T-13）

Finding #1 として指摘した T-11 の記述精度を除き、実装に必要な変更はすべて列挙されている。

---

### セキュリティレビュー（OWASP Top 10）

**A01 Broken Access Control**: 全 repository 関数が `organizationId` によるテナント分離を維持。`findById(id, organizationId)` の署名は変更なし。認可チェック `canPerform(..., "meeting", ...)` も維持（D9）。問題なし。

**A02 Cryptographic Failures**: 暗号処理への影響なし。

**A03 Injection**: Drizzle ORM のパラメータ化クエリを引き続き使用。新カラム（`kind`、`contract_id`、`invoice_id`、`client_id`、`details`）もすべて Drizzle の型安全な API 経由で操作される。`details` jsonb は `HearingData | null` で型付けされ、任意の user input を生 SQL に渡す経路はない。問題なし。

**A04 Insecure Design**: audit log の append-only 原則を遵守。`interaction.create`/`interaction.update` に `metadata.kind` を含めることでアクション文脈が明確になり、監査の証跡性が向上する。問題なし。

**A05 Security Misconfiguration**: 新たなテーブル・FK に適切な CHECK 制約と index を設定。テナント分離 index も維持・追加される。問題なし。

**A07 Identification and Authentication Failures**: 新規認証面の追加なし。Server Action の認証チェックは変更なし。問題なし。

**A09 Security Logging and Monitoring Failures**: 監査ログの粒度が向上（`metadata.kind` 追加）。既存ログの後方互換も保持される。問題なし。

その他 OWASP Top 10 項目（A06 VCWA、A08 Software Integrity Failures、A10 SSRF）は本変更の対象外。

**総合**: セキュリティ上の懸念事項なし。
