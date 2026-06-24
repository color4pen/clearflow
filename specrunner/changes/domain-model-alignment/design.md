# Design: ドメインモデルの設計整合

## Context

ドメイン設計書と現在の実装の間にモデル定義の乖離がある。引合テーブルに budget / timeline カラムがなく、source が text 型で列挙型制約がない。商談テーブルに inquiryId がなく dealId が NOT NULL 必須で、引合段階の商談を記録できない。attendees の JSON 構造が `{ internal: string[], external: string[] }` で参加者の識別が困難。契約テーブルの amount / startDate が nullable で売上管理の起点として不十分。請求テーブルに issueDate がなく、発行予定日と実行日時の使い分けができない。

現状のコードベース:
- `schema.ts` の inquiries テーブルに budget / timeline カラムがない。source は `text("source")` で型制約なし
- `schema.ts` の meetings テーブルに inquiryId がない。`dealId` は `.notNull()` で必須。attendees は `{ internal: string[], external: string[] }` 構造
- `schema.ts` の deals テーブルに description カラムがない
- `schema.ts` の contracts テーブルで `amount` と `startDate` が nullable（`.notNull()` なし）
- `schema.ts` の invoices テーブルに issueDate がない。invoicedAt は発行実行時のタイムスタンプ
- `domain/models/inquiry.ts` の InquirySource は `"web" | "phone" | "referral" | "exhibition" | "other"` の 5 値（email / agent_service がない）
- `domain/models/meeting.ts` の MeetingAttendees は `{ internal: string[]; external: string[] }` 型
- `domain/services/clientContactService.ts` は存在しない。isPrimary の重複チェックがない
- `createClientContact` usecase に isPrimary パラメータがない。`updateClientContactAction` が usecase をバイパスして `clientRepository.updateContact` を直接呼んでいる
- Drizzle Kit でマイグレーション管理。`drizzle/` 配下に SQL ファイルが生成される
- UI コンポーネント（`MeetingInfoSection.tsx`、`DealMeetingForm.tsx`、meetings action）が attendees の `{ internal, external }` 構造を前提としている

## Goals / Non-Goals

**Goals**:
- inquiries テーブルに `budget` (integer, nullable) と `timeline` (text, nullable) カラムを追加し、Inquiry モデル型に反映する
- inquirySourceEnum を pgEnum として定義し 7 値（web / phone / email / referral / agent_service / exhibition / other）とする。既存 text 型 source カラムをこの enum に変更する
- meetings テーブルに `inquiry_id` (uuid, nullable, FK → inquiries.id) を追加し、dealId を nullable に変更する。CHECK 制約 `deal_id IS NOT NULL OR inquiry_id IS NOT NULL` を追加する
- meetings の attendees JSON 構造を `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>` に変更する
- deals テーブルに `description` (text, nullable) カラムを追加する
- contracts の amount / startDate を NOT NULL に変更する（既存 null データのデフォルト値マイグレーション付き）
- invoices テーブルに `issue_date` (timestamp, nullable) カラムを追加する
- `clientContactService.ts` に `validatePrimaryUniqueness` 関数を新設する

**Non-Goals**:
- Deal の extra フィールド（assigneeId, technicalLeadId, estimateRequestId, notes, version）の削除判断
- DealPhase への estimate_approval 追加
- actionItems の assignee 型変更（string → userId）
- スキーマの updatedAt / version カラムの削除
- `updateClientContactAction` の usecase 経由への書き換え（本リクエストでは action 内で直接 validatePrimaryUniqueness を呼ぶ）

## Decisions

### D1: source を pgEnum に変更 — DB レベルで列挙値を制約する（architect 決定済み）

**決定**: inquiries.source を text 型から pgEnum `inquiry_source`（7 値）に変更する。マイグレーションで既存データのうち enum に含まれない値は `other` にフォールバックする。

**理由**: text のままだと不正な値が混入しうる。enum にすることで承認ポリシーの条件評価（例: `source eq "agent_service"`）が確実になる。

**代替案**: text + アプリ層バリデーション — DB 制約が弱く、直接 SQL を実行した場合に不正値が入る。

**マイグレーション戦略**: (1) pgEnum を CREATE TYPE する (2) 既存の text カラムを enum に含まれない値を `other` に UPDATE する (3) カラム型を pgEnum に ALTER する。Drizzle Kit の `drizzle-kit generate` はカスタム SQL が必要なため、生成後に手動でマイグレーション SQL を編集する。

### D2: Meeting の dealId / inquiryId を両方 nullable + CHECK 制約（architect 決定済み）

**決定**: meetings テーブルの dealId を nullable に変更し、inquiryId (uuid, nullable, FK → inquiries.id) を追加する。CHECK 制約 `deal_id IS NOT NULL OR inquiry_id IS NOT NULL` で少なくとも一方を必須とする。

**理由**: 引合段階の商談（まだ Deal が存在しない）と案件化後の商談を統一的に meetings テーブルで扱える。

**代替案 (却下)**:
- 中間テーブルで多対多 — 1 商談は 1 つの文脈（引合 or 案件）に属するため過剰
- dealId 必須のまま — 引合段階の商談が記録できない

**アプリケーション層の対応**: createMeeting usecase の引数を `dealId` 必須から `dealId | inquiryId` のいずれか必須に変更する。バリデーションで両方 null の場合をエラーとする。

### D3: attendees の JSON 構造を配列に変更 — 参加者の識別性を向上

**決定**: attendees の JSON 構造を `{ internal: string[], external: string[] }` から `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>` に変更する。

**理由**: 現行構造では参加者が名前文字列のみで、ユーザーや顧客担当者との紐づけができない。新構造により将来的な参加者の識別・リンクが可能になる。

**マイグレーション**: 既存データを SQL の jsonb 変換で新形式に変換する。internal の要素は `{ userId: null, contactId: null, name: value, isExternal: false }`、external は `{ userId: null, contactId: null, name: value, isExternal: true }` にマッピングする。既存の internal 要素は人名文字列であり UUID ではないため userId に null を設定する。

**UI への影響**: `MeetingInfoSection.tsx`、`DealMeetingForm.tsx`、meetings action の attendees 構築ロジックを新構造に対応させる。UI は引き続き名前文字列で入力を受け付け、内部で新構造オブジェクトに変換する。

### D4: Contract の amount に DB 制約 `> 0` を入れない（architect 決定済み）

**決定**: contracts.amount と startDate を NOT NULL に変更する。既存の null データには amount=0、startDate=createdAt をデフォルト設定するマイグレーションを作成する。`amount > 0` の CHECK 制約は DB に入れず、新規作成時にアプリケーション層で検証する。

**理由**: 既存の null → 0 マイグレーション後に DB 制約 `> 0` を入れると、マイグレーションで設定した 0 のデータが制約違反になる。将来すべてのデータが正規化された後に DB 制約を追加する選択肢を残す。

**アプリケーション層の変更**: createContract usecase で amount が未指定または 0 以下の場合にエラーを返すバリデーションを追加する。Contract モデル型の amount を `number`（非 nullable）に変更する。

### D5: issueDate と invoicedAt の使い分け

**決定**: invoices テーブルに `issue_date` (timestamp, nullable) を追加する。invoicedAt は「実際に発行処理を行った日時」として残し、issueDate は「請求予定日」として使い分ける。

**理由**: 請求スケジュール管理には予定日が必要だが、現行の invoicedAt はステータス遷移時のタイムスタンプ（発行実行時に自動設定）であり、予定日としては使えない。

### D6: validatePrimaryUniqueness の配置 — domain service 層

**決定**: `src/domain/services/clientContactService.ts` に `validatePrimaryUniqueness` 関数を新設する。この関数は「同一 client に isPrimary=true の担当者が既に存在するか」を検証する。

**理由**: isPrimary の一意性は複数の ClientContact にまたがるビジネスルールであり、domain service の責務。ただし DB アクセスが必要なため、検証に必要なデータ（既存の isPrimary 担当者数）は呼び出し元（usecase or action）が repository から取得して渡す形式にする。

**呼び出しパターン**: (1) `createClientContact` usecase に isPrimary パラメータを追加し、usecase 内で validatePrimaryUniqueness を呼ぶ。(2) `updateClientContactAction` は既存の usecase バイパス構造を維持し、action 内で直接 validatePrimaryUniqueness を呼ぶ。

### D7: マイグレーション戦略 — Drizzle Kit generate + 手動 SQL 編集

**決定**: スキーマ変更を `schema.ts` に反映した後、`drizzle-kit generate` でマイグレーション SQL を生成する。自動生成できないデータ変換（source enum フォールバック、attendees JSON 変換、amount/startDate のデフォルト値設定、CHECK 制約）は手動で SQL を編集する。

**理由**: Drizzle Kit はカラム追加・型変更の DDL は生成できるが、既存データの変換やカスタム制約は手動編集が必要。DBリセットは禁止されているため、差分マイグレーションのみで対応する。

## Risks / Trade-offs

**[Risk] attendees の JSON 構造変更が UI 全体に波及する**
→ Mitigation: 変更が必要な UI コンポーネントは `MeetingInfoSection.tsx`、`DealMeetingForm.tsx`、meetings action の 3 ファイルに限定される。MeetingAttendee 型を新設し、旧構造への参照を型チェックで検出する。

**[Risk] source の text → enum 変更で既存データに enum 外の値が存在する可能性**
→ Mitigation: マイグレーション SQL で enum に含まれない値を `other` にフォールバックする UPDATE を ALTER TYPE の前に実行する。

**[Risk] contracts.amount を NOT NULL に変更すると、既存 null データがある場合にマイグレーションが失敗する**
→ Mitigation: NOT NULL 変更の前に `UPDATE contracts SET amount = 0 WHERE amount IS NULL` を実行する。startDate も同様に `UPDATE contracts SET start_date = created_at WHERE start_date IS NULL` を先に実行する。

**[Risk] CHECK 制約 `deal_id IS NOT NULL OR inquiry_id IS NOT NULL` が Drizzle Kit で自動管理されない**
→ Mitigation: マイグレーション SQL に手動で `ALTER TABLE meetings ADD CONSTRAINT meetings_deal_or_inquiry_check CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL)` を追加する。

**[Trade-off] createContract usecase の amount 必須化で既存のフロー（amount 未指定での契約作成）が壊れる**
→ Mitigation: createContract の引数型を `amount: number`（必須）に変更する。Deal の estimatedAmount を初期値として使う現行のフォールバックは維持するが、フォールバック結果が null の場合はエラーを返す。

## Open Questions

なし（architect 評価済みの設計判断により主要な論点は解決済み）。
