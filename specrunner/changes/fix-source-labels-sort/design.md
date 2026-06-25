# Design: 経路ラベル追加とテーブル並び順の修正

## Context

R02（domain-model-alignment）で `inquirySourceEnum` を 7 値に拡張したが、UI 側の 2 つのラベル定義が 5 値のままで同期されていない。`email` と `agent_service` がラベル・フォーム選択肢の両方で欠落しており、これらの経路で引合を登録できない。また一覧テーブルの表示フィルタ（経路ドロップダウン）にも反映されない。

加えて、5 つのリポジトリの一覧取得関数が `createdAt` 昇順（古い順）で返しており、業務上は新しいレコードから確認するのが自然であるため、降順に統一する。

対象ファイル群は以下:

- `src/app/(dashboard)/labels.ts` — sourceLabels（表示ラベルの辞書）
- `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` — sourceOptions（登録フォームの選択肢）
- `src/infrastructure/repositories/inquiryRepository.ts` — findAllByOrganization, findAllWithClientByOrganization, findByClientId
- `src/infrastructure/repositories/dealRepository.ts` — findAllByOrganization, findAllByClientId
- `src/infrastructure/repositories/contractRepository.ts` — findAllByClientId, findAllByOrganization
- `src/infrastructure/repositories/requestRepository.ts` — findAllWithStepsByOrganization
- `src/infrastructure/repositories/clientRepository.ts` — findAllByOrganization

## Goals / Non-Goals

**Goals**:

- sourceLabels に `email: "メール"` と `agent_service: "仲介サービス"` を追加し、enum 7 値と完全一致させる
- InquiryForm の sourceOptions に同 2 値を追加し、全経路で引合登録を可能にする
- 一覧テーブル（引合・案件・契約・承認・顧客）のデフォルトソートを `createdAt DESC` に統一する

**Non-Goals**:

- InquirySource enum の値追加（スキーマは既に 7 値で定義済み）
- UI 側のソート切替機能
- 引合の情報モデル変更（問い合わせ内容と概要の分離）
- approvalSteps の orderBy 変更（stepOrder 昇順は業務上正しい）
- approvalPolicies の orderBy 変更（ポリシー評価の決定的な順序を維持）
- revenueRepository の orderBy 変更（月次集計・ランキングの並び順は既に適切）

## Decisions

### D1: sourceLabels に直接 2 値を追加する

`labels.ts` の `sourceLabels` オブジェクトに `email` と `agent_service` を追加する。`sourceLabels` は引合一覧のフィルタ生成（`page.tsx`）、詳細表示（`InquiryInfoDisplay.tsx`）、編集フォーム（`InquiryInfoSection.tsx`）、顧客詳細（`clients/[id]/page.tsx`）の 4 箇所で参照されており、追加だけで全箇所に波及する。

**Rationale**: sourceLabels は `Record<string, string>` の単純辞書であり、エントリ追加は破壊的変更にならない。既存の参照箇所はすべて `Object.entries()` で動的に展開するため、個別修正不要。

### D2: sourceOptions を labels.ts から生成しない

InquiryForm の `sourceOptions` は `labels.ts` とは独立に定義する。

**Rationale**: architect 評価済み。sourceOptions は順序制御（enum 定義順: web → phone → email → referral → agent_service → exhibition → other）と「選択してください」プレースホルダーを含む。labels.ts の辞書はオブジェクトプロパティ順に依存するため順序保証が曖昧。DRY よりも明示性を優先する。

### D3: drizzle-orm の desc() で降順ソートを指定する

`inquiryRepository` は現在 `import { eq, and, sql }` のみ。`desc` を追加インポートする。`dealRepository` と `contractRepository` は既に `asc` をインポートしているため `desc` を追加する。`requestRepository` と `clientRepository` は新たに `desc` をインポートする。

**Rationale**: drizzle-orm の `desc()` は型安全かつ既存コードベースで `asc()` が使用されているため、対称的に `desc()` を使うのが自然。

### D4: findAllWithStepsByOrganization の orderBy は requests.createdAt のみ DESC にする

`requestRepository.findAllWithStepsByOrganization` の現在の orderBy は `(requests.createdAt, approvalSteps.stepOrder)` の 2 カラム。`requests.createdAt` を `desc()` に変更し、`approvalSteps.stepOrder` は昇順のまま維持する。承認ステップは申請内での論理的な順序（1→2→3）が業務上正しい。

**Rationale**: 要件 4「approvalSteps の orderBy は変更しない」を遵守する。

### D5: requestRepository.findAllByOrganization も DESC に変更する

要件では `findAllWithStepsByOrganization` のみ明示されているが、`findAllByOrganization`（line 116）も同じ `requests.createdAt` 昇順であり、同一リポジトリ内の一覧取得関数でソート方向が不統一になるのは不整合。DESC に統一する。

**Rationale**: 同一リポジトリ内の一覧系関数のソート方向を統一し、将来の混乱を防ぐ。

## Risks / Trade-offs

[Risk] sourceLabels に依存する UI が enum 順序を前提にしている場合、表示順が変わる可能性がある → **Mitigation**: sourceLabels はオブジェクトリテラル順で展開されるため、enum 定義順（web, phone, email, referral, agent_service, exhibition, other）で記述すれば一貫する。既存の 5 値も同順で定義されている。

[Risk] 降順ソートへの変更で既存テストが破壊される可能性がある → **Mitigation**: テスト実行で確認する。ソート順をアサートするテストがある場合は期待値を更新する。

## Open Questions

なし。要件が明確であり、設計判断は architect により評価済み。
