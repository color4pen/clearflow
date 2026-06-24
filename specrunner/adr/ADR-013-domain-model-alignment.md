# ADR-013: ドメインモデルの設計整合に関する設計判断

- **Status**: accepted
- **Date**: 2026-06-24
- **Change**: domain-model-alignment
- **Deciders**: architect

---

## Context

ドメイン設計書（`docs/design/01-domain-design.md`）と実装の間に以下の乖離が蓄積していた。

1. **InquirySource の型制約なし**: `inquiries.source` は text 型で DB レベルの値制約がなく、不正な値の挿入を防げない。承認ポリシー条件評価（`source eq "agent_service"`）の確実性に問題があった。
2. **Meeting の CHECK 制約なし**: ADR-011 D4 で `meetings.dealId` を nullable 化し `meetings.inquiryId` の NOT NULL を外したが、「どちらか一方は必須」というドメインルールはアプリケーション層のみで防御されており、DB レベルの保証がなかった。
3. **attendees JSON 構造が設計と乖離**: `{ internal: string[], external: string[] }` 構造では参加者をユーザー ID・顧客担当者 ID に関連づけられず、将来の通知・アクセス制御要件に対応できない。
4. **clientContact.isPrimary の重複防止なし**: 同一クライアント内に isPrimary = true の担当者が複数存在できる状態だった。
5. **フィールド欠落**: `inquiries.budget / timeline`、`deals.description` がスキーマ・モデル型に存在しなかった。

本 ADR は上記の整合対応で行った設計判断を記録する。ADR-011 D4（meetings の CHECK 制約をアプリ層のみで実装）を DB レベル CHECK 制約の追加により上書きする。

---

## Decisions

### D1: inquirySourceEnum を pgEnum として新設する

**Decision**: `inquiries.source` を text 型から pgEnum 型（型名: `inquiry_source`）に変更する。値は `web | phone | email | referral | agent_service | exhibition | other` の 7 値。マイグレーションで enum に含まれない既存値を `other` にフォールバックしてからカラム型を変更する。

**Rationale**:
- text 型では DB に直接 SQL で不正な値を挿入できる。承認ポリシー条件評価（`source eq "agent_service"`）が DB 側の値に依存するため、制約が弱いと評価結果の正確性が損なわれる。
- pgEnum により DB レベルで値が保証され、TypeScript の型とも対応関係が明確になる。

#### Alternative 1: text 型のままアプリケーション層でバリデーション

| | |
|---|---|
| **Pros** | 値の追加が enum 変更（DDL）なしで可能 |
| **Cons** | 直接 SQL での不正値挿入を防げない。DB を信頼できる真実の源として扱えない |
| **Why not** | 承認ポリシー評価が DB の値に直接依存するため、DB 制約のない text 型では信頼性の保証が不十分 |

#### Alternative 2: CHECK 制約で許容値を列挙

| | |
|---|---|
| **Pros** | enum 型変更（`ALTER TYPE`）なしで値追加が可能 |
| **Cons** | 型としての意味が不明確。TypeScript との対応関係も手動で維持が必要 |
| **Why not** | 値追加時に `ALTER TABLE ... DROP CONSTRAINT / ADD CONSTRAINT` が必要で enum と同等のコスト |

**Migration strategy**: `CREATE TYPE inquiry_source AS ENUM (...)` → enum 外の既存値を `other` に UPDATE → `ALTER TABLE inquiries ALTER COLUMN source TYPE inquiry_source USING source::inquiry_source`。

---

### D2: Meeting の dealId / inquiryId 制約に DB レベル CHECK 制約を追加する（ADR-011 D4 の上書き）

**Decision**: ADR-011 D4 で確立した「`meetings.dealId` nullable + `meetings.inquiryId` nullable」の構造を維持したうえで、DB レベルの CHECK 制約 `CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL)` を追加する。これにより「どちらか一方は必須」というドメインルールを DB レベルで保証する。

**ADR-011 D4 との関係**: ADR-011 D4 は「DB の CHECK 制約で表現するには Drizzle での記述が複雑になるため、アプリ層バリデーションで対応する」としていた。本変更ではアプリ層バリデーション（`createMeeting` usecase）は維持しつつ、加えて migration SQL で CHECK 制約を手動追加することで二重の防御を実現する。

**Rationale**:
- アプリ層バリデーションのみでは ORM バイパス（直接 SQL・マイグレーション時のバルク操作）でドメインルール違反データが混入するリスクが残る。
- 引合段階の商談（`inquiryId` のみ）と案件化後の商談（`dealId` のみ）の両方が存在する実運用データに対して、integrity 保証がより重要になった。

**Drizzle との齟齬に対する Mitigation**: Drizzle のスキーマ定義に CHECK 制約を記述しないため、`drizzle-kit push` 実行時に制約が消える可能性がある。`drizzle-kit generate / migrate` 運用を維持し、`push` 運用に移行しないことで対処する。

#### Alternative 1: アプリ層バリデーションのみ（ADR-011 D4 の継続）

| | |
|---|---|
| **Pros** | Drizzle との齟齬なし |
| **Cons** | 直接 SQL で両方 null のレコードが作成できる。データ整合性をアプリ層のみに依存 |
| **Why not** | 実運用データの増加に伴い DB 側の integrity 保証の重要性が高まった |

#### Alternative 2: 中間テーブル（meeting_contexts）で文脈を管理

| | |
|---|---|
| **Pros** | 1:N 関係の表現が明確 |
| **Cons** | 1 商談は 1 文脈（引合 or 案件）に属するため正規化が過剰。JOIN が増えクエリが複雑になる |
| **Why not** | 単純な nullable FK + CHECK 制約で十分 |

---

### D3: attendees の JSON 構造を配列形式に変更する

**Decision**: `meetings.attendees` の JSONB 構造を `{ internal: string[], external: string[] }` から `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>` に変更する。マイグレーションで既存データを変換する（`internal` の要素は `{ userId: null, contactId: null, name: <value>, isExternal: false }` に、`external` の要素は `{ userId: null, contactId: null, name: <value>, isExternal: true }` に変換）。

**Rationale**:
- 旧構造（名前の文字列配列）では参加者をユーザー（`users`）や顧客担当者（`client_contacts`）に関連づけられない。
- `userId` / `contactId` を nullable にすることで、既存エンティティへの紐づけを持たない自由入力参加者も扱える。
- 配列形式により参加者ごとのプロパティ（isExternal 等）の追加が型安全に行える。

#### Alternative 1: 別テーブル（meeting_attendees）で正規化

| | |
|---|---|
| **Pros** | SQL で参加者クエリが可能（`WHERE userId = ?` 等） |
| **Cons** | 実装コストが高い。現時点で参加者を条件にした検索要件が存在しない |
| **Why not** | JSONB のクエリで現在の要件は十分対応できる。参加者検索要件が具体化した時点で別テーブル化を検討する |

**Migration strategy**: JSONB 操作を使った UPDATE 文で既存行を一括変換。開発環境のシードデータは制御下にあるため実質リスクは低い。本番環境では migration 前にデータ検証クエリを実行する。

---

### D4: isPrimary 重複防止をアプリケーション層で実装する

**Decision**: 同一 `client_id` 内で `is_primary = true` の `client_contacts` が複数存在しないことを、domain service の検証関数（`validateIsPrimaryUniqueness`、`src/domain/services/clientContactValidation.ts`）で保証する。`createClientContact` / `updateClientContact` usecase の isPrimary = true 時に呼び出す。

**Rationale**:
- DB の部分一意制約（`CREATE UNIQUE INDEX ... WHERE is_primary = true`）は Drizzle の宣言的スキーマで表現しにくく、将来の `drizzle-kit generate` でインデックスが消える可能性がある。
- アプリケーション層での実装ならビジネスルールに沿ったエラーメッセージを返せる。
- 現時点では direct SQL によるデータ挿入よりもアプリ経由の操作が支配的なため、アプリ層防御で十分。

#### Alternative 1: DB 部分一意制約

| | |
|---|---|
| **Pros** | DB レベルで制約が保証される |
| **Cons** | Drizzle との相性が悪く、DB エラーをアプリ層でハンドリングする必要がある。エラーメッセージのカスタマイズが困難 |
| **Why not** | Drizzle の管理外となりスキーマの正本が分散する |

#### Alternative 2: isPrimary を clients テーブルの primaryContactId カラムに移す

| | |
|---|---|
| **Pros** | 一意性が構造上保証される |
| **Cons** | スキーマ変更が大きく、既存の clientContacts 構造を壊す |
| **Why not** | 変更コストに対して得られる保証が不釣り合い |

---

### D5: Drizzle migration を generate + 手動編集のハイブリッドで作成する

**Decision**: スキーマ変更を `schema.ts` に反映した後、`bunx drizzle-kit generate` でベースの migration SQL を生成し、以下の手動編集を加える:
1. `CREATE TYPE inquiry_source AS ENUM (...)` + 既存データのフォールバック UPDATE + `ALTER COLUMN source TYPE`
2. `meetings.attendees` JSONB データ変換の UPDATE 文
3. `ALTER TABLE meetings ADD CONSTRAINT meetings_deal_or_inquiry_check CHECK (...)` の手動追加

**Rationale**: Drizzle Kit は (a) enum の新規作成と既存 text カラムからの型変換、(b) JSONB データ変換、(c) CHECK 制約の自動生成に対応しないため、手動編集が不可避。生成されたベース SQL に手動パッチを当てるハイブリッド方式が生産性・正確性のバランスが最も良い。

---

## Consequences

### Positive

- `inquiries.source` が DB レベルで型制約を持ち、承認ポリシー条件評価の信頼性が向上した
- `meetings` の dealId/inquiryId 整合がアプリ層と DB 層の二重防御になり、データ integrity が強化された
- `attendees` が参加者の ID 紐づけをサポートする構造になり、将来の通知・アクセス制御要件の基盤が整った
- `inquiries.budget / timeline` の追加により引合段階での予算・時期情報の記録が可能になった
- `deals.description` の追加により案件詳細の自由記述が可能になった

### Negative / Trade-offs

- **CHECK 制約と Drizzle の齟齬**: `meetings_deal_or_inquiry_check` は Drizzle スキーマ定義に存在しないため、`drizzle-kit push` を実行すると制約が消える。`generate / migrate` 運用を継続すること（ADR-011 D4 リスクの継続）。
- **attendees データ変換のリスク**: 変換 SQL が想定外の JSON 構造に遭遇した場合、migration が失敗する可能性がある。本番環境では migration 前にデータ検証クエリを実行すること。
- **inquirySourceEnum の将来的な値追加コスト**: enum への値追加は `ALTER TYPE ... ADD VALUE` が必要。text 型より変更コストが高い。

### Constraints for future changes

- **InquirySource の値追加**: `schema.ts` の `inquirySourceEnum` と `src/domain/models/inquiry.ts` の `InquirySource` 型を同時に更新すること。DB マイグレーションで `ALTER TYPE inquiry_source ADD VALUE '...'` が必要
- **Meeting の作成・更新**: `dealId` と `inquiryId` の少なくとも一方を必ず渡すこと。両方 null は DB の CHECK 制約によって拒否される。`createMeeting` / `updateMeeting` usecase のアプリ層バリデーションも維持すること
- **meetings.attendees の読み書き**: 配列形式 `Array<{ userId, contactId, name, isExternal }>` を正本とする。旧形式 `{ internal, external }` への互換処理は不要（migration 済み）
- **drizzle-kit push の禁止**: `meetings_deal_or_inquiry_check` CHECK 制約が消えるため、`drizzle-kit generate / migrate` 運用を維持すること
- **isPrimary の更新**: `updateClientContact` usecase で isPrimary = true に変更する場合は `validateIsPrimaryUniqueness` を呼び出すこと。直接リポジトリ経由での更新時は呼び出し側で同様の検証を行うこと

---

## References

- `specrunner/changes/domain-model-alignment/design.md` — 詳細設計（D1〜D5）
- `specrunner/changes/domain-model-alignment/request.md` — 要件定義
- `specrunner/adr/ADR-011-domain-restructuring.md` — D4: Meeting の dealId/inquiryId nullable 化（本 ADR の D2 が CHECK 制約を追加して上書き）
- `src/infrastructure/schema.ts` — inquiries/meetings/deals テーブル定義、inquirySourceEnum
- `src/domain/models/inquiry.ts` — InquirySource 型（7 値 pgEnum に対応）
- `src/domain/models/meeting.ts` — MeetingAttendee 型（配列形式に対応）
- `src/domain/services/clientContactValidation.ts` — validateIsPrimaryUniqueness 実装
- `src/application/usecases/createClientContact.ts`, `updateClientContact.ts` — isPrimary バリデーション呼び出し
- `drizzle/0003_*.sql` — 本変更の migration SQL（手動編集を含む）
