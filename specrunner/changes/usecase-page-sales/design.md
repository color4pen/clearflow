# Design: 営業系ページの repository 直接呼び出しを usecase 経由に移行

## Context

Server Component（page.tsx）から `@/infrastructure/repositories` の repository を直接 import して呼び出している箇所が営業系ページに 11 ファイルある。アーキテクチャの依存方向 `pages → usecases → repositories` に反しており、層分離が崩れている。

現状のコードベース:
- 対象 11 ファイル合計で 28 箇所の repository 直接呼び出しがある
- うち 11 箇所は既存 usecase（`getDeal`, `getInquiry`, `getContract`, `listClients`, `listDeals`, `listInquiries`, `listMeetings`, `listInvoicesByContract`）で置き換え可能
- 残り 17 箇所に対応する usecase が存在しないため、13 種の新規 usecase を作成する必要がある
- 既存 usecase のシグネチャは統一されていない（positional args: `getDeal(id, orgId)` / object args: `getContract({ contractId, organizationId })`）
- `clientRepository.findContactsByClientId(clientId)` は `organizationId` を引数に取らず、呼び出し前にクライアントのテナント検証を前提としている

## Goals / Non-Goals

**Goals**:
- 対象 11 ファイルすべてで `@/infrastructure/repositories` の import を排除する
- 不足する 13 種の読み取り専用 usecase を新設する（純粋なラッパー）
- 既存 8 種の usecase を活用して重複を避ける
- 全ページの画面動作に影響を与えない

**Non-Goals**:
- usecase へのビジネスロジック追加（認可チェック等は将来タスク）
- 設定系ページ（`/settings` 配下）の移行（F01b で対応）
- テストの追加（薄いラッパーのため）
- 既存 usecase のシグネチャ統一

## Decisions

### D1: 新規 usecase のシグネチャ — repository メソッドの引数順序をそのまま採用

**決定**: 新規 usecase は対応する repository メソッドと同じ引数順序・型を使う。例: `getClient(clientId, organizationId)` は `clientRepository.findById(clientId, organizationId)` と同一。

**理由**: request の要件「呼び出し方はそのまま」に従い、page 側の変更を import 文の書き換えのみに抑える。新規 usecase は既存の positional args パターン（`getDeal(id, orgId)` 等）に合わせる。

**代替案**: 全 usecase を object args パターン（`{ clientId, organizationId }`）に統一する案。一貫性は高まるが、既存 usecase のシグネチャ変更がスコープ外のため、混在を受容する。

### D2: listClientContacts — organizationId を引数に含めない

**決定**: `listClientContacts(clientId)` は `clientRepository.findContactsByClientId(clientId)` と同じく `organizationId` を取らない。テナント分離は呼び出し側が事前に `getClient(id, organizationId)` 等でクライアントの所属を確認する既存パターンを維持する。

**理由**: repository のシグネチャと一致させることで page 側の変更を最小化する。現状、全呼び出し箇所でクライアントの tenant 検証が先行しており、安全性は維持される。

**代替案**: `listClientContacts(clientId, organizationId)` とし、usecase 内で client の存在確認を行う案。ビジネスロジック追加に該当しスコープ外。

### D3: listDeals の再利用 — DealWithDetails の余分なフィールドを許容

**決定**: `clients/page.tsx` と `inquiries/page.tsx` で `dealRepository.findAllByOrganization` の代替に既存 `listDeals` を使う。`listDeals` は JOIN 付きの `DealWithDetails[]` を返すが、page が使わないフィールド（`inquiryTitle`, `clientName`, `assigneeName`）が含まれる。

**理由**: repository メソッドの直接呼び出しと `listDeals` usecase は同一の repository メソッドを呼ぶため、パフォーマンス差はゼロ。usecase の重複作成を避ける。

**代替案**: `listDealsRaw(organizationId)` 等の JOIN なし usecase を新設する案。DRY に反し、「既存 usecase の活用」要件に矛盾する。

### D4: 既存 usecase の object args シグネチャ — page 側で呼び出し方を調整

**決定**: `getInquiry({ inquiryId, organizationId })`, `getContract({ contractId, organizationId })`, `listInvoicesByContract({ contractId, organizationId })` は既存シグネチャのまま使い、page 側で呼び出し形式を合わせる。

**理由**: 既存 usecase のシグネチャ変更は影響範囲が大きい（Server Actions からも参照されている）。page 側の `repo.findById(id, orgId)` → `getXxx({ xxxId: id, organizationId })` への書き換えは局所的な変更で済む。

**代替案**: 既存 usecase に positional args のオーバーロードを追加する案。TypeScript の関数オーバーロードは可読性を下げ、保守コストが増える。

## Risks / Trade-offs

**[Risk] 新規 usecase 13 種はすべて 1 行ラッパーで、現時点ではボイラープレート**
→ Mitigation: architect 評価済み。層分離の維持が目的であり、将来の認可チェック等の追加ポイントとして機能する。

**[Risk] listClientContacts が organizationId なしでテナント分離に依存**
→ Mitigation: repository の JSDoc に明記済み。呼び出し側のパターン（先行する getClient 呼び出し）が全箇所で確認済み。

**[Risk] import 切り替え漏れの可能性**
→ Mitigation: 最終タスクで `grep -r "from.*@/infrastructure/repositories" src/app/(dashboard)/{clients,deals,inquiries,contracts}` を実行し、営業系ページに repository import が残っていないことを機械的に検証する。

## Open Questions

なし（architect 評価済みの設計判断により主要な論点は解決済み）。
