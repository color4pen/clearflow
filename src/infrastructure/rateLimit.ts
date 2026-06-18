import { sql } from "drizzle-orm";
import { db } from "./db";
import { rateLimitRecords } from "./schema";

export const RATE_LIMITS = {
  createRequest: { limit: 10, windowMs: 60_000 },
  approveReject: { limit: 30, windowMs: 60_000 },
  webhookManage: { limit: 10, windowMs: 60_000 },
} as const;

export async function checkRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ allowed: boolean; remaining: number }> {
  const thresholdMs = params.windowMs;

  const rows = await db
    .insert(rateLimitRecords)
    .values({
      key: params.key,
      count: 1,
      windowStart: sql`NOW()`,
    })
    .onConflictDoUpdate({
      target: rateLimitRecords.key,
      set: {
        count: sql`CASE WHEN "rate_limit_records"."window_start" >= NOW() - INTERVAL '1 millisecond' * ${thresholdMs} THEN "rate_limit_records"."count" + 1 ELSE 1 END`,
        windowStart: sql`CASE WHEN "rate_limit_records"."window_start" >= NOW() - INTERVAL '1 millisecond' * ${thresholdMs} THEN "rate_limit_records"."window_start" ELSE NOW() END`,
      },
    })
    .returning({ count: rateLimitRecords.count });

  const count = rows[0]?.count ?? 1;

  return {
    allowed: count <= params.limit,
    remaining: Math.max(0, params.limit - count),
  };
}
