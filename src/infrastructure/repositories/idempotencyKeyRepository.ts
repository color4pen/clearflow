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

export async function create(data: {
  key: string;
  action: string;
  result: unknown;
  organizationId: string;
}): Promise<void> {
  await db.insert(idempotencyKeys).values({
    key: data.key,
    action: data.action,
    result: data.result,
    organizationId: data.organizationId,
  });
}
