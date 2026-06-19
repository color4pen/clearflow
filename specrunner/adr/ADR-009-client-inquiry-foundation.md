# ADR-009: 顧客・引き合い管理基盤と承認ドメイン連携パターンの設計判断

- **Status**: accepted
- **Date**: 2026-06-20
- **Change**: client-inquiry-foundation
- **Deciders**: architect

---

## Context

Clearflow は ADR-001〜ADR-008 を通じて承認ワークフローとしての機能（多段階承認・RBAC・金額ルーティング・Webhook・楽観ロック・締め切り・代理承認・フォーム定義）を整備してきた。しかしシステムは「承認対象となる業務ドメイン」を持たず、承認ワークフローが何に適用されるかをコードが知らない状態だった。

本変更で初めて業務ドメイン（顧客・引き合い管理）をシステムに組み込んだ。受託開発の案件管理の入口として「顧客（企業＋担当者）」と「引き合い（問い合わせ・商談化判断）」を導入し、引き合いの商談化判断（Go/No-Go）を既存の承認テンプレートで回すことで、承認ドメインと案件管理ドメインの連携パターンを確立した。

ここで行った設計選択は、後続のすべての案件管理拡張（商談管理・案件管理等）に波及するため ADR として記録する。

---

## Decisions

### D1: 顧客と担当者を正規化した別テーブル（clients + client_contacts）で管理する

**Decision**: `clients`（企業情報）と `client_contacts`（担当者）を独立したテーブルとして正規化する。

**Rationale**:
- `inquiries.contactId` から担当者を FK 参照する必要があるため、正規化されたテーブルが必須
- jsonb カラムに埋め込むと参照整合性を DB レベルで保証できない
- 担当者ごとに個別 ID を持つことで、将来的な担当者変更履歴・通知先管理が可能になる

#### Alternative 1: 担当者を clients テーブルの jsonb カラムで管理

| | |
|---|---|
| **Pros** | テーブル数が減り、クエリがシンプルになる |
| **Cons** | `inquiries.contactId` からの FK 参照が不可能。参照整合性を DB レベルで保証できない。担当者のクエリにアプリケーション層のパース処理が必要になる |
| **Why not** | 引き合いが特定の担当者を参照する要件があるため、FK 参照のできない jsonb では要件を満たせない |

---

### D2: client_contacts に organizationId を持たせない

**Decision**: `client_contacts` テーブルには `organizationId` カラムを追加しない。テナント分離は `clientId` 経由で `clients.organizationId` に委譲する。

**Rationale**:
- `client_contacts` は常に `clients` に従属しており、担当者単体でのクロステナントアクセスは想定されない
- `clientRepository.findById(clientId, organizationId)` で取得した顧客の担当者であることを保証すれば、直接の `organizationId` カラムは冗長になる
- データの冗長性を排除し、顧客の `organizationId` 変更時の更新対象を減らす

**Constraint**: 担当者を直接クエリする場合は JOIN または サブクエリで `clients.organizationId` を条件に含める必要がある。将来、担当者直接検索が必要になった場合は `organizationId` カラムの追加を検討すること。

#### Alternative 1: client_contacts にも organizationId を持たせる

| | |
|---|---|
| **Pros** | 担当者を直接クエリする際にテナント条件を簡潔に書ける。ADR-001 D8 の「全クエリに organizationId 条件付与」パターンを文字通り適用できる |
| **Cons** | データの冗長性が増加する。顧客の組織変更時に担当者テーブルも更新が必要になる |
| **Why not** | 本変更スコープでは担当者の直接クエリユースケースがなく、冗長性排除を優先した |

---

### D3: 引き合いのステータス遷移をドメインサービス（inquiryTransition.ts）で管理する

**Decision**: `src/domain/services/inquiryTransition.ts` に遷移ルールと `canTransition(from, to): boolean` を定義する。

状態機械:
```
new → in_progress → converted（終端）
    ↘              ↘
     declined（終端）
```

**Rationale**:
- 既存の `requestTransition.ts` と同じパターンを踏襲し、コードベースの一貫性を保つ
- 遷移ルールを一箇所（domain サービス）に集約することで、複数の usecase で同じルールを再利用できる
- 純粋関数として実装することで、DB 依存なしにユニットテストが可能

#### Alternative 1: usecase 内でインラインチェック

| | |
|---|---|
| **Pros** | 追加ファイルが不要でシンプル |
| **Cons** | 遷移ルールが usecase に散在し、将来の状態追加時に修正漏れが発生しやすい |
| **Why not** | `requestTransition.ts` で確立した「遷移ルールは domain サービスに集約する」パターンを破ることになるため |

---

### D4: inquiryStatusEnum を pgEnum で定義し、流入経路（source）は text で定義する

**Decision**:
- `inquiryStatusEnum`: pgEnum で `["new", "in_progress", "converted", "declined"]` と定義する
- `inquiries.source`: text カラムとし、アプリケーション層（Zod）で `"web" | "phone" | "referral" | "exhibition" | "other"` の5値をバリデーションする

**Rationale**:
- **ステータス**: 引き合いのライフサイクルを表す有限状態であり、値の追加は状態遷移ロジックの変更を必ず伴う。DB レベルの制約が安全策として機能する。`requestStatusEnum` と同じ方針を踏襲する
- **流入経路**: 将来的に値の追加が起こりうるが、スキーマ変更（`ALTER TYPE`）を伴わずにアプリケーション層の Zod スキーマだけで変更できる方が運用コストが低い。参照整合性の要件もない

#### Alternative 1: source も pgEnum で定義

| | |
|---|---|
| **Pros** | DB レベルで不正値を防げる |
| **Cons** | 値の追加に `ALTER TYPE` マイグレーションが必要。PostgreSQL は `ALTER TYPE ... ADD VALUE` がトランザクション外で実行されるため、デプロイの柔軟性が下がる |
| **Why not** | 流入経路は頻繁に追加が見込まれ、DB 変更コストが過剰なため |

#### Alternative 2: 流入経路をマスタテーブルで管理

| | |
|---|---|
| **Pros** | テナントごとに流入経路をカスタマイズできる。値の追加・削除が管理画面から行える |
| **Cons** | マスタテーブルの CRUD 実装・UI が必要になり、初期実装コストが大幅に増加する。外部キー参照によりスキーマが複雑になる |
| **Why not** | 初期段階ではカスタマイズ要件がなく、過剰設計になるため。将来必要になった時点で text カラムからマスタテーブルへ移行可能 |

---

### D5: 商談化時に既存の Request（承認リクエスト）を自動作成する

**Decision**: `updateInquiryStatus` usecase で `converted` 遷移時に、指定された承認テンプレートを使用して Request（承認リクエスト）を自動作成し、`inquiries.requestId` に紐づける。

**Rationale**:
- 既存の承認テンプレート・承認ステップの仕組みをそのまま活用することで、新規の承認機構を作らずに済む
- 商談化の Go/No-Go 判断を既存の承認フロー（多段階承認・RBAC・期限管理等）に乗せられる
- 案件管理ドメインから承認ドメインへの依存は usecase 層で閉じる（ドメイン層への漏れを防ぐ）

#### Alternative 1: 商談化専用の独自承認機構を新設

| | |
|---|---|
| **Pros** | 案件管理固有の承認フローを自由に設計できる |
| **Cons** | 既存の承認テンプレート・承認ステップ・監査ログ等のインフラが重複する。メンテナンスコストが倍増する |
| **Why not** | 既存機能との重複でありコスト対効果が低いため |

---

### D6: 引き合い側（inquiries.requestId）から承認リクエストを参照する（Request 側は inquiry を知らない）

**Decision**: `inquiries` テーブルに `requestId` (FK to requests, nullable, onDelete: set null) を追加する。`requests` テーブルには `inquiryId` を追加しない。

**Rationale**:
- 承認ドメイン（`requests` テーブル・関連 usecase）は案件管理ドメインを知らない状態を保つ
- 案件管理ドメインが承認ドメインに依存する一方向の参照により、承認ドメインの独立性が確保される
- 将来的な Turborepo 化や承認ドメインの独立サービス化の際に、承認ドメイン側のコード変更が不要になる

**onDelete: "set null"**: 承認リクエストが削除された場合（現在は未実装）に引き合いレコードが壊れないよう `set null` を設定する。

#### Alternative 1: Request 側に inquiryId を追加する

| | |
|---|---|
| **Pros** | 承認リクエストから引き合いへの逆参照が容易になる |
| **Cons** | 承認ドメインが案件管理ドメインを知ることになり、結合度が高まる。承認ドメインを独立させる際に阻害要因となる |
| **Why not** | 承認ドメインの独立性を損なうため |

---

### D7: updateInquiryStatus 内で createRequest usecase を呼ばず、リポジトリを直接操作する

**Decision**: `updateInquiryStatus` usecase 内の `converted` 遷移処理で、`createRequest` usecase を呼び出さず、`requestRepository.create()` と `approvalStepRepository.createMany()` を直接呼び出す。

**Rationale**:
- `createRequest` usecase はトランザクション外で `void deliverWebhookEvent()` を呼び出す副作用を持つ。同一トランザクション内で inquiries の更新と Request 作成を行うには usecase ではなくリポジトリ層を直接操作する必要がある
- usecase → usecase の直接呼び出しは「`actions → usecases → domain / infrastructure`」の依存方向の原則に反する
- Webhook 送信は現段階で引き合い domain には不要（スコープ外）であり、意図しない副作用を排除できる

**Trade-off**: `createRequest` との Request 作成ロジックが 2 箇所に存在する。将来的に共通のリポジトリレベルヘルパーへの抽出を検討するが、現時点では 2 箇所に留まるため許容する。

#### Alternative 1: createRequest usecase を呼び出す

| | |
|---|---|
| **Pros** | Request 作成ロジックが一箇所に集約される |
| **Cons** | `createRequest` が Webhook 送信（fire-and-forget）を含むためトランザクション境界の制御が困難。usecase → usecase の依存になり、アーキテクチャ規約に違反する |
| **Why not** | トランザクション境界の問題と依存方向規約違反の両方を抱えるため |

---

### D8: 引き合いのステータス変更権限を Server Action 層で制御する

**Decision**: `converted`（商談化）への遷移は `role` が `"admin"` または `"manager"` のみ許可する。`in_progress`（対応中）・`declined`（見送り）への遷移は全ロールに許可する。権限チェックは Server Action 層（`src/app/actions/inquiries.ts`）で行う。

**Rationale**:
- 商談化は承認リクエストの自動作成を伴う重要な操作であり、権限制限が必要
- `in_progress`・`declined` は日常的な操作（対応状況の更新）であり、全ロールに開放することでワークフローの障壁を下げる
- ADR-003 D5 の「usecase 層で実際の承認権限を判定し、アクション層は試行可能ロールのゲートのみ担当」パターンを踏襲する

---

### D9: 顧客・引き合いページをダッシュボード直下のトップレベルルートに配置する

**Decision**: `/clients` と `/inquiries` を `src/app/(dashboard)/` 直下に配置し、ヘッダーナビに全ロール向けに表示する。

**Rationale**:
- 顧客・引き合いは全ロールが利用する主要機能。admin 専用の `settings/` 配下に置くのは不適切
- 申請一覧（`/requests`）と並列のトップレベルナビとすることで、Clearflow の主要な業務フロー（引き合い → 商談化 → 承認）の視認性を高める

#### Alternative 1: settings 配下に配置

| | |
|---|---|
| **Pros** | 既存のルート構造を変更しなくて済む |
| **Cons** | `settings/` は admin 専用ガードが設定されており、全ロールが利用する機能の配置場所として不適切 |
| **Why not** | ロール制限と機能の想定利用者が矛盾するため |

---

## Consequences

### Positive

- 承認ワークフロー SaaS に業務ドメイン（案件管理）の基盤が確立され、「引き合い → 商談化 → 承認」の一連のフローを実現できた
- 案件管理ドメインから承認ドメインへの依存は usecase 層（`inquiries.requestId` FK）に閉じており、承認ドメインの独立性が保たれている
- `inquiryTransition.ts` が `requestTransition.ts` と同じパターンで定義され、状態遷移の管理方針が統一された
- 顧客・担当者の正規化により、将来の担当者参照（複数の引き合いが同じ担当者を参照）が可能になった

### Negative / Trade-offs

- `updateInquiryStatus` と `createRequest` で Request 作成ロジックが重複している。2 箇所の範囲で許容するが、3 箇所目が生じた場合はリポジトリレベルの共通ヘルパーへの抽出を検討すること
- `client_contacts` に `organizationId` がないため、担当者の直接クエリはテナント分離が暗黙的（JOIN が必要）になる
- `inquiries.requestId` の FK が nullable のため、承認リクエスト削除時に `set null` で orphan が残る。承認リクエストの削除機能を実装する際は引き合い側の整合性を確認すること

### Constraints for future changes

- **案件管理ドメインの拡張**（商談・案件等）: `inquiries.requestId` と同じ「業務ドメイン側が承認ドメインへの FK を持ち、承認ドメインは業務ドメインを知らない」パターンを踏襲すること
- **担当者（client_contacts）の直接クエリが必要になった場合**: JOIN で `clients.organizationId` をテナント条件に含めるか、`organizationId` カラムの追加を検討すること（D2 参照）
- **流入経路（source）の値追加**: Zod スキーマのみ変更すればよい。DB マイグレーションは不要
- **新しいステータスの追加**: `inquiryTransition.ts` の遷移マップと `inquiryStatusEnum` の両方を更新し、`updateInquiryStatus` の権限チェックへの影響も確認すること
- **`converted` 以外のステータスへの権限制限追加**: D8 の Server Action 層チェックを更新すること

---

## References

- `specrunner/changes/client-inquiry-foundation/design.md` — 詳細設計（D1〜D10）
- `specrunner/changes/client-inquiry-foundation/request.md` — 要件定義
- `src/infrastructure/schema.ts` — clients / client_contacts / inquiries テーブル定義
- `src/domain/services/inquiryTransition.ts` — 引き合い状態遷移ルール
- `src/application/usecases/updateInquiryStatus.ts` — 商談化時の Request 自動作成ロジック
- `src/app/actions/inquiries.ts` — ステータス変更権限ゲート
- `drizzle/0007_client_inquiry_foundation.sql` — テーブル追加マイグレーション
