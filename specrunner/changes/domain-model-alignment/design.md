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

**Rationale**: 引合段階（Deal 未作成）でも商談記録を取れるようにする。1 つの Meeting は 1 つの文脈（引合 or 案件）に属するため、nullable + CHECK が最もシンプル。

**Alternatives considered**:
- 中間テーブルで多対多: 1 商談 = 1 文脈なので過剰
- dealId 必須のまま: 引合段階の商談が記録できない

### D3: Attendee 移行で userId は null

既存の `internal` 配列要素は人名文字列であり UUID ではない。マイグレーションで `userId` に人名をセットすると、将来の外部キー参照でエラーになる。`userId: null, contactId: null` として移行し、名前だけを保持する。

**Rationale**: データの型安全性を優先する。userId の紐付けは別途の運用タスク（ユーザーマッチング）として将来実施可能。

**Alternatives considered**:
- value を userId にもセット: UUID 形式ではないため型エラーの原因になる

### D4: マイグレーションは手書き SQL + Drizzle generate の併用

スキーマ変更（カラム追加・nullable 変更）は `drizzle-kit generate` で差分 SQL を生成する。データ変換（source のフォールバック、attendees の構造変換）と CHECK 制約の追加は手書き SQL を同じマイグレーションファイルに追記する。

**Rationale**: Drizzle Kit はカラム追加・型変更の DDL を自動生成するが、データ変換や CHECK 制約は未サポート。手書き SQL を組み合わせることで安全にマイグレーションを行う。

**Alternatives considered**:
- 全て手書き SQL: Drizzle のスキーマとの不整合リスクが高い
- Drizzle Kit のみ: CHECK 制約やデータ変換に対応できない

### D5: validatePrimaryUniqueness の配置

`src/domain/services/clientContactService.ts` に新設する。この関数はリポジトリ（DB 問い合わせ）を呼び出すため純粋な domain service ではないが、ビジネスルール（1 顧客に isPrimary=true は 1 担当者まで）の検証をカプセル化する目的で domain/services に配置する。

呼び出し側:
- `createClientContact` use case: isPrimary パラメータを追加し、create 前にバリデーションを実行
- `updateClientContactAction` action: use case をバイパスしている既存問題は本リクエストでは修正せず、action 内で直接 `validatePrimaryUniqueness` を呼び出す

**Rationale**: use case のバイパス修正は影響範囲が大きいため分離する。検証ロジックを共通関数に抽出することで、将来 use case に統合した際もロジックの重複がない。

**Alternatives considered**:
- repository 層に配置: ビジネスルールの検証は domain 層の責務
- use case 内にインライン実装: updateClientContactAction からも呼び出す必要があり重複する

### D6: Meeting の relations 更新

`meetingsRelations` に `inquiry` relation を追加する。`deal` relation は `meetings.dealId` が nullable になるため、LEFT JOIN 相当の挙動になる（Drizzle ORM の relations は nullable FK で自動的に optional になる）。

Repository の `findAllByDeal` は dealId での絞り込みなので影響なし。新規に `findAllByInquiry` メソッドを追加して inquiryId での検索を可能にする。

## Risks / Trade-offs

[Risk] **既存データの attendees 変換でデータ破損** → Mitigation: マイグレーション SQL で JSONB 変換関数を使い、変換前に既存構造を検証する。internal/external キーが存在しないレコードはデフォルト空配列として処理する。

[Risk] **source の enum 変更で既存データに不正値がある** → Mitigation: マイグレーション SQL で enum に含まれない値を `'other'` にフォールバックしてから型変更を適用する。

[Risk] **dealId を nullable に変更することで既存クエリが壊れる** → Mitigation: 既存の `findAllByDeal` は `eq(meetings.dealId, dealId)` で絞り込むため、NULL レコードは自動的に除外される。`mapRow` の dealId マッピングを nullable 対応にする。

[Risk] **CHECK 制約が Drizzle Kit の generate で認識されない** → Mitigation: CHECK 制約は手書き SQL でマイグレーションファイルに追記する。Drizzle スキーマ定義にはコメントで制約の存在を記載する。

[Trade-off] **validatePrimaryUniqueness が DB 問い合わせを行うため domain service の純粋性が崩れる** → 許容する。ビジネスルール検証の一元化を優先する。関数シグネチャに Transaction を受け取ることで、呼び出し元のトランザクション内で実行可能にする。

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
