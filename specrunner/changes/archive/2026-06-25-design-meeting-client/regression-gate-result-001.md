# Regression Gate Result — Iteration 1

- **verdict**: needs-fix

## Verified Findings

### [HIGH] サブセクション見出し「社外」が spec の「外部」と不一致（回帰）

- **File**: src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingAttendeesSection.tsx:199
- **Severity**: high
- **Resolution**: fixable
- **Status**: REGRESSED — fix not present in current code
- **Rationale**: レジャーに記録された修正（「社外」→「外部」）が現在のコードに反映されていない。line 199 は依然として `社外` を使用している。spec.md・tasks.md (T-01) では「外部」と定義されており、用語を統一する必要がある。
