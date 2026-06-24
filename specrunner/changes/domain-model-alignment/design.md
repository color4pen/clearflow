# Design: domain-model-alignment

## Context

ドメイン設計書と実装コードの間にモデル定義の乖離が存在する。具体的には:

- **Inquiry**: `budget` / `timeline` フィールドが未実装。`source` カラムが text 型で列挙型制約がない。`InquirySource` 型に `email` / `agent_service` が不足
- **Meeting**: `inquiryId` カラムがなく引合段階の商談を記録できない。`dealId` が NOT NULL で必須。`attendees` の JSON 構造が `{ internal: string[], external: string[] }` で設計と異なる
- **Deal**: `description` カラムが未実装
- **ClientContact**: `isPrimary` の一意性がアプリケーション層で検証されていない

契約系（`contracts.amount` / `startDate` の NOT NULL 化、`invoices.issueDate` 追加）は R05 で実施済みのため本スコープ外。

### 現状の構造

- スキーマ定義: `src/infrastructure/schema.ts`
- ドメインモデル型: `src/domain/models/{inquiry,meeting,deal}.ts`
- リポジトリ: `src/infrastructure/repositories/{inquiry,meeting,deal}Repository.ts`
- ユースケース: `src/application/usecases/create{Inquiry,Meeting}.ts` 等
- アクション: `src/app/actions/{inquiries,meetings,deals,clients}.ts`
- マイグレーション: Drizzle Kit (`drizzle/` ディレクトリ、`drizzle-kit generate` で生成)
- ドメインサービス: `src/domain/services/` — `clientContactService.ts` は未作成

## Goals / Non-Goals

**Goals**:

1. Inquiry テーブルに `budget` (integer, nullable) と `timeline` (text, nullable) を追加し、モデル型に反映する
2. `inquirySourceEnum` を pgEnum として定義し、7 値 (`web | phone | email | referral | agent_service | exhibition | other`) に拡張する。既存 text 型カラムを enum 型に変更する
3. Meeting テーブルに `inquiry_id` (uuid, nullable, FK) を追加し、`deal_id` を nullable に変更し、CHECK 制約を追加する
4. Meeting の `attendees` JSON 構造を `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>` に変更する
5. Deal テーブルに `description` (text, nullable) を追加し、モデル型に反映する
6. `clientContactService.ts` に `validatePrimaryUniqueness` 関数を新設し、`createClientContact` use case と `updateClientContactAction` から呼び出す

**Non-Goals**:

- Deal の extra フィールド（assigneeId, technicalLeadId, estimateRequestId, notes, version）の削除判断
- DealPhase への `estimate_approval` 追加
- actionItems の assignee 型変更（string → userId）
- updatedAt / version カラムの削除
- Contract / Invoice の変更（R05 で完了済み）
- UI コンポーネントの変更（本リクエストはスキーマ・モデル・ロジック層のみ）

## Decisions

### D1: source カラムを pgEnum に変更する

Drizzle スキーマに `inquirySourceEnum` を pgEnum として定義する。マイグレーション SQL では:

1. enum 型を CREATE TYPE で作成
2. 既存データのうち enum に含まれない値を `'other'` に UPDATE
3. ALTER COLUMN で text → enum に USING 句で型変換

**Rationale**: text のままだとアプリ層バリデーションだけでは DB 側に不正値が残るリスクがある。pgEnum にすることで承認ポリシーの条件評価（`source eq "agent_service"` 等）が DB レベルで保証される。

**Alternatives considered**:
- text + CHECK 制約: 新しい値の追加時に ALTER TABLE が必要で enum と同等のコスト。pgEnum のほうが Drizzle ORM との統合が自然
- text + アプリ層バリデーションのみ: DB 制約が弱く、直接 SQL 操作で不正値が入る

### D2: Meeting の dealId / inquiryId を両方 nullable + CHECK 制約

`deal_id` を nullable に変更し、`inquiry_id` (nullable, FK → inquiries.id) を追加する。CHECK 制約 `deal_id IS NOT NULL OR inquiry_id IS NOT NULL` で少なくとも一方が必須であることを保証する。

CHECK 制約は `schema.ts` の `meetings` テーブル定義に Drizzle の `check()` として定義する（コメント記載のみでは、将来 `drizzle-kit generate` を実行したときに DB との差分として検出され `DROP CONSTRAINT` が生成されてしまうため）。

**Rationale**: 引合段階（Deal 未作成）でも商談記録を取れるようにする。1 つの Meeting は 1 つの文脈（引合 or 案件）に属するため、nullable + CHECK が最もシンプル。Drizzle check() で定義することでスキーマ定義と DB 状態の一貫性を将来も維持できる。

**Alternatives considered**:
- 中間テーブルで多対多: 1 商談 = 1 文脈なので過剰
- dealId 必須のまま: 引合段階の商談が記録できない
- コメントのみで制約を記録: drizzle-kit generate が将来 DROP CONSTRAINT を生成するリスクがある

### D3: Attendee 移行で userId は null

既存の `internal` 配列要素は人名文字列であり UUID ではない。マイグレーションで `userId` に人名をセットすると、将来の外部キー参照でエラーになる。`userId: null, contactId: null` として移行し、名前だけを保持する。

**Rationale**: データの型安全性を優先する。userId の紐付けは別途の運用タスク（ユーザーマッチング）として将来実施可能。

**Alternatives considered**:
- value を userId にもセット: UUID 形式ではないため型エラーの原因になる

### D4: マイグレーションは手書き SQL + Drizzle generate の併用

スキーマ変更（カラム追加・nullable 変更）は `drizzle-kit generate` で差分 SQL を生成する。データ変換（source のフォールバック、attendees の構造変換）は手書き SQL を同じマイグレーションファイルの**正しい位置**に挿入する。

source enum 変換の UPDATE は必ず `ALTER COLUMN … USING` の**前**に置く。PostgreSQL は ALTER COLUMN で text → enum への型変換を行う際、既存値が enum に含まれない場合エラーを返す。「末尾に追記」という解釈を避けるため、実装者は生成された SQL ファイルを編集し、UPDATE が ALTER COLUMN より前に来ることを目視確認してから保存すること。

CHECK 制約は schema.ts の `check()` で定義するため、drizzle-kit generate が自動生成する。手書きの `ALTER TABLE ADD CONSTRAINT` は不要（重複して追加しないよう注意）。

**Rationale**: Drizzle Kit はカラム追加・型変更の DDL を自動生成するが、データ変換は未サポート。手書き SQL を正しい順序で挿入することで安全にマイグレーションを行う。

**Alternatives considered**:
- 全て手書き SQL: Drizzle のスキーマとの不整合リスクが高い
- Drizzle Kit のみ: データ変換に対応できない
- 末尾に一括追記: source UPDATE が ALTER COLUMN より後になり本番 migration 失敗の原因になる

### D5: validatePrimaryUniqueness の配置

`src/application/services/clientContactService.ts` に新設する。この関数はリポジトリ（DB 問い合わせ）を呼び出すため、domain/services には配置しない。プロジェクトの「domain layer は repository を呼び出さない」原則を維持し、domain/services の既存ファイル（approvalStepService, contractTransition 等）はすべてリポジトリ非依存の純粋関数として保つ。

`createClientContact` use case は db.transaction ブロックで検証と挿入を囲む。これにより、並行リクエストによる TOCTOU 競合（SELECT と INSERT が別トランザクションになる問題）を防ぐ。

呼び出し側:
- `createClientContact` use case: db.transaction ブロック内で isPrimary パラメータを検証し、create 前に `validatePrimaryUniqueness(clientId, null, isPrimary, tx)` を呼び出す
- `updateClientContactAction` action: use case をバイパスしている既存問題は本リクエストでは修正せず、action 内で直接 `validatePrimaryUniqueness` を呼び出す

**Rationale**: use case のバイパス修正は影響範囲が大きいため分離する。検証ロジックを application/services に抽出することで、将来 use case に統合した際もロジックの重複がなく、かつ domain 層の純粋性も維持できる。

**Alternatives considered**:
- domain/services に配置: この関数は clientRepository を呼び出すためプロジェクト原則に違反する
- use case 内にインライン実装: updateClientContactAction からも呼び出す必要があり重複する
- repository 層に配置: ビジネスルールの検証は repository の責務ではない

### D6: Meeting の relations 更新

`meetingsRelations` に `inquiry` relation を追加する。`deal` relation は `meetings.dealId` が nullable になるため、LEFT JOIN 相当の挙動になる（Drizzle ORM の relations は nullable FK で自動的に optional になる）。

Repository の `findAllByDeal` は dealId での絞り込みなので影響なし。新規に `findAllByInquiry` メソッドを追加して inquiryId での検索を可能にする。

## Risks / Trade-offs

[Risk] **既存データの attendees 変換でデータ破損** → Mitigation: マイグレーション SQL で JSONB 変換関数を使い、変換前に既存構造を検証する。internal/external キーが存在しないレコードはデフォルト空配列として処理する。

[Risk] **source の enum 変更で既存データに不正値がある** → Mitigation: マイグレーション SQL で enum に含まれない値を `'other'` にフォールバックしてから型変更を適用する。

[Risk] **dealId を nullable に変更することで既存クエリが壊れる** → Mitigation: 既存の `findAllByDeal` は `eq(meetings.dealId, dealId)` で絞り込むため、NULL レコードは自動的に除外される。`mapRow` の dealId マッピングを nullable 対応にする。

[Risk] **CHECK 制約が Drizzle Kit の generate で認識されない** → Mitigation: CHECK 制約は手書き SQL でマイグレーションファイルに追記する。Drizzle スキーマ定義にはコメントで制約の存在を記載する。

[Trade-off] **validatePrimaryUniqueness を application/services に配置することで domain/services とは別のディレクトリが生まれる** → 許容する。DB 問い合わせを行う関数を domain/services に置くとプロジェクトの「domain layer は repository を呼び出さない」原則が崩れるため、application/services に分離することで各層の責務を明確に保つ。関数シグネチャに Transaction を受け取ることで、呼び出し元のトランザクション内で実行可能にする。

## Migration Plan

1. スキーマ定義（`schema.ts`）を変更する
2. `drizzle-kit generate` で差分 SQL を生成する
3. 生成された SQL にデータ変換・CHECK 制約の手書き SQL を追記する
4. ドメインモデル型・リポジトリ・ユースケース・アクションを更新する
5. `drizzle-kit push` または `bun run db:migrate` でマイグレーションを実行する
6. `typecheck && test` で検証する

ロールバック: マイグレーション SQL の逆順操作（enum → text、カラム DROP、CHECK 制約 DROP）で対応可能。attendees の逆変換は JSON 構造の再変換が必要。

## Open Questions

（なし — architect の設計判断で主要な論点は解決済み）
