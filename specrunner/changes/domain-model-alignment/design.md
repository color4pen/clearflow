# Design: ドメインモデルの設計整合

## Context

ドメイン設計書と実装の間にモデル定義の乖離がある。引合（Inquiry）に予算・時期のフィールドがない、商談（Meeting）が引合に紐づけられない、attendees の JSON 構造が設計と異なる、案件（Deal）に description がない、顧客担当者（ClientContact）の isPrimary 重複が検証されていない、などが確認されている。

現在のコードベースの状態:

- `src/infrastructure/schema.ts` — inquiries テーブルに budget / timeline カラムなし。source は text 型で pgEnum 制約なし
- `src/infrastructure/schema.ts` — meetings テーブルに inquiryId カラムなし。dealId は `.notNull()` で必須。attendees は `{ internal: string[], external: string[] }` 構造
- `src/infrastructure/schema.ts` — deals テーブルに description カラムなし
- `src/domain/models/inquiry.ts` — InquirySource 型に `email` / `agent_service` が含まれていない（5 値）
- `src/domain/models/meeting.ts` — MeetingAttendees 型が `{ internal: string[], external: string[] }` 構造

migration 0001 で meetings.inquiry_id が一度追加されたが、同 migration 内で DROP されており現状カラムは存在しない。migration 0002 で contracts.amount / contracts.start_date の NOT NULL 化と invoices.issue_date の追加は完了済み。

## Goals / Non-Goals

**Goals**:

- inquiries テーブルに budget (integer, nullable) / timeline (text, nullable) カラムを追加する
- inquiries.source を text 型から pgEnum 型（7 値: web, phone, email, referral, agent_service, exhibition, other）に変更する
- meetings テーブルに inquiry_id (uuid, nullable, FK → inquiries.id) を追加し、deal_id を nullable に変更する。CHECK 制約で少なくとも一方が NOT NULL であることを保証する
- meetings.attendees の JSON 構造を `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>` に変更する
- deals テーブルに description (text, nullable) カラムを追加する
- ClientContact の isPrimary 重複を防ぐアプリケーション層のバリデーション関数を追加する
- 全変更について差分マイグレーションを作成する（DB リセット禁止）
- 既存データを新スキーマに適合させるデータマイグレーションを含める

**Non-Goals**:

- Deal の extra フィールド（assigneeId, technicalLeadId, estimateRequestId, notes, version）の削除判断
- DealPhase への estimate_approval 追加
- actionItems の assignee 型変更（string → userId）
- contracts.amount / contracts.start_date の NOT NULL 化（migration 0002 で完了済み）
- invoices.issue_date の追加（migration 0002 で完了済み）
- UI 層の変更（Server Actions のバリデーションスキーマ更新は含むが、ページコンポーネントの変更は含まない）

## Decisions

### D1: inquirySourceEnum を pgEnum として新設する

inquiries.source を text 型から pgEnum 型に変更する。値は `web | phone | email | referral | agent_service | exhibition | other` の 7 値。

**Rationale**: text 型では不正な値の挿入を防げない。pgEnum にすることで DB レベルで値の制約が効き、承認ポリシー条件評価（source eq "agent_service"）が確実になる。

**Alternatives considered**:
- text + アプリ層バリデーション — DB 制約が弱く、直接 SQL で不正値が入る可能性がある。却下
- CHECK 制約 — 値の追加時に ALTER TABLE が必要な点は enum と同じだが、enum のほうが型としての意味が明確。却下

**Migration strategy**: マイグレーション SQL で enum 型を CREATE した後、既存データのうち 7 値に含まれない値を `other` にフォールバックしてからカラムの型を変更する。

### D2: Meeting の dealId / inquiryId を両方 nullable + CHECK 制約で設計する

meetings テーブルに `inquiry_id uuid` (nullable, FK → inquiries.id) を追加し、既存の `deal_id` を nullable に変更する。`CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL)` 制約を付与する。

**Rationale**: 引合段階の商談（まだ案件化していない）と案件化後の商談を統一テーブルで扱える。1 つの商談は 1 つの文脈（引合 or 案件）に属するため、中間テーブルでの多対多は過剰。

**Alternatives considered**:
- dealId 必須のまま — 引合段階の商談が記録できない。却下
- 中間テーブル (meeting_contexts) — 1 商談 1 文脈なので正規化が過剰。却下

**Migration note**: migration 0001 で inquiry_id が一度追加・削除されている。今回は改めて追加する。Drizzle は CHECK 制約の宣言的定義を未サポートのため、migration SQL に手動で `ALTER TABLE meetings ADD CONSTRAINT meetings_deal_or_inquiry_check CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL)` を追加する。

### D3: attendees の JSON 構造を配列形式に変更する

`{ internal: string[], external: string[] }` → `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>`

**Rationale**: 現行構造は名前の文字列配列のみで、ユーザー ID や顧客担当者 ID との紐づけができない。新構造により参加者を既存エンティティに関連づけられる。userId / contactId は nullable とし、紐づけなしの自由入力も可能にする。

**Alternatives considered**:
- 別テーブル (meeting_attendees) で正規化 — 実行コストが高く、JSONB のクエリで十分。将来の参加者検索要件が具体化した時点で検討。却下

**Migration strategy**: SQL の JSONB 操作で既存データを変換する。internal の要素は `{ userId: null, contactId: null, name: <value>, isExternal: false }` に、external の要素は `{ userId: null, contactId: null, name: <value>, isExternal: true }` に変換する。

### D4: isPrimary 重複防止をアプリケーション層で実装する

同一 client_id 内で isPrimary = true が複数存在しないことを、domain service の検証関数で保証する。

**Rationale**: DB の部分一意制約 (`CREATE UNIQUE INDEX ... WHERE is_primary = true`) は Drizzle の宣言的スキーマでは表現しにくく、エラーメッセージのカスタマイズもできない。アプリケーション層で明示的に検証し、ビジネスルールに沿ったメッセージを返す。

**Alternatives considered**:
- DB 部分一意制約 — Drizzle との相性が悪く、DB エラーをアプリケーション層でハンドリングする必要がある。却下
- isPrimary を別カラム（primaryContactId を clients テーブルに持つ） — スキーマ変更が大きく、既存の clientContacts 構造を壊す。却下

**Implementation**: `src/domain/services/clientContactValidation.ts` に `validateIsPrimaryUniqueness` 関数を配置する。usecase 層（createClientContact, updateClientContact）の isPrimary = true 時に呼び出す。

### D5: Drizzle migration は generate + 手動編集のハイブリッドで作成する

スキーマ変更を `schema.ts` に反映した後、`bunx drizzle-kit generate` でベースの migration SQL を生成し、以下の手動編集を加える:

1. inquirySourceEnum の CREATE TYPE + 既存データのフォールバック UPDATE + カラム型変更
2. attendees JSONB データ変換の UPDATE 文
3. meetings の CHECK 制約追加
4. meetings.deal_id の nullable 化に伴う既存 NOT NULL 制約の解除

**Rationale**: Drizzle Kit は enum の新規作成やデータマイグレーションの SQL を正確に生成しないため、手動編集が必要。

## Risks / Trade-offs

[Risk] attendees JSON データ変換の失敗 → 変換 SQL が想定外の JSON 構造に遭遇した場合、migration が失敗する可能性がある。Mitigation: migration 前にデータの検証クエリを実行し、想定外の構造がないことを確認する。seed データは制御下にあるため実質リスクは低い。

[Risk] inquirySourceEnum の既存データフォールバック → 現在のシードデータは `web | phone | referral | exhibition | other` の 5 値のみだが、将来的に手入力データで想定外の値が入る可能性がある。Mitigation: migration SQL で enum 外の値をすべて `other` に UPDATE してからカラム型を変更する。

[Risk] meetings.deal_id の nullable 化 → 既存コードで `meeting.dealId` を non-null として扱っている箇所がコンパイルエラーになる。Mitigation: Meeting 型を `dealId: string | null` に変更し、TypeScript コンパイラで全箇所を検出・修正する。影響範囲: meetingRepository.mapRow, meetingRepository.create, meetingRepository.findAllByDeal, createMeeting usecase, updateMeeting usecase, meetings action, seed.ts。

[Risk] CHECK 制約と Drizzle の齟齬 → Drizzle のスキーマ定義に CHECK 制約が含まれないため、将来の `drizzle-kit push` で制約が消える可能性がある。Mitigation: migration SQL で明示的に追加し、push 運用ではなく generate/migrate 運用を維持する。

## Migration Plan

1. schema.ts を更新する（全スキーマ変更を反映）
2. `bunx drizzle-kit generate` で migration SQL を生成する
3. 生成された SQL を手動編集し、データマイグレーションと CHECK 制約を追加する
4. `bunx drizzle-kit migrate` で migration を適用する
5. seed.ts を新スキーマに合わせて更新する
6. `bun run db:seed` でシードデータを再投入し検証する

Rollback: migration 適用前の DB バックアップを取得する。問題発生時は migration の逆 SQL（DROP COLUMN, ALTER TYPE 等）を手動実行する。

## Open Questions

なし
