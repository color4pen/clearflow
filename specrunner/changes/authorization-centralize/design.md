# Design: 認可ルールの一元化と設計整合

## Context

認可チェックが 13 のアクションファイルに 30 箇所以上インラインで散在している。各アクション関数が `session.user.role !== "admin" && session.user.role !== "manager"` のような if 文で個別に認可を判定しており、以下の問題がある。

1. **設計と実装の乖離**: `docs/design/03-authorization-design.md` の権限マトリクスが定める認可ルールと、実装上のロールチェックが一致しない。finance ロールが契約・請求操作から除外されている、member が案件編集・フェーズ変更をできない、削除権限が admin のみでなく manager にも開かれているなど、複数のズレがある。
2. **保守性の低さ**: 認可ルールの変更には全アクションファイルの個別修正が必要で、見落としが生じやすい。
3. **テスタビリティの欠如**: 認可ルール単体でのユニットテストが困難。現行テスト (`roleCheck.test.ts`) はソースコード文字列の静的検証に留まっている。

ドメイン層には現在認可に関するモジュールが存在せず、認可ロジックはアクション層に直接埋め込まれている。

### 影響を受けるファイル

アクションファイル 10 ファイル（contracts.ts, invoices.ts, deals.ts, inquiries.ts, clients.ts, delegations.ts, templates.ts, users.ts, meetings.ts, webhooks.ts）に認可チェックの置換が必要。requests.ts の承認操作はスコープ外。dealContacts.ts, auth.ts は認可チェックなし（認証のみ）。

## Goals / Non-Goals

**Goals**:

- 認可ポリシーをドメイン層 (`src/domain/authorization.ts`) に一元化し、権限マトリクスを宣言的データ構造として表現する
- `canPerform(role, entity, operation): boolean` 関数を公開し、全アクションのインライン認可チェックを置換する
- `docs/design/03-authorization-design.md` セクション 3 の全 9 ドメインの操作権限マトリクスを忠実に実装する
- 認可ポリシーモジュールのユニットテストを整備する
- 既存の静的テスト (`roleCheck.test.ts`) を `canPerform` 呼び出しへの検証に更新する

**Non-Goals**:

- 承認操作（approve/reject）の認可変更 — 承認ステップの承認者判定は `approvalStepService` で処理済み
- リソースオーナーシップベースの認可（「自分の案件のみ編集可能」等）
- 認可ミドルウェアの導入 — Server Action の構造上、関数ごとの `canPerform` 呼び出しが現実的
- 委任の「自身のみ」制約のドメイン層への移動 — `fromUserId === session.user.id` の検証はセッション依存のためアクション層に残す

## Decisions

### D1: 宣言的な権限マトリクスをドメイン層にオブジェクトリテラルで配置する

`src/domain/authorization.ts` に `Entity` × `Operation` × `Role[]` の組み合わせをオブジェクトリテラルで定義する。`canPerform(role, entity, operation)` は定義を参照して boolean を返す。定義に存在しないエンティティ・操作の組み合わせは拒否（deny-by-default）。

**型定義**:

```typescript
type Entity = "inquiry" | "deal" | "meeting" | "client" | "contract" | "invoice"
             | "approval" | "approvalSettings" | "organization";

type Operation = string;  // エンティティごとに異なる操作名（"list", "view", "create", "edit", "delete" 等）

type PermissionMatrix = Record<Entity, Record<Operation, Role[]>>;
```

**Rationale**: 権限の全体像が 1 ファイルで見渡せる。新しい操作追加時に明示的に許可ロールを決定する必要がある（deny-by-default）。テストではマトリクス全体を網羅的に検証できる。

**却下案**:
- デコレータパターン — TypeScript の Server Action では適用しづらい
- ミドルウェア — Next.js の middleware は認証には向くが、操作単位の認可には粒度が合わない
- Enum + ビットフラグ — 可読性が低く、TypeScript の型推論との相性が悪い

### D2: 認可チェックはアクション層で呼び出す

ユースケース層ではなくアクション層で `canPerform` を呼び出す。認証セッション情報を持つアクション層が認可の呼び出し元として適切。ユースケース層はビジネスロジックに集中し、セッション依存を持たない。

**Rationale**: 認可はリクエストのコンテキスト（セッション）に依存する。セッション情報をユースケースに渡すと、ドメイン層にリクエストコンテキストが漏れる。アクション層は validation → auth → authz → usecase の順で処理するのが自然。

**却下案**:
- ユースケース層で認可 — セッション依存がドメインに漏れる

### D3: 認可失敗時のレスポンスメッセージを統一する

すべてのアクションで認可失敗時に `"この操作を実行する権限がありません"` を返す。現行の `"権限がありません"` より具体的で、認証エラー (`"認証が必要です"`) との区別が明確。

**Rationale**: ユーザーへのフィードバックを統一し、認証エラーと認可エラーの区別を明確にする。

### D4: 委任操作のアクセス制御に「自身の委任のみ」ルールを追加する

委任の作成・無効化は admin / manager / finance に開放する。ただし manager / finance は自身の委任のみ操作可能（`fromUserId === session.user.id`）。admin は全ユーザーの委任を操作可能。この「自身のみ」の制約はセッション依存のためアクション層で検証する。委任一覧は admin / manager / finance が閲覧可能（manager / finance は自身の委任のみフィルタ）。

**Rationale**: 委任の `canPerform` はロールレベルの許可のみ判定する。リソースオーナーシップ（自身の委任かどうか）はアクション層の責務。

### D5: 案件のフェーズ変更を 2 つの操作に分離する

案件のフェーズ変更権限を「通常フェーズ変更 (`changePhase`)」と「終端フェーズ変更 (`closePhase`)」に分離する。`changePhase` は admin / manager / member に許可し、`closePhase`（won / lost への遷移）は admin / manager のみに許可する。

アクション層では遷移先フェーズが `won` または `lost` の場合に `closePhase` の権限を検証し、それ以外は `changePhase` を検証する。

**Rationale**: 設計書の意図（メンバーはフェーズ変更可能だが、終端フェーズへの遷移はマネージャー以上の判断が必要）を権限マトリクスで明示的に表現する。

### D6: 引合のステータス変更を 2 つの操作に分離する

引合の見送り (`declined`) と案件化 (`converted`) は admin / manager のみ許可する操作 (`convertInquiry`, `declineInquiry`) として定義する。現行コードでは `converted` のみロールチェックがあり `declined` にはないため、`declined` への新規制限追加となる。

**Rationale**: 設計書では案件化・見送りをマネージャー以上の判断が必要な操作として明記している。

### D7: 商談記録の認可チェックを追加する

現行コードでは `createMeetingAction` に認可チェックがなく、`updateMeetingAction` のみ `admin || manager` チェックがある。設計書では商談記録の作成・編集は admin / manager / member に許可されている。

`createMeetingAction` には認可チェックを追加し（admin / manager / member を許可）、`updateMeetingAction` の認可チェックを `canPerform` 呼び出しに置換する（admin / manager / member を許可に変更）。

## Risks / Trade-offs

**[Risk] 既存テストの破壊** → `roleCheck.test.ts` がソースコード文字列パターンをアサートしているため、インライン認可チェックの除去でテストが壊れる。認可ポリシーのユニットテストに置換する。

**[Risk] 委任の「自身のみ」制約の検証漏れ** → アクション層で `fromUserId === session.user.id` の検証を行うが、`canPerform` の外にあるため見落としやすい。委任アクションのインラインコメントに制約を明記する。

**[Trade-off] deny-by-default の厳格さ** → 新しい操作を追加する際に `authorization.ts` への登録を忘れると、全ロールでアクセスが拒否される。安全側に倒れるが、開発者の追加作業が必要。これはテストで検出可能であり、安全性を優先する妥当なトレードオフ。

**[Risk] `updateDealAction` 内のフェーズ変更** → `updateDealAction` は FormData 内に `phase` フィールドがある場合に `updateDealPhase` usecase を呼び出す。この場合、edit 権限に加えて `changePhase` / `closePhase` 権限の追加検証が必要。アクション層で phase フィールドの有無に応じた分岐を実装する。

## Open Questions

なし — architect 評価済みの設計判断により主要な設計選択は確定している。
