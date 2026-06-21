# ADR-011: ドメインモデル再構築と用語統一の設計判断

- **Status**: accepted
- **Date**: 2026-06-21
- **Change**: domain-restructuring
- **Deciders**: architect

---

## Context

ADR-009（顧客・引き合い管理基盤）と ADR-010（案件管理・フェーズ遷移）の実装完了後、実際の業務フローと構築されたドメインモデルの間に以下の不整合が発覚した。

1. **引き合いが構造化されすぎ**: `inquiries.clientId` が NOT NULL のため、顧客が未確定の段階（電話口で名前だけ聞いたケース等）で引き合いを登録できない。また `inquiries.contactId` は引き合い受付時点では業務上の意味が薄く、担当者は商談フェーズで初めて判明することが多い。
2. **商談が引き合いにしか紐づけられない**: `meetings.inquiryId` が NOT NULL のため、案件化後の提案・交渉・クロージングを案件（deal）に直接紐づけられない。案件化後も引き合い ID を経由する間接参照が必要で、案件詳細からの商談表示動線が不自然になっていた。
3. **案件ごとの担当者役割管理がない**: 同一顧客でも案件によってキーマン・決裁者が異なる。`deals` テーブルに `assigneeId`/`technicalLeadId` は存在するが、顧客側の担当者（`client_contacts`）との役割別紐づけを持つテーブルがない。
4. **用語の不整合**: `dealPhaseEnum` の `internal_approval`（社内承認）に「内示」（顧客からの意思表示）のラベルが当たっており概念が逆。`ContractType` の `contract` は識別力が低く `quasi_delegation` と異なる粒度になっている。「商談化」という語が Meeting（商談記録）と converted（案件化判断）の2つの意味で混在している。`inquiries.requestId` という名称が「案件化承認リクエスト」を意図していることを伝えられていない。
5. **ラベル定義の散在**: `statusLabels`・`sourceLabels`・`phaseLabels` 等が6ファイルに重複定義され、用語変更時の漏れリスクが高い。

本変更で行った設計判断は ADR-009 の一部（contactId FK・requestId 命名・承認タイトル）と ADR-010 の一部（フェーズ enum 値・contractType 値・updateDealAction のロール制御）を上書きするため、ADR として記録する。

---

## Decisions

### D1: inquiries.clientId を nullable に変更する

**Decision**: `inquiries.clientId` の NOT NULL 制約を外し、`string | null` に変更する。ドメインモデル（`Inquiry` 型）とリポジトリ・ユースケース・アクションの全参照箇所を追従修正する。

**Rationale**:
- 引き合いは「外から来た受付メモ」であり、顧客が未確定の段階もある。null が「未確定」を最も素直に表現する。
- `inquiryRepository.findAllWithClientByOrganization` は既に `leftJoin` を使用しているためクエリの変更は最小限。`InquiryWithClient.clientName` を `string | null` に変更し、UI 側で「未確定」等の表示フォールバックを設ける。

#### Alternative 1: clientId 必須を維持して「不明顧客」レコードで代替

| | |
|---|---|
| **Pros** | スキーマ変更が不要 |
| **Cons** | 「不明顧客」はドメイン上の意味がなく、顧客一覧や検索でノイズになる。名前のない顧客レコードがシステムに混在することになる |
| **Why not** | null が「未確定」を素直に表現できる状況でセンチネル値を使う理由がない |

---

### D2: inquiries.contactId カラムを削除する

**Decision**: `inquiries.contactId`（FK to client_contacts）カラムを削除する。`inquiriesRelations` の `contact` 参照も削除する。ドメインモデル（`Inquiry` 型）の `contactId` フィールドも削除し、リポジトリ・ユースケース・アクション・UI の全参照箇所から除去する。

**Rationale**:
- 担当者は商談フェーズで初めて判明するケースが多く、引き合い受付時点に紐づける業務上の意味が薄い。
- 残すと引き合い作成フォームに不要なフィールドが残り、入力を強制しなくても混乱を招く。
- ADR-009 D1 は「`inquiries.contactId` から担当者を FK 参照する必要があるため正規化したテーブルが必要」と述べていたが、その前提が業務フロー上誤りだったため削除する。

**ADR-009 D1 との関係**: ADR-009 D1 で確立した `clients + client_contacts` の正規化方針自体は維持する。contactId FK を inquiries から除去するのみ。

#### Alternative 1: nullable にして残す

| | |
|---|---|
| **Pros** | 将来「引き合い時点での担当者登録」が必要になった場合に再利用できる |
| **Cons** | 使われないカラムが残り、フォームへの混乱を招く。コードの後方互換ハック（任意フィールドの残置）になる |
| **Why not** | 業務上使われないカラムは削除する。必要になれば追加すればよい |

---

### D3: inquiries.requestId を conversionRequestId に改名する

**Decision**: `inquiries.requestId` カラムを `inquiries.conversionRequestId` に改名する。ドメインモデル・リポジトリ・ユースケース・アクション・UI の全参照箇所を追従修正する。承認リクエストの自動生成タイトルも `"商談化承認: ..."` から `"案件化承認: ..."` に変更する。

**Rationale**:
- `requestId` というカラム名は何の承認リクエストか読み取れない。`conversionRequestId`（案件化承認リクエスト）にすることで用途が自明になる。
- 「商談化」という語が UI とドメイン全体で「Meeting（商談記録）」と「案件化判断」の2つの意味で使われており、「案件化」に統一することでドメイン語彙のあいまいさを解消する。

**ADR-009 D5/D6 との関係**: ADR-009 D5 で「`inquiries.requestId` に承認リクエストを紐づける」という設計は維持。カラム名のみ変更し FK の向き（business domain → approval domain）は維持する。

---

### D4: meetings.inquiryId を nullable に変更し dealId を追加する

**Decision**: `meetings.inquiryId` の NOT NULL 制約を外す。`meetings.dealId`（nullable FK to deals）カラムを追加する。`meetingsRelations` に `deal` の `one()` を追加し、`dealsRelations` に `meetings: many(meetings)` を追加する。

ドメインルール: `inquiryId` と `dealId` のどちらか一方は必須。DB 制約ではなくアプリケーション層（`createMeeting` usecase）でバリデーションする。

**Rationale**:
- 案件化後の商談（提案・交渉）は案件に対する活動であり、引き合い経由の間接参照は動線が不自然。
- 案件詳細ページから商談を直接表示するために deals への直接 FK が必要。
- DB の CHECK 制約で「どちらか一方が必須」を表現することは Drizzle での記述が複雑になるため、アプリ層のバリデーションで対応する。

**リスク**: DB レベルでは両方 null のレコードが作れる余地が残る。アプリ層のみによる防御になる点に注意。

#### Alternative 1: meetings を引き合いのみに紐づけて案件は引き合い経由で辿る

| | |
|---|---|
| **Pros** | スキーマ変更が不要 |
| **Cons** | 案件詳細での商談一覧取得が複雑（`deal → inquiry → meetings` の JOIN が必要）。案件化前後で商談の文脈が混在する。案件化後に引き合い ID が消えるケースに対応できない |
| **Why not** | 案件詳細から商談を直接表示する動線は業務上必須であり、間接参照は保守コストが高い |

---

### D5: deal_contacts 中間テーブルを追加する

**Decision**: `deal_contacts` テーブルを追加する。カラム: `id`（uuid PK）、`dealId`（FK to deals, NOT NULL）、`contactId`（FK to client_contacts, NOT NULL）、`role`（text, NOT NULL）、`createdAt`。`dealId + contactId` にユニーク制約。`DealContactRole = "key_person" | "decision_maker" | "technical" | "other"` をドメインモデルで型制約し、DB は text 型。

**Rationale**:
- 案件ごとに関わる担当者は複数かつ役割が異なる。固定カラムでは数と種類の変動に対応できない。
- ADR-010 D5（`assigneeId`/`technicalLeadId` による社内担当者管理）と役割が異なる。`deal_contacts` は顧客企業側の担当者（client_contacts）との役割別紐づけを管理する。

**ADR-009 D2 との関係**: `client_contacts` には `organizationId` がないため、`dealContactRepository.findByDeal` は `clients` テーブルを inner join して `clients.organizationId = organizationId` を WHERE に追加することでテナント分離を保証する。この実装パターンは ADR-009 D2 の「`organizationId` がない場合は JOIN でテナント条件を含める」制約に従う。

#### Alternative 1: deals テーブルに keyPersonId 等のカラムを追加

| | |
|---|---|
| **Pros** | 中間テーブルが不要でクエリがシンプル |
| **Cons** | 役割の種類・数が固定される。同一役割を複数人が担うケース（決裁者が2名等）に対応できない。役割追加のたびに deals テーブルのスキーマ変更が必要 |
| **Why not** | 受託案件では担当者が複数・役割が流動的なケースが一般的であり、固定カラムでは将来の拡張に対応できない |

---

### D6: dealPhaseEnum の internal_approval を estimate_approval に改名する

**Decision**: `dealPhaseEnum` の値 `"internal_approval"` を `"estimate_approval"` に変更する。ドメインモデル（`DealPhase` 型）、`dealTransition.ts` の遷移マップ、`updateDealPhase.ts` の条件分岐・エラーメッセージ、UI の `phaseLabels` を全て `estimate_approval` に統一する。UI 表示ラベルは「内示」から「見積承認中」に変更する。

**Rationale**:
- `internal_approval`（社内承認）に「内示」（顧客からの意思表示・インフォーマルな発注意向通知）のラベルが当たっており概念が逆。実態は「社内で見積を承認するフェーズ」であり `estimate_approval` が正確。
- enum 値自体に意味を持たせることで、コードを読んだだけで意図が分かるようにする。ラベルだけ変えて enum 値を残す選択肢は、コードとラベルの乖離を引き起こす。

**ADR-010 D3 との関係**: ADR-010 D3 で確立したフェーズ遷移ルール（`proposal_prep → proposed → negotiation → internal_approval → won | lost`）の最後のステップ名を `estimate_approval` に変更する。遷移の構造自体は変わらない。

**マイグレーション注意**: PostgreSQL の pgEnum 値変更は `ALTER TYPE ... RENAME VALUE` が必要。開発環境ではシード再実行で対応。本番環境ではマイグレーションスクリプトの慎重な検証が必要。

#### Alternative 1: internal_approval のままラベルだけ変更

| | |
|---|---|
| **Pros** | DB マイグレーションが不要 |
| **Cons** | コード上の `internal_approval` と UI 上の「見積承認中」が乖離したまま。コードを読む人が誤解する |
| **Why not** | enum 値はドメイン語彙の正本。値自体に正しい意味を持たせるべき |

---

### D7: ContractType の contract を fixed_price に改名する

**Decision**: ドメインモデル（`ContractType`）の `"contract"` を `"fixed_price"` に変更する。`contractTypeLabels` も `fixed_price: "請負"` に更新する。`deals.contractType` カラムは text 型（ADR-010 D6）のため DB マイグレーションは不要だが、既存データに `"contract"` 値がある場合は不整合になるためシードデータを修正する。

**Rationale**:
- `contract`（契約）は一般的すぎて契約種別としての識別力がない。`quasi_delegation`（準委任）・`ses`（SES）と同じ粒度で表現するなら `fixed_price`（請負）が適切。
- コードレビュー等で `contractType === "contract"` という記述が何の契約種別を意味するか自明でない。

**ADR-010 D6 との関係**: text 型で管理しドメイン層で型制約をかける方針は維持。値の変更のみ。

---

### D8: updateDealAction に admin/manager のロールチェックを追加する

**Decision**: `actions/deals.ts` の `updateDealAction` で `session.user.role` が `"admin"` か `"manager"` でなければ `{ success: false, message: "権限がありません" }` を返す。

**Rationale**:
- ADR-010 D8 では「`updateDealAction`（情報更新）は全ロール許可」としていたが、案件情報の更新は影響範囲が大きく（金額・日程・担当者等）、全ロールへの開放は過剰だったと判断する。
- `createDealAction`・`updateDealPhaseAction` と同じ admin/manager 制限に揃えることで権限モデルが一貫する。

**ADR-010 D8 との関係**: ADR-010 D8 を上書きする。「`updateDealAction` は全ロール許可」という判断を取り消し、`admin`/`manager` のみに制限する。

#### Alternative 1: 全ロール許可を維持する（ADR-010 D8 の方針を継続）

| | |
|---|---|
| **Pros** | 日常的な案件情報の入力（金額・日程・備考等）に管理職ロールを求めないため、現場担当者のワークフロー上の障壁が下がる。ADR-010 D8 で「情報更新は全ロールに開放することで業務上の障壁を下げる」とした理由と一貫する |
| **Cons** | 金額・担当者等の重要フィールドも全ロールが変更できる状態になる。案件フェーズ変更（admin/manager 制限）と情報更新（全ロール許可）で権限モデルが非対称になり、後続の権限設計が複雑化する |
| **Why not** | `createDealAction`・`updateDealPhaseAction` と同一エンティティに対する操作で権限が異なることは、実装者が誤解しやすい。「案件操作は admin/manager」に統一することで権限モデルを単純化する |

---

### D9: ラベル定義を共通モジュール（labels.ts）に集約する

**Decision**: `src/app/(dashboard)/labels.ts` を新設し、`statusLabels`（引き合いステータス）、`sourceLabels`（引き合い経路）、`meetingTypeLabels`（商談種別）、`phaseLabels`（案件フェーズ）、`contractTypeLabels`（契約種別）を一箇所で定義する。既存の6ファイルで行っていたローカル定義を全て `labels.ts` からの import に変更する。

**Rationale**:
- 6ファイルに同一内容のラベル定義が散在しており、用語変更時の漏れリスクが高い。本変更での用語統一（「商談化済」→「案件化済」、「内示」→「見積承認中」）の際に、集約されていれば1箇所の変更で済む。
- ラベルはプレゼンテーション層の共有定数であり、ページ間で一貫性が必要。

#### Alternative 1: 各ファイルで個別定義を維持

| | |
|---|---|
| **Pros** | 変更が局所的で影響範囲が限定される |
| **Cons** | 用語変更時に全ファイルを探索・修正する必要があり漏れが発生しやすい。実際に本変更で「商談化」→「案件化」の修正に6ファイルの変更が必要になった |
| **Why not** | DRY 原則の観点で明確に問題があり、コスト対効果の高い修正のため |

---

## Consequences

### Positive

- 引き合い・商談・案件の3エンティティの関係が業務フロー（受付 → 引き合い → 商談化 → 案件 → 受注）と整合した
- 「商談」「案件化」「見積承認」の語彙が UI・コード・データ層で統一され、オンボーディングコストが下がる
- 商談（meeting）を案件（deal）に直接紐づけられるようになり、案件詳細ページに引き合い前後の全商談履歴を統合表示できるようになった
- `deal_contacts` により案件ごとのキーマン・決裁者管理が可能になり、将来の担当者別通知・権限制御の基盤が整った
- `labels.ts` への集約でラベル変更の安全性が担保された

### Negative / Trade-offs

- **DB マイグレーションの複雑性**: `dealPhaseEnum` の `internal_approval` → `estimate_approval` は PostgreSQL の enum 型変更を伴う。`ALTER TYPE ... RENAME VALUE` が必要で、Drizzle の自動生成では対応が不完全な場合がある。本番環境では手動マイグレーションスクリプトの検証が必要。
- **ContractType の既存データ不整合**: DB は text 型のため、既存レコードに `"contract"` 値が残ると UI ラベルが空になる。開発環境は `bun run seed` で解消するが、既存本番データがある場合は UPDATE スクリプトが必要。
- **meetings.inquiryId の nullable 化**: DB レベルでは `inquiryId` と `dealId` の両方が null のレコードが作れる余地が残る。アプリケーション層（`createMeeting` usecase）のバリデーションのみで防御している。
- **ADR-009 D2 の実装制約が deal_contacts にも適用**: `client_contacts` に `organizationId` がないため、`dealContactRepository` のクエリは `clients` テーブルを inner join してテナント分離を保証する必要がある。直接クエリより複雑になる。

### Constraints for future changes

- **商談（meeting）の作成・更新**: `inquiryId` と `dealId` のどちらか一方を必ず渡すこと。両方 null は `createMeeting` usecase がエラーを返す。`updateMeeting` についても同様のバリデーションを追加すること
- **deal_contacts の直接クエリ**: `clients` テーブルを inner join して `clients.organizationId = organizationId` を WHERE に追加することでテナント分離を保証すること（ADR-009 D2 の制約が継承される）
- **dealPhaseEnum への値追加**: `dealTransition.ts` の遷移マップと `schema.ts` の pgEnum 両方を更新すること。`estimate_approval` への到達経路（`negotiation → estimate_approval`）への影響を確認すること
- **案件フェーズ表示**: `phaseLabels` の正本は `src/app/(dashboard)/labels.ts`。個別ページでのローカル定義を禁止する
- **ContractType の値追加**: `ContractType` 型（`src/domain/models/deal.ts`）と `contractTypeLabels`（`labels.ts`）のみ変更すればよい。DB マイグレーションは不要（text 型のため）
- **引き合いの clientId が null の場合の表示**: `InquiryWithClient.clientName` が null になりうる。UI では「未確定」等のフォールバック表示を設けること
- **case 化承認リクエストのタイトル**: 将来 `updateInquiryStatus` の `converted` 遷移でリクエストを作成する際は、タイトル文字列を `"案件化承認: ${inquiry.title}"` とすること（ADR-009 D5 の実装を上書き済み）

---

## References

- `specrunner/changes/domain-restructuring/design.md` — 詳細設計（D1〜D8）
- `specrunner/changes/domain-restructuring/request.md` — 要件定義
- `specrunner/adr/ADR-009-client-inquiry-foundation.md` — 本 ADR が部分的に上書きする設計判断（D1: contactId FK、D5/D6: requestId 命名と承認タイトル）
- `specrunner/adr/ADR-010-deal-management-phase-transition.md` — 本 ADR が部分的に上書きする設計判断（D3: フェーズ enum 値、D6: contractType 値、D8: updateDealAction ロール制御）
- `src/infrastructure/schema.ts` — inquiries/meetings/deals/deal_contacts テーブル定義、dealPhaseEnum
- `src/domain/models/inquiry.ts`, `meeting.ts`, `deal.ts` — 変更後のドメインモデル型定義
- `src/domain/services/dealTransition.ts` — estimate_approval を含む遷移ルール
- `src/application/usecases/createMeeting.ts` — inquiryId/dealId の排他バリデーション
- `src/infrastructure/repositories/dealContactRepository.ts` — clients JOIN によるテナント分離実装
- `src/app/(dashboard)/labels.ts` — 集約されたラベル定義
