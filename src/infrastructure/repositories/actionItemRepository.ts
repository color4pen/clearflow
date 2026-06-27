import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { actionItems } from "../schema";
import type { ActionItem } from "@/domain/models/actionItem";

function mapRow(row: typeof actionItems.$inferSelect): ActionItem {
  return {
    id: row.id,
    organizationId: row.organizationId,
    description: row.description,
    assigneeId: row.assigneeId ?? null,
    dueDate: row.dueDate ?? null,
    done: row.done,
    meetingId: row.meetingId ?? null,
    dealId: row.dealId ?? null,
    inquiryId: row.inquiryId ?? null,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

export async function create(
  data: {
    organizationId: string;
    description: string;
    assigneeId?: string | null;
    dueDate?: Date | null;
    done?: boolean;
    meetingId?: string | null;
    dealId?: string | null;
    inquiryId?: string | null;
    createdById: string;
  },
  tx?: Transaction
): Promise<ActionItem> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(actionItems)
    .values({
      organizationId: data.organizationId,
      description: data.description,
      assigneeId: data.assigneeId ?? null,
      dueDate: data.dueDate ?? null,
      done: data.done ?? false,
      meetingId: data.meetingId ?? null,
      dealId: data.dealId ?? null,
      inquiryId: data.inquiryId ?? null,
      createdById: data.createdById,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<ActionItem | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(actionItems)
    .where(and(eq(actionItems.id, id), eq(actionItems.organizationId, organizationId)))
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findByOrganization(
  organizationId: string,
  filters?: {
    done?: boolean;
    assigneeId?: string;
    dealId?: string;
    meetingId?: string;
    inquiryId?: string;
  }
): Promise<ActionItem[]> {
  const conditions = [eq(actionItems.organizationId, organizationId)];

  if (filters?.done !== undefined) {
    conditions.push(eq(actionItems.done, filters.done));
  }
  if (filters?.assigneeId !== undefined) {
    conditions.push(eq(actionItems.assigneeId, filters.assigneeId));
  }
  if (filters?.dealId !== undefined) {
    conditions.push(eq(actionItems.dealId, filters.dealId));
  }
  if (filters?.meetingId !== undefined) {
    conditions.push(eq(actionItems.meetingId, filters.meetingId));
  }
  if (filters?.inquiryId !== undefined) {
    conditions.push(eq(actionItems.inquiryId, filters.inquiryId));
  }

  const result = await db
    .select()
    .from(actionItems)
    .where(and(...conditions))
    .orderBy(desc(actionItems.createdAt));
  return result.map(mapRow);
}

export async function update(
  id: string,
  organizationId: string,
  data: Partial<{
    description: string;
    assigneeId: string | null;
    dueDate: Date | null;
    done: boolean;
    meetingId: string | null;
    dealId: string | null;
    inquiryId: string | null;
  }>,
  expectedVersion: number,
  tx?: Transaction
): Promise<ActionItem | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(actionItems)
    .set({ ...data, updatedAt: new Date(), version: sql`version + 1` })
    .where(and(eq(actionItems.id, id), eq(actionItems.organizationId, organizationId), eq(actionItems.version, expectedVersion)))
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}

export async function deleteById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<boolean> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .delete(actionItems)
    .where(and(eq(actionItems.id, id), eq(actionItems.organizationId, organizationId)))
    .returning({ id: actionItems.id });
  return result.length > 0;
}

export async function findByDeal(
  dealId: string,
  organizationId: string
): Promise<ActionItem[]> {
  const result = await db
    .select()
    .from(actionItems)
    .where(and(eq(actionItems.dealId, dealId), eq(actionItems.organizationId, organizationId)))
    .orderBy(desc(actionItems.createdAt));
  return result.map(mapRow);
}

export async function findByMeeting(
  meetingId: string,
  organizationId: string
): Promise<ActionItem[]> {
  const result = await db
    .select()
    .from(actionItems)
    .where(and(eq(actionItems.meetingId, meetingId), eq(actionItems.organizationId, organizationId)))
    .orderBy(desc(actionItems.createdAt));
  return result.map(mapRow);
}
