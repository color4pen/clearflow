import { eq, and, isNull, lte, gte, or, sql } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { approvalTemplates } from "../schema";
import type { ApprovalTemplate, ApprovalTemplateStep } from "@/domain/models/approvalTemplate";

function mapRow(row: typeof approvalTemplates.$inferSelect): ApprovalTemplate {
  return {
    id: row.id,
    name: row.name,
    organizationId: row.organizationId,
    steps: row.steps as ApprovalTemplateStep[],
    minAmount: row.minAmount ?? null,
    maxAmount: row.maxAmount ?? null,
    createdAt: row.createdAt,
  };
}

export async function findByOrganization(
  organizationId: string
): Promise<ApprovalTemplate[]> {
  const result = await db
    .select()
    .from(approvalTemplates)
    .where(eq(approvalTemplates.organizationId, organizationId));
  return result.map(mapRow);
}

export async function findById(
  id: string,
  organizationId: string
): Promise<ApprovalTemplate | null> {
  const result = await db
    .select()
    .from(approvalTemplates)
    .where(
      and(
        eq(approvalTemplates.id, id),
        eq(approvalTemplates.organizationId, organizationId)
      )
    )
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

/**
 * Creates a new approval template and returns the persisted record.
 */
export async function create(
  data: {
    name: string;
    organizationId: string;
    steps: ApprovalTemplateStep[];
    minAmount?: number | null;
    maxAmount?: number | null;
  },
  tx?: Transaction
): Promise<ApprovalTemplate> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(approvalTemplates)
    .values({
      name: data.name,
      organizationId: data.organizationId,
      steps: data.steps,
      minAmount: data.minAmount ?? null,
      maxAmount: data.maxAmount ?? null,
    })
    .returning();
  return mapRow(result[0]);
}

export async function updateById(
  id: string,
  organizationId: string,
  data: {
    name?: string;
    steps?: ApprovalTemplateStep[];
    minAmount?: number | null;
    maxAmount?: number | null;
  },
  tx?: Transaction
): Promise<ApprovalTemplate | null> {
  const queryRunner = tx ?? db;
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.steps !== undefined) updateData.steps = data.steps;
  if (data.minAmount !== undefined) updateData.minAmount = data.minAmount;
  if (data.maxAmount !== undefined) updateData.maxAmount = data.maxAmount;

  const result = await queryRunner
    .update(approvalTemplates)
    .set(updateData)
    .where(
      and(
        eq(approvalTemplates.id, id),
        eq(approvalTemplates.organizationId, organizationId)
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
    .delete(approvalTemplates)
    .where(
      and(
        eq(approvalTemplates.id, id),
        eq(approvalTemplates.organizationId, organizationId)
      )
    );
}

/**
 * Returns templates that match the given amount condition, ordered so that
 * specific templates (with minAmount or maxAmount set) come before the default
 * template (both null). This ensures selectTemplate picks the most specific
 * match when using "first found" algorithm.
 *
 * - amount is null: returns only templates where minAmount IS NULL AND maxAmount IS NULL
 * - amount is specified: returns templates where
 *   (minAmount IS NULL OR minAmount <= amount) AND (maxAmount IS NULL OR maxAmount >= amount)
 */
export async function findByOrganizationForAmount(
  organizationId: string,
  amount: number | null
): Promise<ApprovalTemplate[]> {
  if (amount === null) {
    const result = await db
      .select()
      .from(approvalTemplates)
      .where(
        and(
          eq(approvalTemplates.organizationId, organizationId),
          isNull(approvalTemplates.minAmount),
          isNull(approvalTemplates.maxAmount)
        )
      );
    return result.map(mapRow);
  }

  // For a specific amount: filter templates that match,
  // ordering specific templates before the default (null,null) one.
  const result = await db
    .select()
    .from(approvalTemplates)
    .where(
      and(
        eq(approvalTemplates.organizationId, organizationId),
        or(
          isNull(approvalTemplates.minAmount),
          lte(approvalTemplates.minAmount, amount)
        ),
        or(
          isNull(approvalTemplates.maxAmount),
          gte(approvalTemplates.maxAmount, amount)
        )
      )
    )
    .orderBy(
      sql`CASE WHEN ${approvalTemplates.minAmount} IS NULL AND ${approvalTemplates.maxAmount} IS NULL THEN 1 ELSE 0 END ASC`
    );
  return result.map(mapRow);
}
