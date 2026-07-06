# Domain-Invariants Review: mcp-server-core

- **reviewer**: domain-invariants
- **iteration**: 1
- **date**: 2026-07-07
- **verdict**: approved

---

## 観点

テナント分離（`inv-all-tenant-scoped`）・監査ログの完全性（`ent-audit-log`）・承認ワークフロー不変条件（`inv-system-approval-blocks-action`・`inv-one-deal-per-inquiry`）が、MCP アダプタ層の追加によって破壊されていないことを検証する。

---

## 検証結果

### 1. テナント分離（inv-all-tenant-scoped）

**判定: ✅ 問題なし**

| 検証項目 | 実装箇所 | 結果 |
|---|---|---|
| Bearer 解決 → organizationId の流れ | `route.ts` L26–44: `resolveBearer` → `authInfo.extra.organizationId` | ✓ |
| ツールハンドラへの伝播 | `getAuthInfo(extra)`: `extra.authInfo?.extra` から取得 | ✓ |
| 読み取り操作のスコープ | `listInquiries(organizationId)` / `listDeals(organizationId)` / `listClients(organizationId)` / `getDeal(dealId, organizationId)` / `getClient(clientId, organizationId)` | ✓ |
| 書き込み操作のスコープ | 全ユースケース呼び出しで `organizationId` を明示的に渡している | ✓ |
| add_deal_contact / remove_deal_contact | `addDealContact({ ..., organizationId })` / `removeDealContact({ ..., organizationId })` | ✓ |

テナント A のトークンで呼ばれた操作は `resolveBearer` が返す `organizationId` のみを使用し、トークン外の組織に属するリソースへのアクセスはユースケース / リポジトリ層のスコープで排除される。runtime テスト（TC-049, TC-050）で `organizationId` の伝播を実証確認済み。

### 2. 監査ログの完全性

**判定: ✅ 問題なし（潜在課題 1 件: INFO）**

#### 2a. 新設ユースケース（updateClient / updateClientContact）

```
updateClient.ts:
  → db.transaction(() => {
      clientRepository.update(...)
      recordAudit({ action: "client.update", ... }, tx)  // ✓ トランザクション内
    })

updateClientContact.ts:
  → db.transaction(() => {
      clientRepository.updateContact(...)
      recordAudit({ action: "client_contact.update", ... }, tx)  // ✓ トランザクション内
    })
```

更新とログ記録がトランザクション内で原子的に実行される。ロールバック時はログも取り消される正しい設計。

#### 2b. Server Action のリファクタ（既存監査漏れの解消）

`src/app/actions/clients.ts` の `updateClientAction` / `updateClientContactAction` が `clientRepository.update()` / `clientRepository.updateContact()` 直接呼び出しから新設ユースケース経由に変更された。MCP 経路・UI 経路の両方で `client.update` / `client_contact.update` 監査ログが記録されるようになった。

#### 2c. その他の書き込みツール

全 MCP ツールの書き込み操作は対応するユースケースを経由しており、ユースケース内で監査記録を担保している:

| MCP ツール操作 | 呼び出しユースケース | 監査アクション |
|---|---|---|
| inquiries.create | `createInquiry` | `inquiry.create` |
| inquiries.update | `updateInquiry` | `inquiry.update` |
| inquiries.update_status | `updateInquiryStatus` | `inquiry.updateStatus` / `inquiry.conversionPending` |
| inquiries.delete | `deleteInquiry` | `inquiry.delete` |
| deals.create | `createDeal` | `deal.create` |
| deals.update | `updateDeal` | `deal.update` |
| deals.update_phase | `updateDealPhase` | `deal.updatePhase` |
| deals.delete | `deleteDeal` | `deal.delete` |
| clients.update | `updateClient`（新設） | `client.update` |
| clients.add_contact | `createClientContact` | `client_contact.create` |
| clients.update_contact | `updateClientContact`（新設） | `client_contact.update` |
| clients.delete_contact | `deleteClientContact` | `client_contact.delete` |
| clients.add_deal_contact | `addDealContact` | `deal_contact.create` |
| clients.remove_deal_contact | `removeDealContact` | `deal_contact.delete` |

#### 2d. INFO: 既存ユースケースでの生エラーメッセージ漏洩リスク

`updateInquiryStatus.ts`（本 PR 非改変）の一部エラーパスで `err instanceof Error ? err.message : "..."` を `reason` に設定しており、MCP ツールが `toToolError(result.reason)` でクライアントに返す際に DB エラー文字列が漏洩する可能性がある。設計 D7 の「安全な reason の定義」に潜在的に違反するが、**本 PR の新設コードは対象外**（`updateClient`/`updateClientContact` は汎用メッセージを使用）。既存コードの改善課題として記録する。

### 3. 承認ワークフロー不変条件

**判定: ✅ 問題なし**

#### 3a. inv-system-approval-blocks-action の遵守

`inquiries` ツールの `update_status → converted` ケース:

1. `canPerform(role, "inquiry", "convert")` → 認可失敗なら即リターン ✓
2. `updateInquiryStatus` ユースケースに委譲 → ポリシー評価は usecase 内部で実行 ✓
3. `result.pendingApproval` がある場合: ツール結果にリクエスト ID と `「承認リクエストを作成しました。承認後に案件が自動生成されます」` メッセージを含める ✓
4. `result.pendingApproval` がない場合: 引合データのみを返す ✓

runtime テスト（TC-011, TC-012）でモック経由の pendingApproval 有無による分岐を実証確認済み。

#### 3b. inv-one-deal-per-inquiry の遵守

`updateInquiryStatus` ユースケース（既存）が `requestRepository.findByOriginTriggerEntity` で既存の pending リクエストを確認し、二重申請を防止している。MCP ツールはユースケースに委譲しているため、このチェックは MCP 経路でも機能する ✓

#### 3c. 状態機械の遵守

引合のステータス遷移は `canTransition`（`src/domain/services/inquiryTransition.ts`）で制御され、ユースケース内で強制される。MCP ツールが任意のステータスを直接設定する経路は存在しない ✓

### 4. 認可チェックのパリティ確認

**判定: ✅ 問題なし**

Server Action と MCP ツールで同一の `canPerform` 呼び出しを確認:

| 操作 | Server Action | MCP ツール |
|---|---|---|
| inquiry.convert | `canPerform(role, "inquiry", "convert")` | `canPerform(role, "inquiry", "convert")` ✓ |
| inquiry.decline | `canPerform(role, "inquiry", "decline")` | `canPerform(role, "inquiry", "decline")` ✓ |
| inquiry.delete | `canPerform(role, "inquiry", "delete")` | `canPerform(role, "inquiry", "delete")` ✓ |
| deal.create | `canPerform(role, "deal", "create")` | `canPerform(role, "deal", "create")` ✓ |
| deal.update_phase (won/lost) | `canPerform(role, "deal", "closePhase")` | `canPerform(role, "deal", "closePhase")` ✓ |
| deal.update_phase (他) | `canPerform(role, "deal", "changePhase")` | `canPerform(role, "deal", "changePhase")` ✓ |
| client.editContact | `canPerform(role, "client", "editContact")` | `canPerform(role, "client", "editContact")` ✓ |
| client.deleteContact | `canPerform(role, "client", "deleteContact")` | `canPerform(role, "client", "deleteContact")` ✓ |

`update_status: "new"` に対して明示的な canPerform チェックがないが、Server Action（`updateInquiryStatusAction`）も同様の構造であり、パリティとして意図的なもの。ユースケース内の `canTransition` がステータス遷移を制御する。

---

## 指摘事項

### [INFO] list 操作のフィルタ引数が無視される

**ファイル**: `src/app/api/mcp/tools/inquiries.ts` / `deals.ts`

`inquiries` ツールのスキーマは `status`（引合ステータス）と `source`（流入元）をオプションフィルタとして宣言しているが、`listInquiries(organizationId)` にこれらを渡していない。`deals` ツールも同様に `phase`・`clientId` フィルタが宣言されているが `listDeals(organizationId)` は organizationId のみを受け付ける。

スキーマが宣言するフィルタが機能せず、全件が返される。テナント分離の観点では正しく organizationId でスコープされているため **セキュリティ上の問題はない**が、LLM エージェントがフィルタを指定して全件を受け取るという機能上の不整合がある。

**対応方針**: ユースケース側にフィルタ引数を追加するか、スキーマからフィルタを除去して記述を一致させる。本 PR の不変条件とは無関係のため、後続タスクで対応可能。

---

## 総括

| 検証軸 | 判定 |
|---|---|
| テナント分離（inv-all-tenant-scoped）| ✅ 維持 |
| 監査ログの完全性（client.update / client_contact.update 新設含む）| ✅ 維持 |
| 承認ワークフロー（inv-system-approval-blocks-action）| ✅ 維持 |
| 一引合一案件（inv-one-deal-per-inquiry）| ✅ 維持 |
| Server Action との権限パリティ | ✅ 一致 |

全ドメイン不変条件は MCP アダプタ層の追加によって破壊されていない。既存の `updateClient` / `updateClientContact` 監査漏れはこの変更で閉じられた。INFO 指摘（list フィルタ無視・既存ユースケースのエラーメッセージ）はドメイン不変条件に影響しない。

- **verdict**: approved
