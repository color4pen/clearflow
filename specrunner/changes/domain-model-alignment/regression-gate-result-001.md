# Regression Gate Result — domain-model-alignment — iteration 001

- **verdict**: approved
- **iteration**: 001

## 検証方法

`git diff main...HEAD` で変更全体を確認後、各 finding の対象ファイルを直接読み取って状態を検証した。

---

## Findings 検証結果

| # | Severity | File | Finding | 現在の状態 | 備考 |
|---|----------|------|---------|-----------|------|
| 1 | LOW | `src/app/actions/meetings.ts` | inquiry-only meeting 作成・更新後に revalidatePath がない | **存在（未修正）** | review-feedback-001 で `Fix: no`。`createMeetingAction` (line 202-205) と `updateMeetingAction` (line 369-374) ともに dealId がある場合のみ `revalidatePath` を呼ぶ。inquiry-only パスは revalidation なし。意図的スコープ外。 |
| 2 | LOW | `src/infrastructure/seed.ts` | 未使用変数警告 5 件（greenContact1, newInquiry1, newInquiry2, inProgressInquiry1, inProgressInquiry2） | **存在（未修正）** | review-feedback-001 で `Fix: no`。各変数は `.returning()` で受け取るが後続コードで参照されない。lint は 0 errors で通過。意図的スコープ外。 |
| 3 | LOW | `src/app/actions/meetings.ts:44` | `createMeetingSchema.refine` のエラー path が `["dealId"]` 固定 | **存在（未修正）** | review-feedback-001 で `Fix: no`。line 45: `path: ["dealId"]` のまま。inquiryId フィールドにはエラー表示なし。意図的スコープ外。 |
| 4 | MEDIUM | `src/application/usecases/createClientContact.ts` / `src/app/actions/clients.ts` | isPrimary 一意性チェックが非アトミック（TOCTOU） | **存在（未修正）** | domain-invariants-result-001 で `Fix: no`。`createClientContact` はトランザクション外で Read-Check-Write を実行。`updateClientContactAction` (clients.ts lines 282-292) も同様。変更前より改善だが DB 制約なしでは完全な一意性保証は成立しない。意図的スコープ外。 |
| 5 | LOW | `src/app/actions/clients.ts:294` | updateClientContactAction の isPrimary 変更に audit log がない | **存在（未修正）** | domain-invariants-result-001 で `Fix: no`。line 294 で `clientRepository.updateContact()` を直接呼び、`auditLogRepository.create()` が呼ばれていない。usecase バイパスは既存問題かつ意図的スコープ外。 |

---

## 退行・矛盾の検出

### 退行（修正済みのものが戻った）
なし。上記 5 件はすべて review 段階で `Fix: no` と判定されており、修正が行われていないため「戻った」という状態は発生しない。

### 矛盾（修正 A が B を再導入した）
なし。

---

## 総合評価

全 5 件の finding は iteration 001 のレビュー（review-feedback-001.md / domain-invariants-result-001.md）において `Fix: no` と判定済みであり、設計上の既知課題として承認されている。コードは期待された状態にある。修正漏れや退行はなく、承認済みレビューの判断と整合している。

- Finding 1, 3: 将来の inquiry UI 追加時に対処を推奨
- Finding 2: 警告は低優先度、lint は 0 errors で通過
- Finding 4: isPrimary 利用が承認ポリシーの評価基点になる前に DB 部分インデックスの追加を推奨
- Finding 5: usecase 経由への切り替えまたは個別 audit log 追加が将来的なコンプライアンス対応として推奨
