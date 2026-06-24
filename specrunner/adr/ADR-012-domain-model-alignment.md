# ADR-012: ドメインモデルの設計整合 — スキーマ・型・マイグレーションの設計判断

- **Status**: accepted
- **Date**: 2026-06-24
- **Change**: domain-model-alignment
- **Deciders**: architect

---

## Context

ドメイン設計書（`docs/design/01-domain-design.md`）と実装の間に複数のモデル定義乖離が蓄積していた。具体的には以下の状態だった。

1. **inquiries テーブル**: `budget` / `timeline` カラムがなく、引き合い受付時の見込み情報を記録できない。`source` カラムが `text` 型で列挙型制約なし。
2. **meetings テーブル**: `inquiryId` がなく `dealId` が NOT NULL 必須のため、引き合い段階（Deal 未作成）の商談を記録できない。`attendees` が `{ internal: string[], external: string[] }` 形式で参加者の識別が困難。
3. **deals テーブル**: `description` カラムがなく、案件の詳細説明を保持できない。
4. **contracts テーブル**: `amount` と `startDate` が nullable のため、契約金額・開始日を必須とする売上管理の起点として不十分。
5. **invoices テーブル**: `issueDate`（請求予定日）がなく `invoicedAt`（発行実行タイムスタンプ）と使い分けができない。
6. **ClientContact**: isPrimary の一意性を保証するアプリケーション層のバリデーションが存在しない。

これらのスキーマ変更・型変換・既存データマイグレーションには複数の設計判断が含まれ、後続変更への制約を明確にするため ADR として記録する。

なお、ADR-011 D4 で「meetings は `inquiryId` と `dealId` のどちらか一方を必須としてアプリ層のみで防御する」という判断がなされていた。本変更ではこれを発展させ、DB レベルの CHECK 制約を追加している（詳細は D2 参照）。

---

## Decisions

### D1: inquiries.source を text 型から pgEnum に変更する

**Decision**: `inquiries.source` カラムの型を `text` から pgEnum `inquiry_source`（`web | phone | email | referral | agent_service | exhibition | other` の 7 値）に変更する。マイグレーションで enum に含まれない既存値は `other` にフォールバックする。

**Rationale**:
- text 型のままでは不正な値が DB に混入しうる。承認ポリシーの条件評価（例: `source eq "agent_service"` を条件とするルーティング）が不確実になる。
- pgEnum にすることで DB レベルで値を制約し、アプリ層とデータ層の二重防御が成立する。

**Migration strategy**:
1. `CREATE TYPE inquiry_source AS ENUM (...)` でenum型を作成する
2. `UPDATE inquiries SET source = 'other' WHERE source NOT IN (...)` で不正値をフォールバックする
3. `ALTER TABLE inquiries ALTER COLUMN source TYPE inquiry_source USING source::inquiry_source` でカラム型を変更する
4. Drizzle Kit の自動生成では手順 2（既存データ変換）が生成されないため、マイグレーション SQL を手動編集する

#### Alternative 1: text 型のままアプリ層でバリデーション

| | |
|---|---|
| **Pros** | DB マイグレーションが不要 |
| **Cons** | 直接 SQL を実行した場合に不正値が混入する。承認ポリシーの条件評価の確実性が下がる |
| **Why not** | DB 制約が弱い状態は将来の承認ルーティングバグの温床になる |

---

### D2: meetings の dealId / inquiryId を両方 nullable + DB CHECK 制約（ADR-011 D4 の発展）

**Decision**: meetings テーブルの `dealId` を nullable に変更し、`inquiry_id`（uuid, nullable, FK → inquiries.id）を追加する。DB レベルの CHECK 制約 `deal_id IS NOT NULL OR inquiry_id IS NOT NULL` を追加する。

**Rationale**:
- ADR-011 D4 では「アプリ層のみで防御する」という判断だったが、DB レベルでも両方 null のレコード作成を防ぐことで防御を強化する。
- Drizzle での CHECK 制約記述が複雑（ADR-011 での選択理由）という問題は、手動 SQL 編集で解決できる。
- 引き合い段階（Deal 未作成）の商談を記録するユースケースが本変更で具体化したため、スキーマ整合を優先する。

**ADR-011 D4 との関係**: 「両方 null のレコードが DB レベルで作れる余地が残る」という ADR-011 の注記を解消する。CHECK 制約により DB レベルでも強制される。

**Constraint**: マイグレーション SQL に手動で `ALTER TABLE meetings ADD CONSTRAINT meetings_deal_or_inquiry_check CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL)` を追加すること。Drizzle Kit は CHECK 制約を自動管理しないため、Drizzle スキーマ定義と DB の実態が乖離することに注意。

#### Alternative 1: 中間テーブルで多対多

| | |
|---|---|
| **Pros** | 将来 1 商談が複数の引き合い・案件に紐づくケースに対応できる |
| **Cons** | 1 商談は 1 つの文脈（引き合い or 案件）にしか属さない業務フローでは過剰設計 |
| **Why not** | シンプルさを優先する |

#### Alternative 2: dealId 必須を維持する（ADR-011 以前の設計）

| | |
|---|---|
| **Pros** | スキーマ変更が不要 |
| **Cons** | 引き合い段階の商談が記録できない |
| **Why not** | 業務上必要なユースケースが成立しない |

---

### D3: attendees の JSON 構造を配列形式に変更する

**Decision**: `meetings.attendees` の JSON 構造を `{ internal: string[], external: string[] }` から `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>` に変更する。既存データを SQL の jsonb 変換でマイグレーションする。

**Rationale**:
- 旧構造では参加者が名前文字列のみで、ユーザー（internal user）や顧客担当者（client contact）との紐づけができない。
- 新構造により将来的な参加者の識別・リンク（userId / contactId の充填）が可能になる。

**Migration strategy**:
- 既存の `internal` 要素は人名文字列（UUID ではない）のため `userId: null` に設定する。userId の紐づけは移行後に UI から行う運用とする。
- WHERE 条件 `attendees ? 'internal'` で旧形式のレコードのみを対象とする（冪等性の確保）。

**Constraint**: `createMeeting` および `updateMeeting` の usecase とアクション層は常に新形式（配列）で attendees を書き込むこと。旧形式（`{ internal, external }`）での書き込みを禁止する。

#### Alternative 1: 旧構造を維持して userId フィールドを追加

| | |
|---|---|
| **Pros** | マイグレーション量が少ない |
| **Cons** | `internal` / `external` のグルーピングと `isExternal` フラグが重複し、構造に矛盾が生じる |
| **Why not** | 構造の一貫性を犠牲にしてまで旧構造を維持する理由がない |

---

### D4: contracts.amount に DB CHECK 制約 `> 0` を入れない

**Decision**: `contracts.amount` と `contracts.start_date` を NOT NULL に変更する。既存 null データには amount=0、startDate=createdAt をデフォルト設定するマイグレーションを作成する。`amount > 0` の CHECK 制約は DB に入れず、新規作成時のアプリケーション層（`createContract` usecase）でのみ検証する。

**Rationale**:
- NOT NULL 変更前に `UPDATE contracts SET amount = 0 WHERE amount IS NULL` を実行する。その結果、DB に amount=0 のレコードが存在することになる。
- `amount > 0` の CHECK 制約を同一マイグレーションで追加すると、直前に設定した amount=0 のレコードが制約違反になる。

**Trade-off**: DB レベルでは amount=0 のレコードが引き続き作れる余地が残る。アプリ層の検証のみで `amount > 0` を保証する。将来すべての既存データが正規化された段階で DB 制約を追加することを検討してもよい。

**Constraint**: `createContract` usecase では amount が未指定または 0 以下の場合にエラーを返すこと。Deal の `estimatedAmount` からのフォールバック後に null となった場合もエラーとすること。

#### Alternative 1: CHECK 制約を追加する

| | |
|---|---|
| **Pros** | DB レベルで amount > 0 を保証できる |
| **Cons** | amount=0 のマイグレーションデータとの制約違反が発生する。2ステップのマイグレーション（0→正の値への UPDATE → CHECK 制約追加）が必要になり複雑 |
| **Why not** | 現時点では 0 データとの互換を優先し、将来に制約強化を委ねる |

---

### D5: issueDate と invoicedAt を使い分ける

**Decision**: `invoices.issue_date`（timestamp, nullable）を追加する。`invoicedAt` は「発行処理を実行した日時（ステータス遷移時の自動設定）」として維持し、`issueDate` は「請求予定日（ユーザーが指定する業務上の日付）」として使い分ける。

**Rationale**:
- 現行の `invoicedAt` はステータスが `invoiced` に遷移した際に自動設定されるタイムスタンプであり、「いつ発行したか」の記録として正しい。
- 請求スケジュール管理（「来月末に発行予定」等）には別途予定日が必要であり、`invoicedAt` を予定日として流用することはできない。

**Constraint**: `invoicedAt` を「請求予定日」として使用する実装は禁止する。請求予定日には `issueDate` を使うこと。

#### Alternative 1: invoicedAt を請求予定日として流用する（カラム追加なし）

| | |
|---|---|
| **Pros** | カラム追加が不要。既存フィールドで要件を満たせる |
| **Cons** | `invoicedAt` はステータスが `invoiced` に遷移した際にシステムが自動設定するタイムスタンプであり、ユーザーが業務上指定する「予定日」とは性質が根本的に異なる。1 つのフィールドが「発行実行日時（自動）」と「請求予定日（手動）」の2つの意味を持ち、コードを読む人が混乱する |
| **Why not** | システムが自動設定するタイムスタンプと、ユーザーが業務上指定する予定日を同一フィールドで表現することはドメインモデルの混乱を招く。将来の請求スケジュール管理機能の拡張も困難になる |

---

### D6: validatePrimaryUniqueness を domain service 層に配置する

**Decision**: `src/domain/services/clientContactService.ts` に `validatePrimaryUniqueness(existingPrimaryCount: number, contactId: string | undefined, isPrimary: boolean): void` を新設する。この関数は純粋関数であり、DB アクセスを行わない。

**Rationale**:
- 「同一 client に isPrimary=true の担当者が複数存在しない」というルールは複数の ClientContact にまたがるビジネスルールであり、domain service の責務。
- 純粋関数として実装することで、ユニットテストが DB 依存なしに書ける（`requestTransition.ts` / `dealTransition.ts` と同じパターン）。

**Calling pattern**:
- `createClientContact` usecase: usecase 内で repository から `existingPrimaryCount` を取得し、この関数を呼ぶ。
- `updateClientContactAction`: usecase をバイパスする既存実装を維持し、action 内で直接この関数を呼ぶ（usecase 経由への書き換えは本変更のスコープ外）。

**Constraint**: 将来 `updateClientContactAction` を usecase 経由に書き換える際は、usecase 内での `validatePrimaryUniqueness` 呼び出しに統一し、action 内の直接呼び出しを削除すること。

#### Alternative 1: usecase 内にバリデーションをインライン実装する

| | |
|---|---|
| **Pros** | 新規ファイルが不要でシンプル。`createClientContact` usecase 内で repository から既存 isPrimary 数を取得して直接チェックする実装になる |
| **Cons** | isPrimary 一意性はビジネスルールであり、usecase ロジックとして散在させると `updateClientContactAction`（usecase バイパス構造）でも同じロジックを重複実装する必要がある。複数の呼び出し経路でロジックが乖離するリスクがある |
| **Why not** | 複数の ClientContact にまたがるビジネスルールは domain service の責務。純粋関数として実装することで、DB 依存なしにユニットテストが書ける（`dealTransition.ts` / `requestTransition.ts` と同じパターンを踏襲する） |

#### Alternative 2: DB の UNIQUE 制約でクライアントごとの isPrimary 一意性を保証する

| | |
|---|---|
| **Pros** | DB レベルで一意性が保証され、アプリ層のバグに依らない |
| **Cons** | isPrimary=false のレコードが複数存在するため、単純な UNIQUE 制約は使えない。部分インデックス（`WHERE is_primary = true`）が必要になり、既存の Drizzle スキーマ管理との整合が複雑になる |
| **Why not** | 部分インデックスの管理コストとマイグレーションリスクに比べてアプリ層検証で十分な保証が得られる |

---

### D7: マイグレーション戦略 — Drizzle Kit generate + 手動 SQL 編集

**Decision**: スキーマ変更を `schema.ts` に反映した後、`drizzle-kit generate` でマイグレーション SQL を生成する。自動生成できないデータ変換（source enum フォールバック、attendees JSON 変換、amount/startDate のデフォルト値設定、CHECK 制約追加）は手動で SQL を編集する。

**Rationale**:
- Drizzle Kit はカラム追加・型変更の DDL は生成できるが、既存データの変換やカスタム制約は手動編集が必要。
- DB リセット禁止ポリシー（memory: feedback_db_migration_only）に従い、差分マイグレーションのみで対応する。

**手動編集が必要な SQL の順序**:
1. `UPDATE inquiries SET source = 'other' WHERE source NOT IN (...)` （enum フォールバック）→ `CREATE TYPE inquiry_source` → `ALTER COLUMN source TYPE inquiry_source`
2. `UPDATE meetings SET attendees = ... WHERE attendees ? 'internal'`（JSON 変換）
3. `UPDATE contracts SET amount = 0 WHERE amount IS NULL` → `ALTER COLUMN amount SET NOT NULL`
4. `UPDATE contracts SET start_date = created_at WHERE start_date IS NULL` → `ALTER COLUMN start_date SET NOT NULL`
5. `ALTER TABLE meetings ADD CONSTRAINT meetings_deal_or_inquiry_check CHECK (...)`

**Constraint**: 上記の UPDATE → DDL の順序を厳守すること。UPDATE を DDL の後に実行すると NOT NULL 制約または enum 型制約と衝突してマイグレーションが失敗する。

---

## Consequences

### Positive

- 引き合い（Inquiry）に予算・時期・発生経路の型制約が揃い、引き合い情報の品質が担保される
- 引き合い段階の商談を meetings テーブルに記録できるようになり、営業活動の全履歴が統合して管理できる
- 参加者構造が名前文字列から識別子付きオブジェクト配列になり、将来の参加者リンク機能の基盤が整った
- 契約金額・開始日が必須化され、売上管理の起点として contracts テーブルが機能するようになる
- isPrimary の一意性保証が明示的なドメインサービスで管理されるようになる

### Negative / Trade-offs

- **contracts.amount=0 が DB レベルで許容される**: D4 の判断により、アプリ層を経由しない INSERT（例: 直接 SQL）では amount=0 のレコードが作れる。承認前に `amount > 0` の検証を必要とする運用では、この制約の弱さに注意する。
- **meetings の CHECK 制約が Drizzle スキーマと乖離する**: CHECK 制約は手動 SQL で追加されており、`schema.ts` の Drizzle 定義には反映されていない（Drizzle Kit が管理しない）。`drizzle-kit push` 等を誤って実行しても CHECK 制約は削除されないが、スキーマ定義と DB 実態のドキュメント上の乖離として残る。
- **attendees の userId がすべて null**: マイグレーション後、既存商談の internal 参加者は名前文字列のみで userId が null。ユーザー紐づけは UI から手動で行う運用になる。

### Constraints for future changes

- **InquirySource への値追加**: `schema.ts` の `inquirySourceEnum` と `src/domain/models/inquiry.ts` の `InquirySource` 型の両方を更新すること。DB マイグレーションで `ALTER TYPE inquiry_source ADD VALUE '...'` が必要。
- **meetings の attendees 書き込み**: 常に `Array<{ userId, contactId, name, isExternal }>` 形式を使うこと。`{ internal, external }` 形式への書き込みを禁止する。
- **meetings 作成・更新**: `dealId` または `inquiryId` のどちらか一方を必ず渡すこと。両方 null は usecase がエラーを返し、DB の CHECK 制約でも拒否される。
- **contracts の新規作成**: `createContract` usecase を経由し、amount が 0 以下の場合はエラーを返すこと。usecase をバイパスした直接 INSERT では amount=0 が通過してしまう。
- **invoicedAt の用途**: ステータス遷移時の自動設定タイムスタンプとして維持すること。「請求予定日」の用途には必ず `issueDate` を使うこと。
- **updateClientContactAction の将来リファクタ**: usecase 経由に書き換える際は `validatePrimaryUniqueness` の呼び出しを usecase 内に移し、action 内の直接呼び出しを削除すること。

---

## References

- `specrunner/changes/domain-model-alignment/design.md` — 詳細設計（D1〜D7）
- `specrunner/changes/domain-model-alignment/request.md` — 要件定義
- `specrunner/adr/ADR-011-domain-restructuring.md` — 本 ADR が発展させる設計判断（D4: meetings の dealId nullable 化とアプリ層バリデーション）
- `src/infrastructure/schema.ts` — inquiries / meetings / deals / contracts / invoices テーブル定義、inquirySourceEnum
- `drizzle/0002_goofy_thanos.sql` — 本変更のマイグレーション SQL（手動編集済み）
- `src/domain/models/inquiry.ts` — InquirySource 型（7 値）、Inquiry 型（budget / timeline 追加）
- `src/domain/models/meeting.ts` — MeetingAttendee 型（新形式）、Meeting 型（inquiryId 追加）
- `src/domain/models/invoice.ts` — Invoice 型（issueDate 追加）
- `src/domain/services/clientContactService.ts` — validatePrimaryUniqueness 実装
- `src/application/usecases/createMeeting.ts` — inquiryId / dealId の排他バリデーション
- `src/application/usecases/createContract.ts` — amount > 0 のアプリ層検証
