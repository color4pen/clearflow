# 認可ルールの一元化と設計整合

## Meta

- **type**: refactor
- **slug**: authorization-centralize
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 認可パターンの新規導入、全アクションファイルの認可ロジック変更 → true -->

## 背景

認可チェックが 13 のアクションファイルに 30 箇所以上インラインで散在しており、設計書（docs/design/03-authorization-design.md）の権限マトリクスと大きく乖離している。finance ロールが全操作から除外されている、member が案件の編集・フェーズ変更をできない、削除権限が設計より緩いなど、ロール設計の意図が実装に反映されていない。

ドメイン層に認可ポリシーモジュールを新設し、すべてのアクションの認可チェックを一元化する。

## 現状コードの前提

- `src/app/actions/contracts.ts:47,113,189,215` — 全操作が `admin || manager` で判定。finance が含まれていない
- `src/app/actions/invoices.ts:34,91` — 全操作が `admin || manager` で判定。設計では admin + finance
- `src/app/actions/deals.ts:166,201` — フェーズ変更と編集が `admin || manager` で判定。設計では member も許可
- `src/app/actions/deals.ts:290` — 削除が `admin || manager`。設計では admin のみ
- `src/app/actions/inquiries.ts:167` — 編集が `admin || manager`。設計では member も許可
- `src/app/actions/inquiries.ts:230` — 削除が `admin || manager`。設計では admin のみ
- `src/app/actions/clients.ts:199,255` — 担当者追加・編集が `admin || manager`。設計では member も許可
- `src/app/actions/delegations.ts:24,63,87` — 全操作が admin のみ。設計では manager/finance も自身の委任を作成可能
- `src/app/actions/templates.ts:50` — テンプレート一覧が admin のみ。設計では manager も閲覧可能
- `src/app/actions/users.ts:17` — ユーザー一覧が admin のみ。設計では manager も閲覧可能
- 認可チェックは各アクションファイルの if 文で実装されており、ドメイン層に認可モジュールは存在しない

## 要件

1. **認可ポリシーモジュールの新設**: `src/domain/authorization.ts` を作成する。エンティティ種別 × 操作 × ロールの権限定義を宣言的に記述する。`canPerform(role, entity, operation): boolean` 関数を公開する
2. **権限定義**: docs/design/03-authorization-design.md のセクション 3 の操作権限マトリクスをそのまま実装する。全 9 ドメイン（引合、案件、商談記録、顧客、契約、請求、承認、承認設定、組織管理）の操作権限を網羅する
3. **契約操作に finance を追加**: 契約の作成・編集・完了・解除を admin / manager / finance に変更する
4. **請求操作を admin + finance に修正**: 請求の作成・編集・発行・入金確認を admin / finance に変更する（manager を除外）
5. **案件の編集・フェーズ変更に member を許可**: member ロールでも案件情報の更新とフェーズ変更（非終端）ができるようにする。受注・失注は admin / manager のみに維持する
6. **引合の編集に member を許可**: member ロールでも引合の基本情報を更新できるようにする。案件化・見送り（declined 遷移）は admin / manager のみに制限する（現行コードでは見送りにロールチェックがないため新規制限の追加となる）
7. **顧客担当者の追加・編集に member を許可**: member ロールでも担当者の管理ができるようにする
8. **削除操作を admin のみに制限**: 引合、案件、契約の削除を admin のみに変更する
9. **委任操作を admin / manager / finance に開放**: 自身の承認権限の委任作成・無効化を admin / manager / finance ロールに許可する。admin はすべてのユーザーの委任を管理可能。「自身のみ」の制限は action 層で `fromUserId === session.user.id` を検証する（admin は制限なし）
10. **テンプレート一覧・ユーザー一覧を manager に開放**: 閲覧のみ manager にも許可する
11. **全アクションファイルの認可チェックを置換**: 各アクションの inline if 文を `canPerform` 呼び出しに置き換える。認可失敗時のレスポンスメッセージを統一する

## スコープ外

- 承認操作の認可変更（承認ステップの承認者判定は approvalStepService で処理済み）
- リソースオーナーシップベースの認可（「自分の案件のみ編集可能」等）
- 認可ミドルウェアの導入（Server Action の構造上、関数ごとの呼び出しが現実的）

## 受け入れ基準

- [ ] `src/domain/authorization.ts` に認可ポリシーが定義されている
- [ ] 全アクションファイルのインライン認可チェックが `canPerform` 呼び出しに置換されている
- [ ] finance ロールで契約の作成・編集・ステータス変更ができる
- [ ] finance ロールで請求の作成・編集・発行・入金確認ができる
- [ ] manager ロールで請求操作ができない
- [ ] member ロールで案件の編集・フェーズ変更（非終端）ができる
- [ ] member ロールで引合の編集ができる
- [ ] member ロールで案件の受注・失注ができない
- [ ] admin 以外のロールで削除操作ができない
- [ ] manager / finance ロールで自身の委任を作成できる
- [ ] manager ロールでテンプレート一覧・ユーザー一覧を閲覧できる
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **宣言的な権限マトリクスをドメイン層に配置** — ロール × エンティティ × 操作の組み合わせをオブジェクトリテラルで定義し、`canPerform` で参照する。理由: 権限の全体像が一箇所で見渡せる、テストしやすい、新しい操作の追加時に明示的に権限を決定する必要がある。却下案: デコレータパターン — TypeScript の Server Action では適用しづらい。却下案: ミドルウェア — Next.js の middleware は認証には向くが、操作単位の認可には粒度が合わない
2. **認可チェックはアクション層で呼び出す** — ユースケース層ではなくアクション層で認可チェックを行う。理由: 認可はリクエストのコンテキスト（セッション）に依存するため、セッション情報を持つアクション層が適切。ユースケース層はビジネスロジックに集中する。却下案: ユースケース層で認可 — セッション依存がドメインに漏れる
