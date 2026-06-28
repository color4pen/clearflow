# Domain Invariants Review — deal-activity-enrich — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 検証範囲

| ファイル | 変更種別 |
|---------|---------|
| `src/application/usecases/getDealActivity.ts` | 修正（返却型拡張・targetInfoMap 構築追加） |
| `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx` | 修正（targetInfoMap props 追加・対象ラベル表示） |
| `src/app/(dashboard)/deals/[id]/page.tsx` | 修正（新 API への対応・props 渡し） |
| `src/__tests__/usecases/dealActivity.test.ts` | 修正（新テスト追加） |
| `src/__tests__/components/DealActivitySection.test.ts` | 新規（静的検証テスト） |

---

## 1. テナント分離

### 1-1. リポジトリ呼び出しへの organizationId 適用

`getDealActivity.ts` 内の全リポジトリ呼び出しを検証した。

| 呼び出し | organizationId 渡しの状況 |
|---------|--------------------------|
| `meetingRepository.findAllByDeal(dealId, organizationId)` | ✅ 渡し済み |
| `contractRepository.findAllByDealId(dealId, organizationId)` | ✅ 渡し済み |
| `invoiceRepository.findAllByContract(c.id, organizationId)` | ✅ 渡し済み |
| `actionItemRepository.findByDeal(dealId, organizationId)` | ✅ 渡し済み |
| `dealContactRepository.findByDeal(dealId, organizationId)` | ✅ 渡し済み |
| `auditLogRepository.findByTargets(organizationId, targets, ...)` | ✅ 渡し済み |

**判定**: 全リポジトリ呼び出しに organizationId が正しく渡されている。変更前からの既存パターンを維持しており、今回の変更がテナント分離を緩和していない。

### 1-2. targetInfoMap の構築方式

`targetInfoMap` はすでに取得済み（organizationId でフィルタ済み）のエンティティオブジェクトから直接組み立てられる。追加のリポジトリ取得は行われていない。このため、クロステナントデータが `targetInfoMap` に混入するリスクはない。

### 1-3. dealTitle パラメータの由来

`page.tsx` では `dealTitle: deal.title` として渡しており、`deal` は `getDeal(id, organizationId)` の結果である。organizationId フィルタを経た後の値のみが渡される。

### 1-4. auditLogRepository.findByTargets の WHERE 条件

リポジトリ実装を確認した。`findByTargets` は `eq(auditLogs.organizationId, organizationId)` を必ず WHERE 条件の先頭に含む（`targetType` + `targetId` の OR 条件と AND 結合）。テナント跨ぎでの監査ログ参照は不可能な設計になっている。

---

## 2. 監査ログの完全性

### 2-1. 取得ロジックの不変性

`auditLogRepository.findByTargets` の呼び出し、`targets` 配列の組み立て方、`ACTIVITY_TIMELINE_LIMIT` の適用、`getHiddenActions()` による除外フィルタのいずれも変更されていない。監査ログの取得完全性は維持されている。

### 2-2. 記録側（recordAudit）への影響

この変更は監査ログの記録側には一切触れていない。スコープ外として明示されており、コードにも記録側の変更は存在しない。

### 2-3. targetInfoMap と監査ログの関係

`targetInfoMap` は表示専用のラベル・リンクマップであり、`AuditLog` 型の内容（action, targetType, targetId, actorId, organizationId, metadata, createdAt）を変更しない。監査証跡として返却される `logs` は変更前と同じ `auditLogRepository.findByTargets` の結果そのものである。

---

## 3. 承認ワークフロー不変条件

### 3-1. 承認ワークフロー関連ロジックへの影響

この変更は `getDealActivity`（表示専用のアクティビティ読み出し）と `DealActivitySection`（表示コンポーネント）のみに限定されている。`request.*` / `approval_step.*` / `delegation.*` / `policy.*` に関するドメインサービス・ユースケース・状態遷移ロジックには一切触れていない。

### 3-2. 承認ワークフローの AuditLog 表示への影響

`getDealActivity` は deals 配下エンティティ（meeting / contract / invoice / action_item / deal_contact）を target として指定する。承認ワークフロー固有の `request` / `delegation` / `approvalPolicy` は targets に含まれないため、仮にそれらの監査ログが同テナントに存在しても `getDealActivity` では取得されない。承認ワークフロー監査ログの分離は維持されている。

---

## 4. フォールバック動作

`DealActivitySection` では `targetInfo = targetInfoMap[\`${log.targetType}:${log.targetId}\`]` が `undefined` の場合、`{targetInfo && ...}` の条件付きレンダリングによりラベル表示をスキップする。削除済みエンティティの監査ログが存在しても表示が壊れない設計になっており、フォールバック時の安全性は確保されている。

---

## 5. 軽微な観察（ノーブロック）

- `href` 値はテンプレートリテラルで組み立てられるが、`dealId` / `m.id` / `c.id` はリポジトリから取得した値（UUID 等）であり、ユーザーが直接制御できる文字列ではない。Next.js の `Link` コンポーネントは `javascript:` プロトコルをブロックする設計を持つため、リンクインジェクションのリスクは許容範囲内。
- テストは静的解析（ソースコードの文字列検索）ベースであるが、これは表示拡張の性質上許容できる範囲であり、ドメイン不変条件の検証に影響しない。

---

## 総合判定

テナント分離・監査ログ完全性・承認ワークフロー不変条件のいずれも破壊されていない。この変更は既存の認証・認可・データ分離の境界を維持しつつ、表示層のみを拡張している。

- **verdict**: approved
