# ADR-010: 案件管理ドメインとフェーズ遷移・見積承認連携の設計判断

- **Status**: accepted
- **Date**: 2026-06-20
- **Change**: deal-management
- **Deciders**: architect

---

## Context

ADR-009 で確立した「顧客・引き合い管理基盤と承認ドメイン連携パターン」の上に、受託案件のライフサイクルを管理する「案件（Deal）」ドメインを追加した。引き合いが商談化（`converted`）された後、提案準備から受注・失注までのフェーズを `dealPhaseEnum` と `dealTransition.ts` で管理する。

本変更で特に記録すべき事象が2点ある。

1. **ADR-009 Consequences の制約が発動した**: ADR-009 D7 の帰結として「Request 作成ロジックが 2 箇所（`createRequest`・`updateInquiryStatus`）に重複する範囲で許容するが、3 箇所目が生じた場合はリポジトリレベルの共通ヘルパーへの抽出を検討すること」と記録されていた。本変更の `updateDealPhase`（`internal_approval` 遷移時の見積承認リクエスト自動作成）がその 3 箇所目にあたる。

2. **見積承認連携で新しい formData 渡しパターンを確立した**: 商談化承認（`updateInquiryStatus` → Request 作成）はフォームデータなしで承認リクエストを生成していた。見積承認では `{ amount: { value: deal.estimatedAmount, label: "想定金額" } }` をフォームデータとして渡すことで、既存の金額ルーティング（条件付きステップフィルタ）を活用する。このパターンは承認ドメインと業務ドメインの連携形態として ADR-009 D5 の拡張にあたる。

ここで行った設計選択は後続の案件管理拡張（プロジェクト進行管理・契約管理等）に波及するため ADR として記録する。

---

## Decisions

### D1: 案件を引き合いに 1:1 で紐づける

**Decision**: `dealRepository.findByInquiryId` で重複チェックし、1 つの引き合いに対して作成できる案件は 1 件のみとする。重複時は `createDeal` usecase がエラーを返す。

**Rationale**:
- 受託案件は 1 つの引き合い（商談の種）から 1 つの案件に発展する
- 分割提案（複数の案件が同一引き合いから派生するケース）は引き合い自体を分割して管理する方が業務フローとして自然
- 1:1 制約により、引き合い詳細ページから案件への参照が常に 0 または 1 件に限定され、UI の複雑性を抑えられる

#### Alternative 1: 1:N を許容する（引き合いから複数の案件を作成可）

| | |
|---|---|
| **Pros** | 分割提案を案件の分岐として表現できる |
| **Cons** | ドメインモデルが複雑化する。案件一覧での引き合いとの対応が不明瞭になる。引き合い詳細ページに複数の案件リンクを表示する UI が必要になる |
| **Why not** | 分割提案は引き合いを分割して管理することで対応可能。1:N の複雑性を初期段階で持ち込む必要がない |

---

### D2: 見積承認時に estimatedAmount をフォームデータとして承認リクエストに渡す

**Decision**: `updateDealPhase` usecase で `internal_approval` 遷移時に、`{ amount: { value: deal.estimatedAmount, label: "想定金額" } }` をフォームデータとして `requestRepository.create()` に渡す。

**Rationale**:
- 承認リクエスト（Request）は案件ドメインを知らない（ADR-009 D6 の原則を踏襲）
- フォームデータとして金額を渡すことで、既存の承認テンプレートの条件付きステップフィルタ（`filterStepsByCondition`）による金額ルーティング（ADR-003）をそのまま活用できる
- `amount` キーはテンプレートの `fields` に定義済みの項目名と一致させる運用とし、承認ドメインと業務ドメインは「フォームデータのキー名」という弱い結合点のみを持つ

#### Alternative 1: 案件テーブルから直接参照する（requests テーブルに dealId を追加）

| | |
|---|---|
| **Pros** | 承認リクエストから案件への逆参照が容易になる |
| **Cons** | 承認ドメインが案件ドメインを知ることになり、ADR-009 D6 の原則（「承認ドメインは業務ドメインを知らない」）に違反する。承認ドメインの独立性が損なわれる |
| **Why not** | 承認ドメインの独立性原則を破るため |

---

### D3: フェーズ遷移をドメインサービスで管理する

**Decision**: `src/domain/services/dealTransition.ts` に `VALID_TRANSITIONS` マップと `canTransition(from, to): boolean` を定義する。フェーズ遷移ルール: `proposal_prep → proposed | lost`、`proposed → negotiation | lost`、`negotiation → internal_approval | lost`、`internal_approval → won | lost`。`won` と `lost` は終端状態。

**Rationale**:
- `inquiryTransition.ts`・`requestTransition.ts` と同じパターンを踏襲し、コードベースの一貫性を保つ
- 遷移ルールを一箇所に集約することで、`updateDealPhase` usecase で同じルールを再利用できる
- 純粋関数として実装されるため、DB 依存なしにユニットテストが可能

#### Alternative 1: usecase 内でインラインチェック

| | |
|---|---|
| **Pros** | 追加ファイルが不要でシンプル |
| **Cons** | 遷移ルールが usecase に散在し、将来の状態追加時に修正漏れが発生しやすい。ドメインサービスへの集約という既存パターンを破る |
| **Why not** | `requestTransition.ts`・`inquiryTransition.ts` で確立した「遷移ルールは domain サービスに集約する」パターンを破ることになるため |

---

### D4: 案件ページをトップレベルルートに配置する

**Decision**: `/deals` と `/deals/[id]` をダッシュボード直下（`src/app/(dashboard)/deals/`）に配置し、ヘッダーナビに「引き合い」の後に追加する。全ロール表示。

**Rationale**:
- 案件は引き合いから独立したライフサイクルを持つ（提案→受注の長期プロセス）。商談（meeting）と異なり、引き合いに従属しない独立エンティティとして管理する
- 全案件の俯瞰（フェーズ別一覧・パイプライン把握）が業務上必要であり、一覧表示を引き合い詳細のネストルートに置くのは不自然
- ADR-009 D9 の「顧客・引き合いはダッシュボード直下のトップレベルルート」と一貫したナビ設計になる

#### Alternative 1: 引き合い詳細のネストルート（`/inquiries/[id]/deals/...`）

| | |
|---|---|
| **Pros** | 案件が引き合いに紐づくことが URL 構造で表現される |
| **Cons** | 全案件の一覧表示に引き合い ID のコンテキストが必要になり、俯瞰視点のアクセスが困難になる。案件の独立したライフサイクル（受注後の進行管理等）と合わない |
| **Why not** | 案件は独立エンティティであり、一覧での俯瞰が主要なユースケースのため |

---

### D5: assigneeId と technicalLeadId を分離して管理する

**Decision**: `deals` テーブルに `assigneeId`（営業担当、FK to users, nullable）と `technicalLeadId`（技術担当、FK to users, nullable）の 2 つの FK を持たせる。`usersRelations` には `dealsAsAssignee` と `dealsAsTechnicalLead` を `relationName` 付きで追加する。

**Rationale**:
- 受託案件では営業担当と技術担当が異なることが多い。単一の担当者カラムでは役割の異なる担当者を区別できない
- 2 つの FK で明示的に管理することで、将来的な担当者別の通知・権限制御が可能になる
- `approvalDelegations` での `delegationsFrom`/`delegationsTo` と同じ `relationName` パターンを踏襲する

#### Alternative 1: 単一の担当者カラムで管理

| | |
|---|---|
| **Pros** | スキーマがシンプルになる |
| **Cons** | 受託案件で一般的な「営業担当 ≠ 技術担当」のケースを表現できない。将来の役割別機能追加時にスキーマ変更が必要になる |
| **Why not** | 受託案件の実態と合わないため |

---

### D6: contractType を text カラムで管理する（pgEnum を使わない）

**Decision**: `deals.contractType` は text カラムとし、ドメインモデル（`ContractType = "quasi_delegation" | "contract" | "ses"`）と Zod スキーマで型制約をかける。DB レベルでは pgEnum を使わない。

**Rationale**:
- 契約種別は組織によってカスタマイズされる可能性がある。初期段階では 3 種（準委任・請負・SES）を想定するが、DB マイグレーションなしで値を追加できる柔軟性を持たせる
- ADR-009 D4 の「流入経路（source）は text で定義し、アプリケーション層でバリデーション」と同じ方針
- pgEnum は値の追加に `ALTER TYPE` マイグレーションが必要で、PostgreSQL のトランザクション制約上デプロイの柔軟性が下がる

#### Alternative 1: pgEnum で DB 側に制約をかける

| | |
|---|---|
| **Pros** | DB レベルで不正値を防げる。`inquiryStatusEnum`・`dealPhaseEnum` と一貫したアプローチになる |
| **Cons** | 値の追加に `ALTER TYPE` マイグレーションが必要。組織ごとのカスタマイズに対応しにくい |
| **Why not** | 契約種別はステータスと異なり状態遷移ロジックに直結しない。DB 制約よりアプリ層制約の方がコスト対効果が高い |

---

### D7: updateDealPhase 内でリポジトリを直接操作し createRequest usecase を呼ばない（3 箇所目の Request 作成ロジック）

**Decision**: `updateDealPhase` usecase 内の `internal_approval` 遷移処理で、`createRequest` usecase を呼び出さず、`requestRepository.create()` と `approvalStepRepository.createMany()` を直接呼び出す。

**Rationale**:
- ADR-009 D7 で記録した「`createRequest` usecase はトランザクション外で `void deliverWebhookEvent()` を呼び出す副作用を持つ」という制約が本変更でも同様に適用される
- `updateDealPhase`（deals 更新）+ Request 作成を同一トランザクション内で完結させるには、リポジトリ層の直接操作が必要
- usecase → usecase の呼び出しは「`actions → usecases → domain / infrastructure`」の依存方向の原則に反する

**注記**: ADR-009 で「2 箇所の範囲で許容するが、3 箇所目が生じた場合はリポジトリレベルの共通ヘルパーへの抽出を検討すること」と記録した。本変更が 3 箇所目にあたるため、将来的な Request 作成ロジックの共通ヘルパー化を**強く推奨する**。現時点では `updateDealPhase`・`updateInquiryStatus`・`createRequest` の 3 箇所にとどまり、かつ各 usecase の固有ロジックとの分離が不明瞭なため、今回は共通化を見送る。

#### Alternative 1: createRequest usecase を呼び出す

| | |
|---|---|
| **Pros** | Request 作成ロジックが一箇所に集約される |
| **Cons** | `createRequest` が Webhook 送信（fire-and-forget）を含むためトランザクション境界の制御が困難。usecase → usecase の依存になりアーキテクチャ規約に違反する |
| **Why not** | ADR-009 D7 と同じ理由。トランザクション境界の問題と依存方向規約違反の両方を抱えるため |

---

### D8: 案件作成・フェーズ変更は admin と manager のみ。情報更新は全ロールに許可する

**Decision**: Server Action 層（`src/app/actions/deals.ts`）で権限チェック。`createDealAction` と `updateDealPhaseAction` は `admin`/`manager` ロール制限。`updateDealAction` は全ロール許可。

**Rationale**:
- 案件作成とフェーズ変更（特に `internal_approval` での承認リクエスト自動作成）は重要な業務判断を伴う。作成・承認フロー起動の権限は管理職層に限定する
- 情報更新（金額・日程・備考等）は日常的な入力作業であり、全ロールに開放することで業務上の障壁を下げる
- ADR-009 D8（converted 遷移は admin/manager のみ、それ以外は全ロール）と同じ設計方針を踏襲する

---

## Consequences

### Positive

- 引き合い（ADR-009）の上に案件ドメインが接続され、「引き合い → 商談化承認 → 案件作成 → 見積承認 → 受注/失注」という受託業務の完全なフローをシステムが表現できるようになった
- 承認ドメインの独立性（Request は業務ドメインを知らない）を維持しながら、見積承認という 2 つ目の業務ドメイン連携パターンを確立した
- `dealTransition.ts` が `inquiryTransition.ts`・`requestTransition.ts` と同じパターンで定義され、状態遷移の管理方針が統一された
- 1:1 制約（D1）により、案件の重複作成を DB・アプリ双方で防止できる

### Negative / Trade-offs

- **Request 作成ロジックが 3 箇所に**: `createRequest`・`updateInquiryStatus`・`updateDealPhase` の 3 箇所に Request 作成ロジックが存在する。ADR-009 の警告閾値（3 箇所目）に達しており、次の Request 作成を伴う usecase が追加される際は共通ヘルパーへの抽出を行うこと
- **楽観ロック失敗時の orphan リスク**: `updateDealPhase` 内で deals 更新（楽観ロック）と Request 作成を順次実行するが、deals 更新失敗後に Request と ApprovalStep の orphan レコードが残る可能性がある。これは `updateInquiryStatus` と同じパターンであり本変更固有の問題ではないが、将来的にはトランザクション内で楽観ロック失敗を検出してロールバックを強制する対応が必要
- **`contractType` の値がアプリ層制約のみ**: DB レベルの制約がないため、直接 DB 操作による不正値の混入に注意が必要。Zod バリデーションと TypeScript 型制約を通ることが前提

### Constraints for future changes

- **案件ドメインの拡張**（プロジェクト進行管理・契約管理等）: `deals.estimateRequestId` と同じ「業務ドメイン側が承認ドメインへの FK を持ち、承認ドメインは業務ドメインを知らない」パターンを踏襲すること（ADR-009 D6）
- **Request 作成ロジックの次の重複発生時**: 必ず共通ヘルパーへの抽出を行うこと。3 箇所を超えて放置しない
- **contractType の値追加**: Zod スキーマと `ContractType` 型定義（`src/domain/models/deal.ts`）のみ変更すればよい。DB マイグレーションは不要
- **dealPhaseEnum への値追加**: `dealTransition.ts` の遷移マップと `schema.ts` の pgEnum 両方を更新すること。状態遷移ロジックへの影響を確認すること
- **案件の 1:1 制約の緩和が必要になった場合**: D1 の設計判断を再評価し ADR 更新を行うこと。`dealRepository.findByInquiryId` の重複チェックロジックも変更が必要
- **assigneeId/technicalLeadId 以外の担当者ロール追加**: `usersRelations` に `relationName` 付きで `many(deals)` を追加するパターンを踏襲すること

---

## References

- `specrunner/changes/deal-management/design.md` — 詳細設計（D1〜D10）
- `specrunner/changes/deal-management/request.md` — 要件定義
- `specrunner/adr/ADR-009-client-inquiry-foundation.md` — 本 ADR の前提となる顧客・引き合い管理基盤の設計判断
- `src/infrastructure/schema.ts` — deals テーブル・dealPhaseEnum 定義（L42 以降）
- `src/domain/services/dealTransition.ts` — 案件フェーズ遷移ルール
- `src/application/usecases/updateDealPhase.ts` — internal_approval 遷移時の見積承認リクエスト自動作成ロジック
- `src/application/usecases/createDeal.ts` — 案件作成・1:1 制約チェック
- `src/app/actions/deals.ts` — 案件操作の権限ゲート
- `drizzle/0010_deal_management.sql` — deals テーブル追加マイグレーション
- `drizzle/0011_deal_inquiry_unique.sql` — inquiryId ユニーク制約マイグレーション
