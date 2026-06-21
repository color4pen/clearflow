# Deal の柔軟化

## Meta

- **type**: spec-change
- **slug**: deal-flexibility
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存テーブルのカラム変更と制約緩和。新しいアーキテクチャパターンの導入ではない → false -->

## 背景

現在の案件（Deal）は引き合い経由でしか作成できず（`inquiryId` NOT NULL）、フェーズ遷移も一方向に制約されている。実際の業務では:

1. 既存顧客から引き合いを経ずに直接依頼が来るケース（口頭ベースの追加案件）がある
2. 提案中に交渉に戻ったり、再提案になるケースがある

これらに対応するため、案件の作成経路とフェーズ遷移を柔軟にする。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/schema.ts:308-310` — `deals.inquiryId` が NOT NULL で `inquiries.id` を参照
- `src/infrastructure/schema.ts:330` — `deals_inquiry_id_unique` 制約で1引き合い1案件を強制
- `src/infrastructure/schema.ts:303-331` — deals テーブルに `clientId` カラムが存在しない。顧客情報は inquiry 経由でのみ参照可能
- `src/domain/models/deal.ts:20-37` — `Deal` 型の `inquiryId` が `string`（not nullable）
- `src/domain/models/deal.ts:39-43` — `DealWithInquiry` 型が `inquiryTitle: string` を持つ（nullable でない）
- `src/domain/services/dealTransition.ts:4-8` — 一方向遷移: `proposal_prep → [proposed, lost]`, `proposed → [negotiation, lost]`, `negotiation → [won, lost]`
- `src/application/usecases/createDeal.ts:26-33` — `inquiryRepository.findById` で引き合い存在確認 + `inquiry.status !== "converted"` チェックが必須
- `src/application/usecases/createDeal.ts:35-38` — `dealRepository.findByInquiryId` で重複チェック
- `src/application/usecases/updateInquiryStatus.ts:36-42` — converted 遷移で `dealRepository.create({ organizationId, inquiryId, title: inquiry.title })` で Deal を作成。clientId は渡していない
- `src/application/usecases/updateDealPhase.ts:22-27` — `canDealTransition` で遷移を検証
- `src/infrastructure/repositories/dealRepository.ts:29-43` — `create` メソッドのシグネチャに `clientId` がない
- `src/infrastructure/repositories/dealRepository.ts:105-117` — `findByInquiryId` メソッド
- `src/app/(dashboard)/deals/page.tsx:33` — 案件一覧に新規作成ボタンが存在しない
- `src/app/(dashboard)/deals/new/page.tsx:14` — searchParams から `inquiryId` を取得。引き合い経由でのみアクセスする前提
- `src/app/actions/deals.ts:77-91` — `createDealAction` の zod スキーマで `inquiryId: z.string().uuid()` が必須
- `src/__tests__/static/projectStructure.test.ts:1077-1164` — deal テナント分離テスト

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

### A. スキーマ変更

1. **deals.inquiryId を nullable に変更**: NOT NULL 制約を外す。引き合いなし案件に対応する
2. **deals_inquiry_id_unique 制約を削除**: 引き合いなし案件（inquiryId が null）が複数作成できなくなるため。引き合い経由の重複チェックはアプリケーション層で維持する
3. **deals テーブルに clientId カラムを追加**: `uuid("client_id").notNull().references(() => clients.id)`。顧客への直接参照。全案件は必ず顧客に紐づく
4. **マイグレーションファイルを生成する**: `bunx drizzle-kit generate` を実行する

### B. ドメインモデル変更

5. **Deal 型の修正**: `inquiryId` を `string | null` に変更する。`clientId: string` フィールドを追加する
6. **DealWithInquiry 型の修正**: `inquiryTitle` を `string | null` に変更する。型名を `DealWithDetails` に改名する（引き合いなし案件では inquiryTitle が null になるため）

### C. ドメインサービス変更

7. **dealTransition.ts の簡素化**: 終端状態（won, lost）からの遷移のみ禁止する。それ以外は全て許可する。具体的には `VALID_TRANSITIONS` マップを廃止し、`canTransition(from, to)` は `from が won/lost でなく、to が有効な DealPhase であること` のみチェックする

### D. リポジトリ変更

8. **dealRepository.create のシグネチャに clientId を追加**: `clientId: string` を必須パラメータに追加する。`inquiryId` を optional に変更する
9. **dealRepository.findAllByOrganization の修正**: JOIN を inquiries から clients に変更する（clientId が直接参照になるため）。inquiryId が null の場合も正しく動作するように LEFT JOIN で inquiries を参照する
10. **dealRepository の mapRow 修正**: `clientId` のマッピングを追加する。`inquiryId` を nullable で返す

### E. ユースケース変更

11. **createDeal の修正**: 2つの作成パターンに対応する。(a) `inquiryId` 指定あり: 既存の引き合い存在確認 + converted チェック + 重複チェックを維持。引き合いの clientId を Deal の clientId にセット。(b) `inquiryId` 指定なし: `clientId` 必須。引き合いチェックをスキップ。両パターンとも `clientId` を `dealRepository.create` に渡す
12. **updateInquiryStatus の converted 遷移修正**: `dealRepository.create` に `clientId: inquiry.clientId` を渡す。inquiry.clientId が null の場合はエラー「案件化するには顧客の登録が必要です」を返す
13. **updateDealPhase の修正**: `canDealTransition` の呼び出しを新しいロジック（終端チェックのみ）に合わせる

### F. Server Actions 変更

14. **createDealAction の修正**: zod スキーマで `inquiryId` を optional に変更する。`clientId: z.string().uuid()` を追加する（inquiryId がない場合は必須、ある場合は省略可）。バリデーションロジック: `inquiryId` も `clientId` も指定がない場合はエラー

### G. UI 変更

15. **案件一覧に新規作成ボタンを追加**: PageToolbar に `[新規作成]` リンクを追加する。`/deals/new` へ遷移する
16. **案件作成ページの修正**: 引き合い経由（`inquiryId` パラメータあり）の場合は既存の動作を維持する。直接作成（パラメータなし）の場合は顧客選択プルダウンを表示する。タイトルと想定金額の入力フィールドは共通
17. **案件詳細・一覧の修正**: `DealWithInquiry` → `DealWithDetails` に型名変更を追従する。引き合いなし案件では引き合いリンクを非表示にする

### H. シードデータ修正

18. **既存 deal シードに clientId を追加**: 全 deal に対応する顧客の clientId を明示的に指定する（現在は inquiry 経由で暗黙的に参照している）
19. **引き合いなし案件を1件追加**: 既存顧客に対して直接作成された案件をシードデータに追加する

### I. テスト修正

20. **既存テストの追従修正**: dealTransition のテストを終端チェックのみに変更する。createDeal のテストに直接作成パターンを追加する。DealWithInquiry → DealWithDetails の型名変更を追従する

## スコープ外

- Contract（契約）ドメインの追加 — Request 2 で対応
- Invoice（請求）ドメインの追加 — Request 3 で対応
- deals.estimateRequestId の削除（将来使用の可能性を残す）

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `deals.inquiryId` が nullable である
- [ ] `deals` テーブルに `clientId` カラム（NOT NULL）が存在する
- [ ] `deals_inquiry_id_unique` 制約が存在しない
- [ ] `inquiryId` なしで案件を作成できる（`clientId` のみ指定）
- [ ] `inquiryId` ありの場合は既存の converted チェック + 重複チェックが動作する
- [ ] `proposal_prep` から `negotiation` への直接遷移が許可される（スキップ可）
- [ ] `proposed` から `proposal_prep` への遷移が許可される（巻き戻し可）
- [ ] `won` からの遷移が拒否される
- [ ] `lost` からの遷移が拒否される
- [ ] 案件一覧に新規作成ボタンが表示される
- [ ] 引き合いの案件化で `inquiry.clientId` が null の場合エラーが返る
- [ ] マイグレーションファイルが生成されている
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **clientId を deals に直接追加を採用、inquiry 経由の間接参照を維持を却下** — 引き合いなし案件では inquiry が存在しないため、顧客への到達手段がなくなる。全案件が顧客に直接紐づくことで、一覧クエリも JOIN が1段で済む
2. **deals_inquiry_id_unique 制約を削除を採用、nullable unique を維持を却下** — PostgreSQL の unique 制約は null を重複として扱わないため null 同士は許可されるが、制約の意図が曖昧になる。アプリケーション層で重複チェックを維持する方が意図が明確
3. **VALID_TRANSITIONS マップを廃止し終端チェックのみにするを採用、自由遷移マップ（全パターンを列挙）を却下** — フェーズ変更で自動処理が走らなくなったため、遷移制約のメリットがない。終端状態からの遷移禁止だけが必要なビジネスルール
4. **DealWithInquiry を DealWithDetails に改名を採用** — inquiryId が nullable になったことで「WithInquiry」は不正確。details（顧客名・引き合いタイトル・担当者名）を含む型として命名する
