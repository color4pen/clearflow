# Design: 案件アクティビティに対象エンティティ名とリンクを表示

## Context

案件アクティビティは「誰が・いつ・何をしたか」のみ表示しており、**どの対象に対してか**が不明。「アクションアイテムを追加」とだけ表示され、どの項目かが辿れない。

現状のコードベース:

- `getDealActivity` は案件配下（meeting / contract / invoice / action_item / deal_contact）を既存リポジトリで解決し targets 配列を組み、`auditLogRepository.findByTargets` で `AuditLog[]` を返す。**解決済みのエンティティオブジェクトは関数内に存在するが、表示用に外部へ返していない**
- `DealActivitySection` は `AuditLog[]` + `userMap` を受け取り、時刻・actor・アクション文を表示する。対象名・リンクは表示していない
- `AuditLog` は `targetType` / `targetId` を持つ。各エンティティの表示名フィールド: deal=`title` / meeting=`type`+`date` / contract=`title` / invoice=`title` / action_item=`description`
- 詳細ページがある対象: deal（`/deals/[id]`） / meeting（`/deals/[id]/meetings/[meetingId]`） / contract（`/contracts/[id]`）。invoice / action_item / deal_contact は詳細ページなし
- page.tsx で `getDeal` の結果（deal.title）は既に取得済み。`getDealActivity` 内では deal オブジェクト自体は取得していない

## Goals / Non-Goals

**Goals**:

- `getDealActivity` が `AuditLog[]` に加えて `targetType:targetId → { label, href? }` のマップを返す
- マップは既に解決済みのエンティティから組む（新規のリポジトリ取得を増やさない）
- deal / meeting / contract は `href` 付き、invoice / action_item は `label` のみ、deal_contact はマップ対象外
- `DealActivitySection` がアクション文に続けて対象ラベルを表示し、`href` がある対象はリンクにする
- 対象がマップに無い場合はアクション文のみで表示（フォールバック）
- 既存の表示（時刻・actor・アクション文）、env フラグ、件数上限は不変

**Non-Goals**:

- 変更前後の値・フィールド差分の表示（変更履歴に踏み込むため対象外）
- invoice / action_item / deal_contact の詳細ページ新設
- 監査ログ記録側（`recordAudit`）の変更・metadata 拡充
- ダッシュボードの「最近のアクティビティ」など案件詳細以外の表示変更

## Decisions

### D1: getDealActivity の返却型を構造体に拡張する

**決定**: 返却型を `AuditLog[]` から `{ logs: AuditLog[]; targetInfoMap: Record<string, TargetInfo> }` に変更する。`TargetInfo` は `{ label: string; href?: string }` とする。マップのキーは `${targetType}:${targetId}` の複合文字列。

**理由**: マップを AuditLog に埋め込む（フィールド追加）と domain model の汚染になる。構造体で返すことで usecase の出力として自然に分離できる。キーに `targetType:targetId` を使うことで O(1) ルックアップが可能。

**代替案**:
- AuditLog 型に `targetLabel` / `targetHref` を追加する案 — domain model に表示関心を持ち込み、層の責務が曖昧になる
- `Map<string, TargetInfo>` を使う案 — JSON シリアライズとの相性が悪い。Server Component の props 渡しを考慮し `Record` を選択

### D2: deal タイトルは呼び出し元から受け取る

**決定**: `getDealActivity` のパラメータに `dealTitle: string` を追加する。deal のマップエントリはこのタイトルから組む。

**理由**: `getDealActivity` は案件配下の子エンティティを解決するが、deal オブジェクト自体は取得していない。`dealRepository` の import と `findById` 呼び出しを新規追加すると要件の「新規のリポジトリ取得を増やさない」に抵触する。呼び出し元の page.tsx は既に `getDeal` で deal.title を保持しているため、パラメータとして渡すのが自然。

**代替案**:
- `getDealActivity` 内で `dealRepository.findById` を追加する案 — 新規リポジトリ取得の追加であり要件違反
- deal のみマップに含めず UI 側で補完する案 — マップの完全性が損なわれ、UI 側にロジックが漏れる

### D3: meeting のラベルは「種別ラベル＋日付」

**決定**: meeting のラベルは `meetingTypeLabels[meeting.type]` + `meeting.date` の日付文字列で構成する（例: 「ヒアリング 2026/06/28」）。`meetingTypeLabels` は既存の `@/lib/meetingLabels` から import する。

**理由**: meeting には `title` フィールドがない。種別と日時の組み合わせが meeting を一意に識別する最も自然な表示。`meetingTypeLabels` は `lib/` にあり、usecase から参照可能。

**代替案**:
- `meeting.summary` を使う案 — null の場合があり、長文になる可能性もある
- `meeting.id` の一部を使う案 — ユーザーにとって無意味

### D4: deal_contact はマップ対象外（ラベル解決しない）

**決定**: deal_contact の audit log はアクション文（「担当者を追加/削除」）で十分であり、contactId → 氏名の解決を行わない。マップに deal_contact エントリを含めない。

**理由**: deal_contact の解決には contactId → 氏名の追加リポジトリ取得が必要であり、「新規のリポジトリ取得を増やさない」に抵触する。アクション文自体に「担当者を追加/削除」と対象の性質が含まれているため、ラベルなしでも意味が通る。

**代替案**: contactRepository を追加で呼ぶ案 — 要件違反。

### D5: TargetInfo 型の定義場所は getDealActivity と同じファイル

**決定**: `TargetInfo` 型を `getDealActivity.ts` 内で export 定義する。

**理由**: `TargetInfo` は getDealActivity の返却型の一部であり、usecase 固有の出力型。domain model ではなく application 層の出力。使用箇所は getDealActivity の返却と DealActivitySection の props の 2 箇所のみであり、独立ファイルを起こす規模ではない。

**代替案**:
- `domain/models/` に配置する案 — 表示関心であり domain に置くべきではない
- 別ファイル `application/types.ts` に分離する案 — 使用箇所が 2 つしかなく過剰

### D6: DealActivitySection でのラベル表示位置

**決定**: アクション文の後に「`：`」区切りで対象ラベルを表示する。href がある場合は `<Link>` でラップする。レイアウト: `[時刻] [actor]が [アクション文]：[対象ラベル]`。

**理由**: 既存のレイアウトを維持しつつ、対象情報を自然に付加できる。アクション文が主で対象ラベルが従の関係を視覚的に表現する。

**代替案**:
- アクション文の前に対象を配置する案 — 「何をしたか」が先に来る現在の読み順を崩す
- 対象ラベルを別行にする案 — 行数が倍増し、タイムラインが冗長になる

## Risks / Trade-offs

**[Risk] getDealActivity の返却型変更で呼び出し元の修正が必要**
→ Mitigation: 呼び出し元は page.tsx の 1 箇所のみ。構造分割代入で `{ logs, targetInfoMap }` を受け取るよう変更するだけで済む。

**[Risk] 削除済みエンティティの audit log で targetInfoMap にエントリが無い場合がある**
→ Mitigation: 要件 4 により、マップに無い場合はアクション文のみ表示（フォールバック）。UI が壊れない設計。

**[Risk] meeting ラベルの日付フォーマットが locale 依存**
→ Mitigation: `toLocaleDateString("ja-JP")` で明示的に ja-JP ロケールを指定する。サーバーサイドレンダリングのため環境差異は限定的。

## Open Questions

なし。要件で主要な判断は確定済み。
