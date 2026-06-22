# Design: 引き合い簡素化と商談の案件専属化

## Context

引き合い（Inquiry）は受付メモであり、商談するほど進んだなら案件化すべきという業務原則がある。現状のコードには `in_progress`（対応中）ステータスが存在し、引き合いと商談（Meeting）が直接紐づく設計になっている。これにより「引き合いに商談を紐づけるべきか、案件に紐づけるべきか」という判断が実装内に常に残り、管理の複雑度が高い。

現状の主要な問題点：

- `inquiryStatusEnum`: `["new", "in_progress", "converted", "declined"]` — 中間状態 `in_progress` が判断先送りを招く
- `meetings` テーブルの `inquiryId` (nullable FK): 商談が引き合いと案件の両方に紐づける構造が混乱の元
- `inquiryTransition.ts`: `new → in_progress → converted/declined`、`declined → in_progress` という複雑な多段遷移
- `meetingRepository`: `findAllByInquiry`、`findAllByInquiryOrDeal` など引き合い経由の商談取得メソッドが存在し、クエリが複雑

## Goals / Non-Goals

**Goals**:

- 引き合いステータスを `new`（受付済み）→ `converted`（案件化済み）/ `declined`（見送り）の2択に簡素化する
- 商談は案件（Deal）にのみ紐づくよう DB スキーマ・ドメインモデルを修正する
- `meetings.dealId` を NOT NULL に変更し「どこにも紐づかない商談」が生まれない構造にする
- 引き合い経由の商談作成・閲覧ルートを削除し、商談は案件詳細からのみ扱う
- 見送りからの復帰先を `in_progress` から `new` に変更し、受付状態で仕切り直す
- 既存マイグレーションファイルには触れず、差分マイグレーションのみ追加する

**Non-Goals**:

- 引き合い・案件・契約の削除機能（Request 2 で対応）
- フォームの非対称解消（Request 2 で対応）
- 編集履歴・監査ログへの変更前値記録（Request 2 で対応）

## Decisions

### D1: in_progress ステータスを廃止し new から直接 converted/declined へ遷移する

**Rationale**: 引き合いは受付メモであり、商談するほど進んだなら即座に案件化すべき。中間状態 `in_progress` は「案件化かどうかまだ決めていない」という判断の先送りを正当化するだけで、管理上の価値がない。

**Alternatives considered**: `in_progress` を維持する — 運用上の利便性として「対応中」を示す中間状態を維持するという案があったが、商談段階になった時点で案件化すれば `in_progress` は不要になる。中間状態があると UI・ドメインロジック・スキーマの複雑度が上がり続ける。

### D2: meetings.inquiryId カラムを削除する

**Rationale**: 商談は営業活動であり案件に対して行うもの。引き合い段階の情報収集は引き合いの `description` フィールドで十分。FK を残すと「引き合いに商談を紐づけるべきか案件に紐づけるべきか」の判断が実装に永続する。

**Alternatives considered**: nullable のまま残す — 後方互換性を保てるが、削除の意図が実装に伝わらず、古い参照が残り続けるリスクがある。「削除した」という事実をスキーマで表現することが重要。

### D3: meetings.dealId を NOT NULL に変更する

**Rationale**: `inquiryId` を削除した後、商談は必ず案件に紐づく。nullable のままだと「どちらにも紐づかない商談」が作成可能になり、孤立データが発生する。NOT NULL 制約でインバリアントを DB レベルで保証する。

**Alternatives considered**: アプリケーション層のみで保証する — 既存の `createMeeting` が `inquiryId` か `dealId` のどちらか必須チェックをしていたが、DB 制約がないと直接 INSERT や将来の実装変更で孤立データが生まれる。

### D4: 見送りからの復帰先を new にする

**Rationale**: `in_progress` が廃止されるため、`new` に戻すのが唯一の選択肢。受付状態に戻ることで「改めて案件化するか見送るか」の判断を仕切り直すことができる。

**Alternatives considered**: 廃止のみで復帰なし — 見送った引き合いを完全な終端状態にする案があったが、引き合いの「再検討」はビジネス上あり得るユースケースであり、復帰パスを維持する。

### D5: 引き合い経由の商談ルート（meetings/ ディレクトリ）を削除する

**Rationale**: 商談は案件にのみ紐づくため、引き合いから商談を作成・参照するルートは不要になる。ルートを残すと「引き合いからも商談を作れる」という誤解を UI が与え続ける。

**Alternatives considered**: ルートを残して 404 にする — 後方互換 URL として残す案があったが、引き合い詳細ページの商談履歴セクションごと削除するため、入口が消えればルートも削除するのが一貫している。

## Risks / Trade-offs

[Risk] 既存データの `inquiryId` を持つ商談レコードがマイグレーション時にエラーになる → Mitigation: `seed.ts` を先に修正し、開発環境では `bun run db:reset` でシードをやり直す。本番データがある場合はマイグレーション前に `inquiryId` を NULL に更新する前処理 SQL を別途用意する（本 Request のスコープ外）。

[Risk] `meetings.dealId NOT NULL` 制約追加時、既存レコードに `dealId` が NULL のものがあるとマイグレーション失敗 → Mitigation: シードデータの商談はすべて `dealId` を持つよう修正してから generate する。マイグレーション SQL 確認を tasks に含める。

[Risk] `findAllByInquiry` の呼び出し箇所（`inquiries/[id]/page.tsx`）が削除されず型エラーが発生する → Mitigation: `bun run build` / `typecheck` を受け入れ基準に含める。実装後に必ず実行する。

[Risk] `updateMeetingSchema` に `inquiryId` フィールドが残っており、`revalidatePath` で旧パスへの参照が残る → Mitigation: `meetings.ts` の `updateMeetingSchema` と `updateMeetingAction` の `revalidatePath` も修正対象に含める。

## Open Questions

なし（architect が全設計判断を評価済み）
