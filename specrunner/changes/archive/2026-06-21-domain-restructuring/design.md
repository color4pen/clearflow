# Design: ドメインモデル再構築と用語統一

## Context

受託案件管理機能（顧客・引き合い・商談・案件）を3本のリクエストで構築した結果、実際の業務フローとモデルに以下の不整合が生じている。

**スキーマ上の問題**:
- `inquiries.clientId` が NOT NULL のため、顧客が未確定の段階で引き合いを受け付けられない
- `inquiries.contactId` が存在するが、担当者は商談フェーズで初めて判明することが多く、引き合い時点では意味が薄い
- `inquiries.requestId` が「案件化承認リクエスト」を意図しているが、名称が不明瞭
- `meetings.inquiryId` が NOT NULL のため、案件（deal）のみに紐づく商談を作成できない
- `deal_contacts` 中間テーブルがなく、案件ごとのキーマン・決裁者管理ができない

**用語の不整合**:
- `dealPhaseEnum` の `internal_approval` が「内示（顧客からの意思表示）」と呼ばれているが、実態は「社内見積承認」
- `ContractType` の `contract` は識別力が低く、`quasi_delegation`（準委任）と同粒度で表現するなら `fixed_price`（請負）が適切
- 「商談化」という言葉が「Meeting（商談記録）」と「converted（案件化判断）」の2つの意味で混在している

**コード品質の問題**:
- `statusLabels`・`sourceLabels`・`phaseLabels` 等のラベル定義が6ファイルに重複し、用語変更時の漏れリスクが高い

**影響ファイル（主要）**:
- `src/infrastructure/schema.ts` — enum 定義とテーブル定義、Relations
- `src/domain/models/inquiry.ts`, `meeting.ts`, `deal.ts`, `index.ts`
- `src/domain/services/dealTransition.ts`
- `src/infrastructure/repositories/inquiryRepository.ts`, `meetingRepository.ts`
- `src/application/usecases/updateInquiryStatus.ts`, `createDeal.ts`, `updateDealPhase.ts`, `createMeeting.ts`, `createInquiry.ts`
- `src/app/actions/inquiries.ts`, `meetings.ts`, `deals.ts`
- `src/app/(dashboard)/inquiries/page.tsx`, `[id]/page.tsx`, `[id]/InquiryActions.tsx`
- `src/app/(dashboard)/deals/page.tsx`, `[id]/page.tsx`
- `src/app/(dashboard)/clients/[id]/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/infrastructure/seed.ts`
- `src/__tests__/static/projectStructure.test.ts`

## Goals / Non-Goals

**Goals**:
- `inquiries.clientId` を nullable にして顧客未確定の引き合い受付を可能にする
- `inquiries.contactId` カラムを削除し引き合いデータを簡素化する
- `inquiries.requestId` を `conversionRequestId` に改名して意図を明示する
- `meetings` に `dealId`（nullable FK）を追加し案件に直接紐づく商談を許可する。`inquiryId` も nullable に変更する
- `deal_contacts` 中間テーブルを追加して案件ごとのキーマン・役割管理を可能にする
- `dealPhaseEnum` の `internal_approval` を `estimate_approval` に改名し概念を正確に表現する
- `ContractType` の `contract` を `fixed_price` に改名して識別力を高める
- 「商談化」から「案件化」への用語統一（UI ラベル・エラーメッセージ・承認リクエストタイトル）
- ラベル定義を `src/app/(dashboard)/labels.ts` に集約して重複を解消する
- 案件詳細ページに商談履歴セクション、顧客詳細ページに案件一覧セクションを追加する
- `updateDealAction` に admin/manager ロールチェックを追加する
- シードデータを業務フローに沿った整合した状態に修正する

**Non-Goals**:
- 承認リクエストの初期ステータス変更（draft → pending）— Request 2 で対応
- 承認完了後の自動フェーズ進行 — Request 2 で対応
- 引き合い作成時の顧客同時登録 UI — Request 3 で対応
- 商談記録からの担当者（ClientContact）登録 UI — Request 3 で対応

## Decisions

**D1: inquiries.clientId を nullable に変更**

Rationale: 引き合いは外部から来る受付メモであり、顧客が未確定の段階もある。null が「未確定」を最も素直に表現する。

Alternatives considered:
- `clientId` 必須を維持して「不明顧客」レコードで代替 → 「不明顧客」はドメイン上の意味がなく、検索・フィルタでノイズになるため却下

実装上の注意: `inquiryRepository` の `findAllWithClientByOrganization` は既に `leftJoin` を使っているため変更不要。`create` の引数型を `clientId?: string | null` に変更する。

---

**D2: inquiries.contactId カラムを削除**

Rationale: 担当者は商談で判明していくものであり、引き合い受付時点で紐づける業務上の意味がない。残すと引き合い作成フォームに不要なフィールドが残り混乱を招く。

Alternatives considered:
- nullable にして残す → 使われないカラムが残り、コードの後方互換ハックが増える。削除を採用

削除対象: `schema.ts` の `contactId` カラム定義、`inquiriesRelations` の `contact` 参照、ドメインモデル・リポジトリ・ユースケース・アクションの全参照

---

**D3: meetings.inquiryId を nullable に変更し dealId を追加**

Rationale: 案件化後の商談（提案・交渉）は案件に対する活動であり、引き合い経由の間接参照は動線が不自然。案件詳細から商談を直接表示するためには deals への直接 FK が必要。

Alternatives considered:
- meetings を引き合いのみに紐づけて案件は引き合い経由で辿る → 案件詳細での商談一覧取得が複雑になり、案件化前後で商談の文脈が混在するため却下

ドメインルール: `inquiryId` と `dealId` のどちらか一方は必須。DB 制約ではなくアプリケーション層（usecase）でバリデーションする。

---

**D4: deal_contacts 中間テーブルを追加**

Rationale: 案件ごとに関わる担当者は複数かつ役割が異なる。固定カラムでは数と種類の変動に対応できない。

Alternatives considered:
- deals テーブルに `keyPersonId` 等のカラムを追加 → 役割の種類・数が固定されてしまい、将来の拡張が困難なため却下

role の値域: `"key_person" | "decision_maker" | "technical" | "other"`（アプリケーション層のドメインモデルで型制約。DB は text）

---

**D5: ラベル定義を共通モジュールに集約**

Rationale: 6ファイルに同じラベル定義が散在しており、用語変更時の漏れリスクが高い。1箇所で管理することで一貫性を保証する。

新規ファイル: `src/app/(dashboard)/labels.ts`
対象ラベル: `statusLabels`（引き合いステータス）、`sourceLabels`（引き合い経路）、`meetingTypeLabels`（商談種別）、`phaseLabels`（案件フェーズ）、`contractTypeLabels`（契約種別）

---

**D6: internal_approval → estimate_approval に改名**

Rationale: `internal_approval`（社内承認）に「内示」（顧客からの意思表示）のラベルが当たっており、概念が逆。enum 値自体が意味を正確に伝えるべき。DB の `deal_phase` enum も変更する。

影響範囲: `schema.ts` の `dealPhaseEnum`、`deal.ts` の `DealPhase` 型、`dealTransition.ts` の遷移マップ、`updateDealPhase.ts` の条件分岐とエラーメッセージ、UI の `phaseLabels`

---

**D7: ContractType の contract → fixed_price に改名**

Rationale: `contract` は一般的すぎて契約種別としての識別力がない。`quasi_delegation`（準委任）と同じ粒度で `fixed_price`（請負）にする。

DB は text 型で保持しているため enum 定義の変更なし。ドメインモデル（`ContractType` 型）と UI ラベル（`contractTypeLabels`）の変更のみ。ただし既存 DB データに `"contract"` 値があれば不整合になるため、シードデータの修正と合わせて対応する。

---

**D8: updateDealAction へのロールチェック追加**

Rationale: 案件の更新は影響範囲が大きく、admin/manager のみが行うべき操作。`updateInquiryStatusAction` の `converted` 遷移に既にロールチェックがあり、案件更新も同様のガードが必要。

実装: `actions/deals.ts` の `updateDealAction` で `session.user.role` が `"admin"` か `"manager"` でなければ `{ success: false, message: "権限がありません" }` を返す。

## Risks / Trade-offs

**[Risk] dealPhaseEnum の DB マイグレーション** → `internal_approval` → `estimate_approval` は PostgreSQL の enum 値変更を伴う。Drizzle では `ALTER TYPE ... RENAME VALUE` が直接サポートされていない場合、新値追加 → データ移行 → 旧値削除の手順が必要になることがある。開発環境ではシード再実行で対応できるが、本番環境ではマイグレーションスクリプトの慎重な検証が必要。

**[Risk] ContractType の既存データ** → DB の `contract_type` カラムは text 型のため、既存レコードに `"contract"` 値が入っていると型チェックは通るが UI で `contractTypeLabels` に一致しなくなる。シードデータを修正しつつ、既存環境は `bun run seed` での再作成を前提とする。

**[Risk] meetings.inquiryId の nullable 化** → 既存の商談レコードは全て `inquiryId` を持つが、nullable にすることで「どちらも null」のレコードが作れる余地が DB 上は生まれる。アプリケーション層のバリデーションで防ぐ設計だが、DB 制約なしは防御が薄い。ただしチェック制約（CHECK）の追加は Drizzle での表現が複雑になるため、今回はアプリ層のみで対応する。

**[Trade-off] inquiries.clientId nullable 化と findAllWithClientByOrganization** → `leftJoin` に変更済みのため `clientName` が null になりうる。`InquiryWithClient.clientName` を `string | null` に変更し、UI 側で「未確定」等の表示に対応する必要がある。

## Open Questions

なし（architect 評価済みの設計判断により全て確定）

## Migration Plan

1. `src/infrastructure/schema.ts` の enum・テーブル定義を修正する（T-01）
2. Drizzle マイグレーションを生成する（`bun drizzle-kit generate`）— 実装タスクに含める
3. ドメインモデル→リポジトリ→ユースケース→アクション→UI の順で修正する（T-02〜T-08）
4. `bun run seed` でシードデータを再作成する
5. `bun test` と `bun run build` で受け入れ基準を確認する

Rollback: マイグレーションを revert し、コードを main ブランチに戻す。開発環境のみ対象。
