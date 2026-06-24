# Regression Gate Result — design-theme-base / Iteration 1

- **verdict**: needs-fix

## Summary

レジャーに記録された 1 件の finding を検証した結果、現コードに fix が反映されていないことを確認した（退行）。

---

## Findings

### [HIGH] 申請一覧ナビ項目に承認バッジの表示スロットがない（退行）

- **File**: src/app/(dashboard)/SidebarNav.tsx
- **Line**: 46
- **Severity**: high
- **Resolution**: fixable
- **Rationale**: レビューで指摘された fix が現コードに存在しない。`SidebarNav.tsx` の Link 内は `{item.label}` のみで、バッジ要素のプレースホルダーが追加されていない。要件 T-10「申請一覧の横に承認バッジの表示位置を確保する（初期状態では件数非表示）」を満たすため、`<span>` 等のバッジスロット（例: `<span className="ml-auto hidden" aria-hidden="true" />`）を追加する必要がある。
