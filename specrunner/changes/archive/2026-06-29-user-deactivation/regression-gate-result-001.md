# Regression Gate Result — Iteration 1

- **verdict**: approved

## Summary

All findings in the ledger have been verified as fixed. No regressions detected.

---

## Finding Verification

### [MEDIUM] findByEmailForAuth の auth ゲート化による createUser 重複チェック回帰

- **Status**: ✅ Fixed — no regression
- **File checked**: `src/infrastructure/repositories/userRepository.ts`, `src/application/usecases/createUser.ts`

**Verification**:

The finding identified that adding `isNull(users.deactivatedAt)` to `findByEmailForAuth` would break the email uniqueness pre-check in `createUser`, because deactivated users' email addresses would be treated as "available".

The fix introduces a dedicated `existsByEmail(email: string): Promise<boolean>` function in `userRepository.ts` that queries **all** users (active and deactivated) without any `deactivatedAt` filter:

```ts
export async function existsByEmail(email: string): Promise<boolean> {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0;
}
```

`createUser.ts` was updated to use `existsByEmail` instead of `findByEmailForAuth` for the uniqueness pre-check:

```ts
// Before (regression-prone):
const existing = await userRepository.findByEmailForAuth(data.email);
if (existing) { return { ok: false, reason: "このメールアドレスは既に使用されています" }; }

// After (fixed):
const emailTaken = await userRepository.existsByEmail(data.email);
if (emailTaken) { return { ok: false, reason: "このメールアドレスは既に使用されています" }; }
```

This ensures:
- `findByEmailForAuth` correctly excludes deactivated users (auth gate works as intended)
- `createUser` correctly treats deactivated users' email addresses as reserved (UX regression resolved)
- DB unique constraint and user-facing error message remain consistent

No contradictions or new issues were introduced.
