# Design: 顧客担当者（clientContact）のテナント分離を repository で強制する

## Context

マルチテナントシステムにおいて、テナント分離は「全リポジトリ操作を organizationId で絞る」ことで担保する設計（docs/design/03-authorization-design.md §5）。しかし clientContact 系メソッド 4 件（`findContactsByClientId` / `updateContact` / `deleteContact` / `countContactsByClientIds`）は clientId のみで絞り、organizationId を条件に含めていない。テナント分離は caller（usecase / action）が親 client を `findById(clientId, organizationId)` で事前検証する規約に依存しており、repository 自体が最終防衛線として機能していない。

同リポジトリ内の `findAllContactsByOrganization` は既に `clientContacts` を `clients` に innerJoin して `clients.organizationId` で絞る方式を採用しており、この確立済みパターンを 4 メソッドに横展開する。

`clientContacts` テーブルは `organization_id` カラムを持たず、org は親 `clients` テーブル経由でのみ辿れる。

### 影響を受ける呼び出し元（現行コード偵察結果）

| Repository メソッド | 呼び出し元 |
|---|---|
| `findContactsByClientId(clientId, tx?)` | `listClientContacts` usecase → 4 RSC ページ（clients/[id], deals/[id], deals/[id]/meetings/new, deals/[id]/meetings/[meetingId]）、`validatePrimaryUniqueness` service |
| `updateContact(contactId, clientId, data, tx?)` | `updateClientContactAction` action |
| `deleteContact(contactId, clientId, tx?)` | `deleteClientContact` usecase |
| `countContactsByClientIds(clientIds)` | 現在の src/ に呼び出し元なし（前回デザイン変更で顧客一覧から削除済み）。repository の公開 API として残存 |

## Goals / Non-Goals

**Goals**:

- clientContact 系の 4 メソッドに `organizationId` を必須引数として追加し、`clientContacts` を `clients` に innerJoin して `clients.organizationId` で絞ることでテナント分離を repository 自身で強制する
- 全呼び出し元（usecase / action / service / RSC）を session 由来の `organizationId` を渡すよう更新する
- JSDoc の caller 規約記述を repository 強制の旨に更新する

**Non-Goals**:

- `clientContacts` テーブルへの `organization_id` カラム追加（join で解決。スキーマ変更・データ移行を避ける）
- clientContact 以外のリポジトリメソッドの変更（既に organizationId で絞っている）
- ロール認可の変更（別リクエスト authorization-consistency で扱う）

## Decisions

### D1: org 解決は clients への innerJoin で行い、カラム追加はしない

**選択**: 4 メソッドすべてで `clientContacts` を `clients` に `innerJoin` し、`clients.organizationId = organizationId` の条件を追加する。`findAllContactsByOrganization` と同一パターン。

**却下**: `clientContacts` テーブルに `organization_id` カラムを非正規化追加する案 — スキーマ変更 + 既存データのバックフィルが必要で「既存データに触らない」方針に反する。

**Rationale**: 確立済みの join 方式に統一することで実装コストとリスクを最小化する。パフォーマンスへの影響は、対象クエリが単一顧客 or 限定的な clientId リストに対する操作であり、join の追加コストは無視できる。

### D2: caller の事前検証は多重防御として残す

**選択**: repository で organizationId 強制を追加した後も、usecase / action 側の既存の親 client org 検証コード（`findById(clientId, organizationId)` 呼び出し）は撤去しない。

**却下**: caller 側の事前検証を撤去して repository のみに統一する案 — 3 層防御（action → usecase → repository）の一貫性が失われる。

**Rationale**: 多重防御は各レイヤーが独立してテナント分離を保証する設計思想に合致する。コード量の増加は軽微。

### D3: validatePrimaryUniqueness の organizationId 伝搬は引数追加で対応する

**選択**: `validatePrimaryUniqueness(clientId, contactId, isPrimary, tx?)` に `organizationId` を引数追加し、内部の `findContactsByClientId` 呼び出しに渡す。

**却下**: サービス内部で organizationId を解決する案 — repository の引数変更に合わせて呼び出し元から伝搬する方が依存方向に沿った自然な設計。

**Rationale**: organizationId は session 由来で usecase / action が保持しており、引数で渡すのが最もシンプルで追跡可能。

### D4: countContactsByClientIds は将来の呼び出し元に備え organizationId を追加する

**選択**: 現在呼び出し元が存在しない `countContactsByClientIds` にも organizationId を追加する。

**却下**: 呼び出し元がないため未修正で残す案 — テナント分離の方針に反し、将来の呼び出し追加時にリグレッションを起こす。

**Rationale**: 本リクエストの目的がまさに「将来の呼び出し追加時のクロステナントリスクの排除」であり、呼び出し元の有無に関わらず修正すべき。

### D5: listClientContacts usecase に organizationId を追加し、RSC から伝搬する

**選択**: `listClientContacts(clientId)` を `listClientContacts(clientId, organizationId)` に変更する。4 つの RSC ページからは session 由来の `organizationId` を渡す。

**却下**: usecase を経由せず RSC から repository を直接呼ぶ案 — レイヤードアーキテクチャの依存方向に違反する。

**Rationale**: RSC ページは既に session から organizationId を取得しており、引数追加のみで対応可能。

## Risks / Trade-offs

**[Risk]** innerJoin の追加によりクエリパフォーマンスが低下する可能性
→ **Mitigation**: 対象クエリは単一 clientId or 限定的な clientIds に対する操作であり、clients テーブルの PK join のため追加コストは軽微。`findAllContactsByOrganization` で同パターンが実運用で問題なく稼働している。

**[Risk]** 呼び出し元の変更漏れによるコンパイルエラー
→ **Mitigation**: TypeScript の strict モードにより、引数追加は呼び出し元すべてで型エラーとなるため漏れが検出される。`typecheck` を受入基準に含める。

**[Risk]** `validatePrimaryUniqueness` の引数変更がテスト（静的検証テスト）に影響する
→ **Mitigation**: 既存テストはソースコードの文字列マッチによる静的検証であり、関数シグネチャの変更ではなく含有文字列の検証のため、影響は限定的。変更後もテスト内容の整合性を確認する。

## Open Questions

なし — architect により設計判断が評価済みであり、未解決の技術的判断はない。
