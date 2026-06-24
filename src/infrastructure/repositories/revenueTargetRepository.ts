import { eq, and, lte, gte, asc, lt, gt, sql } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { revenueTargets } from "../schema";
import type { RevenueTarget } from "@/domain/models/revenueTarget";

function mapRow(row: typeof revenueTargets.$inferSelect): RevenueTarget {
  return {
    id: row.id,
    organizationId: row.organizationId,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    targetAmount: row.targetAmount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function create(
  data: {
    organizationId: string;
    periodStart: Date;
    periodEnd: Date;
    targetAmount: number;
  },
  tx?: Transaction
): Promise<RevenueTarget> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(revenueTargets)
    .values({
      organizationId: data.organizationId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      targetAmount: data.targetAmount,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<RevenueTarget | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(revenueTargets)
    .where(
      and(
        eq(revenueTargets.id, id),
        eq(revenueTargets.organizationId, organizationId)
      )
    )
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findByOrganization(
  organizationId: string
): Promise<RevenueTarget[]> {
  const result = await db
    .select()
    .from(revenueTargets)
    .where(eq(revenueTargets.organizationId, organizationId))
    .orderBy(asc(revenueTargets.periodStart));
  return result.map(mapRow);
}

/**
 * 指定日が periodStart <= date <= periodEnd に含まれる目標を返す
 */
export async function findByPeriod(
  organizationId: string,
  date: Date,
  tx?: Transaction
): Promise<RevenueTarget | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(revenueTargets)
    .where(
      and(
        eq(revenueTargets.organizationId, organizationId),
        lte(revenueTargets.periodStart, date),
        gte(revenueTargets.periodEnd, date)
      )
    )
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

/**
 * 期間が重複する目標を検索する
 * 重複条件: NOT (period_end <= startDate OR period_start >= endDate)
 * すなわち: period_end > startDate AND period_start < endDate
 */
export async function findOverlapping(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
  excludeId?: string,
  tx?: Transaction
): Promise<RevenueTarget[]> {
  const queryRunner = tx ?? db;
  const conditions = [
    eq(revenueTargets.organizationId, organizationId),
    gt(revenueTargets.periodEnd, periodStart),
    lt(revenueTargets.periodStart, periodEnd),
  ];

  if (excludeId) {
    conditions.push(sql`${revenueTargets.id} != ${excludeId}`);
  }

  const result = await queryRunner
    .select()
    .from(revenueTargets)
    .where(and(...conditions));
  return result.map(mapRow);
}

export async function update(
  id: string,
  organizationId: string,
  data: Partial<{
    periodStart: Date;
    periodEnd: Date;
    targetAmount: number;
  }>,
  tx?: Transaction
): Promise<RevenueTarget | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(revenueTargets)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(revenueTargets.id, id),
        eq(revenueTargets.organizationId, organizationId)
      )
    )
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}

export async function deleteById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<void> {
  const queryRunner = tx ?? db;
  await queryRunner
    .delete(revenueTargets)
    .where(
      and(
        eq(revenueTargets.id, id),
        eq(revenueTargets.organizationId, organizationId)
      )
    );
}
