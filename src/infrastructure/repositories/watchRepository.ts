import { eq, and } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { watches } from "../schema";
import type { Watch } from "@/domain/models/watch";

function rowToWatch(row: typeof watches.$inferSelect): Watch {
  return {
    id: row.id,
    userId: row.userId,
    dealId: row.dealId,
    organizationId: row.organizationId,
    createdAt: row.createdAt,
  };
}

export async function create(
  data: { userId: string; dealId: string; organizationId: string },
  tx?: Transaction
): Promise<Watch> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(watches)
    .values({
      userId: data.userId,
      dealId: data.dealId,
      organizationId: data.organizationId,
    })
    .onConflictDoNothing()
    .returning();

  if (result[0]) {
    return rowToWatch(result[0]);
  }

  // ON CONFLICT DO NOTHING: fetch the existing record
  const existing = await findByUserAndDeal(data.userId, data.dealId, data.organizationId);
  return existing!;
}

export async function findByUserAndDeal(
  userId: string,
  dealId: string,
  organizationId: string
): Promise<Watch | null> {
  const result = await db
    .select()
    .from(watches)
    .where(
      and(
        eq(watches.userId, userId),
        eq(watches.dealId, dealId),
        eq(watches.organizationId, organizationId)
      )
    )
    .limit(1);
  return result[0] ? rowToWatch(result[0]) : null;
}

export async function findByUser(
  userId: string,
  organizationId: string
): Promise<Watch[]> {
  const result = await db
    .select()
    .from(watches)
    .where(
      and(
        eq(watches.userId, userId),
        eq(watches.organizationId, organizationId)
      )
    );
  return result.map(rowToWatch);
}

export async function deleteByUserAndDeal(
  userId: string,
  dealId: string,
  organizationId: string,
  tx?: Transaction
): Promise<void> {
  const queryRunner = tx ?? db;
  await queryRunner
    .delete(watches)
    .where(
      and(
        eq(watches.userId, userId),
        eq(watches.dealId, dealId),
        eq(watches.organizationId, organizationId)
      )
    );
}
