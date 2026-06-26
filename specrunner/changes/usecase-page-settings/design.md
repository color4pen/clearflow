# Design: 設定系ページの repository 直接呼び出しを usecase 経由に移行

## Context

設定系 page.tsx から `@/infrastructure/repositories` を直接 import している箇所が 5 ファイルある。アーキテクチャの依存方向は `pages → usecases → repositories` であり、page 層が repository を直接呼ぶのは層分離違反にあたる。

現状の repository 直接呼び出し箇所:

| ファイル | import 対象 | 呼び出しメソッド |
|---|---|---|
| `settings/audit-logs/page.tsx` | `auditLogRepository` | `findByOrganization(orgId, filters)` |
| `settings/policies/page.tsx` | `approvalTemplateRepository` | `findByOrganization(orgId)` |
| `settings/policies/new/page.tsx` | `approvalTemplateRepository` | `findByOrganization(orgId)` |
| `settings/policies/[id]/edit/page.tsx` | `approvalPolicyRepository`, `approvalTemplateRepository` | `findById(id, orgId)`, `findByOrganization(orgId)` |
| `settings/templates/[id]/edit/page.tsx` | `approvalTemplateRepository` | `findById(id, orgId)` |

`settings/webhooks/page.tsx` は `listWebhookEndpointsAction` 経由で既に action 層を通しており、repository の直接 import はない。

また `src/app/actions/policies.ts` の `listPoliciesAction` も `approvalPolicyRepository.findByOrganization` を直接呼んでいるが、action → repository は本 request のスコープ外判定（action の repository 直接呼びは別施策で対応する想定）。ただし page.tsx の切り替えに伴い `listApprovalPolicies` usecase を新設すれば、actions 側も将来同 usecase を使える下地になる。

## Goals / Non-Goals

**Goals**:

- 設定系 page.tsx 5 ファイルの `@/infrastructure/repositories` import を全て排除する
- 不足する読み取り専用 usecase を新設し、page → usecase → repository の依存方向を維持する
- 既存の画面動作を一切変更しない（純粋なリファクタリング）

**Non-Goals**:

- 営業系ページの移行（F01a で対応）
- actions 層での repository 直接呼び出しの移行
- usecase にビジネスロジックを追加すること
- テストの追加
- webhooks/page.tsx の変更（既に action 経由で層分離されている）

## Decisions

### D1: 薄いラッパー usecase を新設する（ビジネスロジック追加なし）

**選択**: 各 usecase は repository メソッドの薄いラッパーとして実装する。引数・戻り値の型は repository メソッドと同一。
**却下**: usecase にバリデーション・権限チェック等を追加する方式

**Rationale**: architect 評価済みの方針（F01a と同じ）。層分離を維持する目的のみのラッパーであり、ビジネスロジック追加はスコープ外。将来必要になれば usecase 内に追加できる拡張点を確保する効果がある。

### D2: 1 usecase = 1 関数のファイル分割を維持する

**選択**: 既存の `src/application/usecases/` と同じく、1 ファイル 1 export function とし `index.ts` から re-export する。
**却下**: 関連 usecase をまとめて 1 ファイルにする方式

**Rationale**: プロジェクト全体の慣例（`listDelegations.ts`, `listOrganizationUsers.ts` 等）に合わせる。ファイル数は増えるが、import の一貫性と発見性を維持する。

### D3: 既存の action チェーンは変更しない

**選択**: `policies/page.tsx` で呼ばれている `listPoliciesAction` は既存のまま残す。page.tsx で直接呼んでいる repository だけを usecase に切り替える。
**却下**: action 内の repository 呼び出しも同時に usecase 化する方式

**Rationale**: request のスコープ定義に従い、page.tsx の層分離のみに集中する。action → repository の移行は別施策で行う。

### D4: webhooks/page.tsx は対象外とする

**選択**: `webhooks/page.tsx` はスキップする。
**却下**: 念のため触る方式

**Rationale**: コード調査の結果、`webhooks/page.tsx` は `@/infrastructure/repositories` を import しておらず `listWebhookEndpointsAction` 経由で既に層分離されている。request の「要確認」に対する回答として除外する。`listWebhookEndpoints` usecase の新設も不要。

## Risks / Trade-offs

**[Risk]** 薄いラッパーが冗長なレイヤーに見える
→ **Mitigation**: 層分離の一貫性を優先する。将来のビジネスロジック追加時に page 層を変更せずに済む拡張点として機能する。

**[Risk]** 既存の `listPoliciesAction` が page.tsx 内の `Promise.all` で利用されており、usecase 切り替え後にデータ不整合が起きる可能性
→ **Mitigation**: `policies/page.tsx` は `listPoliciesAction` と `approvalTemplateRepository.findByOrganization` を `Promise.all` で呼んでいる。後者のみを usecase に切り替え、前者は既存のままとする。動作に変更なし。

## Open Questions

なし — コード調査で全対象ファイルの呼び出しパターンを確認済み。
