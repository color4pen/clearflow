# Design: deal-flexibility

## Context

案件（Deal）は引き合い経由でのみ作成可能で、`deals.inquiryId` は NOT NULL + unique 制約（`deals_inquiry_id_unique`）が付与されている。フェーズ遷移は `VALID_TRANSITIONS` マップで一方向に制約されている（`proposal_prep → proposed → negotiation → won/lost`）。

実業務では (1) 引き合いを経ずに既存顧客から直接依頼が来るケースと、(2) 提案中に交渉へ戻す・再提案するケースがあり、現行設計では対応できない。

顧客への参照は `deals → inquiries → clients` の2段 JOIN で解決しているが、引き合いなし案件ではこの経路が断絶する。

案件詳細ページ (`deals/[id]/page.tsx`) は `deal.inquiryId` を無条件に `inquiryRepository.findById` に渡しており、nullable 化すると TypeScript エラーおよびランタイムエラーが発生する。client 取得も `inquiry?.clientId` 経由であり、`deal.clientId` 直接参照への切り替えが必要。

## Goals / Non-Goals

**Goals**:

- 引き合いなし（`inquiryId` = null）で案件を作成できるようにする
- 全案件に `clientId`（NOT NULL）を持たせ、顧客への1段 JOIN を実現する
- フェーズ遷移を終端チェックのみに簡素化し、スキップ・巻き戻しを許可する
- 案件一覧画面に直接作成の導線を追加する

**Non-Goals**:

- Contract（契約）ドメインの追加
- Invoice（請求）ドメインの追加
- `deals.estimateRequestId` の削除

## Decisions

### D1: `clientId` を deals テーブルに NOT NULL で直接追加する

**選択**: `deals` に `uuid("client_id").notNull().references(() => clients.id)` を追加。全案件が顧客に直接紐づく。

**理由**: 引き合いなし案件では `inquiry` が存在せず、`inquiries.clientId` 経由で顧客に到達できない。直接参照にすることで一覧クエリの JOIN が1段で済む。

**却下した代替案**: inquiry 経由の間接参照を維持 — 引き合いなし案件で顧客に到達不可。

### D2: `deals_inquiry_id_unique` 制約を削除し、アプリケーション層で重複チェックする

**選択**: DB の unique 制約を DROP し、`createDeal` usecase 内の `findByInquiryId` による重複チェックを維持する。

**理由**: PostgreSQL の unique 制約は null 同士を重複として扱わないため nullable unique は技術的に動作するが、制約の意図が曖昧になる。アプリケーション層のチェックの方が意図が明確で、エラーメッセージも制御できる。

**却下した代替案**: nullable unique を維持 — 制約の意図が曖昧で、`inquiryId` ありの重複防止はアプリケーション層でも行っているため二重管理になる。

### D3: `VALID_TRANSITIONS` マップを廃止し、終端状態チェックのみにする

**選択**: `canTransition(from, to)` は `from` が `won` / `lost` でなく、`to` が有効な `DealPhase` であることのみ検証する。

**理由**: フェーズ変更に連動する自動処理（承認リクエスト作成等）が存在しないため、遷移制約のメリットがない。終端状態（受注済み・失注）からの遷移禁止がビジネスルールとして必要な唯一の制約。

**却下した代替案**: 全許可パターンを列挙するマップ — 組み合わせ爆発し、実質的に全許可と同じ意味なのに保守コストだけ増える。

### D4: `DealWithInquiry` を `DealWithDetails` に改名する

**選択**: 型名を `DealWithDetails` に変更し、`inquiryTitle` を `string | null` にする。

**理由**: `inquiryId` が nullable になったことで「WithInquiry」は不正確。`details` は clientName・inquiryTitle・assigneeName を含む補足情報の意味。

### D5: `createDeal` の inquiryId ありパターンで `inquiry.clientId` null チェックを追加する

**選択**: パターン (a)（`inquiryId` 指定あり）で `inquiry.clientId` が null の場合、`{ ok: false, reason: "案件化するには顧客の登録が必要です" }` を返す。

**理由**: `deals.clientId` は NOT NULL であるため、`inquiry.clientId` が null のまま `dealRepository.create` に渡すと DB 制約違反が発生する。`updateInquiryStatus` の converted 遷移と対称的に扱う。

## Risks / Trade-offs

- **[Risk] 既存シードデータのマイグレーション** → 既存の deal レコードに `clientId` を追加する必要がある。シードは全件再生成のため問題ないが、本番データがある場合はデータマイグレーションスクリプトが別途必要になる（現時点では開発フェーズのためスコープ外）。
- **[Risk] `findAllByOrganization` の JOIN 変更** → `innerJoin(inquiries)` を `leftJoin(inquiries)` に変更する。引き合いなし案件で `inquiryTitle` が null になるため、UI 側で null ガードが必要。
- **[Trade-off] 遷移制約の緩和** → 終端チェックのみにすることで、意図しないフェーズ変更（例: `won` → `proposal_prep` 以外の自由遷移）が起きるリスクがある。ただし、フェーズ変更は admin/manager ロール限定であり、操作ミスは audit_log で追跡可能。
- **[Risk] 案件詳細ページの構造変更** → `deal.inquiryId` が nullable になることで、詳細ページの `inquiryRepository.findById(deal.inquiryId)` が型エラーになる。null ガード追加と client 取得ロジックの `deal.clientId` 経由への切り替えが必要。

## Open Questions

なし（architect 評価済みの設計判断で全主要論点が解決済み）。
