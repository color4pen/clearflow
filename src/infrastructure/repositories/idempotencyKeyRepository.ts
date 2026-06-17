import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { idempotencyKeys } from "../schema";

export async function findByKey(
  key: string,
  organizationId: string
): Promise<{ result: unknown } | null> {
  const result = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, key),
        eq(idempotencyKeys.organizationId, organizationId)
      )
    )
    .limit(1);
  return result[0] ? { result: result[0].result } : null;
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

export async function create(data: {
  key: string;
  action: string;
  result: unknown;
  organizationId: string;
}): Promise<void> {
  try {
    await db.insert(idempotencyKeys).values({
      key: data.key,
      action: data.action,
      result: data.result,
      organizationId: data.organizationId,
    });
  } catch (err: unknown) {
    // Two truly-concurrent requests with the same idempotency key can both pass
    // the findByKey check before either INSERT commits. The second INSERT will
    // hit the unique constraint (PostgreSQL code 23505). Swallow that error so
    // the response isn't a 500 — the first request already persisted the key.
    if (isUniqueConstraintError(err)) {
      return;
    }
    throw err;
  }
}
