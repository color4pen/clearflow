import { eq, and, lte, gte, desc } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { approvalDelegations, users } from "../schema";
import type { ApprovalDelegation } from "@/domain/models/approvalDelegation";

type DelegationRow = typeof approvalDelegations.$inferSelect;

function mapRow(row: DelegationRow, fromUserRole: string): ApprovalDelegation {
  return {
    id: row.id,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    fromUserRole,
    organizationId: row.organizationId,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

/**
 * Find active delegations for a specific toUserId within the given time window.
 * Joins users table to include fromUserRole.
 */
export async function findActiveByToUserId(
  toUserId: string,
  organizationId: string,
  now: Date,
  tx?: Transaction
): Promise<ApprovalDelegation[]> {
  const queryRunner = tx ?? db;
  const fromUsers = users;
  const result = await queryRunner
    .select({
      delegation: approvalDelegations,
      fromUserRole: fromUsers.role,
    })
    .from(approvalDelegations)
    .innerJoin(fromUsers, eq(approvalDelegations.fromUserId, fromUsers.id))
    .where(
      and(
        eq(approvalDelegations.toUserId, toUserId),
        eq(approvalDelegations.organizationId, organizationId),
        eq(approvalDelegations.isActive, true),
        lte(approvalDelegations.startDate, now),
        gte(approvalDelegations.endDate, now)
      )
    );
  return result.map((row) => mapRow(row.delegation, row.fromUserRole));
}

/**
 * Find all delegations in an organization (for admin management UI).
 * Sorted by createdAt DESC.
 */
export async function findByOrganization(
  organizationId: string
): Promise<ApprovalDelegation[]> {
  const fromUsers = users;
  const result = await db
    .select({
      delegation: approvalDelegations,
      fromUserRole: fromUsers.role,
    })
    .from(approvalDelegations)
    .innerJoin(fromUsers, eq(approvalDelegations.fromUserId, fromUsers.id))
    .where(eq(approvalDelegations.organizationId, organizationId))
    .orderBy(desc(approvalDelegations.createdAt));
  return result.map((row) => mapRow(row.delegation, row.fromUserRole));
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
  const fromUsers = users;
  const result = await db
    .select({
      delegation: approvalDelegations,
      fromUserRole: fromUsers.role,
    })
    .from(approvalDelegations)
    .innerJoin(fromUsers, eq(approvalDelegations.fromUserId, fromUsers.id))
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
  return result.map((row) => mapRow(row.delegation, row.fromUserRole));
}

/**
 * Create a new delegation record.
 */
export async function create(
  data: {
    fromUserId: string;
    toUserId: string;
    organizationId: string;
    startDate: Date;
    endDate: Date;
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
    })
    .returning();
  const row = result[0];
  // Fetch fromUserRole by looking up the fromUser
  const fromUserResult = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, data.fromUserId))
    .limit(1);
  const fromUserRole = fromUserResult[0]?.role ?? "";
  return mapRow(row, fromUserRole);
}

/**
 * Update a delegation record (used for deactivation).
 * Scoped to organizationId for tenant isolation.
 */
export async function update(
  id: string,
  organizationId: string,
  data: Partial<{ isActive: boolean }>
): Promise<ApprovalDelegation | null> {
  const result = await db
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
  const row = result[0];
  // Fetch fromUserRole
  const fromUserResult = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, row.fromUserId))
    .limit(1);
  const fromUserRole = fromUserResult[0]?.role ?? "";
  return mapRow(row, fromUserRole);
}
