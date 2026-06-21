# Design: 契約管理

## Context

案件（Deal）が受注（won）した後、契約情報を管理する仕組みが存在しない。受注金額・契約期間・契約種別・支払条件を記録し、案件の受注後ライフサイクルを追跡する Contract ドメインを導入する。

現状のコードベース:
- `deals` テーブルに `phase: dealPhaseEnum` があり、`won` が受注確定の終端状態（`src/infrastructure/schema.ts:49-55, 303-330`）
- `deals` テーブルは `clientId` (NOT NULL FK) を持つ（`schema.ts:310-312`）
- `Deal` ドメインモデルは `clientId`, `estimatedAmount`, `estimatedStartDate`, `estimatedEndDate`, `contractType` を保持する（`src/domain/models/deal.ts:20-38`）
- ダッシュボードナビは 顧客 > 引き合い > 案件 > 申請一覧 の順（`layout.tsx:25-48`）
- `dealRepository` は `create`, `findById`, `findAllByOrganization`, `findByInquiryId`, `update`, `updatePhase` の6メソッドを持つ。全クエリに `organizationId` 条件が付与されている
- `createDeal` usecase はトランザクション内で `dealRepository.create` + `auditLogRepository.create` を実行するパターンが確立済み
- Server Actions は `auth()` → ロールガード → zod バリデーション → レート制限 → usecase 呼び出し → `revalidatePath` のパターンが統一されている

## Goals / Non-Goals

**Goals**:
- `contracts` テーブル・enum 2 種（`contractStatusEnum`, `renewalTypeEnum`）を `schema.ts` に追加する
- `Contract` ドメインモデル・状態遷移ルール（`canContractTransition`）を domain layer に追加する
- `contractRepository` に CRUD メソッド（create, findById, findByDealId, findAllByOrganization, update）を追加する
- 契約管理の usecase 5 本（createContract, updateContract, updateContractStatus, listContracts, getContract）を追加する
- 契約管理の Server Actions を追加する（create, update, updateStatus, list, get）
- `/contracts` 一覧、`/contracts/[id]` 詳細、`/contracts/[id]/edit` 編集の UI ページを追加する
- 案件詳細ページ（`/deals/[id]`）に契約セクションを追加する
- ダッシュボードヘッダーナビに「契約」リンクを追加する
- Relations 定義を追加する（contracts ↔ organizations, deals, clients）
- シードデータに won 案件対応の Contract を1件追加する
- `projectStructure.test.ts` にモデル・テナント分離テストを追加する
- マイグレーションファイルを生成する

**Non-Goals**:
- Invoice（請求）ドメイン
- 契約の PDF 生成
- 契約更新の自動化
- 契約と承認ワークフローの連携

## Decisions

### D1: 1 Deal = 1 Contract（unique 制約）（architect 決定済み）

**決定**: `contracts.dealId` に unique 制約を設定し、1 Deal に対して Contract は最大1件とする。

**理由**: 追加発注は別 Deal → 別 Contract として管理する。1つの受注に複数の契約が紐づくケースは実務上稀であり、シンプルさを優先する。

**代替案**: 1:N（1 Deal に複数 Contract を許可する案）。管理の複雑さに対して実務上のメリットが薄い。

### D2: Contract に clientId を直接保持（architect 決定済み）

**決定**: `contracts` テーブルに `clientId` (FK to clients, NOT NULL) を持たせる。

**理由**: 契約一覧で顧客名を表示する際に Deal 経由の JOIN が不要になる。Deal と Contract の顧客は常に一致するため冗長だが、クエリのシンプルさを優先する。

**代替案**: Deal 経由の間接参照のみにする案。一覧表示のクエリが複雑化する。

### D3: contractType を text 型で管理（architect 決定済み）

**決定**: `contracts.contractType` を Deal と同じ text 型（nullable）で管理する。

**理由**: Deal から引き継ぐ値であり、型の一貫性を保つ。将来 enum 化する場合は Deal と Contract を同時に移行する。

**代替案**: enum 化する案。Deal 側が text で管理しているため不整合が生じる。

### D4: renewalType を enum で管理（architect 決定済み）

**決定**: `renewalTypeEnum` を `["one_time", "recurring"]` で定義し、`contracts.renewalType` に適用する。

**理由**: 2値は固定で変動しない。DB レベルで制約する意味がある。

**代替案**: text 型で管理する案。値の制約が DB 層で担保されない。

### D5: Contract ステータス遷移 — domain service で管理

**決定**: `src/domain/services/contractTransition.ts` に `canContractTransition` 関数を追加する。`active` → `completed` / `cancelled` のみ許可。`completed` / `cancelled` は終端状態。

**理由**: 既存の `dealTransition.ts` と同一パターンを踏襲する。usecase が domain service を呼び出してバリデーションする構造を維持する。

**代替案**: usecase 内にインラインでガードを書く案。ロジックの再利用性が低下し、テスト対象が分散する。

### D6: createContract で Deal 情報を初期値として引き継ぎ

**決定**: `createContract` usecase で `dealId` から Deal を取得し、`title`, `contractType`, `estimatedAmount`（→ amount）, `estimatedStartDate`（→ startDate）, `estimatedEndDate`（→ endDate）, `clientId` を Contract の初期値として設定する。明示的に渡された値は初期値を上書きする。

**理由**: 受注時の情報が契約のデフォルト値として最も自然。ユーザーが手動入力する負担を減らす。

### D7: 契約操作の権限 — admin / manager のみ

**決定**: 契約の作成・更新・ステータス変更は `admin` または `manager` ロールのみ許可する。一覧・詳細は全ロールに公開する。

**理由**: 案件操作（createDeal, updateDealPhase 等）と同一の権限モデルを踏襲する。

### D8: 契約一覧のクエリ — clients テーブルを JOIN して顧客名を返す

**決定**: `contractRepository.findAllByOrganization` で `clients` テーブルを INNER JOIN し、顧客名を含む `ContractWithClient` 型を返す。`dealRepository.findAllByOrganization` の `DealWithDetails` パターンを踏襲する。

**理由**: 一覧表示で顧客名は必須情報。D2 で clientId を直接持たせているため、1段の JOIN で取得可能。

## Risks / Trade-offs

**[Risk] clientId の冗長保持による整合性リスク**
→ Mitigation: `createContract` で Deal の `clientId` を自動設定する。Contract の `clientId` を後から変更する手段は提供しない（update 対象外）。

**[Risk] unique 制約（dealId）によるマイグレーション時の影響**
→ Mitigation: 既存データに contracts レコードはないため、unique 制約追加のマイグレーションはデータ競合なく適用可能。

**[Risk] deals テーブルへの FK 追加が cascade delete 挙動に影響**
→ Mitigation: `contracts.dealId` の FK に `onDelete` は指定しない（デフォルトの RESTRICT）。Deal 削除前に Contract の処理が必要であることを明示する。

## Open Questions

なし（architect 評価済みの設計判断により主要な論点は解決済み）。
