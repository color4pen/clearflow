# ドメインモデルの設計整合

## Meta

- **type**: spec-change
- **slug**: domain-model-alignment
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: スキーマ変更（カラム追加・nullable 変更）、列挙型の拡張、既存データへのマイグレーション → true -->

## 背景

ドメイン設計書（docs/design/01-domain-design.md）と現在の実装の間にモデル定義の乖離が多数ある。引合に予算・時期のフィールドがない、商談が引合に紐づけられない、契約金額が nullable で売上管理の起点にならない、など。設計書に合わせてスキーマとモデルを整合させる。

## 現状コードの前提

- `src/infrastructure/schema.ts:265-281` — inquiries テーブルに budget / timeline カラムなし。source は text 型で列挙型制約なし
- `src/infrastructure/schema.ts:284-304` — meetings テーブルに inquiryId カラムなし。dealId は notNull で必須。attendees は `{ internal: string[], external: string[] }` 構造
- `src/infrastructure/schema.ts:296` — actionItems の assignee は string 型（設計では assigneeId: ID）
- `src/infrastructure/schema.ts:307-334` — deals テーブルに description カラムなし
- `src/infrastructure/schema.ts:48-52` — dealPhaseEnum に estimate_approval が含まれていない
- `src/infrastructure/schema.ts:356-382` — contracts テーブルの amount は nullable（`integer("amount")`）、startDate も nullable
- `src/infrastructure/schema.ts:384-402` — invoices テーブルに issueDate カラムなし。invoicedAt がステータス遷移時のタイムスタンプとして存在
- `src/domain/models/meeting.ts` — MeetingAttendees 型が `{ internal: string[], external: string[] }` 構造
- `src/domain/models/inquiry.ts` — InquirySource 型に email / agent_service がない

## 要件

1. **Inquiry に budget / timeline を追加**: inquiries テーブルに `budget integer` (nullable) と `timeline text` (nullable) カラムを追加する。Inquiry モデル型にも反映する
2. **InquirySource の拡張**: inquirySourceEnum を pgEnum として定義し、`web | phone | email | referral | agent_service | exhibition | other` の 7 値とする。既存の text 型 source カラムをこの enum に変更する。マイグレーションで既存データのうち enum に含まれない値は `other` にフォールバックする
3. **Meeting に inquiryId を追加**: meetings テーブルに `inquiry_id uuid` (nullable, FK → inquiries.id) を追加する。dealId を nullable に変更する。CHECK 制約 `deal_id IS NOT NULL OR inquiry_id IS NOT NULL` を追加する。Meeting モデル型に inquiryId を追加する
4. **Meeting の Attendee 構造を変更**: attendees の JSON 構造を `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>` に変更する。マイグレーションで既存データを変換する（internal の要素は `{ userId: value, name: value, isExternal: false }` に、external は `{ name: value, isExternal: true }` に）
5. **Deal に description を追加**: deals テーブルに `description text` (nullable) カラムを追加する。Deal モデル型にも反映する
6. **Contract の amount / startDate を NOT NULL に変更**: contracts テーブルの amount を NOT NULL に変更する。既存の null データにはデフォルト値 0 を設定するマイグレーションを作成する。startDate も NOT NULL に変更し、既存 null データには createdAt の値を設定する。CHECK 制約 `amount > 0` は新規作成時にアプリケーション層で検証する（既存の 0 データとの互換のため DB 制約にはしない）
7. **Invoice に issueDate を追加**: invoices テーブルに `issue_date timestamp` (nullable) カラムを追加する。invoicedAt は「実際に発行処理を行った日時」として残し、issueDate は「請求予定日」として使い分ける。Invoice モデル型に issueDate を追加する
8. **ClientContact の isPrimary 検証**: ClientContact の作成・更新時に、同一 client_id 内で isPrimary = true が複数存在しないことをアプリケーション層で検証する関数を追加する

## スコープ外

- Deal の extra フィールド（assigneeId, technicalLeadId, estimateRequestId, notes, version）の削除判断
- DealPhase への estimate_approval 追加（フェーズの自由遷移方針のもとで要否を別途検討）
- actionItems の assignee 型変更（string → userId の変更は影響範囲が大きいため別リクエスト）
- スキーマの updatedAt / version カラムの削除（運用上有用なため残す）

## 受け入れ基準

- [ ] inquiries テーブルに budget / timeline カラムが存在する
- [ ] inquiries.source が pgEnum 型になっている（7 値）
- [ ] meetings テーブルに inquiry_id カラムが存在し、dealId が nullable になっている
- [ ] meetings に CHECK 制約（deal_id OR inquiry_id が NOT NULL）が存在する
- [ ] meetings の attendees JSON 構造が新形式に変換されている
- [ ] deals テーブルに description カラムが存在する
- [ ] contracts.amount と contracts.start_date が NOT NULL になっている
- [ ] invoices テーブルに issue_date カラムが存在する
- [ ] isPrimary の重複チェックがアプリケーション層に実装されている
- [ ] 既存データのマイグレーションが正常に完了する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **source を pgEnum に変更** — text のままだと不正な値が入りうる。enum にすることで承認ポリシーの条件評価（source eq "agent_service"）が確実になる。却下案: text + アプリ層バリデーション — DB 制約が弱い
2. **Meeting の dealId / inquiryId を両方 nullable + CHECK 制約** — 引合段階の商談と案件化後の商談を統一的に扱える。却下案: 中間テーブルで多対多 — 1 商談は 1 つの文脈に属するため過剰。却下案: dealId 必須のまま — 引合段階の商談が記録できない
3. **Contract の amount にDB制約 `> 0` を入れない** — 既存の null → 0 マイグレーションとの整合を取るため、アプリ層で新規作成時に検証する。将来すべてのデータが正規化された後にDB制約を追加してもよい
