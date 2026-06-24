# ドメインモデルの設計整合

## Meta

- **type**: spec-change
- **slug**: domain-model-alignment
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: スキーマ変更（カラム追加・nullable 変更）、列挙型の拡張、既存データへのマイグレーション → true -->

## 背景

ドメイン設計書と現在の実装の間にモデル定義の乖離がある。引合に予算・時期のフィールドがない、商談が引合に紐づけられない、Attendee 構造が設計と異なる、など。スキーマとモデルを設計に合わせて整合させる。

契約の amount/startDate の NOT NULL 化と Invoice の issueDate 追加は R05（contract-invoice-strengthen）で実施済みのため、本リクエストのスコープ外とする。

## 現状コードの前提

- `src/infrastructure/schema.ts` — inquiries テーブルに budget / timeline カラムなし。source は text 型で列挙型制約なし
- `src/infrastructure/schema.ts` — meetings テーブルに inquiryId カラムなし。dealId は notNull で必須。attendees は `{ internal: string[], external: string[] }` 構造
- `src/infrastructure/schema.ts` — deals テーブルに description カラムなし
- `src/domain/models/meeting.ts` — MeetingAttendees 型が `{ internal: string[], external: string[] }` 構造
- `src/domain/models/inquiry.ts` — InquirySource 型に email / agent_service がない
- contracts.amount と contracts.start_date は R05 で NOT NULL 化済み
- invoices.issue_date は R05 で追加済み

## 要件

1. **Inquiry に budget / timeline を追加**: inquiries テーブルに `budget integer` (nullable) と `timeline text` (nullable) カラムを追加する。Inquiry モデル型にも反映する
2. **InquirySource の拡張**: inquirySourceEnum を pgEnum として定義し、`web | phone | email | referral | agent_service | exhibition | other` の 7 値とする。既存の text 型 source カラムをこの enum に変更する。マイグレーションで既存データのうち enum に含まれない値は `other` にフォールバックする
3. **Meeting に inquiryId を追加**: meetings テーブルに `inquiry_id uuid` (nullable, FK → inquiries.id) を追加する。dealId を nullable に変更する。CHECK 制約 `deal_id IS NOT NULL OR inquiry_id IS NOT NULL` を追加する。Meeting モデル型に inquiryId を追加する
4. **Meeting の Attendee 構造を変更**: attendees の JSON 構造を `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>` に変更する。マイグレーションで既存データを変換する（internal の要素は `{ userId: null, name: value, isExternal: false }` に、external は `{ name: value, isExternal: true }` に）。既存の internal 要素は人名文字列であり UUID ではないため、userId には null を設定する
5. **Deal に description を追加**: deals テーブルに `description text` (nullable) カラムを追加する。Deal モデル型にも反映する
6. **ClientContact の isPrimary 検証**: `src/domain/services/clientContactService.ts` に `validatePrimaryUniqueness(clientId, contactId, isPrimary, tx)` 関数を新設する。createClientContact use case に isPrimary パラメータを追加し、この関数を呼び出す。updateClientContactAction が use case をバイパスしている既存問題は本リクエストでは修正せず、action 内で直接この検証関数を呼び出す

## スコープ外

- Deal の extra フィールド（assigneeId, technicalLeadId, estimateRequestId, notes, version）の削除判断
- DealPhase への estimate_approval 追加（フェーズの自由遷移方針のもとで要否を別途検討）
- actionItems の assignee 型変更（string → userId の変更は影響範囲が大きいため別リクエスト）
- スキーマの updatedAt / version カラムの削除（運用上有用なため残す）
- Contract の amount / startDate の NOT NULL 化（R05 で実施済み）
- Invoice の issueDate 追加（R05 で実施済み）

## 受け入れ基準

- [ ] inquiries テーブルに budget / timeline カラムが存在する
- [ ] inquiries.source が pgEnum 型になっている（7 値）
- [ ] meetings テーブルに inquiry_id カラムが存在し、dealId が nullable になっている
- [ ] meetings に CHECK 制約（deal_id OR inquiry_id が NOT NULL）が存在する
- [ ] meetings の attendees JSON 構造が新形式に変換されている
- [ ] deals テーブルに description カラムが存在する
- [ ] isPrimary の重複チェックがアプリケーション層に実装されている
- [ ] 既存データのマイグレーションが正常に完了する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **source を pgEnum に変更** — text のままだと不正な値が入りうる。enum にすることで承認ポリシーの条件評価（source eq "agent_service"）が確実になる。却下案: text + アプリ層バリデーション — DB 制約が弱い
2. **Meeting の dealId / inquiryId を両方 nullable + CHECK 制約** — 引合段階の商談と案件化後の商談を統一的に扱える。却下案: 中間テーブルで多対多 — 1 商談は 1 つの文脈に属するため過剰。却下案: dealId 必須のまま — 引合段階の商談が記録できない
3. **Attendee 移行で userId は null** — 既存の internal 要素は人名文字列であり UUID ではない。userId に人名をセットすると外部キー参照時にエラーになるため null で移行する。却下案: value を userId にもセット — 型エラーの原因になる
