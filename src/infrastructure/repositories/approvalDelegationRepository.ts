import { eq, and, lte, gte, desc } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { approvalDelegations } from "../schema";
import type { ApprovalDelegation } from "@/domain/models/approvalDelegation";

type DelegationRow = typeof approvalDelegations.$inferSelect;

function mapRow(row: DelegationRow): ApprovalDelegation {
  return {
    id: row.id,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    fromUserRole: row.fromUserRole,
    organizationId: row.organizationId,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

/**
 * Find active delegations for a specific toUserId within the given time window.
 * fromUserRole is read directly from the column (no JOIN needed).
 */
export async function findActiveByToUserId(
  toUserId: string,
  organizationId: string,
  now: Date,
  tx?: Transaction
): Promise<ApprovalDelegation[]> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(approvalDelegations)
    .where(
      and(
        eq(approvalDelegations.toUserId, toUserId),
        eq(approvalDelegations.organizationId, organizationId),
        eq(approvalDelegations.isActive, true),
        lte(approvalDelegations.startDate, now),
        gte(approvalDelegations.endDate, now)
      )
    );
  return result.map(mapRow);
}

/**
 * Find all delegations in an organization (for admin management UI).
 * Sorted by createdAt DESC.
 */
export async function findByOrganization(
  organizationId: string
): Promise<ApprovalDelegation[]> {
  const result = await db
    .select()
    .from(approvalDelegations)
    .where(eq(approvalDelegations.organizationId, organizationId))
    .orderBy(desc(approvalDelegations.createdAt));
  return result.map(mapRow);
}

/**
 * Find active delegations that overlap with the given time range for the
 * same from→to pair. Used to check for duplicate delegation conflicts.
 * Overlap condition: existing.startDate <= endDate AND existing.endDate >= startDate
 */
export async function findOverlapping(
  fromUserId: string,
  toUserId: string,
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<ApprovalDelegation[]> {
  const result = await db
    .select()
    .from(approvalDelegations)
    .where(
      and(
        eq(approvalDelegations.fromUserId, fromUserId),
        eq(approvalDelegations.toUserId, toUserId),
        eq(approvalDelegations.organizationId, organizationId),
        eq(approvalDelegations.isActive, true),
        lte(approvalDelegations.startDate, endDate),
        gte(approvalDelegations.endDate, startDate)
      )
    );
  return result.map(mapRow);
}

/**
 * Create a new delegation record.
 * fromUserRole must be provided by the caller (no additional SELECT needed).
 */
export async function create(
  data: {
    fromUserId: string;
    toUserId: string;
    organizationId: string;
    startDate: Date;
    endDate: Date;
    fromUserRole: string;
  },
  tx?: Transaction
): Promise<ApprovalDelegation> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(approvalDelegations)
    .values({
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      organizationId: data.organizationId,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: true,
      fromUserRole: data.fromUserRole,
    })
    .returning();
  return mapRow(result[0]);
}

/**
 * Update a delegation record (used for deactivation).
 * Scoped to organizationId for tenant isolation.
 */
export async function update(
  id: string,
  organizationId: string,
  data: Partial<{ isActive: boolean }>,
  tx?: Transaction
): Promise<ApprovalDelegation | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(approvalDelegations)
    .set(data)
    .where(
      and(
        eq(approvalDelegations.id, id),
        eq(approvalDelegations.organizationId, organizationId)
      )
    )
    .returning();
  if (!result[0]) return null;
  return mapRow(result[0]);
}
