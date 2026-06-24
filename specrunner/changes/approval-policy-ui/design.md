# Design: 承認ポリシー設定画面

## Context

R04a/R04b で承認ポリシーのバックエンド層（`approvalPolicies` テーブル、`approvalPolicyRepository`、`evaluatePolicies` ユースケース）が実装済み。リポジトリには `create`, `findById`, `findByOrganization`, `findActiveByTriggerAction`, `updateById`, `deleteById` が揃っている。

管理者がポリシーを一覧・作成・編集・有効/無効切り替えできる設定画面が存在しないため、現状では DB を直接操作するか seed データに頼る必要がある。

既存の設定画面として `templates/`（テンプレート管理）が同じ構成パターン（一覧 page.tsx、作成 new/page.tsx、編集 [id]/edit/page.tsx、共通フォーム Form.tsx）で実装されており、参考パターンとして利用できる。

認可マトリクスは `authorization.ts` の `approvalSettings` エンティティに `listPolicies`（admin/manager）、`createPolicy`（admin）、`editPolicy`（admin）が定義済み。

## Goals / Non-Goals

**Goals**:

- ポリシーの一覧・作成・編集・有効/無効トグルを管理画面から操作可能にする
- `templates/` と同じディレクトリ構成・UI パターンを踏襲し、コードベースの一貫性を維持する
- 既存の認可マトリクス（`approvalSettings.listPolicies`, `createPolicy`, `editPolicy`）に従ったアクセス制御を実装する
- トリガーアクションの日本語ラベル表示と条件入力の連動制御を実装する

**Non-Goals**:

- ポリシーの削除機能（無効化で代替）
- 条件のプレビュー・テスト機能
- ポリシーの適用ログ・履歴表示
- usecase 層の新規作成（ポリシーの CRUD はリポジトリ直呼びで十分なシンプルさ）

## Decisions

### D1: templates/ と同じディレクトリ構成を採用する

**選択**: `settings/policies/page.tsx`（一覧）、`settings/policies/new/page.tsx`（作成）、`settings/policies/[id]/edit/page.tsx`（編集）、`settings/policies/PolicyForm.tsx`（共通フォーム）

**却下**: モーダルで作成・編集を行う構成

**Rationale**: ポリシーのフィールド数（名前、説明、トリガーアクション、条件フィールド、条件演算子、条件値、テンプレート）が多く、モーダルでは狭い。`templates/` と同じパターンを踏襲することで開発者の認知負荷を抑え、保守性を維持する。architect 評価済み。

### D2: サーバーアクションで直接リポジトリを呼び出す（usecase 層を新設しない）

**選択**: `src/app/actions/policies.ts` から `approvalPolicyRepository` を直接呼び出す。

**却下**: 専用 usecase（`createPolicy.ts`, `updatePolicy.ts` 等）を新設する。

**Rationale**: ポリシーの作成・更新・トグルは単一リポジトリへの単純な CRUD であり、複数リポジトリやドメインサービスの協調が不要。`templates.ts` の `listTemplatesAction` が `approvalTemplateRepository.findByOrganization` を直接呼んでいるのと同じパターン。将来ポリシー変更時の監査ログ追加等でオーケストレーションが必要になった時点で usecase を抽出する。

### D3: トリガーアクションのラベルマッピングを定数オブジェクトとして PolicyForm 近傍に定義する

**選択**: `TRIGGER_ACTION_LABELS` を `PolicyForm.tsx` 内に `Record<string, string>` として定義する。一覧ページからも参照するため、別ファイル `src/app/(dashboard)/settings/policies/constants.ts` に切り出す。

**却下**: ドメイン層にラベルを定義する。

**Rationale**: 日本語ラベルは表示層の関心事でありドメインモデルに含めるべきでない。`constants.ts` への切り出しにより一覧ページとフォームの両方から import でき、ラベルの一箇所管理を実現する。

### D4: 有効/無効トグルをインラインサーバーアクションで実装する

**選択**: 一覧テーブルの各行にトグルボタンを配置し、`togglePolicyAction` サーバーアクションを呼び出す。`delegations/page.tsx` の無効化ボタンと同じインライン form パターンを使用する。

**却下**: クライアントサイドで状態管理し API ルートを呼ぶ方式。

**Rationale**: Next.js App Router のサーバーアクション + `revalidatePath` で、クライアント状態管理なしに即座にデータを反映できる。既存の代理承認の無効化ボタンと同じパターンで一貫性がある。

### D5: 一覧ページのアクセス制御は canPerform ベースとする

**選択**: ページコンポーネントで `canPerform(role, "approvalSettings", "listPolicies")` をチェックし、権限がなければ `/requests` にリダイレクトする。作成・編集リンクは `canPerform(role, "approvalSettings", "createPolicy")` / `editPolicy` で条件表示する。

**却下**: ロール直比較（`role !== "admin"`）。

**Rationale**: `templates/page.tsx` は `role !== "admin"` で直比較しているが、ポリシー一覧は admin と manager の両方にアクセスを許可するため、ロール直比較では不十分。`canPerform` を使うことで認可マトリクスの一箇所管理を維持する。

## Risks / Trade-offs

**[Risk]** トリガーアクションの選択肢をハードコードするため、新しいトリガーアクション追加時にフロントエンド側の更新が必要
→ **Mitigation**: `constants.ts` に一箇所にまとめることで更新漏れリスクを低減する。将来的にはバックエンドから動的取得する拡張が可能。

**[Risk]** 条件フィールドの入力が自由テキストのため、存在しないフィールドを指定できる
→ **Mitigation**: 本変更のスコープでは UI バリデーションに留める。条件プレビュー・テスト機能はスコープ外として明示的に除外済み。

**[Risk]** usecase 層を経由しないため、将来の横断的関心事（監査ログ等）の追加時にリファクタリングが必要
→ **Mitigation**: CRUD のシンプルさが現時点では usecase 省略の利点を上回る。横断的関心事が必要になった時点で usecase を抽出する判断を設計ドキュメントに明記する。

## Open Questions

なし — request.md で architect 評価済みの設計判断が提示されており、未解決の技術判断はない。
