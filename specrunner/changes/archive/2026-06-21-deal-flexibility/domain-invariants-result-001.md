# Domain Invariants Review: deal-flexibility

- **reviewer**: domain-invariants
- **iteration**: 1
- **date**: 2026-06-21
- **verdict**: approved

## 観点

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## 検証結果

### 1. テナント分離

**dealRepository — 全メソッドで organizationId フィルタが維持されている**

| メソッド | organizationId 条件 | 判定 |
|---|---|---|
| `create` | INSERT 値に organizationId 設定 | OK |
| `findById` | `WHERE id = ? AND organizationId = ?` | OK |
| `findAllByOrganization` | `WHERE organizationId = ?` | OK |
| `findByInquiryId` | `WHERE inquiryId = ? AND organizationId = ?` | OK |
| `update` | `WHERE id = ? AND organizationId = ?` | OK |
| `updatePhase` | `WHERE id = ? AND organizationId = ?` | OK |

**createDeal — 2パターンのテナント検証**

- パターン (a) inquiryId あり: `inquiryRepository.findById(data.inquiryId, data.organizationId)` で inquiry のテナント所属を確認してから `inquiry.clientId` を使用している。クロステナントの clientId が入り込む余地はない。
- パターン (b) inquiryId なし: `clientRepository.findById(data.clientId, data.organizationId)` で client のテナント所属を確認している。存在しない場合は `{ ok: false }` を返して deal 作成を中断している。

**updateInquiryStatus — converted 遷移**

`inquiry.clientId` の null チェック後に `dealRepository.create({ clientId: inquiry.clientId! })` を呼び出している。inquiry 自体が `inquiryRepository.findById(data.inquiryId, data.organizationId)` で取得されているため、clientId はテナント内の値が保証される。

**deals/new/page.tsx — 顧客一覧取得**

`clientRepository.findAllByOrganization(organizationId)` でテナントスコープ内の顧客のみを表示している。他テナントの顧客は選択候補に出ない。

**deals/[id]/page.tsx — findContactsByClientId**

`clientRepository.findContactsByClientId(deal.clientId)` は organizationId を渡さない設計（関数の JSDoc に「呼び出し前に findById で clientId が organizationId に属することを確認すること」と明記）。`deal` は `dealRepository.findById(id, organizationId)` で取得済みのため、`deal.clientId` はテナント検証済みの値。間接保護として成立している。

---

### 2. 監査ログの完全性

全 deal 操作でトランザクション内に監査ログが記録されている。

| 操作 | audit action | metadata | 記録位置 |
|---|---|---|---|
| 直接作成 (`createDeal`) | `deal.create` | targetId=deal.id | tx 内 |
| inquiry 案件化 (`updateInquiryStatus`) | `inquiry.updateStatus` | fromStatus/toStatus/dealId | tx 内 |
| フェーズ更新 (`updateDealPhase`) | `deal.updatePhase` | fromPhase/toPhase | tx 内 |
| 情報更新 (`updateDeal`) | `deal.update` | updatedFields | tx 内 |

**観察: 案件作成経路による監査ログの形状差異**

`inquiryId` 経由の案件化では `deal.create` ログは生成されず、`inquiry.updateStatus + metadata.dealId` として記録される。直接作成パスは `deal.create` を生成する。この非対称性は設計書 D5 で承認済みの意図的な設計であり、dealId は `inquiry.updateStatus` のメタデータで追跡可能なため、監査証跡の完全性は損なわれていない。

---

### 3. 承認ワークフローの不変条件

**終端状態からの遷移禁止**

`dealTransition.ts` の `canTransition` は `TERMINAL_PHASES = ["won", "lost"]` を明示し、これらの `from` に対して常に `false` を返す。`updateDealPhase` がこれを通じてチェックしており、終端状態のフリーズは維持されている。

**廃止フェーズへの遷移**

`ALL_PHASES` に含まれない値（例: 旧フェーズ `estimate_approval`）への遷移は `ALL_PHASES.includes(to)` で `false` になる。型の制約に加えてランタイム防御も有効。

**楽観ロック**

`dealRepository.updatePhase` は `WHERE version = currentVersion` で楽観ロックを実装しており、フェーズ更新での競合を検出できる。`updateInquiryStatus` の `converted` 遷移も `inquiryRepository.updateStatus(... inquiry.version, tx)` で楽観ロックを維持し、inquiry の二重案件化を防いでいる。

**ロール制限**

`createDealAction`・`updateDealPhaseAction`・`updateDealAction` のすべてで `admin` / `manager` ロールチェックが Server Action 入口に存在する。

---

### 4. スキーマ制約とデータ整合

**deals.clientId NOT NULL の保護**

DB 制約として `deals.clientId` は NOT NULL（マイグレーション SQL で確認済み）。アプリケーション層で両パターンとも clientId が非 null であることを保証してから INSERT している。DB 制約違反が実行時に発生するパスは存在しない。

**deals_inquiry_id_unique 制約削除後の重複防止**

DB 制約を削除した代わりに `createDeal` パターン (a) で `dealRepository.findByInquiryId` による重複チェックを維持している。`inquiry.converted` 遷移の楽観ロックが同時実行を防ぐため、競合状態のリスクは低い。

**補足: DB レベルのクロステナント保護**

`deals.clientId` には `clients.id` への FK のみで、`deals.organizationId = clients.organizationId` の DB 制約はない。アプリケーション層のチェックで保護しているが、DB 単体では別テナントの clientId を deals に設定できる。これは architect 評価済みのトレードオフ（D1）であり、アプリケーション層の実装は正しい。

---

## 所見まとめ

| # | 種別 | 内容 | 重大度 |
|---|---|---|---|
| O-01 | 観察 | `inquiry.updateStatus` (converted) と `createDeal` で audit action 名が異なる（意図的設計） | 情報 |
| O-02 | 観察 | `deals.clientId` のクロステナント保護がアプリ層のみ（DB FK のみ） | 低 |

いずれもブロッキングではない。O-01 は設計書 D5 で承認済み、O-02 は D1 で評価済みのトレードオフ。

---

## 判定

- **verdict**: approved
