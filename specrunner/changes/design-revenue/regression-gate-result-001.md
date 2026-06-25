# Regression Gate Result — Iteration 1

- **verdict**: needs-fix

## Verification Summary

2 findings were claimed as fixed. Verification result: 1 confirmed fixed, 1 regression detected.

---

## Finding 1 — VERIFIED FIXED

- **Severity**: medium
- **File**: src/app/(dashboard)/revenue/forecast/page.tsx:44
- **Title**: getPrevNextLinks が常に現在時刻基準で前後リンクを算出するためナビゲーションが連鎖しない
- **Status**: ✅ Fixed

`getPrevNextLinks` は `(periodType: PeriodType, periodStart: Date)` を受け取り、`periodStart.getFullYear()` / `periodStart.getMonth()` を起点として前後月を算出するよう修正されている。呼び出し元でも `getPrevNextLinks(periodType, periodStart)` と正しく渡されており、修正は有効。

---

## Finding 2 — REGRESSION

- **Severity**: high
- **Resolution**: fixable
- **File**: src/app/(dashboard)/revenue/page.tsx:112
- **Title**: 月次推移テーブルのバー列（4列目）に Link がなくクリック不感帯が生じる（回帰）

1〜3 列目の `<td>` はそれぞれ `<Link href={href} className="block w-full h-full">` でラップされているが、4 列目（CSS バー）の `<td>` 内容は依然 `<Link>` でラップされていない。

```tsx
// 現状 (line 112–119) — Link なし
<td className="py-1 w-32">
  <div className="bg-gray-100 rounded h-3 w-full">
    <div className="bg-primary h-3 rounded" style={{ width: barWidth }} />
  </div>
</td>
```

**修正方針**: バー列の `<div>` を `<Link href={href} className="block w-full h-full">` でラップする。

```tsx
<td className="py-1 w-32">
  <Link href={href} className="block w-full h-full">
    <div className="bg-gray-100 rounded h-3 w-full">
      <div className="bg-primary h-3 rounded" style={{ width: barWidth }} />
    </div>
  </Link>
</td>
```
