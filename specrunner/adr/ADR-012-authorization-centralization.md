# ADR-012: 認可ルールの一元化 — ドメイン層 PERMISSION_MATRIX と canPerform の導入

- **Status**: accepted
- **Date**: 2026-06-24
- **Change**: authorization-centralize
- **Deciders**: architect

---

## Context

認可チェックが 13 のアクションファイルに 30 箇所以上インラインで散在しており、`docs/design/03-authorization-design.md` の権限マトリクスと大きく乖離していた。主な不整合:

- `finance` ロールが契約・請求の全操作から除外されていた
- `member` が案件の編集・フェーズ変更をできなかった（ADR-003 の 4 ロール体系導入後も未反映）
- 削除操作が `admin || manager` で許可されており、設計書の「admin のみ」方針と異なっていた
- `manager` / `finance` が承認委任の作成・無効化をできなかった
- `manager` がテンプレート一覧・ユーザー一覧を閲覧できなかった
- 引合の `declined` 遷移にロールチェックが存在しなかった
- 商談記録の作成に認可チェックがなかった

各アクションが独自の `session.user.role !== "admin" && ...` 判定を持つため、設計書との乖離は発見しづらく、修正も全ファイルへの個別対応が必要だった。ドメイン層には認可モジュールが存在しなかった。

本変更により `src/domain/authorization.ts` に宣言的権限マトリクスを新設し、全アクションファイルの認可チェックを `canPerform` 呼び出しに置き換えた。

**ADR-003（RBAC 拡張）との関係**: ADR-003 D1 で確立した 4 ロール体系（`admin | manager | finance | member`）を本 ADR が全ドメインに渡って一貫適用する。ADR-003 の承認操作専用ゲート（`role === "member"` 排除パターン）の注意事項は引き続き有効。

**ADR-011 D8 との関係**: ADR-011 D8 は `updateDealAction` を admin/manager のみに制限した。本 ADR の権限マトリクスでは `deal.edit` と `deal.changePhase` を `admin | manager | member` に変更しており、member への開放として ADR-011 D8 を部分的に上書きする。受注・失注（`deal.closePhase`）は引き続き `admin | manager` のみ。

---

## Decisions

### D1: 宣言的な権限マトリクスをドメイン層にオブジェクトリテラルで配置する

**Decision**: `src/domain/authorization.ts` に `PermissionMatrix` 型（`Record<Entity, Record<string, Role[]>>`）のオブジェクトリテラル `PERMISSION_MATRIX` を定義する。`canPerform(role, entity, operation): boolean` が唯一の公開 API であり、マトリクスに存在しないエンティティ・操作の組み合わせは `false` を返す（deny-by-default）。

全 9 エンティティ（inquiry / deal / meeting / client / contract / invoice / approval / approvalSettings / organization）と全操作を 1 ファイルに集約することで、権限の全体像が一箇所で見渡せる。新しい操作を追加する際に PERMISSION_MATRIX への登録を強制でき、未登録操作は自動的に拒否される。

#### Alternative 1: デコレータパターン

| | |
|---|---|
| **Pros** | アクション関数に宣言的なアノテーションとして付与できる |
| **Cons** | TypeScript の Server Action に対してデコレータは適用しづらい。Next.js の `"use server"` 関数はモジュールトップレベルでエクスポートされる制約があり、デコレータによるラッパーとの相性が悪い |
| **Why not** | Server Action の制約上、実用的な実装が困難なため |

#### Alternative 2: ミドルウェア（Next.js middleware）

| | |
|---|---|
| **Pros** | リクエスト横断で一元的に認可を処理できる |
| **Cons** | Next.js middleware は Edge Runtime で動作し、操作レベルの細粒度認可には粒度が合わない。Server Action の操作パラメータをミドルウェアから判断することは実質不可能 |
| **Why not** | 操作単位の認可制御に使えるツールではないため |

#### Alternative 3: Enum + ビットフラグ

| | |
|---|---|
| **Pros** | ビット演算で複数ロールの組み合わせを簡潔に表現できる |
| **Cons** | TypeScript の型推論との相性が悪く、可読性が低い。権限マトリクス全体を一覧する可視性が損なわれる |
| **Why not** | 可読性・保守性の観点でオブジェクトリテラルが優る |

---

### D2: 認可チェックはアクション層で呼び出す

**Decision**: `canPerform` はアクション層（`src/app/actions/*.ts`）から呼び出す。ユースケース層・ドメイン層では呼び出さない。処理順序は `validation → auth（セッション確認）→ authz（canPerform）→ usecase` とする。

認可はリクエストのコンテキスト（セッション・ロール）に依存する。セッション情報を保持するのはアクション層であり、認可の呼び出し元として適切。ユースケース層にセッション依存を持ち込むと、ドメイン・アプリケーション層がリクエストコンテキストに汚染される。

#### Alternative 1: ユースケース層で認可

| | |
|---|---|
| **Pros** | ユースケースが自己完結し、アクション層の実装漏れを防げる |
| **Cons** | セッション依存がアプリケーション層に漏れる。ユースケースのシグネチャにロールを渡す必要があり、テストのセットアップが複雑化する |
| **Why not** | ドメイン・アプリケーション層の純粋性を損なうため |

---

### D3: 認可失敗時のレスポンスメッセージを統一する

**Decision**: 全アクションで認可失敗時に `"この操作を実行する権限がありません"` を返す。認証エラー（未ログイン）は `"認証が必要です"` のままとし、認証エラーと認可エラーを明確に区別する。

従来の実装では `"権限がありません"` / `"管理者のみ実行できます"` など各アクションで異なるメッセージが混在していた。統一することでエラーログの検索性が上がり、UI のエラーハンドリングが単純化される。

---

### D4: 委任操作のリソース所有権チェックはアクション層に残す

**Decision**: `canPerform("manager", "approvalSettings", "createDelegation")` はロールレベルの許可のみ判定する。「自身の委任のみ」（`fromUserId === session.user.id`）の制約はアクション層で `canPerform` 呼び出し後に追加検証する。admin はすべてのユーザーの委任を操作可能。

リソース所有権チェックはセッションのユーザー ID と対象リソースの所有者 ID を比較する操作であり、セッションに依存する。ドメイン層は所有権判定に必要な情報を持たず、アクション層が適切な実施場所。

委任一覧も同様に、admin 以外のロールは `fromUserId = session.user.id` フィルタを適用し、自身の委任のみ返す。

---

### D5: 案件のフェーズ変更権限を 2 つの操作に分離する

**Decision**: `deal.changePhase`（通常フェーズ変更）と `deal.closePhase`（終端フェーズ変更: won / lost）を別操作として PERMISSION_MATRIX に登録する。

- `deal.changePhase`: `admin | manager | member`
- `deal.closePhase`: `admin | manager`

アクション層では遷移先フェーズが `won` または `lost` の場合に `closePhase` 権限を検証し、それ以外は `changePhase` を検証する。`updateDealAction` も FormData に `phase` フィールドを含む場合、`deal.edit` に加えてフェーズ変更の権限を追加検証する。

設計書の意図（member はフェーズ変更可能だが、受注・失注の最終判断はマネージャー以上が行う）を権限マトリクスで明示的に表現する。単一の `updatePhase` 操作で表現すると、終端フェーズの制限をアクションのインロジックにしか記録できず、権限マトリクスから読み取れなくなる。

**ADR-011 D8 との関係**: ADR-011 D8 は `updateDealAction` を admin/manager のみに制限したが、本変更で `deal.edit` と `deal.changePhase` が member に開放される。受注・失注（`deal.closePhase`）は admin/manager のみを維持しており、ADR-011 D8 の主旨（終端フェーズ遷移の管理職制限）は継承する。

---

### D6: 引合のステータス変更を 2 つの操作に分離する

**Decision**: `inquiry.convert`（案件化: converted 遷移）と `inquiry.decline`（見送り: declined 遷移）を別操作として PERMISSION_MATRIX に登録する。両者とも `admin | manager` のみ許可する。

- `inquiry.edit`: `admin | manager | member`
- `inquiry.convert`: `admin | manager`
- `inquiry.decline`: `admin | manager`

現行コードでは `converted` 遷移のみロールチェックがあり、`declined` 遷移には存在しなかった。本変更で `declined` 遷移への新規制限を追加する。設計書では案件化・見送りをマネージャー以上の判断が必要な操作として明記している。

---

### D7: 商談記録の作成に認可チェックを追加する

**Decision**: 現行コードでは `createMeetingAction` に認可チェックがなく、`updateMeetingAction` のみ `admin || manager` チェックがあった。PERMISSION_MATRIX での定義:

- `meeting.create`: `admin | manager | member`
- `meeting.edit`: `admin | manager | member`
- `meeting.delete`: `admin | manager`

`createMeetingAction` には認可チェックを新規追加し（admin / manager / member を許可）、`updateMeetingAction` の認可チェックを `canPerform` 呼び出しに置換する（member を追加許可）。

設計書では商談記録の作成・編集は営業担当（member）の日常業務であり、全 3 ロール（admin / manager / member）に許可されている。finance は商談記録（案件活動ログ）の作成・編集は担当しない。

---

## Consequences

### Positive

- 権限の全体像が `src/domain/authorization.ts` の 1 ファイルで見渡せるようになった
- `docs/design/03-authorization-design.md` セクション 3 の権限マトリクスと実装が一致した
- deny-by-default により、新しい操作を追加する際に PERMISSION_MATRIX への登録が強制される（未登録 = 全拒否）
- 認可ポリシーのユニットテスト（`src/__tests__/domain/authorization.test.ts`）が 9 ドメイン × 全ロール × 全操作を網羅的にカバーする
- 認可失敗メッセージが統一され、ログ検索と UI エラーハンドリングが単純化された
- build / typecheck / test（596 pass, 0 fail）/ lint が全て green

### Negative / Trade-offs

- **deny-by-default の開発コスト**: 新しい操作を追加する際に PERMISSION_MATRIX への登録を忘れると、全ロールでアクセスが拒否される。登録漏れはテストで検出可能だが、開発者の追加作業が必要。
- **委任の所有権チェックがマトリクス外**: `fromUserId === session.user.id` の検証は `canPerform` の外にあるため、権限マトリクスを見ても所有権制約が読み取れない。`delegations.ts` にインラインコメントで明記している。
- **invoice.edit の未使用**: PERMISSION_MATRIX に `invoice.edit` が定義されているが、`updateInvoiceAction` が未実装のため使用されていない。将来の実装時に使用する前提。

### Constraints for future changes

- **新しい操作の追加**: アクションに新しい認可チェックを追加する際は、必ず `PERMISSION_MATRIX` に操作とロールを登録してから `canPerform` を呼び出すこと。登録なしに `canPerform` を呼び出すと常に `false` が返る
- **新しいエンティティの追加**: `Entity` 型と `PERMISSION_MATRIX` の両方に追加すること。TypeScript の型が `PermissionMatrix = Record<Entity, ...>` のため、`Entity` に追加しただけでは `PERMISSION_MATRIX` への登録が必須となり、コンパイルエラーで検出される
- **案件のフェーズ変更**: アクション層で遷移先フェーズが `won` / `lost` の場合は `closePhase`、それ以外は `changePhase` を検証すること（D5 参照）。この分岐ロジックは `deals.ts` の `updateDealPhaseAction` と `updateDealAction` の両方に存在する
- **委任の自己所有権チェック**: `canPerform` で委任操作が許可された後、admin 以外のロールは `fromUserId === session.user.id` の追加検証を必ず行うこと（D4 参照）。この制約は権限マトリクスに表現されていないため、`delegations.ts` のコメントで担保している
- **引合の declined 遷移**: 引合のステータス更新アクションで `declined` への遷移は `inquiry.decline` 権限を検証すること。現行では `updateInquiryStatusAction` が `convert` / `decline` ごとに `canPerform` を分岐して呼び出している
- **roleEnum への新ロール追加時**: `PERMISSION_MATRIX` の全操作に対して新ロールの権限を明示的に設定すること。新ロールは自動的に全操作を拒否される（deny-by-default）。既存の Role 定数定義（`ADMIN_ONLY` 等）の見直しが必要な場合は全エンティティのマトリクスを確認すること

---

## References

- `specrunner/changes/authorization-centralize/design.md` — 詳細設計（D1〜D7）
- `specrunner/changes/authorization-centralize/request.md` — 要件定義
- `specrunner/changes/authorization-centralize/spec.md` — ビヘイビア仕様
- `src/domain/authorization.ts` — 権限マトリクス定義と canPerform 実装
- `src/__tests__/domain/authorization.test.ts` — 認可ポリシーのユニットテスト
- `src/app/actions/contracts.ts`, `invoices.ts`, `deals.ts`, `inquiries.ts`, `clients.ts`, `delegations.ts`, `templates.ts`, `users.ts`, `meetings.ts`, `webhooks.ts` — canPerform 置換済みのアクションファイル
- `docs/design/03-authorization-design.md` — 権限マトリクス設計書（セクション 3 が PERMISSION_MATRIX の原典）
- `specrunner/adr/ADR-003-rbac-amount-routing.md` — 4 ロール体系の確立（本 ADR が全ドメインに適用）
- `specrunner/adr/ADR-011-domain-restructuring.md` — D8 (updateDealAction のロール制御) を部分的に上書き
