# Design: MCP 引合「案件化」専用オペレーション

## Context

引合（Inquiry）の案件化は `updateInquiryStatus` ユースケースの `newStatus === "converted"` 経路で実現されている。MCP ツール `inquiries` の `update_status` オペレーションからも呼び出せるが、以下の問題がある。

1. **発見性の欠如** — 接続エージェントは `update_status` に `converted` を渡す必要があり、案件化という業務操作が隠れている。
2. **生成された Deal が返らない** — `updateInquiryStatus` の Result 型は `{ ok: true; inquiry: Inquiry; pendingApproval?: { requestId } }` であり、即時生成された Deal を含まない。MCP ハンドラも Deal を返さないため、エージェントは別途 Deal を探す必要がある。

既存コードの構造:
- **usecase**: `src/application/usecases/updateInquiryStatus.ts` — converted 経路で `dealRepository.create` を呼ぶが、生成された Deal を Result に含めていない。
- **MCP ツール**: `src/app/api/mcp/tools/inquiries.ts` — `update_status` ハンドラが usecase を呼び、`inquiry` と `pendingApproval` メッセージを返す。
- **認可**: `canPerform(role, "inquiry", "convert")` — `ADMIN_MANAGER` のみ。既に定義済み。
- **Server Action**: `src/app/actions/inquiries.ts` — `updateInquiryStatusAction` は Result の `ok` と `pendingApproval` のみ参照し、Deal フィールドは無視する（追加しても後方互換）。

## Goals / Non-Goals

**Goals**:

1. `updateInquiryStatus` の成功 Result に即時生成された Deal を含める（`deal?: Deal`）。
2. inquiries MCP ツールに `convert` オペレーションを追加し、案件化の専用入口とする。結果に `inquiry`, `deal?`, `pendingApproval?`, `message` を返す。
3. `convert` および `update_status` の description に挙動を明記し、エージェントの誤用を防止する。
4. `update_status: converted` を後方互換として維持する。

**Non-Goals**:

- `update_status` から `converted` を削除すること。
- 「商談」の一級化・ドメイン再設計。

## Decisions

### D1: usecase の Result 型に `deal?: Deal` を追加する

**決定**: `UpdateInquiryStatusResult` の成功ケースに `deal?: Deal` を追加し、即時生成経路でトランザクション内の `dealRepository.create` の戻り値をセットする。承認ゲート経路では `deal` は undefined のまま。

**理由**: Deal 情報は usecase 内部で既に保持されている（`dealRepository.create` の戻り値）。Result に含めるだけで MCP・Server Action の両方が利用可能になる。Server Action は `result.deal` を参照しないため後方互換を壊さない。

**代替案**: MCP ハンドラ内で `getDealByInquiry` を別途呼ぶ — usecase 内で既に Deal を持っているのに再クエリは無駄であり、トランザクション外の読み取りで一貫性が低下する。

### D2: MCP に `convert` オペレーションを追加する（既存 `update_status` と共存）

**決定**: `inquiriesInputSchema` の discriminatedUnion に `convertSchema` を追加する。入力は `{ operation: "convert", inquiryId: string }` のみ。ハンドラは `updateInquiryStatus({ ..., newStatus: "converted" })` を呼び、結果を `{ inquiry, deal?, pendingApproval?, message }` として整形して返す。

**理由**: 専用オペレーションにすることで接続エージェントが案件化を自然に発見・実行でき、結果の Deal も取得できる。内部は同一 usecase を呼ぶため、ビジネスロジックの重複がない。

**代替案**: 新規ユースケース `convertInquiry` を分離する — ロジック重複・不変条件の二重管理が発生し、保守コストが増す。既存 usecase の converted 経路と完全に同一であるため、呼び出しの再利用が適切。

### D3: `convert` の認可・レート制限・監査は `update_status: converted` と同一

**決定**: `convert` ハンドラで `canPerform(role, "inquiry", "convert")` を呼び、レート制限キーは `mcp:updateInquiryStatus:${userId}` を共有する。監査は usecase 内で記録されるため追加不要。

**理由**: 同一ビジネス操作であるため、認可・レート制限・監査の判定基準を分岐させる理由がない。レート制限キーの共有により、`convert` と `update_status: converted` を交互に呼んでレート制限を回避する攻撃を防ぐ。

### D4: description の明記

**決定**:
- `convert` の description: 引合を案件化し Deal を生成する旨と承認ポリシー該当時の挙動を記載。
- `update_status` の description: `converted` による案件化は後方互換で残すが `convert` の使用を推奨する旨を注記。
- ツール全体の description に `convert` を operation 一覧に追加。

**理由**: MCP はエージェントにとって contract がすべて。description に挙動が明記されなければ誤用される。

### D5: `update_status: converted` のレスポンスにも Deal を含める

**決定**: `update_status: converted` の成功レスポンスも、usecase Result に `deal` が含まれていれば返す。これにより既存クライアントも Deal 情報を取得可能になる（追加フィールドのため破壊なし）。

**理由**: usecase が Deal を返すようになるため、MCP 側で意図的に落とす理由がない。後方互換で追加フィールドは無害。

## Risks / Trade-offs

[Risk] `convert` と `update_status: converted` の 2 経路で同一操作が可能 → **Mitigation**: description で `convert` 推奨を明記。`update_status: converted` は後方互換目的で残す。内部は同一 usecase 呼び出しのため挙動差は生じない。

[Risk] `buildAdvertisementSchema` で `convertSchema` の `inquiryId` が他の operation の同名フィールドとマージされる → **Mitigation**: `inquiryId` は既存 `updateSchema`, `updateStatusSchema`, `deleteSchema` で同一型 (`z.string().uuid()`) かつ同一 describe であるため、先勝ちマージで問題なし。

[Risk] `UpdateInquiryStatusResult` の型変更で既存テストが壊れる → **Mitigation**: `deal` はオプショナルフィールド (`deal?: Deal`) のため、型の追加は破壊的変更ではない。既存テストのモック戻り値に `deal` がなくても型エラーにならない。

## Open Questions

なし。
