# Design: 顧客・引き合い管理基盤

## Context

Clearflow は承認ワークフロー SaaS として動作しているが、承認対象となる業務ドメインとの統合がない。受託開発の案件管理を導入するにあたり、最初のエントリポイントとして「顧客（企業＋担当者）」と「引き合い（問い合わせ・商談化判断）」をシステムに組み込む。

現状のコードベース:
- スキーマ定義は `schema.ts` に集約。テナント分離は `organizationId` FK、楽観ロックは `version` カラム（`requests` テーブルで確立済み）
- ドメインモデルは `src/domain/models/` に ORM 非依存の `type` エイリアスで定義。barrel export で統一
- 状態遷移ルールは `src/domain/services/requestTransition.ts` に純粋関数で定義（`VALID_TRANSITIONS` マップ + `validateTransition()`）
- リポジトリは `src/infrastructure/repositories/` に集約。`mapRow()` 内部関数で DB→ドメイン型変換、オプション `tx` パラメータでトランザクション対応
- ユースケースは `src/application/usecases/` に 1 usecase = 1 関数。`db.transaction()` 内で業務操作 + `auditLogRepository.create()` を実行。Result 型 `{ ok: true; data } | { ok: false; reason }` で返却
- Server Actions は `"use server"` 宣言、`auth()` 認証、Zod バリデーション、レート制限、`revalidatePath()` のパターンが確立
- ダッシュボードレイアウトのヘッダーナビに申請一覧（全ロール）、設定・監査ログ（admin のみ）が配置
- 共有コンポーネントとして `PageToolbar`, `DataTable`, `FormField`, `LinkButton`, `SectionCard` が利用可能
- `organizationsRelations` が全テナント所有テーブルの `many()` を集約
- Auth.js adapter テーブルがスキーマファイル末尾に配置。新テーブルはその前に挿入する

## Goals / Non-Goals

**Goals**:
- `clients` テーブル（企業情報）、`client_contacts` テーブル（担当者）、`inquiries` テーブル（引き合い）を追加する
- 引き合いのステータス遷移（`new → in_progress → converted / declined`）をドメインサービスで管理する
- `converted` 遷移時に既存の承認テンプレートを利用して Request（承認リクエスト）を自動作成し、引き合いと紐づける
- 顧客一覧・登録・詳細、引き合い一覧・登録・詳細の UI ページを追加する
- ダッシュボードヘッダーに顧客・引き合いナビを追加する（全ロール）
- シードデータ・テスト・Relations を整備する

**Non-Goals**:
- 商談（Meeting）管理、案件（Deal）管理
- 顧客の編集・削除 UI
- 引き合いの編集 UI（ステータス変更以外）
- 担当者の編集・削除 UI
- 顧客・引き合いに対する Webhook 通知
- CSVインポート・エクスポート
- 検索・ソート・ページネーション

## Decisions

### D1: 顧客と担当者を正規化した別テーブルで管理する（architect 決定済み）

**決定**: `clients`（企業情報）と `client_contacts`（担当者）を別テーブルで管理する。

**理由**: 担当者は `inquiries.contactId` から FK 参照する必要がある。jsonb カラムに埋め込むと参照整合性を保証できない。

**代替案**: 担当者を clients テーブルの jsonb カラムで管理する案。FK 参照が不可能なため却下。

### D2: 引き合いのステータス遷移をドメインサービスで管理する（architect 決定済み）

**決定**: `src/domain/services/inquiryTransition.ts` に遷移ルールと `canTransition(from, to): boolean` を定義する。

**理由**: 既存の `requestTransition.ts` と同じパターンに合わせる。遷移ルールを一箇所で管理し、テスト容易性を確保する。

**代替案**: usecase 内で直接チェックする案。ルールが分散し、テストが困難になるため却下。

### D3: 商談化時に既存の Request を自動作成する連携パターン（architect 決定済み）

**決定**: `updateInquiryStatus` usecase で `converted` 遷移時に `requestRepository.create()` + `approvalStepRepository.createMany()` を呼び出して承認リクエストを作成し、`inquiries.requestId` に紐づける。`createRequest` usecase の内部ロジック（テンプレートのステップ取得→フィルタリング→承認ステップ生成→audit_log）を同一トランザクション内で再現する。

**理由**: 既存の承認テンプレート・承認ステップの仕組みをそのまま活用する。案件管理ドメインから承認ドメインへの依存は usecase 層で閉じる。

**代替案**: 独自の承認機構を新設する案。既存機能の重複であり、メンテナンスコストが増えるため却下。

### D4: inquiries.requestId で引き合い側から承認リクエストを参照する（architect 決定済み）

**決定**: `inquiries` テーブルに `requestId` (FK to requests, nullable) を持たせ、引き合い側から承認リクエストを参照する。

**理由**: 承認ドメイン（Request）は案件管理ドメインを知らない方が疎結合。引き合い側が参照を持つことで、将来的な分離が容易。

**代替案**: Request 側に `inquiryId` カラムを追加する案。承認ドメインが案件管理を知ることになり、結合度が上がるため却下。

### D5: 顧客・引き合いページをダッシュボード直下のトップレベルルートに配置する（architect 決定済み）

**決定**: `/clients` と `/inquiries` をダッシュボード直下に配置し、ヘッダーナビで全ロールに表示する。

**理由**: 顧客・引き合いは全ロールが利用する主要機能。admin 専用の settings 配下に置くのは不適切。

**代替案**: settings 配下に配置する案。ロール制限が不要な機能を admin 専用領域に置くのは矛盾するため却下。

### D6: 流入経路（source）を固定文字列で管理する（architect 決定済み）

**決定**: `inquiries.source` は text カラムとし、アプリケーション層で `"web" | "phone" | "referral" | "exhibition" | "other"` の 5 値を Zod enum でバリデーションする。DB 側には pgEnum を追加しない。

**理由**: 初期段階ではカスタマイズ不要。5 種類の固定値で十分。スキーマ側は text として、将来の拡張時に DB マイグレーションなしで値を追加できる柔軟性を確保する。

**代替案**: pgEnum で DB 側に制約をかける案。値の追加に ALTER TYPE が必要になり、初期段階では過剰なため却下。マスタテーブル方式も同様に初期段階では不要。

### D7: inquiryStatusEnum を pgEnum で定義する

**決定**: `inquiryStatusEnum` を pgEnum `["new", "in_progress", "converted", "declined"]` で定義する。

**理由**: ステータスは引き合いのライフサイクルを表す有限状態であり、不正値の混入を DB レベルで防ぐべき。`requestStatusEnum` と同じ方式を踏襲する。流入経路（source）とは異なり、ステータス値の追加は状態遷移ロジックの変更を伴うため、DB 側の制約が安全策として機能する。

### D8: client_contacts に organizationId を持たせない

**決定**: `client_contacts` テーブルには `organizationId` カラムを追加しない。テナント分離は `clientId` 経由で `clients.organizationId` に委譲する。

**理由**: `client_contacts` は常に `clients` に従属する。`clientRepository.findById(clientId, organizationId)` で取得した顧客の担当者であることを保証すれば、直接の `organizationId` カラムは不要。データの冗長性を排除する。

**リスク**: 担当者を直接クエリする場合はサブクエリまたは JOIN で `clients.organizationId` を条件に含める必要がある。本変更では担当者の直接クエリユースケースがないため影響しない。

### D9: ステータス変更の権限チェック — Server Action 層で制御する

**決定**: 引き合いのステータス変更 Server Action で、`converted` への遷移時は `session.user.role` が `admin` または `manager` であることをチェックする。その他のステータス変更は全ロールに許可する。

**理由**: 商談化（`converted`）は承認リクエストの自動作成を伴う重要な操作であり、権限制限が必要。`declined`（見送り）や `in_progress`（対応中）は日常的な操作であり、全ロールに開放する。

### D10: updateInquiryStatus で createRequest usecase を直接呼ばず、リポジトリを使う

**決定**: `updateInquiryStatus` usecase 内で `converted` 遷移時に `requestRepository.create()` と `approvalStepRepository.createMany()` を直接呼び出す。`createRequest` usecase は呼び出さない。

**理由**: `createRequest` usecase は Webhook 送信（fire-and-forget）を含んでおり、トランザクション外の副作用がある。また、usecase → usecase の呼び出しは依存方向の原則に違反する。同一トランザクション内で inquiries の更新と Request 作成を行うため、リポジトリ層を直接操作する。

**代替案**: `createRequest` usecase を呼び出す案。トランザクション境界の制御ができず、Webhook の二重送信リスクがあるため却下。

## Risks / Trade-offs

**[Risk] updateInquiryStatus 内での Request 作成ロジックが createRequest と重複する**
→ Mitigation: テンプレートの steps 取得・フィルタリング・承認ステップ生成のロジックは `createRequest` と同じパターンを踏襲する。将来的に共通ヘルパーへの抽出を検討するが、現時点では 2 箇所に留まるため許容する。テストで動作を担保する。

**[Risk] client_contacts に organizationId がないため、直接クエリ時のテナント分離が暗黙的になる**
→ Mitigation: 本変更では `client_contacts` を `clientId` 経由でのみアクセスする。リポジトリ関数の JSDoc でテナント分離の前提を明記する。将来的に担当者直接検索が必要になった場合は、JOIN 条件で `clients.organizationId` を含めるか、`organizationId` カラムの追加を検討する。

**[Risk] inquiries.requestId の FK 参照先が nullable であり、承認リクエスト削除時に orphan が発生する可能性がある**
→ Mitigation: `requests` テーブル側の削除は現在スコープ外（削除機能が存在しない）。FK に `onDelete: "set null"` を設定し、万が一の削除時に引き合いが壊れないようにする。

## Open Questions

None — 全設計判断は architect 評価済み。
