# ADR-014: ドメインモデル設計整合 — スキーマ・型・レイヤー責務の一斉修正

- **Status**: accepted
- **Date**: 2026-06-24
- **Change**: domain-model-alignment
- **Deciders**: architect

---

## Context

ADR-009〜ADR-013 を通じて顧客・引き合い管理・商談管理・売上モジュール等の業務ドメインを実装してきた結果、ドメイン設計書と実装コードの間に複数の乖離が生じていた。

具体的な乖離:

- **Inquiry**: `budget` / `timeline` フィールドが未実装。`source` カラムが text 型（ADR-009 D4 の判断）で列挙型制約がなく、承認ポリシーの条件評価（`source eq "agent_service"`）でDB外から不正値が混入するリスクがあった。`InquirySource` 型に `email` / `agent_service` が不足
- **Meeting**: `inquiryId` カラムがなく引合段階（Deal 未作成）での商談記録ができなかった。`dealId` が NOT NULL 必須のため、引合に紐づく商談が記録できない。`attendees` の JSON 構造が `{ internal: string[], external: string[] }` という旧フラット形式で、userId/contactId による将来的な参照整合性を確保できない形式だった
- **Deal**: `description` カラムが未実装
- **ClientContact**: `isPrimary` の一意性がアプリケーション層で検証されておらず、並行リクエスト時に複数の主担当者が作成されうる状態だった

また、DB に問い合わせるビジネスルール検証関数をどのレイヤーに配置するかという設計方針が未確立だった。

---

## Decisions

### D1: inquiries.source を pgEnum に変更する（ADR-009 D4 の反転）

**Decision**: `inquirySourceEnum` を Drizzle の `pgEnum` として定義し、7値（`web | phone | email | referral | agent_service | exhibition | other`）で制約する。既存の text 型 source カラムをこの enum に変更する。

**Rationale**:
- ADR-009 D4 では「流入経路は将来値追加があり得るため text で管理しコストを下げる」と判断したが、承認ポリシーの条件評価で `source eq "agent_service"` が使われるようになり、DB レベルの型保証がないと直接 SQL 操作で不正値が入るリスクが顕在化した
- pgEnum にすることで DB 制約として承認ポリシーの前提条件（特定の source 値の存在）を保証できる
- `other` 値を含めることで、将来の値追加が必要になるまでの運用を「other で受け止める」形にし、`ALTER TYPE` の頻度を抑制できる

**ADR-009 D4 との整合**: ADR-009 D4 の「ALTER TYPE コストを避ける」という懸念は、`other` フォールバック値の導入と `ALTER TYPE ... ADD VALUE` の PostgreSQL トランザクション外実行要件を受け入れることで対処する。値を7つに固定することで今後の追加頻度は低いと判断した。

#### Alternative 1: text + CHECK 制約

| | |
|---|---|
| **Pros** | 新しい値の追加が `ALTER TABLE` で完結する |
| **Cons** | 新しい値の追加時に `ALTER TABLE` が必要で pgEnum と同等のコスト。Drizzle ORM との統合が pgEnum より不自然 |
| **Why not** | pgEnum との運用コスト差がなく、Drizzle との統合面で劣るため |

#### Alternative 2: text + アプリケーション層バリデーションのみ（ADR-009 D4 の選択）

| | |
|---|---|
| **Pros** | スキーマ変更が不要。値の追加が Zod スキーマのみで完結する |
| **Cons** | DB 制約がなく、直接 SQL 操作や ORM 外の書き込みで不正値が入りうる。承認ポリシーの条件評価の前提が崩れる |
| **Why not** | 承認ポリシーでの source 値参照が実装されたことで、DB レベルの保証が必要になったため |

---

### D2: Meeting の dealId / inquiryId を両方 nullable + CHECK 制約で管理する

**Decision**: `meetings.deal_id` を nullable に変更し、`inquiry_id`（uuid, nullable, FK → inquiries.id）を追加する。CHECK 制約 `deal_id IS NOT NULL OR inquiry_id IS NOT NULL` で少なくとも一方が必須であることを保証する。CHECK 制約は `schema.ts` の `check()` として定義し、`drizzle-kit generate` に認識させる。

**Rationale**:
- 引合段階（Deal 未作成）でも商談記録を残せるようにする。`dealId` 必須のままでは引合に紐づく商談が記録できない
- 1 つの Meeting は 1 つの文脈（引合または案件）に属するため、nullable + CHECK が最もシンプルな表現になる
- CHECK 制約を schema.ts の `check()` で定義することで、将来の `drizzle-kit generate` が `DROP CONSTRAINT` を生成するリスクを防ぐ

#### Alternative 1: 中間テーブルで多対多

| | |
|---|---|
| **Pros** | 将来的に1商談が複数の文脈に属する可能性に対応できる |
| **Cons** | 実装コストが高い。1商談=1文脈という現在の要件には過剰 |
| **Why not** | 要件を超えた過剰設計であり、単純な nullable + CHECK で要件を満たせるため |

#### Alternative 2: dealId 必須のまま維持

| | |
|---|---|
| **Pros** | 既存コードへの変更が最小 |
| **Cons** | 引合段階の商談が記録できない。引合と商談の関係を表現できない |
| **Why not** | 要件を満たせないため |

---

### D3: attendees JSONB 移行で userId は null とする

**Decision**: 既存の `attendees` データ（`{ internal: string[], external: string[] }` 形式）を新形式（`Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>`）に変換する際、`userId` と `contactId` は `null` とし、`name` に既存の文字列値をセットする。

**Rationale**:
- 既存の `internal` 配列要素は人名文字列であり UUID ではない。`userId` に人名をセットすると、将来の外部キー参照実装時に型エラーまたは DB 制約違反の原因になる
- `userId: null` で移行しておくことで、将来ユーザーとの紐付けが必要になった際に「null → UUID」の更新として安全に対応できる

**将来への影響**: `userId` の紐付けは運用タスク（ユーザーマッチング）として別途実施する必要がある。移行後は `name` フィールドのみが参照可能な状態になる。

#### Alternative 1: value を userId にセット

| | |
|---|---|
| **Pros** | 既存の人名情報が userId フィールドに保持される |
| **Cons** | UUID 形式ではない文字列が userId に入るため、外部キー参照実装時にエラーになる。型の意味論的な誤りが将来の混乱を招く |
| **Why not** | 型の意味論的な誤りは許容できないため |

---

### D4: マイグレーションは drizzle-kit generate + 手書き SQL の併用とする

**Decision**: スキーマ変更（カラム追加・型変更・nullable 変更）は `drizzle-kit generate` で差分 SQL を生成する。データ変換（source のフォールバック UPDATE、attendees の JSONB 構造変換）は手書き SQL を生成されたマイグレーションファイルの正しい位置に挿入する。

**重要**: source enum 変換の UPDATE（`UPDATE inquiries SET source = 'other' WHERE source NOT IN (...)`）は、`ALTER COLUMN ... USING source::"inquiry_source"` より**前に配置する**こと。PostgreSQL は ALTER COLUMN で text → enum への型変換時に既存値が enum に含まれない場合エラーを返すため、順序が逆になるとマイグレーション失敗の原因になる。

**Rationale**:
- `drizzle-kit generate` はカラム追加・型変更の DDL を自動生成するが、データ変換（UPDATE 文）はサポートしない
- 全て手書き SQL にすると Drizzle スキーマとの不整合リスクが高くなる
- 生成された SQL に手書き SQL を挿入することで、ツール生成の正確性とデータ変換の柔軟性を両立する

#### Alternative 1: 全て手書き SQL

| | |
|---|---|
| **Pros** | SQL の全内容を制御できる |
| **Cons** | Drizzle スキーマ定義との手動同期が必要になり、不整合リスクが高い |
| **Why not** | drizzle-kit の自動生成を活用するほうが安全かつ効率的なため |

#### Alternative 2: Drizzle Kit のみ使用（手書き SQL なし）

| | |
|---|---|
| **Pros** | ツール生成のみで完結し、手動介入が不要 |
| **Cons** | Drizzle Kit はデータ変換（UPDATE 文）をサポートしない。source フォールバックと attendees 構造変換はツールでは生成できず、既存データが破損する |
| **Why not** | データ変換要件に対応できないため |

#### Alternative 3: 生成 SQL の末尾に手書き SQL を一括追記

| | |
|---|---|
| **Pros** | 生成 SQL への介入が最小限で済む |
| **Cons** | source のフォールバック UPDATE が `ALTER COLUMN ... USING` より後になる。PostgreSQL は ALTER COLUMN で text → enum への型変換時に既存値が enum に含まれない場合エラーを返すため、本番マイグレーションが失敗する |
| **Why not** | SQL の実行順序が要件を満たせず、本番 migration 失敗の原因になるため |

---

### D5: DB を参照するビジネスルール検証は application/services に配置する

**Decision**: `validatePrimaryUniqueness` を `src/application/services/clientContactService.ts` に新設する。`src/domain/services/` には配置しない。

**Rationale**:
- `validatePrimaryUniqueness` は ClientContact リポジトリを呼び出す（DB 問い合わせを行う）。プロジェクトの「domain layer は repository を呼び出さない」原則（ADR-001 が確立）を維持するため、domain/services には配置できない
- 既存の `domain/services/` ファイル（`approvalStepService`、`contractTransition` 等）はすべてリポジトリ非依存の純粋関数であり、この原則を一貫して維持する
- `application/services/` に配置することで、use case と action の両方から呼び出し可能になり、ロジックの重複を避けられる

**呼び出しパターン**:
- `createClientContact` use case: `db.transaction` 内で呼び出すことで TOCTOU 競合（SELECT と INSERT が別トランザクションになる問題）を防ぐ
- `updateClientContactAction`: use case をバイパスしている既存問題は本変更では修正せず、action 内で直接呼び出す（既知の技術的負債として記録）

#### Alternative 1: domain/services に配置

| | |
|---|---|
| **Pros** | ビジネスルールを domain 層に集約できる |
| **Cons** | clientRepository を呼び出すため「domain layer は repository を呼び出さない」原則に違反する |
| **Why not** | プロジェクトの確立された原則を破ることになるため |

#### Alternative 2: use case 内にインライン実装

| | |
|---|---|
| **Pros** | 追加ファイルが不要 |
| **Cons** | `updateClientContactAction` から use case をバイパスして直接呼び出す構造がある以上、ロジックが重複する |
| **Why not** | ロジックの重複を避けるため |

#### Alternative 3: repository 層に配置

| | |
|---|---|
| **Pros** | repository が DB 問い合わせを行うため自然に見える |
| **Cons** | ビジネスルールの検証は repository の責務ではない。repository がビジネスルールを持つとレイヤー責務が曖昧になる |
| **Why not** | レイヤーの責務分担の原則に反するため |

---

## Consequences

### Positive

- 引合段階（Deal 未作成）の商談が記録できるようになり、「引き合い → 商談（引合段階） → 商談（案件化後）」のライフサイクルが統一的に表現できる
- `inquiries.source` が DB レベルで制約され、承認ポリシーの条件評価（`source eq "agent_service"` 等）の前提が保証される
- `attendees` の構造が `userId / contactId / name / isExternal` を持つオブジェクト配列になり、将来のユーザー・連絡先との紐付けが可能になる
- `application/services/` レイヤーが確立され、DB 参照を伴うビジネスルール検証の配置先が明確になった

### Negative / Trade-offs

- `inquiries.source` の pgEnum 化により、将来の値追加時に `ALTER TYPE ... ADD VALUE` マイグレーションが必要になる（ADR-009 D4 が懸念していた点）。`other` 値で多くのケースを吸収することで頻度を抑制する
- `meetings.attendees` の移行後は既存の `userId` が null のままとなり、ユーザーとの紐付けには別途の運用タスクが必要
- `updateClientContactAction` が use case をバイパスして `validatePrimaryUniqueness` を直接呼び出す構造は技術的負債として残る。action 内のトランザクション境界が use case 経由より弱い点に注意が必要

### Constraints for future changes

- **inquiries.source への値追加**: `inquirySourceEnum` の pgEnum に `ALTER TYPE ... ADD VALUE` を追加するマイグレーションが必要。PostgreSQL の `ALTER TYPE ... ADD VALUE` はトランザクション外での実行が必要なため、デプロイ手順に注意すること
- **meetings の attendees.userId 紐付け**: 移行後の `userId: null` を実際のユーザー UUID に更新する運用タスクが残っている。更新前に `meetings.attendees[*].userId` を参照するコードは null を考慮する必要がある
- **application/services への関数追加**: DB 参照を行うビジネスルール検証は `application/services/` に配置する。domain/services には配置しないこと（D5 参照）
- **updateClientContactAction のリファクタリング**: use case のバイパスを解消する場合は、action → use case → validatePrimaryUniqueness の呼び出しチェーンに変更し、トランザクション境界を use case 内に統合すること

---

## References

- `specrunner/changes/domain-model-alignment/design.md` — 詳細設計（D1〜D6）
- `specrunner/changes/domain-model-alignment/request.md` — 要件定義
- `src/infrastructure/schema.ts` — inquiries / meetings / deals スキーマ定義
- `src/application/services/clientContactService.ts` — validatePrimaryUniqueness 実装
- `src/application/usecases/createClientContact.ts` — isPrimary 検証の呼び出し
- `drizzle/0004_rapid_chat.sql` — マイグレーション SQL（enum 変換・attendees 変換・CHECK 制約）
- `ADR-009-client-inquiry-foundation.md` — D4: source を text で定義した元の判断（本 ADR の D1 で反転）
