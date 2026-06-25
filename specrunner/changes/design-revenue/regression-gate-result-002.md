# Regression Gate Result — Iteration 002

- **verdict**: approved

## Findings Ledger Verification

### [MEDIUM] getPrevNextLinks が常に現在時刻基準で前後リンクを算出するためナビゲーションが連鎖しない

- **Status**: Fixed ✅
- **Evidence**: `getPrevNextLinks(periodType: PeriodType, periodStart: Date)` の第 2 引数に `periodStart: Date` を受け取り、`const year = periodStart.getFullYear()` / `const month = periodStart.getMonth()` を起点として prev/next を算出するよう修正済み。呼び出し側も `getPrevNextLinks(periodType, periodStart)` と searchParams 由来の `periodStart` を渡している。

### [LOW] 月次推移テーブルのバー列（4列目）に Link がなくクリック不感帯が生じる

- **Status**: Fixed ✅
- **Evidence**: バー列の `<td>` 内に `<Link href={href} className="block w-full h-full">` が追加され、`<div>` バー全体がリンク領域に含まれている。他の 3 列と同等のクリック範囲が確保された。

## Summary

レジェンドの 2 件はいずれも現行コードで修正済みであり、リグレッションは確認されなかった。
